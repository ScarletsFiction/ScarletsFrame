// ToDo: Global component getter shouldn't also get component from sf-space

sf.component = function(name, options, func, namespace){
	if(options !== void 0){
		if(options.constructor === Function)
			func = options;

		if(func !== options)
			sf.component.html(name, options, namespace);

		if(func !== void 0 && func.constructor === Function)
			return sf.component.for(name, options, func, namespace);
	}

	if(sf.component.registered[name]){
		var component = document.body.getElementsByTagName(name);
		if(component.length === 0)
			return [];

		var ret = new Array(component.length);
		for (var i = 0, n = component.length; i < n; i++)
			ret[i] = component[i].model;

		return ret;
	}

	return [];
}

;(function(){
	var self = sf.component;
	internal.component = {};
	internal.componentInherit = {};

	var waitingHTML = {};

	self.registered = {};
	// internal.component.tagName = new Set();

	function checkWaiting(name, namespace){
		var scope = namespace || self;

		var upgrade = waitingHTML[name];
		for (var i = upgrade.length - 1; i >= 0; i--) {
			if(upgrade[i].namespace !== namespace)
				continue;

			var el = upgrade[i].el;
			el = self.new(name, el, upgrade[i].item, namespace, false, true);
			if(el === void 0)
				return;

			el.connectedCallback('init');
			upgrade.pop();
		}

		if(upgrade.length === 0)
			delete waitingHTML[name];
	}

	self.for = function(name, options, func, namespace){
		if(options.constructor === Function)
			func = options;
		else{
			if(options.extend !== void 0)
				internal.componentInherit[name] = options.extend;
		}

		// internal.component.tagName.add(name.toUpperCase());
		var scope = namespace || self;

		// 0=Function for scope, 1=DOM Contructor, 2=incremental ID, 3=Template
		if(scope.registered[name] === void 0)
			scope.registered[name] = [func, void 0, 0, void 0, void 0]; // index 1 is $ComponentConstructor

		scope.registered[name][0] = func;
		var construct = defineComponent(name);

		scope.registered[name][1] = construct;
		window['$'+construct.name] = construct;

		if(waitingHTML[name] !== void 0)
			checkWaiting(name, namespace);
		else if(hotReload)
			hotComponentRefresh(scope, name, func);
	}

	self.html = function(name, outerHTML, namespace, retry){
		var scope = namespace || self;
		var templatePath = false;

		if(outerHTML.constructor === Object){
			var template;

			if(outerHTML.template){
				templatePath = outerHTML.template;
				if(window.templates){
					if(window.templates[outerHTML.template]){
						template = window.templates[outerHTML.template];

						if(!outerHTML.keepTemplate)
							delete window.templates[outerHTML.template];
					}
					else throw new Error("Template was not found for path: "+outerHTML.template);
				}
			}
			else if(outerHTML.html)
				template = outerHTML.html;
			else return;

			if(template === void 0){
				if(retry === true)
					return console.error(outerHTML, "template was not found");

				return $(function(){
					self.html(name, outerHTML, namespace, true);
				});
			}

			outerHTML = template;
		}

		// 0=Function for scope, 1=DOM Contructor, 2=incremental ID, 3=Template, 4=ModelRegex
		if(scope.registered[name] === void 0)
			scope.registered[name] = [void 0, void 0, 0, void 0, void 0];

		var temp;
		if(outerHTML.constructor === String)
			temp = $.parseElement(outerHTML);
		else temp = outerHTML;

		if(temp.length === 1)
			scope.registered[name][3] = temp[0];
		else{
			var tempDOM = document.createElement('div');
			tempDOM.tempDOM = true;
			for (var i = temp.length - 1; i >= 0; i--) {
				tempDOM.insertBefore(temp[i], tempDOM.firstChild);
			}
			scope.registered[name][3] = tempDOM;
		}

		if(templatePath !== false){
			templatePath = templatePath.split('/');
			templatePath.pop();
			templatePath = templatePath.join('/');
			if(templatePath !== '')
				templatePath += '/';

			scope.registered[name][3].templatePath = templatePath;
		}

		if(waitingHTML[name] !== void 0)
			checkWaiting(name, namespace);
		else if(hotReload)
			hotComponentTemplate(scope, name);
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

		var registrar = scope.registered[name];
		if(registrar === void 0 || element.childNodes.length === 0 && registrar[3] === void 0){
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

		var newObj = (asScope ? $item : (
			inherit !== void 0 ? new inherit() : {}
		));

		newObj.$el = $();
		if(inherit !== void 0 && asScope)
			Object.setPrototypeOf(newObj, inherit.prototype);

		// Call function that handle scope
		registrar[0](newObj, (namespace || sf.model), $item);
		if(newObj.constructor !== Object){
			proxyClass(newObj);
			newObj.constructor.construct && newObj.constructor.construct.call(newObj, (namespace || sf.model), $item);
		}

		// Save the item for hot reloading
		if(hotReload){
			newObj.$el.$item = $item;
			hotComponentAdd(scope, name, newObj);
		}

		if(registrar[4] === void 0)
			registrar[4] = internal.model.createModelKeysRegex(element, newObj, null);

		if(element.childNodes.length === 0){
			var temp = registrar[3];
			var tempDOM = temp.tempDOM;

			// Create template here because we have the sample model
			if(temp.constructor !== Object){
				tempDOM = temp.tempDOM || temp.tagName.toLowerCase() === name;

				var isDynamic = internal.model.templateInjector(temp, newObj, true);

				temp = sf.model.extractPreprocess(temp, null, newObj, void 0, registrar[4]);

				if(isDynamic === false)
					registrar[3] = temp;
				else{
					isDynamic.tempDOM = tempDOM;
					registrar[3] = isDynamic;
				}

				temp.tempDOM = tempDOM;
			}

			// Create new object, but using registrar[3] as prototype
			var copy = Object.create(temp);

			if(copy.parse.length !== 0){
				copy.parse = copy.parse.slice(0);

				// Deep copy the original properties to new object
				for (var i = 0; i < copy.parse.length; i++) {
					copy.parse[i] = Object.create(copy.parse[i]);
					copy.parse[i].data = [null, newObj];
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

		// Custom component that written on the DOM
		else{
			var specialElement = {
				repeat:[],
				input:[]
			};

			internal.model.templateInjector(element, newObj, false);
			sf.model.parsePreprocess(sf.model.queuePreprocess(element, true, specialElement), newObj, registrar[4]);
			internal.model.bindInput(specialElement.input, newObj);
			internal.model.repeatedListBinding(specialElement.repeat, newObj, namespace, registrar[4]);

			if(element.sf$componentIgnore === true)
				return;
		}

		// Component always will always have one element
		newObj.$el[0] = element;

		element.model = newObj;
		element.sf$controlled = name;

		element.sf$initTriggered = true;
		return element;
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

		func.prototype.connectedCallback = function(which){
			// Maybe it's not the time
			if(this.model === void 0 || this.sf$componentIgnore === true)
				return;

			if(this.sf$detaching !== void 0){
				clearTimeout(this.sf$detaching);
				this.sf$detaching = void 0;
				return;
			}

			if(this.sf$initTriggered){
				delete this.sf$initTriggered;

				if(this.model.init){
					if(this.model.constructor !== Object)
						this.model.constructor.init && this.model.constructor.init.call(this.model, (this.sf$space || sf.model));

					this.model.init();
				}
				return;
			}

			if(which !== 'init' && this.model.reinit)
				this.model.reinit();
		};

		func.prototype.disconnectedCallback = function(){
			if(this.sf$componentIgnore)
				return;

			// Skip if it's not initialized
			if(this.model === void 0)
				return;

			var that = this;
			this.sf$detaching = setTimeout(function(){
				if(that.model === void 0)
					return;

				if(that.model.destroy)
					that.model.destroy();

				if(hotReload)
					hotComponentRemove(that);
			}, 500);
		};

		try{
		  customElements.define(tagName, func);
		}catch(err){console.error(err)}

		return func;
	}
})();