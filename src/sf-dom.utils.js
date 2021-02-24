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
export function onEvent(element, event, selector, callback, options){
	if(event.includes(' ')){
		event = event.split(' ');
		for (let i = 0; i < event.length; i++) {
			onEvent(element, event[i], selector, callback, options);
		}
		return;
	}

	if(callback !== void 0 && callback.constructor === Object){
		const temp = options;
		options = callback;
		callback = temp;
	}

	if(selector.constructor === Function){
		callback = selector;
		selector = null;
	}

	else if(selector.constructor === Object){
		options = selector;
		selector = null;
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

function saveEvent(element, event, callback){
	// Save event listener
	element.sf$eventListener ??= {};

	if(!(event in element.sf$eventListener))
		element.sf$eventListener[event] = [];

	element.sf$eventListener[event].push(callback);
}

// Shorcut
export function onceEvent(element, event, selector, callback){
	onEvent(element, event, selector, callback, {once:true});
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
	if(event === void 0){
		if(element.sf$eventListener === void 0)
			return;

		for(var events in element.sf$eventListener) {
			offEvent(element, events);
		}
		return;
	}

	var events = event.split(' ');
	if(events.length !== 1){
		for (var i = 0; i < events.length; i++) {
			offEvent(element, events[i]);
		}
		return;
	}

	if(selector !== void 0 && selector.constructor === Function){
		callback = selector;
		selector = void 0;
	}

	if(element === internal.WindowClass){
		if(!(event in windowEv) || windowEv[event].length === 0)
			return;

		const list = windowEv[event];
		if(callback){
			var i = list.indexOf(callback);
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

function removeEvent(element, event, selector, callback, options){
	// Remove listener
	if(element.sf$eventListener === void 0){
		if(callback !== void 0)
			element.removeEventListener(event, callback, options);

		return;
	}

	if(callback){
		element.removeEventListener(event, callback, options);
		var ref = element.sf$eventListener[event];
		if(ref === void 0)
			return;

		var i = ref.indexOf(callback);

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
			: element.childNodes.item(array[i]); // 37ms

		if(element === null)
			return null;
	}

	return element;
}