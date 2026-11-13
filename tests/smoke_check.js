// smoke_check.js: the four stages render, and one round completes against a
// fake crew.
//
// Builds a small fixture page from the markup of index.html (every element,
// id, class, inline style and inline handler the file carries) and runs the
// REAL <script> block of index.html against it, whole and unedited (never a
// re-implementation, never an extract). The page is then driven the way a
// visitor drives it: what runs is the handler text of the real buttons and
// fields. The network is a fake crew: an invented model catalog and an
// invented reply stand behind fetch, and every other address is refused.
// No key, no network, no browser, no dependency.
//
// What it pins:
//   1. The page boots. On empty storage the script runs to its end against
//      the markup without throwing and without an alert.
//   2. The four stages render. Strategy, Sparring, Battle and Champion each
//      have a card with a header, a label that reads the stage's name, a body
//      holding at least one field, a stage tab and a nav pill. The page opens
//      on Strategy alone. Each stage tab shows its own card and folds the
//      other three, and the SESSION tab shows all four again.
//   3. One round completes. Source material and a brief are typed into
//      Strategy, a key is saved in the AI crew setup, the crew is armed, and
//      slot A is fired from Sparring. While the crew is out, the answer box
//      reads "Groq thinking" and the fire button is off. The round is sent
//      once, with the key, the source material and the brief, to the model
//      the slot shows. The crew's reply lands in slot A's answer box word for
//      word, the fire button comes back, the memory badge counts one
//      exchange, Sparring is marked done, and the autosave stores the reply.
//   4. Nothing leaves the fixture. The page asks the Groq API twice (the
//      catalog, then the round; the fake crew answers both) and no host
//      other than that one and the local Ollama address, which is refused as
//      on a machine without Ollama.
//
// What it does not pin:
//   - How the page looks. The stylesheet is not applied: "shown" and "folded"
//     are read from inline display and from the classes the script sets. A
//     CSS rule that hides a card is invisible here, and so are sizes, colors
//     and the phone layout. Those are measured in a browser.
//   - A browser. The fixture DOM below is this file's own and holds only what
//     this path uses. Reading or calling anything else on an element throws,
//     so a change to the page can fail here for want of a fixture member; and
//     a call that only a real browser refuses passes here.
//   - Groq. The catalog records and the reply are invented and shaped as the
//     app reads them today. Nothing here shows that the real API still
//     answers in that shape, or what a real model says.
//   - Which model a slot picks from a real catalog. The invented catalog
//     holds two invented vendors, so both slots resolve by the "newest from
//     another vendor" rule. The family rules (an OpenAI open-weight model in
//     A, a Qwen model in B) are not exercised.
//   - Any other round. This is one Sparring rating round on slot A. Custom
//     rounds, Battle rounds, slot B, the Offline AI path, the too-long
//     refusal (tests/battle_budget_check.js) and every error answer are not
//     fired.
//   - A reload. The autosave is read from storage; no second page is booted
//     on it, so what a returning visitor gets back is not pinned.
//   - Champion beyond its card. Publishing, the vault, the canon, export,
//     import, print and the saved slots are not exercised.
//
// Run from the repo root:   node tests/smoke_check.js
// Optional first argument: a path to a different index.html to measure.
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), vm=require('vm');
var htmlPath=process.argv[2]||path.join(__dirname,'..','index.html');
var html=fs.readFileSync(htmlPath,'utf8');

var failures=[], finished=false;
// A run that stops before its verdict line is a failure, never a pass.
process.on('exit',function(code){
  if(!finished&&code===0){console.log('smoke_check: FAIL (stopped before the verdict)');process.exitCode=1;}
});
function fail(label,why){console.log('FAIL '+label+': '+why);failures.push(label);}
function expect(label,got,want){
  var ok=JSON.stringify(got)===JSON.stringify(want);
  console.log((ok?'PASS ':'FAIL ')+label+': got '+JSON.stringify(got)+', want '+JSON.stringify(want));
  if(!ok)failures.push(label);
}
// What the page throws is a failure line that names the page's own line.
var pageFrame=new RegExp(htmlPath.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+':(\\d+)');
function thrown(e){
  var at=pageFrame.exec(String(e&&e.stack||''));
  return (at?'the page threw at line '+at[1]+': ':'')+String(e&&e.message||e);
}
function step(label,fn){
  try{fn();}catch(e){fail(label,thrown(e));return;}
  console.log('PASS '+label);
}
process.on('unhandledRejection',function(e){fail('a promise the page left unhandled',thrown(e));});

