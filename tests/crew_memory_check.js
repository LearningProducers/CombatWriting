// crew_memory_check.js: the crew memory is explicit. A slot keeps short notes
// on its own rounds, sends them only on a follow-up round, says which draft
// each one read, and shows the person what went out.
//
// Reads index.html as text for the markup and the stylesheet, and runs the
// REAL functions extracted from it by a brace walk (never a
// re-implementation) against a fixture page: invented elements, an invented
// localStorage, an invented model record and a fake crew behind fetch. No
// key, no network, no browser. Every text in it is invented.
//
// What it pins:
//   1. The note. A completed round stores {v, stage, rating, points, draft,
//      ts} and nothing else. rating is what the reply states on the two
//      rounds that ask for one, else null. points is the opening of the
//      reply, at most 120 words, cut at a sentence end. A slot keeps 4.
//   2. The draft number. The first text a slot reads is 1, a different text
//      is the next number, a text seen before keeps its number, each slot
//      counts for itself, and a round that is sent no draft stores null.
//   3. A fresh read. The Sparring rating round, the context acknowledgment,
//      the S/N Ratio check, the Red Flag check and FQ are fired through the
//      real fire functions on a slot that holds notes: the request is the
//      system prompt and the user message, with no note and no MEMORY NOTICE.
//      Each still stores its note. The reply budget of a fresh read reserves
//      nothing for memory.
//   4. A follow-up. SFQ, N, SN and both Human Processing prompts carry one
//      labeled block: it says these are the slot's earlier reads, each line
//      names the draft version it read, and it says which version this round
//      reads. Newest notes are packed first; a round that cannot fit all of
//      them carries the first MEMORY NOTICE, one that can fit none carries
//      the second. With two rounds out at once, the fold shows what went out
//      with the round whose reply landed. With SESSION MEMORY off nothing is
//      sent, nothing is recorded and nothing stored is erased.
//   5. What the person sees. Two folds in Sparring and two in Battle, closed,
//      and no other <details> outside the AI crew setup. After a follow-up
//      the fold holds exactly the text that went out; after a fresh read it
//      says no memory was sent. The folds have a rule under max-width:800px.
//   6. Old turns are dropped by rule. An entry without v: 2 is discarded at
//      loadSlot, at boot, at import and at a new session. An invented
//      old-shape export loads whole (the session, the vault, the canon, the
//      saved slots) with empty memory, over a page that held notes. The boot
//      restore runs after the memory exists, so it cannot throw.
//   7. The panel. Every sentence of the memory text in the AI crew setup is
//      on a list here, and each one is tied to checks above or run beside it.
//      A sentence added to the panel without a check fails.
//   8. The version. APP_VERSION is v41.12.
//
// What it does not pin: what a real model does with the block (the gauntlet
// ship gate, run by the owner in a browser), how the folds look (measured in
// a browser), and Groq's API (the reply is invented).
//
// Run from the repo root:   node tests/crew_memory_check.js
// Optional first argument: a path to a different index.html to measure.
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path');
var htmlPath=process.argv[2]||path.join(__dirname,'..','index.html');
var html=fs.readFileSync(htmlPath,'utf8');

var failures=[], finished=false;
// A run that stops before its verdict line is a failure, never a pass.
process.on('exit',function(code){
  if(!finished&&code===0){console.log('crew_memory_check: FAIL (stopped before the verdict)');process.exitCode=1;}
});
function fail(label,why){console.log('FAIL '+label+': '+why);failures.push(label);}
function expect(label,got,want){
  var ok=JSON.stringify(got)===JSON.stringify(want);
  console.log((ok?'PASS ':'FAIL ')+label+': got '+JSON.stringify(got)+', want '+JSON.stringify(want));
  if(!ok)failures.push(label);
}
// A group of checks. What the page throws inside it is one failure line that
// names the group, so a page that lacks a function fails here and the run
// goes on to the next group.
async function group(label,fn){
  try{await fn();}catch(e){fail(label,'stopped: '+String(e&&e.message||e));}
}

function braceEnd(src,open){
  var depth=0;
  for(var i=open;i<src.length;i++){
    var ch=src[i];
    if(ch==='{')depth++;
    else if(ch==='}'){depth--;if(depth===0)return i;}
  }
  throw new Error('extract: unbalanced braces');
}
// The source of a function, or '' when the page has none by that name.
function extractFn(name){
  var at=html.indexOf('function '+name+'(');
  if(at<0)return '';
  var start=(html.slice(at-6,at)==='async ')?at-6:at;
  return html.slice(start,braceEnd(html,html.indexOf('{',at))+1);
}
function extractVar(name){
  var at=html.indexOf('\nvar '+name+' = ');
  if(at<0)at=html.indexOf('\nvar '+name+'=');
  if(at<0)return '';
  at+=1;
  var eq=html.indexOf('=',at), i=eq+1;
  while(html[i]===' ')i++;
  if(html[i]==='{')return html.slice(at,braceEnd(html,i)+1)+';';
  return html.slice(at,html.indexOf('\n',at));
}
function extractConst(name){
  var m=new RegExp('\\nconst '+name+'\\s*=[^\\n]*').exec(html);
  return m?m[0].slice(1):'';
}

// ── The fixture page. An element is made the first time it is asked for. ──
var els={}, store={}, alerts=[], sends=[], REPLY='', gate=null;
function el(id){
  if(!els[id]){
    var set={};
    els[id]={value:'',textContent:'',innerHTML:'',disabled:false,checked:false,open:true,style:{},className:'',
      classList:{add:function(c){set[c]=true;},remove:function(c){delete set[c];},
                 toggle:function(c,on){if(on===undefined)on=!set[c];if(on)set[c]=true;else delete set[c];return !!on;},
                 contains:function(c){return !!set[c];}}};
  }
  return els[id];
}
function FakeReader(){}
FakeReader.prototype.readAsText=function(file){this.onload({target:{result:file.text}});};
var page={
  g:el,
  v:function(id){return el(id).value.trim();},
  localStorage:{getItem:function(k){return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null;},
                setItem:function(k,x){store[k]=String(x);},removeItem:function(k){delete store[k];}},
  alert:function(m){alerts.push(String(m));},
  confirm:function(){return true;},
  onFC:function(){},
  // The fake crew. It answers at once with REPLY; while gate is a list, each
  // round waits there until the check answers it, so two rounds can be out
  // together and come back in either order.
  fetch:function(url,opts){
    sends.push(JSON.parse(opts.body));
    var answer=function(text){return {status:200,json:function(){return Promise.resolve({choices:[{message:{content:text}}]});}};};
    if(gate)return new Promise(function(done){gate.push(function(text){done(answer(text));});});
    return Promise.resolve(answer(REPLY));
  },
  AbortController:AbortController,
  FileReader:FakeReader,
  setTimeout:function(){return 0;},
  CW_CONTEXT:'',
  FIELDS:['sm','context','final-draft','fq','sfq','nav','sn','human-notes','r-x1','r-x2','battle-groq-x1','battle-groq-x2'],
  ollamaMode:false,
  battleCounters:{sfq:0,sn:0},
  battleLastCopied:{sfq:null,sn:null},
  groqAbortControllers:{a:null,b:null,c:null},
  // Page functions the memory path calls and this check does not measure.
  ts:function(){return 'fixture time';},
  checkComplete:function(){}, syncGroqLabels:function(){}, closeSlotsOverlay:function(){}, renderSlotsOverlay:function(){},
  toggleOllamaMode:function(){}, exitOllamaMode:function(){}, resetBattleCounters:function(){},
  renderVault:function(){}, renderCanon:function(){}, getFieldsSnapshot:function(){return '';},
  svVault:function(x){store.fixture_vault=JSON.stringify(x);}, svCanon:function(x){store.fixture_canon=JSON.stringify(x);},
  healGroqSlot:function(){return Promise.resolve(false);}, groqDeadSlotMessage:function(){return '';}
};
var VARS=['VENDOR_BUDGET','GROQ_NO_VOICE','GROQ_FAMILY_A','GROQ_FAMILY_B','GROQ_SLOT_MAP','GROQ_BATTLE_SLOT_MAP',
  'groqMemory','groqMemoryEnabled','GROQ_MEM_MAX_TURNS','groqDrafts','GROQ_NOTE_MAX_WORDS',
  'GROQ_FOLLOWUP_STAGES','GROQ_STAGE_LABELS'];
