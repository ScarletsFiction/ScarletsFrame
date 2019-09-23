sf.component = new function(){
	var self = this;
	var scope = internal.component = {
		list:{}
	};
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
	self.new = function(name, element, $item){
		if(internal.component.skip)
			return;

		if(element.hasAttribute('sf-repeat-this')){
			element.sf$componentIgnore = true;
			return;
		}

		if(element.childElementCount === 0){
			if(self.registered[name][3] === false)
				return;
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

			if(temp.tempDOM === true){
				temp = temp.cloneNode(true).childNodes;
				for (var i = 0, n = temp.length; i < n; i++) {
					element.appendChild(temp[0]);
				}
			}
			else element.appendChild(temp.cloneNode(true));
		}

		componentInit(element, newID, name);
		sf.model.init(element, newID);

		element.sf$initTriggered = true;

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
		var func = eval("function "+name+"($item){var he = HTMLElement_wrap.call(this);self.new(tagName, he, $item);return he}"+name);
		func.prototype = Object.create(HTMLElement.prototype);
		func.prototype.constructor = func;
		func.__proto__ = HTMLElement;

		func.prototype.connectedCallback = function(){
			// Maybe it's not the time
			if(!this.model)
				return;

			if(this.sf$initTriggered){
				delete this.sf$initTriggered;
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

			if(!this.model)
				return console.log(this);

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