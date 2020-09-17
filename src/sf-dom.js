const IE11 = Object.getOwnPropertyDescriptor(Function.prototype, 'length').configurable === false;

sf.dom = function(selector, context){
	if(!selector){
		if(selector === void 0){
			const temp = sel=> temp.find(sel);

			if(IE11)
				Object.defineProperty(temp, '_', {value:true});
			return Object.setPrototypeOf(temp, DOMList.prototype);
		}
		else return _DOMList([]);
	}
	else if(selector.constructor === Function)
		return sf.loader.onFinish(selector);
	else if(selector[0] === '<' || selector[selector.length-1] === '>')
		return _DOMList($.parseElement(selector, true));
	else if(context){
		if(context.classList === void 0){
			if(context.animateKey === $.fn.animateKey)
				return context.find(selector);
			else
				return $(queryElements(context, selector));
		}
		return _DOMList(context.querySelectorAll(selector));
	}
	else if(selector.constructor === String)
		return _DOMList(document.querySelectorAll(selector));
	return _DOMList(selector);
}

var $ = sf.dom; // Shortcut

const css_str = /\-([a-z0-9])/;
const css_strRep = (f, m)=> m.toUpperCase();
class DOMList{
	constructor(elements){
		if(elements === null){
	    	this.length = 0;
			return this;
		}

		if(elements.length === void 0){
			this[0] = elements;
			this.length = 1;
			return this;
		}

	    for (let i = 0; i < elements.length; i++)
	    	this[i] = elements[i];

		this.length = elements.length;
		return this;
	}
	push(el){
		if(this._){
			const news = recreateDOMList(this, this.length+1);
			news[this.length] = el;

			return news;
		}

		if(this._s === void 0){
			Object.defineProperties(this, {
				length:{writable:true, enumerable:false, value:1},
				_s:{enumerable:false, value:true},
			});

			this[0] = el;
			return this;
		}

		this[this.length++] = el;
		return this;
	}
	splice(i, count){
		if(i < 0)
			i = this.length + i;

		if(count === void 0)
			count = this.length - i;

		for (var n = this.length - count; i < n; i++)
			this[i] = this[i + count];

		if(this._ === true)
			return recreateDOMList(this, this.length - count);

		if(this._s === void 0){
			Object.defineProperties(this, {
				length:{writable:true, enumerable:false, value:this.length},
				_s:{enumerable:false, value:true},
			});
		}

		this.length -= count;
		for (var i = this.length, n = this.length + count; i < n; i++)
			delete this[i];

		return this;
	}
	find(selector){
		if(this.length === 1) // Optimize perf ~66%
			return _DOMList(this[0].querySelectorAll(selector));

		const t = [];
		for (let i = 0; i < this.length; i++)
			t.push.apply(t, this[i].querySelectorAll(selector));
		return _DOMList(t);
	}
	parent(selector){
		if(this.length === 1){
			if(selector)
				return _DOMList(this[0].closest(selector));
			return _DOMList(this[0].parentNode);
		}

		const t = [];
		for (let i = 0; i < this.length; i++)
			t.push.apply(t, this[i].closest(selector));
		return _DOMList(t);
	}
	prev(selector){
		let t;
		if(this.length !== 0)
			t = $.prevAll(this[0], selector, false, true);
		return _DOMList(t || []);
	}
	prevAll(selector){
		const t = [];
		for (let i = 0; i < this.length; i++)
			t.push.apply(t, $.prevAll(this[i], selector));
		return _DOMList(t);
	}
	next(selector){
		let t;
		if(this.length !== 0)
			t = $.prevAll(this[0], selector, true, true);
		return _DOMList(t || []);
	}
	nextAll(selector){
		const t = [];
		for (let i = 0; i < this.length; i++)
			t.push.apply(t, $.prevAll(this[i], selector, true));
		return _DOMList(t);
	}
	children(selector){
		const t = [];

		for (let a = 0; a < this.length; a++) {
			const child = this[a].children;

			for (let i = 0; i < child.length; i++){
				if(child[i].matches(selector))
					t.push(child[i]);
			}
		}
		return _DOMList(t);
	}

