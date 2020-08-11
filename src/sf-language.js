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

	// Maybe have create other window?
	if(windowDestroyListener !== false && sf.window.list.length !== 0){
		var windows = sf.window.list;

		for (var i = 0; i < windows.length; i++)
			windows[i].sf.lang.changeDefault(defaultLang);
	}

	function forComponents(){
		var registered = sf.component.registered;
		for(var keys in registered){
			if(registered[keys][3] !== void 0)
				refreshTemplate(registered[keys]);
		}
	}

	function forSpaceComponents(){
		var list = sf.space.list;

		for(var name in list){
			var registered = list[name].default.registered;

			for(var keys in registered){
				if(registered[keys][3] !== void 0)
					refreshTemplate(registered[keys]);
			}
		}
	}

	if(self.list[defaultLang] === void 0){
		forComponents.callbackOnly = true;
		pendingCallback.push(forComponents);
	}
	else forComponents();

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

if(window.sf$proxy === void 0)
	forProxying.langPendingCallback = pendingCallback;
else
	pendingCallback = window.sf$proxy.langPendingCallback;

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
	if(pending === false || self.serverURL === false || window.sf$proxy !== void 0)
		return;

	// Request to server after 500ms
	// To avoid multiple request
	clearTimeout(waiting);
	waiting = setTimeout(function(){
		if(activeRequest !== false)
			activeRequest.abort();

		activeRequest = sf.request('POST', self.serverURL, {
			lang:self.default,
			paths:JSON.stringify(pending)
		}, {
			sendType:'JSON',
			receiveType:'JSON',
		})
		.done(function(obj){
			pending = false;
			self.add(self.default, obj);
		})
		.fail(self.onError);
	}, 500);
}

