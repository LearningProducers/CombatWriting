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
//   4. A fresh page: a round not asked warm carries no stored memory and no
//      MEMORY NOTICE, also when an earlier round of the same run was on the
//      same slot.
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
//      builder holds no prompt text and names no model and no storage key. It
//      holds no memory text and does not decide which rounds send notes.
//   9. A warm round. A round whose input has after is fired after that
//      earlier round, on the same page and the same slot, through the page's
//      buttons, with the earlier round's fetch answered by the reply text the
//      input gives. Its body is the one the real fire functions send when the
//      check fires the same two rounds itself: the system prompt of the cold
//      round, then the page's own block with the page's own note on that
//      reply. A memory text reworded in a scratch copy of the page comes out
//      reworded.
//  10. battle-nav, the N round of Battle: the page's request for it, cold and
//      warm. The page counts it a follow-up; FQ it does not.
//  11. memory_in_body. Every request says whether the page put a note into
//      its body, and the answer follows the page: it turns with the page's
//      list of follow-up rounds in a scratch copy, and a scratch page whose
//      body is not what its memory plan describes builds nothing. It says
//      what was measured, not what was asked: on a scratch page that holds a
//      note of its own, a round nobody asked warm says true. A round
//      asked warm that goes out with no note exits 1: a fresh read, a note
//      the page had no room for, a page with memory off. A round not asked
//      warm is the request it was before warm rounds existed, with one
//      member, memory_in_body, added after the others.
//  12. Only the round's own request is in the output. The earlier round's
//      request, question and source material are nowhere in it. An earlier
//      round that fails, fails the run.
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
// A warm round's own texts, and the texts of the round that went before it.
var Q5='Fixture question five: turn to the east pier board and say what it leaves out.';
var Q_BEFORE='Fixture earlier question: is the dawn sailing printed anywhere on the pier?';
var Q_BEFORE_TWO='Fixture earlier question two: who prints the board?';
var SOURCE_BEFORE='Fixture earlier source material: the west pier has no board at all.';
var REPLY_BEFORE='Fixture earlier reply: the dawn sailing is printed nowhere on the east pier. The board still says noon.';
var REPLY_BEFORE_TWO='Fixture earlier reply two: the harbour office prints it, once, in spring.';
// A reply longer than a note may be. Its opening is one sentence; its last words are a marker.
var REPLY_LONG='Fixture long reply: the board is wrong. '+new Array(151).join('gull ')+'Fixture tail marker.';
var WARM_NAV={id:'ferry-warm-nav',path:'battle-nav',slot:'a',question:Q5,after:{path:'battle-fq',question:Q_BEFORE,reply:REPLY_BEFORE}};
var WARM_HP={id:'ferry-warm-hp',path:'sparring-hp',slot:'b',question:Q2,source_material:SOURCE,context:BRIEF,
  after:{path:'sparring-hp',question:Q_BEFORE_TWO,source_material:SOURCE_BEFORE,reply:REPLY_BEFORE_TWO}};
var WARM_SAME={id:'ferry-warm-same',path:'sparring-hp',slot:'a',question:Q4,source_material:SOURCE_TWO,
  after:{path:'sparring-hp',question:Q_BEFORE_TWO,source_material:SOURCE_TWO,reply:REPLY_LONG}};
var WARM_CROSS={id:'ferry-warm-cross',path:'battle-nav',slot:'b',question:Q5,draft:DRAFT,
  after:{path:'sparring-hp',slot:'b',question:Q_BEFORE,source_material:SOURCE_BEFORE,context:BRIEF,reply:REPLY_BEFORE}};