	// Action only
	remove(){
		for (let i = 0; i < this.length; i++)
			this[i].remove();
		return this;
	}
	empty(){
		for (let i = 0; i < this.length; i++)
			this[i].textContent = '';
		return this;
	}
	addClass(name){
		for (let i = 0; i < this.length; i++)
			DOMTokenList.prototype.add.apply(this[i].classList, name.split(' '));
		return this;
	}
	removeClass(name){
		for (let i = 0; i < this.length; i++)
			DOMTokenList.prototype.remove.apply(this[i].classList, name.split(' '));
		return this;
	}
	toggleClass(name){
		for (let i = 0; i < this.length; i++)
			DOMTokenList.prototype.toggle.apply(this[i].classList, name.split(' '));
		return this;
	}
	hasClass(name){
		for (let i = 0; i < this.length; i++)
			if(this[i].classList.contains(name))
				return true;
		return false;
	}
	prop(name, value){
		if(value === void 0)
			return this.length !== 0 ? this[0][name] : '';

		for (let i = 0; i < this.length; i++)
			this[i][name] = value;

		return this;
	}
	attr(name, value){
		if(value === void 0)
			return this.length !== 0 ? this[0].getAttribute(name) : '';

		for (let i = 0; i < this.length; i++)
			this[i].setAttribute(name, value);

		return this;
	}
	removeAttr(name){
		for (let i = 0; i < this.length; i++)
			this[i].removeAttribute(name);

		return this;
	}
	css(name, value){
		if(value === void 0 && name.constructor === String)
			return this.length !== 0 ? this[0].style[name] : '';

		if(name.constructor === Object){
			for(let key in name){
				if(key.includes('-') === false)
					continue;

				name[key.replace(css_str, css_strRep)] = name[key];
				delete name[key];
			}

			for (var i = 0; i < this.length; i++)
				Object.assign(this[i].style, name);

			return this;
		}

		name = name.replace(css_str, css_strRep);

		for (var i = 0; i < this.length; i++)
			this[i].style[name] = value;

		return this;
	}
	on(event, selector, callback, options){
		for (let i = 0; i < this.length; i++){
			if(internal.model.specialEvent[event] !== void 0){
				internal.model.specialEvent[event](this[i], null, callback);
				continue;
			}

			$.on(this[i], event, selector, callback, options);
		}

		return this;
	}
	off(event, selector, callback, options){
		for (let i = 0; i < this.length; i++){
			if(event === void 0){
				$.off(this[i]);
				continue;
			}

			if(internal.model.specialEvent[event] !== void 0){
				if(this[i][`sf$eventDestroy_${event}`] !== void 0)
					this[i][`sf$eventDestroy_${event}`]();

				continue;
			}

			$.off(this[i], event, selector, callback, options);
		}
		return this;
	}
	once(event, selector, callback){
		for (let i = 0; i < this.length; i++)
			$.once(this[i], event, selector, callback);
		return this;
	}
	trigger(events, data, direct) {
		events = events.split(' ');
		for (let i = 0; i < events.length; i++) {
			const event = events[i];
			for (let j = 0; j < this.length; j++) {
				if(direct === true){
					this[j][event](data);
					continue;
				}

				let evt;
				try {
					evt = new window.CustomEvent(event, {detail: data, bubbles: true, cancelable: true});
				} catch (e) {
					evt = document.createEvent('Event');
					evt.initEvent(event, true, true);
					evt.detail = data;
				}

				this[j].dispatchEvent(evt);
			}
		}
		return this;
	}
	animateKey(name, callback, duration){
		for (let i = 0; i < this.length; i++)
			$.animateKey(this[i], name, callback, duration);
		return this;
	}
	each(callback){
		for (let i = 0; i < this.length; i++)
			callback.call(this[i], i, this);
		return this;
	}
	data(key, value){
		if(value === void 0)
			return this.length !== 0 && this[0].$data ? this[0].$data[key] : void 0;

		for (let i = 0; i < this.length; i++){
			if(this[i].$data === void 0)
				this[i].$data = {};
			this[i].$data[key] = value;
		}
		return this;
	}
	removeData(key){
		for (let i = 0; i < this.length; i++){
			if(this[i].$data === void 0)
				continue;

			delete this[i].$data[key];
		}
		return this;
	}
	append(element){
		if(element.constructor === Array){
			for (let i = 0; i < element.length; i++)
				this[0].append(element[i]);
		}
		else{
			if(element.constructor === String)
				this[0].insertAdjacentHTML('beforeEnd', element);
			else this[0].append(element);
		}
		return this;
	}
	prepend(element){
		if(element.constructor === Array){
			for (let i = 0; i < element.length; i++)
				this[0].prepend(element[i]);
		}
		else{
			if(element.constructor === String)
				this[0].insertAdjacentHTML('afterBegin', element);
			else this[0].prepend(element);
		}
		return this;
	}
	eq(i, count){
		if(i < 0)
			i = this.length + i;

		if(count === void 0)
			return _DOMList(this[i]);

		return _DOMList(this.slice(i, count > 0 ? count : void 0));
	}
	insertAfter(el){
		const parent = el.parentNode;
		const next = el.nextSibling;
		parent.insertBefore(this[0], next);

		// Sometime it could gone
		if(this[0] === void 0){
			const temp = toArray(this);
			temp[0] = el.previousSibling;

			for (var i = 1; i < temp.length; i++)
				parent.insertBefore(temp[i], next);

			return $(temp);
		}

		if(this.length > 1)
			for (var i = 1; i < this.length; i++)
				parent.insertBefore(this[i], this[i-1]);
		return this;
	}
	insertBefore(el){
		const parent = el.parentNode;
		parent.insertBefore(this[0], el);

		// Sometime it could gone
		if(this[0] === void 0){
			const temp = toArray(this);
			temp[0] = el.nextSibling;

			for (var i = 1; i < temp.length; i++)
				parent.insertBefore(temp[i], el);

			return $(temp);
		}

		if(this.length > 1)
			for (var i = 1; i < this.length; i++)
				parent.insertBefore(this[i], el);
		return this;
	}

