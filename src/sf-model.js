// Data save and HTML content binding
sf.model = function(scope){
	// If it's component tag
	if(sf.component.registered[scope] !== void 0)
		return root_(scope);

	if(!sf.model.root[scope]){
		sf.model.root[scope] = {};
		internal.controller.pending.push(scope);
	}

	// This usually being initialized after DOM Loaded
	var pending = internal.modelPending[scope];
	if(pending){
		var temp = sf.model.root[scope];
		for (var i = 0; i < pending.length; i++) {
			pending[i](temp, sf.model);
		}
		pending = internal.modelPending[scope] = false;
	}

	for (var i = internal.controller.pending.length - 1; i >= 0; i--) {
		var temp = sf.controller.pending[internal.controller.pending[i]];
		if(temp !== void 0){
			temp(root_(internal.controller.pending[i]), root_);
			internal.controller.pending.splice(i, 1);
		}
	}

	if(sf.controller.pending[scope])
		sf.controller.run(scope);

	return sf.model.root[scope];
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

		var ref = self.root[sf.controller.modelName(currentElement)][list];
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
		if(this.sf$destroying !== void 0)
			clearTimeout(this.sf$destroying);

		if(this.sf$firstInit === void 0)
			return;

		internal.language.refreshLang(this);

		var that = this;
		delete this.sf$firstInit;

		setTimeout(function(){
			if(sf.loader.DOMWasLoaded)
				return sf.model.init(that, that.getAttribute('name'));

			sf.loader.onFinish(function(){
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