function getSingle(path, obj, callback){
	var value = diveObject(self.list[self.default], path);
	if(value !== void 0){
		if(obj)
			value = interpolate(value, obj);

		if(callback === void 0)
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

		if(callback === void 0)
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

	if(obj !== void 0 && obj.constructor === Function){
		callback = obj;
		obj = void 0;
	}

	var keys = Object.keys(keyPath);
	var vals = Object.values(keyPath);

	getMany(vals, obj, function(values){
		for (var i = 0; i < keys.length; i++) {
			model[keys[i]] = diveObject(values, vals[i]);
		}

		if(callback)
			callback();
	});
}

function diveFill(obj1, obj2){
	for(var key in obj2){
		if(obj1[key] === void 0)
			obj1[key] = obj2[key];

		else if(obj2[key].constructor === Obj)
			diveFill(obj1[key], obj2[key]);
	}
}

var pending = false;
var pendingElement = [];
var activeRequest = false;

self.onError = console.error;

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

	var checks = new WeakSet();
	for (var i = list.length-1; i >= 0; i--) {
		if((list[i].sf_lang === self.default && noPending === true) || list[i].hasAttribute('sf-lang-skip')){
			list.splice(i, 1);
			continue;
		}

		var elem = list[i];
		if(checks.has(elem))
			continue;

		checks.add(elem);

		// Preserve model/component binding
		// We will reapply the template later
		if(elem.sf$elementReferences !== void 0 && elementReferencesRefresh(elem)){
			parentElement.add(elem);
			continue;
		}
		else{
			var modelElement = sf(elem, true);
			if(modelElement !== null){
				if(parentElement.has(modelElement))
					continue;

				// Run below once
				if(modelElement.sf$elementReferences !== void 0 && elementReferencesRefresh(modelElement)){
					parentElement.add(modelElement);
					continue;
				}

				if(elem.tagName === 'INPUT' || elem.tagName === 'TEXTAREA'){
					if(!elem.hasAttribute('placeholder'))
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
		else if(elem.tagName !== 'INPUT' && elem.tagName !== 'TEXTAREA')
			assignSquareBracket(value, elem);
	}

	if(parentElement.size === 0)
		return;

	var appliedElement = new WeakSet();

	// Reapply template (component)
	for(var elem of parentElement){
		elem.sf_lang = self.default;

		var model = elem.model;
		if(model === void 0)
			model = sf(elem);

		// Avoid model that doesn't have binding
		if(model.sf$bindedKey === void 0)
			continue;

		var ref = elem.sf$elementReferences;
		for (var i = 0; i < ref.length; i++) {
			if(appliedElement.has(elem))
				continue;

			appliedElement.add(elem);
			if(internal.model.syntheticTemplate(elem, ref.template, void 0, model) !== false)
				continue; // updated

			elem.sf_lang = void 0;
		}
	}
}

var templateParser_regex_split = /{{%=[0-9]+%/g;
function elementReferencesRefresh(elem){
	var eRef = elem.sf$elementReferences;
	var processed = false;
	var template = eRef.template;

	for (var i = eRef.length-1; i >= 0; i--) {
		var elemRef = eRef[i];
		if(elemRef.textContent !== void 0){
			var parent = elemRef.textContent.parentElement;

			if(parent === null || parent.hasAttribute('sf-lang') === false)
				continue;

			var key = parent.getAttribute('sf-lang');
		}
		else if(elemRef.sf_lang !== void 0){
			var parent = elemRef.sf_lang;
			var key = elemRef.sf_lang.getAttribute('sf-lang');
		}
		else continue;

		var value = diveObject(self.list[self.default], key);
		if(value === void 0){
			if(pending === false)
				pending = {};

			diveObject(pending, key, 1);
			pendingElement.push(parent);
			return; // Let's process it later for current element
		}

		// Different behaviour
		if(elemRef.attribute !== void 0){
			createParseIndex(value, elemRef.ref, template);

			// Refresh it now
			// ToDo: fix value that fail/undefined if it's from RepeatedList/Property
			if(elemRef.ref.name === 'value'){
				var refB = elemRef.ref;
				elemRef.attribute.value = internal.model.applyParseIndex(refB.value, refB.parse_index, [], template.parse);
			}
			continue;
		}

		// Remove because we would remake that
		eRef.splice(i, 1);

		if(!assignSquareBracket(value, parent, template, eRef))
			continue;

		processed = true;
	}

	// Fix memory leak
	for (var i = eRef.length-1; i >= 0; i--) {
		if(eRef[i].textContent && eRef[i].textContent.isConnected === false)
			eRef.splice(i, 1);
	}

	return processed;
}

function assignSquareBracket(value, elem, template, eRef){
	value = value.replace(/%\*&/g, '-');
	var tags = {};

	var squares = [];
	value = value.replace(/\[([a-zA-Z0-9\-]+):(.*?)\]/g, function(full, tag, match){
		squares.push({tag:tag.toUpperCase(), val:match});
		return '%*&';
	}).split('%*&');

	var childNodes = elem.childNodes;
	var backup = {};
	for(var a=0, n=childNodes.length; a<n; a++){
		var place, elemBackup = childNodes[a];
		if(elemBackup.nodeType === 3){
			place = backup._text;
			if(place === void 0)
				place = backup._text = [];
		}
		else if(elemBackup.nodeType === 1){
			place = backup[elemBackup.tagName];
			if(place === void 0)
				place = backup[elemBackup.tagName] = [];
		}
		else continue;

		place.push(elemBackup);
	}

	var found = template && true;
	elem.textContent = value[0];

	if(elem.firstChild !== null)
		found = found && elementRebinding(template, eRef, elem.firstChild, elem);

	for (var a = 1; a < value.length; a++) {
		var square = squares[a-1];
		var elemBackup = backup[square.tag];
		if(elemBackup === void 0 || elemBackup.length === 0)
			elemBackup = document.createElement(square.tag);
		else elemBackup = elemBackup.pop();

		elemBackup.textContent = square.val;
		elem.appendChild(elemBackup);
		found = found && elementRebinding(template, eRef, elemBackup.firstChild, elem);

		var elemBackup = backup._text;
		if(elemBackup === void 0 || elemBackup.length === 0)
			elemBackup = new Text(value[a]);
		else{
			elemBackup = elemBackup.pop();
			elemBackup.textContent = value[a];
		}

		elem.appendChild(elemBackup);
		found = found && elementRebinding(template, eRef, elemBackup, elem);
	}

	if(value[a-1] === '')
		elemBackup.remove();

	if(found === false && template)
		return false;
	return true;
}

function createParseIndex(text, remakeRef, template){
	var parse_index = []
	var value = text.replace(/{(.*?)}/g, function(full, match){
		if(isNaN(match) !== false){
			if(template.modelRefRoot[match] !== void 0)
				match = template.modelRefRoot[match][0];

			else if(template.modelRef !== void 0 && template.modelRef[match] !== void 0)
				match = template.modelRef[match][0];
			else{
				console.error("Language can't find existing model binding for '"+match+"' from", Object.keys(template.modelRefRoot), template);
				return '';
			}
		}

		parse_index.push(match);
		return '%*&';
	});

	if(parse_index.length === 0)
		return false;

	remakeRef.parse_index = parse_index;
	remakeRef.value = value.split('%*&');
	internal.model.parseIndexAllocate(remakeRef.value);
	return true;
}

function elementRebinding(template, eRef, elem, parentNode){
	var remake = {
		textContent:elem,
		ref:{
			address:$.getSelector(elem, true, parentNode),
			nodeType:3
		}
	};

	if(createParseIndex(elem.textContent, remake.ref, template))
		eRef.push(remake);

	return true;
}

function refreshTemplate(elemRef){
	var collections = elemRef[2];
	var template = elemRef[3];

	var addresses = template.addresses;
	if(addresses === void 0)
		return;

	var found = false;
	for (var i = addresses.length-1; i >= 0; i--) {
		if(addresses[i].skipSFLang || addresses[i].value === void 0)
			continue;

		var elem = $.childIndexes(addresses[i].address, template.html).parentNode;
		if(elem.hasAttribute('sf-lang') === false)
			continue;

		found = true;

		var value = diveObject(self.list[self.default], elem.getAttribute('sf-lang'));
		if(value === void 0){
			console.error(`Can't found '${elem.getAttribute('sf-lang')}' for ${self.default}, in`, self.list[self.default], ", maybe the language wasn't fully loaded");

			var callback_ = function(){
				refreshTemplate(elemRef);
			};

			callback_.callbackOnly = true;
			pendingCallback.push(callback_);
			return;
		}

		addresses.splice(i, 1);

		var eRef = [];
		assignSquareBracket(value, elem, template, eRef);

		for (var a = 0; a < eRef.length; a++){
			var ref = eRef[a].ref;
			ref.address = $.getSelector($.childIndexes(ref.address, elem), true, template.html);
			addresses.push(ref);
		}
	}

	if(found === false)
		template.skipSFLang = true; // skip because not found
}

})();