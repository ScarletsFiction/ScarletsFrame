(function(global, factory){
  // Dynamic script when using router to load template
  // Feature is disabled by default
  function routerEval(code){eval(code)}

  if(typeof exports === 'object' && typeof module !== 'void 0') module.exports = factory(global, routerEval);
  else global.sf = factory(global, routerEval);
}(typeof window !== "void 0" ? window : this, (function(window, routerEval){'use strict';
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
	validFunctionCall:/[a-zA-Z0-9 \]\$\)]/,
	strictVar:'(?=\\b[^.]|^|\\n| +|\\t|\\W )',
	escapeHTML:/(?!&#.*?;)[\u00A0-\u9999<>\&]/gm,

	uniqueDataParser:/{{((@|#[\w])[\s\S]*?)}}/g,
	dataParser:/{{([^@%][\s\S]*?)}}/g,

	arrayItemsObserve:/\b_model_\.([a-zA-Z0-9.['\]]+)(?:$|[^'\]])/g,
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
// ==== ES5 Polyfill ====
if(typeof Object.assign != 'function'){
  Object.defineProperty(Object, "assign", {
    value: function assign(target, varArgs) {
      'use strict';
      if (target == null)
        throw new TypeError('Cannot convert void 0 or null to object');
      var to = Object(target);
      for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];
        if (nextSource != null) {
          for (var nextKey in nextSource) {
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey))
              to[nextKey] = nextSource[nextKey];
          }
        }
      }
      return to;
    },
    writable: true,
    configurable: true
  });
}

if(console.group === void 0)
  console.group = console.groupCollapsed = console.groupEnd = function(){};


if(Element.prototype.remove === void 0 || CharacterData.prototype.remove === void 0 || DocumentType.prototype.remove === void 0){
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

if(!Element.prototype.matches){
  Element.prototype.matches = (Element.prototype).matchesSelector ||
    (Element.prototype).mozMatchesSelector || (Element.prototype).msMatchesSelector ||
    (Element.prototype).oMatchesSelector || (Element.prototype).webkitMatchesSelector ||
    function (s) {
      var matches = (this.document || this.ownerDocument).querySelectorAll(s),
      i = matches.length;
      while (--i >= 0 && matches.item(i) !== this){}
      return i > -1;
    };
}

if(!NodeList.prototype.forEach){
    NodeList.prototype.forEach = function (callback, thisArg) {
        thisArg = thisArg || window;
        for (var i = 0; i < this.length; i++) {
            callback.call(thisArg, this[i], i, this);
        }
    };
}

if(!window.location.origin)
  window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');

if(!Object.values)
  Object.values = function(obj){
    var res = [];
    for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
            res.push(obj[i]);
        }
    }
    return res;
  }

if(Object.setPrototypeOf === void 0)
  Object.setPrototypeOf = function(obj, proto) {
    obj.__proto__ = proto;
    return obj; 
  }

var Reflect_Construct = null;
if(typeof Reflect !== 'undefined')
  Reflect_Construct = Reflect.construct;
else 
  Reflect_Construct = function(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) _setPrototypeOf(instance, Class.prototype); return instance; };
sf.dom = function(selector, context){
	if(selector[0] === '<') return sf.dom.parseElement(selector);
	if(selector.constructor !== String) return selector;

	if(context) return context.querySelectorAll(selector);
	return document.querySelectorAll(selector);
}

var $ = sf.dom; // Shortcut

;(function(){
	var self = sf.dom;

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
	 * @param  string  	selector    selector
	 * @return null
	 */
	self.off = function(element, event, selector){
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

		// Remove listener
		if(element.sf$eventListener === void 0)
			return;

		var ref = element.sf$eventListener;
		if(ref !== void 0 && ref[event] !== void 0){
			for (var i = ref[event].length - 1; i >= 0; i--) {
				if(selector && ref[event][i].selector !== selector)
					continue;

				element.removeEventListener(event, ref[event].splice(i, 1), true);
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

	setTimeout(function(){
		if(self.totalContent === 0 && !self.turnedOff){
			self.loadedContent = self.totalContent = 1;
			console.warn("If you don't use content loader feature, please turn it off with `sf.loader.off()`");
		}
	}, 10000);


	var isQueued = false;
	var lastState = '';
	document.addEventListener("load", function domLoadEvent(event){
		// Add processing class to queued element
		if(isQueued === false && document.body){
			document.removeEventListener('load', domLoadEvent, true);

			isQueued = sf.model.queuePreprocess(document.body);
			if(isQueued.length === 0) isQueued = false;

			if(lastState === 'loading'){
				var repeatedList = $('[sf-repeat-this]', document.body);

				// Find images
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

			if(isQueued === false)
				isQueued = sf.model.queuePreprocess(document.body);

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

		// Last init
		sf.controller.init();
		sf.model.init(document.body, isQueued);

		isQueued = null;
	}
}
sf.prototype.constructor = sf.loader.onFinish;
sf.component = new function(){
	var self = this;
	var scope = internal.component = {};
	self.registered = {};
	self.available = {};

	var bases = {};
	var events = {};

	self.for = function(name, func, extend){
		if(!sf.loader.DOMWasLoaded)
			return sf(function(){
				self.for(name, func);
			});

		if(self.registered[name] === void 0)
			self.registered[name] = [func, sf.controller.pending[name], 0, false, extend];
		self.registered[name][0] = func;
		delete sf.controller.pending[name];

		defineComponent(name);
	}

	self.event = function(name, func){
		events[name] = func;
	}

	self.base = function(name, func){
		bases[name] = func;
	}

	self.html = function(name, outerHTML){
		if(!sf.loader.DOMWasLoaded)
			return sf(function(){
				self.html(name, outerHTML);
			});

		if(self.registered[name] === void 0)
			self.registered[name] = [false, false, 0, false];

		var temp = $.parseElement(outerHTML);
		if(temp.length === 1){
			self.registered[name][3] = temp[0];
			return;
		}

		var tempDOM = document.createElement('div');
		tempDOM.tempDOM = true;
		for (var i = 0; i < temp.length; i++) {
			tempDOM.appendChild(temp[i]);
		}
		self.registered[name][3] = tempDOM;
	}

	scope.triggerEvent = function(name, event, obj){
		if(events[name] === void 0 || events[name][event] === void 0)
			return;

		events[name][event](obj, event);
	}

	var tempDOM = document.createElement('div');
	self.new = function(name, element, $item, isCreated, retriggered){
		if(isCreated === true){
			if(sf.loader.DOMWasLoaded === false)
				return sf(function(){
					self.new(name, element, $item, isCreated, false);
				});

			if(element.childElementCount === 0){
				if(self.registered[name][3] === false)
					return setTimeout(function(){
						self.new(name, element, $item, isCreated, true);
					}, 0);
			}

			if(element.hasAttribute('sf-component-ignore') === true)
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
		}

		var newElement = element === void 0;
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

		var newObj = sf.model.root[newID] = {};
		self.registered[name][0](newObj, sf.model, $item, element);

		var extend = self.registered[name][4];
		if(extend !== void 0){
			if(extend.constructor === Array){
				for (var i = 0; i < extend.length; i++) {
					if(bases[extend[i]] === void 0)
						return console.error("'"+extend[i]+"' base is not found");
					bases[extend[i]](newObj, sf.model, $item, element);
				}
			}
			else{
				if(bases[extend] === void 0)
					return console.error("'"+extend+"' base is not found");
				bases[extend](newObj, sf.model, $item, element);
			}
		}

		if(self.registered[name][1])
			self.registered[name][1](newObj, sf.model, $item, element);

		scope.triggerEvent(name, 'created', newObj);

		if(newElement !== true && isCreated !== true){
			componentInit(element, newID, name);
			element.model = sf.model.root[newID];
			return newID;
		}

		if(element.childElementCount === 0){
			var temp = self.registered[name][3];

			if(temp.tempDOM === true){
				temp = temp.cloneNode(true).childNodes;
				for (var i = 0, n = temp.length; i < n; i++) {
					element.appendChild(temp[0]);
				}
			}
			else element.appendChild(temp.cloneNode(true));
		}

		if(element.parentNode === null){
			// Wrap to temporary vDOM
			tempDOM.appendChild(element);
			componentInit(element, newID, name);
			sf.model.init(element);
			element = tempDOM.firstElementChild;
			element.remove();
		}
		else if(isCreated === true){
			componentInit(element, newID, name);
			sf.model.init(element);
		}

		element.model = sf.model.root[newID];
		element.destroy = function(){
			if(this.parentElement === null)
				internal.model.DOMNodeRemoved(this);
			else this.remove();
		}
		return element;
	}

	function componentInit(element, newID, from){
		element.setAttribute('sf-controller', '');
		element.sf$component = newID;
		element.sf$componentFrom = from;
	}

	var HTMLElement = window.HTMLElement;
	var customElements = window.customElements;

	var HTMLElement_wrap = (function(Class){
		function Wrapper(){
			return Reflect_Construct(Class, arguments, Object.getPrototypeOf(this).constructor);
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
		var func = eval("function "+name+"($item){var he = HTMLElement_wrap.call(this);self.new(tagName, he, $item, true, false);return he}"+name);
		func.prototype = Object.create(HTMLElement.prototype);
		func.prototype.constructor = func;
		func.__proto__ = HTMLElement;

		func.prototype.connectedCallback = function(){
			scope.triggerEvent(name, 'connected', this);
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

(function(){
	var self = sf.model;
	var scope = internal.model = {};
	var bindingEnabled = false;
	self.root = {};
	internal.modelPending = {};

	var processingElement = null;

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
	var bracketMatch = /([\w.]*?[\S\s])\(/g;
	var chackValidFunctionCall = sf.regex.validFunctionCall;
	var localEval = function(script, _model_, _modelScope, _content_){
		"use strict";

		// ==== Security check ====
		var preventExecution = false;

		// Remove all inner quotes
		avoidQuotes(script, function(tempScript){
			// Prevent vulnerability by remove bracket to avoid a function call
			var check_ = null;
			while((check_ = bracketMatch.exec(tempScript)) !== null){
				check_[1] = check_[1].trim();

				if(allowedFunctionEval[check_[1]] || check_[1].split('.')[0] === '_modelScope')
					continue;

				if(tempScript.indexOf('var '+check_[1]) !== -1 || tempScript.indexOf('let '+check_[1]) !== -1)
					continue;

				bracketMatch.lastIndex = 0;
				preventExecution = check_[1];
				break;
			}
		}, true);

		if(preventExecution){
			console.groupCollapsed("%c<-- Expand the template error", 'color: yellow');
			console.log(trimIndentation(processingElement.outerHTML).trim());
			console.log("%c"+trimIndentation(script).trim(), 'color: yellow');
			console.groupEnd();

			console.error("Trying to executing unrecognized function ("+preventExecution+")");
			return '#TemplateError';
		}
		// ==== Security check ended ====
	
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

	// Escape the escaped quote
	function escapeEscapedQuote(text){
		return text.split('\\"').join('\\$%*').split("\\'").join('\\%$*');
	}

	function unescapeEscapedQuote(text){
		return text.split('\\$%*').join('\\"').split('\\%$*').join("\\'");
	}

	function elseIfHandle(else_, scopes){
		var elseIf = else_.elseIf;

		// Else if
		for (var i = 0; i < elseIf.length; i++) {
			// Check the condition
			scopes[0] = elseIf[i][0];
			if(!localEval.apply(self.root, scopes))
				continue;

			// Get the value
			scopes[0] = elseIf[i][1];
			return localEval.apply(self.root, scopes);
		}

		// Else
		if(else_.elseValue === null)
			return '';

		scopes[0] = else_.elseValue;
		return localEval.apply(self.root, scopes);
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
			ref.data[1] = item;

			// Direct evaluation type
			if(ref.type === REF_DIRECT){
				temp = localEval.apply(self.root, ref.data);
				if(temp === void 0)
					console.error('`'+ref.data[0]+'` was not defined');
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
				parsed[i] = {type:ref.type, data:localEval.apply(self.root, ref.data)};
				continue;
			}

			// Conditional type
			if(ref.type === REF_IF){
				var scopes = ref.data;
				parsed[i] = {type:ref.type, data:''};
				scopes[0] = ref.if[0];

				// If condition was not meet
				if(!localEval.apply(self.root, scopes)){
					parsed[i].data = elseIfHandle(ref, scopes);
					continue;
				}

				scopes[0] = ref.if[1];
				parsed[i].data = localEval.apply(self.root, scopes);
			}
		}
		return parsed;
	}

	var templateParser = function(template, item, original){
		if(template.component !== void 0){
			var html = new template.component(item);
			html.setAttribute('sf-bind-list', template.list);
			return html;
		}

		processingElement = template.html;

		var html = original === true ? template.html : template.html.cloneNode(true);
		var addresses = template.addresses;
		var parsed = templateExec(template.parse, item);

		// Save model item reference to node
		html.model = item;

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

	// For contributor of this library
	// Please be careful when you're passing the eval argument
	var dataParser = function(html, _model_, mask, scope, runEval, preParsedReference){
		var _modelScope = self.root[scope];
		if(!runEval) runEval = '';

		// Don't match text inside quote, or object keys
		var scopeMask = RegExp(sf.regex.strictVar+'('+self.modelKeys(_modelScope).join('|')+')\\b', 'g');

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
			}).split('_model_._modelScope.').join('_model_.').split('._modelScope.').join('.');

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
			preParsed = _modelScope = _model_ = mask = scope = runEval = scopeMask = itemMask = html = null;
			setTimeout(function(){prepared = null}, 1);
		}
		return prepared;
	}

	// Dynamic data parser
	var uniqueDataParser = function(html, _model_, mask, scope, runEval){
		// Get prepared html content
		var _content_ = {
			length:0,
			take:function(passVar, currentIndex){
				if(passVar === null)
					return dataParser(this[currentIndex], _model_, mask, scope);

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
				return dataParser(this[currentIndex], _model_, mask, scope, strDeclare + ';');
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

		var _modelScope = self.root[scope];

		// Don't match text inside quote, or object keys
		var scopeMask = RegExp(sf.regex.strictVar+'('+self.modelKeys(_modelScope).join('|')+')\\b', 'g');

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
			}).split('_model_._modelScope.').join('_model_.');

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
					elseIf.data = [null, _model_, _modelScope, _content_];

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
			setTimeout(function(){prepared = null}, 1);
			return [prepared, preParsedReference, _content_];
		}

		return prepared;
	}

	var bindArray = function(template, list, mask, modelName, propertyName, targetNode, parentNode, tempDOM){
		var editProperty = ['pop', 'push', 'splice', 'shift', 'unshift', 'swap', 'move', 'replace', 'softRefresh', 'hardRefresh'];
		var refreshTimer = -1;
		var parentChilds = parentNode.children;
		var isKeyed = parentNode.classList.contains('sf-keyed-list');

		// Update callback
		var modelRef = self.root[modelName];
		var eventVar = 'on$'+propertyName;
		var callback = modelRef[eventVar];

		var processElement = function(index, options, other, count){
			// Find boundary for inserting to virtual DOM
			if(list.$virtual){
				var vStartRange = list.$virtual.DOMCursor;
				var vEndRange = vStartRange + list.$virtual.preparedLength;
			}

			if(options === 'clear'){
				if(list.$virtual)
					var spacer = [parentNode.firstElementChild, parentNode.lastElementChild];

				parentNode.textContent = '';

				if(list.$virtual){
					parentNode.appendChild(spacer[0]);
					parentNode.appendChild(spacer[1]);
					list.$virtual.dom.textContent = '';
					spacer[1].style.height = 
					spacer[0].style.height = 0;
					list.$virtual.reset(true);
				}
				return;
			}

			// Avoid multiple refresh by set a timer
			if(list.$virtual){
				var exist = list.$virtual.elements();

				clearTimeout(refreshTimer);
				refreshTimer = setTimeout(function(){
					if(list.$virtual) // Somewhat it's uninitialized
						list.$virtual.reinitScroll();
				}, 100);
			}
			else exist = parentChilds;

			// Hard refresh - Append element
			if(options === 'hardRefresh'){
				// Clear siblings after the index
				for (var i = index; i < exist.length; i++) {
					exist[i].remove();
				}

				if(list.$virtual)
					var vCursor = list.$virtual.vCursor;

				for (var i = index; i < list.length; i++) {
					var temp = templateParser(template, list[i]);
					if(list.$virtual){
						if(vCursor.floor === null && i < vEndRange)
							parentNode.insertBefore(temp, parentNode.lastElementChild);
						else list.$virtual.dom.appendChild(temp);
					}
					else parentNode.appendChild(temp);

					if(isKeyed === false)
						syntheticCache(temp, template, list[i]);
				}

				if(list.$virtual && list.$virtual.refreshVirtualSpacer)
					list.$virtual.refreshVirtualSpacer(list.$virtual.DOMCursor);
				return;
			}

			if(callback === void 0)
				callback = modelRef[eventVar];

			if(options === 'swap' || options === 'move'){
				if(options === 'move'){
					var overflow = list.length - index - count;
					if(overflow < 0)
						count += overflow;

					// Move to virtual DOM
					var vDOM = document.createElement('div');
					for (var i = 0; i < count; i++) {
						vDOM.appendChild(exist[index + i]);
					}

					var nextSibling = exist[other] || null;
					var theParent = nextSibling && nextSibling.parentNode;

					if(theParent === false){
						if(list.$virtual && list.length >= vEndRange)
							theParent = list.$virtual.dom;
						else theParent = parentNode;
					}

					// Move to defined index
					for (var i = 0; i < count; i++) {
						theParent.insertBefore(vDOM.firstElementChild, nextSibling);

						if(callback !== void 0 && callback.update)
							callback.update(exist[index + i], 'move');
					}
					return;
				}

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

				if(callback !== void 0 && callback.update){
					callback.update(exist[other], 'swap');
					callback.update(exist[index], 'swap');
				}
				return;
			}

			// Clear unused element if current array < last array
			if(options === 'removeRange'){
				for (var i = index; i < other; i++) {
					exist[i].remove();
				}
				return;
			}

			// Remove
			if(options === 'remove'){
				if(exist[index]){
					var currentEl = exist[index];

					if(callback !== void 0 && callback.remove){
						var currentRemoved = false;
						var startRemove = function(){
							if(currentRemoved) return;
							currentRemoved = true;

							currentEl.remove();
						};

						// Auto remove if return false
						if(!callback.remove(exist[index], startRemove))
							startRemove();
					}

					// Auto remove if no callback
					else currentEl.remove();
				}
				return;
			}

			// Update
			else if(options === 'update'){
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

					var temp = templateParser(template, list[i]);
					if(isKeyed === false)
						syntheticCache(temp, template, list[i]);

					if(list.$virtual){
						oldChild.parentNode.replaceChild(temp, oldChild);
						continue;
					}

					parentNode.replaceChild(temp, oldChild);
					if(callback !== void 0 && callback.update)
						callback.update(temp, 'replace');
				}
			}

			var item = list[index];
			if(item === void 0) return;

			var temp = templateParser(template, item);
			if(isKeyed === false)
				syntheticCache(temp, template, item);

			// Create
			if(options === 'insertAfter'){
				if(exist.length === 0)
					parentNode.insertBefore(temp, parentNode.lastElementChild);
				else{
					var referenceNode = exist[index - 1];
					referenceNode.parentNode.insertBefore(temp, referenceNode.nextSibling);
				}

				if(callback !== void 0 && callback.create)
					callback.create(temp);
			}
			else if(options === 'prepend'){
				var referenceNode = exist[0];
				if(referenceNode !== void 0){
					referenceNode.parentNode.insertBefore(temp, referenceNode);

					if(callback !== void 0 && callback.create)
						callback.create(temp);
				}
				else options = 'append';
			}
			if(options === 'append'){
				if(list.$virtual){
					if(index === 0) // Add before virtual scroller
						parentNode.insertBefore(temp, parentNode.lastElementChild);
					else if(index >= vEndRange){ // To virtual DOM
						if(list.$virtual.vCursor.floor === null)
							list.$virtual.vCursor.floor = temp;

						list.$virtual.dom.appendChild(temp);
					}
					else // To real DOM
						exist[index-1].insertAdjacentElement('afterEnd', temp);

					if(callback !== void 0 && callback.create)
						callback.create(temp);
					return;
				}

				parentNode.appendChild(temp);
				if(callback !== void 0 && callback.create)
					callback.create(temp);
			}
		}

		var _double_zero = [0,0]; // For arguments
		var propertyProxy = function(subject, name){
			Object.defineProperty(subject, name, {
				enumerable: false,
				configurable: true,
				value: function(){
					var temp = void 0;
					var lastLength = this.length;

					if(name === 'move'){
						var from = arguments[0];
						var to = arguments[1];
						if(from === to) return;
						var count = arguments[2] || 1;
						processElement(from, 'move', to, count);

						var temp = Array.prototype.splice.apply(this, [from, count]);
						temp.unshift(to, 0);
						Array.prototype.splice.apply(this, temp);

						// Reset virtual ceiling and floor
						if(list.$virtual)
							list.$virtual.reinitCursor();
						return;
					}

					if(name === 'swap'){
						var i = arguments[0];
						var o = arguments[1];
						if(i === o) return;
						processElement(i, 'swap', o);
						var temp = this[i];
						this[i] = this[o];
						this[o] = temp;
						return;
					}

					else if(name === 'replace'){
						if(list.$virtual)
							list.$virtual.resetViewport();

						// Check if item has same reference
						if(arguments[0].length >= lastLength && lastLength !== 0){
							var matchLeft = lastLength;
							var ref = arguments[0];

							for (var i = 0; i < lastLength; i++) {
								if(ref[i] === this[i]){
									matchLeft--;
									continue;
								}
								break;
							}

							// Add new element at the end
							if(matchLeft === 0){
								if(ref.length === lastLength) return;

								var temp = arguments[0].slice(lastLength);
								temp.unshift(lastLength, 0);
								this.splice.apply(this, temp);
								return;
							}

							// Add new element at the middle
							else if(matchLeft !== lastLength){
								if(arguments[1] === true){
									var temp = arguments[0].slice(i);
									temp.unshift(i, lastLength - i);
									Array.prototype.splice.apply(this, temp);

									list.refresh(i, lastLength);
								}
								return;
							}
						}

						// Build from zero
						if(lastLength === 0){
							Array.prototype.push.apply(this, arguments[0]);
							processElement(0, 'hardRefresh');
							return;
						}

						// Clear all items and merge the new one
						var temp = [0, lastLength];
						Array.prototype.push.apply(temp, arguments[0]);
						Array.prototype.splice.apply(this, temp);

						// Rebuild all element
						if(arguments[1] !== true || isKeyed){
							processElement(0, 'clear');
							processElement(0, 'hardRefresh');
						}

						// Reuse some element
						else{
							// Clear unused element if current array < last array
							if(this.length < lastLength)
								processElement(this.length, 'removeRange', lastLength);

							// And start refreshing
							list.refresh(0, this.length);

							if(list.$virtual && list.$virtual.refreshVirtualSpacer)
								list.$virtual.refreshVirtualSpacer(list.$virtual.DOMCursor);
						}

						// Reset virtual list
						if(list.$virtual)
							list.$virtual.reset();

						return this;
					}

					else if(name === 'splice' && arguments[0] === 0 && arguments[1] === void 0){
						processElement(0, 'clear');
						return Array.prototype.splice.apply(this, arguments);
					}

					if(Array.prototype[name])
						temp = Array.prototype[name].apply(this, arguments);

					if(name === 'pop')
						processElement(this.length, 'remove');

					else if(name === 'push'){
						if(arguments.length === 1)
							processElement(lastLength, 'append');
						else{
							for (var i = 0; i < arguments.length; i++) {
								processElement(lastLength + i, 'append');
							}
						}
					}

					else if(name === 'shift'){
						processElement(0, 'remove');

						if(list.$virtual && list.$virtual.DOMCursor > 0){
							list.$virtual.DOMCursor--;
							list.$virtual.reinitCursor();
						}
					}

					else if(name === 'splice'){
						if(arguments[0] === 0 && arguments[1] === void 0)
							return temp;

						// Removing data
						var real = arguments[0];
						if(real < 0) real = lastLength + real;

						var limit = arguments[1];
						if(!limit && limit !== 0) limit = this.length;

						for (var i = limit - 1; i >= 0; i--) {
							processElement(real + i, 'remove');
						}

						if(list.$virtual && list.$virtual.DOMCursor >= real)
							list.$virtual.DOMCursor = real - limit;

						if(arguments.length >= 3){ // Inserting data
							limit = arguments.length - 2;

							// Trim the index if more than length
							if(real >= this.length)
								real = this.length - 1;

							for (var i = 0; i < limit; i++) {
								processElement(real + i, 'insertAfter');
							}

							if(list.$virtual && list.$virtual.DOMCursor >= real)
								list.$virtual.DOMCursor += limit;
						}
					}

					else if(name === 'unshift'){
						if(arguments.length === 1)
							processElement(0, 'prepend');
						else{
							for (var i = arguments.length - 1; i >= 0; i--) {
								processElement(i, 'prepend');
							}
						}

						if(list.$virtual && list.$virtual.DOMCursor !== 0){
							list.$virtual.DOMCursor += arguments.length;
							list.$virtual.reinitCursor();
						}
					}

					else if(name === 'softRefresh'){
						processElement(arguments[0], 'update', arguments[1]);

						if(list.$virtual && list.$virtual.DOMCursor)
							list.$virtual.reinitCursor();
					}

					else if(name === 'hardRefresh'){
						processElement(arguments[0] || 0, 'hardRefresh');

						if(list.$virtual)
							list.$virtual.DOMCursor = arguments[0] || 0;
					}

					return temp;
				}
			});
		}

		if(parentNode && parentNode.classList.contains('sf-virtual-list')){
			delete list.$virtual;
			list.$virtual = {};

			// Transfer virtual DOM
			list.$virtual.dom = tempDOM;
			if(callback !== void 0)
				list.$virtual.callback = callback;
			else list.$virtual.callback_ = {ref:modelRef, var:eventVar};

			parentNode.replaceChild(template.html, parentChilds[1]);
			sf.internal.virtual_scroll.handle(list, targetNode, parentNode);
			template.html.remove();
		}
		else{
			setTimeout(function(){
				var scroller = internal.findScrollerElement(parentNode);

				if(scroller === null) return;

				var computed = getComputedStyle(scroller);
				if(computed.backfaceVisibility === 'hidden' || computed.overflow.indexOf('hidden') !== -1)
					return;

				scroller.classList.add('sf-scroll-element');
				internal.addScrollerStyle();
			}, 1000);
		}

		for (var i = 0; i < editProperty.length; i++) {
			propertyProxy(list, editProperty[i]);
		}

		// Todo: Enable auto item binding
		if(false && list.auto !== false){
			// for (var i = 0; i < list.length; i++) {
			// 	list[i]
			// }
		}

		hiddenProperty(list, '$replace', function(index, key, needle, func){
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
		});

		hiddenProperty(list, 'refresh', function(index, length, property){
			if(index === void 0 || index.constructor === String){
				property = index;
				index = 0;
				length = list.length;
			}
			else if(length === void 0) length = index + 1;
			else if(length.constructor === String){
				property = length;
				length = index + 1;
			}
			else if(length < 0) length = list.length + length;
			else length += index;

			// Trim length
			var overflow = list.length - length;
			if(overflow < 0) length = length + overflow;

			for (var i = index; i < length; i++) {
				var elem = list.getElement(i);

				// Create element if not exist
				if(elem === void 0){
					list.hardRefresh(i);
					break;
				}
				else{
					if(isKeyed === true)
						list.softRefresh(i);
					else if(syntheticTemplate(elem, template, property, list[i]) === false)
						continue; // Continue if no update
				}

				if(callback !== void 0 && callback.update)
					callback.update(elem, 'replace');
			}
		});

		var virtualChilds = null;
		if(list.$virtual)
			virtualChilds = list.$virtual.dom.children;
		hiddenProperty(list, 'getElement', function(index){
			if(virtualChilds !== null){
				var ret = void 0;
				if(index < list.$virtual.DOMCursor)
					return virtualChilds[index];
				else {
					index -= list.$virtual.DOMCursor;
					var childElement = parentNode.childElementCount - 2;

					if(index < childElement)
						return parentChilds[index + 1];
					else
						return virtualChilds[index - childElement + list.$virtual.DOMCursor];
				}

				return void 0;
			}

			return parentChilds[index];
		});
	}

	var loopParser = function(name, template, script, targetNode, parentNode){
		var method = script.split(' in ');
		var mask = method[0];

		var items = root_(name)[method[1]];
		if(items === void 0)
			items = root_(name)[method[1]] = [];

		template.setAttribute('sf-bind-list', method[1]);

		// Get reference for debugging
		processingElement = template;
		template = self.extractPreprocess(template, mask, name);

		if(method.length === 2){
			var isKeyed = parentNode.classList.contains('sf-keyed-list');
			var tempDOM = document.createElement('div');
			var modelRef = self.root[name];

			for (var i = 0; i < items.length; i++) {
				var elem = templateParser(template, items[i]);
				tempDOM.appendChild(elem);

				if(isKeyed === false)
					syntheticCache(elem, template, items[i]);
			}

			// Enable element binding
			if(modelRef.sf$bindedKey === void 0)
				initBindingInformation(modelRef);

			if(modelRef.sf$bindedKey[method[1]] === void 0)
				modelRef.sf$bindedKey[method[1]] = null;

			Object.defineProperty(modelRef, method[1], {
				enumerable: true,
				configurable: true,
				get:function(){
					return items;
				},
				set:function(val){
					if(val.length === 0)
						return items.splice(0);
					return items.replace(val, true);
				}
			});

			bindArray(template, items, mask, name, method[1], targetNode, parentNode, tempDOM);

			// Output to real DOM if not being used for virtual list
			if(items.$virtual === void 0){
				var children = tempDOM.children;
				for (var i = 0, n = children.length; i < n; i++) {
					parentNode.appendChild(children[0]);
				}

				tempDOM.remove();
				tempDOM = null;
			}
		}
	}

	var callInputListener = function(model, property, value){
		var callback = model['on$'+property];
		var v2m = model['v2m$'+property];
		var newValue1 = void 0; var newValue2 = void 0;
		if(callback !== void 0 || v2m !== void 0){
			var old = model[property];
			if(old !== null && old !== void 0 && old.constructor === Array)
				old = old.slice(0);

			try{
				if(v2m !== void 0)
					newValue1 = v2m(old, value);

				if(callback !== void 0)
					newValue2 = callback(old, value);
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
		select:function(model, property, element){
			var list = element.options;
			var typeData = element.typeData;
			var arrayValue = model[property].constructor === Array ? model[property] : false;
			for (var i = 0, n = list.length; i < n; i++) {
				if(arrayValue === false){
					if(typeData === String)
						list[i].selected = list[i].value === model[property];
					else list[i].selected = list[i].value == model[property];
				}
				else list[i].selected = arrayValue.indexOf(typeData === Number ? Number(list[i].value) : list[i].value) !== -1;
			}
		},
		checkbox:function(model, property, element){
			if(model[property].constructor === Array)
				element.checked = model[property].indexOf(element.typeData === Number ? Number(element.value) : element.value) !== -1;
			else if(model[property].constructor === Boolean)
				element.checked = Boolean(model[property]);
			else{
				if(element.typeData === String)
					element.checked = element.value === model[property];
				else element.checked = element.value == model[property];
			}
		}
	}

	var inputBoundRun = function(model, property, elements){
		for (var i = 0; i < elements.length; i++) {
			if(inputBoundRunning === elements[i])
				continue; // Avoid multiple assigment

			var ev = new Event('change');
			ev.fromSFFramework = true;

			if(elements.type === 1) // text
				elements[i].value = model[property];
			else if(elements.type === 2) // select options
				assignElementData.select(model, property, elements[i]);
			else if(elements.type === 3) // radio
				elements[i].checked = model[property] == elements[i].value;
			else if(elements.type === 4) // checkbox
				assignElementData.checkbox(model, property, elements[i]);

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

		var type = 0;
		var typeData = null;
		if(model[property] !== null && model[property] !== void 0)
			typeData = model[property].constructor;

		var assignedType = (element.getAttribute('typedata') || '').toLowerCase();
		if(assignedType === 'number')
			typeData = Number;

		element.typeData = typeData;
		$.on(element, 'change', triggerInputEvent);

		// Bound value change
		if(element.tagName === 'TEXTAREA'){
			$.on(element, 'input', inputTextBound);
			element.value = model[property];
			type = 1;
		}

		else if(element.selectedOptions !== void 0){
			$.on(element, 'input', inputSelectBound);
			type = 2;

			assignElementData.select(model, property, element);
		}

		else{
			var type = element.type.toLowerCase();
			if(type === 'radio'){
				$.on(element, 'input', inputTextBound);
				type = 3;

				element.checked = model[property] == element.value;
			}
			else if(type === 'checkbox'){
				$.on(element, 'input', inputCheckBoxBound);
				type = 4;

				assignElementData.checkbox(model, property, element);
			}

			else if(type === 'file'){
				$.on(element, 'input', inputFilesBound);
				return;
			}

			else{
				$.on(element, 'input', inputTextBound);
				element.value = model[property];
				type = 1;
			}
		}

		if(oneWay === true) return;
		modelToViewBinding(model, property, inputBoundRun, element, type);
	}

	var bindInput = function(targetNode){
		var temp = $('input[sf-bound], textarea[sf-bound], select[sf-bound], input[sf-bind], textarea[sf-bind], select[sf-bind]', targetNode);

		for (var i = 0; i < temp.length; i++) {
			var element = temp[i];
			var model = sf.controller.modelName(element);
			if(!model) return;
			var modelScope = self.root[model];

			var oneWay = false;
			var propertyName = element.getAttribute('sf-bound');
			if(propertyName === null){
				propertyName = element.getAttribute('sf-bind');
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
				console.error('Can\'t get property "'+propertyName+'" on model "' + model + '"');
				return;
			}

			element.sfBounded = propertyName;
			element.sfModel = modelScope;
			if(oneWay === false){
				element.setAttribute('sf-bounded', '');
				element.removeAttribute('sf-bound');
			}
			else{
				element.setAttribute('sf-binded', '');
				element.removeAttribute('sf-bind');
			}

			elementBoundChanges(modelScope, propertyName, element, oneWay);
		}
	}

	var alreadyInitialized = false;
	self.init = function(targetNode, queued){
		if(alreadyInitialized && !targetNode) return;
		alreadyInitialized = true;
		setTimeout(function(){
			alreadyInitialized = false;
		}, 50);

		if(!targetNode) targetNode = document.body;

		// Handle Router Start ==>
		if(internal.router.enabled === true){
			// Before model binding
			var temp = $('[sf-controller]', targetNode);
			var sfPage = [];

			for (var i = 0; i < temp.length; i++) {
				var modelName = temp[i].getAttribute('sf-controller') || temp[i].sf$component;
				var model = self.root[modelName] || sf.model(modelName);
				if(model.$page === void 0){
					model.$page = window.$([]);

					if(model.$page.push === void 0)
						Object.assign(model.$page.__proto__, internal.dom.extends_Dom7);
				}

				model.$page.push(temp[i]);

				if(sf.controller.pending[modelName] !== void 0)
					sf.controller.run(modelName);

				if(model.init !== void 0)
					model.init(temp[i]);
			}

			// When the model was binded with the view
			internal.afterModelBinding = function(){
				for (var i = 0; i < sfPage.length; i++) {
					internal.routerLocalEvent('when', temp[i]);
				}

				internal.afterModelBinding = undefined;
			}
		}
		// <== Handle Router End

		self.parsePreprocess(queued || self.queuePreprocess(targetNode), queued);
		bindInput(targetNode);

		// Find element for array binding
		repeatedListBinding($('[sf-repeat-this]', targetNode), targetNode, queued);

		// Used by router
		if(internal.afterModelBinding !== undefined)
			internal.afterModelBinding();
	}

	function repeatedListBinding(temp, targetNode, queued, controller_){
		for (var a = 0; a < temp.length; a++) {
			var element = temp[a];
			var parent = element.parentElement;

			if(queued !== void 0)
				element.classList.remove('sf-dom-queued');

			if(parent.classList.contains('sf-virtual-list')){
				var ceiling = document.createElement(element.tagName);
				ceiling.classList.add('virtual-spacer');
				var floor = ceiling.cloneNode(true);

				ceiling.classList.add('ceiling');
				parent.insertBefore(ceiling, parent.firstElementChild); // prepend

				floor.classList.add('floor');
				parent.appendChild(floor); // append
			}

			var after = element.nextElementSibling;
			if(after === null || element === after)
				after = false;

			var before = element.previousElementSibling;
			if(before === null || element === before)
				before = false;

			var script = element.getAttribute('sf-repeat-this');
			element.removeAttribute('sf-repeat-this');

			// Check if the element was already bound to prevent vulnerability
			if(/sf-bind-key|sf-bind-list/.test(element.outerHTML))
				throw "Can't parse element that already bound";

			if(controller_ !== void 0)
				var controller = controller_;
			else{
				var controller = sf.controller.modelName(element);
				if(controller === void 0) continue;
			}

			loopParser(controller, element, script, targetNode, parent);
			element.remove();
		}
	}

	// Reset model properties
	// Don't call if the removed element is TEXT or #comment
	var DOMNodeRemoved = scope.DOMNodeRemoved = function(element, isScan){
		if(isScan === void 0){
			var temp = element.querySelectorAll('[sf-controller]');
			for (var i = 0; i < temp.length; i++) {
				DOMNodeRemoved(temp[i], true);
			}
		}

		if(element.hasAttribute('sf-controller') !== false){
			var modelName = element.sf$component === void 0 ? element.getAttribute('sf-controller') : element.sf$component;
			var model = sf.model.root[modelName];

			if(model.$page){
				var i = model.$page.indexOf(element);
				if(i !== -1)
					model.$page.splice(i)
			}

			if(model.destroy)
				model.destroy(element);

			removeModelBinding(modelName);
			if(element.sf$component !== void 0){
				var modelFrom = element.sf$componentFrom;
				var components = sf.component.available[modelFrom];
				components.splice(components.indexOf(modelName), 1);
				internal.component.triggerEvent(modelFrom, 'removed', self.root[modelName]);
				delete self.root[modelName];
			}
			return;
		}
	}

	sf(function(){
		var everyRemovedNodes = function(nodes){
			if(nodes.nodeType !== 1 || nodes.firstElementChild === null)
				return;

			if(nodes.sf$elementReferences !== void 0) return;
			DOMNodeRemoved(nodes);
		}

		if(typeof MutationObserver === 'function' && MutationObserver.prototype.observe){
			var everyRecords = function(record){
				record.removedNodes.forEach(everyRemovedNodes);
			}

			var observer = new MutationObserver(function(records){
				if(!bindingEnabled) return;
				records.forEach(everyRecords);
			});

			observer.observe(document.body, { childList: true, subtree: true });
		}
		else {
			document.body.addEventListener('DOMNodeRemoved', function(e){
				if(!bindingEnabled) return;
				everyRemovedNodes(e.target);
			});
		}
	});

	var removeModelBinding = self.reset = function(modelName){
		var ref = self.root[modelName];
		if(ref === void 0)
			return;

		var bindedKey = ref.sf$bindedKey;
		var temp = null;
		for(var key in bindedKey){
			delete bindedKey[key];

			if(ref[key] === void 0 || ref[key] === null)
				continue;

			if(ref[key].constructor === String ||
				ref[key].constructor === Number ||
				ref[key].constructor === Boolean
			){/* Ok */}

			else if(ref[key].constructor === Array){
				if(ref[key].$virtual){
					ref[key].$virtual.destroy();
					delete ref[key].$virtual;
				}

				// Reset property without copying the array
				temp = ref[key].splice('obtain');
				delete ref[key];
				ref[key] = temp;
			}
			else continue;

			if(Object.getOwnPropertyDescriptor(ref, key) === void 0)
				continue;

			// Reconfigure / Remove property descriptor
			var temp = ref[key];
			delete ref[key];
			ref[key] = temp;
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
					var m2v = model['m2v$'+propertyName];
					var out = inputBoundRunning === false ? model['out$'+propertyName] : void 0;
					var callback = inputBoundRunning === false ? model['on$'+propertyName] : void 0;

					if(callback !== void 0 || m2v !== void 0 || out !== void 0){
						var newValue1 = void 0; var newValue2 = void 0; var newValue3 = void 0;
						try{
							if(m2v !== void 0)
								newValue1 = m2v(objValue, val);

							if(out !== void 0)
								newValue2 = out(objValue, val);

							if(callback !== void 0)
								newValue3 = callback(objValue, val);
						}catch(e){console.error(e)}

						objValue = (newValue3 !== void 0 ? newValue3 : 
							(newValue2 !== void 0 ? newValue2 : 
							(newValue1 !== void 0 ? newValue1 : val)
						));
					}
					else objValue = val;

					var ref = model.sf$bindedKey[propertyName];
					for (var i = 0; i < ref.length; i++) {
						if(inputBoundRun === ref[i]){
							ref[i](model, propertyName, ref.input);
							continue;
						}
						ref[i]();
					}
				}

				inputBoundRunning = false;
				return objValue;
			}
		});
	}

	var dcBracket = /{{[^#][\s\S]*?}}/;
	self.bindElement = function(element){
		var modelName = sf.controller.modelName(element);
		var model = self.root[modelName];
		if(!model) return console.error("Model for "+modelName+" was not found while binding:", element);

		var data = self.extractPreprocess(element, null, modelName);
		templateParser(data, model, true);
		delete data.addresses;
		element.parentNode.replaceChild(data.html, element);

		element = data.html;

		var onChanges = function(){
			if(syntheticTemplate(element, data, void 0, model) === false)
				0; //No update
		};

		var properties = data.modelRef_array;
		for (var i = 0; i < properties.length; i++) {
			var propertyName = properties[i][0];

			if(model[propertyName] === void 0)
				model[propertyName] = '';

			modelToViewBinding(model, propertyName, onChanges);
		}
	}

	self.extractPreprocess = function(targetNode, mask, name){
		// Check if it's component
		var tagName = targetNode.tagName.toLowerCase();
		if(sf.component.registered[tagName] !== void 0){
			targetNode.parentNode.classList.add('sf-keyed-list');
			targetNode.textContent = '';
			targetNode.remove();
			targetNode.setAttribute('sf-component-ignore', '');
			return {
				component:window['$'+capitalizeLetters(tagName.split('-'))],
				list:targetNode.getAttribute('sf-bind-list')
			};
		}

		// Remove repeated list from further process
		var backup = targetNode.querySelectorAll('[sf-repeat-this]');
		for (var i = 0; i < backup.length; i++) {
			var current = backup[i];
			current.insertAdjacentHTML('afterEnd', '<sfrepeat-this id="'+i+'"></sfrepeat-this>');
			current.remove();
		}

		var copy = targetNode.outerHTML;

		// Mask the referenced item
		if(mask !== null)
			copy = copy.split('#'+mask).join('_model_');
		else{ // Replace all masked item
			copy.replace(/sf-repeat-this="(?:\W+|)(\w+)/g, function(full, match){
				copy = copy.split('#'+match).join('_model_');
				copy = copy.replace(RegExp(sf.regex.strictVar+"("+match+")\\b", 'g'), '_model_');
			});
		}

		// Extract data to be parsed
		copy = uniqueDataParser(copy, null, mask, name, '#noEval');
		var preParsed = copy[1];
		var _content_ = copy[2];
		copy = dataParser(copy[0], null, mask, name, '#noEval', preParsed);

		function findModelProperty(){
			if(mask === null){ // For model items
				// Get model keys and sort by text length, make sure the longer one is from first index to avoid wrong match
				var extract = RegExp('(?:{{.*?\\b|_modelScope\\.)('+self.modelKeys(self.root[name]).sort(function(a, b){
					return b.length - a.length
				}).join('|')+')(\\b.*?}}|)', 'g');
			}
			else var extract = sf.regex.arrayItemsObserve; // For array items
			var found = {};

			for (var i = 0; i < preParsed.length; i++) {
				var current = preParsed[i];

				// Text or attribute
				if(current.type === 0){
					current.data[0].split('"').join("'").replace(extract, function(full, match){
						match = match.replace(/\['(.*?)'\]/g, function(full_, match_){
							return '.'+match_;
						});

						if(found[match] === void 0) found[match] = [i];
						else if(found[match].indexOf(i) === -1)
							found[match].push(i);
					});
					continue;
				}

				// Dynamic data
				if(current.type === 1){
					var checkList = current.if.join(';');

					if(current.elseValue !== null)
						checkList += ';' + current.elseValue;

					for (var a = 0; a < current.elseIf.length; a++) {
						checkList += current.elseIf[a].join(';');
					}
				}
				else if(current.type === 2)
					var checkList = current.data[0];

				checkList = checkList.replace(/_result_ \+= _content_\.take\(.*?, ([0-9]+)\);/g, function(full, match){
					return _content_[match];
				});

				// console.log(99, checkList);
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
		copy = $.parseElement(copy)[0];

		// Restore element repeated list
		var restore = copy.querySelectorAll('sfrepeat-this');
		for (var i = 0; i < restore.length; i++) {
			var current = restore[i];
			current.parentNode.replaceChild(backup[current.id], current);
		}

		// Start addressing
		var nodes = self.queuePreprocess(copy, true).reverse();
		var addressed = [];

		function addressAttributes(currentNode){
			var attrs = currentNode.attributes;
			var keys = [];
			var indexes = 0;
			for (var a = 0; a < attrs.length; a++) {
				var found = attrs[a].value.split('{{%=');
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

		return {
			html:copy,
			parse:preParsed,
			addresses:addressed,
			modelReference:modelReference,
			modelRef_array:asArray
		};
	}

	var enclosedHTMLParse = false;
	var excludes = ['HTML','HEAD','STYLE','LINK','META','SCRIPT','OBJECT','IFRAME'];
	self.queuePreprocess = function(targetNode, extracting){
		var childNodes = (targetNode || document.body).childNodes;

		var temp = [];
		for (var i = childNodes.length - 1; i >= 0; i--) {
			var currentNode = childNodes[i];

			if(extracting === void 0 && excludes.indexOf(currentNode.nodeName) !== -1)
				continue;

			if(currentNode.nodeType === 1){ // Tag
				if(enclosedHTMLParse === true) continue;
				var attrs = currentNode.attributes;

				// Skip element and it's childs that already bound to prevent vulnerability
				if(attrs['sf-bind-key'] || attrs['sf-repeat-this'] || attrs['sf-bind-list'] || currentNode.sf$elementReferences !== void 0)
					continue;

				for (var a = 0; a < attrs.length; a++) {
					if(attrs[a].value.indexOf('{{') !== -1){
						temp.push(currentNode);
						break;
					}
				}

				Array.prototype.push.apply(temp, self.queuePreprocess(currentNode, extracting));
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
						temp.push(currentNode.parentNode);
						break;
					}

					temp.push(currentNode);
				}
			}
		}

		return temp;
	}

	self.parsePreprocess = function(nodes, queued){
		for (var a = 0; a < nodes.length; a++) {
			// Get reference for debugging
			var current = processingElement = nodes[a];

			var modelElement = sf.controller.modelElement(current);
			if(modelElement === null)
				continue;

			var model = modelElement.sf$component === void 0 ? modelElement.getAttribute('sf-controller') : modelElement.sf$component;

			if(queued !== void 0)
				current.classList.remove('sf-dom-queued');

			if(internal.modelPending[model] || self.root[model] === undefined)
				self(model);

			var modelRef = self.root[model];

			// Double check if the child element already bound to prevent vulnerability
			if(/sf-bind-key|sf-bind-list/.test(current.innerHTML)){
				console.error("Can't parse element that already bound");
				console.log(processingElement.cloneNode(true));
				return;
			}

			if(current.hasAttribute('sf-bind-ignore') === false)
				self.bindElement(current);
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
})();
sf.API = function(method, url, data, success, complete, accessToken, getXHR){
	if(typeof data !== 'object')
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
		if(element.nodeType === 1 && element.hasAttribute('sf-controller') === true)
			return element;

		return $.parent(element, '[sf-controller]');
	}

	self.modelName = function(element){
		var name = self.modelElement(element);
		if(name === null){
			console.error("Can't find any controller for", element);
			return;
		}

		name = name.sf$component === void 0? name.getAttribute('sf-controller') : name.sf$component;

		// Initialize it first
		if(name !== void 0 && !self.active[name])
			self.run(name);

		return name;
	}

	var listenSFClick = function(e){
		var element = e.target;
		var script = element.getAttribute('sf-click');

		if(!script){
			element = $.parent(element, '[sf-click]');
			script = element.getAttribute('sf-click');
		}

		var model = $.parent(element, '[sf-controller]');
		model = model.sf$component === void 0 ? model.getAttribute('sf-controller') : model.sf$component;
		var _modelScope = sf.model.root[model];

		if(_modelScope === void 0)
			throw "Couldn't find model for "+model+" that was called from sf-click";

		var modelKeys = sf.model.modelKeys(_modelScope).join('|');
		script = avoidQuotes(script, function(script_){
			return script_.replace(RegExp(sf.regex.strictVar+'('+modelKeys+')\\b', 'g'), function(full, matched){
				return '_modelScope.'+matched;
			});
		});

		script = script.split('(');

		var method = script.shift();
		var method_ = method;

		// Get method reference
		try{
			method = eval(method);
		} catch(err) {
			console.error("Error on sf-click for model: " + model + ' [Cannot call `'+method_+'`]\n', element, err);
			return;
		}

		// Take the argument list
		script = script.join('(');
		script = script.split(')');
		script.pop();
		script = script.join('(');

		// Turn argument as array
		if(script.length !== 0){
			// Replace `this` to `element`
			script = eval(('['+script+']').replace(/,this|\[this/g, function(found){
				return found[0] + 'element';
			}));
		}
		else script = [e];

		try{
			method.apply(element, script);
			e.preventDefault();
		} catch(e) {
			console.error("Error on sf-click for model: " + model + '\n', element, '\n', e);
		}
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
		if(!sf.loader.DOMWasLoaded)
			return sf(function(){
				self.init(parent);
			});

		var temp = $('[sf-controller]', parent || document.body);
		for (var i = 0; i < temp.length; i++) {
			self.run(temp[i].sf$component === void 0? temp[i].getAttribute('sf-controller') : temp[i].sf$component);
		}
	}

	// Create listener for sf-click
	document.addEventListener('DOMContentLoaded', function(){
		$.on(document.body, 'click', '[sf-click]', listenSFClick);
		self.init();
	}, {capture:true, once:true});
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
        document.querySelector('head').appendChild(script_1);
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

	function Events(name, run){
		if(name.constructor === Array){
			for (var i = 0; i < name.length; i++)
				Events(name[i], run);

			return;
		}

		if(Events[name] === void 0){
			var active = void 0;

			if(run !== undefined && run.constructor === Boolean)
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
								callback[i].splice(i--, 1);
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

		if(callbacks[name].length >= 10)
			console.warn("Events have more than 10 callback, there may possible memory leak.");

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
	var value = diveObject(self.list[self.default], path);

	if(obj !== void 0 && obj.constructor === Function){
		callback = obj;
		obj = void 0;
	}

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
					pendingCallback[i](diveObject(defaultLang, pendingCallback[i].path));
				}

				pendingCallback.length = 0;
			},
			error:self.onError,
		});
	}, 500);

	return path;
}

function diveFill(obj1, obj2){
	var keys = Object.keys(obj2);
	for (var i = 0; i < keys.length; i++) {
		if(obj1[keys[i]] === void 0)
			obj1[keys[i]] = obj2[keys[i]];
		else
			diveFill(obj1[keys[i]], obj2[keys[i]]);
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
				refreshLang(pendingElement, true);
			},
			error:self.onError,
		});
	}

	if(pending !== false && self.serverURL === false)
		console.warn("Some language was not found, and the serverURL was set to false");
}

function diveObject(obj, path, setValue){
	var parts = path.split('.');
	for (var i = 0, n = parts.length-1; i < parts.length; i++) {
		var key = parts[i];

		if(setValue === void 0){ // get only
	    	if(obj[key] === void 0)
	    		return;

	    	obj = obj[key];
		}
		else{ // set if undefined
			if(i === n){
				obj[key] = setValue;
				return;
			}
			else obj = obj[key] = {};
		}
    }

    return obj;
}

function refreshLang(list, noPending){
	var defaultLang = self.list[self.default];

	for (var i = list.length-1; i >= 0; i--) {
		if(list[i].sf_lang === self.default){
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
	for(var keys in hashes)
		hashes_ += '#'+keys+hashes[keys];

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

	// Reparse URL
	sf.url.parse();
	var list = self.list;

	if(window.history.state >= historyIndex)
		routeDirection = 1;
	else
		routeDirection = -1;

	historyIndex += routeDirection;

	// console.warn('historyIndex', historyIndex, window.history.state, routeDirection > 0 ? 'forward' : 'backward');

	// For root path
	list[slash].goto(sf.url.paths);

	// For hash path
	var keys = Object.keys(aHashes);
	for (var i = 0; i < keys.length; i++) {
		var temp = list[keys[i]];
		if(temp === void 0) continue;

		temp.goto(aHashes[keys[i]]);
	}

	disableHistoryPush = false;
}, false);

// Listen to every link click
sf(function(){
	$.on(document.body, 'click', 'a[href]', function(ev){
		ev.preventDefault();

		var elem = ev.target;
		var attr = elem.getAttribute('href');

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
	var pattern = /\/:([^/]+)/;
	var sep = /\-/;
    var knownKeys = /path|url|templateURL|html|on|routes|beforeRoute|defaultData/;

	function addRoutes(obj, addition, selector, parent){
		if(selector !== '')
			selector += ' ';

		for(var i = 0; i < obj.length; i++){
            var ref = obj[i];
			var current = addition+ref.path;

			if(ref.routes !== void 0){
				addRoutes(ref.routes, current, selector, parent);
				continue;
			}

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
				dom.style.display = 'none';
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

	var self = sf.views.list[name] = this;
	var pendingAutoRoute = void 0;

	// Init current URL as current View Path
	if(name === slash)
		self.currentPath = sf.url.paths;
	else{
		self.currentPath = '';
		pendingAutoRoute = aHashes[name] || void 0;
	}

	var initialized = false;
	var selectorElement = {};

	self.lastPath = '/';
	self.currentDOM = null;
	self.lastDOM = null;
	self.relatedDOM = [];
	self.data = void 0;

	self.maxCache = 2;

	var rootDOM = {};
	self.selector = function(selector_, isChild){
		initialized = true;

		var DOM = (isChild || (rootDOM.isConnected ? rootDOM : document)).querySelector(selector_ || selector);

		if(!DOM) return false;

		if(DOM.viewInitialized)
			return false;

		// Create listener for link click
		if(DOM){
			if(selector_)
				selector = selector_;

			// Bring the content to an sf-page-view element
			if(DOM.childNodes.length !== 0){
				if(DOM.childNodes.length === 1 && DOM.firstChild.nodeName === '#text' && DOM.firstChild.textContent.trim() === ''){
					var temp = null;
					DOM.firstChild.remove();
				}
				else{
					var temp = document.createElement('sf-page-view');
					DOM.insertBefore(temp, DOM.firstChild);

					for (var i = 1, n = DOM.childNodes.length; i < n; i++) {
						temp.appendChild(DOM.childNodes[1]);
					}

					temp.routePath = self.currentPath;
					temp.routeCached = routes.findRoute(temp.routePath);
					temp.classList.add('page-current');
					self.relatedDOM.push(temp);
				}
			}
			else var temp = null;

			DOM.viewInitialized = true;

			if(!isChild){
				self.currentDOM = temp;
				rootDOM = DOM;
			}
			else{
				selectorElement[selector_] = DOM;
				return DOM;
			}

			return true;
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
		routes.push(...internal.router.parseRoutes(obj, selectorList));

		if(!initialized){
			self.selector();

			if(name === slash && !rootDOM.childElementCount){
				var target = self.currentPath;
				self.currentPath = '';
				self.goto(target);
			}

			if(pendingAutoRoute !== void 0){
				self.goto(pendingAutoRoute);
				pendingAutoRoute = void 0;
			}
		}
	}

	var RouterLoading = false; // xhr reference if the router still loading

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

		var parent = element.parentElement;
		while(parent !== rootDOM && parent !== null){
			if(parent.nodeName === pageViewNodeName)
				relatedPage.unshift(parent);

			parent = parent.parentElement;
		}

		var lastSibling = void 0;
		var parentSimilarity = void 0;

		for (var i = 0; i < self.relatedDOM.length; i++) {
			if(relatedPage.indexOf(self.relatedDOM[i]) === -1){
				if(lastSibling === void 0){
					lastSibling = self.relatedDOM[i];
					parentSimilarity = lastSibling.parentElement;
				}

				// self.relatedDOM[i].classList.add('page-hidden');
				self.relatedDOM[i].classList.remove('page-current');
			}
		}

		var showedSibling = void 0;
		for (var i = 0; i < relatedPage.length; i++) {
			if(showedSibling === void 0 && relatedPage[i].parentElement === parentSimilarity)
				showedSibling = relatedPage[i];

			relatedPage[i].classList.add('page-current');
			// relatedPage[i].classList.remove('page-hidden');
		}

		self.showedSibling = showedSibling;
		self.lastSibling = lastSibling;

		element.classList.add('page-current');
		// element.classList.remove('page-hidden');

		self.relatedDOM = relatedPage;
	}

	self.goto = function(path, data, method, _callback){
		if(self.currentPath === path)
			return;

		// Get template URL
		var url = routes.findRoute(path);
		if(!url) return;

		if(url.beforeRoute !== void 0)
			url.beforeRoute(url.data);

		if(name === slash)
			sf.url.paths = path;
		else
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

		function insertLoadedElement(DOMReference, dom, parentElement, pendingShowed){
			if(parentElement)
				dom.parentPageElement = parentElement;

			dom.routerData = null;
			if(dom.firstChild.nodeName === '#comment' && dom.firstChild.textContent.indexOf(' SF-View-Data') === 0){
				dom.routerData = JSON.parse(dom.firstChild.textContent.slice(14));
				dom.firstChild.remove();
			}

			// Let page script running first
			DOMReference.insertAdjacentElement('beforeend', dom);
			self.data = url.data;

			try{
				if(self.dynamicScript !== false){
					var scripts = dom.getElementsByTagName('script');
					for (var i = 0; i < scripts.length; i++) {
					    gEval(scripts[i].text);
					}
				}

				// Parse the DOM data binding
				sf.model.init(dom);
			}catch(e){
				console.error(e);
				dom.remove();
				return routeError_({status:0});
			}

			self.data = url.data;

			if(url.on !== void 0 && url.on.coming)
				url.on.coming(url.data);

			dom.removeAttribute('style');
			toBeShowed(dom);

			var tempDOM = self.currentDOM;
			self.currentDOM = dom;

			// Trigger loaded event
			var event = onEvent['routeFinish'];
			for (var i = 0; i < event.length; i++) {
				if(event[i](self.currentPath, path, url.data)) return;
			}

			if(pendingShowed !== void 0)
				self.relatedDOM.push(...pendingShowed);

			if(tempDOM !== null){
				self.lastPath = self.currentPath;

				// Old route
				if(tempDOM.routeCached.on !== void 0 && tempDOM.routeCached.on.leaving)
					tempDOM.routeCached.on.leaving();

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
				parent.firstElementChild.remove();
			}
		}

		var afterDOMLoaded = function(dom){
			if(url.selector === void 0)
				var DOMReference = rootDOM;

			else{ // Get element from selector
				var DOMReference = selectorElement[selectorList[url.selector]];
				if(!DOMReference || !DOMReference.isConnected){
					if(url.parent === void 0){
						dom.remove();
						return routeError_({status:0});
					}
					else{
						// Try to load parent router first
						var newPath = path.match(url.parent.forChild)[0];
						return self.goto(newPath, false, method, function(parentElement){
							insertLoadedElement(selectorElement[selectorList[url.selector]], dom, parentElement);
						});
					}
				}
			}

			if(url.hasChild){
				var pendingShowed = [];
				for (var i = 0; i < url.hasChild.length; i++) {
					selectorElement[url.hasChild[i]] = self.selector(url.hasChild[i], dom);
					var tempPageView = selectorElement[url.hasChild[i]].firstElementChild;

					if(tempPageView)
						pendingShowed.unshift(tempPageView);
				}

				if(pendingShowed.length === 0)
					pendingShowed = void 0;
			}
			else var pendingShowed = void 0;

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
					console.error("Views request was received <html> while it was dissalowed. Please check http response from Network Tab.");
					return routeError_(1);
				}

				// Create new element
				var dom = document.createElement('sf-page-view');
				dom.innerHTML = html_content;
				dom.classList.add('page-prepare');
				dom.style.display = 'none';

				if(url.templateURL !== void 0)
					cachedURL[url.templateURL] = dom.cloneNode(true);

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

		if(self.currentDOM.routeCached.on !== void 0 && self.currentDOM.routeCached.on.coming)
			self.currentDOM.routeCached.on.coming();

		toBeShowed(cachedDOM);

		var event = onEvent['routeCached'];
		for (var i = 0; i < event.length; i++) {
			if(event[i](self.currentPath, self.lastPath)) return;
		}

		// Trigger reinit for the model
		var reinitList = self.currentDOM.querySelectorAll('[sf-controller]');
		var models = sf.model.root;
		for (var i = 0; i < reinitList.length; i++) {
			var modelName = reinitList[i].getAttribute('sf-controller') || reinitList[i].sf$component;
			if(models[modelName].reinit)
				models[modelName].reinit();
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

	var ref = self.list[slash];
	if(ref !== void 0 && ref.currentPath !== parsed.paths && !ref.goto(parsed.paths))
		console.error("Couldn't navigate to", parsed.paths, "because path not found");

	var hashes = parsed.hashes;
	for (var i = 0, view = Object.keys(hashes); i < view.length; i++) {
		ref = self.list[view[i]];

		if(ref !== void 0 && ref.currentPath !== hashes[view[i]])
			ref.goto(hashes[view[i]]);
	}
}

})();
sf.internal.virtual_scroll = new function(){
	var self = this;
	var scrollingByScript = false;

	// before and after
	self.prepareCount = 4; // 4, 8, 12, 16, ...

	self.handle = function(list, targetNode, parentNode){
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

			delete list.$virtual;
		}

		virtual.resetViewport = function(){
			virtual.visibleLength = Math.floor(scroller.clientHeight / virtual.scrollHeight);
			virtual.preparedLength = virtual.visibleLength + self.prepareCount * 2;

			if(virtual.preparedLength < 18)
				virtual.preparedLength = 18;
		}

		var pendingFunction = internal.afterModelBinding;
		internal.afterModelBinding = undefined;

		setTimeout(function(){
			if(list.$virtual === undefined) return; // Somewhat it's uninitialized

			scroller = internal.findScrollerElement(parentNode);
			scroller.classList.add('sf-scroll-element');
			internal.addScrollerStyle();

			virtual.resetViewport();

			if(parentNode.classList.contains('sf-list-dynamic')){
				dynamicList = true;
				dynamicHeight(list, targetNode, parentNode, scroller);
			}
			else staticHeight(list, targetNode, parentNode, scroller);

			if(pendingFunction !== undefined){
				pendingFunction();
				pendingFunction = undefined;
			}
		}, 500);
	}

	// Recommended for a list that have different element height
	function dynamicHeight(list, targetNode, parentNode, scroller){
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

		if(virtual.callback_ !== void 0){
			var callback_ = virtual.callback_;
			delete virtual.callback_;
		}

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

			if(virtual.callback !== void 0 && list.length !== 0){
				if(virtual.callback.hitFloor && virtual.vCursor.floor === null &&
					scroller.scrollTop + scroller.clientHeight === scroller.scrollHeight
				){
					virtual.callback.hitFloor(virtual.DOMCursor);
				}
				else if(virtual.callback.hitCeiling && virtual.vCursor.ceiling === null && scroller.scrollTop === 0){
					virtual.callback.hitCeiling(virtual.DOMCursor);
				}
			}
			else if(callback_ && callback_.ref[callback_.var]){
				virtual.callback = callback_.ref[callback_.var];
				callback_ = null;
			}

			updating = false;
			if(scroller.scrollTop === 0 && ceiling.offsetHeight > 10)
				virtual.scrollTo(0);
		}

		$.on(scroller, 'scroll', checkCursorPosition);
		onElementResize(parentNode, function(){
			refreshScrollBounding(virtual.DOMCursor, bounding, list, parentNode);
		});
	}

	// Recommended for a list that have similar element height
	function staticHeight(list, targetNode, parentNode, scroller){
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

		if(virtual.callback_ !== void 0){
			var callback_ = virtual.callback_;
			delete virtual.callback_;
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

			if(virtual.callback !== void 0 && list.length !== 0){
				if(virtual.callback.hitFloor && virtual.vCursor.floor === null){
					virtual.callback.hitFloor(cursor);
				}
				else if(virtual.callback.hitCeiling && virtual.vCursor.ceiling === null){
					virtual.callback.hitCeiling(cursor);
				}
			}
			else if(callback_ && callback_.ref[callback_.var]){
				virtual.callback = callback_.ref[callback_.var];
				callback_ = null;
			}

			updating = false;
		}

		$.on(scroller, 'scroll', checkCursorPosition);

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
			bounding.floor = parentNode.children[self.prepareCount + 3].offsetTop; // +2 element

			if(parentNode.hasAttribute('scroll-reduce-floor')){
				bounding.floor -= parentNode.getAttribute('scroll-reduce-floor');
				bounding.ceiling -= parentNode.getAttribute('scroll-reduce-floor');
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

					// Check resize
					if(temp.element.scrollHeight === temp.height
						|| temp.element.scrollWidth === temp.width)
						continue;

					// Check if it's removed from DOM
					if(temp.element.parentElement === null){
						_onElementResize.splice(i, 1);
						continue;
					}

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
			el = el.parentElement;
			if(el === document.body)
				return null;
		};

		return el;
	}
};
return sf;

// ===== Module End =====
})));