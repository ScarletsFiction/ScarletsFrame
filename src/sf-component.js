sf.component = function(scope){
	var list = sf.component.available[scope];
	if(list === void 0)
		return [];

	var ret = [];
	for (var i = 0; i < list.length; i++) {
		ret.push(sf.model.root[list[i]]);
	}

	return ret;
}

;(function(){
	var self = sf.component;
	var scope = internal.component = {
		list:{}
	};

	var waitingHTML = {};

	self.registered = {};
	self.available = {};

	self.for = function(name, func, extend){
		if(self.registered[name] === void 0)
			self.registered[name] = [func, sf.controller.pending[name], 0, false, extend];

		internal.component[name.toUpperCase()] = 0;

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

		internal.component[name.toUpperCase()] = 1;

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

		if(element.sf$componentIgnore === true)
			return;

		if(element.hasAttribute('sf-repeat-this')){
			element.sf$componentIgnore = true;
			return;
		}

		if(element.childNodes.length === 0 && self.registered[name][3] === false){
			if(waitingHTML[name] === void 0)
				waitingHTML[name] = [];

			waitingHTML[name].push({el:element, item:$item});
			return;
		}

		var avoid = /(^|:)(sf-|class|style)/;
		var attr = element.attributes;

		if(attr.length !== 0 && $item === void 0)
			$item = {};

		for (var i = 0; i < attr.length; i++) {
			if(avoid.test(attr[i].nodeName))
				continue;

			$item[attr[i].nodeName] = attr[i].value;
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

		if(element.childNodes.length === 0){
			var temp = self.registered[name][3];
			var tempDOM = temp.tempDOM;

			// Create template here because we have the sample model
			if(temp.constructor !== Object){
				temp = sf.model.extractPreprocess(temp, null, newObj);
				self.registered[name][3] = temp;
				tempDOM = temp.tempDOM = true;
			}

			var copy = Object.assign({}, temp);

			if(copy.parse.length !== 0){
				var _content_ = null;
				copy.parse = copy.parse.slice(0);

				for (var i = 0; i < copy.parse.length; i++) {
					copy.parse[i] = Object.assign({}, copy.parse[i]);
					var ref = copy.parse[i].data = copy.parse[i].data.slice(0);

					if(_content_ === null && ref.length === 3){
						_content_ = Object.assign({}, ref[2]);
						_content_._modelScope = newObj;
					}

					ref[1] = newObj;
					ref[2] = _content_;
				}
			}

			var parsed = internal.model.templateParser(copy, newObj);
			element.sf$elementReferences = parsed.sf$elementReferences;
			sf.model.bindElement(element, newObj, copy);

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

		if(name.toLowerCase() !== name)
			return console.error("Please use lower case when defining component name");

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
})();