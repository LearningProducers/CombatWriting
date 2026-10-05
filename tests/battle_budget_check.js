// battle_budget_check.js: a Battle round too long to send says so.
//
// Runs the REAL fireGroqBattle, groqBudgetError and getMaxTokens extracted
// from index.html by a brace walk (never a re-implementation), with the page
// (g, v, localStorage, alert, onFC) and the network (fetch) replaced by
// fixtures. No key, no network: the catalog record is synthetic.
//
// What it pins: a Battle round whose input alone meets the model's
// per-minute wall is not sent, the round's answer box shows the
// "Too long to send." message instead of staying on "Groq thinking...",
// the fire button comes back, and the function finishes without throwing.
// A round whose input sits under the wall but leaves less than the model's
// reply floor is refused the same way: it is not sent with a reply budget
// under the floor. A short round on the same fixtures still goes out exactly
// once and its reply reaches the answer box, so the refusal is not the only
// path tested.
//
// The input of each round is read from the real groqBudgetError call (a
// wrapper records what it was handed and then runs it), so the second case
// is sized from the app's own count, not from a guess at the prompt's length.
//
// Run from the repo root:   node tests/battle_budget_check.js
// Optional first argument: a path to a different index.html to measure.
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path');
var htmlPath=process.argv[2]||path.join(__dirname,'..','index.html');
var html=fs.readFileSync(htmlPath,'utf8');

function braceEnd(src,open){
  var depth=0;
  for(var i=open;i<src.length;i++){
    var ch=src[i];
    if(ch==='{')depth++;
    else if(ch==='}'){depth--;if(depth===0)return i;}
  }
  throw new Error('extract: unbalanced braces');
}
function extractFn(name){
  var at=html.indexOf('function '+name+'(');
  if(at<0)throw new Error('extract: function '+name+' not found in '+htmlPath);
  var start=(html.slice(at-6,at)==='async ')?at-6:at;
  return html.slice(start,braceEnd(html,html.indexOf('{',at))+1);
}
function extractVar(name){
  var at=html.indexOf('\nvar '+name+' = ');
  if(at<0)at=html.indexOf('\nvar '+name+'=');
  if(at<0)throw new Error('extract: var '+name+' not found in '+htmlPath);
  at+=1;
  var eq=html.indexOf('=',at), i=eq+1;
  while(html[i]===' ')i++;
  if(html[i]==='{')return html.slice(at,braceEnd(html,i)+1)+';';
  return html.slice(at,html.indexOf('\n',at));
}

// The page, as fixtures.
var els={}, store={}, alerts=[], sends=[], changes=0;
function el(id){ if(!els[id])els[id]={value:'',textContent:'',innerHTML:'',disabled:false,style:{}}; return els[id]; }
var page={
  g:el,
  v:function(id){return el(id).value;},
  localStorage:{getItem:function(k){return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null;},
                setItem:function(k,x){store[k]=String(x);},removeItem:function(k){delete store[k];}},
  alert:function(m){alerts.push(m);},
  onFC:function(){changes++;},
  fetch:function(url,opts){
    sends.push({url:url,body:opts&&opts.body});
    return Promise.resolve({status:200,json:function(){return Promise.resolve({choices:[{message:{content:'FIXTURE REPLY'}}]});}});
  },
  AbortController:AbortController,
  CW_CONTEXT:'',
  synthFdEnabled:false,
  groqMemoryEnabled:false,
  groqMemory:{a:[],b:[],c:[]},
  groqAbortControllers:{a:null,b:null,c:null},
  appendGroqMemory:function(){},
  buildGroqMessages:function(slot,sys,user){return [{role:'system',content:sys},{role:'user',content:user}];}
};
var names=Object.keys(page);
var source=[
  'VENDOR_BUDGET','GROQ_NO_VOICE','GROQ_FAMILY_A','GROQ_FAMILY_B','GROQ_SLOT_MAP','GROQ_BATTLE_SLOT_MAP'
].map(extractVar).concat([
  'groqVendorOf','groqDerivedLabel','makeModelConfig','getModelConfig','readStoredSlotModel','getSlotModel',
  'getSlotConfig','getModelLabel','getFDBudget','groqNoVoiceMessage','groqRequestBody','estimateTokens',
  'getMaxTokens','groqBudgetError','fireGroqBattle'
].map(extractFn)).join('\n');
var app=new Function(names.join(','),
  'var MODEL_CONFIG={};\n'+source+
  '\nMODEL_CONFIG["openai/gpt-oss-120b"]=makeModelConfig("openai/gpt-oss-120b","fixture");'+
  '\nvar realBudgetError=groqBudgetError, seen={input:null};'+
  '\ngroqBudgetError=function(slot,sys,user){seen.input=estimateTokens(sys)+estimateTokens(user);return realBudgetError(slot,sys,user);};'+
  '\nvar mc=getModelConfig("openai/gpt-oss-120b");'+
  '\nreturn {fire:fireGroqBattle,wall:mc.hardCap,floor:mc.floor,seen:seen};'
).apply(null,names.map(function(n){return page[n];}));

