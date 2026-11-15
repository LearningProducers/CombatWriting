// page_lift.js: the lifting code the checks and the request builder share.
//
// It takes the REAL code out of index.html, read as text, by a brace walk, and
// runs it against a fixture page: invented elements and an invented
// localStorage. It never holds a copy of a page function. It is not a check
// (its name does not end in _check.js, so the workflow does not run it) and
// it prints nothing.
//
// Used by tests/crew_memory_check.js, tests/build_requests.js and
// tests/build_requests_check.js:
//
//   var lift=require('./page_lift');
//   var from=lift.from(html);                 // html: the text of index.html
//   from.fn('fireGroqBattle')                 // the source of a function, or ''
//   from.variable('VENDOR_BUDGET')            // the source of a top-level var, or ''
//   from.constant('APP_VERSION')              // the source of a one-line const, or ''
//   var el=lift.elements();                   // el(id): an element, made when first asked for
//   lift.storage(store)                       // a localStorage over the plain object store
//   lift.exportsOf(['fireGroqBattle'])        // code that puts each lifted function on out
//   lift.run(page, code)                      // run code with each member of page as a local name

// The index of the brace that closes the one at open.
function braceEnd(src,open){
  var depth=0;
  for(var i=open;i<src.length;i++){
    var ch=src[i];
    if(ch==='{')depth++;
    else if(ch==='}'){depth--;if(depth===0)return i;}
  }
  throw new Error('extract: unbalanced braces');
}

function from(html){
  return {
    // The source of a function, or '' when the page has none by that name.
    fn:function(name){
      var at=html.indexOf('function '+name+'(');
      if(at<0)return '';
      var start=(html.slice(at-6,at)==='async ')?at-6:at;
      return html.slice(start,braceEnd(html,html.indexOf('{',at))+1);
    },
    // The source of a top-level var: its whole object when it opens with a
    // brace, else its line.
    variable:function(name){
      var at=html.indexOf('\nvar '+name+' = ');
      if(at<0)at=html.indexOf('\nvar '+name+'=');
      if(at<0)return '';
      at+=1;
      var eq=html.indexOf('=',at), i=eq+1;
      while(html[i]===' ')i++;
      if(html[i]==='{')return html.slice(at,braceEnd(html,i)+1)+';';
      return html.slice(at,html.indexOf('\n',at));
    },
    // The source of a const that is written on one line.
    constant:function(name){
      var m=new RegExp('\\nconst '+name+'\\s*=[^\\n]*').exec(html);
      return m?m[0].slice(1):'';
    }
  };
}

// The fixture page's elements. el(id) makes an element the first time it is
// asked for and gives the same one after that. dress, when given, is called
// once with each new element and its id.
function elements(dress){
  var els={};
  return function el(id){
    if(!els[id]){
      var set={};
      els[id]={value:'',textContent:'',innerHTML:'',disabled:false,checked:false,open:true,style:{},className:'',
        classList:{add:function(c){set[c]=true;},remove:function(c){delete set[c];},
                   toggle:function(c,on){if(on===undefined)on=!set[c];if(on)set[c]=true;else delete set[c];return !!on;},
                   contains:function(c){return !!set[c];}}};
      if(dress)dress(els[id],id);
    }
    return els[id];
  };
}

// An invented localStorage that keeps its items in the plain object store.
function storage(store){
  return {getItem:function(k){return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null;},
          setItem:function(k,x){store[k]=String(x);},removeItem:function(k){delete store[k];}};
}

// Code that hands each named function out on `out`. A name the page does not
// define becomes a function that throws when it is called, so a page that
// lacks one fails where it is used and the rest still runs.
function exportsOf(names){
  return names.map(function(n){
    return '\nout.'+n+'=(typeof '+n+'==="function")?'+n+':function(){throw new Error("the page has no function '+n+'");};';
  }).join('');
}

// Run code with each member of page as a local name, and give back what the
// code returns. The lifted source goes in code; what it calls outside itself
// (g, localStorage, fetch and so on) is what page provides, and nothing else.
function run(page,code){
  var names=Object.keys(page);
  return new Function(names.join(','),code).apply(null,names.map(function(n){return page[n];}));
}

module.exports={braceEnd:braceEnd,from:from,elements:elements,storage:storage,exportsOf:exportsOf,run:run};
