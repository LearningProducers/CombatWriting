// build_requests_check.js: tests/build_requests.js hands another program the
// exact requests this page sends, built from the page's own code.
//
// Runs the builder as a program, the way its caller will: an input file in,
// one JSON object out, an exit code. Beside it, the check fires the REAL fire
// functions itself through the shared lifting code (tests/page_lift.js) on a
// fixture page of its own, and compares the two. The check's page takes the
// catalog by the page's stored-catalog route and calls the fire functions
// directly; the builder takes it by the page's fetch of the models URL and
// presses the page's buttons. Two routes, one page, the same request. No key,
// no network, no browser. Every catalog, model name, question, draft and
// reply in it is invented.
//
// What it pins:
//   1. Four rounds in give four requests out, in the input's order, with the
//      ids kept. The object on stdout has app_version, index_sha256 and
//      requests, and nothing else is on stdout.
//   2. Each body's user message holds that round's question. Its system
//      prompt is the page's own: it equals what the real fire function sends
//      through the harness, the whole body equals that body, and an edit to
//      the prompt in a scratch copy of the page shows up in the output.
//   3. A sparring-hp body holds the Source Material and the Context Brief. A
//      battle-fq body holds the Final Draft only when the page's INCLUDE FD IN
//      SYNTHESIS setting would send it, and that setting is off by default.
//   4. A fresh page: no request carries stored memory or a MEMORY NOTICE, also
//      when an earlier round of the same run was on the same slot.
//   5. The model in each body is the one the page resolves from the catalog
//      given. A catalog with one eligible model leaves the second slot with
//      none, and a catalog with no eligible model builds nothing: exit 1.
//   6. The output holds no key and no Authorization text.
//   7. Each failure exits 1 with one plain line on stderr and an empty stdout:
//      an unknown path, an unknown slot, a round the page refused (too long,
//      no model for the slot, an empty question), a page function that is
//      missing, a fire function that throws, a fetch to another URL, a round
//      with no request, a round with more than one, an input that cannot be
//      read. One failed round among good ones fails the run and hands over no
//      request.
//   8. The lifting code is in one place: tests/page_lift.js holds the brace
//      walk, and the builder and tests/crew_memory_check.js both use it. The
//      builder holds no prompt text and names no model and no storage key.
//
// What it does not pin: what a real model answers (the requests are built,
// never sent), Groq's API (the catalog and the reply are invented), how a
// browser's paste intake changes a pasted text before it reaches a field, and
// which model a slot picks from a real catalog (the invented ids match no
// family the page names, so each slot takes the page's fallback).
//
// Run from the repo root:   node tests/build_requests_check.js
// Optional first argument: a path to a different index.html to measure.
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), os=require('os'), crypto=require('crypto'), child=require('child_process');
var htmlPath=process.argv[2]||path.join(__dirname,'..','index.html');
var html=fs.readFileSync(htmlPath,'utf8');
var BUILDER=path.join(__dirname,'build_requests.js');
var LIFT=path.join(__dirname,'page_lift.js');
var CHAT_URL='https://api.groq.com/openai/v1/chat/completions';

var failures=[], finished=false;
var tmp=fs.mkdtempSync(path.join(os.tmpdir(),'build-requests-check-'));
// A run that stops before its verdict line is a failure, never a pass.
process.on('exit',function(code){
  try{fs.rmSync(tmp,{recursive:true,force:true});}catch(_){}
  if(!finished&&code===0){console.log('build_requests_check: FAIL (stopped before the verdict)');process.exitCode=1;}
});
function fail(label,why){console.log('FAIL '+label+': '+why);failures.push(label);}
function show(x){var s=(x instanceof RegExp)?String(x):JSON.stringify(x);return s===undefined?'undefined':(s.length>300?s.slice(0,300)+'…':s);}
function expect(label,got,want){
  var ok=JSON.stringify(got)===JSON.stringify(want);
  console.log((ok?'PASS ':'FAIL ')+label+': got '+show(got)+', want '+show(want));
  if(!ok)failures.push(label);
}
// A group of checks. What is thrown inside it is one failure line that names
// the group, and the run goes on to the next group.
async function group(label,fn){
  try{await fn();}catch(e){fail(label,'stopped: '+String(e&&e.message||e));}
}
function readText(file){try{return fs.readFileSync(file,'utf8');}catch(_){return '';}}

