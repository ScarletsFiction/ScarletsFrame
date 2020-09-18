// Data save and HTML content binding
sf.model = function(name, options, func, namespace){
	if(options !== void 0)
		return sf.model.for(name, options, func);

	// If it's component tag
	if((namespace || sf.component).registered[name] !== void 0)
		return (namespace || root_)(name);

	const scope = namespace || sf.model;
	if(scope.root[name] === void 0){
		if(internal.modelInherit[name] !== void 0)
			scope.root[name] = new internal.modelInherit[name]();
		else
			scope.root[name] = {};
	}

	return scope.root[name];
};

function findBindListElement(el){
	el = el.parentNode;
	while(el !== null){
		if(el.sf$elementReferences && el.sf$elementReferences.template.bindList)
			return el;

		el = el.parentNode;
	}
	return null;
}

;(function(){
	const self = sf.model;
	self.root = {};
	internal.modelPending = {};
	internal.modelInherit = {};

	// Find an index for the element on the list
	self.index = function(element){
		if(!element.sf$elementReferences || !element.sf$elementReferences.template.bindList)
			element = findBindListElement(element);

		if(element === null)
			return -1;

		let i = -1;
		const tagName = element.tagName;
		const currentElement = element;

		while(element !== null) {
			if(element.tagName === tagName)
				i++;
			else if(element.nodeType !== 8) break;

			element = element.previousSibling;
		}

		const ref = currentElement.sf$elementReferences && currentElement.sf$elementReferences.template.bindList;

		const VSM = currentElement.parentNode.$VSM;
		if(VSM !== void 0) return i + VSM.firstCursor;
		return i;
	}

	// Declare model for the name with a function
	self.for = function(name, options, func, namespace){
		if(options.constructor === Function){
			func = options;

			// It's a class
			if(func.prototype.init !== void 0){
				internal.modelInherit[name] = func;
				func = {class:func};
			}
		}
		else internal.modelInherit[name] = options.extend;

		const scope = namespace || self;

		let scopeTemp;
		if(hotReload)
			hotModel(scope, name, func);
		else{
			scopeTemp = scope(name);

			// Call it it's a function
			if(func.constructor === Function)
				func(scopeTemp, scope);
		}

		if(sf.loader.DOMWasLoaded && internal.modelPending[name] !== void 0){
			const temp = internal.modelPending[name];
			for (let i = 0; i < temp.length; i++) {
				sf.model.init(temp[i], temp[i].getAttribute('name'));
			}

			delete internal.modelPending[name];
		}

		// Return model scope
		return scopeTemp || scope(name);
	}

	// Get property of the model
	self.modelKeys = function(modelRef, toString){
		// it maybe custom class
		if(modelRef.constructor !== Object && modelRef.constructor !== Array){
			var keys = new Set();
			for(var key in modelRef){
				if(key.includes('$'))
					continue;

				keys.add(key);
			}

			getStaticMethods(keys, modelRef.constructor);
			getPrototypeMethods(keys, modelRef.constructor);

			if(toString){
				let temp = '';
				for(var key of keys){
					if(temp.length === 0){
						temp += key;
						continue;
					}

					temp += `|${key}`;
				}

				return temp;
			}

			return Array.from(keys);
		}

		var keys = [];
		for(var key in modelRef){
			if(key.includes('$'))
				continue;

			keys.push(key);
		}

		if(toString)
			return keys.join('|');

		return keys;
	}
})();

// Define sf-model element
class SFModel extends HTMLElement {
	constructor(){
		super();

		this.sf$firstInit = true;
	}
	connectedCallback(){
		if(this.sf$destroying !== void 0){
			delete this.sf$destroying;
			clearTimeout(this.sf$destroying);
		}

		if(this.sf$firstInit === void 0)
			return;

		delete this.sf$firstInit;
		if(internal.space.empty === false){
			const haveSpace = this.closest('sf-space');
			if(haveSpace !== null){
				internal.space.initModel(haveSpace, this);
				return;
			}
		}

		const name = this.getAttribute('name');

		// Instant run when model scope was found or have loaded
		if(sf.model.root[name] !== void 0 && internal.modelPending[name] === void 0){
			// Run init when all assets have loaded
			if(sf.loader.DOMWasLoaded){
				internal.language.refreshLang(this);
				return sf.model.init(this, name);
			}

			const that = this;
			sf.loader.onFinish(function(){
				internal.language.refreshLang(that);
				sf.model.init(that, name);
			});
			return;
		}

		// Pending model initialization
		if(internal.modelPending[name] === void 0)
			internal.modelPending[name] = [];

		internal.modelPending[name].push(this);
	}
	disconnectedCallback(){
		const that = this;
		const destroy = function(){
			if(that.model === void 0)
				return;

			if(that.model.$el){
				const i = that.model.$el.indexOf(that);
				if(i !== -1){
					var model = that.model;
					const temp = model.$el[i];

					model.$el = model.$el.splice(i, 1);
					model.destroy && model.destroy(temp, model.$el.length === 0);
				}
			}

			internal.model.removeModelBinding(that.model);
		};

		if(window.destroying)
			return destroy();

		this.sf$destroying = setTimeout(destroy, 1000);
	}
}

customElements.define('sf-m', SFModel);

var root_ = function(scope){
	if(sf.component.registered[scope])
		return sf.component(scope);

	if(sf.model.root[scope] === void 0) {
		sf.model.root[scope] = {};
	}

	return sf.model.root[scope];
}