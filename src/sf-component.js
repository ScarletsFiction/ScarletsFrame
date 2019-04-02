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
	self.new = function(name, element, isCreated, retriggered){
		if(isCreated === true){
			if(sf.loader.DOMWasLoaded === false)
				return sf(function(){
					self.new(name, element, isCreated);
				});
			if(self.registered[name][3] === false)
				return setTimeout(function(){
					self.new(name, element, isCreated, true);
				}, 0);
		}

		if(element === void 0)
			return new window['$'+capitalizeLetters(name.split('-'))];

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
		self.registered[name][0](newObj, sf.model);

		var extend = self.registered[name][4];
		if(extend !== void 0){
			if(extend.constructor === Array){
				for (var i = 0; i < extend.length; i++) {
					if(bases[extend[i]] === void 0)
						return console.error("'"+extend[i]+"' base is not found");
					bases[extend[i]](newObj, sf.model);
				}
			}
			else{
				if(bases[extend] === void 0)
					return console.error("'"+extend+"' base is not found");
				bases[extend](newObj, sf.model);
			}
		}

		if(self.registered[name][1])
			self.registered[name][1](newObj, sf.model);

		scope.triggerEvent(name, 'created', newObj);

		if(newElement !== true && isCreated !== true){
			componentInit(element, newID, name);
			element.model = sf.model.root[newID];
			return newID;
		}

		var temp = self.registered[name][3];
		if(temp.tempDOM === true){
			temp = temp.cloneNode(true).childNodes;
			for (var i = 0, n = temp.length; i < n; i++) {
				element.appendChild(temp[0]);
			}
		}
		else element.appendChild(temp.cloneNode(true));

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
			return Reflect.construct(Class, arguments, Object.getPrototypeOf(this).constructor);
		}
		Wrapper.prototype = Object.create(Class.prototype, {constructor:{value: Wrapper, enumerable: false, writable: true, configurable: true}}); 
		return Object.setPrototypeOf(Wrapper, Class);
	})(HTMLElement);

	// name = 'tag-name'
	function defineComponent(name){
		name = name.replace(/[^\w-]+/g, '');
		var tagName = name;
		name = name.split('-');
		if(name.length === 1)
			return console.error("Please use '-' when defining component tags");

		name = capitalizeLetters(name);
		var func = eval("function "+name+"(){var he = HTMLElement_wrap.call(this);self.new(tagName, he, true);return he}"+name);
		func.prototype = Object.create(HTMLElement.prototype);
		func.prototype.constructor = func;
		func.__proto__ = HTMLElement;

		// func.prototype.connectedCallback = function(){};

		try{
		  customElements.define(tagName, func);
		}catch(err){console.error(e)}

		window['$'+name] = func;
	}
};