// ── Invented texts. ──
function rec(id,created,extra){
  var r={id:id,object:'model',created:created,owned_by:'Fixture vendor (invented)',active:true,context_window:65536,max_completion_tokens:8192};
  Object.keys(extra||{}).forEach(function(k){r[k]=extra[k];});
  return r;
}
// Two eligible models from two invented vendors, and three records the page
// must pass over: one switched off, one a speech model by its name, one with
// a context window too small. Each of the three is newer than the eligible two.
var CATALOG={object:'list',data:[
  rec('fixture-two/beta-2b',2000000002),
  rec('fixture-one/gamma-3b',2000000007,{active:false}),
  rec('fixture-one/alpha-1b',2000000003),
  rec('fixture-three/whisper-delta',2000000008),
  rec('fixture-two/epsilon-4b',2000000009,{context_window:8192})
]};
// The same two vendors with the newer model on the other side.
var CATALOG_TURNED={object:'list',data:[rec('fixture-two/zeta-5b',2000000005),rec('fixture-one/eta-6b',2000000004)]};
var CATALOG_ONE={object:'list',data:[rec('fixture-one/alpha-1b',2000000003),rec('fixture-one/gamma-3b',2000000007,{active:false})]};
var CATALOG_NONE={object:'list',data:[rec('fixture-one/gamma-3b',2000000007,{active:false}),rec('fixture-three/whisper-delta',2000000008)]};

var Q1='Fixture question one: is the ferry notice wrong, yes or no?';
var Q2='Fixture question two: which pier does the second paragraph mean?';
var Q3='Fixture question three: should the noon sailing be named first?';
var Q4='Fixture question four: does the brief ask for a warning or a timetable?';
var DRAFT='Fixture draft: the ferry now leaves at dawn, and the notice on the pier still says noon.';
var SOURCE='Fixture source material: riders wait at the east pier, and the board there is a year old.';
var SOURCE_TWO='Fixture source material two: the harbour office prints the board once each spring.';
var BRIEF='Fixture brief: a notice for riders; nobody may be left on the pier.';
var REPLY='Invented reply from the fixture crew.';
var ROUNDS=[
  {id:'ferry-north',path:'battle-fq',slot:'a',question:Q1,draft:DRAFT},
  {id:'ferry-east',path:'sparring-hp',slot:'b',question:Q2,source_material:SOURCE,context:BRIEF},
  {id:'ferry-south',path:'battle-fq',slot:'b',question:Q3},
  {id:'ferry-west',path:'sparring-hp',slot:'a',question:Q4,source_material:SOURCE_TWO}
];

// ── The builder, run as a program. ──
var runs=0;
function run(input,htmlArg){
  var file=path.join(tmp,'input-'+(++runs)+'.json');
  fs.writeFileSync(file,typeof input==='string'?input:JSON.stringify(input));
  return runArgs([file,htmlArg||htmlPath]);
}
function runArgs(args){
  var r=child.spawnSync(process.execPath,[BUILDER].concat(args),{encoding:'utf8'});
  var out=null;
  try{out=JSON.parse(r.stdout);}catch(_){}
  return {status:r.status,stdout:r.stdout||'',stderr:r.stderr||'',lines:(r.stderr||'').split('\n').filter(Boolean),out:out};
}
function requestsOf(r){return (r.out&&Array.isArray(r.out.requests))?r.out.requests:[];}
function bodyOf(r,i){return (requestsOf(r)[i]||{}).body||{messages:[]};}
function sys(body){return ((body.messages||[])[0]||{}).content;}
function user(body){return ((body.messages||[])[1]||{}).content;}
function said(body){return (body.messages||[]).map(function(m){return String(m.content);}).join('\n');}
// A failed run: exit 1, nothing on stdout, and this many plain lines on stderr.
function expectRefused(label,r,lines,mentions){
  var plain=r.lines.every(function(l){return l.indexOf('build_requests: ')===0&&!/^\s+at /.test(l);});
  expect(label+': exit code, stdout, lines on stderr, each a plain line',[r.status,r.stdout,r.lines.length,plain],[1,'',lines,true]);
  (mentions||[]).forEach(function(m){
    expect(label+': stderr says '+show(m),m instanceof RegExp?m.test(r.stderr):r.stderr.indexOf(m)>=0,true);
  });
}
// A scratch copy of the page with one edit, written outside the repository.
function variant(name,edit){
  var changed=edit(html);
  if(changed===html)throw new Error('the edit "'+name+'" did not change the page');
  var file=path.join(tmp,name+'.html');
  fs.writeFileSync(file,changed);
  return file;
}

