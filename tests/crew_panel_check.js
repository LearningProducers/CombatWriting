// crew_panel_check.js: the AI crew setup can be found, read to its end, and
// starts a new visitor with two models.
//
// Reads index.html as text for the markup and the stylesheet, and runs the
// REAL updateGroqSlotUI extracted from it by a brace walk (never a
// re-implementation) against a fixture page: an invented localStorage and
// invented slot rows. No key, no network, no browser.
//
// What it pins:
//   1. The rule for #groq-config-drawer.open sets overflow-y:auto and a
//      max-height in viewport units, and no rule in the file gives the open
//      panel a pixel ceiling (comments are stripped first, so a history
//      comment that names an old ceiling does not count).
//   2. The text of #groq-help-btn is "AI CREW".
//   3. Inside #groq-config-drawer there are exactly two <details> elements,
//      each closed and each with a <summary>. The console.groq.com link, the
//      key input and both slot toggles sit outside any <details>.
//   4. Nothing was deleted: five phrases of the old panel are still inside it.
//   5. No string in the file tells the reader to use "?" for Groq setup.
//   6. The slot default. With nothing stored, rows a and b are enabled and
//      row c is disabled. With '0' stored for slot b, row b is disabled. The
//      #groq-toggle-b input carries checked.
//
// What it does not pin: how the page looks. Sizes, colors and whether the
// last line of the open panel can be scrolled into view are measured in a
// browser, not here.
//
// Run from the repo root:   node tests/crew_panel_check.js
// Optional first argument: a path to a different index.html to measure.
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path');
var htmlPath=process.argv[2]||path.join(__dirname,'..','index.html');
var html=fs.readFileSync(htmlPath,'utf8');

