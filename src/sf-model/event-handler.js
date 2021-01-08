import {customEvent} from "./custom-event.js";
import {avoidQuotes, parsePropertyPath, deepProperty} from "../utils.js";
import Model from "../sf-model.js";
import {internal, sfRegex} from "../shared.js";

if(!window.TouchEvent)
	window.TouchEvent = void 0;

function getDirectReference(_modelScope, script){
	script = parsePropertyPath(script.trim());

	if(script.includes('_modelScope.'))
		return deepProperty(_modelScope, script.slice(12));
	return deepProperty(window, script);
}

export function eventHandler(that, data, _modelScope, rootHandler, template){
	const modelKeys = Model.modelKeys(_modelScope, true);

	let direct = false;
	let script = data.value;
	script = avoidQuotes(script, function(script_){
		if(sfRegex.anyOperation.test(script_) === false)
			direct = true;

		// Replace variable to refer to current scope
		return script_.replace(template.modelRefRoot_regex, (full, before, matched)=> `${before}_modelScope.${matched}`);
	});

	const name_ = data.name.slice(1);
	let wantTrusted = name_.includes('.trusted') || internal.rejectUntrusted;

	// Create custom listener for repeated element
	if(rootHandler){
		if(rootHandler.sf$listListenerLock === void 0)
			rootHandler.sf$listListenerLock = new WeakSet();

		rootHandler.sf$listListenerLock.add(template);
		const elementIndex = $.getSelector(that, true, rootHandler); // `rootHandler` may not the parent of `that`

		if(rootHandler.sf$listListener === void 0)
			rootHandler.sf$listListener = {};

		let withKey = false;
		if(template.uniqPattern !== void 0)
			withKey = true;

		// ToDo today: $0.parentElement.sf$listListener

		if(direct)
			var func = getDirectReference(_modelScope, script);
		else{
			if(withKey)
				var func = new Function('event', '_model_', '_modelScope', template.uniqPattern, script);
			else
				var func = new Function('event', '_model_', '_modelScope', script);
		}

		let listener = rootHandler.sf$listListener[name_];
		if(listener === void 0)
			listener = rootHandler.sf$listListener[name_] = [[elementIndex, func, template]];
		else{
			listener.push([elementIndex, func, template]);
			return;
		}

		let found = null;
		const findEventFromList = function(arr, template){
			// Partial array compare ([0,1,2] with [0,1,2,3,4] ==> true)
			parent:for (let i = 0; i < listener.length; i++) {
				const ref = listener[i];
				if(arr === void 0){
					if(ref[0].length !== 0)
						continue;

					found = ref[0];
					return ref[1];
				}

				if(ref[2] !== template)
					continue;

				const ref2 = ref[0];
				for (let z = 0; z < ref2.length; z++) {
					if(ref2[z] !== arr[z])
						continue parent;
				}

				found = ref[0];
				return ref[1];
			}

			return;
		}

		// We need to get element with 'sf-bind-list' and check current element before processing
		script = function(ev){
			if(ev.isTrusted === false && wantTrusted){
				Security.report && Security.report(1, ev);
				return;
			}

			const elem = ev.target;
			if(elem === rootHandler)
				return;

			if(!(elem.sf$elementReferences && elem.sf$elementReferences.template.bindList)){
				const realThat = findBindListElement(elem);
				if(realThat === null)
					return;

				var call = findEventFromList($.getSelector(elem, true, realThat), realThat.sf$elementReferences.template);
				if(call !== void 0)
					call.call($.childIndexes(found, realThat), ev, realThat.model, _modelScope, realThat.sf$repeatListIndex);

				return;
			}

			var call = findEventFromList(void 0);
			if(call !== void 0)
				call.call(ev.target, ev, ev.target.model, _modelScope, ev.target.sf$repeatListIndex);
		};

		script.listener = listener;
	}

	// Get function reference
	else if(direct){
		script = getDirectReference(_modelScope, script);

		if(internal.rejectUntrusted || name_.includes('.trusted')){
			let original = script;
			script = function(ev){
				if(ev.isTrusted === false){
					Security.report && Security.report(1, ev);
					return;
				}

				original(ev);
			}
		}
	}

	// Wrap into a function, var event = firefox compatibility
	else{
		if(wantTrusted){
			// ToDo: module fix
			script = 'if(!event.isTrusted){Security.report&&Security.report(1,event);return};'+ script;
		}

		script = (new Function('_modelScope', 'event', script)).bind(that, _modelScope);
	}

	let containSingleChar = false;
	let keys = name_.split('.');
	let eventName = keys.shift();

	if(eventName === 'unfocus')
		eventName = 'blur';

	for (let i = keys.length - 1; i >= 0; i--) {
		if(keys[i].length === 1){
			containSingleChar = true;
			break;
		}
	}

	keys = new Set(keys);

	const options = {};
	if(keys.has('once')){
		options.once = true;
		keys.delete('once');
	}

	if(keys.has('passive')){
		if(keys.has('prevent'))
			console.error("Can't preventDefault when using passive listener", that);

		options.passive = true;
		keys.delete('passive');
	}

	// https://dev.to/clickys/bubble-vs-capture--3b19
	if(keys.has('capture')){
		options.capture = true;
		keys.delete('capture');
	}

	if(keys.has('right') && (eventName.includes('mouse') || eventName.includes('pointer'))){
		// Prevent context menu on mouse event
		(rootHandler || that).addEventListener('contextmenu', function(ev){
			ev.preventDefault();
		}, options);
	}

	if(customEvent[eventName]){
		customEvent[eventName]((rootHandler || that), keys, script, _modelScope, rootHandler);
		return;
	}

	let pointerCode = 0;
	if(keys.has('left')){ pointerCode |= 1; keys.delete('left'); }
	if(keys.has('middle')){ pointerCode |= 2; keys.delete('middle'); }
	if(keys.has('right')){ pointerCode |= 4; keys.delete('right'); }
	if(keys.has('4th')){ pointerCode |= 8; keys.delete('4th'); }
	if(keys.has('5th')){ pointerCode |= 16; keys.delete('5th'); }

	let modsCode = 0;
	if(keys.has('ctrl')){ modsCode |= 1; keys.delete('ctrl'); }
	if(keys.has('alt')){ modsCode |= 2; keys.delete('alt'); }
	if(keys.has('shift')){ modsCode |= 4; keys.delete('shift'); }
	if(keys.has('meta')){ modsCode |= 8; keys.delete('meta'); }

	if(direct && keys.size === 0 && pointerCode === 0 && modsCode === 0)
		var callback = script;
	else{
		var callback = function(ev){
			if(keys.has('stop'))
				ev.stopPropagation();
			else if(keys.has('stopAll')){
				ev.stopImmediatePropagation();
				ev.stopPropagation();
			}

			if(ev.ctrlKey !== void 0 && modsCode !== 0){
				if(modsCode & 1 && ev.ctrlKey !== true
					|| modsCode & 2 && ev.altKey !== true
					|| modsCode & 4 && ev.shiftKey !== true
					|| modsCode & 8 && ev.metaKey !== true)
					return;
			}

			if(ev.constructor === KeyboardEvent){
				if(containSingleChar && !keys.has(ev.key))
					return;
			}

			/*
			0 : No button or un-initialized
			1 : Primary button (usually the left button)
			2 : Secondary button (usually the right button)
			4 : Auxilary button (usually the mouse wheel button or middle button)
			8 : 4th button (typically the "Browser Back" button)
			16 : 5th button (typically the "Browser Forward" button)
			*/
			else if(ev.constructor === MouseEvent || ev.constructor === PointerEvent){
				if(pointerCode !== 0 && !(ev.buttons === 0 ? pointerCode & (1 << (ev.which-1)) : ev.buttons === pointerCode))
					return;
			}

			else if(ev.constructor === TouchEvent){
				if(containSingleChar && !keys.has(ev.touches.length))
					return;
			}

			if(keys.has('prevent'))
				ev.preventDefault();

			script.call(this, ev);
		}

		callback.listener = script;
	}

	(rootHandler || that).addEventListener(eventName, callback, options);

	// ToDo: Check if there are unused event attachment on detached element
	// console.error(231, rootHandler, that, eventName, callback, options);

	if(options.once === void 0){
		(rootHandler || that)[`sf$eventDestroy_${eventName}`] = function(){
			(rootHandler || that).removeEventListener(eventName, callback, options);
		}
	}

	// Avoid small memory leak when event still listening
	if(rootHandler)
		that = null;
}