// ── The check's own page: the real functions, lifted, fired directly. ──
var lift=null;
try{lift=require(LIFT);}catch(e){lift=null;}
var VARS=['VENDOR_BUDGET','GROQ_CATALOG_KEY','GROQ_CATALOG_EXCLUDE','GROQ_CATALOG_MIN_CONTEXT','GROQ_CATALOG_MIN_OUTPUT',
  'GROQ_NO_VOICE','groqCatalog','MODEL_CONFIG','GROQ_FAMILY_A','GROQ_FAMILY_B','GROQ_SLOT_MAP','GROQ_BATTLE_SLOT_MAP',
  'groqAbortControllers','groqMemory','groqMemoryEnabled','GROQ_MEM_MAX_TURNS','GROQ_NOTE_MAX_WORDS','groqDrafts',
  'GROQ_FOLLOWUP_STAGES','GROQ_STAGE_LABELS','synthFdEnabled'];
var CONSTS=['APP_VERSION','CW_CONTEXT'];
var FNS=['groqVendorOf','groqDerivedLabel','groqEligible','groqCatalogFromRecords','makeModelConfig','buildModelRegistry',
  'loadGroqCatalog','getModelConfig','readStoredSlotModel','getSlotModel','resolveAllSlots','getSlotConfig','getModelLabel',
  'getFDBudget','groqNoVoiceMessage','groqRequestBody','estimateTokens','truncateSparringContext','getMaxTokens',
  'groqBudgetError','isGroqFollowUp','groqNoteOpening','groqNoteRating','groqDraftHash','groqDraftVersion','makeGroqNote',
  'groqNoteLine','groqMemoryBlock','groqPartialNotice','groqEvictedNotice','planGroqMemory','buildGroqMessages',
  'groqMemorySentText','showGroqMemorySent','appendGroqMemory','updateMemoryBadges','saveSynthFdToggle',
  'fireGroqCustom','fireGroqBattle'];
// A fixture page that has read this catalog from its storage, as a returning
// visitor's page does at load.
function referencePage(catalog){
  if(!lift)throw new Error('tests/page_lift.js cannot be loaded');
  var from=lift.from(html), el=lift.elements(), store={}, sends=[], alerts=[];
  var page={
    g:el,
    v:function(id){return el(id).value.trim();},
    localStorage:lift.storage(store),
    alert:function(m){alerts.push(String(m));},
    onFC:function(){},
    fetch:function(url,opts){
      sends.push({url:String(url),body:JSON.parse(opts.body)});
      return Promise.resolve({status:200,json:function(){return Promise.resolve({choices:[{message:{content:REPLY}}]});}});
    },
    AbortController:AbortController,
    // Page functions the request path calls and this check does not measure.
    saveCurrentToSlot:function(){}, getActiveSlot:function(){return 0;},
    healGroqSlot:function(){return Promise.resolve('');}, groqDeadSlotMessage:function(){return '';}
  };
  var source=CONSTS.map(from.constant).concat(VARS.map(from.variable)).concat(FNS.map(from.fn)).filter(Boolean).join('\n');
  var app=lift.run(page,source+'\nvar out={};'+lift.exportsOf(FNS)+
    '\nout.catalogKey=GROQ_CATALOG_KEY; out.context=CW_CONTEXT; out.version=APP_VERSION;'+
    '\nout.synthFd=function(){return synthFdEnabled;};'+
    '\nout.eligible=function(){return groqCatalog.map(function(r){return r.id;});};'+
    '\nreturn out;');
  store.cw_groq_key='fixture-key-not-real';
  store[app.catalogKey]=JSON.stringify(catalog.data);
  app.loadGroqCatalog();
  app.resolveAllSlots();
  return {app:app,el:el,store:store,sends:sends,alerts:alerts};
}
// The body the real fire function sends for one round, on a page of its own.
// seed, when given, runs on that page before the round is fired.
async function referenceBody(catalog,round,seed){
  var ref=referencePage(catalog);
  if(seed)seed(ref);
  if(round.path==='battle-fq'){
    ref.el('final-draft').value=round.draft||'';
    ref.el(round.field||'fq').value=round.question;
    await ref.app.fireGroqBattle(round.slot,round.field||'fq');
  } else {
    await ref.app.fireGroqCustom(round.slot,round.question.trim(),(round.source_material||'').trim(),(round.context||'').trim(),false);
  }
  if(ref.sends.length!==1)throw new Error('the reference page sent '+ref.sends.length+' requests for '+round.id+' (alerts: '+ref.alerts.join(' | ')+')');
  return ref.sends[0].body;
}