var failures=[], finished=false;
// A run that stops before its verdict line is a failure, never a pass.
process.on('exit',function(code){
  if(!finished&&code===0){console.log('crew_panel_check: FAIL (stopped before the verdict)');process.exitCode=1;}
});
function expect(label,got,want){
  var ok=JSON.stringify(got)===JSON.stringify(want);
  console.log((ok?'PASS ':'FAIL ')+label+': got '+JSON.stringify(got)+', want '+JSON.stringify(want));
  if(!ok)failures.push(label);
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

// ── The stylesheet: every rule, with the rules inside @media blocks. ──
function cssRules(css){
  var out=[], i=0;
  while(i<css.length){
    var open=css.indexOf('{',i);
    if(open<0)break;
    var prelude=css.slice(i,open).trim(), close=braceEnd(css,open), body=css.slice(open+1,close);
    if(/^@(media|supports|layer|container)\b/.test(prelude))out=out.concat(cssRules(body));
    else if(prelude[0]!=='@')out.push({selectors:prelude.split(',').map(function(s){return s.trim();}),body:body});
    i=close+1;
  }
  return out;
}
function declarations(body,prop){
  return body.split(';').map(function(d){
    var c=d.indexOf(':');
    return c<0?null:{prop:d.slice(0,c).trim().toLowerCase(),value:d.slice(c+1).trim().toLowerCase()};
  }).filter(function(d){return d&&d.prop===prop;}).map(function(d){return d.value.replace(/\s*!important$/,'');});
}
var css=(html.match(/<style[^>]*>[\s\S]*?<\/style>/g)||[]).map(function(b){
  return b.replace(/^<style[^>]*>/,'').replace(/<\/style>$/,'');
}).join('\n').replace(/\/\*[\s\S]*?\*\//g,'');
var OPEN='#groq-config-drawer.open';
var openRules=cssRules(css).filter(function(r){return r.selectors.indexOf(OPEN)>=0;});
var ceilings=[], heights=[], overflowY=[];
openRules.forEach(function(r){
  ceilings=ceilings.concat(declarations(r.body,'max-height'));
  heights=heights.concat(declarations(r.body,'height'));
  overflowY=overflowY.concat(declarations(r.body,'overflow-y'));
});
var VIEWPORT=/^\d+(\.\d+)?[sld]?vh$/;

// ── The panel: #groq-config-drawer, from its opening tag to its own </div>. ──
function panelSource(){
  var at=html.indexOf('<div id="groq-config-drawer"');
  if(at<0)throw new Error('panel: #groq-config-drawer not found in '+htmlPath);
  var re=/<div\b|<\/div>/g, depth=0, m;
  re.lastIndex=at;
  while((m=re.exec(html))){
    if(m[0]==='</div>'){depth--;if(depth===0)return html.slice(at,m.index+6);}
    else depth++;
  }
  throw new Error('panel: #groq-config-drawer is never closed');
}
var panel=panelSource();
var folds=[], dre=/<details\b[^>]*>/g, dm;
while((dm=dre.exec(panel))){
  var end=panel.indexOf('</details>',dm.index);
  folds.push({tag:dm[0],start:dm.index,end:end<0?panel.length:end+10,inner:panel.slice(dm.index+dm[0].length,end<0?panel.length:end)});
}
// 'outside', 'inside a <details>', or 'missing' for a piece of the panel.
function placeOf(needle){
  var at=panel.search(needle);
  if(at<0)return 'missing';
  return folds.some(function(f){return at>=f.start&&at<f.end;})?'inside a <details>':'outside';
}
var panelText=panel.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ');

// ── The slot default: the real updateGroqSlotUI on a fixture page. ──
var store={}, rows={};
function row(id){
  if(!rows[id]){
    var set={};
    rows[id]={classList:{
      toggle:function(c,on){ if(on===undefined)on=!set[c]; if(on)set[c]=true; else delete set[c]; return !!on; },
      contains:function(c){return !!set[c];}
    }};
  }
  return rows[id];
}
var page={
  g:row,
  localStorage:{getItem:function(k){return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null;},
                setItem:function(k,x){store[k]=String(x);},removeItem:function(k){delete store[k];}}
};
var names=Object.keys(page);
var source=['GROQ_FAMILY_A','GROQ_FAMILY_B','GROQ_SLOT_MAP'].map(extractVar)
  .concat(['updateGroqSlotUI'].map(extractFn)).join('\n');
var app=new Function(names.join(','),source+'\nreturn {update:updateGroqSlotUI,map:GROQ_SLOT_MAP};')
  .apply(null,names.map(function(n){return page[n];}));
// Each row starts in the state the function must undo, so a function that
// does nothing cannot pass: a and b start disabled, c starts enabled.
function slotStates(){
  var out={};
  ['a','b','c'].forEach(function(slot){
    var r=row(app.map[slot].rowId);
    r.classList.toggle('groq-slot-disabled',slot!=='c');
    app.update(slot);
    out[slot]=r.classList.contains('groq-slot-disabled')?'disabled':'enabled';
  });
  return out;
}

// 1. The open panel scrolls and has no pixel ceiling.
expect('1. a rule for #groq-config-drawer.open exists',openRules.length>0,true);
expect('1. the open panel sets overflow-y:auto',overflowY.indexOf('auto')>=0,true);
expect('1. the open panel has a max-height',ceilings.length>0,true);
expect('1. every max-height of the open panel is in viewport units',
  ceilings.filter(function(x){return !VIEWPORT.test(x);}),[]);
expect('1. no rule gives the open panel a pixel ceiling',
  ceilings.concat(heights).filter(function(x){return /px/.test(x);}),[]);
expect('1. the panel tag carries no inline ceiling',
  /max-height|[^-]height/.test((html.match(/<div id="groq-config-drawer"[^>]*>/)||[''])[0]),false);

// 2. The button says what it opens.
var btn=html.match(/<button\b[^>]*\bid="groq-help-btn"[^>]*>([\s\S]*?)<\/button>/);
expect('2. the text of #groq-help-btn',btn?btn[1].replace(/<[^>]*>/g,'').trim():null,'AI CREW');

// 3. The detail is folded; the setup itself is not.
expect('3. <details> elements inside the panel',folds.length,2);
expect('3. each <details> has a <summary>',
  folds.map(function(f){return /^\s*<summary\b[^>]*>[\s\S]*?<\/summary>/.test(f.inner);}),[true,true]);
expect('3. each <details> is closed',
  folds.map(function(f){return /\sopen\b/.test(f.tag);}),[false,false]);
expect('3. the console.groq.com link',placeOf(/<a\b[^>]*href="https:\/\/console\.groq\.com\/?"/),'outside');
expect('3. the key input',placeOf(/id="groq-key-input"/),'outside');
expect('3. the Slot A toggle',placeOf(/id="groq-toggle-a"/),'outside');
expect('3. the Slot B toggle',placeOf(/id="groq-toggle-b"/),'outside');

// 4. Nothing was deleted.
['One key covers both slots','Per-slot memory','The roster is read live','413','Never share your API key'].forEach(function(p){
  expect('4. the panel still says "'+p+'"',panelText.indexOf(p)>=0,true);
});

// 5. Nothing points the reader at a "?".
expect('5. occurrences of "click ?" in the file',html.split('click ?').length-1,0);
expect('5. occurrences of "Groq ?" in the file',html.split('Groq ?').length-1,0);

// 6. A new visitor has two models; a stored switch still wins.
store={};
expect('6. nothing stored',slotStates(),{a:'enabled',b:'enabled',c:'disabled'});
store={}; store[app.map.b.enabledKey]='0';
expect('6. \'0\' stored for slot b',slotStates(),{a:'enabled',b:'disabled',c:'disabled'});
var toggleB=html.match(/<input\b[^>]*\bid="groq-toggle-b"[^>]*>/);
expect('6. the #groq-toggle-b input carries checked',toggleB?/\schecked\b/.test(toggleB[0]):null,true);

finished=true;
if(failures.length){
  console.log('crew_panel_check: FAIL ('+failures.length+' failure(s)) ('+htmlPath+')');
  process.exit(1);
}
console.log('crew_panel_check: PASS ('+htmlPath+')');
