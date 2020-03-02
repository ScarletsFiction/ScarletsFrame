(function(global, factory){
  // Check browser feature
  if(HTMLElement.prototype.remove === void 0 || window.customElements === void 0 || window.Reflect === void 0){
  	console.error("This browser was not supported");

  	if(window.customElements === void 0)
    	console.warn("This can be fixed by adding 'https://unpkg.com/@webcomponents/webcomponentsjs@2.3.0/webcomponents-loader.js' before loading 'scarletsframe.js'");

    if(window.Reflect === void 0)
    	console.warn("This can be fixed by adding 'https://unpkg.com/core-js-bundle@3.4.0/minified.js' before loading 'scarletsframe.js'");

    alert("This browser was not supported");
  }

  // Dynamic script when using router to load template
  // Feature is disabled by default
  function routerEval(code){eval(code)}

  if(typeof exports === 'object' && typeof module !== 'undefined') module.exports = factory(global, routerEval);
  else global.sf = factory(global, routerEval);
}(typeof window !== "undefined" ? window : this, (function(window, routerEval){

'use strict';

if(typeof document === void 0)
	document = window.document;

// ===== Module Init =====
var internal = {};
var privateRoot = {};

var sf = function(stuff, returnNode){
	// If it's Node type
	if(stuff.tagName !== void 0){
		if(stuff.nodeType !== 1 || stuff.sf$controlled === void 0)
			stuff = $.parentHasProperty(stuff, 'sf$controlled');

		if(stuff === null)
			return stuff;

		if(returnNode)
			return stuff;
		return stuff.model;
	}
};

sf.internal = {};
sf.regex = {
	getQuotes:/(['"])(?:\1|[\s\S]*?[^\\]\1)/g,
	validFunctionCall:/[_a-zA-Z0-9 \]\$\)]/,
	strictVar:'(?=\\b[^.]|^|\\n| +|\\t|\\W )',
	escapeHTML:/(?!&#.*?;)[\u00A0-\u9999<>\&]/gm,

	uniqueDataParser:/{{((@|#[\w])[\s\S]*?)}}/g,
	dataParser:/{{([^@%][\s\S]*?)}}/g,

	itemsObserve:/\b(_model_|_modelScope)\.([\w\[\].]+)/g,
	parsePropertyPath:/(?:\[([\w]+)\]|\.([\w]+))/g,
	getSingleMask:['([^\\w.]|^)','([^\\w:]|$)'] //gm
};

function parsePropertyPath(str){
	var temp = [];
	temp.unshift(str.replace(sf.regex.parsePropertyPath, function(full, g1, g2){
		if(g1 !== void 0){
			if(isNaN(g1) === false)
				g1 = Number(g1);
			else if(g1[0] === '"' || g1[0] === "'")
				g1 = g1.slice(1, -1);
          
        	temp.push(g1);
			return '';
		}

		temp.push(g2);
		return '';
	}));

	return temp;
}

function avoidQuotes(str, func, noReturn){
	var temp = [];
	var es = '<%$@>';

	if(noReturn !== void 0){
		func(str.replace(sf.regex.getQuotes, '<%$@>'));
		return;
	}

	str = str.replace(sf.regex.getQuotes, function(full){
		temp.push(full);
		return es+(temp.length-1)+es;
	});

	str = func(str);

	// Fix unexpected _modelScope replacement
	str =  str.split('<%$@>_modelScope.').join('<%$@>');

	for (var i = 0; i < temp.length; i++) {
		str = str.replace(es+i+es, temp[i]);
	}
	return str;
}

function isEmptyObject(obj){
	for(var key in obj){
		return false;
	}
	return true
}

function compareObject(obj1, obj2){
	if(obj1 === obj2)
		return true;

	if(!obj1 || !obj2)
		return false;

	if(obj1.constructor === Array){
		if(obj1.length !== obj2.length)
			return false;

		for (var i = 0; i < obj1.length; i++) {
			if(obj1[i] !== obj2[i])
				return false;
		}

		return true;
	}

	var o1 = Object.keys(obj1);
	var o2 = Object.keys(obj2);

	if(o1.length !== o2.length)
		return false;

	var n = o1.length < o2.length ? o2 : o1;
	for (var i = 0; i < n.length; i++) {
		if(obj1[n[i]] !== obj2[n[i]])
			return false;
	}

	return true;
}

function hiddenProperty(obj, property, value){
	Object.defineProperty(obj, property, {
		enumerable: false,
		configurable: true,
		value: value
	});
}

function deepProperty(obj, path){
  for(var i = 0; i < path.length; i++){
    obj = obj[path[i]];
    if(obj === void 0) return obj;
  }
  return obj;
}

function capitalizeLetters(name){
	for (var i = 0; i < name.length; i++) {
		name[i] = name[i][0].toUpperCase() + name[i].slice(1);
	}
	return name.join('');
}