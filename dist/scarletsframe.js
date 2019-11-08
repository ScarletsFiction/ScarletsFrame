if(Element.prototype.remove === undefined || CharacterData.prototype.remove === undefined || DocumentType.prototype.remove === undefined){
  (function (arr) {
    arr.forEach(function (item) {
      if (item.hasOwnProperty('remove')) {
        return;
      }
      Object.defineProperty(item, 'remove', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: function remove() {
          if (this.parentNode !== null)
            this.parentNode.removeChild(this);
        }
      });
    });
  })([Element.prototype, CharacterData.prototype, DocumentType.prototype]);
}

if(!Element.prototype.matches)
  Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;

(function(global, factory){
  // Check browser feature
  if(HTMLElement.prototype.remove === void 0 || window.customElements === void 0 || window.Reflect === void 0){
  	console.error("This browser was not supported");

  	if(window.customElements === void 0)
    	console.warn("This can be fixed by adding 'https://unpkg.com/@webcomponents/webcomponentsjs@2.3.0/webcomponents-loader.js' before loading 'scarletsframe.js'");

    if(window.Reflect === void 0)
    	console.warn("This can be fixed by adding 'https://unpkg.com/core-js-bundle@3.4.0/minified.js' before loading 'scarletsframe.js'");

    alert("This browser was not supported");
  }

  // Dynamic script when using router to load template
  // Feature is disabled by default
  function routerEval(code){eval(code)}

  if(typeof exports === 'object' && typeof module !== 'undefined') module.exports = factory(global, routerEval);
  else global.sf = factory(global, routerEval);
}(typeof window !== "undefined" ? window : this, (function(window, routerEval){

'use strict';

if(typeof document === void 0)
	document = window.document;

// ===== Module Init =====
var internal = {};

var sf = function(stuff){
	if(stuff.constructor === Function)
		return sf.loader.onFinish.apply(null, arguments);

	// If it's Node type
	if(stuff.tagName !== void 0)
		return sf.model.root[sf.controller.modelName(stuff)];
};

sf.internal = {};
sf.regex = {
	getQuotes:/(['"])(?:\1|[\s\S]*?[^\\]\1)/g,
	validFunctionCall:/[_a-zA-Z0-9 \]\$\)]/,
	strictVar:'(?=\\b[^.]|^|\\n| +|\\t|\\W )',
	escapeHTML:/(?!&#.*?;)[\u00A0-\u9999<>\&]/gm,

	uniqueDataParser:/{{((@|#[\w])[\s\S]*?)}}/g,
	dataParser:/{{([^@%][\s\S]*?)}}/g,

	arrayItemsObserve:/\b_model_\.([_a-zA-Z0-9.['\]]+)(?:$|[^'\]])/g,
};

var allowedFunctionEval = {'for':true, 'if':true, 'while':true, '_content_.take':true, 'console.log':true};

function avoidQuotes(str, func, noReturn){
	var temp = [];
	var es = '<%$@>';

	if(noReturn !== void 0){
		func(str.replace(sf.regex.getQuotes, '<%$@>'));
		return;
	}

	str = str.replace(sf.regex.getQuotes, function(full){
		temp.push(full);
		return es+(temp.length-1)+es;
	});

	str = func(str);

	for (var i = 0; i < temp.length; i++) {
		str = str.replace(es+i+es, temp[i]);
	}
	return str;
}

function isEmptyObject(obj){
	for(var key in obj){
		return false;
	}
	return true
}

function compareObject(obj1, obj2){
	if(!obj1 || !obj2)
		return false;

	for(var i in obj1){
		if(typeof obj1[i] !== 'object' && obj1[i] !== obj2[i])
			return false;
	}
	return true;
}

function hiddenProperty(obj, property, value){
	Object.defineProperty(obj, property, {
		enumerable: false,
		configurable: true,
		value: value
	});
}

function deepProperty(obj, path){
  for(var i = 0; i < path.length; i++){
    obj = obj[path[i]];
    if(obj === void 0) return obj;
  }
  return obj;
}

function capitalizeLetters(name){
	for (var i = 0; i < name.length; i++) {
		name[i] = name[i][0].toUpperCase() + name[i].slice(1);
	}
	return name.join('');
}
var IE11 = Object.getOwnPropertyDescriptor(Function.prototype, 'length').configurable === false;

sf.dom = function(selector, context){
	if(!selector){
		if(selector === void 0){
			var temp = function(sel){return temp.find(sel)};

			if(IE11 === false)
				Object.defineProperty(temp, 'length', {writable:true, enumerable:false, value:0});

			return Object.assign(temp, DOMList.prototype);
		}
		else return new DOMList([]);
	}
	else if(selector.constructor === Function)
		return sf(selector);
	else if(selector[0] === '<' || selector[selector.length-1] === '>') 
		return new DOMList(sf.dom.parseElement(selector));
	else if(context)
		return new DOMList(context.querySelectorAll(selector));
	else if(selector.constructor === String)
		return new DOMList(document.querySelectorAll(selector));
	return new DOMList(selector);
}

function DOMList(elements){
	if(elements === null){
		this.length = 0;
		return this;
	}

	if(elements.length === void 0){
		this[0] = elements;
		this.length = 1;
		return this;
	}

    for (var i = 0; i < elements.length; i += 1) {
      this[i] = elements[i];
    }

    this.length = elements.length;
	return this;
}

var $ = sf.dom; // Shortcut

;(function(){
	var self = sf.dom;

	var css_str = /\-([a-z0-9])/;
	var css_strRep = function(f, m){return m.toUpperCase()};

	// ToDo: Optimize performance by using `length` check instead of `for` loop
	self.fn = DOMList.prototype = {
		push:function(el){
			if(IE11)
				this[0] = el;
			else
				this[this.length++] = el;
		},
		indexOf:function(el){
			var keys = Object.keys(this);
			for (var i = 0; i < keys.length; i++) {
				if(this[keys[i]] === el)
					return i;
			}
			return -1;
		},
		splice:function(i){
			for (var n = this.length - 1; i < n; i++) {
				delete this[i];
				this[i] = this[i+1];
			}
			this.length--;
		},
		add:function(el){
			this[this.length++] = el;
			return this;
		},
		find:function(selector){
			if(this.length === 1) // Optimize perf ~66%
				return new DOMList(this[0].querySelectorAll(selector));

			var t = [];
			for (var i = 0; i < this.length; i++)
				t.push.apply(t, this[i].querySelectorAll(selector));
			return new DOMList(t);
		},
		parent:function(selector){
			if(this.length === 1){
				if(selector)
					return new DOMList(self.parent(this[0], selector));
				return new DOMList(this[0].parentNode);
			}

			var t = [];
			for (var i = 0; i < this.length; i++)
				t.push.apply(t, self.parent(this[i], selector));
			return new DOMList(t);
		},
		prevAll:function(selector){
			var t = [];
			for (var i = 0; i < this.length; i++)
				t.push.apply(t, self.prevAll(this[i], selector));
			return new DOMList(t);
		},
		nextAll:function(selector){
			var t = [];
			for (var i = 0; i < this.length; i++)
				t.push.apply(t, self.nextAll(this[i], selector, true));
			return new DOMList(t);
		},
		children:function(selector){
			var t = [];
			for (var i = 0; i < this.length; i++)
				t.push.apply(t, this[i].children);
			return new DOMList(t);
		},

		// Action only
		remove:function(){
			for (var i = 0; i < this.length; i++)
				this[i].remove();
			return this;
		},
		empty:function(){
			for (var i = 0; i < this.length; i++)
				this[i].textContent = '';
			return this;
		},
		addClass:function(name){
			for (var i = 0; i < this.length; i++)
				DOMTokenList.prototype.add.apply(this[i].classList, name.split(' '));
			return this;
		},
		removeClass:function(name){
			for (var i = 0; i < this.length; i++)
				DOMTokenList.prototype.remove.apply(this[i].classList, name.split(' '));
			return this;
		},
		toggleClass:function(name){
			for (var i = 0; i < this.length; i++)
				DOMTokenList.prototype.toggle.apply(this[i].classList, name.split(' '));
			return this;
		},
		hasClass:function(name){
			for (var i = 0; i < this.length; i++)
				if(this[i].classList.contains(name))
					return true;
			return false;
		},
		prop:function(name, value){
			if(value === void 0)
				return this.length !== 0 ? this[0][name] : '';

			for (var i = 0; i < this.length; i++)
				this[i][name] = value;

			return this;
		},
		attr:function(name, value){
			if(value === void 0)
				return this.length !== 0 ? this[0].getAttribute(name) : '';

			for (var i = 0; i < this.length; i++)
				this[i].setAttribute(name, value);

			return this;
		},
		removeAttr:function(name){
			for (var i = 0; i < this.length; i++)
				this[i].removeAttribute(name);

			return this;
		},
		css:function(name, value){
			if(value === void 0 && name.constructor === String)
				return this.length !== 0 ? this[0].style[name] : '';

			if(name.constructor === Object){
				var keys = Object.keys(name);
				for (var i = 0; i < keys.length; i++) {
					if(/\-/.test(keys[i]) !== true)
						continue;

					name[keys[i].replace(css_str, css_strRep)] = name[keys[i]];
					delete name[keys[i]];
				}

				for (var i = 0; i < this.length; i++) {
					Object.assign(this[i].style, name);
				}
				return this;
			}

			name = name.replace(css_str, css_strRep);

			for (var i = 0; i < this.length; i++)
				this[i].style[name] = value;

			return this;
		},
		on:function(event, selector, callback){
			for (var i = 0; i < this.length; i++){
				if(internal.model.specialEvent[event] !== void 0){
					internal.model.specialEvent[event](this[i], null, callback);
					continue;
				}

				self.on(this[i], event, selector, callback);
			}

			return this;
		},
		off:function(event, selector, callback){
			for (var i = 0; i < this.length; i++){
				if(internal.model.specialEvent[event] !== void 0){
					if(this[i]['sf$eventDestroy_'+event] !== void 0)
						this[i]['sf$eventDestroy_'+event]();

					continue;
				}

				self.off(this[i], event, selector, callback);
			}
			return this;
		},
		once:function(event, selector, callback){
			for (var i = 0; i < this.length; i++)
				self.on(this[i], event, selector, callback, true);
			return this;
		},
		trigger:function(events, data, direct) {
			events = events.split(' ');
			for (var i = 0; i < events.length; i++) {
				var event = events[i];
				for (var j = 0; j < this.length; j++) {
					if(direct === true){
						this[j][event]();
						continue;
					}

					var evt;
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
		},
		animateKey:function(name, callback, duration){
			for (var i = 0; i < this.length; i++)
				self.animateKey(this[i], name, callback, duration);
			return this;
		},
		each:function(callback){
			for (var i = 0; i < this.length; i++)
				callback.call(this[i], i, this);
			return this;
		},
		data:function(key, value){
			if(value === void 0)
				return this.length !== 0 && this[0].$data ? this[0].$data[key] : void 0;

			for (var i = 0; i < this.length; i++){
				if(this[i].$data === void 0)
					this[i].$data = {};
				this[i].$data[key] = value;
			}
			return this;
		},
		removeData:function(key){
			for (var i = 0; i < this.length; i++){
				if(this[i].$data === void 0)
					continue;

				delete this[i].$data[key];
			}
			return this;
		},
		append:function(element){
			if(element.constructor === Array || element.constructor === Object){
				for (var i = 0; i < element.length; i++)
					this[0].append(element[i]);
			}
			else{
				if(element.constructor === String)
					this[0].insertAdjacentHTML('beforeEnd', element);
				else this[0].append(element);
			}
			return this;
		},
		prepend:function(element){
			if(element.constructor === Array || element.constructor === Object){
				for (var i = 0; i < element.length; i++)
					this[0].prepend(element[i]);
			}
			else{
				if(element.constructor === String)
					this[0].insertAdjacentHTML('afterBegin', element);
				else this[0].prepend(element);
			}
			return this;
		},
		eq:function(i){
			return new DOMList(this[i]);
		},
		insertAfter:function(el){
			var parent = el.parentNode;
			parent.insertBefore(this[0], el.nextSibling);

			for (var i = 1; i < this.length; i++)
				parent.insertBefore(this[i], this[i-1]);
			return this;
		},
		insertBefore:function(el){
			var parent = el.parentNode;
			for (var i = 0; i < this.length; i++)
				parent.insertBefore(this[i], el);
			return this;
		},

		text:function(text){
			if(text === void 0)
				return this.length !== 0 ? this[0].innerText : '';

			for (var i = 0; i < this.length; i++)
				this[i].innerText = text;
			return this;
		},
		html:function(text){
			if(text === void 0)
				return this.length !== 0 ? this[0].innerHTML : '';

			for (var i = 0; i < this.length; i++)
				this[i].innerHTML = text;
			return this;
		},
		val:function(text){
			if(text === void 0)
				return this.length !== 0 ? this[0].value : '';

			for (var i = 0; i < this.length; i++)
				this[i].text = text;
			return this;
		},
	};

	Object.assign(self.fn, {
		click:function(d){return this.trigger('click', d, true)},
		blur:function(d){return this.trigger('blur', d, true)},
		focus:function(d){return this.trigger('focus', d, true)},
		focusin:function(d){return this.trigger('focusin', d)},
		focusout:function(d){return this.trigger('focusout', d)},
		keyup:function(d){return this.trigger('keyup', d)},
		keydown:function(d){return this.trigger('keydown', d)},
		keypress:function(d){return this.trigger('keypress', d)},
		submit:function(d){return this.trigger('submit', d)},
		change:function(d){return this.trigger('change', d)},
		mousedown:function(d){return this.trigger('mousedown', d)},
		mousemove:function(d){return this.trigger('mousemove', d)},
		mouseup:function(d){return this.trigger('mouseup', d)},
		mouseenter:function(d){return this.trigger('mouseenter', d)},
		mouseleave:function(d){return this.trigger('mouseleave', d)},
		mouseout:function(d){return this.trigger('mouseout', d)},
		mouseover:function(d){return this.trigger('mouseover', d)},
		touchstart:function(d){return this.trigger('touchstart', d)},
		touchend:function(d){return this.trigger('touchend', d)},
		touchmove:function(d){return this.trigger('touchmove', d)},
		resize:function(d){return this.trigger('resize', d, true)},
		scroll:function(d){return this.trigger('scroll', d, true)},
	});

	self.findOne = function(selector, context){
		if(context !== void 0) return context.querySelector(selector);
		return document.querySelector(selector);
	}

	self.isChildOf = function(child, parent) {
	     var node = child.parentNode;
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

	self.parent = function(element, selector){
		if(element.closest) return element.closest(selector);

		do {
			if(element === document)
				return null;

			if(element.matches(selector) === true)
				return element;

			element = element.parentNode;
		} while (element !== null);

		return null;
	}

	self.prevAll = function(element, selector, isNext){
		var result = [];
		var findNodes = !selector || selector.constructor !== String ? true : false;

		// Skip current element
		element = isNext ? element.nextSibling : element.previousSibling;
		while (element !== null) {
			if(findNodes === false){
				if(element.matches(selector) === true)
					result.push(element);
			}
			else{
				if(element === selector)
					break;
				result.push(element);
			}

			if(isNext)
				element = element.nextSibling;
			else
				element = element.previousSibling;
		}

		return result;
	}

	// Shorcut
	self.nextAll = function(element, selector){
		return self.prevAll(element, selector, true);
	}

	/**
	 * Listen to an event
	 * @param  Node 			element 	parent element
	 * @param  string 			event   	event name
	 * @param  function|string  selector    callback function or selector
	 * @param  function			callback    callback function
	 * @param  boolean			once    	call once
	 * @return null
	 */
	self.on = function(element, event, selector, callback, once){
		if(typeof element === 'string'){
			element = document;
			callback = selector;
			selector = event;
			event = element;
		}

		if(event.indexOf(' ') !== -1){
			event = event.split(' ');
			for (var i = 0; i < event.length; i++) {
				self.on(element, event[i], selector, callback, once);
			}
			return;
		}

		if(typeof selector === 'function'){
			callback = selector;
			selector = null;
		}

		if(selector){
			// Check the related callback from `$0.sf$eventListener[event][index].callback`

			var tempCallback = callback;
			callback = function(ev){
				var target = self.parent(ev.target, selector);
				if(target !== null)
					tempCallback.apply(target, [ev]);
			}
			callback.callback = tempCallback;
		}

		callback.selector = selector;
		callback.once = once;
		element.addEventListener(event, callback, {capture:true, once:once === true});

		if(once) return;

		// Save event listener
		if(element.sf$eventListener === void 0)
			element.sf$eventListener = {};

		if(element.sf$eventListener[event] === void 0)
			element.sf$eventListener[event] = [];

		element.sf$eventListener[event].push(callback);
	}

	// Shorcut
	self.once = function(element, event, selector, callback){
		self.on(element, event, selector, callback, true);
	}

	/**
	 * Remove event listener
	 * @param  Node 	element 	parent element
	 * @param  string 	event   	event name
	 * @param  string  	selector    selector | callback
	 * @param  function  	callback    callback
	 * @return null
	 */
	self.off = function(element, event, selector, callback){
		// Remove all event
		if(event === void 0){
			if(element.sf$eventListener === void 0)
				return;

			var events = element.sf$eventListener[event];
			for (var i = 0; i < events.length; i++) {
				self.off(element, events[i]);
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

		// Remove listener
		if(element.sf$eventListener === void 0){
			if(callback !== void 0)
				element.removeEventListener(event, callback, {capture:true});

			return;
		}

		if(callback){
			element.removeEventListener(event, callback, {capture:true});
			var ref = element.sf$eventListener[event];
			if(ref === void 0)
				return;

			var i = ref.indexOf(callback);

			if(i !== -1)
				ref.splice(i, 1);
		}
		else{
			var ref = element.sf$eventListener;
			if(ref !== void 0 && ref[event] !== void 0){
				for (var i = ref[event].length - 1; i >= 0; i--) {
					if(selector && ref[event][i].selector !== selector)
						continue;

					element.removeEventListener(event, ref[event].splice(i, 1), {capture:true});
				}
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

		var animationEnd = null;

		if(element.style.animation !== void 0)
			animationEnd = 'animationend';

		if(element.style.WebkitAnimation !== void 0)
			animationEnd = 'webkitAnimationEnd';

	  	var style = element.style;
		var arrange = animationName;

		if(duration.duration !== void 0)
			arrange += ' '+duration.duration+'s';
		if(duration.ease !== void 0)
			arrange += ' '+duration.ease;

		if(duration.delay !== void 0){
			arrange += ' '+duration.delay+'s';

			if(animationEnd === 'animationend')
				var animationStart = 'animationstart';
			else var animationStart = 'webkitAnimationStart';

			if(duration.visible === false){
				element.classList.add('anim-pending');
				style.visibility = 'hidden';
			}

			self.once(element, animationStart, function(){
				if(!element.isConnected)
					return;

				if(duration.whenBegin)
					duration.whenBegin();

				element.classList.remove('anim-pending');
				style.visibility = 'visible';
			});
		}
		else style.visibility = 'visible';

		if(duration.iteration !== void 0)
			arrange += ' '+duration.iteration;
		if(duration.direction !== void 0)
			arrange += ' '+duration.direction;
		if(duration.fill !== void 0)
			arrange += ' '+duration.fill;

		style.webkitAnimation = style.animation = arrange;

		setTimeout(function(){
			if(!element.isConnected){
				if(callback !== void 0) callback.call(element);
				return;
			}

			element.classList.add('anim-element');

			if(element.parentNode !== null){
				var origin = (element.offsetLeft + element.offsetWidth/2)+'px' + (element.offsetTop + element.offsetHeight/2)+'px';
				var parentStyle = element.parentNode.style;
				element.parentNode.classList.add('anim-parent');
				parentStyle.webkitPerspectiveOrigin = parentStyle.perspectiveOrigin = origin;
			}

			self.once(element, animationEnd, function(){
				setTimeout(function(){
					if(element.parentNode !== null){
						style.visibility = '';
						element.classList.remove('anim-element');
						style.webkitAnimation = style.animation = '';

						var parentStyle = element.parentNode.style;
						parentStyle.webkitPerspectiveOrigin = parentStyle.perspectiveOrigin = '';

						if(callback !== void 0) callback.call(element);
					}
				});
			});
		});
	}

	var emptyDOM = {
		div:document.createElement('div'),
		ul:document.createElement('ul'),
		tbody:document.createElement('tbody'),
		tr:document.createElement('tr'),
		table:document.createElement('table'),
		select:document.createElement('select'),
	};
	self.parseElement = function(html, returnNode){
		var result = [];
		var tempDOM = emptyDOM.div;

        if(html.indexOf('<li') === 0) tempDOM = emptyDOM.ul;
        if(html.indexOf('<tr') === 0) tempDOM = emptyDOM.tbody;
        if(html.indexOf('<td') === 0 || html.indexOf('<th') === 0) tempDOM = emptyDOM.tr;
        if(html.indexOf('<tbody') === 0) tempDOM = emptyDOM.table;
        if(html.indexOf('<option') === 0) tempDOM = emptyDOM.select;

		tempDOM.textContent = '';
		tempDOM.insertAdjacentHTML('afterBegin', html);

		var ref = tempDOM[returnNode ? 'childNodes' : 'children'];
		for (var i = 0; i < ref.length; i++) {
			result.push(ref.item(i));
		}

		return result;
	}

	self.escapeText = function(text){
		var tempDOM = emptyDOM.div;
		tempDOM.textContent = text;
		return tempDOM.innerHTML;
	}

	self.remove = function(elements){
		if(elements.remove !== void 0)
			return elements.remove();

		for (var i = 0; i < elements.length; i++) {
			elements[i].remove();
		}
	}

	var documentElement = null;
	setTimeout(function(){
		sf.loader.domReady(function(){
			documentElement = document.body.parentNode;
		});
	});

	var haveSymbol = /[~`!@#$%^&*()+={}|[\]\\:";'<>?,./ ]/;
	self.getSelector = function(element, childIndexes, untilElement){
		var names = [];
		if(untilElement === void 0) untilElement = documentElement;

		var previousSibling = childIndexes ? 'previousSibling' : 'previousElementSibling';

		while(element.parentNode !== null){
			if(element.id && !haveSymbol.test(element.id)){
				names.unshift('#'+element.id);
				break;
			}
			else{
				if(element === untilElement){
					if(childIndexes === void 0)
						names.unshift(element.tagName);
					else names.unshift(0);
				}
				else {
					var e = element;
					var i = childIndexes ? 0 : 1;

					while(e[previousSibling]){
						e = e[previousSibling];
						i++;
					}

					if(childIndexes)
						names.unshift(i);
					else
						names.unshift(":nth-child("+i+")");
				}

				element = element.parentNode;
				if(element === null)
					break;
			}
		}

		if(childIndexes)
			return names;
		return names.join(" > ");
	}

	self.childIndexes = function(array, context){
		var element = context || documentElement;
		var i = 1;

		if(array[0].constructor === String && element.id !== array[0].substr(1))
			element = element.querySelector(array[0]);

		else if(array.length === 1)
			return element;

		for (i = i; i < array.length; i++) {
			element = element.childNodes.item(array[i]);

			if(element === null)
				return null;
		}

		return element;
	}

})();
sf.loader = new function(){
	var self = this;
	self.loadedContent = 0;
	self.totalContent = 0;
	self.DOMWasLoaded = false;
	self.DOMReady = false;
	self.turnedOff = true;

	var whenDOMReady = [];
	var whenDOMLoaded = [];
	var whenProgress = [];

	// Make event listener
	self.onFinish = function(func){
		if(self.DOMWasLoaded) return func();
		if(whenDOMLoaded.indexOf(func) !== -1) return;
		whenDOMLoaded.push(func);
	}
	self.domReady = function(func){
		if(self.DOMReady) return func();
		if(whenDOMReady.indexOf(func) !== -1) return;
		whenDOMReady.push(func);
	}
	self.onProgress = function(func){
		if(self.DOMWasLoaded) return func(self.loadedContent, self.totalContent);
		if(whenProgress.indexOf(func) !== -1) return;
		whenProgress.push(func);
	}

	self.f = function(element){
		self.loadedContent++;
		for (var i = 0; i < whenProgress.length; i++) {
			whenProgress[i](self.loadedContent, self.totalContent);
		}
	}

	self.css = function(list){
		if(self.DOMWasLoaded){
			// check if some list was loaded
			for (var i = list.length - 1; i >= 0; i--) {
				if($('link[href*="'+list[i]+'"]').length !== 0)
					list.splice(i, 1);
			}
			if(list.length === 0) return;
		}
		self.turnedOff = false;

		self.totalContent = self.totalContent + list.length;
		for(var i = 0; i < list.length; i++){
			var s = document.createElement('link');
	        s.rel = 'stylesheet';
	        s.href = list[i];
	        s.addEventListener('load', sf.loader.f, {once:true});
	        s.addEventListener('error', sf.loader.f, {once:true});
	        document.head.appendChild(s);
		}
	}

	self.js = function(list){
		if(self.DOMWasLoaded){
			// check if some list was loaded
			for (var i = list.length - 1; i >= 0; i--) {
				if($('script[src*="'+list[i]+'"]').length !== 0)
					list.splice(i, 1);
			}
			if(list.length === 0) return;
		}
		self.turnedOff = false;

		self.totalContent = self.totalContent + list.length;
		for(var i = 0; i < list.length; i++){
			var s = document.createElement('script');
	        s.type = "text/javascript";
	        s.async = true;
	        s.src = list[i];
	        s.addEventListener('load', sf.loader.f, {once:true});
	        s.addEventListener('error', sf.loader.f, {once:true});
	        document.head.appendChild(s);
		}
	}

	var lastState = '';
	document.addEventListener("load", function domLoadEvent(event){
		// Add processing class to queued element
		if(document.body){
			document.removeEventListener('load', domLoadEvent, true);

			if(lastState === 'loading'){ // Find images
				var temp = $('img:not(onload)[src]');
				for (var i = 0; i < temp.length; i++) {
					sf.loader.totalContent++;
					temp[i].addEventListener('load', sf.loader.f, {once:true});
					temp[i].addEventListener('error', sf.loader.f, {once:true});
				}
			}
		}
	}, true);

	document.addEventListener('readystatechange', function domStateEvent(){
		if(document.readyState === 'interactive' || document.readyState === 'complete'){
			if(self.DOMReady === false){
				self.DOMReady = true;
				for (var i = 0; i < whenDOMReady.length; i++) {
					try{
						whenDOMReady[i]();
					} catch(e) {
						console.error(e);
					}
				}
			}

			resourceWaitTimer = setInterval(waitResources, 100);
			document.removeEventListener('readystatechange', domStateEvent, true);
		}
	}, true);

	var resourceWaitTimer = -1;
	function waitResources(){
		if(self.turnedOff === false && self.loadedContent < self.totalContent)
			return;

		clearInterval(resourceWaitTimer);

		var listener = sf.dom('script, link, img');
		for (var i = 0; i < listener.length; i++) {
			listener[i].removeEventListener('error', sf.loader.f);
			listener[i].removeEventListener('load', sf.loader.f);
		}

		self.DOMWasLoaded = true;
		self.turnedOff = true;

		// Initialize all pending model
		var keys = Object.keys(internal.modelPending);
		for (var i = 0; i < keys.length; i++) {
			var ref = internal.modelPending[keys[i]];

			if(sf.model.root[keys[i]] === undefined)
				var scope = sf.model.root[keys[i]] = {};
			else var scope = sf.model.root[keys[i]];

			for (var a = 0; a < ref.length; a++) {
				ref[a](scope, root_);
			}

			delete internal.modelPending[keys[i]];
		}

		for (var i = internal.controller.pending.length - 1; i >= 0; i--) {
			var scope = sf.controller.pending[internal.controller.pending[i]];
			if(scope !== void 0){
				scope(root_(internal.controller.pending[i]), root_);
				internal.controller.pending.splice(i, 1);
			}
		}

		for (var i = 0; i < whenDOMLoaded.length; i++) {
			try{
				whenDOMLoaded[i]();
			} catch(e){
				console.error(e);
			}
		}

		whenProgress.splice(0);
		whenDOMReady.splice(0);
		whenDOMLoaded.splice(0);
		whenDOMReady = whenDOMLoaded = null;
	}
}
sf.prototype.constructor = sf.loader.onFinish;
sf.component = new function(){
	var self = this;
	var scope = internal.component = {
		list:{}
	};

	var waitingHTML = {};

	self.registered = {};
	self.available = {};

	self.for = function(name, func, extend){
		if(self.registered[name] === void 0)
			self.registered[name] = [func, sf.controller.pending[name], 0, false, extend];

		internal.component[name.toUpperCase()] = true;

		self.registered[name][0] = func;
		delete sf.controller.pending[name];

		defineComponent(name);
	}

	self.html = function(name, outerHTML){
		if(self.registered[name] === void 0)
			self.registered[name] = [false, false, 0, false];

		var temp = $.parseElement(outerHTML);
		if(temp.length === 1)
			self.registered[name][3] = temp[0];
		else{
			var tempDOM = document.createElement('div');
			tempDOM.tempDOM = true;
			for (var i = 0; i < temp.length; i++) {
				tempDOM.appendChild(temp[i]);
			}
			self.registered[name][3] = tempDOM;
		}

		if(waitingHTML[name] === void 0)
			return;

		var upgrade = waitingHTML[name];
		delete waitingHTML[name];

		for (var i = upgrade.length - 1; i >= 0; i--) {
			var el = upgrade[i].el;
			self.new(name, el, upgrade[i].item);
			delete el.sf$initTriggered;

			if(el.model.init)
				el.model.init();
		}
	}

	var tempDOM = document.createElement('div');
	self.new = function(name, element, $item){
		if(internal.component.skip)
			return;

		if(element.hasAttribute('sf-repeat-this')){
			element.sf$componentIgnore = true;
			return;
		}

		if(element.childElementCount === 0){
			if(self.registered[name][3] === false){
				if(waitingHTML[name] === void 0)
					waitingHTML[name] = [];

				waitingHTML[name].push({el:element, item:$item});
				return;
			}
		}

		if(element.sf$componentIgnore === true)
			return;

		var avoid = /(^|:)(sf-|class|style)/;
		var attr = element.attributes;

		if(attr.length !== 0 && $item === void 0)
			$item = {};

		for (var i = 0; i < attr.length; i++) {
			if(avoid.test(attr[i].nodeName))
				continue;

			$item[attr[i].nodeName] = attr[i].value;
		}

		if(element === void 0){
			if(self.registered[name][3] === false){
				console.error("HTML content for '"+name+"' was not defined");
				return;
			}
			element = self.registered[name][3].cloneNode(true);
		}

		var newID = name+'@'+(self.registered[name][2]++);

		if(self.available[name] === void 0)
			self.available[name] = [];

		self.available[name].push(newID);

		var newObj = sf.model.root[newID] = {$el:$()};
		newObj.$el.push(element);

		self.registered[name][0](newObj, sf.model, $item);

		if(self.registered[name][1])
			self.registered[name][1](newObj, sf.model, $item);

		if(element.childElementCount === 0){
			var temp = self.registered[name][3];
			var tempDOM = temp.tempDOM;

			// Create template here because we have the sample model
			if(temp.constructor !== Object){
				temp = sf.model.extractPreprocess(temp, null, newObj);
				self.registered[name][3] = temp;
				temp.tempDOM = tempDOM;
			}

			var copy = Object.assign({}, temp);

			if(copy.parse.length !== 0){
				var _content_ = null;
				copy.parse = copy.parse.slice(0);

				for (var i = 0; i < copy.parse.length; i++) {
					copy.parse[i] = Object.assign({}, copy.parse[i]);
					var ref = copy.parse[i].data = copy.parse[i].data.slice(0);

					if(_content_ === null && ref.length === 4){
						_content_ = Object.assign({}, ref[2]);
						_content_._modelScope = newObj;
					}

					ref[1] = newObj;
					ref[2] = _content_;
				}
			}

			var parsed = internal.model.templateParser(copy, newObj);
			element.sf$elementReferences = parsed.sf$elementReferences;
			sf.model.bindElement(element, newID, copy);

			if(tempDOM === true){
				parsed = parsed.childNodes;
				for (var i = 0, n = parsed.length; i < n; i++) {
					element.appendChild(parsed[0]);
				}
			}
			else element.appendChild(parsed);
		}
		else{
			var specialElement = {
				repeat:[],
				input:[]
			};

			sf.model.parsePreprocess(sf.model.queuePreprocess(element, true, specialElement), newID);
			internal.model.bindInput(specialElement.input, newObj);
			internal.model.repeatedListBinding(specialElement.repeat, newObj);
		}

		element.model = newObj;
		componentInit(element, newID, name);

		element.sf$initTriggered = true;
		return element;
	}

	function componentInit(element, newID, from){
		element.sf$controlled = newID;
		element.sf$componentFrom = from;
	}

	var HTMLElement = window.HTMLElement;
	var customElements = window.customElements;

	var HTMLElement_wrap = (function(Class){
		function Wrapper(){
			return Reflect.construct(Class, arguments, Object.getPrototypeOf(this).constructor);
		}
		Wrapper.prototype = Object.create(Class.prototype, {constructor:{value: Wrapper, enumerable: false, writable: true, configurable: true}}); 
		return Object.setPrototypeOf(Wrapper, Class);
	})(HTMLElement);

	// name = 'tag-name'
	function defineComponent(name){
		if(customElements.get(name))
			return;

		name = name.replace(/[^\w-]+/g, '');
		var tagName = name;
		name = name.split('-');
		if(name.length === 1)
			return console.error("Please use '-' when defining component tags");

		name = capitalizeLetters(name);

		// Create function at current scope
		var func = eval("function "+name+"($item){var he = HTMLElement_wrap.call(this);self.new(tagName, he, $item);return he}"+name);
		func.prototype = Object.create(HTMLElement.prototype);
		func.prototype.constructor = func;
		func.__proto__ = HTMLElement;

		func.prototype.connectedCallback = function(){
			// Maybe it's not the time
			if(!this.model)
				return;

			if(this.sf$destroying !== void 0){
				clearTimeout(this.sf$destroying);
				this.sf$destroying = void 0;
				return;
			}

			if(this.sf$initTriggered){
				delete this.sf$initTriggered;

				if(this.model.init)
					this.model.init();
				return;
			}

			if(this.model.reinit)
				this.model.reinit();
		};

		func.prototype.disconnectedCallback = function(){
			if(this.sf$componentIgnore)
				return;

			var components = sf.component.available[tagName];
			components.splice(components.indexOf(this.sf$controller), 1);

			var that = this;
			this.sf$destroying = setTimeout(function(){
				if(!that.model)
					return console.log(that);

				if(that.model.destroy)
					that.model.destroy();

				internal.model.removeModelBinding(that.model, true);
				that.model.$el = null;

				delete sf.model.root[that.sf$controlled];
			}, 500);
		};

		try{
		  customElements.define(tagName, func);
		}catch(err){console.error(err)}

		window['$'+name] = func;
	}
};
// Data save and HTML content binding
sf.model = function(scope){
	// If it's component tag
	if(sf.component.registered[scope] !== void 0)
		return root_(scope);

	if(!sf.model.root[scope]){
		sf.model.root[scope] = {};
		internal.controller.pending.push(scope);
	}

	// This usually being initialized after DOM Loaded
	var pending = internal.modelPending[scope];
	if(pending){
		var temp = sf.model.root[scope];
		for (var i = 0; i < pending.length; i++) {
			pending[i](temp, sf.model);
		}
		pending = internal.modelPending[scope] = false;
	}

	for (var i = internal.controller.pending.length - 1; i >= 0; i--) {
		var temp = sf.controller.pending[internal.controller.pending[i]];
		if(temp !== void 0){
			temp(root_(internal.controller.pending[i]), root_);
			internal.controller.pending.splice(i, 1);
		}
	}

	if(sf.controller.pending[scope])
		sf.controller.run(scope);

	return sf.model.root[scope];
};

;(function(){
	var self = sf.model;
	self.root = {};
	internal.modelPending = {};

	// Find an index for the element on the list
	self.index = function(element){
		if(element.hasAttribute('sf-bind-list') === false)
			element = sf.dom.parent(element, '[sf-bind-list]');

		var i = -1;
		var tagName = element.tagName;
		var currentElement = element;

		while(element !== null) {
			if(element.tagName === tagName)
				i++;

			element = element.previousElementSibling;
		}

		var list = currentElement.getAttribute('sf-bind-list');
		if(!list) return i;

		var ref = self.root[sf.controller.modelName(currentElement)][list];
		if(!ref.$virtual) return i;

		return i + ref.$virtual.DOMCursor - 1;
	}

	// Declare model for the name with a function
	self.for = function(name, func){
		if(!sf.loader.DOMWasLoaded){
			if(internal.modelPending[name] === undefined)
				internal.modelPending[name] = [];

			if(internal.modelPending[name] === false)
				return func(self(name), self);

			// Initialize when DOMLoaded
			return internal.modelPending[name].push(func);
		}

		func(self(name), self);
	}

	// Get property of the model
	self.modelKeys = function(modelRef){
		var keys = Object.keys(modelRef);
		for (var i = keys.length - 1; i >= 0; i--) {
			if(keys[i].indexOf('$') !== -1)
				keys.splice(i, 1);
		}
		return keys;
	}
})();

// Define sf-model element
class SFModel extends HTMLElement {
	constructor(){
		super();

		this.sf$firstInit = true;
	}
	connectedCallback(){
		if(this.sf$destroying !== void 0)
			clearTimeout(this.sf$destroying);

		if(this.sf$firstInit === void 0)
			return;

		var that = this;
		delete this.sf$firstInit;

		setTimeout(function(){
			if(sf.loader.DOMWasLoaded)
				return sf.model.init(that, that.getAttribute('name'));

			sf.loader.onFinish(function(){
				sf.model.init(that, that.getAttribute('name'));
			});
		});
	}
	disconnectedCallback(){
		var that = this;
		this.sf$destroying = setTimeout(function(){
			if(that.model.$el){
				var i = that.model.$el.indexOf(that);
				if(i !== -1)
					that.model.$el.splice(i)
			}

			internal.model.removeModelBinding(that.model);
		}, 1000);
	}
}

customElements.define('sf-m', SFModel);
;(function(){
var self = sf.model;

self.init = function(el, modelName){
	if(el.sf$controlled !== void 0)
		return;

	el.sf$controlled = modelName;

	var model = el.model = sf.model.root[modelName] || sf.model(modelName);
	if(model.$el === void 0)
		model.$el = $();

	model.$el.push(el);

	if(sf.controller.pending[modelName] !== void 0)
		sf.controller.run(modelName);

	var specialElement = {
		repeat:[],
		input:[]
	};

	sf.model.parsePreprocess(sf.model.queuePreprocess(el, void 0, specialElement), modelName);

	bindInput(specialElement.input, model);
	repeatedListBinding(specialElement.repeat, model);

	if(model.init !== void 0)
		model.init(el);
}

// Escape the escaped quote
function escapeEscapedQuote(text){
	return text.split('\\"').join('\\$%*').split("\\'").join('\\%$*');
}

function unescapeEscapedQuote(text){
	return text.split('\\$%*').join('\\"').split('\\%$*').join("\\'");
}

var processingElement = null;
var bindingEnabled = false;
var scope = internal.model = {};

// For debugging, normalize indentation
function trimIndentation(text){
	var indent = text.split("\n", 3);
	if(indent[0][0] !== ' ' || indent[0][0] !== "\t")
		indent = indent[1];
	else indent = indent[0];

	if(indent === void 0) return text;
	indent = indent.length - indent.trim().length;
	if(indent === 0) return text;
	return text.replace(RegExp('^([\\t ]{'+indent+'})', 'gm'), '');
}

// Secured evaluation
var bracketMatch = /([\w\n.]*?[\S\s])\(/g;
var chackValidFunctionCall = sf.regex.validFunctionCall;
var localEval = function(script, _model_, _modelScope, _content_){
	"use strict";

	var _result_ = '';
	try{
		if(/@return /.test(script) === true){
			var _evaled_ = eval('(function(){'+script.split('@return ').join('return ')+'})()');

			if(_evaled_ === void 0)
				return _result_ + 'undefined';

			if(_evaled_ === null)
				return _result_ + 'null';

			// Check if it's an HTMLElement
			if(_evaled_.onclick !== void 0)
				return _evaled_;

			return _result_ + _evaled_;
		}
		else var _evaled_ = eval(script);
	} catch(e){
		console.groupCollapsed("%c<-- Expand the template error", 'color: yellow');
		console.log(trimIndentation(processingElement.outerHTML).trim());
		console.log("%c"+trimIndentation(script).trim(), 'color: yellow');
		console.groupEnd();

		console.error(e);
		return '#TemplateError';
	}

	if(_result_ !== '') return _result_;
	return _evaled_;
}

var modelScript_ = /_result_|return/;
function modelScript(script){
	var which = script.match(modelScript_);

	if(which === null)
		script = 'return '+script;
	else if(which[0] === '_result_')
		script = 'var _result_="";'+script+';return _result_';

	script = script
		.split('_model_').join('arguments[0]').split('arguments[0]:t').join('_model_:t')
		.split('_modelScope').join('arguments[1]')
		.split('_content_').join('arguments[2]')
		.split('@return').join('return');

	return new Function(script);
}
internal.model.removeModelBinding = function(ref, noBackup){
	if(ref === void 0)
		return;

	var bindedKey = ref.sf$bindedKey;
	var temp = null;
	for(var key in bindedKey){
		if(bindedKey[key] === null)
			continue;

		for (var i = bindedKey[key].length-1; i >= 0; i--) {
			if(!bindedKey[key][i].element.isConnected)
				bindedKey[key].splice(i, 1);
		}

		if(bindedKey[key].input !== void 0)
			for (var i = bindedKey[key].input.length-1; i >= 0; i--) {
				if(!bindedKey[key].input[i].isConnected)
					bindedKey[key].input.splice(i, 1);
			}

		if(ref[key].constructor === String ||
			ref[key].constructor === Number ||
			ref[key].constructor === Boolean
		){/* Ok */}

		else if(ref[key].constructor === Array){
			if(ref[key].$virtual){
				ref[key].$virtual.destroy();
				ref[key].$virtual = void 0;
			}

			// Reset property without copying the array
			if(noBackup === void 0){
				temp = ref[key].splice('obtain');
				delete ref[key];
				ref[key] = temp;
			}
			else delete ref[key];
		}
		else continue;

		if(bindedKey[key].length === 0){
			delete bindedKey[key];

			if(Object.getOwnPropertyDescriptor(ref, key) === void 0)
				continue;

			// Reconfigure / Remove property descriptor
			if(noBackup === void 0){
				var temp = ref[key];
				delete ref[key];
				ref[key] = temp;
			}
			else delete ref[key];
		}
	}
}

function modelToViewBinding(model, propertyName, callback, elementBind, type){
	// Enable multiple element binding
	if(model.sf$bindedKey === void 0)
		initBindingInformation(model);

	if(model.sf$bindedKey[propertyName] !== void 0){
		var ref = model.sf$bindedKey[propertyName];
		if(ref.indexOf(callback) === -1)
			ref.push(callback);

		if(elementBind !== void 0){
			if(ref.input === void 0){
				ref.input = [elementBind];
				ref.input.type = type;
			}
			else ref.input.push(elementBind);
		}
		return;
	}

	model.sf$bindedKey[propertyName] = [callback];

	if(elementBind !== void 0){
		var ref = model.sf$bindedKey[propertyName];
		ref.input = [elementBind];
		ref.input.type = type;
	}

	// Proxy property
	if(Object.getOwnPropertyDescriptor(model, propertyName).set !== void 0)
		return;

	var objValue = model[propertyName]; // Object value
	Object.defineProperty(model, propertyName, {
		enumerable: true,
		configurable: true,
		get:function(getAssigner){
			return objValue;
		},
		set:function(val){
			if(objValue !== val){
				var newValue = void 0;
				if(inputBoundRunning === false){
					var on = model['on$'+propertyName];
					var out = model['out$'+propertyName];

					try{
						if(on !== void 0)
							newValue = on(objValue, val);
						if(out !== void 0)
							newValue = out(objValue, val);
					}catch(e){console.error(e)}
				}

				var m2v = model['m2v$'+propertyName];
				if(m2v !== void 0){
					newValue = m2v(objValue, val);

					if(newValue !== void 0){
						objValue = newValue;
						m2v = val;
					}
					else{
						m2v = void 0;
						objValue = val;
					}
				}
				else
					objValue = newValue !== void 0 ? newValue : val;

				var ref = model.sf$bindedKey[propertyName];
				for (var i = 0; i < ref.length; i++) {
					if(inputBoundRun === ref[i]){
						ref[i](objValue, ref.input);
						continue;
					}

					if(syntheticTemplate(ref[i].element, ref[i].template, void 0, model) === false)
						0; //No update
				}

				if(m2v !== void 0)
					objValue = m2v;
			}

			inputBoundRunning = false;
			return objValue;
		}
	});
}

self.bindElement = function(element, modelName, template){
	var model = self.root[modelName];

	if(template === void 0){
		template = self.extractPreprocess(element, null, model);
		templateParser(template, model, true);
		delete template.addresses;

		// console.warn(42, template.html, element);
		element.parentNode.replaceChild(template.html, element);

		element = template.html;
	}

	var properties = template.modelRef_array;
	for (var i = 0; i < properties.length; i++) {
		var propertyName = properties[i][0];

		if(model[propertyName] === void 0)
			model[propertyName] = '';

		modelToViewBinding(model, propertyName, {
			element:element,
			template:template
		});
	}
}
function eventHandler(that, data, _modelScope){
	var modelKeys = sf.model.modelKeys(_modelScope).join('|');

	var direct = false;
	var script = data.value;
	script = avoidQuotes(script, function(script_){
		if(/[ =(+-]/.test(script_) === false)
			direct = true;

		// Replace variable to refer to current scope
		return script_.replace(RegExp(sf.regex.strictVar+'('+modelKeys+')\\b', 'g'), function(full, matched){
			return '_modelScope.'+matched;
		});
	});

	// Get function reference
	if(direct)
		script = eval(script);

	// Wrap into a function
	else
		script = (new Function('var event = arguments[1];'+script.split('_modelScope.').join('arguments[0].')))
			.bind(that, _modelScope);

	var containSingleChar = false;
	var keys = data.name.slice(1).split('.');
	var eventName = keys.shift();

	if(eventName === 'unfocus')
		eventName = 'blur';

	for (var i = keys.length - 1; i >= 0; i--) {
		if(keys[i].length === 1){
			containSingleChar = true;
			break;
		}
	}

	keys = new Set(keys);

	var options = {};
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

	if(eventName.indexOf('mouse') === 0){
		eventName = 'pointer'+eventName.slice(5);

		// Prevent context menu on mouse event
		if(keys.has('right'))
			that.addEventListener('contextmenu', function(ev){
				ev.preventDefault();
			}, options);
	}

	if(specialEvent[eventName]){
		specialEvent[eventName](that, keys, script, _modelScope);
		return;
	}

	if(direct && keys.size === 0)
		var callback = script;
	else{
		var callback = function(ev){
			if(!keys.has('bot') && ev.isTrusted === false)
				return;

			if(keys.has('stop'))
				ev.stopPropagation();

			if(ev.ctrlKey !== void 0){
				if(ev.ctrlKey !== keys.has('ctrl')
					|| ev.altKey !== keys.has('alt')
					|| ev.shiftKey !== keys.has('shift')
					|| ev.metaKey !== keys.has('meta'))
					return;
			}

			if(ev.constructor === KeyboardEvent){
				if(containSingleChar && !keys.has(ev.key))
					return;

				ev.preventDefault();
			}

			/*
			0 : No button or un-initialized
			1 : Primary button (usually the left button)
			2 : Secondary button (usually the right button)
			4 : Auxilary button (usually the mouse wheel button or middle button)
			8 : 4th button (typically the "Browser Back" button)
			16 : 5th button (typically the "Browser Forward" button)
			*/
			else if(ev.constructor === PointerEvent){
				if(!(ev.buttons & 1) && keys.has('left')
					|| !(ev.buttons & 2) && keys.has('right')
					|| !(ev.buttons & 4) && keys.has('middle')
					|| !(ev.buttons & 8) && keys.has('4th')
					|| !(ev.buttons & 16) && keys.has('5th'))
					return;

				ev.preventDefault();
			}

			else if(ev.constructor === TouchEvent){
				if(containSingleChar && !keys.has(ev.touches.length))
					return;

				ev.preventDefault();
			}

			else if(keys.has('prevent'))
				ev.preventDefault();

			script.call(this, ev);
		}
	}

	that.addEventListener(eventName, callback, options);

	if(!options.once){
		that['sf$eventDestroy_'+eventName] = function(){
			that.removeEventListener(eventName, callback, options);
		}
	}
}

var specialEvent = internal.model.specialEvent = {
	taphold:function(that, keys, script, _modelScope){
		var set = new Set();
		var evStart = null;

		function callback(){
			that.removeEventListener('pointerup', callbackEnd, {once:true});
			that.removeEventListener('pointercancel', callbackEnd, {once:true});

			document.removeEventListener('pointermove', callbackMove);
			set.delete(evStart.pointerId);

			script.call(that, evStart);
		}

		function callbackMove(ev){
			ev.preventDefault();
			ev.stopPropagation();

			if(Math.abs(evStart.clientX - ev.clientX) > 1 || Math.abs(evStart.clientY - ev.clientY) > 1){
				clearTimeout(timer);
				set.delete(ev.pointerId);
				that.removeEventListener('pointerup', callbackEnd, {once:true});
				that.removeEventListener('pointercancel', callbackEnd, {once:true});
				document.removeEventListener('pointermove', callbackMove);

				evStart = null;
			}
		}

		var timer = 0;

		function callbackStart(ev){
			clearTimeout(timer);

			set.add(ev.pointerId);
			if(set.size > 1){
				ev.preventDefault();
				ev.stopPropagation();

				that.removeEventListener('pointerup', callbackEnd, {once:true});
				that.removeEventListener('pointercancel', callbackEnd, {once:true});
				document.removeEventListener('pointermove', callbackMove);
				return;
			}

			evStart = ev;
			timer = setTimeout(callback, 700);

			that.addEventListener('pointerup', callbackEnd, {once:true});
			that.addEventListener('pointercancel', callbackEnd, {once:true});
			document.addEventListener('pointermove', callbackMove);
		}

		function callbackEnd(ev){
			document.removeEventListener('pointermove', callbackMove);
			evStart = null;

			set.delete(ev.pointerId);
			clearTimeout(timer);
		}

		that.addEventListener('pointerdown', callbackStart);

		that['sf$eventDestroy_taphold'] = function(){
			that.removeEventListener('pointerdown', callbackStart);
		}
	},
	gesture:function(that, keys, script, _modelScope){
		touchGesture(that, function callback(data){
			script.call(that, data);
		});
	},
	dragmove:function(that, keys, script, _modelScope){
		var length = 0;
		var actionBackup = '';
		var startEv = null;

		function callbackMove(ev){
			ev.stopPropagation();
			ev.preventDefault();

			script.call(that, ev);
		}

		var callbackStart = function(ev){
			ev.preventDefault();

			if(++length !== 1){
				document.removeEventListener('pointermove', callbackMove);
				document.removeEventListener('pointerup', callbackEnd, {once:true});
				document.removeEventListener('pointercancel', callbackEnd, {once:true});
				return;
			}

			script.call(that, ev);
			startEv = ev;

			actionBackup = that.style.touchAction;
			that.style.touchAction = 'none';

			document.addEventListener('pointermove', callbackMove);
			document.addEventListener('pointerup', callbackEnd, {once:true});
			document.addEventListener('pointercancel', callbackEnd, {once:true});
		}

		var callbackEnd = function(ev){
			ev.preventDefault();

			if(--length === 1){
				document.addEventListener('pointermove', callbackMove);
				document.addEventListener('pointerup', callbackEnd, {once:true});
				document.addEventListener('pointercancel', callbackEnd, {once:true});
				return;
			}

			script.call(that, ev);
			startEv = null;

			that.style.touchAction = actionBackup;

			document.removeEventListener('pointermove', callbackMove);
			that.addEventListener('pointerdown', callbackStart, {once:true});
		}

		that.addEventListener('pointerdown', callbackStart, {once:true});

		that['sf$eventDestroy_dragmove'] = function(){
			that.removeEventListener('pointerdown', callbackStart, {once:true});
			that.removeEventListener('pointermove', callbackMove);
			that.removeEventListener('pointercancel', callbackEnd, {once:true});
			that.removeEventListener('pointerup', callbackEnd, {once:true});
		}
	}
};

function touchGesture(that, callback){
	var startScale = 0;
	var startAngle = 0;
	var lastScale = 0;
	var lastAngle = 0;
	var actionBackup = '';

	var force = false;
	var pointers = [];

	function findAnd(action, ev){
		for (var i = 0; i < pointers.length; i++) {
			if(pointers[i].pointerId === ev.pointerId){
				if(action === 2) // delete
					pointers.splice(i, 1);
				else if(action === 1) // replace
					pointers.splice(i, 1, ev);
				return;
			}
		}

		if(action === 0) // add
			pointers.push(ev);
	}

	var callbackStart = function(ev){
		ev.preventDefault();
		findAnd(0, ev);

		if(pointers.length === 1){
			if(force)
				pointers.unshift({
					pointerId:'custom',
					clientX:that.offsetLeft + that.offsetWidth/2,
					clientY:that.offsetTop + that.offsetHeight/2
				});

			actionBackup = that.style.touchAction;
			that.style.touchAction = 'none';

			document.addEventListener('pointerup', callbackEnd);
			document.addEventListener('pointercancel', callbackEnd);
		}

		if(pointers.length === 2){
			ev.stopPropagation();

			var dx = pointers[1].clientX - pointers[0].clientX;
			var dy = pointers[1].clientY - pointers[0].clientY;

			lastScale = startScale = Math.sqrt(dx**2 + dy**2) * 0.01;
			lastAngle = startAngle = Math.atan2(dy, dx) * 180/Math.PI;

			ev.scale = 
			ev.angle = 
			ev.totalScale = 
			ev.totalAngle = 0;

			callback(ev);
			document.addEventListener('pointermove', callbackMove);
		}
		else document.removeEventListener('pointermove', callbackMove);
	}

	var callbackMove = function(ev){
		ev.preventDefault();
		ev.stopPropagation();
		findAnd(1, ev);

		var dx = pointers[1].clientX - pointers[0].clientX;
		var dy = pointers[1].clientY - pointers[0].clientY;

		var currentScale = Math.sqrt(dx**2 + dy**2) * 0.01;
		var currentAngle = Math.atan2(dy, dx) * 180/Math.PI;

		ev.scale = currentScale - lastScale;
		ev.angle = currentAngle - lastAngle;
		ev.totalScale = currentScale - startScale;
		ev.totalAngle = currentAngle - startAngle;

		callback(ev);

		lastScale = currentScale;
		lastAngle = currentAngle;
	}

	var callbackEnd = function(ev){
		ev.preventDefault();
		findAnd(2, ev);

		if(pointers.length <= 1){
			if(pointers.length === 0){
				document.removeEventListener('pointerup', callbackEnd);
				document.removeEventListener('pointercancel', callbackEnd);
			}

			that.style.touchAction = actionBackup;

			document.removeEventListener('pointermove', callbackMove);

			ev.scale = ev.angle = 0;
			ev.totalScale = lastScale - startScale;
			ev.totalAngle = lastAngle - startAngle;
			callback(ev);
		}
		else{
			document.addEventListener('pointerup', callbackEnd);
			document.addEventListener('pointercancel', callbackEnd);

			if(pointers.length === 2){
				document.removeEventListener('pointermove', callbackMove);

				ev.scale = ev.angle = 0;
				callback(ev);
			}
		}
	}

	that.addEventListener('pointerdown', callbackStart);

	that['sf$eventDestroy_gesture'] = function(){
		that.removeEventListener('pointerdown', callbackStart);
		document.removeEventListener('keydown', keyStart);
	}

	var keyEnd = function(ev){
		if(!force || ev.ctrlKey)
			return;

		force = false;
		pointers.length = 0;

		document.removeEventListener('pointermove', callbackMove);
		document.removeEventListener('keyup', keyEnd);
	}

	var keyStart = function(ev){
		if(!ev.ctrlKey)
			return;

		force = true;
		document.addEventListener('keyup', keyEnd);
	}

	document.addEventListener('keydown', keyStart);
}
var callInputListener = function(model, property, value){
	var on = model['on$'+property];
	var v2m = model['v2m$'+property];
	var newValue1 = void 0; var newValue2 = void 0;
	if(on !== void 0 || v2m !== void 0){
		var old = model[property];
		if(old !== null && old !== void 0 && old.constructor === Array)
			old = old.slice(0);

		try{
			if(v2m !== void 0)
				newValue1 = v2m(old, value);

			if(on !== void 0)
				newValue2 = on(old, value);
		}catch(e){console.error(e)}
	}
	return newValue2 !== void 0 ? newValue2 : newValue1;
}

var inputBoundRunning = false;
var inputTextBound = function(e){
	if(e.fromSFFramework === true) return;

	var ref = inputBoundRunning = e.target;
	ref.viewInputted = true;
	var value = ref.typeData === Number ? Number(ref.value) : ref.value;
	var newValue = callInputListener(ref.sfModel, ref.sfBounded, value);
	if(newValue !== void 0)
		ref.sfModel[ref.sfBounded] = newValue;
	else ref.sfModel[ref.sfBounded] = value;
}
var inputFilesBound = function(e){
	if(e.fromSFFramework === true) return;
	
	var ref = e.target;
	callInputListener(ref.sfModel, ref.sfBounded, ref.files);
	ref.sfModel[ref.sfBounded] = ref.files;
}

var inputCheckBoxBound = function(e){
	if(e.fromSFFramework === true) return;
	
	var ref = inputBoundRunning = e.target;
	ref.viewInputted = true;
	var value = ref.typeData === Number ? Number(ref.value) : ref.value;
	var newValue = callInputListener(ref.sfModel, ref.sfBounded, value);
	if(newValue !== void 0)
		value = newValue;

	var model = ref.sfModel;
	var constructor = model[ref.sfBounded].constructor;

	if(constructor === Array){
		var i = model[ref.sfBounded].indexOf(value);

		if(i === -1 && ref.checked === true)
			model[ref.sfBounded].push(value);
		else if(i !== -1 && ref.checked === false)
			model[ref.sfBounded].splice(i, 1);
	}
	else if(constructor === Boolean || ref.typeData === Boolean)
		model[ref.sfBounded] = ref.checked;
	else model[ref.sfBounded] = value;
}

var inputSelectBound = function(e){
	if(e.fromSFFramework === true) return;
	
	var ref = inputBoundRunning = e.target;
	ref.viewInputted = true;
	var typeData = ref.typeData;
	if(ref.multiple === true){
		var temp = ref.selectedOptions;
		var value = [];
		for (var i = 0; i < temp.length; i++) {
			value.push(typeData === Number ? Number(temp[i].value) : temp[i].value);
		}
	}
	else value = typeData === Number ? Number(ref.selectedOptions[0].value) : ref.selectedOptions[0].value;

	var newValue = callInputListener(ref.sfModel, ref.sfBounded, value);
	if(newValue !== void 0)
		ref.sfModel[ref.sfBounded] = newValue;
	else ref.sfModel[ref.sfBounded] = value;
}

var assignElementData = {
	select:function(val, element){
		var list = element.options;
		var typeData = element.typeData;
		var arrayValue = val.constructor === Array ? val : false;
		for (var i = 0, n = list.length; i < n; i++) {
			if(arrayValue === false){
				if(typeData === String)
					list[i].selected = list[i].value === val;
				else list[i].selected = list[i].value == val;
			}
			else list[i].selected = arrayValue.indexOf(typeData === Number ? Number(list[i].value) : list[i].value) !== -1;
		}
	},
	checkbox:function(val, element){
		if(val.constructor === Array)
			element.checked = val.indexOf(element.typeData === Number ? Number(element.value) : element.value) !== -1;
		else if(val.constructor === Boolean)
			element.checked = Boolean(val);
		else{
			if(element.typeData === String)
				element.checked = element.value === val;
			else element.checked = element.value == val;
		}
	}
}

var inputBoundRun = function(val, elements){
	if(val !== 0 && !val)
		return;

	for (var i = 0; i < elements.length; i++) {
		if(inputBoundRunning === elements[i])
			continue; // Avoid multiple assigment

		var ev = new Event('change');
		ev.fromSFFramework = true;

		if(elements.type === 1) // text
			elements[i].value = val;
		else if(elements.type === 2) // select options
			assignElementData.select(val, elements[i]);
		else if(elements.type === 3) // radio
			elements[i].checked = val == elements[i].value;
		else if(elements.type === 4) // checkbox
			assignElementData.checkbox(val, elements[i]);

		elements[i].dispatchEvent(ev);
	}
}

var triggerInputEvent = function(e){
	if(e.fromSFFramework === true) return;
	if(e.target.viewInputted === true){
		e.target.viewInputted = false;
		return;
	}
	e.target.dispatchEvent(new Event('input'));
}

var elementBoundChanges = function(model, property, element, oneWay){
	// Enable multiple element binding
	if(model.sf$bindedKey === void 0)
		initBindingInformation(model);

	var val = model[property];

	var type = 0;
	var typeData = null;
	if(val !== null && val !== void 0)
		typeData = val.constructor;

	var assignedType = (element.getAttribute('typedata') || '').toLowerCase();
	if(assignedType === 'number')
		typeData = Number;

	element.typeData = typeData;
	$.on(element, 'change', triggerInputEvent);

	// Bound value change
	if(element.tagName === 'TEXTAREA'){
		$.on(element, 'input', inputTextBound);
		element.value = val;
		type = 1;
	}

	else if(element.selectedOptions !== void 0){
		$.on(element, 'input', inputSelectBound);
		type = 2;

		assignElementData.select(val, element);
	}

	else{
		var type = element.type.toLowerCase();
		if(type === 'radio'){
			$.on(element, 'input', inputTextBound);
			type = 3;

			element.checked = val == element.value;
		}
		else if(type === 'checkbox'){
			$.on(element, 'input', inputCheckBoxBound);
			type = 4;

			assignElementData.checkbox(val, element);
		}

		else if(type === 'file'){
			$.on(element, 'input', inputFilesBound);
			return;
		}

		else{
			$.on(element, 'input', inputTextBound);
			element.value = val;
			type = 1;
		}
	}

	if(oneWay === true) return;
	modelToViewBinding(model, property, inputBoundRun, element, type);
}

var bindInput = internal.model.bindInput = function(temp, modelScope){
	for (var i = 0; i < temp.length; i++) {
		var element = temp[i];

		var oneWay = false;
		var propertyName = element.getAttribute('sf-bind');
		if(propertyName === null){
			propertyName = element.getAttribute('sf-into');
			oneWay = true;
		}
		if(propertyName === "")
			propertyName = element.getAttribute('name');

		if(propertyName === null){
			console.error("Property key to be bound wasn't be found", element);
			continue;
		}

		// Get reference
		if(modelScope[propertyName] === void 0){
			console.error('Can\'t get property "'+propertyName+'" on model', modelScope);
			return;
		}

		element.sfBounded = propertyName;
		element.sfModel = modelScope;
		if(oneWay === false){
			element.setAttribute('sf-bound', '');
			element.removeAttribute('sf-bind');
		}
		else{
			element.setAttribute('sf-bound', '');
			element.removeAttribute('sf-into');
		}

		elementBoundChanges(modelScope, propertyName, element, oneWay);
	}
}
// For contributor of this library
// Please be careful when you're passing the eval argument
var dataParser = function(html, _model_, mask, _modelScope, runEval, preParsedReference){
	if(!runEval) runEval = '';

	var modelKeys = self.modelKeys(_modelScope).join('|');

	if(modelKeys.length === 0)
		throw "The model was not found";

	// Don't match text inside quote, or object keys
	var scopeMask = RegExp(sf.regex.strictVar+'('+modelKeys+')\\b', 'g');

	if(mask)
		var itemMask = RegExp(sf.regex.strictVar+mask+'\\.\\b', 'g');

	bindingEnabled = true;

	if(runEval === '#noEval'){
		var preParsed = [];
		var lastParsedIndex = preParsedReference.length;
	}

	var prepared = html.replace(sf.regex.dataParser, function(actual, temp){
		temp = avoidQuotes(temp, function(temp_){
			// Unescape HTML
			temp_ = temp_.split('&amp;').join('&').split('&lt;').join('<').split('&gt;').join('>');

			// Mask item variable
			if(mask)
				temp_ = temp_.replace(itemMask, function(matched){
					return '_model_.'+matched[0].slice(1);
				});

			// Mask model for variable
			return temp_.replace(scopeMask, function(full, matched){
				return '_modelScope.'+matched;
			});
		}).split('_model_._modelScope.').join('_model_.');

		// Evaluate
		if(runEval === '#noEval'){
			temp = temp.trim();

			// Simplicity similar
			var exist = preParsed.indexOf(temp);

			if(exist === -1){
				preParsed.push(temp);
				preParsedReference.push({type:REF_DIRECT, data:[temp, _model_, _modelScope]});
				return '{{%=' + (preParsed.length + lastParsedIndex - 1);
			}
			return '{{%=' + (exist + lastParsedIndex);
		}

		temp = '' + localEval.apply(self.root, [runEval + temp, _model_, _modelScope]);

		return temp.replace(sf.regex.escapeHTML, function(i) {
	        return '&#'+i.charCodeAt(0)+';';
	    });
	});

	if(runEval === '#noEval'){
		// Clear memory before return
		_modelScope = preParsed = _model_ = mask = runEval = scopeMask = itemMask = html = null;
		setTimeout(function(){prepared = null});
	}
	return prepared;
}

// Dynamic data parser
var uniqueDataParser = function(html, _model_, mask, _modelScope, runEval){
	// Get prepared html content
	var _content_ = {
		length:0,
		_modelScope:_modelScope,
		take:function(passVar, currentIndex){
			if(passVar === null)
				return dataParser(this[currentIndex], _model_, mask, this._modelScope);

			// Use strict mode and prepare for new variables
			var strDeclare = '"use strict";var ';
			var firstTime = true;

			// Declare new variable
			for(var key in passVar){
				if(typeof passVar[key] === 'string')
					passVar[key] = '"'+passVar[key].split('"').join('\\"')+'"';
				else if(key === '_model_'){
					_model_ = passVar[key];
					continue;
				}
				else if(typeof passVar[key] === 'object')
					passVar[key] = JSON.stringify(passVar[key]);

				if(!firstTime)
					strDeclare += ',';

				strDeclare += key + ' = ' + passVar[key];
				firstTime = false;
			}

			// Remove var because no variable are being passed
			if(firstTime === true)
				strDeclare = strDeclare.replace('var ', '');

			// Escape function call for addional security eval protection
			strDeclare = strDeclare.split('(').join('&#40;').split(')').join('&#41;');

			// Pass to static data parser for another HTML data
			return dataParser(this[currentIndex], _model_, mask, this._modelScope, strDeclare + ';');
		}
	};

	// Build script preparation
	html = html.replace(/{\[([\s\S]*?)\]}/g, function(full, matched){
		if(/{{.*?}}/.test(matched) === false)
			return "_result_ += '"+matched.split("'").join("\\'")+"'";

		_content_[_content_.length] = matched;
		_content_.length++;
		return '_result_ += _content_.take(&VarPass&, '+(_content_.length - 1)+');';
	});

	var modelKeys = self.modelKeys(_modelScope).join('|');

	if(modelKeys.length === 0)
		throw "The model was not found";

	// Don't match text inside quote, or object keys
	var scopeMask = RegExp(sf.regex.strictVar+'('+modelKeys+')\\b', 'g');

	if(mask)
		var itemMask = RegExp(sf.regex.strictVar+mask+'\\.\\b', 'g');

	if(runEval === '#noEval')
		var preParsedReference = [];

	var prepared = html.replace(sf.regex.uniqueDataParser, function(actual, temp){
		temp = avoidQuotes(temp, function(temp_){
			// Unescape HTML
			temp_ = temp_.split('&amp;').join('&').split('&lt;').join('<').split('&gt;').join('>');

			// Mask item variable
			if(mask)
				temp_ = temp_.replace(itemMask, function(matched){
					return '_model_.'+matched[0].slice(1);
				});

			// Mask model for variable
			return temp_.replace(scopeMask, function(full, matched){
				return '_modelScope.'+matched;
			});
		}).split('_model_._modelScope.').join('_model_.');;

		var result = '';
		var check = false;

		// Get defined variables
		var VarPass_ = /(var|let)([\w,\s]+)(?=\s(?==|in|of))/g;
		var VarPass = [];
		var s1 = null;
		while((s1 = VarPass_.exec(temp)) !== null){
			VarPass.push(s1[2]);
		}

		if(_model_ === null && runEval === '#noEval')
			VarPass.push('_model_');

		if(VarPass.length !== 0){
			var obtained = [];
			for (var i = 0; i < VarPass.length; i++) {
				VarPass[i].replace(/([\n\t\r]|  )+/g, '').split(',').forEach(function(val){
					obtained.push(val);
				});
			};
			VarPass = obtained;
			for (var i = 0; i < VarPass.length; i++) {
				VarPass[i] += ':typeof '+VarPass[i]+'!=="undefined"?'+VarPass[i]+':void 0';
			}

			if(VarPass.length === 0)
				VarPass = 'null';
			else VarPass = '{'+VarPass.join(',')+'}';
			temp = temp.split('&VarPass&').join(VarPass);
		}
		else temp = temp.split('&VarPass&').join('null');

		check = temp.split('@if ');
		if(check.length !== 1){
			check = check[1].split(':');

			// {if, elseIf:([if, value], ...), elseValue}
			var findElse = function(text){
				text = text.join(':');
				var else_ = null;

				// Split elseIf
				text = text.split('@elseif ');

				// Get else value
				var else_ = text[text.length - 1].split('@else');
				if(else_.length === 2){
					text[text.length - 1] = else_[0];
					else_ = else_.pop();
					else_ = else_.substr(else_.indexOf(':') + 1);
				}
				else else_ = null;

				var obj = {
					if:text.shift(),
					elseIf:[],
					elseValue:else_
				};

				// Separate condition script and value
				for (var i = 0; i < text.length; i++) {
					var val = text[i].split(':');
					obj.elseIf.push([val.shift(), val.join(':')]);
				}

				return obj;
			}

			if(runEval === '#noEval'){
				var condition = check.shift();
				var elseIf = findElse(check);
				elseIf.type = REF_IF;
				elseIf.data = [_model_, _modelScope, _content_];

				// Trim Data
				elseIf.if = [condition.trim(), elseIf.if.trim()];
				if(elseIf.elseValue !== null)
					elseIf.elseValue = elseIf.elseValue.trim();

				for (var i = 0; i < elseIf.elseIf.length; i++) {
					elseIf.elseIf[i][0] = elseIf.elseIf[i][0].trim();
					elseIf.elseIf[i][1] = elseIf.elseIf[i][1].trim();
				}

				// Push data
				preParsedReference.push(elseIf);
				return '{{%%=' + (preParsedReference.length - 1);
			}

			var scopes = [check[0], _model_, _modelScope, _content_];

			// If condition was not meet
			if(!localEval.apply(self.root, scopes)){
				check.shift();
				return elseIfHandle(findElse(check), scopes);
			}

			check.shift();
			scopes[0] = check.join(':');

			return localEval.apply(self.root, scopes);
		}

		// Warning! Avoid unencoded user inputted content
		// And always check/remove closing ']}' in user content
		// Any function call will be removed for addional security
		check = temp.split('@exec');
		if(check.length !== 1){
			var scopes = [check[1], _model_, _modelScope, _content_];

			if(runEval === '#noEval'){
				preParsedReference.push({type:REF_EXEC, data:scopes});
				return '{{%%=' + (preParsedReference.length - 1);
			}

			temp = localEval.apply(self.root, scopes);
			return temp;
		}
		return '';
	});

	if(runEval === '#noEval'){
		// Clear memory before return
		_modelScope = runEval = scopeMask = itemMask = html = null;
		setTimeout(function(){prepared = null});
		return [prepared, preParsedReference, _content_];
	}

	return prepared;
}

self.extractPreprocess = function(targetNode, mask, modelScope){
	// Remove repeated list from further process
	// To avoid data parser
	var backup = targetNode.querySelectorAll('[sf-repeat-this]');
	for (var i = 0; i < backup.length; i++) {
		var current = backup[i];
		current.insertAdjacentHTML('afterEnd', '<sfrepeat-this></sfrepeat-this>');
		current.remove();
	}

	var copy = targetNode.outerHTML;

	// Mask the referenced item
	if(mask !== null)
		copy = copy.split('#'+mask).join('_model_');

	// Extract data to be parsed
	copy = uniqueDataParser(copy, null, mask, modelScope, '#noEval');
	var preParsed = copy[1];
	var _content_ = copy[2];
	copy = dataParser(copy[0], null, mask, modelScope, '#noEval', preParsed);

	function findModelProperty(){
		if(mask === null){ // For model items
			// Get model keys and sort by text length, make sure the longer one is from first index to avoid wrong match
			var extract = RegExp('(?:{{.*?\\b|_modelScope\\.)('+self.modelKeys(modelScope).sort(function(a, b){
				return b.length - a.length
			}).join('|')+')(\\b.*?}}|)', 'g');
		}
		else var extract = sf.regex.arrayItemsObserve; // For array items
		var found = {};

		for (var i = 0; i < preParsed.length; i++) {
			var current = preParsed[i];

			// Text or attribute
			if(current.type === REF_DIRECT){
				current.data[0].split('"').join("'").replace(extract, function(full, match){
					match = match.replace(/\['(.*?)'\]/g, function(full_, match_){
						return '.'+match_;
					});

					if(found[match] === void 0) found[match] = [i];
					else if(found[match].indexOf(i) === -1)
						found[match].push(i);
				});

				// Convert to function
				current.get = modelScript(current.data.shift());
				continue;
			}

			// Dynamic data
			if(current.type === REF_IF){
				var checkList = current.if.join(';');
				current.if[0] = modelScript(current.if[0]);
				current.if[1] = modelScript(current.if[1]);

				if(current.elseValue !== null){
					checkList += ';' + current.elseValue;
					current.elseValue = modelScript(current.elseValue);
				}

				for (var a = 0; a < current.elseIf.length; a++) {
					var refElif = current.elseIf[a];

					checkList += refElif.join(';');
					refElif[0] = modelScript(refElif[0]);
					refElif[1] = modelScript(refElif[1]);
				}
			}
			else if(current.type === REF_EXEC){
				var checkList = current.data.shift();

				// Convert to function
				current.get = modelScript(checkList);
			}

			checkList = checkList.replace(/_result_ \+= _content_\.take\(.*?, ([0-9]+)\);/g, function(full, match){
				return _content_[match];
			});

			checkList.split('"').join("'").replace(extract, function(full, match){
				match = match.replace(/\['(.*?)'\]/g, function(full_, match_){
					return '.'+match_;
				});

				if(found[match] === void 0) found[match] = [i];
				else if(found[match].indexOf(i) === -1)
					found[match].push(i);
			});
		}

		return found;
	}

	// Rebuild element
	internal.component.skip = true;
	copy = $.parseElement(copy)[0];
	internal.component.skip = false;

	// Restore element repeated list
	var restore = copy.querySelectorAll('sfrepeat-this');
	for (var i = 0; i < restore.length; i++) {
		var current = restore[i];
		current.parentNode.replaceChild(backup[i], current);
	}

	var specialElement = {
		repeat:[],
		input:[]
	};

	// Start addressing
	var nodes = self.queuePreprocess(copy, true, specialElement).reverse();
	var addressed = [];

	function addressAttributes(currentNode){
		var attrs = currentNode.attributes;
		var keys = [];
		var indexes = 0;
		for (var a = attrs.length - 1; a >= 0; a--) {
			var found = attrs[a].value.split('{{%=');
			if(attrs[a].name[0] === '@'){
				// No template processing for this
				if(found.length !== 1){
					console.error("To avoid vulnerability, template can't be used inside event callback", currentNode);
					continue;
				}

				keys.push({
					name:attrs[a].name,
					value:attrs[a].value,
					event:true
				});

				currentNode.removeAttribute(attrs[a].name);
			}

			if(found.length !== 1){
				if(attrs[a].name[0] === ':'){
					var key = {
						name:attrs[a].name.slice(1),
						value:attrs[a].value
					};

					currentNode.removeAttribute(attrs[a].name);
					currentNode.setAttribute(key.name, '');
				}
				else var key = {
					name:attrs[a].name,
					value:attrs[a].value
				};

				indexes = [];
				found = key.value.replace(/{{%=([0-9]+)/g, function(full, match){
					indexes.push(Number(match));
					return '';
				});

				if(found === '' && indexes.length === 1)
					key.direct = indexes[0];
				else
					key.parse_index = indexes;

				keys.push(key);
			}
		}
		return keys;
	}

	var currentElement = addressAttributes(copy);
	if(currentElement.length !== 0)
		addressed.push({
			nodeType:1,
			address:[0],
			attributes:currentElement
		});

	for (var i = 0; i < nodes.length; i++) {
		var temp = {
			nodeType:nodes[i].nodeType
		};

		if(temp.nodeType === 1){ // Element
			temp.attributes = addressAttributes(nodes[i]);
			temp.address = $.getSelector(nodes[i], true);
		}

		else if(temp.nodeType === 3){ // Text node
			var innerHTML = nodes[i].textContent;
			var indexes = [];

			innerHTML.replace(/{{%%=([0-9]+)/gm, function(full, match){
				indexes.push(Number(match));
			});

			// Check for dynamic mode
			if(indexes.length !== 0){
				innerHTML = innerHTML.split(/{{%%=[0-9]+/gm);
				for (var a = 0; a < innerHTML.length; a++) {
					innerHTML[a] = trimIndentation(innerHTML[a]).trim();
				}
				nodes[i].textContent = innerHTML.shift();

				var parent = nodes[i].parentNode;
				var nextSibling = nodes[i].nextSibling;

				// Dynamic boundary start
				var addressStart = null;
				if(indexes.length !== 0 && nodes[i].textContent.length !== 0)
					addressStart = $.getSelector(nodes[i], true);
				else if(nodes[i].previousSibling !== null)
					addressStart = $.getSelector(nodes[i].previousSibling, true);

				// Find boundary ends
				var commentFlag = [];
				for(var a = 0; a < indexes.length; a++){
					var flag = document.createComment('');
					parent.insertBefore(flag, nextSibling);
					commentFlag.push({
						nodeType:-1,
						parse_index:indexes[a],
						startFlag:addressStart,
						address:$.getSelector(flag, true)
					});

					if(innerHTML[a]){
						var textNode = document.createTextNode(innerHTML[a]);
						parent.insertBefore(textNode, nextSibling);

						// Get new start flag
						if(a + 1 < indexes.length)
							addressStart = $.getSelector(textNode, true);
					}
					else if(addressStart !== null && a + 1 < indexes.length){
						addressStart = addressStart.slice();
						addressStart[addressStart.length-1]++;
					}
				}

				// Merge boundary address
				Array.prototype.push.apply(addressed, commentFlag);
				if(nodes[i].textContent === ''){
					nodes[i].remove();
					for (var a = 0; a < commentFlag.length; a++) {
						var ref = commentFlag[a].address;
						ref[ref.length - 1]--;
					}
					continue;
				}
				else if(nodes[i].textContent.search(/{{%=[0-9]+/) === -1)
					continue;
			}

			// Check if it's only model value
			indexes = [];
			innerHTML = nodes[i].textContent.replace(/{{%=([0-9]+)/gm, function(full, match){
				indexes.push(Number(match));
				return '';
			});

			if(innerHTML === '' && indexes.length === 1)
				temp.direct = indexes[0];
			else{
				temp.value = nodes[i].textContent;
				temp.parse_index = indexes;
			}

			temp.address = $.getSelector(nodes[i], true);
		}

		addressed.push(temp);
	}

	var modelReference = findModelProperty();
	var keys = Object.keys(modelReference);
	var asArray = [];
	for (var i = 0; i < keys.length; i++) {
		asArray.push([keys[i], keys[i].split('.')]);
	}

	// Get the indexes for input bind
	var specialInput = specialElement.input;
	for (var i = 0; i < specialInput.length; i++) {
		specialInput[i] = $.getSelector(specialInput[i], true);
	}

	// Get the indexes for sf-repeat-this
	var specialRepeat = specialElement.repeat;
	for (var i = 0; i < specialRepeat.length; i++) {
		specialRepeat[i] = $.getSelector(specialRepeat[i], true);
	}

	return {
		html:copy,
		parse:preParsed,
		addresses:addressed,
		modelReference:modelReference,
		modelRef_array:asArray,
		specialElement:specialElement
	};
}

var enclosedHTMLParse = false;
var excludes = {HTML:1,HEAD:1,STYLE:1,LINK:1,META:1,SCRIPT:1,OBJECT:1,IFRAME:1};
self.queuePreprocess = function(targetNode, extracting, collectOther, temp){
	var childNodes = targetNode.childNodes;
	var firstCall = false;

	if(temp === void 0){
		temp = new Set();
		firstCall = true;
		
		var attrs = targetNode.attributes;
		for (var a = 0; a < attrs.length; a++) {
			if(attrs[a].name[0] === '@' || attrs[a].value.indexOf('{{') !== -1){
				temp.add(targetNode);
				break;
			}
		}
	}

	for (var i = childNodes.length - 1; i >= 0; i--) {
		var currentNode = childNodes[i];

		if(excludes[currentNode.nodeName] !== void 0)
			continue;

		if(currentNode.nodeType === 1){ // Tag
			if(enclosedHTMLParse === true)
				continue;

			// Skip nested sf-model
			if(currentNode.tagName === 'SF-M' || currentNode.sf$controlled)
				continue;

			var attrs = currentNode.attributes;

			// Skip element and it's childs that already bound to prevent vulnerability
			if(attrs['sf-bind-list'] !== void 0)
				continue;

			if(attrs['sf-repeat-this'] !== void 0){
				collectOther.repeat.push(currentNode);
				continue;
			}

			if(attrs['sf-into'] !== void 0 || attrs['sf-bind'] !== void 0)
				collectOther.input.push(currentNode);

			// Skip nested component
			if(internal.component[currentNode.tagName] !== void 0)
				continue;

			for (var a = 0; a < attrs.length; a++) {
				if(attrs[a].name[0] === '@' || attrs[a].value.indexOf('{{') !== -1){
					temp.add(currentNode);
					break;
				}
			}

			self.queuePreprocess(currentNode, extracting, collectOther, temp);
		}

		else if(currentNode.nodeType === 3){ // Text
			if(currentNode.textContent.length === 0){
				currentNode.remove();
				continue;
			}

			// The scan is from bottom to first index
			var enclosing = currentNode.textContent.indexOf('{[');
			if(enclosing !== -1)
				enclosedHTMLParse = false;
			else if(enclosedHTMLParse === true)
				continue;

			// Start enclosed if closing pattern was found
			var enclosed = currentNode.textContent.indexOf(']}');
			if(enclosed !== -1 && (enclosing === -1 || enclosing > enclosed)){ // avoid {[ ... ]}
				enclosedHTMLParse = true; // when ]} ... 
				continue;
			}

			if(currentNode.nodeValue.indexOf('{{') !== -1){
				if(extracting === void 0){
					if(!temp.has(currentNode.parentNode))
						temp.add(currentNode.parentNode);
					break;
				}

				if(!temp.has(currentNode))
					temp.add(currentNode);
			}
		}
	}

	if(firstCall)
		return Array.from(temp);
}

self.parsePreprocess = function(nodes, model){
	var binded = [];
	for (var a = 0; a < nodes.length; a++) {
		// Get reference for debugging
		var current = processingElement = nodes[a];

		if(internal.modelPending[model] || self.root[model] === undefined)
			self(model);

		var modelRef = self.root[model];

		if(current.nodeType === 3 && binded.indexOf(current.parentNode) === -1){
			self.bindElement(current.parentNode, model);
			binded.push(current.parentNode);
			continue;
		}

		// Double check if the child element already bound to prevent vulnerability
		if(current.innerHTML.indexOf('sf-bind-list') !== -1 && current.tagName !== 'SF-M'){
			console.error("Can't parse element that already bound");
			console.log(current);
			return;
		}

		if(current.hasAttribute('sf-bind-ignore') === false)
			self.bindElement(current, model);
		else{
			var temp = uniqueDataParser(current.innerHTML, modelRef, false, model);
			current.innerHTML = dataParser(temp, modelRef, false, model);
			var attrs = current.attributes;
			for (var i = 0; i < attrs.length; i++) {
				if(attrs[i].value.indexOf('{{') !== -1){
					var attr = attrs[i];
					attr.value = dataParser(attr.value, modelRef, false, model);
				}
			}
		}
	}
}

function initBindingInformation(modelRef){
	if(modelRef.sf$bindedKey !== void 0)
		return;

	// Element binding data
	Object.defineProperty(modelRef, 'sf$bindedKey', {
		configurable: true,
		enumerable:false,
		writable:true,
		value:{}
	});
}
var repeatedListBinding = internal.model.repeatedListBinding = function(elements, modelRef){
	for (var i = 0; i < elements.length; i++) {
		var element = elements[i];

		if(!element.hasAttribute('sf-repeat-this'))
			continue;

		var script = element.getAttribute('sf-repeat-this');
		element.removeAttribute('sf-repeat-this');

		var refName = script.split(' in ');
		if(refName.length !== 2)
			return console.error("'", script, "' must match the pattern like `item in items`");

		if(modelRef[refName[1]] === void 0)
			modelRef[refName[1]] = [];

		// Enable element binding
		if(modelRef.sf$bindedKey === void 0)
			initBindingInformation(modelRef);

		if(modelRef.sf$bindedKey[refName[1]] === void 0)
			modelRef.sf$bindedKey[refName[1]] = null;

		;(function(){
			var RE = new RepeatedElement(modelRef, element, refName, element.parentNode);
			window.asd = RE;
			Object.defineProperty(modelRef, refName[1], {
				enumerable: true,
				configurable: true,
				get:function(){
					return RE;
				},
				set:function(val){
					if(val.length === 0)
						return RE.splice(0);
					return RE.replace(val, true);
				}
			});
		})();
	}
}

var _double_zero = [0,0]; // For arguments
class RepeatedElement extends Array{
	constructor(modelRef, element, refName, parentNode){
		if(modelRef.constructor === Number)
			return Array(modelRef);

		var list = modelRef[refName[1]];

		super(list.length);

		if(list.length !== 0)
			for (var i = 0; i < list.length; i++) {
				this[i] = list[i];
			}

		list = null;

		var alone = (parentNode.children.length <= 1 || parentNode.textContent.trim().length === 0);

		var callback = modelRef['on$'+refName[1]] || {};
		Object.defineProperty(modelRef, 'on$'+refName[1], {
			enumerable: true,
			configurable: true,
			get:function(){
				return callback;
			},
			set:function(val){
				Object.assign(callback, val);
			}
		});

		var isComponent = internal.component[element.tagName] !== void 0 
			? window['$'+capitalizeLetters(element.tagName.toLowerCase().split('-'))]
			: false;

		var template;
		if(!isComponent){
			element.setAttribute('sf-bind-list', refName[1]);

			// Get reference for debugging
			processingElement = element;
			template = self.extractPreprocess(element, refName[0], modelRef);
		}

		hiddenProperty(this, '$EM', new ElementManipulator());
		this.$EM.template = isComponent || template;
		this.$EM.list = this;
		this.$EM.parentNode = parentNode;
		this.$EM.modelRef = modelRef;
		this.$EM.refName = refName;

		// Update callback
		this.$EM.callback = callback;

		var that = this;
		function injectElements(tempDOM, beforeChild){
			for (var i = 0; i < that.length; i++) {
				if(isComponent){
					var elem = new isComponent(that[i]);
					// elem.setAttribute('sf-bind-list', refName[1]);
				}
				else{
					var elem = templateParser(template, that[i], false, that.modelRef);
					syntheticCache(elem, template, that[i]);
				}

				if(beforeChild === void 0)
					tempDOM.appendChild(elem);
				else{
					that.$EM.elements.push(elem);
					tempDOM.insertBefore(elem, beforeChild);
				}
			}
		}

		if(parentNode.classList.contains('sf-virtual-list')){
			var ceiling = document.createElement(element.tagName);
			ceiling.classList.add('virtual-spacer');
			var floor = ceiling.cloneNode(true);

			ceiling.classList.add('ceiling');
			parentNode.insertBefore(ceiling, parentNode.firstElementChild); // prepend

			floor.classList.add('floor');
			parentNode.appendChild(floor); // append

			hiddenProperty(this, '$virtual', {});

			if(!alone)
				console.warn("Virtual list was initialized when the container has another child that was not sf-repeated element.", parentNode);

			var tempDOM = document.createElement('div');
			injectElements(tempDOM);

			// Transfer virtual DOM
			this.$virtual.dom = tempDOM;
			this.$virtual.callback = callback;

			// Put the html example for obtaining it's size
			parentNode.replaceChild(template.html, parentNode.children[1]);
			internal.virtual_scroll.handle(this, parentNode);
			template.html.remove(); // And remove it
		}
		else if(alone){
			// Output to real DOM if not being used for virtual list
			injectElements(parentNode);
			this.$EM.parentChilds = parentNode.children;
		}
		else{
			this.$EM.bound_end = document.createComment('');
			this.$EM.bound_start = document.createComment('');

			parentNode.insertBefore(this.$EM.bound_start, element);
			parentNode.insertBefore(this.$EM.bound_end, element);

			this.$EM.elements = Array(this.length);

			// Output to real DOM if not being used for virtual list
			injectElements(parentNode, this.$EM.bound_end);
		}

		element.remove();

		// Wait for scroll plugin initialization
		setTimeout(function(){
			var scroller = internal.findScrollerElement(parentNode);
			if(scroller === null) return;

			var computed = getComputedStyle(scroller);
			if(computed.backfaceVisibility === 'hidden' || computed.overflow.indexOf('hidden') !== -1)
				return;

			scroller.classList.add('sf-scroll-element');
			internal.addScrollerStyle();
		}, 1000);

		// Todo: Enable auto item binding
	}

	pop(){
		this.$EM.remove(this.length);
		Array.prototype.pop.apply(this, arguments);
	}

	push(){
		var lastLength = this.length;
		this.length += arguments.length;

		var n = 0;
		for (var i = lastLength; i < this.length; i++) {
			this[i] = arguments[n++];
		}

		if(arguments.length === 1)
			this.$EM.append(lastLength);
		else{
			for (var i = 0; i < arguments.length; i++) {
				this.$EM.append(lastLength + i);
			}
		}
	}

	splice(){
		if(arguments[0] === 0 && arguments[1] === void 0){
			this.$EM.clear(0);
			this.length = 0;
			return;
		}

		var lastLength = this.length;
		Array.prototype.splice.apply(this, arguments);

		// Removing data
		var real = arguments[0];
		if(real < 0) real = lastLength + real;

		var limit = arguments[1];
		if(!limit && limit !== 0) limit = this.length;

		for (var i = limit - 1; i >= 0; i--) {
			this.$EM.remove(real + i);
		}

		if(this.$virtual && this.$virtual.DOMCursor >= real)
			this.$virtual.DOMCursor = real - limit;

		if(arguments.length >= 3){ // Inserting data
			limit = arguments.length - 2;

			// Trim the index if more than length
			if(real >= this.length)
				real = this.length - 1;

			for (var i = 0; i < limit; i++) {
				this.$EM.insertAfter(real + i);
			}

			if(this.$virtual && this.$virtual.DOMCursor >= real)
				this.$virtual.DOMCursor += limit;
		}
	}

	shift(){
		Array.prototype.shift.apply(this, arguments);

		this.$EM.remove(0);
		if(this.$virtual && this.$virtual.DOMCursor > 0){
			this.$virtual.DOMCursor--;
			this.$virtual.reinitCursor();
		}
	}

	unshift(){
		Array.prototype.unshift.apply(this, arguments);

		if(arguments.length === 1)
			this.$EM.prepend(0);
		else{
			for (var i = arguments.length - 1; i >= 0; i--) {
				this.$EM.prepend(i);
			}
		}

		if(this.$virtual && this.$virtual.DOMCursor !== 0){
			this.$virtual.DOMCursor += arguments.length;
			this.$virtual.reinitCursor();
		}
	}

	replace(newList, atMiddle){
		var lastLength = this.length;

		if(this.$virtual)
			this.$virtual.resetViewport();

		// Check if item has same reference
		if(newList.length >= lastLength && lastLength !== 0){
			var matchLeft = lastLength;

			for (var i = 0; i < lastLength; i++) {
				if(newList[i] === this[i]){
					matchLeft--;
					continue;
				}
				break;
			}

			// Add new element at the end
			if(matchLeft === 0){
				if(newList.length === lastLength) return;

				var temp = newList.slice(lastLength);
				temp.unshift(lastLength, 0);
				this.splice.apply(this, temp);
				return;
			}

			// Add new element at the middle
			else if(matchLeft !== lastLength){
				if(atMiddle === true){
					var temp = newList.slice(i);
					temp.unshift(i, lastLength - i);
					Array.prototype.splice.apply(this, temp);

					this.refresh(i, lastLength);
				}
				return;
			}
		}

		// Build from zero
		if(lastLength === 0){
			Array.prototype.push.apply(this, arguments[0]);
			this.$EM.hardRefresh(0);
			return;
		}

		// Clear all items and merge the new one
		var temp = [0, lastLength];
		Array.prototype.push.apply(temp, arguments[0]);
		Array.prototype.splice.apply(this, temp);

		// Rebuild all element
		if(arguments[1] !== true){
			this.$EM.clear(0);
			this.$EM.hardRefresh(0);
		}

		// Reuse some element
		else{
			// Clear unused element if current array < last array
			if(this.length < lastLength)
				this.$EM.removeRange(this.length, lastLength);

			// And start refreshing
			this.refresh(0, this.length);

			if(this.$virtual && this.$virtual.refreshVirtualSpacer)
				this.$virtual.refreshVirtualSpacer(this.$virtual.DOMCursor);
		}

		// Reset virtual this
		if(this.$virtual)
			this.$virtual.reset();

		return this;
	}

	swap(i, o){
		if(i === o) return;
		this.$EM.swap(i, o);
		var temp = this[i];
		this[i] = this[o];
		this[o] = temp;
	}

	move(from, to, count){
		if(from === to) return;

		if(count === void 0)
			count = 1;

		this.$EM.move(from, to, count);

		var temp = Array.prototype.splice.apply(this, [from, count]);
		temp.unshift(to, 0);
		Array.prototype.splice.apply(this, temp);

		// Reset virtual ceiling and floor
		if(this.$virtual)
			this.$virtual.reinitCursor();
	}

	getElement(index){
		if(this.$virtual){
			var virtualChilds = this.$virtual.dom.children;

			if(index >= this.$virtual.DOMCursor) {
				index -= this.$virtual.DOMCursor;
				var childElement = this.$EM.parentNode.childElementCount - 2;

				if(index < childElement)
					return this.$EM.parentNode.children[index + 1];
				else
					return virtualChilds[index - childElement + this.$virtual.DOMCursor];
			}

			return virtualChilds[index];
		}

		if(this.$EM.elements)
			return this.$EM.elements[index];

		return this.$EM.parentChilds[index];
	}

	refresh(index, length, property){
		if(index === void 0 || index.constructor === String){
			property = index;
			index = 0;
			length = this.length;
		}
		else if(length === void 0) length = index + 1;
		else if(length.constructor === String){
			property = length;
			length = index + 1;
		}
		else if(length < 0) length = this.length + length;
		else length += index;

		// Trim length
		var overflow = this.length - length;
		if(overflow < 0) length = length + overflow;

		for (var i = index; i < length; i++) {
			var elem = this.getElement(i);

			// Create element if not exist
			if(elem === void 0){
				this.$EM.hardRefresh(i || 0);

				if(this.$virtual)
					this.$virtual.DOMCursor = i || 0;
				break;
			}
			else if(syntheticTemplate(elem, this.$EM.template, property, this[i]) === false)
				continue; // Continue if no update

			if(elem.model !== this[i])
				elem.model = this[i];

			if(this.$EM.callback.update)
				this.$EM.callback.update(elem, 'replace');
		}
	}

	hardRefresh(i, o){
		this.$EM.update(i, o);

		if(this.$virtual && this.$virtual.DOMCursor)
			this.$virtual.reinitCursor();
	}
}

class ElementManipulator{
	createElement(index){
		var item = this.list[index];
		if(item === void 0) return;

		var template = this.template;

		if(template.constructor === Function)
			return new template(item);
		else{
			var temp = templateParser(template, item, false, this.modelRef);
			syntheticCache(temp, template, item);
			return temp;
		}
	}

	virtualRefresh(){
		var that = this;

		clearTimeout(this.refreshTimer);
		this.refreshTimer = setTimeout(function(){
			if(that.list.$virtual) // Somewhat it's uninitialized
				that.list.$virtual.reinitScroll();
		}, 100);

		return this.list.$virtual.elements();
	}

	// Recreate the item element after the index
	hardRefresh(index){
		var list = this.list;
		var isComponent = this.template.constructor === Function;

		if(list.$virtual){
			var vStartRange = list.$virtual.DOMCursor;
			var vEndRange = vStartRange + list.$virtual.preparedLength;
		}

		var exist = this.parentChilds || this.elements || this.virtualRefresh();

		// Clear siblings after the index
		for (var i = index; i < exist.length; i++) {
			exist[i].remove();
		}

		if(list.$virtual)
			var vCursor = list.$virtual.vCursor;

		for (var i = index; i < list.length; i++) {
			if(isComponent){
				var temp = new this.template(list[i]);
			}
			else{
				var temp = templateParser(this.template, list[i], false, this.modelRef);
				syntheticCache(temp, this.template, list[i]);
			}
			
			if(this.list.$virtual){
				if(vCursor.floor === null && i < vEndRange)
					this.parentNode.insertBefore(temp, this.parentNode.lastElementChild);
				else list.$virtual.dom.appendChild(temp);
			}
			else this.parentNode.appendChild(temp);
		}

		if(list.$virtual && list.$virtual.refreshVirtualSpacer)
			list.$virtual.refreshVirtualSpacer(list.$virtual.DOMCursor);
	}

	move(from, to, count){
		if(this.list.$virtual){
			var vStartRange = this.list.$virtual.DOMCursor;
			var vEndRange = vStartRange + this.list.$virtual.preparedLength;
		}

		var exist = this.parentChilds || this.elements || this.virtualRefresh();

		var overflow = this.list.length - from - count;
		if(overflow < 0)
			count += overflow;

		// Move to virtual DOM
		var vDOM = document.createElement('div');
		for (var i = 0; i < count; i++) {
			vDOM.appendChild(exist[from + i]);
		}

		var nextSibling = exist[to] || null;
		var theParent = nextSibling && nextSibling.parentNode;

		if(theParent === false){
			if(this.list.$virtual && this.list.length >= vEndRange)
				theParent = this.list.$virtual.dom;
			else theParent = parentNode;
		}

		// Move to defined index
		for (var i = 0; i < count; i++) {
			theParent.insertBefore(vDOM.firstElementChild, nextSibling);

			if(this.callback.update)
				this.callback.update(exist[from + i], 'move');
		}
	}

	swap(index, other){
		var exist = this.parentChilds || this.elements || this.virtualRefresh();

		if(index > other){
			var index_a = exist[other];
			other = exist[index];
			index = index_a;
		} else {
			index = exist[index];
			other = exist[other];
		}

		var other_sibling = other.nextSibling;
		var other_parent = other.parentNode;
		index.parentNode.insertBefore(other, index.nextSibling);
		other_parent.insertBefore(index, other_sibling);

		if(this.callback.update){
			this.callback.update(exist[other], 'swap');
			this.callback.update(exist[index], 'swap');
		}
	}

	remove(index){
		var exist = this.parentChilds || this.elements || this.virtualRefresh();

		if(exist[index]){
			var currentEl = exist[index];

			if(this.callback.remove){
				var currentRemoved = false;
				var startRemove = function(){
					if(currentRemoved) return;
					currentRemoved = true;

					currentEl.remove();
				};

				// Auto remove if return false
				if(!this.callback.remove(currentEl, startRemove))
					startRemove();
			}

			// Auto remove if no callback
			else currentEl.remove();
		}
	}

	update(index, other){
		var exist = this.parentChilds || this.elements || this.virtualRefresh();
		var list = this.list;
		var template = this.template;
		var isComponent = template.constructor === Function;

		if(index === void 0){
			index = 0;
			other = list.length;
		}
		else if(other === void 0) other = index + 1;
		else if(other < 0) other = list.length + other;
		else other += index;

		// Trim length
		var overflow = list.length - other;
		if(overflow < 0) other = other + overflow;

		for (var i = index; i < other; i++) {
			var oldChild = exist[i];
			if(oldChild === void 0 || list[i] === void 0)
				break;

			if(isComponent){
				var temp = new template(list[i]);
			}
			else{
				var temp = templateParser(template, list[i], false, this.modelRef);
				syntheticCache(temp, template, list[i]);
			}

			if(this.list.$virtual){
				oldChild.parentNode.replaceChild(temp, oldChild);
				continue;
			}

			this.parentNode.replaceChild(temp, oldChild);
			if(this.callback.update)
				this.callback.update(temp, 'replace');
		}
	}

	removeRange(index, other){
		var exist = this.parentChilds || this.elements || this.virtualRefresh();

		for (var i = index; i < other; i++) {
			exist[i].remove();
		}
	}

	clear(){
		var parentNode = this.parentNode;

		if(this.list.$virtual)
			var spacer = [parentNode.firstElementChild, parentNode.lastElementChild];

		parentNode.textContent = '';

		if(this.list.$virtual){
			parentNode.appendChild(spacer[0]);
			parentNode.appendChild(spacer[1]);

			this.list.$virtual.dom.textContent = '';

			spacer[1].style.height = 
			spacer[0].style.height = 0;

			this.list.$virtual.reset(true);
		}
	}

	insertAfter(index){
		var exist = this.parentChilds || this.elements || this.virtualRefresh();
		var temp = this.createElement(index);

		if(exist.length === 0)
			this.parentNode.insertBefore(temp, this.parentNode.lastElementChild);
		else{
			var referenceNode = exist[index - 1];
			referenceNode.parentNode.insertBefore(temp, referenceNode.nextSibling);
		}

		if(this.callback.create)
			this.callback.create(temp);
	}

	prepend(index){
		var exist = this.parentChilds || this.elements || this.virtualRefresh();
		var temp = this.createElement(index);

		var referenceNode = exist[0];
		if(referenceNode !== void 0){
			referenceNode.parentNode.insertBefore(temp, referenceNode);

			if(this.callback.create)
				this.callback.create(temp);
		}
		else this.parentNode.insertBefore(temp, this.parentNode.lastElementChild);
	}

	append(index){
		var list = this.list;

		if(list.$virtual){
			var vStartRange = list.$virtual.DOMCursor;
			var vEndRange = vStartRange + list.$virtual.preparedLength;
		}

		var exist = this.parentChilds || this.elements || this.virtualRefresh();
		var temp = this.createElement(index);

		if(list.$virtual){
			if(index === 0) // Add before virtual scroller
				this.parentNode.insertBefore(temp, this.parentNode.lastElementChild);
			else if(index >= vEndRange){ // To virtual DOM
				if(list.$virtual.vCursor.floor === null)
					list.$virtual.vCursor.floor = temp;

				list.$virtual.dom.appendChild(temp);
			}
			else // To real DOM
				exist[index-1].insertAdjacentElement('afterEnd', temp);

			if(this.callback.create)
				this.callback.create(temp);
			return;
		}

		this.parentNode.appendChild(temp);
		if(this.callback.create)
			this.callback.create(temp);
	}

	// Deprecated?
	replace(index){
		var list = this.list;
		var elRef = list.getElement(index).sf$elementReferences;
		var process = template.modelReference[key];

		if(process === void 0){
			console.error("Can't found binding for '"+key+"'");
			return;
		}

		for (var i = 0; i < elRef.length; i++) {
			if(elRef[i].textContent === void 0 || elRef[i].ref.direct === void 0)
				continue;

			if(process.indexOf(elRef[i].ref.direct) !== -1){
				var ref = elRef[i].textContent;
				var content = $.escapeText(list[index][key]).replace(needle, func);

				// Skip if nothing was changed
				if(list[index][key] === content) continue;
				ref.textContent = ''; // Let this empty for later referencing
				ref.sf$haveChilds = true;
				content = $.parseElement(content, true);

				// Remove old element if exist
				while(ref.previousSibling && ref.previousSibling.sf$childRoot === ref){
					ref.previousSibling.remove();
				}

				var parentNode_ = ref.parentNode;
				for (var i = 0; i < content.length; i++) {
					content[i].sf$childRoot = ref;
					parentNode_.insertBefore(content[i], ref);
				}
			}
		}
	}
}
function elseIfHandle(else_, scopes){
	var elseIf = else_.elseIf;

	// Else if
	for (var i = 0; i < elseIf.length; i++) {
		// Check the condition
		if(!elseIf[i][0].apply(self.root, scopes))
			continue;

		// Get the value
		return elseIf[i][1].apply(self.root, scopes);
	}

	// Else
	if(else_.elseValue === null)
		return '';

	return else_.elseValue.apply(self.root, scopes);
}

// ==== Template parser ====
var templateParser_regex = /{{%=([0-9]+)/gm;
var REF_DIRECT = 0, REF_IF = 1, REF_EXEC = 2;
var templateExec = function(parse, item, atIndex){
	var parsed = {};
	var temp = null;

	// Get or evaluate static or dynamic data
	for (var i = 0; i < parse.length; i++) {
		if(atIndex !== void 0 && atIndex.indexOf(i) === -1)
			continue;

		var ref = parse[i];
		ref.data[0] = item;

		// Direct evaluation type
		if(ref.type === REF_DIRECT){
			temp = ref.get.apply(self.root, ref.data);
			if(temp === void 0)
				temp = '';
			else{
				if(temp.constructor === Object)
					temp = JSON.stringify(temp);
				if(temp.constructor !== String)
					temp = String(temp);
			}

			parsed[i] = {type:ref.type, data:temp};
			continue;
		}

		if(ref.type === REF_EXEC){
			parsed[i] = {type:ref.type, data:ref.get.apply(self.root, ref.data)};
			continue;
		}

		// Conditional type
		if(ref.type === REF_IF){
			var scopes = ref.data;
			parsed[i] = {type:ref.type, data:''};

			// If condition was not meet
			if(!ref.if[0].apply(self.root, scopes)){
				parsed[i].data = elseIfHandle(ref, scopes);
				continue;
			}

			parsed[i].data = ref.if[1].apply(self.root, scopes);
		}
	}
	return parsed;
}

var templateParser = internal.model.templateParser = function(template, item, original, modelRef){
	processingElement = template.html;

	var html = original === true ? template.html : template.html.cloneNode(true);
	var addresses = template.addresses;
	var parsed = templateExec(template.parse, item);

	var changesReference = [];
	var pendingInsert = [];

	// Find element where the data belongs to
	for (var i = 0; i < addresses.length; i++) {
		var ref = addresses[i];
		var current = $.childIndexes(ref.address, html);

		// Modify element attributes
		if(ref.nodeType === 1){
			var refA = ref.attributes;
			for(var a = 0; a < refA.length; a++){
				var refB = refA[a];

				// Pass to event handler
				if(refB.event){
					eventHandler(current, refB, modelRef || item);
					continue;
				}

				var isValueInput = (refB.name === 'value' && (current.tagName === 'TEXTAREA' ||
					(current.tagName === 'INPUT' && /checkbox|radio|hidden/.test(current.type) === false)
				));

				changesReference.push({
					attribute:isValueInput === true ? current : current.attributes[refB.name],
					ref:refB
				});

				if(refB.direct !== void 0){
					if(refB.name === 'value' && isValueInput === true){
						current.value = parsed[refB.direct].data;
						current.removeAttribute('value');
						continue;
					}
					current.setAttribute(refB.name, parsed[refB.direct].data);
					continue;
				}

				// Below is used for multiple data
				if(refB.name === 'value' && isValueInput === true){
					var temp = current.value;
					current.removeAttribute('value');
					current.value = temp;
					current.value = current.value.replace(templateParser_regex, function(full, match){
						return parsed[match].data;
					});
				}
				else{
					current.setAttribute(refB.name, (refB.value || current.value).replace(templateParser_regex, function(full, match){
						return parsed[match].data;
					}));
				}
			}
			continue;
		}

		// Replace text node
		if(ref.nodeType === 3){
			var refA = current;

			changesReference.push({
				textContent:refA,
				ref:ref
			});

			if(ref.direct !== void 0){
				refA.textContent = parsed[ref.direct].data;
				continue;
			}

			// Below is used for multiple/dynamic data
			refA.textContent = refA.textContent.replace(templateParser_regex, function(full, match){
				return parsed[match].data;
			});
		}

		// Replace dynamic node
		if(ref.nodeType === -1){
			var cRef = {
				dynamicFlag:current,
				direct:ref.parse_index,
				parentNode:current.parentNode,
				startFlag:ref.startFlag && $.childIndexes(ref.startFlag, html)
			};
			changesReference.push(cRef);

			// Pending element insert to take other element reference
			pendingInsert.push(cRef);
		}
	}

	// Save model item reference to node
	html.model = item;

	// Save reference to element
	html.sf$elementReferences = changesReference;
	// html.sf$modelParsed = parsed;

	// Run the pending element
	for (var i = 0; i < pendingInsert.length; i++) {
		var ref = pendingInsert[i];
		var tDOM = parsed[ref.direct].data;

		// Check if it's an HTMLElement
		if(tDOM.onclick !== void 0){
			ref.parentNode.insertBefore(tDOM, ref.dynamicFlag);
			continue;
		}

		tDOM = $.parseElement(parsed[ref.direct].data, true);
		for (var a = 0; a < tDOM.length; a++) {
			ref.parentNode.insertBefore(tDOM[a], ref.dynamicFlag);
		}
	}

	if(template.specialElement.input.length !== 0){
		// Process element for input bind
		var specialInput = template.specialElement.input;
		var specialInput_ = [];
		for (var i = 0; i < specialInput.length; i++) {
			specialInput_.push($.childIndexes(specialInput[i], html));
		}

		bindInput(specialInput_, item);
	}

	if(template.specialElement.repeat.length !== 0){
		// Process element for sf-repeat-this
		var specialRepeat = template.specialElement.repeat;
		var specialRepeat_ = [];
		for (var i = 0; i < specialRepeat.length; i++) {
			specialRepeat_.push($.childIndexes(specialRepeat[i], html));
		}

		repeatedListBinding(specialRepeat_, item);
	}

	return html;
}

function syntheticCache(element, template, item){
	if(element.sf$cache === void 0)
		element.sf$cache = {};

	var cache = element.sf$cache;
	var modelRef_array = template.modelRef_array;

	for (var i = 0; i < modelRef_array.length; i++) {
		var ref = modelRef_array[i];
		cache[ref[0]] = deepProperty(item, ref[1]);
	}
}

function syntheticTemplate(element, template, property, item){
	var cache = element.sf$cache;
	var modelRef_array = template.modelRef_array;

	if(property !== void 0){
		var changes = template.modelReference[property];
		if(changes === void 0 || changes.length === 0){
			console.log(element, template, property, item);
			console.error("Failed to run syntheticTemplate because property '"+property+"' is not observed");
			return false;
		}

		if(cache)
			for (var i = 0; i < modelRef_array.length; i++) {
				var ref = modelRef_array[i];
				if(ref[0] !== property) continue;

				var newData = deepProperty(item, ref[1]);

				// Check if data was different
				if(cache[ref[0]] !== newData)
					cache[ref[0]] = newData;
			}
	}
	else{
		var changes = [];
		for (var i = 0; i < modelRef_array.length; i++) {
			var ref = modelRef_array[i];
			if(cache === void 0){
				Array.prototype.push.apply(changes, template.modelReference[ref[0]]);
				continue;
			}
			var newData = deepProperty(item, ref[1]);

			// Check if data was different
			if(cache[ref[0]] !== newData){
				Array.prototype.push.apply(changes, template.modelReference[ref[0]]);
				cache[ref[0]] = newData;
			}
		}

		if(changes.length === 0) return false;
	}

	// console.log(542, template.parse, item);

	var parsed = templateExec(template.parse, item, changes);
	function checkRelatedChanges(parseIndex){
		var found = false;
		for (var i = 0; i < parseIndex.length; i++) {
			if(changes.indexOf(parseIndex[i]) !== -1){
				found = true;
				break;
			}
		}
		if(found === false)
			return false;

		// Prepare all required data
		var changes_ = [];
		for (var i = 0; i < parseIndex.length; i++) {
			if(parsed[parseIndex[i]] === void 0)
				changes_.push(parseIndex[i]);
		}

		Object.assign(parsed, templateExec(template.parse, item, changes_));
		return true;
	}

	var changesReference = element.sf$elementReferences;
	var haveChanges = false;
	for (var i = 0; i < changesReference.length; i++) {
		var cRef = changesReference[i];

		if(cRef.dynamicFlag !== void 0){ // Dynamic data
			if(parsed[cRef.direct] !== void 0){
				var tDOM = $.parseElement(parsed[cRef.direct].data, true).reverse();
				var currentDOM = $.prevAll(cRef.dynamicFlag, cRef.startFlag);
				var notExist = false;

				// Replace if exist, skip if similar
				for (var a = 0; a < tDOM.length; a++) {
					if(currentDOM[a] === void 0){
						notExist = true;
						break;
					}
					if(currentDOM[a].isEqualNode(tDOM[a]) === false)
						cRef.parentNode.replaceChild(tDOM[a], currentDOM[a]);
				}

				// Add if not exist
				if(notExist){
					for (var a = tDOM.length - 1; a >= 0; a--)
						cRef.parentNode.insertBefore(tDOM[a], cRef.dynamicFlag);
				}

				// Remove if over index
				else{
					for (var a = tDOM.length; a < currentDOM.length; a++) {
						currentDOM[a].remove();
					}
				}

				haveChanges = true;
			}
			continue;
		}

		if(cRef.textContent !== void 0){ // Text only
			if(cRef.ref.parse_index !== void 0){ // Multiple
				if(checkRelatedChanges(cRef.ref.parse_index) === true){
					var temp = cRef.ref.value.replace(templateParser_regex, function(full, match){
						return parsed[match].data;
					});

					if(cRef.textContent.textContent === temp) continue;
					cRef.textContent.textContent = temp;

					haveChanges = true;
				}
				continue;
			}

			// Direct value
			if(parsed[cRef.ref.direct]){
				var value = parsed[cRef.ref.direct].data;
				if(cRef.textContent.textContent === value) continue;

				var ref_ = cRef.textContent;
				// Remove old element if exist
				if(ref_.sf$haveChilds === true){
					while(ref_.previousSibling && ref_.previousSibling.sf$childRoot === ref_){
						ref_.previousSibling.remove();
					}
				}

				// if(item['each$'+])
				ref_.textContent = value;
			}
			continue;
		}

		if(cRef.attribute !== void 0){ // Attributes
			if(cRef.ref.parse_index !== void 0){ // Multiple
				if(checkRelatedChanges(cRef.ref.parse_index) === true){
					var temp = cRef.ref.value.replace(templateParser_regex, function(full, match){
						return parsed[match].data;
					});

					if(cRef.attribute.value === temp) continue;
					cRef.attribute.value = temp;

					haveChanges = true;
				}
				continue;
			}

			// Direct value
			if(parsed[cRef.ref.direct]){
				var value = parsed[cRef.ref.direct].data;
				if(cRef.attribute.value == value) continue;
				cRef.attribute.value = value;

				haveChanges = true;
			}
		}
	}

	return haveChanges;
}
})();
sf.API = function(method, url, data, success, complete, accessToken, getXHR){
	var type = typeof data;
	if(type !== 'object' && type !== 'function')
		data = {};

	var req = {
		url:url,
		dataType:'json',
		method:'POST',
		success:function(obj){
			if(!sf.API.onSuccess(obj) && success)
				success(obj, url);

			if(complete) complete(200);
		},
		error:function(data, status){
			try{
				data = JSON.parse(data.response);
			}catch(e){}

			sf.API.onError(status, data)
			if(complete) complete(status, data);
		},
	};

	if(data.constructor !== FormData)
		req.contentType = "application/json";

	if(data.constructor === Function){
		complete = success;
		success = data;
		data = {};
	}

	data._method = method.toUpperCase();

	if(accessToken){
		req.beforeSend = function(xhr){
		    xhr.setRequestHeader('X-Authorization', 'Bearer '+accessToken);
		    getXHR && getXHR(xhr);
		}
	}
	else if(getXHR !== void 0)
		req.beforeSend = getXHR;
	
	req.data = data;
	return sf.ajax(req);
}

sf.API.onError = function(status, data){};
sf.API.onSuccess = function(obj){};

var extendsAPI = {
	get:function(url, data, success, complete){
		return sf.API('get', this.url+url, data, success, complete, this.accessToken);
	},
	post:function(url, data, success, complete){
		return sf.API('post', this.url+url, data, success, complete, this.accessToken);
	},
	delete:function(url, data, success, complete){
		return sf.API('delete', this.url+url, data, success, complete, this.accessToken);
	},
	put:function(url, data, success, complete){
		return sf.API('put', this.url+url, data, success, complete, this.accessToken);
	},
	upload:function(url, formData, success, complete, progress){
		if(formData.constructor !== FormData)
			return console.error("Parameter 2 must be a FormData");

		var getXHR = void 0;
		if(progress !== void 0){
			getXHR = function(xhr){
				xhr.upload.onprogress = function(ev){
	            	if(ev.lengthComputable)
	            	    progress(ev.loaded, ev.total);
	            }
			}
		}

		return sf.API('post', this.url+url, formData, success, complete, this.accessToken, getXHR);
	},
};

sf.API.instance = function(url){
	var self = this;
	self.url = url;
	self.accessToken = false;

	Object.assign(this, extendsAPI);
}
// DOM Controller on loaded app
sf.controller = new function(){
	var self = this;
	self.pending = {};
	self.active = {};

	internal.controller = {
		pending:[]
	};

	self.for = function(name, func){
		if(sf.component.registered[name]){
			sf.component.registered[name][1] = func;
			return;
		}
		
		if(self.active[name])
			return func();

		self.pending[name] = func;
	}

	self.modelScope = function(element, func){
		var model = sf.controller.modelName(element);

		if(!model)
			throw 'model or controller was not found';

		var bindedList = element.getAttribute('sf-bind-list');
		if(!bindedList){
			var parentEl = $.parent(element, '[sf-bind-list]');
			if(parentEl !== null)
				bindedList = parentEl.getAttribute('sf-bind-list');
		}
		else var parentEl = element;

		if(!bindedList){
			if(func) return func(sf.model.root[model], -1);
			else return sf.model.root[model];
		}

		// Find index
		var bindedListIndex = 0;
		if(bindedList)
			bindedListIndex = $.prevAll(parentEl, '[sf-bind-list]').length;

		if(func) return func(sf.model.root[model][bindedList], bindedListIndex);
		else return sf.model.root[model][bindedList][bindedListIndex];
	}

	self.modelElement = function(element){
		if(element.nodeType === 1 && element.sf$controlled !== void 0)
			return element;

		return $.parentHasProperty(element, 'sf$controlled');
	}

	self.modelName = function(element){
		var name = self.modelElement(element);
		if(name === null){
			console.error("Can't find any controller for", element);
			return;
		}

		name = name.sf$controlled;

		// Initialize it first
		if(name !== void 0 && !self.active[name])
			self.run(name);

		return name;
	}

	self.run = function(name, func){
		if(sf.component.registered[name])
			return console.error("'"+name+"' is registered as a component");

		if(self.pending[name]){
			if(!sf.model.root[name])
				sf.model.root[name] = {};

			self.pending[name](sf.model.root[name], root_);
			self.active[name] = true;
			delete self.pending[name];

			var i = internal.controller.pending.indexOf(name);
			if(i !== -1)
				internal.controller.pending.splice(i, 1);
		}

		if(sf.model.root[name] === void 0)
			sf.model.root[name] = {};

		if(func)
			func(sf.model.root[name], root_);
	}

	self.init = function(parent){
		if(!sf.loader.DOMWasLoaded){
			return sf(function(){
				self.init(parent);
			});}

		var temp = $('[sf-controller]', parent || document.body);
		for (var i = 0; i < temp.length; i++) {
			self.run(temp[i].sf$controlled);
		}
	}
}

var root_ = function(scope){
	if(sf.component.registered[scope]){
		var available = [];
		var component = sf.component.available[scope];
		if(component !== void 0){
			for (var i = 0; i < component.length; i++) {
				available.push(sf.model.root[component[i]]);
			}
		}
		return available;
	}

	if(!sf.model.root[scope]){
		var scope_ = sf.model.root[scope] = {};

		if(internal.modelPending[scope] !== void 0){
			var ref = internal.modelPending[scope];
			for (var a = 0; a < ref.length; a++) {
				ref[a](scope_, root_);
			}

			delete internal.modelPending[scope];
		}
	}

	return sf.model.root[scope];
}
/*
  Special Thanks to Vladimir Kharlampidi
  https://github.com/nolimits4web/
*/

var globals = {};
var jsonpRequests = 0;
function Request(requestOptions) {
    var globalsNoCallbacks = Object.assign({}, globals);
    ('beforeCreate beforeOpen beforeSend error complete success statusCode').split(' ').forEach(function (callbackName) {
        delete globalsNoCallbacks[callbackName];
    });
    var defaults = Object.assign({
        url: window.location.toString(),
        method: 'GET',
        data: false,
        async: true,
        cache: true,
        user: '',
        password: '',
        headers: {},
        xhrFields: {},
        statusCode: {},
        processData: true,
        dataType: 'text',
        contentType: 'application/x-www-form-urlencoded',
        timeout: 0,
    }, globalsNoCallbacks);
    var options = Object.assign({}, defaults, requestOptions);
    var proceedRequest;
    // Function to run XHR callbacks and events
    function fireCallback(callbackName) {
        var data = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            data[_i - 1] = arguments[_i];
        }
        /*
          Callbacks:
          beforeCreate (options),
          beforeOpen (xhr, options),
          beforeSend (xhr, options),
          error (xhr, status),
          complete (xhr, stautus),
          success (response, status, xhr),
          statusCode ()
        */
        var globalCallbackValue;
        var optionCallbackValue;
        if (globals[callbackName]) {
            globalCallbackValue = globals[callbackName].apply(globals, data);
        }
        if (options[callbackName]) {
            optionCallbackValue = options[callbackName].apply(options, data);
        }
        if (typeof globalCallbackValue !== 'boolean')
            globalCallbackValue = true;
        if (typeof optionCallbackValue !== 'boolean')
            optionCallbackValue = true;
        return (globalCallbackValue && optionCallbackValue);
    }
    // Before create callback
    proceedRequest = fireCallback('beforeCreate', options);
    if (proceedRequest === false)
        return void 0;
    // For jQuery guys
    if (options.type)
        options.method = options.type;
    // Parameters Prefix
    var paramsPrefix = options.url.indexOf('?') >= 0 ? '&' : '?';
    // UC method
    var method = options.method.toUpperCase();
    // Data to modify GET URL
    if ((method === 'GET' || method === 'HEAD' || method === 'OPTIONS' || method === 'DELETE') && options.data) {
        var stringData = void 0;
        if (typeof options.data === 'string') {
            // Should be key=value string
            if (options.data.indexOf('?') >= 0)
                stringData = options.data.split('?')[1];
            else
                stringData = options.data;
        }
        else {
            // Should be key=value object
            stringData = serializeQuery(options.data);
        }
        if (stringData.length) {
            options.url += paramsPrefix + stringData;
            if (paramsPrefix === '?')
                paramsPrefix = '&';
        }
    }
    // JSONP
    if (options.dataType === 'json' && options.url.indexOf('callback=') >= 0) {
        var callbackName_1 = "jsonp_" + (Date.now() + ((jsonpRequests += 1)));
        var abortTimeout_1;
        var callbackSplit = options.url.split('callback=');
        var requestUrl = callbackSplit[0] + "callback=" + callbackName_1;
        if (callbackSplit[1].indexOf('&') >= 0) {
            var addVars = callbackSplit[1].split('&').filter(function (el) { return el.indexOf('=') > 0; }).join('&');
            if (addVars.length > 0)
                requestUrl += "&" + addVars;
        }
        // Create script
        var script_1 = document.createElement('script');
        script_1.type = 'text/javascript';
        script_1.onerror = function onerror() {
            clearTimeout(abortTimeout_1);
            fireCallback('error', null, 'scripterror');
            fireCallback('complete', null, 'scripterror');
        };
        script_1.src = requestUrl;
        // Handler
        window[callbackName_1] = function jsonpCallback(data) {
            clearTimeout(abortTimeout_1);
            fireCallback('success', data);
            script_1.parentNode.removeChild(script_1);
            script_1 = null;
            delete window[callbackName_1];
        };
        document.head.appendChild(script_1);
        if (options.timeout > 0) {
            abortTimeout_1 = setTimeout(function () {
                script_1.parentNode.removeChild(script_1);
                script_1 = null;
                fireCallback('error', null, 'timeout');
            }, options.timeout);
        }
        return void 0;
    }
    // Cache for GET/HEAD requests
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS' || method === 'DELETE') {
        if (options.cache === false) {
            options.url += paramsPrefix + "_nocache" + Date.now();
        }
    }
    // Create XHR
    var xhr = new XMLHttpRequest();
    // Save Request URL
    xhr.requestUrl = options.url;
    xhr.requestParameters = options;
    // Before open callback
    proceedRequest = fireCallback('beforeOpen', xhr, options);
    if (proceedRequest === false)
        return xhr;
    // Open XHR
    xhr.open(method, options.url, options.async, options.user, options.password);
    // Create POST Data
    var postData = null;
    if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && options.data) {
        if (options.processData) {
            var postDataInstances = [ArrayBuffer, Blob, Document, FormData];
            // Post Data
            if (postDataInstances.indexOf(options.data.constructor) >= 0) {
                postData = options.data;
            }
            else {
                // POST Headers
                var boundary = "---------------------------" + Date.now().toString(16);
                if (options.contentType === 'multipart/form-data') {
                    xhr.setRequestHeader('Content-Type', "multipart/form-data; boundary=" + boundary);
                }
                else {
                    xhr.setRequestHeader('Content-Type', options.contentType);
                }
                postData = '';
                var data = serializeQuery(options.data);
                if (options.contentType === 'multipart/form-data') {
                    data = data.split('&');
                    var newData = [];
                    for (var i = 0; i < data.length; i += 1) {
                        newData.push("Content-Disposition: form-data; name=\"" + data[i].split('=')[0] + "\"\r\n\r\n" + data[i].split('=')[1] + "\r\n");
                    }
                    postData = "--" + boundary + "\r\n" + newData.join("--" + boundary + "\r\n") + "--" + boundary + "--\r\n";
                }
                else if (options.contentType === 'application/json') {
                    postData = JSON.stringify(options.data);
                }
                else {
                    postData = data;
                }
            }
        }
        else {
            postData = options.data;
            xhr.setRequestHeader('Content-Type', options.contentType);
        }
    }
    // Additional headers
    if (options.headers) {
        Object.keys(options.headers).forEach(function (headerName) {
            xhr.setRequestHeader(headerName, options.headers[headerName]);
        });
    }
    // Check for crossDomain
    if (typeof options.crossDomain === 'void 0') {
        // eslint-disable-next-line
        options.crossDomain = /^([\w-]+:)?\/\/([^\/]+)/.test(options.url) && RegExp.$2 !== window.location.host;
    }
    if (!options.crossDomain) {
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    }
    if (options.xhrFields) {
        Object.assign(xhr, options.xhrFields);
    }
    var xhrTimeout;
    // Handle XHR
    xhr.onload = function onload() {
        if (xhrTimeout)
            clearTimeout(xhrTimeout);
        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 0) {
            var responseData = void 0;
            if (options.dataType === 'json') {
                var parseError = void 0;
                try {
                    responseData = JSON.parse(xhr.responseText);
                }
                catch (err) {
                    parseError = true;
                }
                if (!parseError) {
                    fireCallback('success', responseData, xhr.status, xhr);
                }
                else {
                    fireCallback('error', xhr, 'parseerror');
                }
            }
            else {
                responseData = xhr.responseType === 'text' || xhr.responseType === '' ? xhr.responseText : xhr.response;
                fireCallback('success', responseData, xhr.status, xhr);
            }
        }
        else {
            fireCallback('error', xhr, xhr.status);
        }
        if (options.statusCode) {
            if (globals.statusCode && globals.statusCode[xhr.status])
                globals.statusCode[xhr.status](xhr);
            if (options.statusCode[xhr.status])
                options.statusCode[xhr.status](xhr);
        }
        fireCallback('complete', xhr, xhr.status);
    };
    xhr.onerror = function onerror() {
        if (xhrTimeout)
            clearTimeout(xhrTimeout);
        fireCallback('error', xhr, xhr.status);
        fireCallback('complete', xhr, 'error');
    };
    // Timeout
    if (options.timeout > 0) {
        xhr.onabort = function onabort() {
            if (xhrTimeout)
                clearTimeout(xhrTimeout);
        };
        xhrTimeout = setTimeout(function () {
            xhr.abort();
            fireCallback('error', xhr, 'timeout');
            fireCallback('complete', xhr, 'timeout');
        }, options.timeout);
    }
    // Ajax start callback
    proceedRequest = fireCallback('beforeSend', xhr, options);
    if (proceedRequest === false)
        return xhr;
    // Send XHR
    xhr.send(postData);
    // Return XHR object
    return xhr;
}
function RequestShortcut(method) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    var _a = [], url = _a[0], data = _a[1], success = _a[2], error = _a[3], dataType = _a[4];
    if (typeof args[1] === 'function') {
        url = args[0], success = args[1], error = args[2], dataType = args[3];
    }
    else {
        url = args[0], data = args[1], success = args[2], error = args[3], dataType = args[4];
    }
    [success, error].forEach(function (callback) {
        if (typeof callback === 'string') {
            dataType = callback;
            if (callback === success)
                success = void 0;
            else
                error = void 0;
        }
    });
    dataType = dataType || (method === 'json' || method === 'postJSON' ? 'json' : void 0);
    var requestOptions = {
        url: url,
        method: method === 'post' || method === 'postJSON' ? 'POST' : 'GET',
        data: data,
        success: success,
        error: error,
        dataType: dataType,
    };
    if (method === 'postJSON') {
        Object.assign(requestOptions, {
            contentType: 'application/json',
            processData: false,
            crossDomain: true,
            data: typeof data === 'string' ? data : JSON.stringify(data),
        });
    }
    return Request(requestOptions);
}
Object.assign(Request, {
    get: function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return RequestShortcut.apply(void 0, ['get'].concat(args));
    },
    post: function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return RequestShortcut.apply(void 0, ['post'].concat(args));
    },
    json: function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return RequestShortcut.apply(void 0, ['json'].concat(args));
    },
    getJSON: function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return RequestShortcut.apply(void 0, ['json'].concat(args));
    },
    postJSON: function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return RequestShortcut.apply(void 0, ['postJSON'].concat(args));
    },
});
Request.setup = function setup(options) {
    if (options.type && !options.method) {
        Object.assign(options, { method: options.type });
    }
    Object.assign(globals, options);
};
function serializeQuery(params, prefix) {
    var key = Object.keys(params);
    for (var i = 0; i < key.length; i++) {
      var value = params[key[i]];
      if (params.constructor === Array)
          key[i] += prefix + "[]";
      else if (params.constructor === Object)
          key[i] = (prefix ? prefix + "[" + key[i] + "]" : key[i]);

      if (typeof value === 'object')
          key[i] = serializeQuery(value, key[i]);
      else
          key[i] = key[i] + "=" + encodeURIComponent(value);
    }
    return key.join('&');
}
$.ajax = sf.ajax = Request;
sf.events = (function(){
	var callbacks = {};
	var callbacksWhen = {};
	self.warningWhen = 10;

	function Events(name, run){
		if(name.constructor === Array){
			for (var i = 0; i < name.length; i++)
				Events(name[i], run);

			return;
		}

		if(Events[name] === void 0){
			var active = void 0;

			if(run !== void 0 && run.constructor === Boolean)
				active = run;

			if(active !== void 0){
				Object.defineProperty(Events, name, {
					enumerable:false,
					configurable:true,
					get:function(){return active},
					set:function(val){
						if(active === val)
							return;

						var ref = callbacksWhen[name];
						if(ref !== void 0){
							for (var i = 0; i < ref.length; i++) {
								try{
									ref[i].apply(null, arguments);
								} catch(e) {
									console.error(e);
								}
							}

							delete callbacksWhen[name];
						}

						// Reset to default
						Object.defineProperty(Events, name, {
							enumerable:false,
							configurable:true,
							writable:true,
							value:val
						});
					}
				});
			}
			else{
				Events[name] = function(){
					for (var i = 0; i < callback.length; i++) {
						try{
							callback[i].apply(null, arguments);
							if(callback[i].once === true)
								callback.splice(i--, 1);
						} catch(e) {
							console.error(e);
						}
					}
				}

				if(callbacks[name] === void 0)
					callbacks[name] = [];

				var callback = callbacks[name];
			}
		}

		if(run && run.constructor === Function){
			run(Events[name]);
			run = null;
		}
	}

	Events.when = function(name, callback){
		if(Events[name] === true)
			return callback();

		if(callbacksWhen[name] === void 0)
			callbacksWhen[name] = [];

		callbacksWhen[name].push(callback);
	}

	Events.once = function(name, callback){
		callback.once = true;
		callbacks[name].push(callback);
	}

	Events.on = function(name, callback){
		if(callbacks[name] === void 0)
			callbacks[name] = [];

		if(callbacks[name].length >= self.warningWhen)
			console.warn("Events", name, "have more than", self.warningWhen, "callback, there may possible memory leak.");

		callbacks[name].push(callback);
	}

	Events.off = function(name, callback){
		if(callbacks[name] === void 0)
			return callbacks[name].length = 0;

		var i = callbacks[name].indexOf(callback);
		if(i === -1) return;
		callbacks[name].splice(i, 1);
	}

	return Events;
})();
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
	if(obj !== void 0 && obj.constructor === Function){
		callback = obj;
		obj = void 0;
	}

	if(path.constructor === String)
		return getSingle(path, obj, callback);
	else
		return getMany(path, obj, callback);
}

function startRequest(){
	if(pending === false) return;

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
					if(pendingCallback[i].callbackOnly === void 0)
						pendingCallback[i](diveObject(defaultLang, pendingCallback[i].path));
					else
						pendingCallback[i]();
				}

				pendingCallback.length = 0;
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

			if(temp)
				value[missing[i]] = temp;
		}

		return callback(value);
	}

	callback_.callbackOnly = true;
	pendingCallback.push(callback_);

	startRequest();
}

self.assign = function(model, keyPath, obj, callback){
	var keys = Object.keys(keyPath);
	var vals = Object.values(keyPath);

	if(obj !== void 0 && obj.constructor === Function){
		callback = obj;
		obj = void 0;
	}

	getMany(vals, obj, function(values){
		for (var i = 0; i < keys.length; i++) {
			model[keys[i]] = values[vals[i]];
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
		console.warn("Some language was not found, and the serverURL was set to false");
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
;(function(){
var self = sf.url = function(){
	// Hashes
	var hashes_ = '';
	for(var keys in hashes){
		if(hashes[keys] === '/') continue;
		hashes_ += '#'+keys+hashes[keys];
	}

	var data_ = '|'+self.data.join('|');

	return self.paths + hashes_ + (data_.length !== 1 ? data_ : '');
}

var hashes = self.hashes = {};
self.data = {};
self.paths = '/';

// Push into latest history
self.push = function(){
	window.history.pushState((window.history.state || 0) + 1, '', self());
}

// Remove next history and change current history
self.replace = function(){
	window.history.replaceState(window.history.state, '', self());
}

self.get = function(name, index){
	self.parse();

	if(name.constructor === Number)
		return self.paths.split('/')[name+1];

	if(hashes[name] === void 0)
		return;

	return hashes[name].split('/')[index+1];
}

self.parse = function(url){
	if(url !== void 0){
		var data = {hashes:{}};

		data.data = url.split('|');
		var hashes_ = data.data.shift().split('#');

		for (var i = 1; i < hashes_.length; i++) {
			var temp = hashes_[i].split('/');
			data.hashes[temp.shift()] = '/'+temp.join('/');
		}

		// Paths
		data.paths = url.split('#')[0];
		return data;
	}

	self.data = window.location.hash.split('|');
	var hashes_ = self.data.shift().split('#');

	for (var i = 1; i < hashes_.length; i++) {
		var temp = hashes_[i].split('/');
		hashes[temp.shift()] = '/'+temp.join('/');
	}

	// Paths
	self.paths = window.location.pathname;
	return self;
}

self.parse();

})();
;(function(){
var gEval = routerEval;
routerEval = void 0; // Avoid this function being invoked out of scope

var rejectResponse = /<html/;

// Save reference
var aHashes = sf.url.hashes;
var slash = '/';

var routingError = false;
var routeDirection = 1;
var historyIndex = (window.history.state || 1);

var disableHistoryPush = false;

window.addEventListener('popstate', function(ev){
	// Don't continue if the last routing was error
	// Because the router was trying to getting back
	if(routingError){
		routingError = false;
		historyIndex -= routeDirection;
		return;
	}

	disableHistoryPush = true;

	if(window.history.state >= historyIndex)
		routeDirection = 1;
	else
		routeDirection = -1;

	historyIndex += routeDirection;

	// console.warn('historyIndex', historyIndex, window.history.state, routeDirection > 0 ? 'forward' : 'backward');

	// Reparse URL
	self.goto();

	disableHistoryPush = false;
}, false);

// Listen to every link click
sf(function(){
	$.on(document.body, 'click', 'a[href]', function(ev){
		ev.preventDefault();

		var elem = ev.target;
		var attr = elem.getAttribute('href');

		if(attr === null){
			elem = $.parent(elem, 'a[href]');
			attr = elem.getAttribute('href');
		}

		if(attr[0] === '@'){ // ignore
			var target = elem.getAttribute('target');
			if(target)
				window.open(attr.slice(1), target);
			else window.location = attr.slice(1);
			return;
		}

		// Make sure it's from current origin
		var path = elem.href.replace(window.location.origin, '');
		if(path.indexOf('//') !== -1)
			return;

		self.goto(attr);
	});
});

var cachedURL = {};

internal.router = {};
internal.router.parseRoutes = function(obj_, selectorList){
	var routes = [];
	var pattern = /\/:([^/]+)/g;
    var knownKeys = /^(path|url|templateURL|html|on|routes|beforeRoute|defaultData|cache)$/;

	function addRoutes(obj, addition, selector, parent){
		if(selector !== '')
			selector += ' ';

		for(var i = 0; i < obj.length; i++){
            var ref = obj[i];
			var current = addition+ref.path;

			if(ref.routes !== void 0)
				addRoutes(ref.routes, current, selector, parent);

			current = current.split('//').join('/');

			var keys = [];
			var regex = current.replace(pattern, function(full, match){
				keys.push(match);
				return '/([^/]+)';
			});
			var route = RegExp('^' + regex + '$');

			if(ref.url !== void 0)
				route.url = ref.url;

			else if(ref.templateURL !== void 0)
				route.templateURL = ref.templateURL;

			else if(ref.html !== void 0){
				// Create new element
				var dom = route.html = document.createElement('sf-page-view');

				if(ref.html.constructor === String)
					dom.innerHTML = ref.html;
				else
					dom.appendChild(ref.html);

				dom.classList.add('page-prepare');
			}

			route.keys = keys;
			route.beforeRoute = ref.beforeRoute;
			route.defaultData = ref.defaultData || {};

			if(selector !== ''){
				route.selector = selectorList.indexOf(selector);

				if(route.selector === -1){
					route.selector = selectorList.length;
					selectorList.push(selector.trim());
				}
			}

			if(parent !== void 0)
				route.parent = parent;

			if(ref.on !== void 0)
				route.on = ref.on;

			if(ref.cache)
				route.cache = true;

			var hasChild = [];

            var keys = Object.keys(ref);
            for(var a = 0; a < keys.length; a++){
                if(knownKeys.test(keys[a]))
                	continue;

				hasChild.push(keys[a]);
				addRoutes(ref[keys[a]], current, keys[a], route);
                break;
            }

            if(hasChild.length !== 0){
            	route.hasChild = hasChild;
            	route.forChild = RegExp(regex);
            }

			routes.push(route);
		}
	}

    addRoutes(obj_, '', '');
	return routes;
}

internal.router.findRoute = function(url){
	for(var i=0; i<this.length; i++){
		var found = url.match(this[i]);
		if(found !== null){
			var keys = this[i].keys;
			if(keys !== void 0){
				var data = this[i].data = {};
				found.shift();

				for (var a = 0; a < keys.length; a++) {
					data[keys[a]] = found[a];
				}
			}

			return this[i];
		}
	}

	return false;
}

var self = sf.views = function View(selector, name){
	if(name === void 0)
		name = slash;

	var self = this;

	if(name){
		if(sf.views.list[name] === void 0)
			sf.views.list[name] = [];

		sf.views.list[name].push(self);
	}

	var pendingAutoRoute = false;

	// Init current URL as current View Path
	if(name === slash)
		self.currentPath = sf.url.paths;
	else if(name === false)
		self.currentPath = '';
	else{
		self.currentPath = '';
		pendingAutoRoute = true;
	}

	var initialized = false;
	var firstRouted = false;

	self.lastPath = '/';
	self.currentDOM = null;
	self.lastDOM = null;
	self.relatedDOM = [];
	self.data = {};

	self.maxCache = 3;

	var rootDOM = {};
	self.selector = function(selector_, isChild, currentPath){
		initialized = true;

		var DOM = (isChild || (rootDOM.isConnected ? rootDOM : document)).querySelector(selector_ || selector);

		if(!DOM) return false;

		if(DOM.sf$viewInitialized)
			return false;

		if(collection === null)
			collection = DOM.getElementsByTagName('sf-page-view');

		// Create listener for link click
		if(DOM){
			if(selector_)
				selector = selector_;

			var temp = null;

			// Bring the content to an sf-page-view element
			if(DOM.childNodes.length !== 0){
				if(DOM.childNodes.length === 1 && DOM.firstChild.nodeName === '#text' && DOM.firstChild.textContent.trim() === '')
					DOM.firstChild.remove();
				else{
					temp = document.createElement('sf-page-view');
					DOM.insertBefore(temp, DOM.firstChild);

					for (var i = 1, n = DOM.childNodes.length; i < n; i++) {
						temp.appendChild(DOM.childNodes[1]);
					}

					temp.routePath = currentPath || self.currentPath;
					temp.routeCached = routes.findRoute(temp.routePath);
					temp.classList.add('page-current');
					DOM.defaultViewContent = temp;
				}
			}

			DOM.sf$viewInitialized = true;

			if(!isChild){
				self.currentDOM = temp;
				rootDOM = DOM;
				return true;
			}

			return DOM;
		}
		return false;
	}

    var selectorList = [selector];
	var routes = [];
	routes.findRoute = internal.router.findRoute;

	internal.router.enabled = true;

	var onEvent = {
		'routeStart':[],
		'routeFinish':[],
		'routeCached':[],
		'routeError':[]
	};

	self.on = function(event, func){
		if(onEvent[event] === void 0)
			return console.error("Event '"+event+"' was not exist");

		if(onEvent[event].indexOf(func) === -1)
			onEvent[event].push(func);
	}

	self.addRoute = function(obj){
		routes.push.apply(routes, internal.router.parseRoutes(obj, selectorList));

		if(!initialized)
			self.selector();

		if(!firstRouted && name){
			sf(function(){
				if(firstRouted)
					return;

				if(name === slash && !rootDOM.childElementCount){
					self.currentPath = '';
					firstRouted = self.goto(sf.url.paths);
				}

				if(pendingAutoRoute){
					if(aHashes[name] !== void 0)
						firstRouted = self.goto(aHashes[name]);
					else
						firstRouted = self.goto('/');

					if(firstRouted)
						pendingAutoRoute = false;
				}
			});
		}
	}

	var RouterLoading = false; // xhr reference if the router still loading

	var collection = null;
	function findRelatedElement(currentURL){
		var found = [];
		for (var i = 0; i < collection.length; i++) {
			if(currentURL.indexOf(collection[i].routePath) === 0)
				found.push(collection[i]);
		}

		return found;
	}

	function findCachedURL(currentURL){
		for (var i = collection.length-1; i >= 0; i--) { // Search from deep view first
			if(currentURL === collection[i].routePath)
				return collection[i];
		}

		return false;
	}

	function routeError_(xhr, data){
		if(xhr.aborted) return;
		routingError = true;

		RouterLoading = false;
		for (var i = 0; i < onEvent['routeError'].length; i++) {
			onEvent['routeError'][i](xhr.status, data);
		}

		window.history.go(routeDirection * -1);
	}

	var pageViewNodeName = 'SF-PAGE-VIEW';
	function toBeShowed(element, event, path, data){
		var relatedPage = [element];

		var parent = element.parentNode;
		while(parent !== rootDOM && parent !== null){
			if(parent.nodeName === pageViewNodeName)
				relatedPage.unshift(parent);

			parent = parent.parentNode;
		}

		var lastSibling = void 0;
		var parentSimilarity = void 0;

		for (var i = 0; i < self.relatedDOM.length; i++) {
			if(relatedPage.indexOf(self.relatedDOM[i]) === -1){
				if(lastSibling === void 0){
					lastSibling = self.relatedDOM[i];
					parentSimilarity = lastSibling.parentNode;
				}

				self.relatedDOM[i].classList.remove('page-current');
			}
		}

		var showedSibling = void 0;
		for (var i = 0; i < relatedPage.length; i++) {
			if(showedSibling === void 0 && relatedPage[i].parentNode === parentSimilarity)
				showedSibling = relatedPage[i];

			relatedPage[i].classList.add('page-current');
		}

		self.showedSibling = showedSibling;
		self.lastSibling = lastSibling;

		element.classList.add('page-current');

		self.relatedDOM = relatedPage;
	}

	self.goto = function(path, data, method, _callback){
		if(self.currentPath === path)
			return;

		// Get template URL
		var url = routes.findRoute(path);
		if(!url) return;

		// Return when beforeRoute returned truthy value
		if(url.beforeRoute !== void 0 && url.beforeRoute(url.data))
			return;

		if(name === slash)
			sf.url.paths = path;
		else if(name)
			aHashes[name] = path;

		// This won't trigger popstate event
		if(!disableHistoryPush && !_callback)
			sf.url.push();

		// Check if view was exist
		if(!rootDOM.isConnected){
			if(rootDOM.nodeType !== void 0)
				rootDOM = {};

			if(!self.selector());
				return console.error(name, "can't route to", path, "because element with selector '"+selector+"' was not found");
		}

		// Abort other router loading if exist
		if(RouterLoading) RouterLoading.abort();

		// Return if the cache was exist
		if(tryCache(path)) return true;

		for (var i = 0; i < onEvent['routeStart'].length; i++) {
			if(onEvent['routeStart'][i](self.currentPath, path)) return;
		}

		function insertLoadedElement(DOMReference, dom, parentNode, pendingShowed){
			if(parentNode)
				dom.parentPageElement = parentNode;

			dom.routerData = {};
			if(dom.firstChild.nodeName === '#comment' && dom.firstChild.textContent.indexOf(' SF-View-Data') === 0){
				dom.routerData = JSON.parse(dom.firstChild.textContent.slice(14));
				dom.firstChild.remove();
			}

			// Let page script running first
			DOMReference.insertAdjacentElement('beforeend', dom);
			Object.assign(dom.routerData, url.data)
			self.data = dom.routerData;

			if(self.dynamicScript !== false){
				var scripts = dom.getElementsByTagName('script');
				for (var i = 0; i < scripts.length; i++) {
				    gEval(scripts[i].text);
				}
			}

			// Wait if there are some component that being initialized
			setTimeout(function(){
				// Parse the DOM data binding
				// sf.model.init(dom);

				if(url.on !== void 0 && url.on.coming)
					url.on.coming(self.data);

				if(url.cache)
					dom.routeNoRemove = true;

				var tempDOM = self.currentDOM;
				self.currentDOM = dom;

				toBeShowed(dom);

				// Trigger loaded event
				var event = onEvent['routeFinish'];
				for (var i = 0; i < event.length; i++) {
					if(event[i](self.currentPath, path)) return;
				}

				if(pendingShowed !== void 0)
					self.relatedDOM.push.apply(self.relatedDOM, pendingShowed);

				if(tempDOM !== null){
					self.lastPath = self.currentPath;

					// Old route
					if(tempDOM.routeCached && tempDOM.routeCached.on !== void 0 && tempDOM.routeCached.on.leaving)
						tempDOM.routeCached.on.leaving(path, url);

					self.lastDOM = tempDOM;
				}

				// Save current URL
				self.currentPath = path;
				dom.routeCached = url;
				dom.routePath = path;

				dom.classList.remove('page-prepare');
				routingError = false;

				// Clear old cache
				var parent = self.currentDOM.parentNode;
				for (var i = parent.childElementCount - self.maxCache - 1; i >= 0; i--) {
					if(parent.defaultViewContent !== parent.firstElementChild && parent.firstElementChild.routeNoRemove)
						parent.firstElementChild.remove();
					else if(parent.childElementCount > 1)
						parent.firstElementChild.nextElementSibling.remove();
				}
			});
		}

		var afterDOMLoaded = function(dom){
			if(url.selector || url.hasChild){
				var selectorElement = dom.sf$viewSelector;

				if(selectorElement === void 0)
					selectorElement = dom.sf$viewSelector = {};
			}

			if(url.hasChild){
				var pendingShowed = [];
				for (var i = 0; i < url.hasChild.length; i++) {
					selectorElement[url.hasChild[i]] = self.selector(url.hasChild[i], dom, path);
					var tempPageView = selectorElement[url.hasChild[i]].firstElementChild;

					if(tempPageView)
						pendingShowed.unshift(tempPageView);
				}

				if(pendingShowed.length === 0)
					pendingShowed = void 0;
			}
			else var pendingShowed = void 0;

			if(url.selector === void 0)
				var DOMReference = rootDOM;
			else{ // Get element from selector
				var selectorName = selectorList[url.selector];
				var DOMReference = null;

				var last = findRelatedElement(path);

				// Find current parent
				for (var i = 0; i < last.length; i++) {
					var found = last[i].sf$viewSelector;
					if(found === void 0 || found[selectorName] === void 0)
						continue;

					DOMReference = found[selectorName];
				}

				if(!DOMReference || !DOMReference.isConnected){
					if(url.parent === void 0){
						dom.remove();
						return routeError_({status:0});
					}
					else{
						// Try to load parent router first
						var newPath = path.match(url.parent.forChild)[0];
						return self.goto(newPath, false, method, function(parentNode){
							DOMReference = parentNode.sf$viewSelector[selectorName];
							insertLoadedElement(DOMReference, dom, parentNode);

							if(_callback) return _callback(dom);

							var defaultViewContent = dom.parentNode.defaultViewContent;
							if(defaultViewContent.routePath !== path)
								defaultViewContent.classList.remove('page-current');
						});
					}
				}
			}

			insertLoadedElement(DOMReference, dom, false, pendingShowed);
			if(_callback) _callback(dom);
		}

		//(url.url || path)
		if(url.templateURL !== void 0 && cachedURL[url.templateURL] !== void 0){
			afterDOMLoaded(cachedURL[url.templateURL].cloneNode(true));
			return true;
		}

		if(url.html){
			afterDOMLoaded(url.html.cloneNode(true));
			return true;
		}

		RouterLoading = sf.ajax({
			url:window.location.origin + (url.templateURL || url.url || path),
			method:method || 'GET',
		    data:Object.assign(data || url.defaultData, {
		        _sf_view:url.selector === void 0 ? selector : selectorList[url.selector].split(' ').pop()
		    }),
			success:function(html_content){
				if(rejectResponse.test(html_content)){
					console.error("Views request was received <html> while it was disalowed. Please check http response from Network Tab.");
					return routeError_(1);
				}

				// Create new element
				var dom = document.createElement('sf-page-view');
				dom.innerHTML = html_content;
				dom.classList.add('page-prepare');

				// Same as above but without the component initialization
				if(url.templateURL !== void 0){
					internal.component.skip = true;
					var temp = document.createElement('sf-page-view');
					temp.innerHTML = html_content;
					temp.classList.add('page-prepare');
					cachedURL[url.templateURL] = temp;
					internal.component.skip = false;
				}

				afterDOMLoaded(dom);
			},
			error:routeError_
		});
		return true;
	}

	// Use to cache if exist
	function tryCache(path){
		var cachedDOM = false;

		function findDOM(dom){
			if(dom === null)
				return false;

			cachedDOM = findCachedURL(path);
			if(cachedDOM)
				return true;

			var childs = dom.children;
			for (var i = 0; i < childs.length; i++) {
				if(childs[i].routePath === path){
					cachedDOM = childs[i];
					// console.warn('cache found for', path, childs[i]);
					return true;
				}
			}

			return false;
		}

		if(findDOM(rootDOM) === false)
			for (var i = 0; i < selectorList.length; i++) {
				if(findDOM(rootDOM.querySelector(selectorList[i])))
					break;
			}

		if(cachedDOM === false)
			return false;

		if(self.currentDOM.routeCached.on !== void 0 && self.currentDOM.routeCached.on.leaving)
			self.currentDOM.routeCached.on.leaving();

		self.currentDOM = cachedDOM;
		self.data = cachedDOM.routerData;

		if(self.currentDOM.routeCached.on !== void 0 && self.currentDOM.routeCached.on.coming)
			self.currentDOM.routeCached.on.coming();

		toBeShowed(cachedDOM);

		var event = onEvent['routeCached'];
		for (var i = 0; i < event.length; i++) {
			event[i](self.currentPath, self.lastPath);
		}

		self.lastPath = self.currentPath;
		self.currentPath = self.currentDOM.routePath;

		return true;
	}

	return self;
}

self.list = {};
self.goto = function(url){
	var parsed = sf.url.parse(url);
	sf.url.data = parsed.data;

	var list = self.list;

	// For root path
	if(list[slash] !== void 0){
		var ref = list[slash];
		for (var a = 0; a < ref.length; a++) {
			if(ref[a].currentPath !== parsed.paths)
				ref[a].goto(parsed.paths);
		}
	}

	// For hash path
	var view = Object.keys(parsed.hashes);
	for (var i = 0; i < view.length; i++) {
		var ref = list[view[i]];
		if(ref === void 0) continue;

		for (var a = 0; a < ref.length; a++) {
			if(ref[a].currentPath !== parsed.hashes[view[i]])
				ref[a].goto(parsed.hashes[view[i]]);
		}
	}
}

})();
internal.virtual_scroll = new function(){
	var self = this;
	var scrollingByScript = false;

	// before and after
	self.prepareCount = 4; // 4, 8, 12, 16, ...

	self.handle = function(list, parentNode){
		var dynamicList = false;
		var virtual = list.$virtual;
		virtual.reset = function(reinitOnly){
			virtual.DOMCursor = 0; // cursor of first element in DOM tree as a cursor

			virtual.bounding.ceiling = -1;
			virtual.bounding.floor = 0;

			virtual.vCursor.ceiling = null; // for forward direction
			virtual.vCursor.floor = virtual.dom.firstElementChild; // for backward direction

			virtual.bounding.initial = virtual.dCursor.ceiling.offsetTop;
			refreshScrollBounding(0, virtual.bounding, list, parentNode);
		}

		virtual.reinitCursor = function(){
			virtual.vCursor.ceiling = virtual.dom.children[virtual.DOMCursor - 1] || null;
			virtual.vCursor.floor = virtual.dom.children[virtual.DOMCursor] || null;
		}

		virtual.reinitScroll = function(){
			refreshScrollBounding(virtual.DOMCursor, virtual.bounding, list, parentNode);
		}

		virtual.elements = function(){
			return obtainElements(list, parentNode);
		}

		virtual.dCursor = { // DOM Cursor
			ceiling:parentNode.querySelector('.virtual-spacer.ceiling'),
			floor:parentNode.querySelector('.virtual-spacer.floor')
		};

		virtual.bounding = {};
		virtual.vCursor = {};

		virtual.reset();
		virtual.targetNode = parentNode;
		virtual.scrollHeight = virtual.dCursor.ceiling.nextElementSibling.offsetHeight;

		var scroller = parentNode;
		virtual.destroy = function(){
			$.off(scroller, 'scroll');
			$.off(parentNode, 'mousedown mouseup');
			virtual.dom.innerHTML = '';
			offElementResize(parentNode);

			list.$virtual = void 0;
		}

		virtual.resetViewport = function(){
			virtual.visibleLength = Math.floor(scroller.clientHeight / virtual.scrollHeight);
			virtual.preparedLength = virtual.visibleLength + self.prepareCount * 2;

			if(virtual.preparedLength < 18)
				virtual.preparedLength = 18;
		}

		setTimeout(function(){
			if(!list.$virtual || !parentNode.isConnected)
				return; // Somewhat it's uninitialized

			scroller = internal.findScrollerElement(parentNode);
			if(scroller === null){
				scroller = parentNode;
				console.warn("Virtual List need scrollable container", parentNode);
			}
			else scroller.classList.add('sf-scroll-element');

			internal.addScrollerStyle();
			virtual.resetViewport();

			if(parentNode.hasAttribute('scroll-reduce-floor')){
				parentNode.sf$scroll_reduce_floor = parentNode.getAttribute('scroll-reduce-floor');
				parentNode.removeAttribute('scroll-reduce-floor');
			}

			if(parentNode.classList.contains('sf-list-dynamic')){
				dynamicList = true;
				dynamicHeight(list, parentNode, scroller);
			}
			else staticHeight(list, parentNode, scroller);
		}, 500);
	}

	// Recommended for a list that have different element height
	function dynamicHeight(list, parentNode, scroller){
		var virtual = list.$virtual;
		var ceiling = virtual.dCursor.ceiling;
		var floor = virtual.dCursor.floor;
		var vCursor = virtual.vCursor;
		vCursor.floor = virtual.dom.firstElementChild;

		virtual.scrollTo = function(index){
			scrollTo(index, list, self.prepareCount, parentNode, scroller);

			// Reset virtual spacer height
			ceilingHeight = 0;
			floorHeight = 0;
			ceiling.style.height = ceilingHeight+'px';
			floor.style.height = floorHeight+'px';
		}

		virtual.refresh = function(force){
			refresh(force, list, self.prepareCount, parentNode, scroller);
			fillViewport();
		}

		// Insert some element until reach visible height
		fillViewport();

		virtual.visibleLength = parentNode.childElementCount - 2;
		virtual.preparedLength = virtual.visibleLength + self.prepareCount * 2;

		if(virtual.preparedLength < 18)
			virtual.preparedLength = 18;

		for (var i = 0; i < self.prepareCount; i++) {
			var temp = vCursor.floor;
			if(temp === null) break;

			vCursor.floor = temp.nextElementSibling;
			floor.insertAdjacentElement('beforeBegin', temp);
		}
		virtual.DOMCursor = 0;

		var ceilingHeight = 0;
		var floorHeight = 0;
		function previousCeiling(){
			var temp = null;
			var resetCeiling = false;

			// Add some element on the ceiling
			for (var i = 0; i < self.prepareCount; i++) {
				if(vCursor.floor === null)
					temp = virtual.dom.lastElementChild;
				else
					temp = vCursor.floor.previousElementSibling;

				if(temp === null) break;
				vCursor.ceiling = temp.previousElementSibling;
				virtual.DOMCursor--;

				ceiling.insertAdjacentElement('afterEnd', temp);

				if(ceilingHeight > 0)
					ceilingHeight -= getAbsoluteHeight(temp);

				if(virtual.DOMCursor < self.prepareCount && !resetCeiling){
					i = 0;
					resetCeiling = true;
					temp = null;
				}
			}

			if(ceilingHeight < 0 || temp === null)
				ceilingHeight = 0;

			var length = parentNode.childElementCount - 2 - list.$virtual.preparedLength;
			// Remove some element on the floor
			for (var i = 0; i < length; i++) {
				temp = floor.previousElementSibling;
				floorHeight += getAbsoluteHeight(temp);

				if(vCursor.floor === null)
					virtual.dom.insertAdjacentElement('beforeEnd', temp);
				else vCursor.floor.insertAdjacentElement('beforeBegin', temp);

				vCursor.floor = temp;
			}

			if(vCursor.floor === null)
				vCursor.ceiling = virtual.dom.lastElementChild;
			else 
				vCursor.ceiling = vCursor.floor.previousElementSibling;

			ceiling.style.height = ceilingHeight+'px';
			floor.style.height = floorHeight+'px';
		}

		function fillViewport(){
			// Insert some element depend on prepared length
			var length = virtual.preparedLength - (parentNode.childElementCount - 2);
			for (var i = 0; i < length; i++) {
				if(vCursor.ceiling === null)
					temp = virtual.dom.firstElementChild;
				else
					temp = vCursor.ceiling.nextElementSibling;

				if(temp === null) break;
				vCursor.floor = temp.nextElementSibling;

				floor.insertAdjacentElement('beforeBegin', temp);
			}
		}

		function nextFloor(){
			var temp = null;
			fillViewport();

			if(vCursor.floor !== null){
				if(vCursor.ceiling === null)
					vCursor.ceiling = vCursor.floor.previousElementSibling;

				// Add extra element based on prepare count
				for (var i = 0; i < self.prepareCount; i++) {
					temp = vCursor.floor;
					if(temp === null) break;

					vCursor.floor = temp.nextElementSibling;
					floor.insertAdjacentElement('beforeBegin', temp);

					if(floorHeight > 0)
						floorHeight -= getAbsoluteHeight(temp);
				}
			}

			if(floorHeight < 0 || temp === null)
				floorHeight = 0;

			// Remove some element on the ceiling
			var length = parentNode.childElementCount - 2 - list.$virtual.preparedLength;
			for (var i = 0; i < length; i++) {
				temp = ceiling.nextElementSibling;
				ceilingHeight += getAbsoluteHeight(temp);
				virtual.DOMCursor++;

				if(vCursor.ceiling === null)
					virtual.dom.insertAdjacentElement('afterBegin', temp);
				else vCursor.ceiling.insertAdjacentElement('afterEnd', temp);

				vCursor.ceiling = temp;
			}

			if(vCursor.ceiling === null)
				vCursor.floor = virtual.dom.firstElementChild;
			else 
				vCursor.floor = vCursor.ceiling.nextElementSibling;

			ceiling.style.height = ceilingHeight+'px';
			floor.style.height = floorHeight+'px';
		}

		var bounding = virtual.bounding;
		refreshScrollBounding(0, bounding, list, parentNode);

		var updating = false;
		function checkCursorPosition(){
			if(updating || scrollingByScript) return;
			updating = true;

			if(scroller.scrollTop < bounding.ceiling){
				// console.log('back', bounding, scroller.scrollTop, virtual.DOMCursor);
				previousCeiling();
				refreshScrollBounding(virtual.DOMCursor, bounding, list, parentNode);
				// console.warn('back', bounding, scroller.scrollTop, virtual.DOMCursor);
			}

			else if(scroller.scrollTop > bounding.floor){
				// console.log('front', bounding, scroller.scrollTop, virtual.DOMCursor);
				nextFloor();
				refreshScrollBounding(virtual.DOMCursor, bounding, list, parentNode);
				// console.warn('front', bounding, scroller.scrollTop, virtual.DOMCursor);
			}

			if(list.length !== 0){
				if(virtual.callback.hitFloor && virtual.vCursor.floor === null &&
					scroller.scrollTop + scroller.clientHeight === scroller.scrollHeight
				){
					virtual.callback.hitFloor(virtual.DOMCursor);
				}
				else if(virtual.callback.hitCeiling && virtual.vCursor.ceiling === null && scroller.scrollTop === 0){
					virtual.callback.hitCeiling(virtual.DOMCursor);
				}
			}

			updating = false;
			if(scroller.scrollTop === 0 && ceiling.offsetHeight > 10)
				virtual.scrollTo(0);
		}

		scroller.addEventListener('scroll', checkCursorPosition, {capture:true, passive:true});
		onElementResize(parentNode, function(){
			refreshScrollBounding(virtual.DOMCursor, bounding, list, parentNode);
		});
	}

	// Recommended for a list that have similar element height
	function staticHeight(list, parentNode, scroller){
		var virtual = list.$virtual;
		var ceiling = virtual.dCursor.ceiling;
		var floor = virtual.dCursor.floor;

		// Insert visible element to dom tree
		var insertCount = virtual.preparedLength <= list.length ? virtual.preparedLength : list.length;
		for (var i = 0; i < insertCount; i++) {
			if(virtual.dom.firstElementChild === null)
				break;

			floor.insertAdjacentElement('beforeBegin', virtual.dom.firstElementChild);
		}

		virtual.refreshVirtualSpacer = refreshVirtualSpacer;

		function refreshVirtualSpacer(cursor){
			if(cursor >= self.prepareCount){
				ceiling.style.height = (cursor - self.prepareCount) * virtual.scrollHeight + 'px';
				floor.style.height = (list.length - virtual.preparedLength - cursor) * virtual.scrollHeight + 'px';
			}
			else{
				ceiling.style.height = cursor * virtual.scrollHeight + 'px'; //'0px';
				var count = (list.length - virtual.preparedLength);
				floor.style.height = (count || 0) * virtual.scrollHeight + 'px';
			}
		}

		var bounding = virtual.bounding;

		refreshVirtualSpacer(0);
		refreshScrollBounding(self.prepareCount, bounding, list, parentNode);
		bounding.ceiling = -1;

		virtual.offsetTo = function(index){
			return index * virtual.scrollHeight + ceiling.offsetTop;
		}

		var vCursor = virtual.vCursor;
		vCursor.floor = virtual.dom.firstElementChild;
		virtual.scrollTo = function(index){
			scrollTo(index, list, self.prepareCount, parentNode, scroller);
		}

		virtual.refresh = function(force){
			refresh(force, list, self.prepareCount, parentNode, scroller, checkCursorPosition, refreshVirtualSpacer);
		}

		var updating = false;
		var fromCeiling = true;
		var scrollFocused = false;
		function checkCursorPosition(){
			if(updating || scrollingByScript || scroller.scrollTop >= bounding.ceiling && scroller.scrollTop <= bounding.floor){
				// Fix chrome scroll anchoring bugs when scrolling at corner
				if(scrollFocused){
					if(scroller.scrollTop === 0 || scroller.scrollTop === scroller.scrollHeight - scroller.clientHeight){
						removeUserScrollFocus(scroller);
						scrollFocused = false;
					}
				}
				return;
			}

			var cursor = Math.floor(scroller.scrollTop / virtual.scrollHeight);
			if(cursor + virtual.preparedLength > list.length)
				cursor = list.length - virtual.preparedLength;

			if(fromCeiling){
				if(cursor < self.prepareCount*2)
					cursor -= self.prepareCount;

				// Fix chrome scroll anchoring bugs
				if(scrollFocused){
					removeUserScrollFocus(scroller);
					scrollFocused = false;
				}
				fromCeiling = false;
			}

			if(cursor < self.prepareCount){
				cursor = 0;
				fromCeiling = true;
			}

			updating = true;

			var changes = cursor - virtual.DOMCursor;
			if(cursor + changes >= list.length)
				changes = cursor + changes - list.length;

			if(changes === 0){ // This should be fixed to improve performance and future bugs
				//console.warn("No changes (The scroll bounding is not correct)");
				updating = false;
				return;
			}

			virtual.DOMCursor = cursor;

			// console.log(cursor, changes, bounding.ceiling, bounding.floor, scroller.scrollTop);
			moveElementCursor(changes, list);
			refreshVirtualSpacer(cursor);
			refreshScrollBounding(cursor, bounding, list, parentNode);
			// console.log('a', bounding.ceiling, bounding.floor, scroller.scrollTop);

			if(list.length !== 0){
				if(virtual.callback.hitFloor && virtual.vCursor.floor === null){
					virtual.callback.hitFloor(cursor);
				}
				else if(virtual.callback.hitCeiling && virtual.vCursor.ceiling === null){
					virtual.callback.hitCeiling(cursor);
				}
			}

			updating = false;
		}

		scroller.addEventListener('scroll', checkCursorPosition, {capture:true, passive:true});

		// For preventing scroll jump if scrolling over than viewport
		if(scroller === parentNode && navigator.userAgent.indexOf('Chrom') !== -1){
			$.on(parentNode, 'mousedown', function(){
				scrollFocused = true;
			});
			$.on(parentNode, 'mouseup', function(){
				scrollFocused = false;
			});
		}
	}

	function refreshScrollBounding(cursor, bounding, list, parentNode){
		var temp = Math.floor(self.prepareCount / 2); // half of element preparation
		if(cursor < self.prepareCount){
			bounding.ceiling = -1;
			bounding.floor = parentNode.children[self.prepareCount * 2 + 1];

			if(bounding.floor !== void 0)
				bounding.floor = bounding.floor.offsetTop;
			else bounding.floor = parentNode.lastElementChild.offsetTop + 1000;

			bounding.floor -= bounding.initial;
			return;
		}
		else if(parentNode.children[temp + 1] !== void 0)
				bounding.ceiling = parentNode.children[temp + 1].offsetTop; // -2 element

		if(list.$virtual.preparedLength !== void 0 && cursor >= list.length - list.$virtual.preparedLength)
			bounding.floor = list.$virtual.dCursor.floor.offsetTop + list.$virtual.scrollHeight*2;
		else{
			if(parentNode.childElementCount <= self.prepareCount + 3)
				return;

			bounding.floor = parentNode.children[self.prepareCount + 3].offsetTop; // +2 element

			if(parentNode.sf$scroll_reduce_floor){
				bounding.floor -= parentNode.sf$scroll_reduce_floor;
				bounding.ceiling -= parentNode.sf$scroll_reduce_floor;
			}
		}

		bounding.ceiling -= bounding.initial;
		bounding.floor -= bounding.initial;// scrollHeight - clientHeight
	}

	function moveElementCursor(changes, list){
		var vDOM = list.$virtual.dom;
		var vCursor = list.$virtual.vCursor;
		var dCursor = list.$virtual.dCursor;

		if(changes > 0){ // forward
			var ref = 0;

			// Select from virtual ceiling cursor to Dom tree
			for (var i = 0; i < changes; i++) { // vDom -> Dom tree
				if(vCursor.ceiling === null)
					ref = vDOM.firstElementChild;

				else ref = vCursor.ceiling.nextElementSibling;
				if(ref === null) break;
				dCursor.floor.insertAdjacentElement('beforeBegin', ref);
			}

			// Move element on the ceiling to vDom
			for (var i = changes; i > 0; i--) { // Dom tree -> vDom
				if(vCursor.ceiling === null){
					vCursor.ceiling = dCursor.ceiling.nextElementSibling;
					vDOM.insertAdjacentElement('afterBegin', vCursor.ceiling);
				}
				else{
					ref = dCursor.ceiling.nextElementSibling;
					vCursor.ceiling.insertAdjacentElement('afterEnd', ref);
					vCursor.ceiling = ref;
				}
			}

			vCursor.floor = vCursor.ceiling.nextElementSibling;
		}
		else if(changes < 0){ // backward
			var ref = 0;
			changes = -changes;

			// Select from virtual floor cursor to Dom tree
			for (var i = 0; i < changes; i++) { // vDom -> Dom tree
				if(vCursor.floor === null)
					ref = vDOM.lastElementChild;

				else ref = vCursor.floor.previousElementSibling;
				if(ref === null) break;
				dCursor.ceiling.insertAdjacentElement('afterEnd', ref);
			}

			// Move element on the floor to vDom
			for (var i = 0; i < changes; i++) { // Dom tree -> vDom
				if(vCursor.floor === null){
					vCursor.floor = dCursor.floor.previousElementSibling;
					vDOM.insertAdjacentElement('beforeEnd', vCursor.floor);
				}

				else{
					ref = dCursor.floor.previousElementSibling;
					vCursor.floor.insertAdjacentElement('beforeBegin', ref);
					vCursor.floor = ref;
				}
			}

			vCursor.ceiling = vCursor.floor.previousElementSibling;
		}
	}

	function scrollTo(index, list, prepareCount, parentNode, scroller){
		var virtual = list.$virtual;
		var reduce = 0;
		var index_ = index;

		if(index >= list.length - virtual.preparedLength){
			reduce -= prepareCount;
			index = list.length - virtual.preparedLength;
		}

		if(index - virtual.DOMCursor === 0 || index >= list.length) return;

		scrollingByScript = true;

		// Already on DOM tree
		if((virtual.DOMCursor === 0 && index < prepareCount + prepareCount/2) ||
			(virtual.DOMCursor + prepareCount/2 > index
			&& virtual.DOMCursor + prepareCount < index))
				scroller.scrollTop = list.getElement(index_).offsetTop;

		// Move cursor
		else {
			var temp = null;
			var ceiling = virtual.dCursor.ceiling;
			var floor = virtual.dCursor.floor;
			var vCursor = virtual.vCursor;

			// DOM tree to virtual DOM
			var length = parentNode.childElementCount - 2;
			for (var i = 0; i < length; i++) {
				temp = ceiling.nextElementSibling;

				if(vCursor.floor === null){
					virtual.dom.insertAdjacentElement('beforeEnd', temp);

					if(i === length-1)
						vCursor.floor = temp;
				}
				else vCursor.floor.insertAdjacentElement('beforeBegin', temp);
			}

			if(index >= prepareCount){
				if(index < list.length - virtual.preparedLength)
					index -= prepareCount;
			}
			else{
				reduce = prepareCount - index;
				virtual.DOMCursor = index = 0;
			}

			var insertCount = virtual.preparedLength <= list.length ? virtual.preparedLength : list.length;

			// Virtual DOM to DOM tree
			for (var i = 0; i < insertCount; i++) {
				temp = virtual.dom.children[index];
				if(temp === void 0) break;

				floor.insertAdjacentElement('beforeBegin', temp);
			}
			virtual.DOMCursor = index;

			vCursor.floor = virtual.dom.children[index] || null;
			vCursor.ceiling = vCursor.floor ? vCursor.floor.previousElementSibling : null;

			if(list.$virtual.refreshVirtualSpacer)
				list.$virtual.refreshVirtualSpacer(index);

			refreshScrollBounding(index, virtual.bounding, list, parentNode);

			temp = parentNode.children[prepareCount - reduce + 1];
	
			if(temp !== void 0)
				scroller.scrollTop = temp.offsetTop - scroller.offsetTop;
		}

		scrollingByScript = false;
	}

	function removeUserScrollFocus(parentNode){
		parentNode.style.overflow = 'hidden';
		setTimeout(function(){
			parentNode.style.overflow = '';
		}, 50);
	}

	function getAbsoluteHeight(el){
	  var styles = window.getComputedStyle(el);
	  var margin = parseInt(styles['marginTop']) + parseInt(styles['marginBottom']);
	  return el.offsetHeight + margin || 0;
	}

	function obtainElements(list, parentNode){
		var exist = [];
		var temp = void 0;

		var length = list.$virtual.DOMCursor;
		for (var i = 0; i < length; i++) {
			temp = list.$virtual.dom.children[i];
			if(temp === void 0) break;
			exist.push(temp);
		}

		length = parentNode.childElementCount - 2;
		for (var i = 1; i <= length; i++) {
			temp = parentNode.children[i];
			if(temp === void 0) break;
			exist.push(temp);
		}
		
		// Get elements length
		var elementLength = list.$virtual.dom.childElementCount + length;

		length = elementLength - length - list.$virtual.DOMCursor;
		for (var i = 0; i < length; i++) {
			temp = list.$virtual.dom.children[list.$virtual.DOMCursor + i];
			if(temp === void 0) break;
			exist.push(temp);
		}

		return exist;
	}

	function refresh(force, list, prepareCount, parentNode, scroller, checkCursorPosition, refreshVirtualSpacer){
		var cursor = list.$virtual.DOMCursor;
		var additionalScroll = 0;

		// Find nearest cursor for current view position
		if(force){
			var i = -1;
			var length = list.$virtual.preparedLength;

			do{
				i++;
			} while(i < length && parentNode.children[i].offsetTop < scroller.scrollTop);

			cursor = cursor + i;
			if(cursor > 0) cursor -= 1;

			additionalScroll = scroller.scrollTop - parentNode.children[i].offsetTop;
		}

		// Force move cursor if element in the DOM tree was overloaded
		if(force || parentNode.childElementCount - 2 > list.$virtual.preparedLength){
			list.$virtual.DOMCursor = list.length;
			var moveTo = cursor;
			if(!force)
				moveTo = cursor <= prepareCount ? cursor : (cursor + prepareCount);

			scrollTo(moveTo,
				list,
				prepareCount,
				parentNode,
				scroller
			);

			scroller.scrollTop += additionalScroll;
		}

		if(refreshVirtualSpacer)
			refreshVirtualSpacer(cursor);

		if(checkCursorPosition)
			checkCursorPosition();

		refreshScrollBounding(cursor, list.$virtual.bounding, list, parentNode);
	}

	var _onElementResize = [];
	var _onElementResize_timer = -1;
	function onElementResize(parentNode, callback){
		if(_onElementResize_timer === -1){
			_onElementResize_timer = setInterval(function(){
				var temp = null;
				for (var i = _onElementResize.length - 1; i >= 0; i--) {
					temp = _onElementResize[i];

					// Check if it's removed from DOM
					if(!temp.element.isConnected){
						_onElementResize.splice(i, 1);
						continue;
					}

					// Check resize
					if(temp.element.scrollHeight === temp.height
						|| temp.element.scrollWidth === temp.width)
						continue;

					temp.callback();
				}

				if(_onElementResize.length === 0){
					clearInterval(_onElementResize_timer);
					_onElementResize_timer = -1;
				}
			}, 1000);
		}

		_onElementResize.push({
			element:parentNode,
			callback:callback,
			height:parentNode.scrollHeight,
			width:parentNode.scrollWidth
		});
	}

	function offElementResize(parentNode){
		for (var i = _onElementResize.length - 1; i >= 0; i--) {
			if(_onElementResize[i].element === parentNode)
				_onElementResize.splice(i, 1);
		}

		// Interval will be cleared when the array is empty
	}

	function initStyles(){
	}

	var styleInitialized = false;
	internal.addScrollerStyle = function(){
		if(!styleInitialized){
			var style = document.getElementById('sf-styles');

			if(!style){
				style = document.createElement('style');
				style.id = 'sf-styles';
				document.head.appendChild(style);
			}

			style.sheet.insertRule(
			'.sf-virtual-list .virtual-spacer{'+
			    'visibility: hidden !important;'+
			    'position: relative !important;'+
			    'transform-origin: 0 0 !important;'+
			    'width: 0 !important;'+
			    'margin: 0 !important;'+
			    'padding: 0 !important;'+
			    'background: none !important;'+
			    'border: none !important;'+
			    'box-shadow: none !important;'+
			    'transition: none !important;'+
			 '}', style.sheet.cssRules.length);

			style.sheet.insertRule(
			'.sf-scroll-element {'+
			 	'backface-visibility: hidden;'+
			 '}', style.sheet.cssRules.length);
			styleInitialized = true;
		}
	}

	var isScroller = /auto|scroll|overlay|hidden/;
	internal.findScrollerElement = function(el){
		while(el !== null && isScroller.test(getComputedStyle(el).overflow) === false){
			el = el.parentNode;
			if(el === document.body)
				return null;
		};

		return el;
	}
};
return sf;

// ===== Module End =====
})));