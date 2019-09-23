sf.component = new function(){
	var self = this;
	var scope = internal.component = {};
	self.registered = {};
	self.available = {};

	var bases = {};

	self.for = function(name, func, extend){
		if(self.registered[name] === void 0)
			self.registered[name] = [func, sf.controller.pending[name], 0, false, extend];
		self.registered[name][0] = func;
		delete sf.controller.pending[name];

		defineComponent(name);
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

	var tempDOM = document.createElement('div');
	self.new = function(name, element, $item, isCreated, retriggered){
		if(internal.component.skip)
			return;

		if(isCreated === true){
			if(element.childElementCount === 0){
				if(self.registered[name][3] === false)
					return setTimeout(function(){
						self.new(name, element, $item, isCreated, true);
					});
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

		var newObj = sf.model.root[newID] = {$el:$()};
		newObj.$el.push(element);

		self.registered[name][0](newObj, sf.model, $item);

		var extend = self.registered[name][4];
		if(extend !== void 0){
			if(extend.constructor === Array){
				for (var i = 0; i < extend.length; i++) {
					if(bases[extend[i]] === void 0)
						return console.error("'"+extend[i]+"' base is not found");
					bases[extend[i]](newObj, sf.model, $item);
				}
			}
			else{
				if(bases[extend] === void 0)
					return console.error("'"+extend+"' base is not found");
				bases[extend](newObj, sf.model, $item);
			}
		}

		if(self.registered[name][1])
			self.registered[name][1](newObj, sf.model, $item);

		if(newElement !== true && isCreated !== true){
			componentInit(element, newID, name);
			element.model = sf.model.root[newID];

			if(element.model.beforeInit)
				element.model.beforeInit();
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
			sf.model.init(element, newID);

			if(element.model.beforeInit)
				element.model.beforeInit();

			element = tempDOM.firstElementChild;
			element.remove();
		}
		else if(isCreated === true){
			componentInit(element, newID, name);
			sf.model.init(element, newID);

			if(element.model.beforeInit)
				element.model.beforeInit();
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
		var func = eval("function "+name+"($item){var he = HTMLElement_wrap.call(this);self.new(tagName, he, $item, true, false);return he}"+name);
		func.prototype = Object.create(HTMLElement.prototype);
		func.prototype.constructor = func;
		func.__proto__ = HTMLElement;

		func.prototype.connectedCallback = function(){
			if(this.hasAttribute('sf-repeat-this')){
				this.sf$componentIgnore = true;
				return;
			}

			// Maybe it's not the time
			if(!this.model)
				return;
		};

		func.prototype.disconnectedCallback = function(){
			if(this.sf$componentIgnore)
				return;

			var components = sf.component.available[tagName];
			components.splice(components.indexOf(this.sf$controller), 1);

			if(!this.model)
				console.log(this);

			if(this.model.destroy)
				this.model.destroy();

			delete self.root[this.sf$controlled];
		};

		try{
		  customElements.define(tagName, func);
		}catch(err){console.error(err)}

		window['$'+name] = func;
	}
};