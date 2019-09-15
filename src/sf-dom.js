sf.dom = function(selector, context){
	if(!selector){
		if(selector === void 0){
			var temp = function(sel) {return temp.find(sel)};
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
	else if(selector.constructor !== Array)
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

	var css_str = /\-[a-z0-9]/;
	var css_strRep = function(f, m){return m.toUpperCase()};

	// ToDo: Optimize performance by using `length` check instead of `for` loop
	self.fn = DOMList.prototype = {
		push:function(el){
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
				return new DOMList(this[0].parentElement);
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
				return this[0][name];

			for (var i = 0; i < this.length; i++)
				this[i][name] = value;

			return this;
		},
		attr:function(name, value){
			if(value === void 0)
				return this[0].getAttribute(name);

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
				return this[0].style[name];

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
			for (var i = 0; i < this.length; i++)
				self.on(this[i], event, selector, callback);
			return this;
		},
		off:function(event, selector, callback){
			for (var i = 0; i < this.length; i++)
				self.off(this[i], event, selector, callback);
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
				callback(this[i], i, this);
			return this;
		},
		data:function(key, value){
			if(value === void 0)
				return this[0].$data ? this[0].$data[key] : void 0;

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
			var parent = el.parentElement;
			parent.insertBefore(this[0], el.nextSibling);

			for (var i = 1; i < this.length; i++)
				parent.insertBefore(this[i], this[i-1]);
			return this;
		},
		insertBefore:function(el){
			var parent = el.parentElement;
			for (var i = 0; i < this.length; i++)
				parent.insertBefore(this[i], el);
			return this;
		},

		text:function(text){
			if(text === void 0)
				return this[0].innerText;

			for (var i = 0; i < this.length; i++)
				this[i].innerText = text;
			return this;
		},
		html:function(text){
			if(text === void 0)
				return this[0].innerHTML;

			for (var i = 0; i < this.length; i++)
				this[i].innerHTML = text;
			return this;
		},
		val:function(text){
			if(text === void 0)
				return this[0].value;

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

	self.parent = function(element, selector){
		if(element.closest) return element.closest(selector);

		do {
			if(element.matches(selector) === true)
				return element;

			element = element.parentElement;
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

		var animationEnd = null;

		if(element.style.animation !== void 0)
			animationEnd = 'animationend';

		if(element.style.WebkitAnimation !== void 0)
			animationEnd = 'webkitAnimationEnd';

	  	var style = element.style;
		var arrange = animationName;

		if(duration === void 0 || duration.constructor === Number)
			duration = {
				duration:duration && duration.constructor === Number ? duration : 0.6,
				ease:'ease',
				fill:'both'
			};

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
				if(callback !== void 0) callback();
				return;
			}

			element.classList.add('anim-element');

			if(element.parentElement !== null){
				var origin = (element.offsetLeft + element.offsetWidth/2)+'px' + (element.offsetTop + element.offsetHeight/2)+'px';
				var parentStyle = element.parentElement.style;
				element.parentElement.classList.add('anim-parent');
				parentStyle.webkitPerspectiveOrigin = parentStyle.perspectiveOrigin = origin;
			}

			self.once(element, animationEnd, function(){
				setTimeout(function(){
					if(element.parentElement !== null){
						style.visibility = '';
						element.classList.remove('anim-element');
						style.webkitAnimation = style.animation = '';

						var parentStyle = element.parentElement.style;
						parentStyle.webkitPerspectiveOrigin = parentStyle.perspectiveOrigin = '';
					}
				});

				if(callback !== void 0) callback();
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
			documentElement = document.body.parentElement;
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