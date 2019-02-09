(function(global, factory){
  if(typeof exports === 'object' && typeof module !== 'undefined') module.exports = factory(global);
  else global.sf = factory(global);
}(typeof window !== "undefined" ? window : this, (function(window){'use strict';
if(typeof document === undefined)
	document = window.document;
// ===== Module Init =====

var sf = function(){
	if(arguments[0].constructor === Function){
		return sf.loader.onFinish.apply(null, arguments);
	}
};

sf.internal = {};
sf.regex = {
	// ToDo: Need help to skip escaped quote
	getQuotes:/((?<![\\])['"])((?:.(?!(?<![\\])\1))*.?)\1/gm,
	avoidQuotes:'(?=(?:[^"\']*(?:\'|")[^"\']*(?:\'|"))*[^"\']*$)',
	strictVar:'(?=\\b[^.]|^|\\n| +|\\t|\\W )'
};

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