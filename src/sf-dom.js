sf.dom = function(selector, context){
	if(selector == null)
		selector = {length:0};
	else if(selector[0] === '<' || selector[selector.length-1] === '>') 
		selector = sf.dom.parseElement(selector);
	else if(context)
		selector = context.querySelectorAll(selector);
	else if(selector.constructor === String)
		selector = document.querySelectorAll(selector);
	else selector = {0:selector, length:1};

	Object.assign(selector, sf.dom.fn);
	return selector;
}

var $ = sf.dom; // Shortcut

;(function(){
	var self = sf.dom;

	function appendObjectArray(obj, arr){
		for (var i = 0; i < arr.length; i++)
			obj[obj.length++] = arr[i];
	}

	var css_str = /\-[a-z0-9]/;
	var css_strRep = function(f, m){return m.toUpperCase()};

	self.fn = {
		push:function(el){
			if(el.constructor !== Array)
				el = [el];

			var t = {length:0};
			appendObjectArray(t, this);
			appendObjectArray(t, el);
			Object.assign(t, internal.dom.extends_Dom7);

			return t;
		},
		find:function(selector){
			var t = {length:0};
			for (var i = 0; i < this.length; i++)
				appendObjectArray(t, this[i].querySelectorAll(selector));
			return Object.assign(t, self.fn);
		},
		parent:function(selector){
			var t = {length:0};
			for (var i = 0; i < this.length; i++)
				appendObjectArray(t, self.parent(this[i], selector));
			return Object.assign(t, self.fn);
		},
		prevAll:function(selector){
			var t = {length:0};
			for (var i = 0; i < this.length; i++)
				appendObjectArray(t, self.prevAll(this[i], selector));
			return Object.assign(t, self.fn);
		},
		nextAll:function(selector){
			var t = {length:0};
			for (var i = 0; i < this.length; i++)
				appendObjectArray(t, self.nextAll(this[i], selector, true));
			return Object.assign(t, self.fn);
		},
		children:function(selector){
			var t = {length:0};
			for (var i = 0; i < this.length; i++)
				appendObjectArray(t, this[i].children);
			return Object.assign(t, self.fn);
		},

		// Action only
		addClass:function(name){
			for (var i = 0; i < this.length; i++)
				this[i].classList.add(...name.split(' '));
			return this;
		},
		removeClass:function(name){
			for (var i = 0; i < this.length; i++)
				this[i].classList.remove(...name.split(' '));
			return this;
		},
		toggleClass:function(name){
			for (var i = 0; i < this.length; i++)
				this[i].classList.toggle(...name.split(' '));
			return this;
		},
		hasClass:function(name){
			for (var i = 0; i < this.length; i++)
				if(this[i].classList.contains(name))
					return true;
			return false;
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
		animateCSS:function(){
			for (var i = 0; i < this.length; i++)
				self.on(this[i], event, selector, callback, true);
			return this;
		},
	};

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
			if(findNodes === false && element.matches(selector) === true)
				result.push(element);
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
			var tempCallback = callback;
			callback = function(ev){
				if(self.parent(ev.target, selector) !== null)
					tempCallback(ev);
			}
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

	self.animateCSS = function(element, animationName, callback, duration) {
		var animationEnd = {
			animation: 'animationend',
			OAnimation: 'oAnimationEnd',
			MozAnimation: 'mozAnimationEnd',
			WebkitAnimation: 'webkitAnimationEnd',
		};

		for (var t in animationEnd){
			if(element.style[t] !== void 0){
				animationEnd = animationEnd[t];
				break;
			}
		}

		if(duration){
			element.style.webkitAnimationDuration = duration+'s';
			element.style.animationDuration = duration+'s';
		}

		var list = ('animated ' + animationName).split(' ');
		element.classList.add.apply(element.classList, list);
		$.once(element, animationEnd, function(){
			element.classList.remove.apply(element.classList, list);
			
			if(duration) setTimeout(function(){
				element.style.webkitAnimationDuration = duration+'s';
				element.style.animationDuration = duration+'s';
			}, 1);

			if(typeof callback === 'function') callback();
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
	}, 1);

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

	internal.dom = {};
	internal.dom.extends_Dom7 = {
		push:function(el){
			this[this.length] = el;
			this.length++;
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
	};

})();