	text(text){
		if(text === void 0)
			return this.length !== 0 ? this[0].textContent : '';

		for (let i = 0; i < this.length; i++)
			this[i].textContent = text;
		return this;
	}
	html(text){
		if(text === void 0)
			return this.length !== 0 ? this[0].innerHTML : '';

		for (let i = 0; i < this.length; i++)
			this[i].innerHTML = text;
		return this;
	}
	val(text){
		if(text === void 0)
			return this.length !== 0 ? this[0].value : '';

		for (let i = 0; i < this.length; i++)
			this[i].text = text;
		return this;
	}

	// Event trigger shortcut
	click(d){return this.trigger('click', d, true)}
	blur(d){return this.trigger('blur', d, true)}
	focus(d){return this.trigger('focus', d, true)}
	focusin(d){return this.trigger('focusin', d)}
	focusout(d){return this.trigger('focusout', d)}
	keyup(d){return this.trigger('keyup', d)}
	keydown(d){return this.trigger('keydown', d)}
	keypress(d){return this.trigger('keypress', d)}
	submit(d){return this.trigger('submit', d)}
	change(d){return this.trigger('change', d)}
	mousedown(d){return this.trigger('mousedown', d)}
	mousemove(d){return this.trigger('mousemove', d)}
	mouseup(d){return this.trigger('mouseup', d)}
	mouseenter(d){return this.trigger('mouseenter', d)}
	mouseleave(d){return this.trigger('mouseleave', d)}
	mouseout(d){return this.trigger('mouseout', d)}
	mouseover(d){return this.trigger('mouseover', d)}
	touchstart(d){return this.trigger('touchstart', d)}
	touchend(d){return this.trigger('touchend', d)}
	touchmove(d){return this.trigger('touchmove', d)}
	resize(d){return this.trigger('resize', d, true)}
	scroll(d){return this.trigger('scroll', d, true)}
}

function _DOMList(list){
	if(!list || list.forEach === void 0 || list.constructor !== NodeList)
		return new DOMList(list);

	const { length } = list;
	Object.setPrototypeOf(list, DOMList.prototype);
	list.length = length;
	return list;
}

function queryElements(arr, selector){
	const list = [];
	for (let i = 0; i < arr.length; i++)
		list.push.apply(list, arr[i].querySelectorAll(selector));
	return list;
}

