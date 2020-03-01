// Data save and HTML content binding
sf.model = function(name, func, namespace){
	if(func !== void 0 && func.constructor === Function)
		return sf.model.for(name, func);

	// If it's component tag
	if((namespace || sf.component).registered[name] !== void 0)
		return (namespace || root_)(name);

	var scope = namespace || sf.model;
	if(scope.root[name] === void 0)
		scope.root[name] = {};

	return scope.root[name];
};

;(function(){
	var self = sf.model;
	self.root = {};
	internal.modelPending = {};

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
	self.for = function(name, func, namespace){
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

			sf.loader.onFinish(function(){
				internal.language.refreshLang(this);
				sf.model.init(this, name);
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