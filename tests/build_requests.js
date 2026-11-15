#!/usr/bin/env node
// build_requests.js: builds the exact crew requests this page sends, from the
// page's own code, so that another program can send them. No key, no network,
// no browser.
//
// It works the way tests/crew_memory_check.js works. It reads index.html as
// text, lifts the REAL functions out of it by a brace walk (tests/page_lift.js,
// never a re-implementation), gives them an invented page and an invented
// storage, and puts a capturing function behind fetch. It holds no prompt, no
// model name and no storage key: every one of those is the page's.
//
// Run:   node tests/build_requests.js <input.json> [path to a different index.html]
//
// Input, one JSON file:
//   {
//     "catalog": { the JSON that GET https://api.groq.com/openai/v1/models returns },
//     "rounds": [
//       {"id": "r1", "path": "battle-fq",   "slot": "a", "question": "...", "draft": "..."},
//       {"id": "r2", "path": "sparring-hp", "slot": "b", "question": "...", "source_material": "...", "context": "..."}
//     ]
//   }
//   path   "battle-fq": the FQ round of Battle. "sparring-hp": a Human
//          Processing prompt in Sparring, not impressions only.
//   slot   "a" or "b".
//   draft, source_material and context are optional. A missing one is the
//   empty field.
//
// Output, one JSON object on stdout and nothing else on stdout:
//   {
//     "app_version": "the page's APP_VERSION",
//     "index_sha256": "sha256 of the index.html that was read",
//     "requests": [
//       {"id": "r1", "path": "battle-fq", "slot": "a", "model": "the model id in the body",
//        "url": "the URL the page called", "body": { the object the page passed to fetch as its body }}
//     ]
//   }
//   One request per round, in the input's order. No key and no Authorization
//   text: only the URL and the body of what the page handed to fetch are kept.
//
// Exit 0 when every round produced exactly one request. Exit 1 otherwise,
// with one plain line on stderr per failure and NOTHING on stdout: a run that
// cannot build every round hands over no request at all.
//
// How one round is built. Each round gets a page of its own, and on it the
// builder does what a new visitor does, through the page's own code:
//   1. The page boots its crew (initGroq) on a browser that has stored
//      nothing: default settings, both slots on, no model choice, no memory.
//   2. A key is saved (saveGroqKey). The page validates a key by reading the
//      models URL; that fetch is answered with the input's catalog, and the
//      page's own catalog code keeps the eligible models and gives each slot
//      one. The key is a placeholder (PLACEHOLDER_KEY below). The page will not
//      fire without one stored, and it never reaches the output.
//   3. The round's texts are put into the page's fields as typed text: a
//      textarea holds no carriage return, so \r\n and \r become \n.
//   4. The page's button for the round is pressed: the function its onclick
//      names is called, the FQ fire button of the slot in Battle or the Human
//      Processing fire button of the slot in Sparring. The page reads its own
//      fields, builds the request and calls fetch; the call is captured and
//      answered with an invented reply so the page can finish the round.
//   5. The page's own record of the round (the note it stores) must carry the
//      round's path as its stage. A Human Processing prompt with no Source
//      Material goes out impressions only, so a sparring-hp round with an
//      empty source_material fails here: the page would not send it as asked.
//
// What exits 1: an input that cannot be read; an unknown path or slot; a
// round the page refused (too long for the model's budget, no model for the
// slot, an empty question); a page function, variable, field or button that
// is missing; a round that called fetch for any URL other than the models URL
// and the chat completions URL; a round that produced no request or more than
// one; a round the page sent under another stage or to a model other than the
// one it resolved for the slot.
//
// What it does not do: send anything; model a browser's paste intake (a text
// is put into its field as typed); arm the crew (arming draws the buttons and
// changes no request); run the page's autosave (onFC and saveCurrentToSlot are
// no-ops here: they run after the request is built and change nothing in it).
//
// Checked by tests/build_requests_check.js.

var fs=require('fs'), path=require('path'), crypto=require('crypto');
var lift=require('./page_lift');

var MODELS_URL='https://api.groq.com/openai/v1/models';
var CHAT_URL='https://api.groq.com/openai/v1/chat/completions';
// The page fires only while a key is stored. This is what is stored. It is
// not a key, and the page puts it only in a header, which is never kept.
var PLACEHOLDER_KEY='placeholder-not-a-key';
var REPLY='Invented reply. Nothing was sent; this text only lets the page finish its round.';