var COLD_NAV={id:'ferry-cold-nav',path:'battle-nav',slot:'a',question:Q5};
var WARM=[WARM_NAV,WARM_HP,WARM_SAME,WARM_CROSS];
// Warm rounds among rounds not asked warm, on both slots.
var MIXED=[ROUNDS[0],WARM_NAV,ROUNDS[1],WARM_HP,COLD_NAV,WARM_SAME,ROUNDS[3],WARM_CROSS,ROUNDS[2]];
function withAfter(round,after){var q=JSON.parse(JSON.stringify(round));q.after=after;return q;}
function cold(round){var q=JSON.parse(JSON.stringify(round));delete q.after;return q;}

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
  var from=lift.from(html), el=lift.elements(), store={}, sends=[], alerts=[], state={reply:REPLY};
  var page={
    g:el,
    v:function(id){return el(id).value.trim();},
    localStorage:lift.storage(store),
    alert:function(m){alerts.push(String(m));},
    onFC:function(){},
    fetch:function(url,opts){
      sends.push({url:String(url),body:JSON.parse(opts.body)});
      return Promise.resolve({status:200,json:function(){return Promise.resolve({choices:[{message:{content:state.reply}}]});}});
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
  return {app:app,el:el,store:store,sends:sends,alerts:alerts,state:state};
}
// One round fired on the check's page by the real fire function, called
// directly. field, when given, is a Battle field other than the path's own.
async function fireReference(ref,spec,slot){
  if(spec.path==='sparring-hp'){
    await ref.app.fireGroqCustom(slot,spec.question.trim(),(spec.source_material||'').trim(),(spec.context||'').trim(),false);
  } else {
    var field=spec.field||spec.path.replace(/^battle-/,'');
    ref.el('final-draft').value=spec.draft||'';
    ref.el(field).value=spec.question;
    await ref.app.fireGroqBattle(slot,field);
  }
}
// The body the real fire function sends for one round, on a page of its own.
// seed, when given, runs on that page before the round is fired. A warm
// round's earlier round is fired first on that page and that slot, and is
// answered with the reply the round gives.
async function referenceBody(catalog,round,seed){
  var ref=referencePage(catalog);
  if(seed)seed(ref);
  if(round.after){
    ref.state.reply=round.after.reply;
    await fireReference(ref,round.after,round.slot);
    if(ref.sends.length!==1)throw new Error('the reference page sent '+ref.sends.length+' requests for the round before '+round.id+' (alerts: '+ref.alerts.join(' | ')+')');
    ref.sends.length=0;
    ref.state.reply=REPLY;
  }
  await fireReference(ref,round,round.slot);
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
      ROUNDS.map(function(){return 'id,path,slot,model,url,body,memory_in_body';}));
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
    // The builder's code, without its comments: the comments may say what the page does.
    var builderCode=builderText.split('\n').filter(function(l){return !/^\s*\/\//.test(l);}).join('\n');
    expect('8. the builder\'s code holds no memory text',builderCode.length>1000&&!/CREW MEMORY|MEMORY NOTICE|MEMORY SENT|earlier reads|draft version|read no draft|stored note|fresh read/i.test(builderCode),true);
    expect('8. the builder does not decide which rounds send notes: it reads no list of follow-up rounds and asks the page no such question',
      builderCode.length>1000&&!/GROQ_FOLLOWUP_STAGES\s*[\[.=]|isGroqFollowUp\s*\(|groqMemoryBlock\s*\(|planGroqMemory\s*\(|appendGroqMemory\s*\(|makeGroqNote\s*\(|groqMemory\s*\[[^\]]*\]\s*(?:=|\.push)/.test(builderCode),true);
  });

  // 9. A warm round.
  var mixed=run({catalog:CATALOG,rounds:MIXED});
  var at=function(round){return MIXED.indexOf(round);};
  await group('9. a warm round',async function(){
    expect('9. warm rounds among rounds not asked warm: the run exits 0 and writes nothing to stderr',[mixed.status,mixed.stderr],[0,'']);
    expect('9. one request per round, the ids in the input\'s order',requestsOf(mixed).map(function(q){return q.id;}),MIXED.map(function(q){return q.id;}));
    var colds=run({catalog:CATALOG,rounds:WARM.map(cold)});
    expect('9. the same rounds not asked warm build too',[colds.status,requestsOf(colds).length],[0,WARM.length]);
    for(var i=0;i<WARM.length;i++){
      var round=WARM[i], body=bodyOf(mixed,at(round)), bare=bodyOf(colds,i), ref=await referenceBody(CATALOG,round);
      expect('9. '+round.id+' sends two messages: system, user',(body.messages||[]).map(function(m){return m.role;}),['system','user']);
      expect('9. '+round.id+' the whole body is the one the real fire functions send for the two rounds, one after the other, on one page and one slot',body,ref);
      expect('9. '+round.id+' the system message opens with the system prompt of the same round not asked warm, and goes on',
        [String(sys(body)).indexOf(sys(bare)),String(sys(body)).length>String(sys(bare)).length,String(sys(bare)).length>500],[0,true,true]);
      expect('9. '+round.id+' the user message is the one the same round sends when not asked warm',user(body),user(bare));
      expect('9. '+round.id+' the check\'s own page sent more than the bare system prompt, so the two bodies compared are warm ones',String(sys(ref)).length>String(sys(bare)).length,true);
    }
    // The note is the page's own cut of the reply the input gave.
    var added=function(round){return String(sys(bodyOf(mixed,at(round)))).slice(String(sys(bodyOf(run({catalog:CATALOG,rounds:[cold(round)]}),0))).length);};
    expect('9. ferry-warm-nav: what the page added holds the earlier reply, whole, since it is short',added(WARM_NAV).indexOf(REPLY_BEFORE)>0,true);
    expect('9. ferry-warm-hp: what the page added holds its own earlier reply and not another round\'s',[added(WARM_HP).indexOf(REPLY_BEFORE_TWO)>0,added(WARM_HP).indexOf(REPLY_BEFORE)],[true,-1]);
    expect('9. ferry-warm-cross: a Battle round after a Sparring round on slot B carries that Sparring reply',added(WARM_CROSS).indexOf(REPLY_BEFORE)>0,true);
    expect('9. ferry-warm-same: a long reply is cut by the page: its opening sentence is there, its last words are not',
      [added(WARM_SAME).indexOf('Fixture long reply: the board is wrong.')>0,/Fixture tail marker|gull/.test(JSON.stringify(bodyOf(mixed,at(WARM_SAME))))],[true,false]);
    // The page numbers the drafts a slot has read. The numbers are the page's; the check's page gives them.
    var numbers=function(round){return (added(round).match(/version \d+/g)||[]).join();};
    expect('9. ferry-warm-hp read a second text after a first; ferry-warm-same read one text twice',[numbers(WARM_HP),numbers(WARM_SAME)],['version 2,version 1','version 1,version 1']);
    // The earlier reply reaches the page as it arrived, not as typed text.
    var crlf=withAfter(WARM_NAV,{path:'battle-fq',question:Q_BEFORE,reply:'  Fixture earlier reply three:\r\n\r\nline two.  '});
    var r=run({catalog:CATALOG,rounds:[crlf]});
    expect('9. a reply with carriage returns and outer white space is the page\'s to clean',[r.status,bodyOf(r,0)],[0,await referenceBody(CATALOG,crlf)]);
    // A different reply, a different request; the same reply, the same request.
    var other=run({catalog:CATALOG,rounds:[withAfter(WARM_NAV,{path:'battle-fq',question:Q_BEFORE,reply:REPLY_BEFORE_TWO})]});
    var again=run({catalog:CATALOG,rounds:[WARM_NAV]});
    expect('9. the request turns with the reply text given',[sys(bodyOf(other,0)).indexOf(REPLY_BEFORE_TWO)>0,sys(bodyOf(other,0)).indexOf(REPLY_BEFORE)],[true,-1]);
    expect('9. the same warm round, alone in a run, is the same request, byte for byte',JSON.stringify(requestsOf(again)[0])===JSON.stringify(requestsOf(mixed)[at(WARM_NAV)])&&requestsOf(again).length===1,true);
    // The earlier round's slot is the round's.
    var sameSlot=withAfter(WARM_NAV,{path:'battle-fq',slot:'a',question:Q_BEFORE,reply:REPLY_BEFORE});
    expect('9. an earlier round that names the round\'s own slot is the same request',bodyOf(run({catalog:CATALOG,rounds:[sameSlot]}),0),bodyOf(mixed,at(WARM_NAV)));
    // The memory text is the page's. Reworded in a scratch copy, it comes out reworded.
    var block=lift.from(html).fn('groqMemoryBlock');
    var reworded=variant('memory-reworded',function(t){
      return t.replace(block,'function groqMemoryBlock(notes, draft){ return \'Fixture block, an invented rewrite, reading \' + draft + \': \' + notes.map(function(n){ return n.points; }).join(\' / \'); }');
    });
    var rw=run({catalog:CATALOG,rounds:[WARM_NAV,WARM_HP]},reworded);
    expect('9. on a page whose memory text is rewritten, the warm rounds build and say they carry memory',[rw.status,requestsOf(rw).map(function(q){return q.memory_in_body;})],[0,[true,true]]);
    expect('9. and their system messages end with the rewritten text, with nothing of the old wording',
      [/Fixture block, an invented rewrite, reading null: Fixture earlier reply: the dawn sailing is printed nowhere on the east pier\. The board still says noon\.$/.test(sys(bodyOf(rw,0))),
       /Fixture block, an invented rewrite, reading 2: Fixture earlier reply two: the harbour office prints it, once, in spring\.$/.test(sys(bodyOf(rw,1))),
       /CREW MEMORY|earlier reads/i.test(rw.stdout)],[true,true,false]);
    // Through the page's buttons: a page without the button of either round builds nothing.
    expectRefused('9. a page with no FQ button for slot A cannot fire the earlier round',
      run({catalog:CATALOG,rounds:[WARM_NAV]},variant('no-button-earlier',function(t){return t.replace('onclick="fireGroqBattle(\'a\',\'fq\')"','onclick="void 0"');})),1,['ferry-warm-nav',/earlier round/,/button/i]);
    expectRefused('9. a page with no Human Processing button for slot B cannot fire the earlier round',
      run({catalog:CATALOG,rounds:[WARM_CROSS]},variant('no-button-earlier-hp',function(t){return t.replace('onclick="fireGroqCustomPrompt(\'b\')"','onclick="void 0"');})),1,['ferry-warm-cross',/earlier round/,/button/i]);
  });

  // 10. battle-nav, the N round of Battle.
  await group('10. battle-nav',async function(){
    var i=at(COLD_NAV), body=bodyOf(mixed,i), ref=await referenceBody(CATALOG,COLD_NAV);
    expect('10. a battle-nav round builds: path, slot, url',[(requestsOf(mixed)[i]||{}).path,(requestsOf(mixed)[i]||{}).slot,(requestsOf(mixed)[i]||{}).url],['battle-nav','a',CHAT_URL]);
    expect('10. the whole body is the one the real fire function sends for the N field',body,ref);
    expect('10. the user message holds the question',String(user(body)).indexOf(Q5)>=0,true);
    var fq=await referenceBody(CATALOG,{id:'fq',path:'battle-fq',slot:'a',question:Q5});
    expect('10. its system prompt is the FQ one without the FQ directive',[String(sys(fq)).indexOf(sys(body)),String(sys(fq)).length>String(sys(body)).length,String(sys(body)).length>500],[0,true,true]);
    var page=referencePage(CATALOG);
    expect('10. the page counts battle-nav a follow-up and battle-fq a fresh read',[page.app.isGroqFollowUp('battle-nav'),page.app.isGroqFollowUp('battle-fq')],[true,false]);
    expect('10. the page\'s markup has the N field and its button for each slot',
      [/<textarea\b[^>]*\sid="nav"/.test(html),html.indexOf('onclick="fireGroqBattle(\'a\',\'nav\')"')>0,html.indexOf('onclick="fireGroqBattle(\'b\',\'nav\')"')>0],[true,true,true]);
    var withDraft=run({catalog:CATALOG,rounds:[{id:'ferry-nav-draft',path:'battle-nav',slot:'a',question:Q5,draft:DRAFT}]});
    expect('10. with INCLUDE FD IN SYNTHESIS off, a battle-nav round given a draft sends the same body and no draft',[bodyOf(withDraft,0),said(bodyOf(withDraft,0)).indexOf(DRAFT)],[body,-1]);
    expectRefused('10. a page with no N button for slot A',run({catalog:CATALOG,rounds:[COLD_NAV]},variant('no-nav-button',function(t){return t.replace('onclick="fireGroqBattle(\'a\',\'nav\')"','onclick="void 0"');})),1,['ferry-cold-nav',/button/i]);
    expectRefused('10. a page with no N field',run({catalog:CATALOG,rounds:[COLD_NAV]},variant('no-nav-field',function(t){return t.replace('<textarea id="nav"','<textarea id="nav-gone"');})),1,['ferry-cold-nav','nav']);
    expectRefused('10. the other follow-up rounds of Battle are still not paths',run({catalog:CATALOG,rounds:[{id:'ferry-sn',path:'battle-sn',slot:'a',question:Q5}]}),1,['ferry-sn','battle-sn']);
  });

  // 11. memory_in_body, and a warm round with no note.
  await group('11. memory_in_body',async function(){
    expect('11. the first run: every request says it carries no memory',requestsOf(good).map(function(q){return q.memory_in_body;}),[false,false,false,false]);
    expect('11. the mixed run: true for each round asked warm, false for each that was not',requestsOf(mixed).map(function(q){return q.memory_in_body;}),MIXED.map(function(q){return !!q.after;}));
    expect('11. the keys of each request, warm or not, in order',requestsOf(mixed).map(function(q){return Object.keys(q).join();}),MIXED.map(function(){return 'id,path,slot,model,url,body,memory_in_body';}));
    // A round not asked warm is the request it was.
    var before=[ROUNDS[0],ROUNDS[1],ROUNDS[3],ROUNDS[2]].map(function(round){return JSON.stringify(requestsOf(good)[ROUNDS.indexOf(round)]);});
    var after=[ROUNDS[0],ROUNDS[1],ROUNDS[3],ROUNDS[2]].map(function(round){return JSON.stringify(requestsOf(mixed)[at(round)]);});
    expect('11. a round not asked warm is the same request, byte for byte, in a run that holds warm rounds',[after.join('\n')===before.join('\n'),before.join('').length>4000],[true,true]);
    expect('11. and it carries no memory text: its system prompt is the bare one the real fire function sends on a page with no notes',
      [ROUNDS[0],ROUNDS[1],ROUNDS[3],ROUNDS[2]].map(function(round){return sys(bodyOf(mixed,at(round)))===sys(refs[ROUNDS.indexOf(round)]);}),[true,true,true,true]);
    var pretty=function(q){var o={id:q.id,path:q.path,slot:q.slot,model:q.model,url:q.url,body:q.body};return JSON.stringify(o);};
    expect('11. memory_in_body is the one member added: without it a request is id, path, slot, model, url, body, as before',
      requestsOf(good).map(function(q){var o=JSON.parse(JSON.stringify(q));delete o.memory_in_body;return JSON.stringify(o)===pretty(q);}),[true,true,true,true]);

    // A round asked warm that goes out with no note exits 1.
    var fresh={id:'ferry-fresh',path:'battle-fq',slot:'a',question:Q1,after:{path:'battle-fq',question:Q_BEFORE,reply:REPLY_BEFORE}};
    expectRefused('11. a battle-fq round asked warm: the page sends it as a fresh read',run({catalog:CATALOG,rounds:[fresh]}),1,['ferry-fresh',/asked warm/]);
    expectRefused('11. one such round among good ones hands over no request',run({catalog:CATALOG,rounds:[ROUNDS[0],WARM_NAV,fresh,ROUNDS[1]]}),1,['ferry-fresh']);
    var tooBig=withAfter(WARM_NAV,{path:'battle-fq',question:Q_BEFORE,reply:new Array(8001).join('x')});
    tooBig.id='ferry-no-room';
    var ref=await referenceBody(CATALOG,tooBig), bare=await referenceBody(CATALOG,cold(tooBig));
    expect('11. a reply of one unbroken word, 8,000 letters: the page has no room for its note and sends a notice in its place',
      [String(sys(ref)).indexOf('xxxxxxxx'),String(sys(ref)).length>String(sys(bare)).length],[-1,true]);
    expectRefused('11. that round asked warm',run({catalog:CATALOG,rounds:[tooBig]}),1,['ferry-no-room',/asked warm/]);

    // The answer follows the page's own list of follow-up rounds.
    var stages=lift.from(html).variable('GROQ_FOLLOWUP_STAGES');
    var navFresh=variant('nav-is-fresh',function(t){return t.replace(stages,stages.replace("'battle-nav':1, ",''));});
    expectRefused('11. on a scratch page that counts battle-nav a fresh read, the warm battle-nav round',run({catalog:CATALOG,rounds:[WARM_NAV]},navFresh),1,['ferry-warm-nav',/asked warm/]);
    var onNavFresh=run({catalog:CATALOG,rounds:[COLD_NAV,WARM_HP]},navFresh);
    expect('11. on that page the round not asked warm still builds, and the warm Sparring round still carries memory',[onNavFresh.status,requestsOf(onNavFresh).map(function(q){return q.memory_in_body;})],[0,[false,true]]);
    var fqFollows=variant('fq-is-follow-up',function(t){return t.replace(stages,stages.replace("{ ","{ 'battle-fq':1, "));});
    var onFqFollows=run({catalog:CATALOG,rounds:[fresh,ROUNDS[0]]},fqFollows);
    expect('11. on a scratch page that counts battle-fq a follow-up, the warm battle-fq round builds with memory, and the cold one without',
      [onFqFollows.status,requestsOf(onFqFollows).map(function(q){return q.memory_in_body;}),String(sys(bodyOf(onFqFollows,0))).indexOf(REPLY_BEFORE)>0],[0,[true,false],true]);
    // A page with SESSION MEMORY off for a new visitor stores no note.
    var boot=lift.from(html).fn('initGroq');
    var memoryOff=variant('memory-off',function(t){return t.replace(boot,boot.replace("(savedMemPref === null) ? true :","(savedMemPref === null) ? false :"));});
    expectRefused('11. on a scratch page that boots with SESSION MEMORY off, a warm round',run({catalog:CATALOG,rounds:[WARM_NAV]},memoryOff),1,['ferry-warm-nav']);
    // A page that stores the note and leaves it out of the request.
    var builds=lift.from(html).fn('buildGroqMessages');
    var leftOut=variant('note-left-out',function(t){return t.replace(builds,builds.replace("content: plan.added ? systemPrompt + '\\n\\n' + plan.added : systemPrompt","content: systemPrompt"));});
    expectRefused('11. on a scratch page whose memory plan names a note that the system message does not hold, a warm round',run({catalog:CATALOG,rounds:[WARM_NAV]},leftOut),1,['ferry-warm-nav',/memory plan/]);
    expect('11. on that page a round not asked warm, whose plan adds nothing, still builds',run({catalog:CATALOG,rounds:[COLD_NAV]},leftOut).status,0);
    // A page that changes the system message after its message builder returned it.
    var battle=lift.from(html).fn('fireGroqBattle');
    var changedAfter=variant('changed-after',function(t){
      return t.replace(battle,battle.replace('var messages=buildGroqMessages(slot,systemPrompt,userMsg,stage,draftText);','var messages=buildGroqMessages(slot,systemPrompt,userMsg,stage,draftText);messages[0].content+=\' An invented sentence the plan does not name.\';'));
    });
    expectRefused('11. on a scratch page that adds to the system message outside its memory plan, a Battle round',run({catalog:CATALOG,rounds:[COLD_NAV]},changedAfter),1,['ferry-cold-nav',/message builder/]);
    // What is said is what was measured, not what was asked: a scratch page that holds a note
    // of its own before an N round sends that note on a round nobody asked warm.
    var holdsNote=variant('holds-a-note',function(t){
      return t.replace(battle,battle.replace('{','{if(fieldId===\'nav\'&&!groqMemory[slot].length)groqMemory[slot].push(makeGroqNote(\'battle-fq\',\'An invented reply the scratch page held already.\',null));'));
    });
    var held=run({catalog:CATALOG,rounds:[COLD_NAV,ROUNDS[0]]},holdsNote);
    expect('11. on a scratch page that holds a note of its own, a round not asked warm says it carries memory, and it does',
      [held.status,requestsOf(held).map(function(q){return q.memory_in_body;}),String(sys(bodyOf(held,0))).indexOf('An invented reply the scratch page held already.')>0],[0,[true,false],true]);
    // A page whose message builder hands back no plan cannot be measured.
    var noPlan=variant('no-plan',function(t){return t.replace(builds,builds.replace('messages.memory = plan;',''));});
    expectRefused('11. on a scratch page whose message builder hands back no memory plan, a round',run({catalog:CATALOG,rounds:[ROUNDS[0]]},noPlan),1,['ferry-north',/memory plan/]);
  });

  // 12. Only the round's own request.
  await group('12. the earlier round is not in the output',async function(){
    expect('12. nine rounds in, four of them warm: nine requests out',[MIXED.length,requestsOf(mixed).length],[9,9]);
    expect('12. each request\'s user message holds its own round\'s question',requestsOf(mixed).map(function(q,i){return String(user(q.body)).indexOf(MIXED[i].question)>=0;}),MIXED.map(function(){return true;}));
    expect('12. no earlier round\'s question is anywhere in the output',[mixed.stdout.length>0,/Fixture earlier question/.test(mixed.stdout)],[true,false]);
    expect('12. no earlier round\'s source material is anywhere in the output',/Fixture earlier source material/.test(mixed.stdout),false);
    expect('12. the earlier round\'s request is not the one handed on: each warm request is its own round\'s path',
      WARM.map(function(round){var q=requestsOf(mixed)[at(round)]||{};return q.path+' '+q.slot;}),WARM.map(function(round){return round.path+' '+round.slot;}));
    // An FQ request is known by its directive. A warm N round after an FQ round must not be it.
    var fq=await referenceBody(CATALOG,{id:'fq',path:'battle-fq',slot:'a',question:Q_BEFORE});
    var directive=String(sys(fq)).slice(String(sys(await referenceBody(CATALOG,cold(WARM_NAV)))).length);
    expect('12. the FQ round\'s own directive, which the earlier request carried, is not in the warm N request',[directive.length>50,String(sys(bodyOf(mixed,at(WARM_NAV)))).indexOf(directive)],[true,-1]);
    expect('12. the builder\'s own stand-in reply is nowhere in the output',/Nothing was sent/.test(mixed.stdout),false);

    // An earlier round that fails, fails the run.
    var after=function(extra,id){var e={path:'battle-fq',question:Q_BEFORE,reply:REPLY_BEFORE};Object.keys(extra).forEach(function(k){e[k]=extra[k];});var q=withAfter(WARM_NAV,e);q.id=id||'ferry-after';return {catalog:CATALOG,rounds:[q]};};
    expectRefused('12. an earlier round with an empty question',run(after({question:'  '})),1,['ferry-after',/earlier round/]);
    expectRefused('12. an earlier round too long for the model\'s budget',run(after({question:Q_BEFORE+' '+new Array(8001).join('ferry ')})),1,['ferry-after',/earlier round/,'Too long to send']);
    expectRefused('12. an earlier sparring-hp round with no Source Material',run(after({path:'sparring-hp'})),1,['ferry-after',/earlier round/,/impressions/i]);
    expectRefused('12. an earlier round on a path that is not one',run(after({path:'battle-sfq'})),1,['ferry-after',/earlier round/,'battle-sfq']);
    expectRefused('12. an earlier round with no reply',run(after({reply:undefined})),1,['ferry-after',/reply/]);
    expectRefused('12. an earlier reply that is not a text',run(after({reply:{text:REPLY_BEFORE}})),1,['ferry-after',/reply/]);
    expectRefused('12. an earlier reply that is empty',run(after({reply:' \n '})),1,['ferry-after',/reply/]);
    expectRefused('12. an earlier draft that is not a text',run(after({draft:7})),1,['ferry-after',/earlier round/]);
    expectRefused('12. an earlier round on another slot',run(after({slot:'b'})),1,['ferry-after',/slot/]);
    expectRefused('12. an earlier round with an earlier round of its own',run(after({after:{path:'battle-fq',question:Q_BEFORE,reply:REPLY_BEFORE}})),1,['ferry-after']);
    var notObject=withAfter(WARM_NAV,'battle-fq');notObject.id='ferry-after';
    expectRefused('12. an after that is not an object',run({catalog:CATALOG,rounds:[notObject]}),1,['ferry-after']);
    var isNull=withAfter(WARM_NAV,null);isNull.id='ferry-after';
    expectRefused('12. an after that is null',run({catalog:CATALOG,rounds:[isNull]}),1,['ferry-after']);
    expectRefused('12. a warm round too long for the budget once the page reserves room for its note',
      run({catalog:CATALOG,rounds:[withAfter({id:'ferry-after',path:'battle-nav',slot:'a',question:Q5+' '+new Array(2001).join('ferry ')},WARM_NAV.after)]}),1,['ferry-after','Too long to send']);
    // Scratch pages on which the earlier round goes wrong.
    var battle=lift.from(html).fn('fireGroqBattle');
    var twice=variant('earlier-twice',function(t){return t.replace(battle,battle.replace('var resp=await fetch(','if(fieldId===\'fq\')await fetch(\''+CHAT_URL+'\',{method:\'POST\',body:groqRequestBody(model,mc,messages,1200,temp)});var resp=await fetch('));});
    expectRefused('12. a page whose FQ round sends two requests, as the earlier round',run({catalog:CATALOG,rounds:[WARM_NAV]},twice),1,['ferry-warm-nav',/earlier round/,/2 requests/]);
    var silent=variant('earlier-silent',function(t){return t.replace(battle,battle.replace('{','{if(fieldId===\'fq\')return;'));});
    expectRefused('12. a page whose FQ round sends nothing, as the earlier round',run({catalog:CATALOG,rounds:[WARM_NAV]},silent),1,['ferry-warm-nav',/earlier round/,/no request/]);
    var later=variant('later-silent',function(t){return t.replace(battle,battle.replace('{','{if(fieldId===\'nav\')return;'));});
    var laterRun=run({catalog:CATALOG,rounds:[WARM_NAV]},later);
    expectRefused('12. a page whose N round sends nothing after an FQ round that did send',laterRun,1,['ferry-warm-nav',/no request/]);
    expect('12. and the run does not take the earlier reply, left in the answer field, for what the page said',[/earlier round/.test(laterRun.stderr),laterRun.stderr.indexOf('Fixture earlier reply')],[false,-1]);
    // A page that records the earlier round and not the round itself: the earlier round's record is not taken for it.
    var append=lift.from(html).fn('appendGroqMemory');
    var firstOnly=variant('first-note-only',function(t){return t.replace(append,append.replace('if(!groqMemoryEnabled) return;','if(!groqMemoryEnabled) return;\n  if(groqMemory[slot] && groqMemory[slot].length) return;'));});
    expectRefused('12. a page that keeps a record of the earlier round only, on a warm round of the same path',run({catalog:CATALOG,rounds:[WARM_HP]},firstOnly),1,['ferry-warm-hp',/no record/]);
    var throwsFq=variant('earlier-throws',function(t){return t.replace(battle,battle.replace('{','{if(fieldId===\'fq\')throw new Error("an invented stop");'));});
    expectRefused('12. a page whose FQ fire throws, as the earlier round',run({catalog:CATALOG,rounds:[WARM_NAV]},throwsFq),1,['ferry-warm-nav',/earlier round/,'an invented stop']);
  });

  finished=true;
  if(failures.length){
    console.log('build_requests_check: FAIL ('+failures.length+' failure(s)) ('+htmlPath+')');
    process.exit(1);
  }
  console.log('build_requests_check: PASS ('+htmlPath+')');
})();
