// ToDo: shared or non-private space is possible to have memory leak when component are removed from DOM
// this because component haven't removed from the list

sf.space = function(options){
	return new Space(options);
};

// { name:{ '':{}, id:{}, ... } }
sf.space.list = {};
function getNamespace(name, id){
	var scope = sf.space.list[name];
	if(scope === void 0)
		scope = sf.space.list[name] = {};

	if(scope[id] === void 0){
		var ref = scope[''];
		if(ref === void 0){
			ref = scope[''] = createRoot_({});

			if(id === '')
				return ref;
		}

		scope[id] = createRoot_(ref.registered);
	}

	return scope[id];
}

function createRoot_(registered){
	var root_ = function(scope){
		if(root_.registered[scope]){
			var available = [];
			var component = root_.available[scope];
			if(component !== void 0){
				for (var i = 0; i < component.length; i++) {
					available.push(root_.root[component[i]]);
				}
			}
			return available;
		}

		if(!root_.root[scope]){
			var scope_ = root_.root[scope] = {};

			if(internal.modelPending[scope] !== void 0){
				var ref = internal.modelPending[scope];
				for (var a = 0; a < ref.length; a++) {
					ref[a](scope_, root_);
				}

				delete internal.modelPending[scope];
			}
		}

		return root_.root[scope];
	}

	root_.root = {};
	root_.registered = registered;
	root_.available = {};

	return root_;
}

internal.space = {
	empty:true,
	initComponent:function(root, tagName, elem, $item){
		sf.component.new(tagName, elem, $item, root.sf$space);
	},
	initModel:function(root, elem){
		sf.model.init(elem, elem.getAttribute('name'), root.sf$space);
	},
};

class Space{
	namespace = '';
	scope = null;

	constructor(options){
		if(options.namespace === void 0)
			throw new Error('`namespace` parameter need to be specified');

		this.namespace = options.namespace;
		this.scope = getNamespace(this.namespace, '');
	}
}

;(function(){
	var self = Space.prototype;
	self.model = function(name, func){
		sf.model(name, func, this.scope);
	}

	self.model.for = function(name, func){
		sf.model.for(name, func, this.scope);
	}

	self.component = function(name, func){
		if(func !== void 0){
			if(func.constructor === Function)
				return sf.component.for(name, func, this.scope);
			return sf.component.html(name, func, this.scope);
		}

		return console.error("No Operation");
	}

	self.component.for = function(name, func){
		sf.component.for(name, func, this.scope);
	}

	self.component.html = function(name, outerHTML){
		sf.component.html(name, func, this.scope);
	}

	self.destroy = function(){
		var namespace = this.namespace+'-';

		var keys = Object.keys(self.models);
		for (var i = 0; i < keys.length; i++) {
			if(keys[i].indexOf(namespace) === 0){
				self.models[keys[i]].$el.remove();
				delete self.models[keys[i]];
			}
		}

		var keys = Object.keys(self.components.registered);
		for (var i = 0; i < keys.length; i++) {
			if(keys[i].indexOf(namespace) === 0)
				delete self.components.registered[keys[i]];
		}

		var keys = Object.keys(self.components.available);
		for (var i = 0; i < keys.length; i++) {
			if(keys[i].indexOf(namespace) === 0)
				delete self.components.available[keys[i]];
		}

		var keys = Object.keys(internal.component);
		for (var i = 0; i < keys.length; i++) {
			if(keys[i].indexOf(namespace) === 0)
				delete internal.component[keys[i]];
		}
	}
})();

// Define sf-model element
class SFSpace extends HTMLElement {
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
		internal.space.empty = false;

		// Extract namespace name
		for(var i=0, n=this.attributes.length; i < n; i++){
			var name = this.attributes[i].name
			if(name === 'class' || name === 'style' || name === 'id')
				continue;

			this.sf$spaceName = name;
			this.sf$spaceID = this.attributes[i].value;
			break;
		}

		if(this.sf$spaceName === void 0)
			throw new Error("<sf-space>: space name was undefined");

		this.sf$space = getNamespace(name, this.sf$spaceID);
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

customElements.define('sf-space', SFSpace);