// The two paths. button is the onclick the page's markup must carry for the
// slot; fire and args are the call that onclick makes; question is the field
// the question is typed into; answers names the page's slot map whose
// outputField the page writes its refusals to.
var PATHS={
  'battle-fq':{
    button:function(slot){return "fireGroqBattle('"+slot+"','fq')";},
    fire:'fireGroqBattle', args:function(slot){return [slot,'fq'];},
    question:'fq', answers:'battle'
  },
  'sparring-hp':{
    button:function(slot){return "fireGroqCustomPrompt('"+slot+"')";},
    fire:'fireGroqCustomPrompt', args:function(slot){return [slot];},
    question:'human-notes', answers:'sparring'
  }
};
var SLOTS=['a','b'];
// The optional texts of a round and the field each one is typed into.
var FIELDS={draft:'final-draft', source_material:'sm', context:'context'};
var KEY_FIELD='groq-key-input';

// What is lifted from the page. Every name is required: a page that lacks one
// cannot build, and the run says which.
var CONSTS=['APP_VERSION','CW_CONTEXT','SLOTS_KEY','ACTIVE_SLOT_KEY'];
var VARS=['groqArmed','groqAbortControllers','groqMemory','groqMemoryEnabled','GROQ_MEM_MAX_TURNS','GROQ_NOTE_MAX_WORDS',
  'groqDrafts','GROQ_FOLLOWUP_STAGES','GROQ_STAGE_LABELS','VENDOR_BUDGET','GROQ_CATALOG_URL','GROQ_CATALOG_KEY',
  'GROQ_CATALOG_EXCLUDE','GROQ_CATALOG_MIN_CONTEXT','GROQ_CATALOG_MIN_OUTPUT','GROQ_NO_VOICE','GROQ_NO_CATALOG',
  'groqCatalog','groqCatalogNoticeText','MODEL_CONFIG','synthFdEnabled','GROQ_FAMILY_A','GROQ_FAMILY_B',
  'GROQ_SLOT_MAP','GROQ_BATTLE_SLOT_MAP'];
var FNS=['g','v','groqVendorOf','groqDerivedLabel','groqEligible','groqCatalogFromRecords','makeModelConfig',
  'buildModelRegistry','loadGroqCatalog','getModelConfig','readStoredSlotModel','getSlotModel','resolveAllSlots',
  'groqRequestBody','readGroqCatalog','applyGroqCatalog','populateGroqDropdowns','healGroqSlot','groqDeadSlotMessage',
  'groqNoVoiceMessage','getSlotConfig','getModelLabel','getFDBudget','getMaxTokens','groqBudgetError',
  'truncateSparringContext','estimateTokens','isGroqFollowUp','groqNoteOpening','groqNoteRating','groqDraftHash',
  'groqDraftVersion','makeGroqNote','groqNoteLine','groqMemoryBlock','groqPartialNotice','groqEvictedNotice',
  'planGroqMemory','buildGroqMessages','groqMemorySentText','showGroqMemorySent','resetGroqMemoryFolds',
  'appendGroqMemory','sanitizeGroqNotes','sanitizeGroqDrafts','loadGroqMemoryFromState','restoreGroqMemoryAtBoot',
  'updateMemoryBadges','ldSlots','getActiveSlot','syncGroqLabels','updateGroqSlotUI','updateGroqBtn','saveGroqKey',
  'fireGroqCustomPrompt','fireGroqCustom','fireGroqBattle','initGroq'];

function oneLine(text){return String(text).replace(/\s+/g,' ').trim();}
// What a textarea holds for a typed or pasted text: no carriage returns.
function typed(text){return String(text).replace(/\r\n?/g,'\n');}
function settle(){return new Promise(function(done){setImmediate(done);});}
// Whether the page's markup gives an element this id.
function hasId(html,id){
  return new RegExp('\\sid="'+String(id).replace(/[^A-Za-z0-9_-]/g,'\\$&')+'"').test(html);
}

// What the page must hold before any round is tried. -> a list of plain lines.
function missingFromPage(html){
  var from=lift.from(html), lines=[];
  CONSTS.forEach(function(n){if(!from.constant(n))lines.push('the page has no constant '+n);});
  VARS.forEach(function(n){if(!from.variable(n))lines.push('the page has no variable '+n);});
  FNS.forEach(function(n){if(!from.fn(n))lines.push('the page has no function '+n);});
  return lines;
}

