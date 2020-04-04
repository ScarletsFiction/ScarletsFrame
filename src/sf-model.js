// Data save and HTML content binding
sf.model = function(name, options, func, namespace){
	if(options !== void 0)
		return sf.model.for(name, options, func);

	// If it's component tag
	if((namespace || sf.component).registered[name] !== void 0)
		return (namespace || root_)(name);

	var scope = namespace || sf.model;
	if(scope.root[name] === void 0){
		if(internal.modelInherit[name] !== void 0)
			scope.root[name] = new internal.modelInherit[name]();
		else
			scope.root[name] = {};
	}

	return scope.root[name];
};

;(function(){
	var self = sf.model;
	self.root = {};
	internal.modelPending = {};
	internal.modelInherit = {};

	// Find an index for the element on the list
	self.index = function(element){
		if(element.hasAttribute('sf-bind-list') === false)
			element = element.closest('[sf-bind-list]');

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

		var ref = sf(currentElement)[list];
		if(ref.$virtual === void 0) return i;

		return i + ref.$virtual.DOMCursor - 1;
	}

	// Declare model for the name with a function
	self.for = function(name, options, func, namespace){
		if(options.constructor === Function)
			func = options;
		else{
			internal.modelInherit[name] = options.extend;
		}

		var scope = namespace || self;
		func(scope(name), scope);

		if(sf.loader.DOMWasLoaded && internal.modelPending[name] !== void 0){
			var temp = internal.modelPending[name];
			for (var i = 0; i < temp.length; i++) {
				sf.model.init(temp[i], temp[i].getAttribute('name'));
			}

			delete internal.modelPending[name];
		}
	}

	// Get property of the model
	self.modelKeys = function(modelRef){
		var keys = Object.keys(modelRef);
		for (var i = keys.length - 1; i >= 0; i--) {
			if(keys[i].indexOf('$') !== -1)
				keys.splice(i, 1);
		}

		// it maybe custom class
		if(modelRef.constructor !== Object && modelRef.constructor !== Array){
			keys = new Set(keys);
			getStaticMethods(keys, modelRef.constructor);
			getPrototypeMethods(keys, modelRef.constructor);
			keys = Array.from(keys);
		}

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
			var haveSpace = this.closest('sf-space');
			if(haveSpace !== null){
				internal.space.initModel(haveSpace, this);
				return;
			}
		}

		var name = this.getAttribute('name');

		// Instant run when model scope was found or have loaded
		if(sf.model.root[name] !== void 0 && internal.modelPending[name] === void 0){
			// Run init when all assets have loaded
			if(sf.loader.DOMWasLoaded){
				internal.language.refreshLang(this);
				return sf.model.init(this, name);
			}

			var that = this;
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
		var that = this;
		this.sf$destroying = setTimeout(function(){
			if(that.model === void 0)
				return;

			if(that.model.$el){
				var i = that.model.$el.indexOf(that);
				if(i !== -1){
					var temp = that.model.$el.splice(i);

					if(that.model.destroy)
						that.model.destroy(temp, that.model.$el.length === 0);
				}
			}

			internal.model.removeModelBinding(that.model);
		}, 1000);
	}
}

customElements.define('sf-m', SFModel);

var root_ = function(scope){
	if(sf.component.registered[scope])
		return sf.component(scope);

	if(sf.model.root[scope] === void 0)
		var scope_ = sf.model.root[scope] = {};

	return sf.model.root[scope];
}

// Let's check all pending model
$(function(){
	var keys = Object.keys(internal.modelPending);
	for (var i = 0; i < keys.length; i++) {
		var ref = internal.modelPending[keys[i]];
		for (var z = 0; z < ref.length; z++) {
			sf.model.init(ref[z], ref[z].getAttribute('name'));
		}

		delete internal.modelPending[keys[i]];
	}
});