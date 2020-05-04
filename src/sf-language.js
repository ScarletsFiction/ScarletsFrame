// ToDo: put bindedkey that hold binding information to the element so sf-lang can use from it

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

	function forComponents(){
		var registered = sf.component.registered;
		for(var keys in registered){
			if(registered[keys][3] !== void 0)
				refreshTemplate(registered[keys][3]);
		}
	}

	function forSpaceComponents(){
		var list = sf.space.list;

		for(var list_ in list){
			var registered = list[list_][""].registered;

			for(var keys in registered){
				if(registered[keys][3] !== void 0)
					refreshTemplate(registered[keys][3]);
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

	refreshLang(Array.from(list));

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

	refreshLang(Array.from(el));
};

function refreshLang(list, noPending){
	var defaultLang = self.list[self.default];
	var parentElement = new Set(); // This technique cause slow down because memory allocation

	if(defaultLang === void 0)
		defaultLang = self.list[self.default] = {};

	for (var i = list.length-1; i >= 0; i--) {
		if((list[i].sf_lang === self.default && noPending === true) || list[i].hasAttribute('sf-lang-skip')){
			list.splice(i, 1);
			continue;
		}

		var elem = list[i];

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

		var z = 0;
		value = value.replace(/{(.*?)}/, function(full, match){
			return '{{'+match+'}}';
		});

		if(noPending === true)
			list.splice(i, 1);

		if(elem.hasAttribute('placeholder'))
			elem.setAttribute('placeholder', value);
		else
			assignSquareBracket(elem, value);
	}

	if(parentElement.size === 0)
		return;

	parentElement = Array.from(parentElement);
	var appliedElement = new Set();

	// Reapply template
	for (var a = 0; a < parentElement.length; a++) {
		var elem = parentElement[a];
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

function assignSquareBracket(elem, value){
	if(value.indexOf('[') !== -1){
		value = value.replace(/(?=[^\\]|^)\[(.*?)\]/g, function(full, match){
			return '*#'+match+'*#';
		}).split('*#');

		if(value[value.length-1] === '')
			value.pop();

		// Odd = element for [text]
		// Even = text only

		var nodes = elem.childNodes;
		var whenEven = true;
		for (var a = 0; a < value.length; a++) {
			if((a % 2 === 0) === whenEven){ // text node
				if(nodes[a] === void 0) // no nodes
					elem.appendChild(document.createTextNode(value[a]));
				else if(nodes[a].nodeType === 3) // text node
					nodes[a].textContent = value[a];
				else // element node
					elem.insertBefore(document.createTextNode(value[a]), nodes[a]);

				continue;
			}

			if(nodes[a] === void 0){
				console.error("[Language] square bracket found, but element was not found for:", value[a]);
				continue;
			}

			if(nodes[a].nodeType === 1){ // element node
				if(value[a][0] === '{') // Check if this was template
					continue;

				nodes[a].textContent = value[a];
				continue;
			}

			// This may rare case, but does found other node type?
			whenEven = !whenEven; 
		}

		if(nodes[a] !== void 0 && nodes[a].nodeType === 3)
			nodes[a].remove();
	}
	else{
		if(elem.nodeType !== 3 && elem.firstChild !== null)
			elem.firstChild.textContent = value;
		else 
			elem.textContent = value;
	}
}

function elementReferencesRefresh(elem){
	var eRef = elem.sf$elementReferences;
	var processed = false;

	for (var i = 0; i < eRef.length; i++) {
		if(eRef[i].textContent !== void 0){
			var parent = eRef[i].textContent.parentElement;

			if(parent.hasAttribute('sf-lang') === false)
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
			return; // Let's process it later for current element
		}

		if(eRef[i].textContent !== void 0){
			var hasBracket = value.split(/(?=[^\\]|^)\[(.*?)\]/g);
			if(hasBracket.length !== 1){
				// ToDo: add more support for complex model and language
				// It would need to add more `eRef[i].textContent` on the template
				if(hasBracket.length === 3){ // text, [element], text
					var found = false;
					if(hasBracket[0].indexOf('{') !== -1)
						found = 0;

					if(hasBracket[2].indexOf('{') !== -1){
						if(found !== false){
							console.error('Currently only one square language template that can be combined with model template');
							continue;
						}

						found = 2;
					}

					assignSquareBracket(elem, value);
					value = hasBracket[found];
					eRef[i].textContent = elem.childNodes[found];
				}
				else{
					console.error('Currently only one square language template that can be combined with model template');
					continue;
				}
			}
		}

		var template = eRef.template;
		var parse_index = eRef[i].ref.parse_index;
		var validMatch = 0;
		value = value.replace(/{(.*?)}/, function(full, match){
			if(validMatch === false)
				return full;

			if(isNaN(match) !== false){
				if(template.modelRefRoot[match] !== void 0)
					match = template.modelRefRoot[match][0];

				else if(template.modelRef !== void 0 && template.modelRef[match] !== void 0)
					match = template.modelRef[match][0];
				else{
					console.error("Language can't find existing model template for '"+match+"' from", Object.keys(template.modelRefRoot));
					return '';
				}
			}

			// Avoid translating on different value that not supposed to be translated
			if(parse_index.indexOf(match) === -1){
				validMatch = false;
				return full;
			}

			validMatch++;
			return '{{%='+match+'%';
		});

		if(validMatch === false || validMatch !== parse_index.length)
			continue;

		eRef[i].ref.value = value;
		processed = true;
	}

	return processed;
}

function refreshTemplate(template){
	var addresses = template.addresses;
	if(addresses === void 0)
		return;

	var found = false;
	for (var i = 0; i < addresses.length; i++) {
		if(addresses[i].skipSFLang || addresses[i].value === void 0)
			continue;

		var elem = $.childIndexes(addresses[i].address, template.html).parentNode;
		if(elem.hasAttribute('sf-lang') === false)
			continue;

		found = true;
		var value = diveObject(self.list[self.default], elem.getAttribute('sf-lang'));

		value = value.replace(/{(.*?)}/, function(full, match){
			if(isNaN(match) === false)
				return '{{%='+match+'%';

			if(template.modelRefRoot[match] !== void 0)
				return '{{%='+template.modelRefRoot[match][0]+'%';

			if(template.modelRef !== void 0 && template.modelRef[match] !== void 0)
				return '{{%='+template.modelRef[match][0]+'%';

			console.error("Language binding can't find existing model binding for", match, "from", Object.keys(template.modelRefRoot));
			return '';
		});

		addresses[i].value = value;
		assignSquareBracket(elem, value);
	}

	if(found === false)
		template.skipSFLang = true; // skip because not found
}

})();