// Fix for IE11 and Safari, due to lack of writable length
function recreateDOMList($el, length){
	const args = ['sel'];
	for (var i = 1; i < length; i++)
		args.push(`a${i}`);

	const obj = {};
	const temp = Function('o', `return function(${args.join(',')}){return o.find(sel)}`)(obj);
	for (var i = 0; i < length; i++)
		temp[i] = $el[i];

	obj.find = sel=> temp.find(sel);

	Object.defineProperty(temp, '_', {value:true});
	return Object.setPrototypeOf(temp, DOMList.prototype);
}

;(function(){
	const self = sf.dom;

	// ToDo: Optimize performance by using `length` check instead of `for` loop
	self.fn = DOMList.prototype;
	self.fn.add = self.fn.push;

	// Bring array feature that not modifying current length
	self.fn.indexOf = Array.prototype.indexOf;
	self.fn.forEach = Array.prototype.forEach;
	self.fn.concat = Array.prototype.concat;
	self.fn.reverse = Array.prototype.reverse;
	self.fn.slice = Array.prototype.slice;
	self.fn.filter = Array.prototype.filter;
	self.fn.includes = Array.prototype.includes;

	self.findOne = function(selector, context){
		if(context !== void 0) return context.querySelector(selector);
		return document.querySelector(selector);
	}

	self.isChildOf = function(child, parent) {
	     let node = child.parentNode;
	     while (node !== null) {
	         if(node === parent)
	             return true;

	         node = node.parentNode;
	     }

	     return false;
	}

	self.parentHasProperty = function(element, propertyName){
		do {
			if(element[propertyName] !== void 0)
				return element;

			element = element.parentNode;
		} while (element !== null);
		return null;
	}

	self.prevAll = function(element, selector, isNext, one){
		const result = [];
		const findNodes = (!selector || selector.constructor !== String) ? true : false;

		// Skip current element
		element = isNext ? element.nextSibling : element.previousSibling;
		while (element !== null) {
			if(findNodes === false){
				if(element.matches(selector) === true){
					if(one)
						return element;
					result.push(element);
				}
			}
			else{
				if(element === selector){
					if(one)
						return true;
					break;
				}
				result.push(element);
			}

			if(isNext)
				element = element.nextSibling;
			else
				element = element.previousSibling;
		}

		if(one)
			return;
		return result;
	}

	// Shorcut
	self.nextAll = (element, selector, one)=> self.prevAll(element, selector, true, one)

	/**
	 * Listen to an event
	 * @param  Node 			element 	parent element
	 * @param  string 			event   	event name
	 * @param  function|string  selector    callback function or selector
	 * @param  function			callback    callback function
	 * @param  object			options     event options
	 * @return null
	 */
	self.on = function(element, event, selector, callback, options){
		if(event.includes(' ')){
			event = event.split(' ');
			for (let i = 0; i < event.length; i++) {
				self.on(element, event[i], selector, callback, options);
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

		if(element === sf.window){
			if(windowEv[event] === void 0)
				windowEv[event] = [];

			// Listen on current window
			window.addEventListener(event, callback, callback.options);
			saveEvent(window, event, callback);

			// Also listen for other window
			windowEv[event].push(callback);
			const winList = sf.window.list;
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
		if(element.sf$eventListener === void 0)
			element.sf$eventListener = {};

		if(element.sf$eventListener[event] === void 0)
			element.sf$eventListener[event] = [];

		element.sf$eventListener[event].push(callback);
	}

	// Shorcut
	self.once = function(element, event, selector, callback){
		self.on(element, event, selector, callback, {once:true});
	}

	/**
	 * Remove event listener
	 * @param  Node 	element 	parent element
	 * @param  string 	event   	event name
	 * @param  string  	selector    selector | callback
	 * @param  function  	callback    callback
	 * @return null
	 */
	self.off = function(element, event, selector, callback, options){
		// Remove all event
		if(event === void 0){
			if(element.sf$eventListener === void 0)
				return;

			for(var events in element.sf$eventListener) {
				self.off(element, events);
			}
			return;
		}

		var events = event.split(' ');
		if(events.length !== 1){
			for (var i = 0; i < events.length; i++) {
				self.off(element, events[i]);
			}
			return;
		}

		if(selector !== void 0 && selector.constructor === Function){
			callback = selector;
			selector = void 0;
		}

		if(element === sf.window){
			if(windowEv[event] === void 0 || windowEv[event].length === 0)
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
			const winList = sf.window.list;
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
			if(ref !== void 0 && ref[event] !== void 0){
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

	self.animateKey = function(element, animationName, duration, callback){
		if(element === void 0)
			return;

		if(duration && duration.constructor === Function){
			callback = duration;
			duration = void 0;
		}

		if(duration === void 0 || duration.constructor === Number)
			duration = {
				duration:duration && duration.constructor === Number ? duration : 0.6,
				ease:'ease',
				fill:'both'
			};

		if(duration.skipOnHidden && (
			element.offsetParent === null || window.getComputedStyle(element).visibility === 'hidden'
		)) return;

		let animationEnd = null;

		if(element.style.animation !== void 0)
			animationEnd = 'animationend';

		if(element.style.WebkitAnimation !== void 0)
			animationEnd = 'webkitAnimationEnd';

	  	const { style } = element;
		let arrange = animationName;

		if(duration.duration !== void 0)
			arrange += ` ${duration.duration}s`;
		if(duration.ease !== void 0)
			arrange += ` ${duration.ease}`;

		if(duration.delay !== void 0){
			arrange += ` ${duration.delay}s`;

			if(animationEnd === 'animationend')
				var animationStart = 'animationstart';
			else var animationStart = 'webkitAnimationStart';

			if(duration.visible === false){
				element.classList.add('anim-pending');
				style.visibility = 'hidden';
			}

			self.once(element, animationStart, function(){
				if(element.isConnected === false)
					return;

				if(duration.whenBegin)
					duration.whenBegin.call(element);

				element.classList.remove('anim-pending');
				style.visibility = 'visible';
			});
		}
		else style.visibility = 'visible';

		if(duration.iteration !== void 0)
			arrange += ` ${duration.iteration}`;
		if(duration.direction !== void 0)
			arrange += ` ${duration.direction}`;
		if(duration.fill !== void 0)
			arrange += ` ${duration.fill}`;

		style.webkitAnimation = style.animation = arrange;

		setTimeout(function(){
			if(element.isConnected === void 0){
				if(callback !== void 0) callback.call(element);
				return;
			}

			element.classList.add('anim-element');

			if(element.parentNode !== null){
				const origin = (element.offsetLeft + element.offsetWidth/2)+'px' + (element.offsetTop + element.offsetHeight/2)+'px';
				const parentStyle = element.parentNode.style;
				element.parentNode.classList.add('anim-parent');
				parentStyle.webkitPerspectiveOrigin = parentStyle.perspectiveOrigin = origin;
			}

			self.once(element, animationEnd, function(){
				setTimeout(function(){
					if(element.parentNode !== null){
						style.visibility = '';
						element.classList.remove('anim-element');
						style.webkitAnimation = style.animation = '';

						const parentStyle = element.parentNode.style;
						parentStyle.webkitPerspectiveOrigin = parentStyle.perspectiveOrigin = '';

						if(callback !== void 0) callback.call(element);
					}
				});
			});
		});
	}

	const emptyDOM = document.createElement('div');
	self.parseElement = function(html, elementOnly){
		emptyDOM.innerHTML = `<template>${html}</template>`;

		if(elementOnly)
			return emptyDOM.firstElementChild.content.children || [];
		return emptyDOM.firstElementChild.content.childNodes || [];
	}

	self.escapeText = function(text){
		const tempDOM = emptyDOM;
		tempDOM.textContent = text;
		return tempDOM.innerHTML;
	}

	self.remove = function(elements){
		if(elements.remove !== void 0)
			return elements.remove();

		for (let i = 0; i < elements.length; i++) {
			elements[i].remove();
		}
	}

	let documentElement = null;
	sf.loader.domReady(function(){
		documentElement = document.body.parentNode;
	});

	const haveSymbol = /[~`!@#$%^&*()+={}|[\]\\:";'<>?,./ ]/;
	self.getSelector = function(element, childIndexes, untilElement){
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

	self.childIndexes = function(array, context){
		if(array.length === 0) // 2ms
			return context;

		let element = context || documentElement;

		if(array[0].constructor === String && element.id !== array[0].substr(1)) // 3.9ms
			element = element.querySelector(array[0]);

		for (let i = 0; i < array.length; i++) { // 36ms
			element = array[i] === 0
				? element.firstChild
				: element.childNodes.item(array[i]); // 37ms

			if(element === null)
				return null;
		}

		return element;
	}

})();