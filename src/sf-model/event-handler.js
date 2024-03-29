import {CustomEvent} from "./custom-event.js";
import {avoidQuotes, parsePropertyPath, deepProperty, findBindListElement} from "../utils.js";
import {childIndexes, getSelector} from "../sf-dom.utils.js";
import {internal, sfRegex} from "../shared.js";

if(!window.TouchEvent)
	window.TouchEvent = void 0;

function getDirectReference(_modelScope, script){
	script = parsePropertyPath(script.trim());

	if(script[0] === '_modelScope'){
		script.shift();
		return deepProperty(_modelScope, script);
	}
	return deepProperty(window, script);
}

var evFuncCache = new Map();
export function eventHandler(that, data, _modelScope, rootHandler, template){
	let direct = data.cacheDirect ?? false;
	let script = data.cacheScript ?? data.value;
	if(data.cacheScript === void 0){
		script = avoidQuotes(script, function(script_){
			if(sfRegex.anyOperation.test(script_) === false)
				direct = true;

			// Replace variable to refer to current scope
			return script_.replace(template.modelRefRoot_regex.v, (full, before, matched)=> `${before}_modelScope.${matched}`);
		});

		data.cacheDirect = direct;
		data.cacheScript = script;
	}

	const name_ = data.name.slice(1);
	let wantTrusted = name_.includes('.trusted') || internal.rejectUntrusted;

	// Create custom listener for repeated element
	if(rootHandler){
		rootHandler.sf$listListenerLock ??= new WeakSet();

		rootHandler.sf$listListenerLock.add(template);
		const elementIndex = getSelector(that, true, rootHandler); // `rootHandler` may not the parent of `that`

		// ToDo: $0.parentElement.sf$listListener
		// I forgot why I put this ToDo
		rootHandler.sf$listListener ??= {};

		let withKey = false;
		if(template.uniqPattern !== void 0)
			withKey = true;

		/*
		The "Function(...)" here is for creating a custom function based on
		the @event="..." that was made by the developer (you)

		For the example, if you make a template on HTML like below
		ex: <div @click="clickMe('hi')">Click me</div>

		This framework will create a custom function based on the content inside of @click="..."
		ex: Function(args, "clickMe('hi')")
		*/
		if(direct)
			var func = getDirectReference(_modelScope, script);
		else{
			let saveStr = withKey ? template.uniqPattern+script : script;
			let hasCache = evFuncCache.get(saveStr);

			if(hasCache !== void 0)
				var func = hasCache;
			else{
				if(withKey)
					var func = Function('event', '_model_', '_modelScope', template.uniqPattern, script);
				else
					var func = Function('event', '_model_', '_modelScope', script);

				evFuncCache.set(saveStr, func);
			}
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

		let lockCall = false;

		// We need to get element with 'sf-bind-list' and check current element before processing
		script = function(ev){
			if(ev.isTrusted === false && wantTrusted){
				Security.report && Security.report(1, ev);
				return;
			}

			if(lockCall !== false && lockCall.call !== void 0){
				const {element} = lockCall;
				lockCall.call.call(lockCall.target, ev, element.model, _modelScope, element.sf$repeatListIndex);
				return;
			}

			const elem = ev.target;
			if(elem === rootHandler)
				return;

			if(!(elem.sf$elementReferences && elem.sf$elementReferences.template.bindList)){
				const realThat = findBindListElement(elem);
				if(realThat === null)
					return;

				var call = findEventFromList(getSelector(elem, true, realThat), realThat.sf$elementReferences.template);
				if(call !== void 0){
					const target = childIndexes(found, realThat);
					if(lockCall === true){
						lockCall = {
							call,
							target,
							element:realThat
						};
					}

					call.call(target, ev, realThat.model, _modelScope, realThat.sf$repeatListIndex);
				}

				return;
			}

			var call = findEventFromList(void 0);
			if(call !== void 0){
				if(lockCall === true){
					lockCall = {
						call,
						target:ev.target,
						element:ev.target
					};
				}

				call.call(ev.target, ev, ev.target.model, _modelScope, ev.target.sf$repeatListIndex);
			}
		};

		script.lock = function(locking){
			lockCall = locking;
		}

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

		// Please search "Function(...)" from your text editor to see
		// the explanation why this framework is using this
		let hasCache = evFuncCache.get(script);
		let realFunc = hasCache || Function('_modelScope', 'event', script);

		if(hasCache === void 0)
			evFuncCache.set(script, realFunc);

		script = function(ev){
			realFunc.call(that, _modelScope, ev);
		};
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

	let _rootHandler = (rootHandler || that);
	if(keys.has('right') && (eventName.includes('mouse') || eventName.includes('pointer'))){
		// Prevent context menu on mouse event
		_rootHandler.addEventListener('contextmenu', function(ev){
			ev.preventDefault();
		}, options);
	}

	if(keys.has('outside')){
		let realThat = that;
		let realFunc = script;

		that = window;
		script = function(ev){
			if(realThat.contains(ev.target)) return;
			realFunc.apply(this, arguments);
		}

		keys.delete('outside');
	}

	if(CustomEvent[eventName]){
		CustomEvent[eventName](_rootHandler, script, keys, _modelScope);
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

	let hasKeys = keys.size !== 0;
	if(direct && !hasKeys && pointerCode === 0 && modsCode === 0)
		var callback = script;
	else{
		var callback = function(ev){
			if(keys.has('stop'))
				ev.stopPropagation();
			else if(keys.has('stopall')){
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
				if(hasKeys && !keys.has(ev.key.toLowerCase()))
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
				if(containSingleChar && !keys.has(''+ev.touches.length))
					return;
			}

			if(keys.has('prevent'))
				ev.preventDefault();

			script.call(this, ev);
		}

		callback.listener = script;
	}

	_rootHandler.addEventListener(eventName, callback, options);

	// ToDo: Check if there are unused event attachment on detached element
	// console.error(231, rootHandler, that, eventName, callback, options);

	if(options.once === void 0){
		_rootHandler[`sf$eventDestroy_${eventName}`] = function(){
			_rootHandler.removeEventListener(eventName, callback, options);
		}
	}

	// Avoid small memory leak when event still listening
	if(rootHandler)
		that = null;
}