var CONSTS=['SLOTS_KEY','ACTIVE_SLOT_KEY','MAX_SLOTS'];
var FNS=['groqVendorOf','groqDerivedLabel','makeModelConfig','getModelConfig','readStoredSlotModel','getSlotModel',
  'getSlotConfig','getModelLabel','getFDBudget','groqNoVoiceMessage','groqRequestBody','estimateTokens',
  'truncateSparringContext','getMaxTokens','groqBudgetError',
  'isGroqFollowUp','groqNoteOpening','groqNoteRating','groqDraftHash','groqDraftVersion','makeGroqNote',
  'groqNoteLine','groqMemoryBlock','groqPartialNotice','groqEvictedNotice','planGroqMemory','buildGroqMessages',
  'groqMemorySentText','showGroqMemorySent','resetGroqMemoryFolds','appendGroqMemory','updateMemoryBadges',
  'saveGroqMemoryToggle','sanitizeGroqNotes','sanitizeGroqDrafts','loadGroqMemoryFromState','restoreGroqMemoryAtBoot',
  'ldSlots','svSlots','getActiveSlot','setActiveSlot','captureCurrentState','saveCurrentToSlot','loadSlot',
  'deleteSlot','newSession','clearSession','importState','fireGroq','fireGroqCustom','fireGroqBattle'];
var names=Object.keys(page);
var source=CONSTS.map(extractConst).concat(VARS.map(extractVar)).concat(FNS.map(extractFn)).filter(Boolean).join('\n');
var app=new Function(names.join(','),
  'var MODEL_CONFIG={}; var synthFdEnabled=false; var lastSavedSnapshot="";\n'+source+
  '\nif(typeof makeModelConfig==="function")MODEL_CONFIG["fixture-one/alpha-1b"]=makeModelConfig("fixture-one/alpha-1b","fixture");'+
  '\nvar out={};'+
  FNS.map(function(n){return '\nout.'+n+'=(typeof '+n+'==="function")?'+n+':function(){throw new Error("the page has no function '+n+'");};';}).join('')+
  '\nout.memory=function(){return typeof groqMemory==="undefined"?undefined:groqMemory;};'+
  '\nout.setMemory=function(slot,list){groqMemory[slot]=list;};'+
  '\nout.drafts=function(){return typeof groqDrafts==="undefined"?undefined:groqDrafts;};'+
  '\nout.memoryOn=function(){return groqMemoryEnabled;};'+
  '\nout.setSynthFd=function(on){synthFdEnabled=!!on;};'+
  '\nout.cap=typeof GROQ_MEM_MAX_TURNS==="undefined"?undefined:GROQ_MEM_MAX_TURNS;'+
  '\nreturn out;'
).apply(null,names.map(function(n){return page[n];}));

store.cw_groq_key='fixture-key-not-real';
['a','b'].forEach(function(slot){
  store['cw_groq_slot_'+slot+'_enabled']='1';
  store['cw_groq_slot_'+slot+'_model']='fixture-one/alpha-1b';
});

// ── Invented texts. ──
var DRAFT_ONE='Fixture draft one: the ferry now leaves at dawn, and the notice on the pier still says noon.';
var DRAFT_TWO='Fixture draft two: the ferry leaves at dawn from the east pier, and every notice now says so.';
var DRAFT_THREE='Fixture draft three: dawn, east pier, and a second sailing at noon for riders who missed the first.';
var BRIEF='Fixture brief: a notice for riders; nobody may be left on the pier.';
var QUESTION='Fixture question: does the second paragraph earn its place?';
function sentenceOf(n,tag){var w=[];for(var i=0;i<n;i++)w.push(tag+(i+1));return w.join(' ')+'.';}
var LONG_REPLY='Rating: 4/10. '+sentenceOf(60,'alpha')+' '+sentenceOf(50,'beta')+' '+sentenceOf(40,'gamma');
var NO_STOP_REPLY=sentenceOf(200,'delta').replace(/\.$/,'');
function words(s){return String(s).trim().split(/\s+/).filter(Boolean);}
function note(stage,draft,points,rating){return {v:2,stage:stage,rating:rating===undefined?null:rating,points:points,draft:draft,ts:1};}
function oldTurn(n){return {user:'[invented prompt '+n+']',assistant:'Invented old reply '+n+'.',stage:'sparring-sm',ts:n};}
function reset(){
  app.loadGroqMemoryFromState(null);
  if(!app.memoryOn())app.saveGroqMemoryToggle(true);
  app.setSynthFd(false);
  sends.length=0; alerts.length=0;
  ['sm','context','final-draft','fq','sfq','nav','sn','human-notes'].forEach(function(id){el(id).value='';});
}
function seed(slot){
  app.appendGroqMemory(slot,'Rating: 4/10. Invented verdict on draft one.','sparring-sm',DRAFT_ONE);
  app.appendGroqMemory(slot,'S/N RATIO: 62%\nInvented signal read of draft two.','battle-snratio',DRAFT_TWO);
}
function last(){return sends[sends.length-1]||{messages:[]};}
function said(body){return (body.messages||[]).map(function(m){return String(m.content);}).join('\n');}
// The base system prompt a round sends, read from the same round fired with memory switched off.
async function basePrompt(fire){
  app.saveGroqMemoryToggle(false);
  var before=sends.length;
  await fire();
  app.saveGroqMemoryToggle(true);
  var sent=sends[before];
  return sent?sent.messages[0].content:null;
}

