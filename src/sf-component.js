sf.component = function(name, options, func, namespace){
	if(options !== void 0){
		if(options.constructor === Function)
			func = options;

		if(func !== options)
			sf.component.html(name, options, namespace);

		if(func !== void 0 && func.constructor === Function)
			return sf.component.for(name, options, func, namespace);
	}

	var temp = sf.component.registered[name];
	return temp ? temp[2] : [];
}

function prepareComponentTemplate(temp, tempDOM, name, newObj, registrar){
	tempDOM = temp.tempDOM || temp.tagName.toLowerCase() === name;

	var isDynamic = internal.model.templateInjector(temp, newObj, true);
	temp = sf.model.extractPreprocess(temp, null, newObj, void 0, registrar[4]);

	if(isDynamic === false)
		registrar[3] = temp;

	// We need to improve sf-reserved to reduce re-extraction
	else{
		isDynamic.tempDOM = tempDOM;
		registrar[3] = isDynamic;
	}

	temp.tempDOM = tempDOM;
	return temp;
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

		// 0=Function for scope, 1=DOM Contructor, 2=elements, 3=Template
		var registrar = scope.registered[name];
		if(registrar === void 0){
			registrar = scope.registered[name] = new Array(5);
			registrar[2] = [];
			// index 1 is $ComponentConstructor
		}

		registrar[0] = func;
		var construct = defineComponent(name);

		registrar[1] = construct;
		window['$'+construct.name] = construct;

		if(waitingHTML[name] !== void 0)
			checkWaiting(name, namespace);
		else if(hotReload)
			hotComponentRefresh(scope, name, func);

		// Return list of created component
		return registrar[2];
	}

	self.html = function(name, outerHTML, namespace){
		var scope = namespace || self;
		var templatePath = false;

		if(outerHTML.constructor === Object){
			var template;

			if(outerHTML.template){
				templatePath = outerHTML.template;
				if(window.templates){
					if(window.templates[outerHTML.template] !== void 0){
						template = window.templates[outerHTML.template];

						if(hotReload && proxyTemplate[outerHTML.template] === void 0)
							proxyTemplate[outerHTML.template] = [scope, name];

						if(!outerHTML.keepTemplate && hotReload === false)
							delete window.templates[outerHTML.template];
					}
					else{
						TemplatePending.push(function(){
							self.html(name, outerHTML, namespace, true);
						});
						return console.warn("Waiting template path '"+outerHTML.template+"' to be loaded");
					}
				}
			}
			else if(outerHTML.html)
				template = outerHTML.html;
			else return;

			if(template === void 0){
				TemplatePending.push(function(){
					self.html(name, outerHTML, namespace, true);
				});
				return console.warn("Waiting template for '"+name+"' to be loaded");
			}

			outerHTML = template;
		}

		// 0=Function for scope, 1=DOM Contructor, 2=elements, 3=Template, 4=ModelRegex
		var registrar = scope.registered[name];
		if(registrar === void 0){
			registrar = scope.registered[name] = new Array(5);
			registrar[2] = [];
		}

		var temp;
		if(outerHTML.constructor === String)
			temp = $.parseElement(outerHTML);
		else temp = outerHTML;

		if(temp.length === 1)
			registrar[3] = temp[0];
		else{
			var tempDOM = document.createElement('div');
			tempDOM.tempDOM = true;
			for (var i = temp.length - 1; i >= 0; i--) {
				tempDOM.insertBefore(temp[i], tempDOM.firstChild);
			}
			registrar[3] = tempDOM;
		}

		if(templatePath !== false){
			templatePath = templatePath.split('/');
			templatePath.pop();
			templatePath = templatePath.join('/');
			if(templatePath !== '')
				templatePath += '/';

			registrar[3].templatePath = templatePath;
		}

		if(waitingHTML[name] !== void 0)
			checkWaiting(name, namespace);

		if(hotReload){
			if(templatePath === false)
				hotComponentTemplate(scope, name);
			else if(window.sf$proxy === void 0 && backupCompTempl.has(registrar) === false)
				backupCompTempl.set(registrar, registrar[3]);
		}
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

		var index = 0;
		if(newObj.$el !== void 0)
			index = newObj.$el + 1;
		else
			newObj.$el = $();

		if(index === 0){
			if(inherit !== void 0 && asScope)
				Object.setPrototypeOf(newObj, inherit.prototype);

			// Call function that handle scope
			registrar[0](newObj, (namespace || sf.model), $item);
			if(newObj.constructor !== Obj){
				proxyClass(newObj);
				newObj.constructor.construct && newObj.constructor.construct.call(newObj, (namespace || sf.model), $item);
			}

			// Save the item for hot reloading
			if(hotReload){
				newObj.$el.$item = $item;
				hotComponentAdd(scope, name, newObj);
			}
		}

		if(registrar[4] === void 0)
			registrar[4] = internal.model.createModelKeysRegex(element, newObj, null);

		if(element.childNodes.length === 0){
			var temp = registrar[3];
			var tempDOM = temp.tempDOM;

			// Create template here because we have the sample model
			if(temp.constructor !== Obj){
				temp = prepareComponentTemplate(temp, tempDOM, name, newObj, registrar);
				tempDOM = temp.tempDOM;
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

			if(element.sf$componentIgnore === true){
				element = newObj.$el[0];

				if(namespace !== void 0)
					element.sf$space = namespace;
			}
		}

		newObj.$el = newObj.$el.push(element);

		registrar[2].push(newObj);
		element.sf$collection = registrar[2];

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

	if(window.sf$proxy)
		window.sf$defineComponent = defineComponent;

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
						haveSpace = haveSpace.default;

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
					if(this.model.$el.length !== 1){
						this.model.initClone && this.model.initClone(this.model.$el[this.model.$el.length-1]);
						return;
					}

					if(this.model.constructor !== Obj)
						this.model.constructor.init && this.model.constructor.init.call(this.model, (this.sf$space || sf.model));

					this.model.init();
				}
				return;
			}

			if(which !== 'init' && this.model.reinit)
				this.model.reinit(this);
		};

		func.prototype.disconnectedCallback = function(){
			if(this.sf$componentIgnore)
				return;

			// Skip if it's not initialized
			if(this.model === void 0)
				return;

			var that = this;
			var destroy = function(){
				if(that.model === void 0)
					return;

				if(that.model.$el.length !== 1){
					var i = that.model.$el.indexOf(that);
					if(i !== -1){
						var temp = that.model.$el[i];
						that.model.$el = that.model.$el.splice(i, 1);
						that.model.destroyClone && that.model.destroyClone(temp);
					}

					internal.model.removeModelBinding(that.model);
					return;
				}

				that.model.destroy && that.model.destroy();

				if(that.sf$collection !== void 0)
					that.sf$collection.splice(that.sf$collection.indexOf(that.model), 1);

				if(hotReload)
					hotComponentRemove(that);
			}

			if(window.destroying)
				return destroy();

			this.sf$detaching = setTimeout(destroy, 500);
		};

		try{
		  customElements.define(tagName, func);
		}catch(err){
			console.error(err);
			sf.onerror && sf.onerror(e);
		}

		return func;
	}
})();