// ── The fixture DOM: elements, attributes, classes, inline style, values and
//    one-part selectors. Reading a member it does not have throws, and so does
//    a selector it cannot read: a gap in the fixture is a failure, never a pass. ──
var VOID=/^(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/;
var RAW=/^(script|style|textarea|title)$/;
var NAMED={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
function decode(s){
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,function(m,e){
    if(e[0]==='#')return String.fromCodePoint(/^#x/i.test(e)?parseInt(e.slice(2),16):parseInt(e.slice(1),10));
    return Object.prototype.hasOwnProperty.call(NAMED,e)?NAMED[e]:m;
  });
}
function TextNode(data){this.nodeType=3;this.data=data;this.parentNode=null;}
// Inline style: any property reads '' until set; cssText replaces the lot.
function newStyle(){
  return new Proxy({},{
    get:function(t,k){return (typeof k==='string'&&!(k in t))?'':t[k];},
    set:function(t,k,x){
      if(k!=='cssText'){t[k]=String(x);return true;}
      Object.keys(t).forEach(function(p){delete t[p];});
      String(x).split(';').forEach(function(d){
        var c=d.indexOf(':'); if(c<0)return;
        t[d.slice(0,c).trim().replace(/-([a-z])/g,function(m,ch){return ch.toUpperCase();})]=d.slice(c+1).trim().replace(/\s*!important$/,'');
      });
      return true;
    }
  });
}
var STRICT={get:function(t,k,self){
  if(typeof k==='string'&&k[0]!=='_'&&!(k in t))throw new Error('fixture DOM: <'+t.localName+'> has no "'+k+'"; the smoke fixture does not model it');
  return Reflect.get(t,k,self);
}};
function Elem(tag){
  this.nodeType=1; this.localName=tag; this.tagName=tag.toUpperCase();
  this.attrs={}; this.childNodes=[]; this.parentNode=null; this.style=newStyle();
  return new Proxy(this,STRICT);
}
function textOf(n){return n.nodeType===3?n.data:n.childNodes.map(textOf).join('');}
// Elements under n in document order that test() accepts: the first one, or all of them into out.
function find(n,test,out){
  for(var i=0;i<n.childNodes.length;i++){
    var c=n.childNodes[i];
    if(c.nodeType!==1)continue;
    if(test(c)){ if(!out)return c; out.push(c); }
    var deeper=find(c,test,out);
    if(deeper)return deeper;
  }
  return null;
}
function matcher(selector){
  var want={tag:null,id:null,classes:[],attrs:[]}, rest=String(selector).trim(), m;
  if((m=/^(\*|[a-zA-Z][\w-]*)/.exec(rest))){ if(m[1]!=='*')want.tag=m[1].toLowerCase(); rest=rest.slice(m[0].length); }
  while(rest){
    if((m=/^#([\w-]+)/.exec(rest)))want.id=m[1];
    else if((m=/^\.([\w-]+)/.exec(rest)))want.classes.push(m[1]);
    else if((m=/^\[([\w-]+)(?:="([^"]*)")?\]/.exec(rest)))want.attrs.push({name:m[1],value:m[2]});
    else throw new Error('fixture DOM: selector not supported: '+selector);
    rest=rest.slice(m[0].length);
  }
  return function(el){
    if(want.tag&&el.localName!==want.tag)return false;
    if(want.id!==null&&el.id!==want.id)return false;
    if(!want.classes.every(function(c){return el.classList.contains(c);}))return false;
    return want.attrs.every(function(a){return el.hasAttribute(a.name)&&(a.value===undefined||el.getAttribute(a.name)===a.value);});
  };
}
function adopt(parent,node){
  if(node.parentNode)node.parentNode.removeChild(node);
  node.parentNode=parent; parent.childNodes.push(node); return node;
}
function empty(el){el.childNodes.forEach(function(c){c.parentNode=null;}); el.childNodes=[];}
var P=Elem.prototype;
P.getAttribute=function(k){return Object.prototype.hasOwnProperty.call(this.attrs,k)?this.attrs[k]:null;};
P.hasAttribute=function(k){return Object.prototype.hasOwnProperty.call(this.attrs,k);};
P.setAttribute=function(k,x){this.attrs[k]=String(x); if(k==='style')this.style.cssText=x;};
P.appendChild=function(node){return adopt(this,node);};
P.removeChild=function(node){
  var at=this.childNodes.indexOf(node);
  if(at<0)throw new Error('fixture DOM: removeChild of a node that is not a child');
  this.childNodes.splice(at,1); node.parentNode=null; return node;
};
P.querySelector=function(sel){return find(this,matcher(sel));};
P.querySelectorAll=function(sel){var out=[];find(this,matcher(sel),out);return out;};
function accessor(name,get,set){Object.defineProperty(P,name,{get:get,set:set,configurable:true});}
accessor('id',function(){return this.attrs.id||'';},function(x){this.attrs.id=String(x);});
accessor('className',function(){return this.attrs['class']||'';},function(x){this.attrs['class']=String(x);});
accessor('classList',function(){
  var el=this;
  function names(){return el.className.split(/\s+/).filter(Boolean);}
  function put(list){el.className=list.join(' ');}
  var api={
    contains:function(c){return names().indexOf(c)>=0;},
    add:function(){var list=names();for(var i=0;i<arguments.length;i++)if(list.indexOf(arguments[i])<0)list.push(arguments[i]);put(list);},
    remove:function(){var gone=[].slice.call(arguments);put(names().filter(function(c){return gone.indexOf(c)<0;}));},
    toggle:function(c,on){if(on===undefined)on=!api.contains(c);if(on)api.add(c);else api.remove(c);return !!on;}
  };
  return api;
});
accessor('firstChild',function(){return this.childNodes[0]||null;});
accessor('textContent',function(){return textOf(this);},function(x){
  empty(this);
  if(String(x)!=='')adopt(this,new TextNode(String(x)));
});
accessor('innerHTML',function(){throw new Error('fixture DOM: innerHTML is write-only in the smoke fixture');},function(x){
  empty(this);
  parseInto(this,String(x));
});
// value: a textarea starts as its text, an input as its value attribute, an
// option as its attribute or its text; a select holds only a value one of its
// options carries, as in a browser.
accessor('value',function(){
  if(this.localName==='select'){
    var options=this.querySelectorAll('option'), held=this._value;
    if(held!==undefined&&options.some(function(o){return o.value===held;}))return held;
    return held===undefined&&options.length?options[0].value:'';
  }
  if(this._value!==undefined)return this._value;
  if(this.localName==='textarea')return textOf(this);
  if(this.localName==='option')return this.hasAttribute('value')?this.attrs.value:textOf(this);
  return this.hasAttribute('value')?this.attrs.value:'';
},function(x){this._value=String(x);});
['disabled','checked'].forEach(function(flag){
  accessor(flag,function(){return this['_'+flag]!==undefined?this['_'+flag]:this.hasAttribute(flag);},function(x){this['_'+flag]=!!x;});
});
// onclick: the handler the script assigned, else the one the markup carries.
// Assigning null removes the markup's handler too, as in a browser.
accessor('onclick',function(){
  if(this._onclick!==undefined)return this._onclick;
  return this.hasAttribute('onclick')?handler(this.attrs.onclick):null;
},function(fn){this._onclick=fn;});

function tagClose(src,from){
  var quote='';
  for(var i=from;i<src.length;i++){
    var ch=src[i];
    if(quote){if(ch===quote)quote='';}
    else if(ch==='"'||ch==="'")quote=ch;
    else if(ch==='>')return i;
  }
  return src.length;
}
// HTML to nodes under root. Comments and the doctype are dropped; the text of
// script, style, textarea and title is kept raw (so nothing inside the script
// is read as markup); an end tag closes the nearest open element of its name.
function parseInto(root,src){
  var stack=[root], i=0;
  function top(){return stack[stack.length-1];}
  while(i<src.length){
    var lt=src.indexOf('<',i);
    if(lt<0)lt=src.length;
    if(lt>i)adopt(top(),new TextNode(decode(src.slice(i,lt))));
    if(lt>=src.length)break;
    if(src.startsWith('<!--',lt)){var endc=src.indexOf('-->',lt+4);i=endc<0?src.length:endc+3;continue;}
    if(src[lt+1]==='!'){i=tagClose(src,lt)+1;continue;}
    if(src[lt+1]==='/'){
      var gt=tagClose(src,lt), closing=src.slice(lt+2,gt).trim().toLowerCase();
      for(var k=stack.length-1;k>0;k--)if(stack[k].localName===closing){stack.length=k;break;}
      i=gt+1;continue;
    }
    var name=/^[a-zA-Z][^\s\/>]*/.exec(src.slice(lt+1,lt+40));
    if(!name){adopt(top(),new TextNode('<'));i=lt+1;continue;}
    var end=tagClose(src,lt), inner=src.slice(lt+1+name[0].length,end), el=new Elem(name[0].toLowerCase());
    var are=/([^\s=\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+)))?/g, a;
    while((a=are.exec(inner)))el.setAttribute(a[1].toLowerCase(),decode(a[2]!==undefined?a[2]:a[3]!==undefined?a[3]:a[4]!==undefined?a[4]:''));
    adopt(top(),el);
    i=end+1;
    if(VOID.test(el.localName))continue;
    if(RAW.test(el.localName)){
      var stop=src.toLowerCase().indexOf('</'+el.localName,i);
      if(stop<0)stop=src.length;
      var raw=src.slice(i,stop);
      if(raw)adopt(el,new TextNode(/^(textarea|title)$/.test(el.localName)?decode(raw):raw));
      i=tagClose(src,stop)+1;continue;
    }
    stack.push(el);
  }
}

// ── The page: the body of index.html, parsed. Its script is run in step 1. ──
var bodyAt=html.search(/<body\b/i);
if(bodyAt<0)throw new Error('page: no <body> in '+htmlPath);
var root=new Elem('html');
parseInto(root,html.slice(bodyAt));
var scripts=root.querySelectorAll('script');
var listeners={};
var doc={
  body:root.querySelector('body'), hidden:false,
  getElementById:function(id){return find(root,function(el){return el.attrs.id===id;});},
  querySelector:function(sel){return root.querySelector(sel);},
  querySelectorAll:function(sel){return root.querySelectorAll(sel);},
  createElement:function(tag){return new Elem(String(tag).toLowerCase());},
  addEventListener:function(type,fn){(listeners[type]=listeners[type]||[]).push(fn);}
};

// ── The clock. A timer the page sets runs only when the check moves the clock. ──
var now=0, timers=[], timerSeq=0;
function addTimer(fn,ms,every){timers.push({id:++timerSeq,at:now+(Number(ms)||0),fn:fn,every:every?Math.max(1,Number(ms)||0):0});return timerSeq;}
function dropTimer(id){timers=timers.filter(function(t){return t.id!==id;});}
function advance(ms){
  var until=now+ms;
  for(;;){
    var due=timers.filter(function(t){return t.at<=until;}).sort(function(a,b){return a.at-b.at||a.id-b.id;})[0];
    if(!due)break;
    now=due.at;
    if(due.every)due.at+=due.every; else dropTimer(due.id);
    try{due.fn();}catch(e){fail('a timer the page set',thrown(e));}
  }
  now=until;
}

// ── The fake crew. Two invented models from two invented vendors and one
//    invented reply. Every address that is not the Groq API is refused. ──
var GROQ='https://api.groq.com/';
var KEY='fixture-key-not-real';
var CATALOG=[
  {id:'fixture-one/alpha-1b',object:'model',created:2000000002,owned_by:'Fixture One (invented)',active:true,context_window:65536,max_completion_tokens:8192},
  {id:'fixture-two/beta-2b',object:'model',created:2000000001,owned_by:'Fixture Two (invented)',active:true,context_window:65536,max_completion_tokens:8192}
];
var REPLY='Rating: 4/10\n\nFixture verdict: the draft states the change and hides what it costs the reader.';
var SOURCE='Fixture draft: the ferry now leaves at dawn, and the notice on the pier still says noon.';
var BRIEF='Fixture brief: a notice for riders; nobody may be left on the pier.';
var requests=[], alerts=[], store={};
function answer(status,data){return Promise.resolve({status:status,ok:status>=200&&status<300,json:function(){return Promise.resolve(data);}});}
function fakeFetch(url,opts){
  url=String(url);
  var auth=opts&&opts.headers&&opts.headers.Authorization||'';
  requests.push({url:url,auth:auth,body:opts&&opts.body||''});
  if(url.indexOf(GROQ)!==0)return Promise.reject(new TypeError('smoke fixture: no network ('+url+')'));
  if(auth!=='Bearer '+KEY)return answer(401,{error:{message:'fixture: unknown key'}});
  if(/\/models$/.test(url))return answer(200,{object:'list',data:CATALOG});
  if(/\/chat\/completions$/.test(url))return answer(200,{choices:[{index:0,message:{role:'assistant',content:REPLY},finish_reason:'stop'}]});
  return answer(404,{error:{message:'fixture: no such address'}});
}

// ── The window the script runs in. A global it reaches for that is not here
//    is a ReferenceError in the page, and so a failure. ──
var win={
  document:doc,
  localStorage:{getItem:function(k){return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null;},
                setItem:function(k,x){store[k]=String(x);},removeItem:function(k){delete store[k];}},
  navigator:{userAgent:'smoke fixture (desktop)'},
  location:{protocol:'https:',href:'https://fixture.invalid/'},
  innerWidth:1280,
  scrollTo:function(){},
  alert:function(m){alerts.push(String(m));},
  fetch:fakeFetch,
  AbortController:AbortController,
  setTimeout:function(fn,ms){return addTimer(fn,ms,false);},
  setInterval:function(fn,ms){return addTimer(fn,ms,true);},
  clearTimeout:dropTimer,
  clearInterval:dropTimer,
  console:console
};
win.window=win;
var context=vm.createContext(win);
function handler(code){return vm.runInContext('(function(event){'+code+'\n})',context);}

// ── A visitor's hands. Each refuses what a visitor could not do: act on an
//    element that is not in the page, is switched off, or sits under an
//    element with inline display:none. ──
function need(id){
  var el=doc.getElementById(id);
  if(!el)throw new Error('#'+id+' is not in the page');
  if(el.disabled)throw new Error('#'+id+' is disabled');
  for(var n=el;n&&n.nodeType===1;n=n.parentNode)
    if(n.style.display==='none')throw new Error('#'+id+' is not shown (display:none on '+(n.id?'#'+n.id:'<'+n.localName+'>')+')');
  return el;
}
function dispatch(kind,el){
  var event={type:kind,target:el,preventDefault:function(){},stopPropagation:function(){}};
  (listeners[kind]||[]).forEach(function(fn){fn.call(doc,event);});
  return event;
}
// A click runs the element's handler, then each ancestor's, as a bubbling click does.
function click(id){
  var el=need(id), event=dispatch('click',el);
  for(var n=el;n&&n.nodeType===1;n=n.parentNode){var fn=n.onclick; if(typeof fn==='function')fn.call(n,event);}
}
function type(id,text){
  var el=need(id);
  el.value=text;
  var event=dispatch('input',el);
  if(el.hasAttribute('oninput'))handler(el.attrs.oninput).call(el,event);
}
// The page's awaits finish; the clock does not move.
function settle(){
  var turns=Promise.resolve();
  for(var i=0;i<5;i++)turns=turns.then(function(){return new Promise(function(done){setImmediate(done);});});
  return turns;
}

var STAGES=['STRATEGY','SPARRING','BATTLE','CHAMPION'];
function el(id){return doc.getElementById(id);}
function text(id){var e=el(id);return e?e.textContent.replace(/\s+/g,' ').trim():null;}
function value(id){var e=el(id);return e?e.value:null;}
function has(id,cls){var e=el(id);return e?e.classList.contains(cls):null;}
function pill(stage){return doc.querySelector('.nav-pill[data-stage="'+stage+'"]');}
// 'shown' when the card is in the page, nothing above it is display:none and
// its body is displayed; 'folded' when its body is display:none; else what is missing.
function cardState(stage){
  var card=el('card-'+stage);
  if(!card)return 'no card';
  var cardBody=card.querySelector('.card-body');
  if(!cardBody)return 'no body';
  for(var n=card;n&&n.nodeType===1;n=n.parentNode)if(n.style.display==='none')return 'hidden under '+(n.id||n.localName);
  return cardBody.style.display==='none'?'folded':'shown';
}
function stageStates(){var out={};STAGES.forEach(function(s){out[s]=cardState(s);});return out;}
function only(stage){var out={};STAGES.forEach(function(s){out[s]=s===stage?'shown':'folded';});return out;}
function every(state){var out={};STAGES.forEach(function(s){out[s]=state;});return out;}
function litStageTabs(){return STAGES.filter(function(s){return has('tn-stage-'+s,'active-stage-'+s);});}
function withClass(cls){return STAGES.filter(function(s){return has('card-'+s,cls);});}
function doneStages(){return STAGES.filter(function(s){var p=pill(s);return !!p&&p.classList.contains('done-'+s);});}
function groqCalls(){return requests.filter(function(r){return r.url.indexOf(GROQ)===0;});}
function sent(suffix){return groqCalls().filter(function(r){return r.url.slice(-suffix.length)===suffix;});}

async function visit(){
  // 1. The page boots.
  expect('1. inline <script> blocks in the page',scripts.length,1);
  step('1. the script runs to its end',function(){
    var source=scripts.length?textOf(scripts[0]):'';
    var linesBefore=html.slice(0,html.indexOf(source)).split('\n').length-1;
    new vm.Script(source,{filename:htmlPath,lineOffset:linesBefore}).runInContext(context);
  });
  await settle();
  expect('1. alerts at boot',alerts,[]);

  // 2. The four stages render.
  STAGES.forEach(function(s){
    var card=el('card-'+s), header=el('header-'+s), cardBody=card&&card.querySelector('.card-body');
    expect('2. '+s+' has a card with the stage-card class',has('card-'+s,'stage-card'),true);
    expect('2. '+s+' header sits in its card',!!card&&!!header&&header.parentNode===card,true);
    expect('2. '+s+' label reads',text('label-'+s),s);
    expect('2. '+s+' body holds at least one field',!!cardBody&&cardBody.querySelectorAll('textarea').length>0,true);
    expect('2. '+s+' stage tab reads',text('tn-stage-'+s),s);
    expect('2. '+s+' nav pill reads',pill(s)?pill(s).textContent.trim():null,s);
  });
  expect('2. the page opens on Strategy alone',stageStates(),only('STRATEGY'));
  expect('2. the stage tab lit at boot',litStageTabs(),['STRATEGY']);
  ['SPARRING','BATTLE','CHAMPION','STRATEGY'].forEach(function(s){
    step('2. click the '+s+' stage tab',function(){click('tn-stage-'+s);});
    expect('2. the '+s+' tab shows its card and folds the other three',stageStates(),only(s));
    expect('2. the stage tab lit after the '+s+' tab',litStageTabs(),[s]);
    expect('2. the focused card after the '+s+' tab',withClass('focused'),[s]);
  });
  step('2. click the SESSION tab',function(){click('tn-session');});
  expect('2. the SESSION tab shows all four cards',stageStates(),every('shown'));
  expect('2. cards still folded or focused under SESSION',withClass('collapsed').concat(withClass('focused')),[]);
  expect('2. stages marked done on an empty session',doneStages(),[]);

  // 3. One round completes.
  step('3. open Strategy, type the source material and the brief',function(){
    click('tn-stage-STRATEGY'); type('sm',SOURCE); type('context',BRIEF);
  });
  expect('3. stages marked done once Strategy holds text',doneStages(),['STRATEGY']);
  expect('3. display of ARM GROQ CREW before a key is saved',el('groq-arm-btn')?el('groq-arm-btn').style.display:null,'none');

  step('3. open the AI crew setup, type the key, press SAVE KEY',function(){
    click('groq-help-btn'); type('groq-key-input',KEY); click('groq-save-btn');
  });
  expect('3. the AI crew setup is open',has('groq-config-drawer','open'),true);
  await settle();
  expect('3. the catalog was read once, with the key',sent('/models').map(function(r){return r.auth;}),['Bearer '+KEY]);
  expect('3. the key is stored',store.cw_groq_key,KEY);
  expect('3. slot A shows the first invented model',value('groq-model-a'),CATALOG[0].id);
  expect('3. slot B shows the second invented model',value('groq-model-b'),CATALOG[1].id);
  advance(1500);
  expect('3. the setup is still open 1.5 seconds after the save',has('groq-config-drawer','open'),false);

  step('3. open Sparring, press ARM GROQ CREW',function(){click('tn-stage-SPARRING'); click('groq-arm-btn');});
  expect('3. the Sparring card is armed',has('card-SPARRING','groq-armed'),true);
  expect('3. slot A\'s answer box before the round',value('r-x1'),'');
  expect('3. rounds sent before the fire',sent('/chat/completions').length,0);

  step('3. press slot A\'s fire button',function(){click('groq-fire-a');});
  expect('3. while the crew is out, slot A\'s answer box reads',value('r-x1'),'Groq thinking…');
  expect('3. while the crew is out, the fire button is off',el('groq-fire-a')?el('groq-fire-a').disabled:null,true);
  await settle();
  var rounds=sent('/chat/completions'), round={};
  try{round=JSON.parse(rounds.length?rounds[0].body:'{}');}catch(e){round={};}
  var said=(round.messages||[]).map(function(m){return String(m.content);}).join('\n');
  expect('3. the round was sent once, with the key',rounds.map(function(r){return r.auth;}),['Bearer '+KEY]);
  expect('3. the round names the model slot A shows',round.model,CATALOG[0].id);
  expect('3. the round carries the source material',said.indexOf(SOURCE)>=0,true);
  expect('3. the round carries the brief',said.indexOf(BRIEF)>=0,true);
  expect('3. the round asks for room to reply',typeof round.max_tokens==='number'&&round.max_tokens>0,true);
  expect('3. slot A\'s answer box holds the reply, word for word',value('r-x1'),REPLY);
  expect('3. the fire button after the reply (off, text)',el('groq-fire-a')?[el('groq-fire-a').disabled,text('groq-fire-a')]:null,[false,'▶ A']);
  expect('3. display of the cancel button after the reply',el('groq-abort-a')?el('groq-abort-a').style.display:null,'none');
  expect('3. slot B\'s answer box, which was not fired',value('r-x2'),'');
  expect('3. the memory badge of slot A',text('mem-badge-a'),'MEM 1/4');
  expect('3. stages marked done after the round',doneStages(),['STRATEGY','SPARRING']);
  advance(500);
  var kept=Object.keys(store).filter(function(k){
    try{var st=JSON.parse(store[k]);return !!st&&st['r-x1']===REPLY&&st.sm===SOURCE;}catch(e){return false;}
  });
  expect('3. the autosave stored the reply beside the source material',kept.length>0,true);
  expect('3. alerts during the round',alerts,[]);

  // 4. Nothing left the fixture.
  expect('4. what the page asked the Groq API, in order',
    groqCalls().map(function(r){return r.url.slice(GROQ.length-1);}),['/openai/v1/models','/openai/v1/chat/completions']);
  expect('4. requests to any host but the Groq API and the local Ollama address',
    requests.filter(function(r){return r.url.indexOf(GROQ)!==0&&r.url.indexOf('http://localhost:11434/')!==0;}).map(function(r){return r.url;}),[]);
}

visit().catch(function(e){fail('the check stopped early',String(e&&e.stack||e));}).then(settle).then(function(){
  finished=true;
  if(failures.length){
    console.log('smoke_check: FAIL ('+failures.length+' failure(s)) ('+htmlPath+')');
    process.exit(1);
  }
  console.log('smoke_check: PASS ('+htmlPath+')');
});
