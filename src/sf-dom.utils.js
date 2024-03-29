import {internal} from "./shared.js";
import {loader as Loader} from "./sf-loader.js";

const {windowEv, WindowList} = internal;

export function prevAll(element, selector, isNext, one){
	const result = [];
	const findNodes = (!selector || selector.constructor !== String) ? true : false;

	// Skip current element
	element = isNext ? element.nextSibling : element.previousSibling;
	while (element !== null) {
		if(findNodes === false){
			if(element.matches === void 0){
				element = isNext ? element.nextSibling : element.previousSibling;
				continue;
			}
			if(element.matches(selector) === true){
				if(one) return element;
				result.push(element);
			}
		}
		else{
			if(element === selector){
				if(one) return true;
				break;
			}
			result.push(element);
		}

		element = isNext ? element.nextSibling : element.previousSibling;
	}

	if(one) return;
	return result;
}

/**
 * Listen to an event
 * @param  Node 			element 	parent element
 * @param  string 			event   	event name
 * @param  function|string  selector    callback function or selector
 * @param  function			callback    callback function
 * @param  object			options     event options
 * @return null
 */
export function onEvent(element, event, selector, callback, options, _opt){
	if(event.includes(' ')){
		event = event.split(' ');
		for (let i = 0; i < event.length; i++) {
			onEvent(element, event[i], selector, callback, options);
		}
		return;
	}

	if(callback != null && callback.constructor === Object){
		const temp = options;
		options = callback;
		callback = temp;
	}

	if(selector instanceof Function){
		callback = selector;
		selector = null;
	}

	else if(selector.constructor === Object){
		options = selector;
		selector = null;
	}

	if(_opt != null){
		if(options == null) options = _opt;
		else Object.assign(options, _opt);
	}

	if(selector){
		// Check the related callback from `$0.sf$eventListener[event][index].callback`

		const tempCallback = callback;
		callback = function(ev){
			const target = ev.target.closest(selector);
			if(target !== null)
				tempCallback.call(target, ev);
		}
		callback.callback = tempCallback;
	}

	if(options != null){
		if(options.prevent || options.outside || options.stop || options.stopAll){
			const tempCallback = callback;
			const tempEl = element;

			if(options.outside)
				element = internal.WindowClass;

			callback = function(ev){
				if(options.prevent) ev.preventDefault();
				if(options.stopAll){
					ev.stopPropagation();
					ev.stopImmediatePropagation();
				}
				else if(options.stop) ev.stopPropagation();

				if(options.outside && tempEl.contains(ev.target))
					return;

				tempCallback.call(ev.target, ev);
			}
			callback.callback = tempCallback;
		}

		if(options.slot != null && element.sf$eventListener != null){
			let exist = element.sf$eventListener[event];

			for (var i = exist.length - 1; i >= 0; i--) {
				let temp = exist[i].options;
				if(temp != null && temp.slot === options.slot)
					offEvent(element, event, selector, exist[i], options);
			}
		}
	}

	callback.selector = selector;
	callback.options = options;

	if(element === internal.WindowClass){
		if(!(event in windowEv))
			windowEv[event] = [];

		// Listen on current window
		window.addEventListener(event, callback, callback.options);
		saveEvent(window, event, callback);

		// Also listen for other window
		windowEv[event].push(callback);

		const winList = WindowList;
		for(let key in winList){
			winList[key].addEventListener(event, callback, callback.options);
			saveEvent(winList[key], event, callback);
		}

		return;
	}

	element.addEventListener(event, callback, callback.options);
	if(typeof options === 'object' && options.once)
		return;

	saveEvent(element, event, callback);
}

let memoryLeakNotify = false;
function saveEvent(element, event, callback){
	// Save event listener
	element.sf$eventListener ??= {};

	if(!(event in element.sf$eventListener))
		element.sf$eventListener[event] = [];

	let temp = element.sf$eventListener[event];
	temp.push(callback);

	if(memoryLeakNotify && temp.length > 100){
		memoryLeakNotify = true;
		console.error(`"${event}" has more than 100 event listener, maybe it was a memory leak because the event haven't been unlistened?`);
	}
}

// Shorcut
export function onceEvent(element, event, selector, callback, options){
	onEvent(element, event, selector, callback, options, {once:true});
}

/**
 * Remove event listener
 * @param  Node 	element 	parent element
 * @param  string 	event   	event name
 * @param  string  	selector    selector | callback
 * @param  function  	callback    callback
 * @return null
 */
