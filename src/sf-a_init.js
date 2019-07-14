(function(global, factory){
  // Dynamic script when using router to load template
  // Feature is disabled by default
  function routerEval(code){eval(code)}

  if(typeof exports === 'object' && typeof module !== 'void 0') module.exports = factory(global, routerEval);
  else global.sf = factory(global, routerEval);
}(typeof window !== "void 0" ? window : this, (function(window, routerEval){'use strict';
if(typeof document === void 0)
	document = window.document;
// ===== Module Init =====
var internal = {};

var sf = function(stuff){
	if(stuff.constructor === Function)
		return sf.loader.onFinish.apply(null, arguments);

	// If it's Node type
	if(stuff.tagName !== void 0)
		return sf.model.root[sf.controller.modelName(stuff)];
};

sf.internal = {};
sf.regex = {
	getQuotes:/(['"])(?:\1|[\s\S]*?[^\\]\1)/g,
	validFunctionCall:/[a-zA-Z0-9 \]\$\)]/,
	strictVar:'(?=\\b[^.]|^|\\n| +|\\t|\\W )',
	escapeHTML:/(?!&#.*?;)[\u00A0-\u9999<>\&]/gm,

	uniqueDataParser:/{{((@|#[\w])[\s\S]*?)}}/g,
	dataParser:/{{([^@%][\s\S]*?)}}/g,
};

var allowedFunctionEval = {'for':true, 'if':true, 'while':true, '_content_.take':true, 'console.log':true};

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