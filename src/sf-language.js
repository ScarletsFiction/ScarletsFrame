import {getScope} from "./sf-model.js";
import SFWindow from "./sf-window.js";
import Component from "./sf-component.js";
import Request from "./sf-request.js";
import Space from "./sf-space.js";
import {internal} from "./shared.js";
import {syntheticTemplate} from "./sf-model/template.js";
import $ from "./sf-dom.js";
import {parseIndexAllocate, applyParseIndex} from "./sf-model/a_model.js";

let Self = {};
export default Self;
Self.init = function(el){
	const list = el.querySelectorAll('[sf-lang]');
	if(list.length === 0)
		return;

	if(!(Self.default in Self.list))
		Self.list[Self.default] = {};

	refreshLang(list, false, function(){
		if(pending !== false && Self.serverURL !== false){
			const callback = function(){
				pending = false;
				refreshLang(pendingElement, true);
			}

			callback.callbackOnly = true;
			pendingCallback.push(callback);

			startRequest();
		}

		if(pending !== false && Self.serverURL === false)
			console.warn("Some language was not found, and the serverURL was set to false", pending);
	});
}

Self.list = {};
Self.default = 'en_US';
Self.serverURL = false;
Self.interpolate = {}

internal.language = {};

Self.add = function(lang, obj){
	if(obj.constructor !== Object)
		throw new Error("Parameter 2 must be an object");

	if(!(lang in Self.list))
		Self.list[lang] = {};

	diveFill(Self.list[lang], obj);

	pending = false;
	if(pendingCallback.length === 0)
		return;

	const defaultLang = Self.list[Self.default];
	for (let i = 0; i < pendingCallback.length; i++) {
		if(pendingCallback[i].callbackOnly === void 0)
			pendingCallback[i](diveObject(defaultLang, pendingCallback[i].path));
		else
			pendingCallback[i]();
	}

	pendingCallback.length = 0;
}

Self.changeDefault = function(defaultLang){
	Self.default = defaultLang;

	// Maybe have create other window?
	if(internal.windowDestroyListener !== false && SFWindow.list.length !== 0){
		const windows = SFWindow.list;

		for (let i = 0; i < windows.length; i++)
			windows[i].sf.language.changeDefault(defaultLang);
	}

	function forComponents(){
		const { registered } = Component;
		for(let keys in registered){
			if(registered[keys][3] !== void 0)
				refreshTemplate(registered[keys]);
		}
	}

	function forSpaceComponents(){
		const { list } = Space;

		for(let name in list){
			const { registered } = list[name].default;

			for(let keys in registered){
				if(registered[keys][3] !== void 0)
					refreshTemplate(registered[keys]);
			}
		}
	}

	if(!(defaultLang in Self.list)){
		forComponents.callbackOnly = true;
		pendingCallback.push(forComponents);
	}
	else forComponents();

	// Lazy init
	setTimeout(()=> {
		Self.init(document.body);

		const wList = SFWindow.list;
		for(let key in wList)
			Self.init(wList[key].document.body);
	}, 1);
}

const interpolate_ = /{(.*?)}/;
function interpolate(text, obj){
	let once = false;
	return text.replace(interpolate_, function(full, match){
		if(once === false && (obj.constructor === String || obj.constructor === Number)){
			once = true;
			return obj;
		}

		if(match in obj)
			return obj[match].constructor === Function ? obj[match]() : obj[match];

		if(match in Self.interpolate)
			return Self.interpolate[match].constructor === Function ? Self.interpolate[match]() : Self.interpolate[match];

		return full;
	});
}

let waiting = false;
var pendingCallback = [];

Self.get = function(path, obj, callback){
	if(obj !== void 0 && obj.constructor === Function){
		callback = obj;
		obj = void 0;
	}

	if(!(Self.default in Self.list))
		Self.list[Self.default] = {};

	if(path.constructor === String)
		return getSingle(path, obj, callback);
	else
		return getMany(path, obj, callback);
}