// A page of its own for one round: the lifted code over an invented document
// and an invented storage, with fetch answered here and nowhere else.
function freshPage(html,catalogText){
  var from=lift.from(html);
  var log={chat:[], other:[], alerts:[]};
  var el=lift.elements(function(e){e.title='';e.appendChild=function(){};e.removeChild=function(){};});
  var answer=function(json){return {status:200, json:function(){return Promise.resolve(json);}};};
  var page={
    // An element exists only if the page's markup gives it that id.
    document:{
      getElementById:function(id){return hasId(html,id)?el(id):null;},
      createElement:function(){return {value:'',textContent:'',disabled:false};},
      querySelector:function(){return null;}
    },
    localStorage:lift.storage({}),
    fetch:function(url,opts){
      url=String(url);
      if(url===MODELS_URL)return Promise.resolve(answer(JSON.parse(catalogText)));
      if(url===CHAT_URL){log.chat.push({url:url, body:opts&&opts.body});return Promise.resolve(answer({choices:[{message:{content:REPLY}}]}));}
      log.other.push(url);
      return Promise.reject(new Error('the builder answers the models URL and the chat completions URL only'));
    },
    alert:function(m){log.alerts.push(String(m));},
    console:{log:function(){},info:function(){},warn:function(){},error:function(){}},
    setTimeout:function(){return 0;},
    AbortController:AbortController,
    // The page's autosave. It runs after the request is built.
    onFC:function(){}, saveCurrentToSlot:function(){}
  };
  var source=CONSTS.map(from.constant).concat(VARS.map(from.variable)).concat(FNS.map(from.fn)).join('\n');
  var app=lift.run(page,source+'\nvar out={};'+lift.exportsOf(FNS)+
    '\nout.version=APP_VERSION;'+
    '\nout.eligible=function(){return groqCatalog.length;};'+
    '\nout.lastNote=function(slot){var list=groqMemory[slot]||[];return list[list.length-1]||null;};'+
    '\nout.answerField=function(which,slot){return ((which==="battle"?GROQ_BATTLE_SLOT_MAP:GROQ_SLOT_MAP)[slot]||{}).outputField;};'+
    '\nreturn out;');
  return {app:app, log:log, field:page.document.getElementById};
}

// One round. -> {request} or {failure: a plain line}.
// thrown holds what the page threw outside the builder's reach (a promise the
// page did not hand back); the caller fills it.
async function buildRound(html,catalogText,round,thrown){
  var route=PATHS[round.path], slot=round.slot, S=slot.toUpperCase();
  if(html.indexOf('onclick="'+route.button(slot)+'"')<0)
    return {failure:'the page has no button that calls '+route.button(slot)};
  var page=freshPage(html,catalogText), app=page.app, log=page.log;
  var texts={};
  texts[route.question]=round.question;
  Object.keys(FIELDS).forEach(function(k){texts[FIELDS[k]]=round[k]===undefined?'':round[k];});
  try{
    app.initGroq();
    var keyField=page.field(KEY_FIELD);
    if(!keyField)return {failure:'the page has no field '+KEY_FIELD};
    keyField.value=PLACEHOLDER_KEY;
    await app.saveGroqKey();
    for(var id of Object.keys(texts)){
      var field=page.field(id);
      if(!field)return {failure:'the page has no field '+id};
      field.value=typed(texts[id]);
    }
    await app[route.fire].apply(null,route.args(slot));
    await settle(); await settle();
  }catch(e){
    return {failure:'the page stopped: '+oneLine(e&&e.message||e)};
  }
  if(thrown.length)return {failure:'the page stopped: '+oneLine(thrown[0]&&thrown[0].message||thrown[0])};
  if(log.other.length)return {failure:'the page called another URL: '+log.other.join(', ')};
  var model=app.getSlotModel(slot);
  if(log.chat.length===0){
    var answerField=page.field(app.answerField(route.answers,slot));
    var words=log.alerts.length?log.alerts.join(' '):(answerField&&answerField.value||'');
    var why=words?'the page said "'+oneLine(words)+'"':'the page sent none and gave no reason';
    if(!app.eligible())why+=' (the catalog given holds no eligible model, so the page kept no catalog and no key)';
    else if(!model)why+=' (the page resolved no model for slot '+S+' from the catalog given)';
    return {failure:'produced no request: '+why};
  }
  if(log.chat.length>1)return {failure:'produced '+log.chat.length+' requests, not one'};
  var sent=log.chat[0], body;
  try{body=JSON.parse(sent.body);}catch(e){return {failure:'the page passed fetch a body that is not JSON'};}
  if(!body||typeof body!=='object'||Array.isArray(body))return {failure:'the page passed fetch a body that is not an object'};
  if(!model||body.model!==model)
    return {failure:'the body names the model '+JSON.stringify(body.model)+', and the page resolves '+JSON.stringify(model)+' for slot '+S};
  var note=app.lastNote(slot);
  if(!note)return {failure:'the page kept no record of the round, so the stage it was sent under cannot be confirmed'};
  if(note.stage!==round.path){
    return {failure:'the page sent this round as '+note.stage+', not as '+round.path+
      (note.stage==='sparring-hp-imp'?': a Human Processing prompt with no Source Material goes out impressions only':'')};
  }
  var request={id:round.id, path:round.path, slot:slot, model:body.model, url:sent.url, body:body};
  var text=JSON.stringify(request), given=JSON.stringify(round);
  if(text.indexOf(PLACEHOLDER_KEY)>=0&&given.indexOf(PLACEHOLDER_KEY)<0)return {failure:'the request holds the placeholder key'};
  if(/authorization/i.test(text)&&!/authorization/i.test(given))return {failure:'the request holds Authorization text that the round did not give'};
  return {request:request};
}