export function offEvent(element, event, selector, callback, options){
	// Remove all event
	if(event == null){
		if(element.sf$eventListener === void 0)
			return;

		for(var events in element.sf$eventListener) {
			offEvent(element, events, selector, callback, options);
		}
		return;
	}

	var events = event.split(' ');
	if(events.length !== 1){
		for (var i = 0; i < events.length; i++) {
			offEvent(element, events[i], selector, callback, options);
		}
		return;
	}

	if(callback != null && callback.constructor === Object){
		const temp = options;
		options = callback;
		callback = temp;
	}

	if(selector != null){
		if(selector instanceof Function){
			callback = selector;
			selector = null;
		}
		else if(selector.constructor === Object){
			options = selector;
			selector = null;
		}
	}

	if(options != null && options.outside)
		element = internal.WindowClass;

	if(element === internal.WindowClass){
		if(!(event in windowEv) || windowEv[event].length === 0)
			return;

		// Remove from new window event registration
		const list = windowEv[event];
		if(callback){
			var i = list.indexOf(callback);

			if(i === -1){
				i = deepScanEventCallback(list, callback);
				if(i === -1) return;
				callback = list[i];
			}

			if(i !== -1)
				list.splice(i, 1);
		}
		else list.length = 0;

		// Remove from current window
		removeEvent(window, event, selector, callback, options);

		// Remove from other window
		const winList = WindowList;
		for(let key in winList)
			removeEvent(winList[key], event, selector, callback, options);

		return;
	}

	removeEvent(element, event, selector, callback, options);
}

function deepScanEventCallback(list, callback){
	for (var i = 0; i < list.length; i++) {
		var temp = list[i];
		while(temp.callback !== void 0){
			if(temp.callback === callback)
				return i;

			temp = temp.callback;
		}
	}

	return -1;
}

function removeEvent(element, event, selector, callback, options){
	// Remove listener
	if(element.sf$eventListener === void 0){
		if(callback !== void 0)
			element.removeEventListener(event, callback, options);

		return;
	}

	if(callback !== void 0){
		element.removeEventListener(event, callback, options);
		var ref = element.sf$eventListener[event];
		if(ref === void 0)
			return;

		var i = ref.indexOf(callback);

		if(i === -1){
			i = deepScanEventCallback(ref, callback);
			if(i === -1) return;

			element.removeEventListener(event, ref[i], options);
		}

		if(i !== -1)
			ref.splice(i, 1);

		if(ref.length === 0)
			delete element.sf$eventListener[event];
	}
	else{
		var ref = element.sf$eventListener;
		if(ref !== void 0 && event in ref){
			const ref2 = ref[event];
			for (var i = ref2.length - 1; i >= 0; i--) {
				if(selector && ref2[i].selector !== selector)
					continue;

				var { options } = ref2[i];
				element.removeEventListener(event, ref2.splice(i, 1)[0], options);
			}

			delete element.sf$eventListener[event];
		}
	}
}

const emptyDOM = document.createElement('div');
export function parseElement(html, elementOnly){
	emptyDOM.innerHTML = `<template>${html}</template>`;

	if(elementOnly)
		return emptyDOM.firstElementChild.content.children || [];
	return emptyDOM.firstElementChild.content.childNodes || [];
}

const textEscaper = document.createElement('div');
textEscaper.textContent = '.';
const _textEscaper = textEscaper.firstChild;
export function escapeText(text){
	_textEscaper.nodeValue = text;
	return textEscaper.innerHTML;
}

let documentElement = null;
Loader.domReady(function(){
	documentElement = document.body.parentNode;
});

const haveSymbol = /[~`!@#$%^&*()+={}|[\]\\:";'<>?,./ ]/;
export function getSelector(element, childIndexes, untilElement){
	if(untilElement === void 0) untilElement = documentElement;
	else if(element === untilElement){
		if(childIndexes)
			return [];
		return '';
	}

	const previousSibling = childIndexes ? 'previousSibling' : 'previousElementSibling';

	const names = [];
	while(element.parentElement !== null){
		if(!childIndexes && element.id && !haveSymbol.test(element.id)){
			names.unshift(`#${element.id}`);
			break;
		}
		else{
			if(element === untilElement)
				break;
			else {
				let e = element;
				let i = childIndexes ? 0 : 1;

				while(e[previousSibling]){
					e = e[previousSibling];
					i++;
				}

				if(childIndexes)
					names.unshift(i);
				else
					names.unshift(`:nth-child(${i})`);
			}

			element = element.parentElement;
			if(element === null)
				break;
		}
	}

	if(childIndexes)
		return names;
	return names.join(" > ");
}

// ToDo: Improve this performance, or use document.createElement instead
// of cloneNode then calling this function for obtaining the reactive element
export function childIndexes(array, context){
	if(array.length === 0) // 2ms
		return context;

	let element = context || documentElement;

	if(array[0].constructor === String && element.id !== array[0].slice(1)) // 3.9ms
		element = element.querySelector(array[0]);

	for (let i = 0; i < array.length; i++) {
		element = array[i] === 0
			? element.firstChild
			: element.childNodes[array[i]]; // 37ms

		if(element === null)
			return null;
	}

	return element;
}