// The rounds, each fired the way the page fires it.
var ROUNDS={
  'sparring-sm':     {fresh:true,  fold:'mem-sent-a',        fire:function(){el('sm').value=DRAFT_THREE;el('context').value=BRIEF;return app.fireGroq('a');}},
  'sparring-ctxack': {fresh:true,  fold:'mem-sent-a',        fire:function(){el('sm').value='';el('context').value=BRIEF;return app.fireGroq('a');}},
  'battle-snratio':  {fresh:true,  fold:'mem-sent-battle-a', fire:function(){el('final-draft').value=DRAFT_THREE;return app.fireGroqBattle('a','snratio');}},
  'battle-redflag':  {fresh:true,  fold:'mem-sent-battle-a', fire:function(){el('final-draft').value=DRAFT_THREE;return app.fireGroqBattle('a','redflag');}},
  'battle-fq':       {fresh:true,  fold:'mem-sent-battle-a', fire:function(){el('final-draft').value=DRAFT_THREE;el('fq').value=QUESTION;return app.fireGroqBattle('a','fq');}},
  'battle-sfq':      {fresh:false, fold:'mem-sent-battle-a', fire:function(){el('final-draft').value=DRAFT_THREE;el('sfq').value=QUESTION;return app.fireGroqBattle('a','sfq');}},
  'battle-nav':      {fresh:false, fold:'mem-sent-battle-a', fire:function(){el('final-draft').value=DRAFT_THREE;el('nav').value=QUESTION;return app.fireGroqBattle('a','nav');}},
  'battle-sn':       {fresh:false, fold:'mem-sent-battle-a', fire:function(){el('final-draft').value=DRAFT_THREE;el('sn').value=QUESTION;return app.fireGroqBattle('a','sn');}},
  'sparring-hp':     {fresh:false, fold:'mem-sent-a',        fire:function(){return app.fireGroqCustom('a',QUESTION,DRAFT_THREE,BRIEF,false);}},
  'sparring-hp-imp': {fresh:false, fold:'mem-sent-a',        fire:function(){return app.fireGroqCustom('a',QUESTION,'','',true);}}
};