// The input's own faults, before any page is made. -> a list of plain lines.
function inputFaults(input){
  var lines=[];
  if(!input||typeof input!=='object'||Array.isArray(input))return ['the input is not a JSON object'];
  if(!input.catalog||typeof input.catalog!=='object'||Array.isArray(input.catalog))lines.push('the input has no catalog object');
  if(!Array.isArray(input.rounds)||!input.rounds.length){lines.push('the input has no rounds');return lines;}
  var seen=Object.create(null);
  input.rounds.forEach(function(round,i){
    var name='round '+(i+1);
    if(!round||typeof round!=='object'||Array.isArray(round)){lines.push(name+': not an object');return;}
    if(typeof round.id!=='string'||!round.id.trim()){lines.push(name+': it has no id');return;}
    name='round '+round.id;
    if(seen[round.id]){lines.push(name+': the id is used by more than one round');return;}
    seen[round.id]=true;
  });
  return lines;
}
// One round's own faults. -> a plain line, or ''.
function roundFault(round){
  if(!Object.prototype.hasOwnProperty.call(PATHS,round.path))return 'unknown path '+JSON.stringify(round.path)+' (the paths are '+Object.keys(PATHS).join(' and ')+')';
  if(SLOTS.indexOf(round.slot)<0)return 'unknown slot '+JSON.stringify(round.slot)+' (the slots are '+SLOTS.join(' and ')+')';
  if(typeof round.question!=='string')return 'the question is not a text';
  for(var k of Object.keys(FIELDS)){
    if(round[k]!==undefined&&typeof round[k]!=='string')return k+' is not a text';
  }
  return '';
}

// -> {output} when every round built, else {failures: plain lines}.
async function build(inputPath,htmlPath,thrown){
  var raw, input, htmlBytes;
  thrown=thrown||[];
  if(!inputPath)return {failures:['no input file was named. Run: node tests/build_requests.js <input.json> [path to a different index.html]']};
  try{raw=fs.readFileSync(inputPath,'utf8');}catch(e){return {failures:['the input file cannot be read: '+inputPath]};}
  try{input=JSON.parse(raw);}catch(e){return {failures:['the input file is not JSON: '+oneLine(e.message)]};}
  try{htmlBytes=fs.readFileSync(htmlPath);}catch(e){return {failures:['the page cannot be read: '+htmlPath]};}
  var html=htmlBytes.toString('utf8');
  var faults=inputFaults(input).concat(missingFromPage(html));
  if(faults.length)return {failures:faults};
  var catalogText=JSON.stringify(input.catalog), requests=[], failures=[], version;
  try{version=freshPage(html,catalogText).app.version;}catch(e){return {failures:['the page\'s code cannot be run: '+oneLine(e&&e.message||e)]};}
  if(typeof version!=='string'||!version)return {failures:['the page\'s APP_VERSION is not a text']};
  for(var round of input.rounds){
    var fault=roundFault(round), result;
    thrown.length=0;
    if(fault)result={failure:fault};
    else result=await buildRound(html,catalogText,round,thrown);
    if(result.failure)failures.push('round '+round.id+': '+result.failure);
    else requests.push(result.request);
  }
  if(failures.length)return {failures:failures};
  return {output:{app_version:version, index_sha256:crypto.createHash('sha256').update(htmlBytes).digest('hex'), requests:requests}};
}

async function main(){
  // A promise the page made and did not hand back (the Human Processing
  // button does not return its fire) can only be heard here.
  var thrown=[];
  process.on('unhandledRejection',function(reason){thrown.push(reason);});
  var result;
  try{
    result=await build(process.argv[2],process.argv[3]||path.join(__dirname,'..','index.html'),thrown);
  }catch(e){
    result={failures:['stopped: '+oneLine(e&&e.message||e)]};
  }
  if(result.failures){
    result.failures.forEach(function(line){process.stderr.write('build_requests: '+line+'\n');});
    process.exitCode=1;
    return;
  }
  process.stdout.write(JSON.stringify(result.output,null,2)+'\n');
}

module.exports={build:build, PLACEHOLDER_KEY:PLACEHOLDER_KEY, MODELS_URL:MODELS_URL, CHAT_URL:CHAT_URL};
if(require.main===module)main();