var failures=[], finished=false;
// A run that stops before its verdict line is a failure, never a pass.
process.on('exit',function(code){
  if(!finished&&code===0){console.log('battle_budget_check: FAIL (stopped before the verdict)');process.exitCode=1;}
});
function expect(label,got,want){
  var ok=got===want;
  console.log((ok?'PASS ':'FAIL ')+label+': got '+JSON.stringify(got)+', want '+JSON.stringify(want));
  if(!ok)failures.push(label);
}

store.cw_groq_key='fixture-key-not-real';
store.cw_groq_slot_a_enabled='1';
store.cw_groq_slot_a_model='openai/gpt-oss-120b';
el('gbb-a-fq').textContent='FIRE A';

(async function(){
  // 1. A round whose question alone is past the wall.
  el('fq').value=new Array(app.wall*4+2).join('x');
  var threw=null;
  try{ await app.fire('a','fq'); }catch(e){ threw=String(e&&e.message||e); }
  expect('a too-long round finishes without throwing',threw,null);
  expect('a too-long round is not sent',sends.length,0);
  expect('the answer box shows the too-long message',el('battle-groq-x1').value.indexOf('Too long to send.')===0,true);
  expect('the answer box is not left on the waiting text',el('battle-groq-x1').value.indexOf('Groq thinking')<0,true);
  expect('the fire button is enabled again',el('gbb-a-fq').disabled,false);

  // 2. A round under the wall that leaves less than the reply floor:
  //    about wall - floor + 50 tokens of input, sized from case 1's count.
  var overhead=app.seen.input-Math.ceil(el('fq').value.length/4);
  var target=app.wall-app.floor+50;
  el('fq').value=new Array((target-overhead)*4+1).join('x');
  el('battle-groq-x1').value='';
  var before=sends.length;
  threw=null;
  try{ await app.fire('a','fq'); }catch(e){ threw=String(e&&e.message||e); }
  expect('the under-floor round sits between wall minus floor and the wall',app.seen.input>app.wall-app.floor&&app.seen.input<app.wall,true);
  expect('an under-floor round finishes without throwing',threw,null);
  expect('an under-floor round is not sent',sends.length-before,0);
  expect('the answer box shows the too-long message for it',el('battle-groq-x1').value.indexOf('Too long to send.')===0,true);
  expect('the message names the reply floor',el('battle-groq-x1').value.indexOf(app.floor.toLocaleString())>=0,true);
  expect('the fire button is enabled again after it',el('gbb-a-fq').disabled,false);

  // 3. A short round on the same fixtures still goes out, once.
  el('fq').value='Is the opening claim supported?';
  before=sends.length;
  threw=null;
  try{ await app.fire('a','fq'); }catch(e){ threw=String(e&&e.message||e); }
  expect('a short round finishes without throwing',threw,null);
  expect('a short round is sent exactly once',sends.length-before,1);
  expect('its reply reaches the answer box',el('battle-groq-x1').value,'FIXTURE REPLY');

  finished=true;
  if(failures.length){
    console.log('battle_budget_check: FAIL ('+failures.length+' failure(s)) ('+htmlPath+')');
    process.exit(1);
  }
  console.log('battle_budget_check: PASS ('+htmlPath+')');
})();