// ── The markup and the stylesheet, as text. ──
function sliceDiv(id){
  var open=new RegExp('<div\\b[^>]*\\bid="'+id+'"').exec(html), at=open?open.index:-1;
  if(at<0)return '';
  var re=/<div\b|<\/div>/g, depth=0, m;
  re.lastIndex=at;
  while((m=re.exec(html))){
    if(m[0]==='</div>'){depth--;if(depth===0)return html.slice(at,m.index+6);}
    else depth++;
  }
  return '';
}
function plain(markup){return markup.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&middot;/g,'·').replace(/\s+/g,' ').trim();}
var panel=sliceDiv('groq-config-drawer');
var bodyMarkup=html.slice(html.search(/<body\b/i),html.indexOf('<script'));
var outsidePanel=panel?bodyMarkup.replace(panel,''):bodyMarkup;
function detailsIn(markup){return markup.match(/<details\b[^>]*>/g)||[];}
// The panel's memory text: the line beside the SESSION MEMORY switch, and the
// memory note up to the list of slot notes that follows it.
function memoryText(){
  var row=/<strong>SESSION MEMORY<\/strong>[\s\S]*?<span class="slot-model">([\s\S]*?)<\/span>/.exec(panel);
  var noteAt=panel.indexOf('<div class="groq-mem-note">');
  var noteEnd=noteAt<0?-1:panel.indexOf('<ul',noteAt);
  return {row:row?plain(row[1]):null, note:(noteAt<0||noteEnd<0)?null:plain(panel.slice(noteAt,noteEnd))};
}
function sentences(text){return String(text||'').match(/[^.!?]+(?:[.!?](?!\s|$)[^.!?]*)*[.!?]/g)||[];}
function cssRules(css,within){
  var out=[], i=0;
  within=within||'';
  while(i<css.length){
    var open=css.indexOf('{',i);
    if(open<0)break;
    var prelude=css.slice(i,open).trim(), close=braceEnd(css,open), body=css.slice(open+1,close);
    if(/^@(media|supports|layer|container)\b/.test(prelude))out=out.concat(cssRules(body,(within+' '+prelude).trim()));
    else if(prelude[0]!=='@')out.push({selectors:prelude.split(',').map(function(s){return s.trim();}),body:body,within:within});
    i=close+1;
  }
  return out;
}
var css=(html.match(/<style[^>]*>[\s\S]*?<\/style>/g)||[]).map(function(b){
  return b.replace(/^<style[^>]*>/,'').replace(/<\/style>$/,'');
}).join('\n').replace(/\/\*[\s\S]*?\*\//g,'');
var rules=cssRules(css);

// The panel's memory sentences, each with the labels of the checks that hold
// it to the code. A check label is filled in as the groups below run.
var held={};
function hold(key,ok){held[key]=(held[key]===undefined?true:held[key])&&!!ok;}
var PANEL_ROW='Up to 4 notes per slot · sent on follow-up rounds only';
var PANEL=[
  ['Per-slot memory.',['separate']],
  ['Slot A and Slot B keep separate notes.',['separate']],
  ['Sparring and Battle share them within the same slot letter.',['shared']],
  ['Each completed round stores one short note: its stage, the rating the reply states if the round asks for one, the opening of the reply (120 words at most, cut at a sentence end) and the version number of the draft it read.',['shape','rating','cut']],
  ['A slot keeps its last 4 notes.',['cap']],
  ['The first text a slot reads is version 1, a different text is the next number, and a text it has read before keeps its number.',['drafts']],
  ['Notes are sent only on a follow-up round: SFQ, N, SN or a Human Processing prompt.',['followup']],
  ['A fresh read sends none: the Sparring rating round, the context acknowledgment, the S/N Ratio check, the Red Flag check and FQ.',['fresh']],
  ['After a round, MEMORY SENT beside the slot\'s answer holds the exact text that went out, or says that no memory was sent.',['fold-sent','fold-none']],
  ['Memory starts fresh at v41.12: exchanges stored by an earlier version are discarded when a session loads, and the rest of the session loads whole.',['version','discard','whole']],
  ['The MEM badge counts stored notes, not sent ones.',['badge']],
  ['A long round can send fewer notes than are stored: the model is told, and MEMORY SENT shows it.',['partial']],
  ['Switching SESSION MEMORY off stops sending and recording and does not erase what is stored.',['off']],
  ['Clearing the session or deleting the active slot erases the notes, and CLEAR ALL on a stage does not.',['erase']],
  ['Notes travel with EXPORT ALL and come back on import.',['roundtrip']]
];

(async function(){
  // 1. The note.
  await group('1. the note',async function(){
    reset();
    app.appendGroqMemory('a',LONG_REPLY,'sparring-sm',DRAFT_ONE);
    var n=app.memory().a[0]||{};
    expect('1. the keys of a stored note, in order',Object.keys(n),['v','stage','rating','points','draft','ts']);
    expect('1. v, stage and draft of the first note',[n.v,n.stage,n.draft],[2,'sparring-sm',1]);
    expect('1. ts is a number',typeof n.ts,'number');
    hold('shape',JSON.stringify(Object.keys(n))===JSON.stringify(['v','stage','rating','points','draft','ts'])&&n.v===2);
    expect('1. the rating a Sparring rating reply states',n.rating,'4/10');
    var cutWords=words(n.points);
    expect('1. the long reply is 152 words',words(LONG_REPLY).length,152);
    expect('1. it is cut to 112 words, the last sentence end inside the first 120',cutWords.length,112);
    expect('1. the cut note ends at a sentence end',/beta50\.$/.test(n.points),true);
    expect('1. the cut note is the opening of the reply',LONG_REPLY.replace(/\s+/g,' ').indexOf(n.points),0);
    var short=app.groqNoteOpening('Invented short reply.\n\nTwo sentences only.');
    expect('1. a short reply is kept whole, on one line',short,'Invented short reply. Two sentences only.');
    var hard=app.groqNoteOpening(NO_STOP_REPLY);
    expect('1. a reply with no sentence end in its first 120 words is cut at 120 words',words(hard.replace(/\s*…$/,'')).length,120);
    expect('1. and that hard cut is marked',/…$/.test(hard),true);
    hold('cut',cutWords.length===112&&/beta50\.$/.test(n.points)&&words(hard.replace(/\s*…$/,'')).length===120);
    expect('1. the rating an S/N reply states',app.groqNoteRating('battle-snratio','S/N RATIO: 62%\nInvented.'),'62%');
    expect('1. a Sparring rating reply that states no rating',app.groqNoteRating('sparring-sm','Invented reply with no score.'),null);
    var noRating=['sparring-ctxack','sparring-hp','sparring-hp-imp','battle-redflag','battle-fq','battle-sfq','battle-nav','battle-sn']
      .map(function(s){return app.groqNoteRating(s,'Rating: 9/10. S/N RATIO: 88%. Invented.');});
    expect('1. rounds that ask for no rating store null',noRating,[null,null,null,null,null,null,null,null]);
    hold('rating',n.rating==='4/10'&&app.groqNoteRating('battle-snratio','S/N RATIO: 62%')==='62%'&&noRating.every(function(x){return x===null;}));
    reset();
    for(var i=1;i<=6;i++)app.appendGroqMemory('a','Invented reply '+i+'.','battle-fq','');
    expect('1. the cap the page declares',app.cap,4);
    expect('1. six rounds leave the last four notes',app.memory().a.map(function(x){return x.points;}),
      ['Invented reply 3.','Invented reply 4.','Invented reply 5.','Invented reply 6.']);
    hold('cap',app.cap===4&&app.memory().a.length===4&&app.memory().a[0].points==='Invented reply 3.');
  });

  // 2. The draft number.
  await group('2. the draft number',async function(){
    reset();
    app.appendGroqMemory('a','Invented one.','sparring-sm',DRAFT_ONE);
    app.appendGroqMemory('a','Invented two.','battle-snratio',DRAFT_TWO);
    app.appendGroqMemory('a','Invented three.','battle-redflag',DRAFT_ONE);
    app.appendGroqMemory('a','Invented four.','battle-fq','');
    var got=app.memory().a.map(function(x){return x.draft;});
    expect('2. first text, a different text, the first text again, no text',got,[1,2,1,null]);
    expect('2. the version a round would read: a new text, a seen text, no text',
      [app.groqDraftVersion('a',DRAFT_THREE),app.groqDraftVersion('a',DRAFT_TWO),app.groqDraftVersion('a','')],[3,2,null]);
    expect('2. asking for a version does not take a number',app.groqDraftVersion('a',DRAFT_THREE),3);
    expect('2. outer blank lines do not make a new text',app.groqDraftVersion('a','\n  '+DRAFT_TWO+'  \n'),2);
    app.appendGroqMemory('a','Invented five.','battle-snratio',DRAFT_THREE);
    app.appendGroqMemory('a','Invented six.','battle-snratio',DRAFT_THREE);
    app.appendGroqMemory('a','Invented seven.','battle-snratio',DRAFT_ONE);
    expect('2. a text keeps its number after its note has left the last four',app.memory().a.map(function(x){return x.draft;}),[null,3,3,1]);
    expect('2. slot B counts for itself: a text slot A calls 2 is its 1',app.groqDraftVersion('b',DRAFT_TWO),1);
    app.appendGroqMemory('b','Invented.','battle-snratio',DRAFT_TWO);
    expect('2. slot B\'s first note',app.memory().b.map(function(x){return x.draft;}),[1]);
    expect('2. slot B\'s round left slot A\'s notes alone',app.memory().a.length,4);
    hold('drafts',JSON.stringify(got)===JSON.stringify([1,2,1,null])&&app.memory().a[3].draft===1);
    hold('separate',app.memory().b.length===1&&app.memory().a.length===4&&app.memory().b[0].draft===1);
  });

  // 3. A fresh read sends nothing and still stores its note.
  var freshOk=true, freshDone=0;
  for(var stage of Object.keys(ROUNDS).filter(function(s){return ROUNDS[s].fresh;})){
    await group('3. fresh read '+stage,async function(){
      var round=ROUNDS[stage];
      reset();
      var base=await basePrompt(round.fire);
      reset(); seed('a');
      var storedBefore=app.memory().a.length;
      REPLY='Invented reply to '+stage+'.';
      el(round.fold.replace('mem-sent','mem-fold')).open=true;   // the person left it open
      await round.fire();
      var body=last(), text=said(body);
      expect('3. '+stage+' is not a follow-up',app.isGroqFollowUp(stage),false);
      expect('3. '+stage+' sends two messages: system, user',body.messages.map(function(m){return m.role;}),['system','user']);
      expect('3. '+stage+' sends its system prompt with nothing added',body.messages[0].content===base,true);
      expect('3. '+stage+' sends no MEMORY NOTICE',text.indexOf('MEMORY NOTICE')<0,true);
      expect('3. '+stage+' sends no stored note',text.indexOf('Invented verdict on draft one')<0&&text.indexOf('Invented signal read of draft two')<0,true);
      expect('3. '+stage+' sends no word of earlier reads or draft versions',/earlier reads|draft version/i.test(text),false);
      var stored=app.memory().a, newest=stored[stored.length-1]||{};
      expect('3. '+stage+' still stores its note',[stored.length-storedBefore,newest.stage,newest.points],[1,stage,'Invented reply to '+stage+'.']);
      expect('3. '+stage+' the fold says no memory was sent',/no memory was sent/i.test(el(round.fold).textContent),true);
      expect('3. '+stage+' the fold is closed again after the round',el(round.fold.replace('mem-sent','mem-fold')).open,false);
      // Sized so that a memory reserve would show: the input leaves exactly the reply ceiling, and
      // then exactly the reply floor plus 100 tokens, where a reserve would refuse the round.
      var cfg=app.getSlotConfig('a'), user='Invented user message.';
      var sized=function(tokens){return new Array((tokens-app.estimateTokens(user))*4+1).join('x');};
      var mid=sized(cfg.tpmCeiling-cfg.ceiling), near=sized(cfg.hardCap-cfg.floor-100);
      app.saveGroqMemoryToggle(false); var bare=app.getMaxTokens('a',mid,user,stage); app.saveGroqMemoryToggle(true);
      expect('3. '+stage+' reserves no reply budget for memory',[app.getMaxTokens('a',mid,user,stage),bare],[cfg.ceiling,cfg.ceiling]);
      expect('3. '+stage+' is not refused for memory it does not send',app.groqBudgetError('a',near,user,stage),'');
      freshOk=freshOk&&app.getMaxTokens('a',mid,user,stage)===cfg.ceiling&&app.groqBudgetError('a',near,user,stage)==='';
      freshOk=freshOk&&body.messages.length===2&&body.messages[0].content===base&&text.indexOf('MEMORY NOTICE')<0&&stored.length-storedBefore===1;
      hold('fold-none',/no memory was sent/i.test(el(round.fold).textContent));
      freshDone++;
    });
  }
  // A group that stopped early holds nothing: all five rounds must have run to their end.
  hold('fresh',freshOk&&freshDone===5);
  hold('fold-none',freshDone===5);
  await group('3. the badge after a fresh read',async function(){
    reset();
    REPLY='Rating: 4/10. Invented.';
    await ROUNDS['sparring-sm'].fire();
    expect('3. one fresh read: the request carried no note and the badge reads',[said(last()).indexOf('draft version')<0,el('mem-badge-a').textContent],[true,'MEM 1/4']);
    hold('badge',el('mem-badge-a').textContent==='MEM 1/4'&&el('mem-badge-battle-a').textContent==='MEM 1/4'&&said(last()).indexOf('draft version')<0);
  });

  // 4. A follow-up carries one labeled block.
  var followOk=true, followDone=0;
  for(var fstage of Object.keys(ROUNDS).filter(function(s){return !ROUNDS[s].fresh;})){
    await group('4. follow-up '+fstage,async function(){
      var round=ROUNDS[fstage];
      reset();
      var base=await basePrompt(round.fire);
      reset(); seed('a');
      REPLY='Invented reply to '+fstage+'.';
      el(round.fold.replace('mem-sent','mem-fold')).open=true;   // the person left it open
      await round.fire();
      var body=last(), sys=body.messages[0].content, added=sys.slice(base.length);
      expect('4. '+fstage+' is a follow-up',app.isGroqFollowUp(fstage),true);
      expect('4. '+fstage+' sends two messages: system, user',body.messages.map(function(m){return m.role;}),['system','user']);
      expect('4. '+fstage+' keeps its system prompt and adds one block after it',sys.indexOf(base)===0&&added.length>0,true);
      var lines=added.trim().split('\n');
      expect('4. '+fstage+' the label says these are the slot\'s earlier reads',/earlier reads/i.test(lines[0])&&/this slot|your own/i.test(lines[0]+' '+lines[1]),true);
      expect('4. '+fstage+' the label says each line names the draft version',/each line names the draft version/i.test(lines[1]),true);
      var noteLines=lines.filter(function(l){return /^- /.test(l);});
      expect('4. '+fstage+' one line per stored note, oldest first',
        noteLines.map(function(l){return (/draft version (\d+)/.exec(l)||[])[1];}),['1','2']);
      expect('4. '+fstage+' the lines carry the stored ratings and openings',
        [noteLines[0].indexOf('4/10')>=0&&noteLines[0].indexOf('Invented verdict on draft one')>=0,
         noteLines[1].indexOf('62%')>=0&&noteLines[1].indexOf('Invented signal read of draft two')>=0],[true,true]);
      expect('4. '+fstage+' sends no MEMORY NOTICE when every note fits',added.indexOf('MEMORY NOTICE')<0,true);
      expect('4. '+fstage+' the fold holds exactly what was added',el(round.fold).textContent,added.trim());
      expect('4. '+fstage+' the fold is closed again after the round',el(round.fold.replace('mem-sent','mem-fold')).open,false);
      expect('4. '+fstage+' stores its note too',app.memory().a[app.memory().a.length-1].stage,fstage);
      followOk=followOk&&sys.indexOf(base)===0&&noteLines.length===2&&el(round.fold).textContent===added.trim();
      hold('fold-sent',el(round.fold).textContent===added.trim()&&added.trim().length>0);
      followDone++;
    });
  }
  hold('followup',followOk&&followDone===5);
  hold('fold-sent',followDone===5);
  await group('4. which version the round reads',async function(){
    reset(); seed('a'); app.setSynthFd(true);
    REPLY='Invented.';
    el('final-draft').value=DRAFT_THREE; el('sfq').value=QUESTION; el('sn').value=QUESTION; el('nav').value=QUESTION;
    await app.fireGroqBattle('a','sfq');
    expect('4. SFQ with the Final Draft attached, a text not read before',/This round reads draft version 3\./.test(last().messages[0].content),true);
    expect('4. and its note records version 3',app.memory().a[app.memory().a.length-1].draft,3);
    el('final-draft').value=DRAFT_TWO;
    await app.fireGroqBattle('a','sn');
    expect('4. SN with a text read before',/This round reads draft version 2\./.test(last().messages[0].content),true);
    app.setSynthFd(false);
    await app.fireGroqBattle('a','nav');
    expect('4. N with no Final Draft attached',/This round is sent no draft\./.test(last().messages[0].content),true);
    expect('4. and its note records no draft',app.memory().a[app.memory().a.length-1].draft,null);
    reset(); seed('a');
    await app.fireGroqCustom('a',QUESTION,DRAFT_ONE,BRIEF,false);
    expect('4. a Human Processing prompt over Source Material read before',/This round reads draft version 1\./.test(last().messages[0].content),true);
    var sys=last().messages[0].content;
    expect('4. a Battle note rides a Sparring follow-up on the same slot',sys.indexOf('Invented signal read of draft two')>=0,true);
    hold('shared',sys.indexOf('Invented signal read of draft two')>=0&&sys.indexOf('Invented verdict on draft one')>=0);
    reset(); seed('a');
    await app.fireGroqBattle('b','sfq');
    expect('4. slot B\'s follow-up carries none of slot A\'s notes',/Invented verdict|Invented signal|earlier reads/.test(said(last())),false);
  });
  await group('4. a follow-up that cannot fit its notes',async function(){
    reset();
    var big=function(tag){return 'Opening for '+tag+'. '+sentenceOf(110,tag);};
    ['one','two','three','four'].forEach(function(t,i){app.appendGroqMemory('a',big(t),'battle-snratio',[DRAFT_ONE,DRAFT_TWO,DRAFT_THREE,DRAFT_ONE][i]);});
    var user='Invented user message.', room=function(tokens){return new Array((tokens-app.estimateTokens(user))*4+1).join('x');};
    var cfg=app.getSlotConfig('a');
    // Every note fits when the round is short.
    var all=app.buildGroqMessages('a','Invented system prompt.',user,'battle-sfq','');
    expect('4. a short round sends all four notes and no notice',
      [(all[0].content.match(/\n- /g)||[]).length,all[0].content.indexOf('MEMORY NOTICE')<0],[4,true]);
    // Room for some: the request ceiling leaves about 550 tokens for the block.
    var someSys=room(cfg.reqCeiling-550), some=app.buildGroqMessages('a',someSys,user,'battle-sfq','');
    var added=some[0].content.slice(someSys.length), kept=(added.match(/\n- /g)||[]).length;
    expect('4. a long round sends fewer notes than are stored, and at least one',kept>0&&kept<4,true);
    expect('4. the notes it keeps are the newest',added.indexOf('Opening for four.')>=0&&added.indexOf('Opening for one.')<0,true);
    expect('4. it carries the first MEMORY NOTICE, with the counts',added.indexOf('MEMORY NOTICE: Token budget allowed only '+kept+' of 4 ')>=0,true);
    expect('4. the block it sends is within the memory budget',app.estimateTokens(added.slice(0,added.indexOf('MEMORY NOTICE')))<=cfg.memTokenBudget,true);
    app.showGroqMemorySent('a',some.memory);
    expect('4. the fold shows the shortened block and its notice',el('mem-sent-battle-a').textContent,added.trim());
    hold('partial',kept>0&&kept<4&&added.indexOf('MEMORY NOTICE')>=0&&el('mem-sent-battle-a').textContent===added.trim());
    // Room for none.
    var noneSys=room(cfg.reqCeiling+10), none=app.buildGroqMessages('a',noneSys,user,'battle-sfq','');
    var noneAdded=none[0].content.slice(noneSys.length);
    expect('4. a round with no room sends no note and no label',/\n- |CREW MEMORY|draft version/.test(noneAdded),false);
    expect('4. it carries the second MEMORY NOTICE, with the count',noneAdded.indexOf('MEMORY NOTICE: Token budget for this request did not leave room for any of the 4 ')>=0,true);
    app.showGroqMemorySent('a',none.memory);
    expect('4. the fold shows that notice',el('mem-sent-battle-a').textContent.indexOf(noneAdded.trim())>=0,true);
    // The same over-long prompts on a fresh read: nothing added at all.
    expect('4. a fresh read that long adds nothing',
      [app.buildGroqMessages('a',noneSys,user,'battle-fq','')[0].content===noneSys,app.buildGroqMessages('a',someSys,user,'battle-snratio',DRAFT_ONE)[0].content===someSys],[true,true]);
    // A follow-up reserves room for its notes; a slot with none reserves nothing.
    app.saveGroqMemoryToggle(false); var bare=app.getMaxTokens('a',room(cfg.tpmCeiling-cfg.ceiling),user,'battle-sfq'); app.saveGroqMemoryToggle(true);
    expect('4. a follow-up on a slot that holds notes reserves the memory budget',
      bare-app.getMaxTokens('a',room(cfg.tpmCeiling-cfg.ceiling),user,'battle-sfq'),cfg.memTokenBudget);
    expect('4. a follow-up on a slot with no notes reserves nothing',
      [app.getMaxTokens('b',room(cfg.tpmCeiling-cfg.ceiling),user,'battle-sfq'),app.getMaxTokens('b',room(cfg.tpmCeiling-cfg.ceiling),user,'battle-fq')],[cfg.ceiling,cfg.ceiling]);
    var refusal=app.groqBudgetError('a',room(cfg.hardCap-cfg.floor-100),user,'battle-sfq');
    expect('4. a follow-up too long to hold its reserve is refused, and the message names the memory',
      [refusal.indexOf('Too long to send.')===0,refusal.indexOf('Crew memory is holding '+cfg.memTokenBudget.toLocaleString())>=0],[true,true]);
  });
  await group('4. two rounds out at once',async function(){
    reset(); seed('a');
    el('final-draft').value=DRAFT_THREE; el('sfq').value=QUESTION; el('fq').value=QUESTION;
    gate=[];
    var followUp=app.fireGroqBattle('a','sfq'), fresh=app.fireGroqBattle('a','fq');
    expect('4. both rounds are out',gate.length,2);
    var sentWithFollowUp=sends[sends.length-2].messages[0].content;
    var block=sentWithFollowUp.slice(sentWithFollowUp.indexOf('CREW MEMORY'));
    gate[1]('Invented FQ reply.'); await fresh;
    expect('4. the fresh read lands first: its answer, and no memory sent',
      [el('battle-groq-x1').value,/no memory was sent/i.test(el('mem-sent-battle-a').textContent)],['Invented FQ reply.',true]);
    gate[0]('Invented SFQ reply.'); await followUp;
    gate=null;
    expect('4. the follow-up lands last: the answer box holds its reply',el('battle-groq-x1').value,'Invented SFQ reply.');
    expect('4. and the fold holds the block that went out with that round',[sentWithFollowUp.indexOf('CREW MEMORY')>0,el('mem-sent-battle-a').textContent===block],[true,true]);
    expect('4. no round put the plan into the request',sends.every(function(b){return !('memory' in b)&&!('memory' in b.messages);}),true);
  });
  gate=null;
  await group('4. memory switched off',async function(){
    reset(); seed('a');
    var storedJson=JSON.stringify(app.memory()), draftsJson=JSON.stringify(app.drafts());
    app.saveGroqMemoryToggle(false);
    REPLY='Invented reply with memory off.';
    el('final-draft').value=DRAFT_THREE; el('sfq').value=QUESTION;
    await app.fireGroqBattle('a','sfq');
    var text=said(last());
    expect('4. off: a follow-up sends no note and no notice',/earlier reads|draft version|MEMORY NOTICE|Invented verdict/.test(text),false);
    expect('4. off: the round is not recorded',JSON.stringify(app.memory()),storedJson);
    expect('4. off: no draft number is taken',JSON.stringify(app.drafts()),draftsJson);
    expect('4. off: the fold says no memory was sent, and why',/no memory was sent/i.test(el('mem-sent-battle-a').textContent)&&/SESSION MEMORY/.test(el('mem-sent-battle-a').textContent),true);
    expect('4. off: the setting is stored',store.cw_groq_memory_enabled,'0');
    var off=JSON.stringify(app.memory())===storedJson&&!/earlier reads|MEMORY NOTICE/.test(text);
    app.saveGroqMemoryToggle(true);
    expect('4. on again: what was stored is still there',JSON.stringify(app.memory()),storedJson);
    await app.fireGroqBattle('a','sfq');
    expect('4. on again: the next follow-up sends the notes',last().messages[0].content.indexOf('Invented verdict on draft one')>=0,true);
    hold('off',off&&last().messages[0].content.indexOf('Invented verdict on draft one')>=0);
  });

  // 5. What the person sees.
  await group('5. the folds',async function(){
    var folds=outsidePanel.match(/<details\b[^>]*>[\s\S]*?<\/details>/g)||[];
    expect('5. <details> outside the AI crew setup',folds.length,4);
    expect('5. their ids',folds.map(function(f){return (/<details\b[^>]*\bid="([^"]*)"/.exec(f)||[])[1];}),
      ['mem-fold-a','mem-fold-b','mem-fold-battle-a','mem-fold-battle-b']);
    expect('5. each is closed in the markup',folds.map(function(f){return /^<details\b[^>]*\sopen\b/.test(f);}),[false,false,false,false]);
    expect('5. each has a summary that reads MEMORY SENT',folds.map(function(f){return plain((/<summary\b[^>]*>([\s\S]*?)<\/summary>/.exec(f)||['',''])[1]);}),
      ['MEMORY SENT','MEMORY SENT','MEMORY SENT','MEMORY SENT']);
    expect('5. each holds the box the page writes to',folds.map(function(f){return (/\bid="(mem-sent-[^"]*)"/.exec(f)||[])[1];}),
      ['mem-sent-a','mem-sent-b','mem-sent-battle-a','mem-sent-battle-b']);
    var rowA=sliceDiv('groq-slot-row-a'), rowB=sliceDiv('groq-slot-row-b'), battle=sliceDiv('battle-groq-block');
    expect('5. the Sparring folds sit in their slot rows, beside the answer boxes',
      [rowA.indexOf('id="mem-fold-a"')>rowA.indexOf('id="r-x1"')&&rowA.indexOf('id="r-x1"')>0,rowB.indexOf('id="mem-fold-b"')>rowB.indexOf('id="r-x2"')&&rowB.indexOf('id="r-x2"')>0],[true,true]);
    expect('5. the Battle folds sit in the crew block, each after its answer box and before the next',
      [battle.indexOf('id="battle-groq-x1"')>0,battle.indexOf('id="mem-fold-battle-a"')>battle.indexOf('id="battle-groq-x1"'),
       battle.indexOf('id="battle-groq-x2"')>battle.indexOf('id="mem-fold-battle-a"'),battle.indexOf('id="mem-fold-battle-b"')>battle.indexOf('id="battle-groq-x2"')],[true,true,true,true]);
    expect('5. the AI crew setup still holds two <details>',detailsIn(panel).length,2);
    var phone=rules.filter(function(r){return /max-width:\s*800px/.test(r.within)&&r.selectors.some(function(s){return /\.mem-fold/.test(s);});});
    expect('5. the folds have a rule under max-width:800px',phone.length>0,true);
    expect('5. the fold text wraps instead of widening the card',
      rules.some(function(r){return r.selectors.indexOf('.mem-fold-body')>=0&&/overflow-wrap:\s*anywhere/.test(r.body)&&/white-space:\s*pre-wrap/.test(r.body);}),true);
  });

  // 6. Old turns are dropped by rule.
  var MIXED=function(){return [oldTurn(1),note('sparring-sm',1,'Kept note one.','4/10'),{v:1,stage:'x',points:'Wrong version.'},oldTurn(2),
    note('battle-sfq',null,'Kept note two.'),'not an entry',null];};
  var KEPT=['Kept note one.','Kept note two.'];
  function savedSlot(memA,memB,extra){
    var state={sm:DRAFT_ONE,'final-draft':DRAFT_TWO,__groqMemoryA:memA,__groqMemoryB:memB};
    Object.keys(extra||{}).forEach(function(k){state[k]=extra[k];});
    return {state:state,title:'Fixture session',ts:'fixture time',u:1};
  }
  var discard=true, discardDone=0;
  await group('6. the rule itself',async function(){
    expect('6. only v: 2 entries are kept, in order',app.sanitizeGroqNotes(MIXED()).map(function(x){return x.points;}),KEPT);
    expect('6. a kept entry has the note\'s keys and no others',Object.keys(app.sanitizeGroqNotes([Object.assign({user:'stray',assistant:'stray'},note('battle-fq',null,'Kept.'))])[0]),
      ['v','stage','rating','points','draft','ts']);
    expect('6. what is not a list gives an empty memory',[app.sanitizeGroqNotes(undefined),app.sanitizeGroqNotes('x'),app.sanitizeGroqNotes({})],[[],[],[]]);
    expect('6. more than four stored notes: the last four are kept',
      app.sanitizeGroqNotes([1,2,3,4,5,6].map(function(i){return note('battle-fq',null,'Note '+i+'.');})).map(function(x){return x.points;}),['Note 3.','Note 4.','Note 5.','Note 6.']);
    discard=discard&&app.sanitizeGroqNotes(MIXED()).length===2; discardDone++;
  });
  await group('6. loadSlot',async function(){
    reset(); seed('a'); seed('b');
    store.cw_slots_v1=JSON.stringify([savedSlot(MIXED(),[oldTurn(3),oldTurn(4)])]);
    app.loadSlot(0);
    expect('6. loadSlot keeps the v: 2 notes of slot A and drops the rest',app.memory().a.map(function(x){return x.points;}),KEPT);
    expect('6. loadSlot leaves slot B empty when every entry is old',app.memory().b,[]);
    expect('6. loadSlot brings the fields back',[el('sm').value,el('final-draft').value],[DRAFT_ONE,DRAFT_TWO]);
    expect('6. loadSlot does not rewrite what is stored',JSON.parse(store.cw_slots_v1)[0].state.__groqMemoryA.length,7);
    expect('6. the badges count what was kept',[el('mem-badge-a').textContent,el('mem-badge-b').textContent],['MEM 2/4','MEM 0/4']);
    expect('6. a kept note numbered 1 keeps new texts off that number',app.groqDraftVersion('a',DRAFT_THREE),2);
    discard=discard&&app.memory().a.length===2&&app.memory().b.length===0; discardDone++;
  });
  await group('6. boot',async function(){
    reset(); seed('a'); seed('b');
    store.cw_slots_v1=JSON.stringify([null,savedSlot([oldTurn(1)],MIXED())]);
    store.cw_active_slot_v1='1';
    app.restoreGroqMemoryAtBoot();
    expect('6. boot reads the active slot: slot A empty, slot B keeps its v: 2 notes',
      [app.memory().a,app.memory().b.map(function(x){return x.points;})],[[],KEPT]);
    reset(); seed('a');
    delete store.cw_slots_v1; store.cw_active_slot_v1='0';
    app.restoreGroqMemoryAtBoot();
    expect('6. boot with nothing saved leaves the memory empty',[app.memory().a,app.memory().b],[[],[]]);
    var script=html.slice(html.indexOf('<script>',html.search(/<body\b/i)));
    var declared=script.indexOf('\nvar groqMemory = '), init=script.indexOf('\nfunction initGroq('), call=script.indexOf('restoreGroqMemoryAtBoot();',init);
    var initEnd=init<0?-1:braceEnd(script,script.indexOf('{',init)), run=script.indexOf('\ninitGroq();');
    expect('6. initGroq calls the boot restore',init>=0&&call>init&&call<initEnd,true);
    expect('6. initGroq runs after the memory is declared',declared>=0&&run>declared,true);
    // The page's own restore block runs before the declaration. Its code (comments aside) must not name the memory.
    var boot=script.indexOf('// Restore session');
    var early=(boot>=0&&boot<declared)?script.slice(boot,declared).replace(/\/\/[^\n]*/g,''):'groqMemory';
    expect('6. no code between the page\'s restore block and the declaration names groqMemory',/groqMemory|groqDrafts/.test(early),false);
    discard=discard&&app.memory().a.length===0&&call>init&&run>declared&&!/groqMemory|groqDrafts/.test(early); discardDone++;
  });
  await group('6. an old-shape export',async function(){
    reset(); seed('a'); seed('b');
    store.cw_slots_v1=JSON.stringify([savedSlot([],[])]); store.cw_active_slot_v1='0';
    var bundle={
      session:{sm:'Imported fixture draft.',context:'Imported fixture brief.','final-draft':'Imported fixture final draft.',fq:'Imported fixture question?'},
      vault:[{title:'Invented insight',body:'Invented vault entry.'}],
      canon:[{title:'Invented piece',piece:'Invented canon entry.',ts:'fixture time'}],
      slots:[null,{state:{sm:'Imported fixture draft.',context:'Imported fixture brief.','final-draft':'Imported fixture final draft.',fq:'Imported fixture question?',
                         __groqMemoryA:[oldTurn(1),oldTurn(2),oldTurn(3)],__groqMemoryB:[oldTurn(4)]},title:'Imported fixture session',ts:'fixture time',u:2},
             {state:{sm:'A second imported slot.',__groqMemoryA:[oldTurn(5)],__groqMemoryB:[]},title:'Second imported slot',ts:'fixture time',u:3}],
      activeSlot:1, exportedAt:'fixture time'
    };
    app.importState({target:{files:[{text:JSON.stringify(bundle)}],value:'x'}});
    expect('6. the import raised no alert',alerts,[]);
    expect('6. the session comes back',[el('sm').value,el('context').value,el('final-draft').value,el('fq').value],
      ['Imported fixture draft.','Imported fixture brief.','Imported fixture final draft.','Imported fixture question?']);
    expect('6. the vault comes back',JSON.parse(store.fixture_vault||'null'),bundle.vault);
    expect('6. the canon comes back',JSON.parse(store.fixture_canon||'null'),bundle.canon);
    expect('6. the saved slots come back, as exported',JSON.parse(store.cw_slots_v1||'null'),bundle.slots);
    expect('6. the active slot comes back',store.cw_active_slot_v1,'1');
    expect('6. the memory is empty, over a page that held notes',[app.memory().a,app.memory().b],[[],[]]);
    expect('6. the badges read empty',[el('mem-badge-a').textContent,el('mem-badge-b').textContent],['MEM 0/4','MEM 0/4']);
    expect('6. a round read after the import is version 1',app.groqDraftVersion('a','Imported fixture final draft.'),1);
    hold('whole',el('sm').value==='Imported fixture draft.'&&JSON.stringify(JSON.parse(store.cw_slots_v1))===JSON.stringify(bundle.slots)&&
      JSON.stringify(JSON.parse(store.fixture_vault||'null'))===JSON.stringify(bundle.vault)&&JSON.stringify(JSON.parse(store.fixture_canon||'null'))===JSON.stringify(bundle.canon));
    app.loadSlot(2);
    expect('6. loading the second imported slot: still empty',[app.memory().a,app.memory().b],[[],[]]);
    discard=discard&&app.memory().a.length===0&&app.memory().b.length===0; discardDone++;
  });
  await group('6. a new session',async function(){
    reset(); seed('a'); seed('b');
    store.cw_slots_v1='[]'; store.cw_active_slot_v1='0';
    app.newSession();
    expect('6. a new session starts with empty memory',[app.memory().a,app.memory().b],[[],[]]);
    expect('6. and the session it left keeps its notes in its slot',JSON.parse(store.cw_slots_v1)[0].state.__groqMemoryA.length,2);
    expect('6. a text read in the old session is version 1 in the new one',app.groqDraftVersion('a',DRAFT_TWO),1);
    discard=discard&&app.memory().a.length===0; discardDone++;
  });
  // A group that stopped early holds nothing: all five must have run to their end.
  hold('discard',discard&&discardDone===5);
  await group('6. a v41.12 save and export come back with their notes',async function(){
    reset(); seed('a');
    store.cw_slots_v1='[]'; store.cw_active_slot_v1='0';
    app.saveCurrentToSlot(0);
    var saved=JSON.parse(store.cw_slots_v1);
    expect('6. a save stores the notes and the draft list',[saved[0].state.__groqMemoryA.length,saved[0].state.__groqDraftsA.length],[2,2]);
    var bundle=JSON.stringify({session:{sm:DRAFT_ONE},vault:[],canon:[],slots:saved,activeSlot:0,exportedAt:'fixture time'});
    reset();
    app.importState({target:{files:[{text:bundle}],value:'x'}});
    expect('6. the notes come back on import',app.memory().a.map(function(x){return [x.stage,x.rating,x.draft];}),[['sparring-sm','4/10',1],['battle-snratio','62%',2]]);
    expect('6. and the draft numbers go on from where they were',[app.groqDraftVersion('a',DRAFT_TWO),app.groqDraftVersion('a',DRAFT_THREE)],[2,3]);
    var exportSrc=extractFn('exportAll');
    expect('6. EXPORT ALL writes the saved slots, which hold the notes',/slots:\s*ldSlots\(\)/.test(exportSrc),true);
    hold('roundtrip',app.memory().a.length===2&&app.groqDraftVersion('a',DRAFT_THREE)===3&&/slots:\s*ldSlots\(\)/.test(exportSrc));
  });
  await group('6. what erases the notes',async function(){
    reset(); seed('a'); seed('b');
    store.cw_slots_v1=JSON.stringify([savedSlot([],[])]); store.cw_active_slot_v1='0';
    app.clearSession();
    var cleared=[app.memory().a.length,app.memory().b.length,app.groqDraftVersion('a',DRAFT_TWO)];
    expect('6. clearing the session erases the notes and the draft numbers',cleared,[0,0,1]);
    reset(); seed('a');
    store.cw_slots_v1=JSON.stringify([savedSlot([],[])]); store.cw_active_slot_v1='0';
    app.deleteSlot(0);
    var deleted=[app.memory().a.length,app.groqDraftVersion('a',DRAFT_TWO)];
    expect('6. deleting the active slot erases them',deleted,[0,1]);
    var stageClears=['clearSparringStage','clearBattleStage','clearSynthesisRounds'].map(function(n){
      var src=html.slice(html.indexOf('function '+n+'('),braceEnd(html,html.indexOf('{',html.indexOf('function '+n+'(')))+1);
      return /groqMemory|groqDrafts|loadGroqMemoryFromState/.test(src);
    });
    expect('6. the stage clears do not touch the memory',stageClears,[false,false,false]);
    expect('6. the page\'s session clear button reads CLEAR and each stage\'s reads CLEAR ALL',
      [/onclick="clearSession\(\)">CLEAR</.test(html),/onclick="clearSparringStage\(\)"[^>]*>CLEAR ALL</.test(html)],[true,true]);
    hold('erase',cleared.join()==='0,0,1'&&deleted.join()==='0,1'&&stageClears.every(function(x){return !x;}));
  });

  // 8. The version (read before the panel, which names it).
  var version=(/\nconst APP_VERSION='([^']*)'/.exec(html)||[])[1];
  expect('8. APP_VERSION',version,'v41.12');
  hold('version',version==='v41.12');

  // 7. The panel: every sentence, each held to the checks named beside it.
  await group('7. the panel',async function(){
    var text=memoryText();
    expect('7. the line beside the SESSION MEMORY switch',text.row,PANEL_ROW);
    expect('7. that line is held by the cap, the follow-up and the fresh-read checks',[held.cap,held.followup,held.fresh],[true,true,true]);
    var got=sentences(text.note).map(function(s){return s.trim();});
    expect('7. the sentences of the memory note, in order',got,PANEL.map(function(p){return p[0];}));
    PANEL.forEach(function(p){
      expect('7. "'+p[0].slice(0,60)+(p[0].length>60?'…':'')+'" is held by '+p[1].join(', '),p[1].map(function(k){return held[k]===true;}),p[1].map(function(){return true;}));
    });
    expect('7. no sentence of the old text is left',/last 4 exchanges|keep separate threads|Preserved on export\/import/.test(plain(panel)),false);
    var titles=(html.match(/<span class="mem-badge[^>]*title="([^"]*)"/g)||[]).map(function(t){return /title="([^"]*)"/.exec(t)[1];});
    expect('7. the four MEM badges say they count stored notes',titles.map(function(t){return /stored/.test(t)&&!/exchanges/.test(t);}),[true,true,true,true]);
  });

  finished=true;
  if(failures.length){
    console.log('crew_memory_check: FAIL ('+failures.length+' failure(s)) ('+htmlPath+')');
    process.exit(1);
  }
  console.log('crew_memory_check: PASS ('+htmlPath+')');
})();
