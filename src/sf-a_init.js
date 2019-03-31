(function(global, factory){
  if(typeof exports === 'object' && typeof module !== 'undefined') module.exports = factory(global);
  else global.sf = factory(global);
}(typeof window !== "undefined" ? window : this, (function(window){'use strict';
if(typeof document === undefined)
	document = window.document;
// ===== Module Init =====
var internal = {};

var sf = function(){
	if(arguments[0].constructor === Function){
		return sf.loader.onFinish.apply(null, arguments);
	}
};

sf.internal = {};
sf.regex = {
	// ToDo: Need help to skip escaped quote
	getQuotes:/(['"])[\s\S]*?[^\\]\1/g,
	validFunctionCall:/[a-zA-Z0-9 \]\$\)]/,
	strictVar:'(?=\\b[^.]|^|\\n| +|\\t|\\W )'
};

var allowedFunctionEval = [':', 'for', 'if', 'while', '_content_.take', 'console.log'];

function avoidQuotes(str, func){
	var temp = [];
	var es = '<%$@>';
	str = str.replace(sf.regex.getQuotes, function(full){
		temp.push(full);
		return es+(temp.length-1)+es;
	});
	str = func(str);
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
	if(!obj1 || !obj2)
		return false;

	for(var i in obj1){
		if(typeof obj1[i] !== 'object' && obj1[i] !== obj2[i])
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
    if(obj === undefined) return obj;
  }
  return obj;
}