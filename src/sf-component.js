sf.component = function(scope, options, func){
	if(options !== void 0){
		if(options !== void 0 && options.constructor !== Object)
			func = options;

		if(func.constructor === Function)
			return sf.component.for(scope, options, func);
		return sf.component.html(scope, options);
	}

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
	internal.component = {};
	internal.componentInherit = {};

	var waitingHTML = {};

	self.registered = {};
	self.available = {};
	// internal.component.tagName = new Set();

	function checkWaiting(name, namespace){
		var scope = namespace || self;

		var upgrade = waitingHTML[name];
		for (var i = upgrade.length - 1; i >= 0; i--) {
			if(upgrade[i].namespace !== namespace)
				continue;

			var el = upgrade[i].el;
			if(self.new(name, el, upgrade[i].item, namespace, false, true) === void 0)
				return;

			delete el.sf$initTriggered;
			upgrade.pop();
		}

		if(upgrade.length === 0)
			delete waitingHTML[name];
	}

	self.for = function(name, options, func, namespace){
		if(options.constructor === Function)
			func = options;
		else{
			internal.componentInherit[name] = options.extend;
		}

		// internal.component.tagName.add(name.toUpperCase());
		var scope = namespace || self;

		// 0=Function for scope, 1=DOM Contructor, 2=incremental ID, 3=Template
		if(scope.registered[name] === void 0)
			scope.registered[name] = [func, void 0, 0, false]; // index 1 is $ComponentConstructor

		scope.registered[name][0] = func;
		var construct = defineComponent(name);

		scope.registered[name][1] = construct;
		window['$'+construct.name] = construct;

		if(waitingHTML[name] !== void 0)
			checkWaiting(name, namespace);
	}

	self.html = function(name, outerHTML, namespace, retry){
		var scope = namespace || self;

		if(outerHTML.constructor === Array){
			var template = window.templates[outerHTML[0]];

			if(template === void 0){
				if(retry === true)
					return console.error(outerHTML[0], "template was not found");

				return $(function(){
					self.html(name, outerHTML, namespace, true);
				});
			}

			outerHTML = template;
		}

		// 0=Function for scope, 1=DOM Contructor, 2=incremental ID, 3=Template
		if(scope.registered[name] === void 0)
			scope.registered[name] = [false, false, 0, false];

		var temp = $.parseElement(outerHTML, true);
		if(temp.length === 1)
			scope.registered[name][3] = temp[0];
		else{
			var tempDOM = document.createElement('div');
			tempDOM.tempDOM = true;
			for (var i = 0; i < temp.length; i++) {
				tempDOM.appendChild(temp[i]);
			}
			scope.registered[name][3] = tempDOM;
		}

		if(waitingHTML[name] !== void 0)
			checkWaiting(name, namespace);
	}

	var tempDOM = document.createElement('div');
	self.new = function(name, element, $item, namespace, asScope, _fromCheck){
		if(internal.component.skip)
			return;

		if(element.sf$componentIgnore === true)
			return;

		if(element.hasAttribute('sf-repeat-this')){
			element.sf$componentIgnore = true;
			return;
		}

		var scope = namespace || self;

		if(namespace !== void 0)
			element.sf$space = namespace;

		if(scope.registered[name] === void 0 || element.childNodes.length === 0 && scope.registered[name][3] === false){
			if(_fromCheck === true)
				return;

			if(waitingHTML[name] === void 0)
				waitingHTML[name] = [];

			waitingHTML[name].push({el:element, item:$item, namespace:namespace});
			return;
		}

		var avoid = /(^|:)(sf-|class|style)/;
		var attr = element.attributes;
		var inherit = internal.componentInherit[name];

		if(attr.length !== 0 && $item === void 0)
			$item = {};

		for (var i = 0; i < attr.length; i++) {
			if(avoid.test(attr[i].nodeName))
				continue;

			$item[attr[i].nodeName] = attr[i].value;
		}

		var newID = name+'@'+(scope.registered[name][2]++);

		if(scope.available[name] === void 0)
			scope.available[name] = [];

		scope.available[name].push(newID);

		var newObj = (namespace || sf.model).root[newID] = (asScope ? $item : (
			inherit !== void 0 ? new inherit() : {}
		));
		newObj.$el = $();

		if(inherit !== void 0 && asScope)
			Object.setPrototypeOf(newObj, inherit.prototype);

		// Call function that handle scope
		scope.registered[name][0](newObj, (namespace || sf.model), $item);

		// if(scope.registered[name][1])
		// 	scope.registered[name][1](newObj, sf.model, $item);

		if(element.childNodes.length === 0){
			var temp = scope.registered[name][3];
			var tempDOM = temp.tempDOM;

			// Create template here because we have the sample model
			if(temp.constructor !== Object){
				tempDOM = temp.tempDOM || temp.tagName.toLowerCase() === name;
				temp = sf.model.extractPreprocess(temp, null, newObj);
				scope.registered[name][3] = temp;
				temp.tempDOM = tempDOM;
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

			if(tempDOM === true)
				var parsed = internal.model.templateParser(copy, newObj, void 0, void 0, void 0, element);
			else{
				var parsed = internal.model.templateParser(copy, newObj);
				element.appendChild(parsed);
			}

			element.sf$elementReferences = parsed.sf$elementReferences;
			sf.model.bindElement(element, newObj, copy);
		}
		else{
			var specialElement = {
				repeat:[],
				input:[]
			};

			sf.model.parsePreprocess(sf.model.queuePreprocess(element, true, specialElement), newObj);
			internal.model.bindInput(specialElement.input, newObj);
			internal.model.repeatedListBinding(specialElement.repeat, newObj, namespace);
		}

		newObj.$el.push(element);
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
		var have = customElements.get(name);
		if(have)
			return have;

		if(name.toLowerCase() !== name)
			return console.error("Please use lower case when defining component name");

		name = name.replace(/[^\w-]+/g, '');
		var tagName = name;
		name = name.split('-');
		if(name.length === 1)
			return console.error("Please use '-' when defining component tags");

		name = capitalizeLetters(name);
		function componentCreate(raw, $item, namespace, asScope){
			var elem = HTMLElement_wrap.call(raw);

			if(internal.space.empty === false){
				var haveSpace = namespace || elem.closest('sf-space');
				if(haveSpace !== null){
					if(haveSpace.constructor === Space)
						haveSpace = haveSpace.scope;

					internal.space.initComponent(haveSpace, tagName, elem, $item, asScope);
					return elem;
				}
			}

			self.new(tagName, elem, $item, void 0, asScope);
			return elem;
		}

		// Create function at current scope
		var func = eval("function "+name+"($item, namespace, asScope){return componentCreate(this, $item, namespace, asScope)}"+name);
		func.prototype = Object.create(HTMLElement.prototype);
		func.prototype.constructor = func;
		func.__proto__ = HTMLElement;

		func.prototype.connectedCallback = function(){
			// Maybe it's not the time
			if(this.model === void 0)
				return;

			if(this.sf$destroying !== void 0){
				clearTimeout(this.sf$destroying);
				this.sf$destroying = void 0;
				return;
			}

			if(this.sf$initTriggered){
				delete this.sf$initTriggered;

				if(this.model.init){
					if(this.model.constructor !== Object){
						this.model.constructor.construct && this.model.constructor.construct.call(this.model);
						proxyClass(this.model, this.model.constructor);
					}

					this.model.init();
				}
				return;
			}

			if(this.model.reinit)
				this.model.reinit();
		};

		func.prototype.disconnectedCallback = function(){
			if(this.sf$componentIgnore)
				return;

			// Skip if it's not initialized
			if(this.model === void 0)
				return;

			var components = (this.sf$space || sf.component).available[tagName];
			components.splice(components.indexOf(this.sf$controlled), 1);

			var that = this;
			this.sf$destroying = setTimeout(function(){
				if(that.model === void 0)
					return console.log(that);

				if(that.model.destroy)
					that.model.destroy();

				internal.model.removeModelBinding(that.model, true);
				that.model.$el = null;

				if(that.sf$space)
					delete that.sf$space.root[that.sf$controlled];
				else
					delete sf.model.root[that.sf$controlled];
			}, 500);
		};

		try{
		  customElements.define(tagName, func);
		}catch(err){console.error(err)}

		return func;
	}
})();