(async function(){
  var good=run({catalog:CATALOG,rounds:ROUNDS});

  // 1. Four rounds in, four requests out.
  await group('1. four rounds',async function(){
    expect('1. the run exits 0 and writes nothing to stderr',[good.status,good.stderr],[0,'']);
    expect('1. stdout is one JSON object and nothing else',[good.out!==null&&typeof good.out==='object'&&!Array.isArray(good.out),/^\{[\s\S]*\}\n?$/.test(good.stdout)],[true,true]);
    expect('1. the keys of that object, in order',Object.keys(good.out||{}),['app_version','index_sha256','requests']);
    expect('1. four requests',requestsOf(good).length,4);
    expect('1. the ids, in the input\'s order',requestsOf(good).map(function(q){return q.id;}),ROUNDS.map(function(q){return q.id;}));
    expect('1. the paths and the slots are the input\'s',requestsOf(good).map(function(q){return q.path+' '+q.slot;}),ROUNDS.map(function(q){return q.path+' '+q.slot;}));
    expect('1. the keys of each request, in order',requestsOf(good).map(function(q){return Object.keys(q).join();}),
      ROUNDS.map(function(){return 'id,path,slot,model,url,body';}));
    expect('1. each url is the chat completions URL',requestsOf(good).map(function(q){return q.url;}),ROUNDS.map(function(){return CHAT_URL;}));
    expect('1. app_version is the page\'s APP_VERSION',(good.out||{}).app_version,(/\nconst APP_VERSION='([^']*)'/.exec(html)||[])[1]);
    expect('1. index_sha256 is the hash of the file that was read',(good.out||{}).index_sha256,crypto.createHash('sha256').update(fs.readFileSync(htmlPath)).digest('hex'));
    var again=run({catalog:CATALOG,rounds:ROUNDS});
    expect('1. the same input gives the same output, byte for byte',again.stdout===good.stdout&&good.stdout.length>0,true);
  });

  // 2. The question and the page's own system prompt.
  var refs=[];
  await group('2. the page\'s own request',async function(){
    for(var i=0;i<ROUNDS.length;i++){
      var round=ROUNDS[i], body=bodyOf(good,i), ref=await referenceBody(CATALOG,round);
      refs[i]=ref;
      expect('2. '+round.id+' sends two messages: system, user',(body.messages||[]).map(function(m){return m.role;}),['system','user']);
      expect('2. '+round.id+' the user message holds the question',String(user(body)).indexOf(round.question)>=0,true);
      expect('2. '+round.id+' the system prompt is the one the real fire function sends',[sys(body)===sys(ref),String(sys(ref)).length>500],[true,true]);
      expect('2. '+round.id+' the whole body is the one the real fire function sends',body,ref);
    }
    var page=referencePage(CATALOG);
    expect('2. the page\'s session context is a real text',typeof page.app.context==='string'&&page.app.context.length>200,true);
    [0,2].forEach(function(i){
      expect('2. '+ROUNDS[i].id+' the FQ system prompt opens with the page\'s session context',String(sys(bodyOf(good,i))).indexOf(page.app.context),0);
    });
    [1,3].forEach(function(i){
      expect('2. '+ROUNDS[i].id+' the Human Processing system prompt carries the page\'s session context',String(sys(bodyOf(good,i))).indexOf(page.app.context)>0,true);
    });
    // The FQ round is told from its neighbour: SFQ uses the same branch without the FQ directive.
    var sfq=await referenceBody(CATALOG,{id:'sfq',path:'battle-fq',field:'sfq',slot:'a',question:Q1});
    expect('2. the FQ system prompt is not the SFQ one',[sys(bodyOf(good,0))===sys(sfq),sys(sfq).length<String(sys(bodyOf(good,0))).length],[false,true]);
    // The Human Processing prompt is not the impressions-only one.
    var imp=referencePage(CATALOG);
    await imp.app.fireGroqCustom('b',Q2,'','',true);
    expect('2. the sparring-hp system prompt is not the impressions-only one',sys(bodyOf(good,1))===sys(imp.sends[0].body),false);
    // An edit to the prompt in a scratch copy of the page reaches the output.
    var edited=variant('prompt-edit',function(t){return t.replace('FQ is forward-looking;','FQ is forward-looking (an invented edit);');});
    var r=run({catalog:CATALOG,rounds:[ROUNDS[0]]},edited);
    expect('2. a prompt edited in a scratch page is in the output of a run on that page',
      [r.status,String(sys(bodyOf(r,0))).indexOf('(an invented edit)')>0,String(sys(bodyOf(good,0))).indexOf('(an invented edit)')],[0,true,-1]);
    expect('2. and that run names the scratch page\'s hash',(r.out||{}).index_sha256,crypto.createHash('sha256').update(fs.readFileSync(edited)).digest('hex'));
  });

  // 3. The Source Material, and the Final Draft only when the page would send it.
  await group('3. the draft and the source material',async function(){
    expect('3. a sparring-hp body holds the Source Material',[user(bodyOf(good,1)).indexOf(SOURCE)>=0,user(bodyOf(good,3)).indexOf(SOURCE_TWO)>=0],[true,true]);
    expect('3. a sparring-hp body holds the Context Brief when one is given',[user(bodyOf(good,1)).indexOf(BRIEF)>=0,user(bodyOf(good,3)).indexOf('CONTEXT BRIEF')],[true,-1]);
    var page=referencePage(CATALOG);
    expect('3. INCLUDE FD IN SYNTHESIS is off on a page that has stored nothing',page.app.synthFd(),false);
    var box=(/<input\b[^>]*\sid="synth-fd-toggle"[^>]*>/.exec(html)||[''])[0];
    expect('3. its checkbox is in the markup, and is not checked there',[box.length>0,/\schecked\b/.test(box.replace(/"[^"]*"/g,'""'))],[true,false]);
    expect('3. so a battle-fq body does not hold the Final Draft it was given',said(bodyOf(good,0)).indexOf(DRAFT),-1);
    var withFd=await referenceBody(CATALOG,ROUNDS[0],function(ref){ref.app.saveSynthFdToggle(true);});
    expect('3. the real fire function sends that draft once the setting is on',[user(withFd).indexOf(DRAFT)>0,user(withFd)===user(bodyOf(good,0))],[true,false]);
    var bare={id:'ferry-bare',path:'battle-fq',slot:'a',question:Q1};
    var r=run({catalog:CATALOG,rounds:[bare]});
    expect('3. with the setting off, a round given a draft and one given none send the same body',bodyOf(r,0),bodyOf(good,0));
    // What a field holds is what a person typed: a textarea has no carriage
    // returns, and the page drops the white space around a field's text.
    var typed={id:'ferry-typed',path:'sparring-hp',slot:'a',question:'  \r\n'+Q4+'\r\nA second line.\r\n  ',source_material:'\n'+SOURCE_TWO+'  ',context:'  '+BRIEF+'\n'};
    var clean={id:'ferry-typed',path:'sparring-hp',slot:'a',question:Q4+'\nA second line.',source_material:SOURCE_TWO,context:BRIEF};
    var t=run({catalog:CATALOG,rounds:[typed]});
    expect('3. outer white space and carriage returns do not reach the request',[t.status,bodyOf(t,0)],[0,await referenceBody(CATALOG,clean)]);
    expect('3. and the body holds no carriage return',JSON.stringify(bodyOf(t,0)).indexOf('\\r'),-1);
  });

  // 4. A fresh page for every round.
  await group('4. a fresh page',async function(){
    var memoryWords=/CREW MEMORY|MEMORY NOTICE|earlier reads|draft version/;
    expect('4. no request carries a note, a label or a MEMORY NOTICE',requestsOf(good).map(function(q){return memoryWords.test(said(q.body));}),[false,false,false,false]);
    expect('4. no request carries the reply to an earlier round',requestsOf(good).map(function(q){return /Invented reply/i.test(JSON.stringify(q));}),[false,false,false,false]);
    // The fourth round is a follow-up on slot A, after the first round on slot A. On one
    // page it would carry the first round's note; the real fire function shows what that looks like.
    var carried=await referenceBody(CATALOG,ROUNDS[3],function(ref){ref.app.appendGroqMemory('a','Invented reply to an earlier round.','battle-fq','');});
    expect('4. a page that holds a note does send it on this follow-up',[memoryWords.test(sys(carried)),sys(carried).indexOf('Invented reply to an earlier round.')>0],[true,true]);
    expect('4. the builder\'s follow-up on the same slot carries none: its system prompt is the bare one',
      [sys(bodyOf(good,3))===sys(refs[3]),sys(carried).indexOf(sys(bodyOf(good,3)))===0&&sys(carried).length>String(sys(bodyOf(good,3))).length],[true,true]);
    // The same round, first in a run and last in a run, is the same request.
    var alone=run({catalog:CATALOG,rounds:[ROUNDS[3]]});
    expect('4. a round is the same request whatever ran before it',bodyOf(alone,0),bodyOf(good,3));
  });

  // 5. The model is the one the page resolves from the catalog.
  await group('5. the model',async function(){
    var page=referencePage(CATALOG);
    var resolved={a:page.app.getSlotModel('a'),b:page.app.getSlotModel('b')};
    expect('5. the page keeps the two eligible records of the invented catalog, newest first',page.app.eligible(),['fixture-one/alpha-1b','fixture-two/beta-2b']);
    expect('5. the page gives each slot a model, and not the same one',[!!resolved.a,!!resolved.b,resolved.a!==resolved.b],[true,true,true]);
    expect('5. each request\'s model is the one the page resolved for its slot',requestsOf(good).map(function(q){return q.model;}),ROUNDS.map(function(q){return resolved[q.slot];}));
    expect('5. each body\'s model is the request\'s model',requestsOf(good).map(function(q){return q.body.model===q.model;}),[true,true,true,true]);
    var turnedPage=referencePage(CATALOG_TURNED);
    var turned=run({catalog:CATALOG_TURNED,rounds:ROUNDS});
    expect('5. another catalog, other models: the page\'s resolution again',
      [turned.status].concat(requestsOf(turned).map(function(q){return q.model;})),[0].concat(ROUNDS.map(function(q){return turnedPage.app.getSlotModel(q.slot);})));
    expect('5. and no model of the first catalog is left in that run',/alpha-1b|beta-2b/.test(turned.stdout),false);
    var onePage=referencePage(CATALOG_ONE);
    expect('5. one eligible model: the page gives it to slot A and leaves slot B with none',[onePage.app.getSlotModel('a'),onePage.app.getSlotModel('b')],['fixture-one/alpha-1b','']);
    var oneA=run({catalog:CATALOG_ONE,rounds:[ROUNDS[0],ROUNDS[3]]});
    expect('5. on that catalog the slot A rounds build',[oneA.status,requestsOf(oneA).map(function(q){return q.model;})],[0,['fixture-one/alpha-1b','fixture-one/alpha-1b']]);
    expectRefused('5. on that catalog a battle-fq round on slot B',run({catalog:CATALOG_ONE,rounds:[ROUNDS[2]]}),1,['ferry-south',/no model/i]);
    expectRefused('5. on that catalog a sparring-hp round on slot B',run({catalog:CATALOG_ONE,rounds:[ROUNDS[1]]}),1,['ferry-east',/no model/i]);
    expect('5. a catalog with no eligible model: the page keeps none',referencePage(CATALOG_NONE).app.eligible(),[]);
    expectRefused('5. a catalog with no eligible model, four rounds',run({catalog:CATALOG_NONE,rounds:ROUNDS}),4,['ferry-north','ferry-east','ferry-south','ferry-west',/no eligible model/i]);
    expectRefused('5. a catalog that is not the models reply',run({catalog:{error:{message:'Invented error body.'}},rounds:[ROUNDS[0]]}),1,['ferry-north']);
  });

  // 6. No key and no Authorization text.
  await group('6. no key',async function(){
    var placeholder=require(BUILDER).PLACEHOLDER_KEY;
    expect('6. the builder names the placeholder it gives the page, and it is not shaped like a Groq key',[typeof placeholder==='string'&&placeholder.length>0,/^gsk_/.test(String(placeholder))],[true,false]);
    [good,run({catalog:CATALOG_TURNED,rounds:ROUNDS})].forEach(function(r,i){
      expect('6. run '+(i+1)+': the output holds no Authorization or Bearer text',/authorization|bearer/i.test(r.stdout),false);
      expect('6. run '+(i+1)+': the output does not hold the placeholder',r.stdout.length>0&&r.stdout.indexOf(String(placeholder))<0,true);
      expect('6. run '+(i+1)+': the output holds nothing shaped like a Groq key',/gsk_[A-Za-z0-9]/.test(r.stdout),false);
      var names=[];
      (function walk(x){if(x&&typeof x==='object'){Object.keys(x).forEach(function(k){if(!Array.isArray(x))names.push(k);walk(x[k]);});}})(r.out);
      expect('6. run '+(i+1)+': no member of the output is named for a header or a key',names.filter(function(k){return /header|auth|key|token|secret/i.test(k)&&k!=='max_tokens';}),[]);
    });
  });

  // 7. Each failure exits 1.
  await group('7. failures',async function(){
    var one=function(extra){var q={id:'ferry-lone',path:'battle-fq',slot:'a',question:Q1};Object.keys(extra).forEach(function(k){q[k]=extra[k];});return {catalog:CATALOG,rounds:[q]};};
    expectRefused('7. an unknown path',run(one({path:'ferry-path'})),1,['ferry-lone','ferry-path']);
    expectRefused('7. a stage of the page that is not a path of the builder',run(one({path:'battle-sfq'})),1,['ferry-lone','battle-sfq']);
    expectRefused('7. an unknown slot',run(one({slot:'z'})),1,['ferry-lone']);
    expectRefused('7. the benched slot C',run(one({slot:'c'})),1,['ferry-lone']);
    expectRefused('7. a question too long for the model\'s budget',run(one({question:Q1+' '+new Array(8001).join('ferry ')})),1,['ferry-lone','Too long to send']);
    expectRefused('7. a sparring-hp question too long for the budget',run(one({path:'sparring-hp',source_material:SOURCE,question:Q1+' '+new Array(8001).join('ferry ')})),1,['ferry-lone','Too long to send']);
    expectRefused('7. an empty question',run(one({question:'   '})),1,['ferry-lone']);
    expectRefused('7. a sparring-hp round with no Source Material, which the page sends impressions only',run(one({path:'sparring-hp'})),1,['ferry-lone',/impressions/i]);
    expectRefused('7. a round with no id',run({catalog:CATALOG,rounds:[{path:'battle-fq',slot:'a',question:Q1}]}),1);
    expectRefused('7. two rounds with one id',run({catalog:CATALOG,rounds:[ROUNDS[0],ROUNDS[0]]}),1,['ferry-north']);
    expectRefused('7. a draft that is not a text',run(one({draft:{text:DRAFT}})),1,['ferry-lone']);
    expectRefused('7. no rounds',run({catalog:CATALOG,rounds:[]}),1);
    expectRefused('7. no catalog',run({rounds:[ROUNDS[0]]}),1);
    expectRefused('7. an input that is not JSON',run('{"catalog": '),1);
    expectRefused('7. an input file that is not there',runArgs([path.join(tmp,'absent.json'),htmlPath]),1);
    expectRefused('7. no input file named',runArgs([]),1);
    expectRefused('7. a page file that is not there',run({catalog:CATALOG,rounds:[ROUNDS[0]]},path.join(tmp,'absent.html')),1);
    // One failed round among good ones: the run fails and hands over no request.
    var mixed=run({catalog:CATALOG,rounds:[ROUNDS[0],{id:'ferry-bad',path:'battle-fq',slot:'z',question:Q1},ROUNDS[1],{id:'ferry-worse',path:'ferry-path',slot:'a',question:Q1}]});
    expectRefused('7. two bad rounds among two good ones',mixed,2,['ferry-bad','ferry-worse']);
    expect('7. and the good rounds are not named as failures',/ferry-north|ferry-east/.test(mixed.stderr),false);

    // Scratch copies of the page, each with one edit.
    var from=lift.from(html), battle=from.fn('fireGroqBattle');
    var inBattle=function(edit){return function(t){return t.replace(battle,edit(battle));};};
    var fqOnly={catalog:CATALOG,rounds:[ROUNDS[0]]}, hpOnly={catalog:CATALOG,rounds:[ROUNDS[1]]};
    expectRefused('7. a page with no fireGroqBattle',run(fqOnly,variant('no-battle',function(t){return t.replace('async function fireGroqBattle(','async function fireGroqBattleGone(');})),1,['fireGroqBattle']);
    expectRefused('7. a page with no fireGroqCustom',run(hpOnly,variant('no-custom',function(t){return t.replace('async function fireGroqCustom(','async function fireGroqCustomGone(');})),1,['fireGroqCustom']);
    expectRefused('7. a page with no buildGroqMessages, which both fire functions call',run({catalog:CATALOG,rounds:ROUNDS},variant('no-helper',function(t){return t.replace('function buildGroqMessages(','function buildGroqMessagesGone(');})),1,['buildGroqMessages']);
    expectRefused('7. a page with no FQ button for slot A',run(fqOnly,variant('no-button',function(t){return t.replace('onclick="fireGroqBattle(\'a\',\'fq\')"','onclick="void 0"');})),1,['ferry-north',/button/i]);
    var custom=from.fn('fireGroqCustom');
    expectRefused('7. a page whose FQ fire throws',run(fqOnly,variant('throws-fq',inBattle(function(src){return src.replace('{','{throw new Error("an invented stop");');}))),1,['ferry-north','an invented stop']);
    expectRefused('7. a page whose Human Processing fire throws, behind a button that does not hand its promise back',
      run(hpOnly,variant('throws-hp',function(t){return t.replace(custom,custom.replace('{','{throw new Error("an invented stop");'));})),1,['ferry-east','an invented stop']);
    var elsewhere=variant('other-url',inBattle(function(src){return src.replace(CHAT_URL,'https://elsewhere.invalid/v1/chat/completions');}));
    expectRefused('7. a page whose FQ round calls another URL',run(fqOnly,elsewhere),1,['ferry-north','https://elsewhere.invalid/v1/chat/completions']);
    var sameRunHp=run(hpOnly,elsewhere);
    expect('7. on that page a sparring-hp round, which does not call it, still builds',[sameRunHp.status,requestsOf(sameRunHp).length],[0,1]);
    expectRefused('7. a page whose FQ round sends nothing and says nothing',run(fqOnly,variant('silent',inBattle(function(src){return src.replace('{','{return;');}))),1,['ferry-north',/no request/i]);
    expectRefused('7. a page whose FQ round sends two requests',run(fqOnly,variant('twice',inBattle(function(src){
      return src.replace('var resp=await fetch(','await fetch(\''+CHAT_URL+'\',{method:\'POST\',body:groqRequestBody(model,mc,messages,1200,temp)});var resp=await fetch(');
    }))),1,['ferry-north',/2 requests|more than one/i]);
    expectRefused('7. a page whose FQ round calls the models URL and sends nothing',run(fqOnly,variant('models-only',inBattle(function(src){
      return src.replace('var resp=await fetch(\''+CHAT_URL+'\'','var resp=await fetch(GROQ_CATALOG_URL');
    }))),1,['ferry-north',/no request/i]);
  });

  // 8. One place for the lifting code; no prompt, model or storage key in the builder.
  await group('8. the shared file',async function(){
    var builderText=readText(BUILDER), liftText=readText(LIFT), memoryText=readText(path.join(__dirname,'crew_memory_check.js'));
    expect('8. tests/page_lift.js holds the brace walk',/function braceEnd\(/.test(liftText),true);
    expect('8. the builder and crew_memory_check.js do not hold one of their own',
      [builderText.length>0&&!/function braceEnd\(|function extractFn\(|new Function\(/.test(builderText),memoryText.length>0&&!/function braceEnd\(|new Function\(/.test(memoryText)],[true,true]);
    expect('8. both load the shared file',[/require\('\.\/page_lift'\)/.test(builderText),/require\('\.\/page_lift'\)/.test(memoryText)],[true,true]);
    expect('8. the builder is there to be read',builderText.length>1000,true);
    expect('8. the builder holds no prompt text',builderText.length>0&&!/USER QUESTION|SESSION CONTEXT|FINAL DRAFT:|SOURCE MATERIAL:|You are /.test(builderText),true);
    expect('8. the builder names no model, writes no registry row and names no storage key',builderText.length>0&&!/MODEL_CONFIG\s*[\[=]|cw_groq|gpt-oss|qwen|fixture-/.test(builderText),true);
    expect('8. the builder reads no environment and loads nothing that reaches a network',
      [builderText.length>0&&!/process\.env/.test(builderText),builderText.length>0&&!/require\('(?:node:)?(?:https?|http2|net|tls|dgram|dns|child_process)'\)/.test(builderText)],[true,true]);
    expect('8. the builder is not named as a check, so the workflow does not run it bare',/_check\.js$/.test(BUILDER),false);
  });

  finished=true;
  if(failures.length){
    console.log('build_requests_check: FAIL ('+failures.length+' failure(s)) ('+htmlPath+')');
    process.exit(1);
  }
  console.log('build_requests_check: PASS ('+htmlPath+')');
})();