function startRequest(){
	if(pending === false || Self.serverURL === false)
		return;

	// Request to server after 500ms
	// To avoid multiple request
	clearTimeout(waiting);
	waiting = setTimeout(function(){
		if(activeRequest !== false)
			activeRequest.abort();

		if(Self.serverURL.includes('.json'))
			activeRequest = Request('GET', Self.serverURL.split('*').join(Self.default), null, {
				receiveType:'JSON'
			});
		else{
			activeRequest = Request('POST', Self.serverURL, {
				lang:Self.default,
				paths:JSON.stringify(pending)
			}, {sendType:'JSON', receiveType:'JSON'});
		}

		activeRequest.done(function(obj){
			pending = false;
			Self.add(Self.default, obj);
		})
		.fail(Self.onError);
	}, 500);
}

function getSingle(path, obj, callback){
	let value = diveObject(Self.list[Self.default], path);
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
	const default_ = Self.list[Self.default];
	let value = {};
	const missing = [];

	for (var i = 0; i < paths.length; i++) {
		const temp = diveObject(default_, paths[i]);

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

	const callback_ = function(){
		for (let i = 0; i < missing.length; i++) {
			const temp = diveObject(default_, missing[i]);

			diveObject(value, missing[i], temp);
		}

		return callback(value);
	}

	callback_.callbackOnly = true;
	pendingCallback.push(callback_);

	startRequest();
}

Self.assign = function(model, keyPath, obj, callback){
	if(!(Self.default in Self.list))
		Self.list[Self.default] = {};

	if(obj !== void 0 && obj.constructor === Function){
		callback = obj;
		obj = void 0;
	}

	const keys = Object.keys(keyPath);
	const vals = Object.values(keyPath);

	getMany(vals, obj, function(values){
		for (let i = 0; i < keys.length; i++) {
			model[keys[i]] = diveObject(values, vals[i]);
		}

		if(callback)
			callback();
	});
}

function diveFill(obj1, obj2){
	for(let key in obj2){
		if(!(key in obj1))
			obj1[key] = obj2[key];

		else if(obj2[key].constructor === Object)
			diveFill(obj1[key], obj2[key]);
	}
}

var pending = false;
const pendingElement = [];
var activeRequest = false;

Self.onError = console.error;

function diveObject(obj, path, setValue){
	const parts = path.split('.');
	for (let i = 0, n = parts.length-1; i <= n; i++) {
		const key = parts[i];

		if(setValue === void 0){ // get only
	    	if(!key in obj))
	    		return;

	    	obj = obj[key];
		}
		else{ // set
			if(i === n){
				obj[key] = setValue;
				return;
			}

			if(!(key in obj))
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

function refreshLang(list, noPending, callback){
	requestAnimationFrame(function(){
		let defaultLang = Self.list[Self.default];
		const parentElement = new Set();

		if(defaultLang === void 0)
			defaultLang = Self.list[Self.default] = {};

		const checks = new Set();
		for (let i = list.length-1; i >= 0; i--) {
			if((list[i].sf_lang === Self.default && noPending === true) || list[i].hasAttribute('sf-lang-skip')){
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
				const modelElement = getScope(elem, true);
				if(modelElement !== null){
					if(parentElement.has(modelElement))
						continue;

					// Run below once
					if(modelElement.sf$elementReferences !== void 0 && elementReferencesRefresh(modelElement)){
						parentElement.add(modelElement);
						continue;
					}

					const construct = (elem.constructor._ref || elem.constructor);
					if(construct === HTMLInputElement || construct === HTMLTextAreaElement){
						if(!elem.hasAttribute('placeholder'))
							continue;
					}
				}
			}

			const target = elem.getAttribute('sf-lang');
			const value = diveObject(defaultLang, target);

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
				const construct = (elem.constructor._ref || elem.constructor);
				if(construct !== HTMLInputElement && construct !== HTMLTextAreaElement)
					assignSquareBracket(value, elem);
			}
		}

		if(parentElement.size === 0)
			return callback && callback();

		const appliedElement = new Set();

		// Reapply template (component)
		for(var elem of parentElement){
			elem.sf_lang = Self.default;

			let { model } = elem;
			if(model === void 0)
				model = getScope(elem);

			// Avoid model that doesn't have binding
			if(model.sf$bindedKey === void 0)
				continue;

			if(appliedElement.has(elem))
				continue;

			appliedElement.add(elem);

			if(syntheticTemplate(elem, elem.sf$elementReferences.template, void 0, model, true) !== false)
				continue; // updated

			elem.sf_lang = void 0;
		}

		callback && callback();
	});
}

function elementReferencesRefresh(elem){
	const eRef = elem.sf$elementReferences;
	let processed = false;
	const { template } = eRef;

	if(eRef.parsed === void 0)
		eRef.parsed = new Array(template.parse);

	for (var i = eRef.length-1; i >= 0; i--) {
		const elemRef = eRef[i];
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

		const value = diveObject(Self.list[Self.default], key);
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
				const refB = elemRef.ref;
				elemRef.attribute.value = applyParseIndex(refB.value, refB.parse_index, eRef.parsed, template.parse);
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
	const tags = {};

	const squares = [];
	value = value.replace(/\[([a-zA-Z0-9\-]+):(.*?)\]/g, function(full, tag, match){
		squares.push({tag:tag.toUpperCase(), val:match});
		return '%*&';
	}).split('%*&');

	const { childNodes } = elem;
	const backup = {};
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

	let found = template && true;
	elem.textContent = value[0];

	if(elem.firstChild !== null)
		found = found && elementRebinding(template, eRef, elem.firstChild, elem);

	for (var a = 1; a < value.length; a++) {
		const square = squares[a-1];
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
	const parse_index = []
	const value = text.replace(/{(.*?)}/g, function(full, match){
		if(isNaN(match) !== false){
			if(match in template.modelRefRoot)
				match = template.modelRefRoot[match][0];

			else if(template.modelRef !== void 0 && match in template.modelRef)
				match = template.modelRef[match][0];
			else{
				console.error(`Language can't find existing model binding for '${match}' from`, Object.keys(template.modelRefRoot), template);
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
	parseIndexAllocate(remakeRef.value);
	return true;
}

function elementRebinding(template, eRef, elem, parentNode){
	const remake = {
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
	const collections = elemRef[2];
	const template = elemRef[3];

	const { addresses } = template;
	if(addresses === void 0)
		return;

	let found = false;
	for (let i = addresses.length-1; i >= 0; i--) {
		if(addresses[i].skipSFLang || addresses[i].value === void 0)
			continue;

		const elem = $.childIndexes(addresses[i].address, template.html).parentNode;

		if(addresses[i].sf_lang !== void 0){
			addresses.splice(i, 1);
			continue;
		}

		if(elem.hasAttribute('sf-lang') === false)
			continue;

		found = true;

		const value = diveObject(Self.list[Self.default], elem.getAttribute('sf-lang'));
		if(value === void 0){
			console.error(`Can't found '${elem.getAttribute('sf-lang')}' for ${Self.default}, in`, Self.list[Self.default], ", maybe the language wasn't fully loaded");

			const callback_ = function(){
				refreshTemplate(elemRef);
			};

			callback_.callbackOnly = true;
			pendingCallback.push(callback_);
			return;
		}

		addresses.splice(i, 1);

		const eRef = [];
		assignSquareBracket(value, elem, template, eRef);

		for (let a = 0; a < eRef.length; a++){
			const { ref } = eRef[a];
			const temp = $.childIndexes(ref.address, elem);
			ref.address = $.getSelector(temp, true, template.html);

			if(temp.parentNode.hasAttribute('sf-lang') === false)
				ref.sf_lang = true;

			addresses.push(ref);
		}
	}

	if(found === false)
		template.skipSFLang = true; // skip because not found
}