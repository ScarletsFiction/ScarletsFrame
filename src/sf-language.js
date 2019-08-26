;(function(){

var self = sf.language = function(el){
	sf.language.init(el);
}

self.list = {};
self.default = 'en';
self.serverURL = false;

var pending = false;
var pendingElement = [];
var activeRequest = false;

self.onError = false;

self.init = function(el){
	var list = el.querySelectorAll('[sf-lang]');

	if(self.list[self.default] === void 0)
		self.list[self.default] = {};

	refreshLang(list);

	if(pending !== false && self.serverURL !== false){
		if(activeRequest !== false)
			activeRequest.abort();

		activeRequest = sf.ajax({
			url:self.serverURL,
			data:{
				lang:self.default,
				paths:JSON.stringify(pending)
			},
			dataType:'json',
			method:'POST',
			success:function(obj){
				pending = false;

				diveFill(self.list[self.default], obj);
				refreshLang(pendingElement, true);
			},
			error:self.onError,
		});
	}

	if(pending !== false && self.serverURL === false)
		console.warn("Some language was not found, and the serverURL was set to false");
}

function diveFill(obj1, obj2){
	var keys = Object.keys(obj2);
	for (var i = 0; i < keys.length; i++) {
		if(obj1[keys[i]] === void 0)
			obj1[keys[i]] = obj2[keys[i]];
		else
			diveFill(obj1[keys[i]], obj2[keys[i]]);
	}
}

function diveObject(obj, path, setValue){
	var parts = path.split('.');
	for (var i = 0, n = parts.length-1; i < parts.length; i++) {
		var key = parts[i];

		if(setValue === void 0){ // get only
	    	if(obj[key] === void 0)
	    		return;

	    	obj = obj[key];
		}
		else{ // set if undefined
			if(i === n){
				obj[key] = setValue;
				return;
			}
			else obj = obj[key] = {};
		}
    }

    return obj;
}

function refreshLang(list, noPending){
	var defaultLang = self.list[self.default];

	for (var i = list.length-1; i >= 0; i--) {
		if(list[i].sf_lang === self.default){
			list.splice(i, 1);
			continue;
		}

		var elem = list[i];
		var target = elem.getAttribute('sf-lang');
		var value = diveObject(defaultLang, target);

		if(value === void 0){
		    if(noPending !== true){
				if(pending === false)
			    	pending = {};

			    diveObject(pending, target, 1);
				pendingElement.push(elem);
		    }

			continue;
		}

		list.splice(i, 1);
		elem.textContent = value;
		elem.sf_lang = self.default;
	}
}

})();