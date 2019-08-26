;(function(){

var self = sf.lang = function(el){
	sf.lang.init(el);
}

self.list = {};
self.default = 'en';
self.serverURL = false;
self.interpolate = {}

self.add = function(lang, obj){
	if(self.list[lang] === void 0)
		self.list[lang] = {};

	diveFill(self.list[lang], obj);
}

var interpolate_ = /{(.*?)}/;
function interpolate(text, obj){
	return text.replace(interpolate_, function(full, match){
		if(obj[match] !== void 0)
			return obj[match].constructor === Function ? obj[match]() : obj[match];

		if(self.interpolate[match] !== void 0)
			return self.interpolate[match].constructor === Function ? self.interpolate[match]() : self.interpolate[match];

		return full;
	});
}

var waiting = false;
var pendingCallback = [];
self.get = function(path, obj, callback){
	var value = diveObject(self.list[self.default], path);

	if(obj !== void 0 && obj.constructor === Function){
		callback = obj;
		obj = void 0;
	}

	if(value !== void 0){
		if(obj)
			value = interpolate(value, obj);

		if(!callback)
			return value;
		return callback(value);
	}

	if(pending === false)
		pending = {};

	diveObject(pending, path, 1);

	if(callback){
		callback.path = path;
		pendingCallback.push(callback);
	}

	// Request to server after 500ms
	// To avoid multiple request
	clearTimeout(waiting);
	waiting = setTimeout(function(){
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
				self.add(self.default, obj);

				var defaultLang = self.list[self.default];
				for (var i = 0; i < pendingCallback.length; i++) {
					pendingCallback[i](diveObject(defaultLang, pendingCallback[i].path));
				}

				pendingCallback.length = 0;
			},
			error:self.onError,
		});
	}, 500);

	return path;
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

				self.add(self.default, obj);
				refreshLang(pendingElement, true);
			},
			error:self.onError,
		});
	}

	if(pending !== false && self.serverURL === false)
		console.warn("Some language was not found, and the serverURL was set to false");
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
		if(list[i].sf_lang === self.default && noPending === true){
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

		if(noPending === true)
			list.splice(i, 1);

		if(elem.tagName === 'INPUT')
			elem.placeholder = value;
		else
			elem.textContent = value;
		elem.sf_lang = self.default;
	}
}

})();