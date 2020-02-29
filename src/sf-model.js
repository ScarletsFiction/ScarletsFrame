// Data save and HTML content binding
sf.model = function(name, func, namespace){
	if(func !== void 0 && func.constructor === Function)
		return sf.model.for(name, func);

	// If it's component tag
	if((namespace || sf.component).registered[name] !== void 0)
		return root_(name);

	var scope = namespace || sf.model;

	if(!scope.root[name])
		scope.root[name] = {};

	// This usually being initialized after DOM Loaded
	var pending = internal.modelPending[name];
	if(pending){
		var temp = scope.root[name];
		for (var i = 0; i < pending.length; i++) {
			pending[i](temp, scope);
		}
		pending = internal.modelPending[name] = false;
	}

	return scope.root[name];
};

;(function(){
	var self = sf.model;
	self.root = {};
	internal.modelPending = {};

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

		var ref = sf(currentElement)[list];
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
			if(haveSpace !== null)
				internal.space.initModel(haveSpace, this);

			return;
		}

		var that = this;
		setTimeout(function(){
			// Run init when all assets have loaded
			if(sf.loader.DOMWasLoaded){
				internal.language.refreshLang(that);
				return sf.model.init(that, that.getAttribute('name'));
			}

			sf.loader.onFinish(function(){
				internal.language.refreshLang(that);
				sf.model.init(that, that.getAttribute('name'));
			});
		});
	}
	disconnectedCallback(){
		var that = this;
		this.sf$destroying = setTimeout(function(){
			if(that.model.$el){
				var i = that.model.$el.indexOf(that);
				if(i !== -1)
					that.model.$el.splice(i)
			}

			internal.model.removeModelBinding(that.model);
		}, 1000);
	}
}

customElements.define('sf-m', SFModel);

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