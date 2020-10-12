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

  // Dynamic script when using hot reload feature
  // Feature is disabled if not using hot reload
  function hotReloadEval(code){eval(code)}

  if(typeof exports === 'object' && typeof module !== 'undefined') module.exports = factory(global, hotReloadEval);
  else global.sf = factory(global, hotReloadEval);
}(typeof window !== "undefined" ? window : this, (function(window, hotReloadEval){

'use strict';

if(typeof document === void 0)
	document = window.document;

var HTMLTemplates = window.templates || {};
var TemplatePending = [];
Object.defineProperty(window, 'templates', {
	set: function(val){
		HTMLTemplates = val;
		hotReload && internal.hotTemplate(val);

		if(TemplatePending.length !== 0){
			var temp = TemplatePending;
			TemplatePending = [];

			for (var i = 0; i < temp.length; i++)
				temp[i]();
		}
	},
	get: function(){
		return HTMLTemplates;
	}
});

// ===== Module Init =====
var internal = {};
var privateRoot = {};
var forProxying = {};
function NOOP(){}

var sf = function(el, returnNode){
	// If it's Node type
	if(el.tagName !== void 0){
		if(el.sf$controlled === void 0 && !(el.sf$elementReferences && el.sf$elementReferences.template.bindList))
			el = findBindListElement(el, true);

		if(el === null)
			return el;

		if(returnNode)
			return el;
		return el.model;
	}
};

var hotReload = false;
var sfRegex = {
	getQuotes:/(['"])(?:\1|[\s\S]*?[^\\]\1)/g,
	scopeVar:'(^|[^.\\]\\w])',
	// escapeHTML:/(?!&#.*?;)[\u00A0-\u9999<>\&]/gm,

	uniqueDataParser:/{{((@|#[\w])[\s\S]*?)}}/g,
	dataParser:/{{([^@%][\s\S]*?)}}/g,

	repeatedList:/(.*?) in (.*?)$/,
	itemsObserve:/\b(_model_|_modelScope)\.([\w\[\].]+)/g,
	parsePropertyPath:/(?:\[([\w]+)\]|\.([\w]+))/g,
	getSingleMask:['([^\\w.]|^)','([^\\w:]|$)'], //gm

	inputAttributeType:/checkbox|radio|hidden/,
	anyCurlyBracket:/{{.*?}}/,
	allTemplateBracket:/{\[([\s\S]*?)\]}/g,
	anyOperation:/[ =(+-]/,
};

;(function(){
	function createScope(value){
		return {configurable:true, enumerable:true,
			get:function(){return value},
			set:function(val){
				value = val;
			}
		};
	}

	sf.link = function(obj, key, val){
		var candidate = false;

		function check(temp){
			if(temp === void 0)
				return;

			if(temp.set !== void 0){
				// Can we handle it?
				if(candidate !== false && temp.set !== candidate.set)
					throw new Error("There are more than one object that have different set descriptor");

				candidate = temp;
				return;
			}

			if(candidate === false && val === void 0)
				val = temp.value;
		}

		if(obj.constructor === Array)
			for (var i = 0; i < obj.length; i++)
				check(Object.getOwnPropertyDescriptor(obj[i], key));
		else
			for(var key in obj)
				check(Object.getOwnPropertyDescriptor(obj[key], key));

		if(candidate === false)
			candidate = createScope(val);

		if(obj.constructor === Array)
			for (var i = 0; i < obj.length; i++)
				Object.defineProperty(obj[i], key, candidate);
		else
			for(var key in obj)
				Object.defineProperty(obj[key], key, candidate);
	}
})();

function parsePropertyPath(str){
	var temp = [];
	temp.unshift(str.replace(sfRegex.parsePropertyPath, function(full, g1, g2){
		if(g1 !== void 0){
			if(isNaN(g1) === false)
				g1 = Number(g1);
			else if(g1.slice(0, 1) === '"' || g1.slice(0, 1) === "'")
				g1 = g1.slice(1, -1);

			temp.push(g1);
			return '';
		}

		temp.push(g2);
		return '';
	}));

	return temp;
}

function stringifyPropertyPath(properties){
	var remake = properties[0];
	for (var i = 1; i < properties.length; i++) {
		if(properties[i].constructor === Number)
			remake += '['+properties[i]+']';
		else
			remake += '.'+properties[i];
	}

	return remake;
}

var _es = '%@~';
function avoidQuotes(str, func, onQuotes){
	str = str.split(_es).join('-');

	var temp = [];
	str = str.replace(sfRegex.getQuotes, function(full){
		temp.push(full);
		return _es+(temp.length-1)+_es;
	});

	if(temp.length === 0)
		return func(str);

	str = func(str);

	if(onQuotes !== void 0){
		for (var i = 0; i < temp.length; i++)
			str = str.replace(_es+i+_es, onQuotes(temp[i]));
	}
	else{
		for (var i = 0; i < temp.length; i++)
			str = str.replace(_es+i+_es, temp[i]);
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

function hiddenProperty(obj, property, value, isWritable){
	Object.defineProperty(obj, property, {
		enumerable: false,
		configurable: true,
		writable: isWritable,
		value: value
	});
}

function deepProperty(obj, path){
  for(var i = 0; i < path.length; i++){
	obj = obj[path[i]];
	if(obj === void 0) return;
  }
  return obj;
}

function capitalizeLetters(name){
	for (var i = 0; i < name.length; i++)
		name[i] = name[i].slice(0, 1).toUpperCase() + name[i].slice(1);

	return name.join('');
}

function getStaticMethods(keys, clas){
	var keys2 = Object.getOwnPropertyNames(clas);

	for(var i = 0; i < keys2.length; i++){
		if(typeof clas[keys2[i]] === 'function')
			keys.add(keys2[i]);
	}
}

function getPrototypeMethods(keys, clas){
	if(clas.prototype === void 0)
		return;

	var keys2 = Object.getOwnPropertyNames(clas.prototype);
	for (var i = keys2.length - 1; i >= 0; i--) {
		if(keys2[i] !== 'constructor')
			keys.add(keys2[i]);
	}

	var deep = Object.getPrototypeOf(clas);
	if(deep.prototype !== void 0)
		getPrototypeMethods(keys, deep);
}

function proxyClass(scope){
	var parent = scope.constructor;
	var proto = parent.prototype;

	var list = new Set();
	getPrototypeMethods(list, parent);

	for(var key of list){
		// Proxy only when child method has similar name with the parent
		if(scope[key] !== proto[key] && scope[key].ref === void 0){
			let tempProxy = function(){
				scope.super = tempProxy.protoFunc;
				return tempProxy.ref.apply(scope, arguments);
			}

			tempProxy.ref = scope[key];
			tempProxy.protoFunc = proto[key];

			scope[key] = tempProxy;
		}
	}
}

// Faster than Array.from on some condition
function toArray(b){
	var c = new Array(b.length);
	for(var i=0; i<c.length; i++)
		c[i] = b[i];

	return c;
}