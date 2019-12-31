;(function(){

var self = sf.lang = function(el){
	sf.lang.init(el);
}

self.list = {};
self.default = 'en_US';
self.serverURL = false;
self.interpolate = {}

internal.language = {};

self.add = function(lang, obj){
	if(self.list[lang] === void 0)
		self.list[lang] = {};

	diveFill(self.list[lang], obj);

	pending = false;
	if(pendingCallback.length === 0)
		return;

	var defaultLang = self.list[self.default];
	for (var i = 0; i < pendingCallback.length; i++) {
		if(pendingCallback[i].callbackOnly === void 0)
			pendingCallback[i](diveObject(defaultLang, pendingCallback[i].path));
		else
			pendingCallback[i]();
	}

	pendingCallback.length = 0;
}

self.changeDefault = function(defaultLang){
	self.default = defaultLang;
	self.init(document.body);
}

var interpolate_ = /{(.*?)}/;
function interpolate(text, obj){
	var once = false;
	return text.replace(interpolate_, function(full, match){
		if(once === false && (obj.constructor === String || obj.constructor === Number)){
			once = true;
			return obj;
		}

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
	if(obj !== void 0 && obj.constructor === Function){
		callback = obj;
		obj = void 0;
	}

	if(self.list[self.default] === void 0)
		self.list[self.default] = {};

	if(path.constructor === String)
		return getSingle(path, obj, callback);
	else
		return getMany(path, obj, callback);
}

function startRequest(){
	if(pending === false || self.serverURL === false)
		return;

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
			},
			error:self.onError,
		});
	}, 500);
}

function getSingle(path, obj, callback){
	var value = diveObject(self.list[self.default], path);
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

	startRequest();
	return path;
}

function getMany(paths, obj, callback){
	var default_ = self.list[self.default];
	var value = {};
	var missing = [];

	for (var i = 0; i < paths.length; i++) {
		var temp = diveObject(default_, paths[i]);

		if(temp)
			value[paths[i]] = temp;
		else 
			missing.push(paths[i]);
	}

	if(missing.length === 0){
		if(obj)
			value = interpolate(value, obj);

		if(!callback)
			return value;
		return callback(value);
	}

	if(pending === false)
		pending = {};

	for (var i = 0; i < missing.length; i++) {
		diveObject(pending, missing[i], 1);
	}

	var callback_ = function(){
		for (var i = 0; i < missing.length; i++) {
			var temp = diveObject(default_, missing[i]);

			diveObject(value, missing[i], temp);
		}

		return callback(value);
	}

	callback_.callbackOnly = true;
	pendingCallback.push(callback_);

	startRequest();
}

self.assign = function(model, keyPath, obj, callback){
	if(self.list[self.default] === void 0)
		self.list[self.default] = {};

	var keys = Object.keys(keyPath);
	var vals = Object.values(keyPath);

	if(obj !== void 0 && obj.constructor === Function){
		callback = obj;
		obj = void 0;
	}

	getMany(vals, obj, function(values){
		for (var i = 0; i < keys.length; i++) {
			model[keys[i]] = diveObject(values, vals[i]);
		}

		if(callback)
			callback();
	});
}

function diveFill(obj1, obj2){
	var keys = Object.keys(obj2);
	for (var i = 0; i < keys.length; i++) {
		var key = keys[i];

		if(obj1[key] === void 0)
			obj1[key] = obj2[key];

		else if(obj2[key].constructor === Object)
			diveFill(obj1[key], obj2[key]);
	}
}

var pending = false;
var pendingElement = [];
var activeRequest = false;

self.onError = false;

self.init = function(el){
	var list = el.querySelectorAll('[sf-lang]');
	if(list.length === 0)
		return;

	if(self.list[self.default] === void 0)
		self.list[self.default] = {};

	refreshLang(list);

	if(pending !== false && self.serverURL !== false){
		var callback = function(){
			pending = false;
			refreshLang(pendingElement, true);
		}

		callback.callbackOnly = true;
		pendingCallback.push(callback);

		startRequest();
	}

	if(pending !== false && self.serverURL === false)
		console.warn("Some language was not found, and the serverURL was set to false", pending);
}

function diveObject(obj, path, setValue){
	var parts = path.split('.');
	for (var i = 0, n = parts.length-1; i <= n; i++) {
		var key = parts[i];

		if(setValue === void 0){ // get only
	    	if(obj[key] === void 0)
	    		return;

	    	obj = obj[key];
		}
		else{ // set
			if(i === n){
				obj[key] = setValue;
				return;
			}

			if(obj[key] === void 0)
                obj = obj[key] = {};
            else obj = obj[key];
		}
    }

    return obj;
}

internal.language.refreshLang = function(el){
	if(el.constructor === Array){
		var arr = [];
		for (var i = 0; i < el.length; i++) {
			if(el[i].hasAttribute === void 0)
				continue;

			if(el[i].hasAttribute('sf-lang'))
				arr.push(el[i]);
		}
		return refreshLang(arr);
	}

	if(el.hasAttribute === void 0)
		return;

	if(el.hasAttribute('sf-lang'))
		return refreshLang([el]);

	el = el.querySelectorAll('[sf-lang]');
	if(el.length === 0)
		return;

	refreshLang(el);
};

function refreshLang(list, noPending){
	var defaultLang = self.list[self.default];
	var parentElement = new Set();

	if(defaultLang === void 0)
		defaultLang = self.list[self.default] = {};

	for (var i = list.length-1; i >= 0; i--) {
		if(list[i].sf_lang === self.default && noPending === true){
			list.splice(i, 1);
			continue;
		}

		var elem = list[i];

		// Preserve model/component binding
		if(elem.sf$elementReferences !== void 0){
			elementReferencesRefresh(elem);
			parentElement.add(elem);
			continue;
		}
		else{
			var modelElement = sf.controller.modelElement(elem);
			if(modelElement !== null && modelElement.tagName !== 'SF-M'){
				if(parentElement.has(modelElement))
					continue;

				// Run below once
				if(modelElement.sf$elementReferences !== void 0){
					elementReferencesRefresh(modelElement);
					parentElement.add(modelElement);
					continue;
				}
			}
		}

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

		if(elem.hasAttribute('placeholder'))
			elem.setAttribute('placeholder', value);
		else{
			if(value.indexOf('[') !== -1){
				var deep = [];
				value = value.replace(/\[(.*?)\]/g, function(full, match){
					deep.push(match);
					return '*#';
				}).split('*#');

				var nodes = elem.childNodes;
				for (var a = 0; a < nodes.length; a++) {
					if(nodes[a].nodeType === 3 && value.length !== 0) // text
						nodes[a].textContent = value.shift();

					else if(nodes[a].nodeType === 1 && deep.length !== 0) // element
						nodes[a].textContent = deep.shift();
				}
			}
			else elem.textContent = value;
		}
		elem.sf_lang = self.default;
	}

	if(parentElement.size === 0)
		return;

	parentElement = Array.from(parentElement);
	var appliedElement = new Set();

	// Reapply template
	for (var a = 0; a < parentElement.length; a++) {
		var model = parentElement[a].model;
		if(!model.sf$bindedKey) // Doesn't have template
			continue;

		var keys = Object.keys(model.sf$bindedKey);
		for (var z = 0; z < keys.length; z++) {
			var ref = model.sf$bindedKey[keys[z]];

			for (var i = 0; i < ref.length; i++) {
				if(ref[i].constructor === Function){
					ref[i](model[keys[z]], ref.input);
					continue;
				}

				var elem = ref[i].element;
				if(elem.nodeType === 1 && elem.hasAttribute('sf-lang') !== false){
					if(appliedElement.has(elem))
						continue;

					appliedElement.add(elem);
					if(internal.model.syntheticTemplate(elem, ref[i].template, void 0, model) === false)
						0; //No update
				}
			}
		}
	}
}

function elementReferencesRefresh(elem){
	var eRef = elem.sf$elementReferences;

	for (var i = 0; i < eRef.length; i++) {
		if(eRef[i].textContent !== void 0){
			var parent = eRef[i].textContent.parentElement;

			if(!parent.hasAttribute('sf-lang'))
				continue;

			var key = parent.getAttribute('sf-lang');
		}
		else if(eRef[i].sf_lang !== void 0){
			var parent = eRef[i].sf_lang;
			var key = eRef[i].sf_lang.getAttribute('sf-lang');
		}
		else continue;

		var value = diveObject(self.list[self.default], key);

		if(value === void 0){
			if(pending === false)
				pending = {};

			diveObject(pending, key, 1);
			pendingElement.push(elem);
			continue;
		}

		var z = 0;
		eRef[i].ref.value = value.replace(/{(.*?)}/, function(full, match){
			return '{{%='+(z++);
		});
	}
}

})();