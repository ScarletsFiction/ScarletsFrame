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
			ref = scope[''] = createRoot_({}, {});

			if(id === '')
				return ref;
		}

		scope[id] = createRoot_(ref.modelFunc, ref.registered);
	}

	return scope[id];
}

function createRoot_(modelFunc, registered){
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

		if(root_.root[scope] === void 0){
			root_.root[scope] = {};
			root_.modelFunc[scope](root_.root[scope], root_);
		}

		return root_.root[scope];
	}

	root_.root = {};
	root_.modelFunc = modelFunc;
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
		var name = elem.getAttribute('name');

		// Pending if model handler was not loaded
		if(root.sf$space.modelFunc[name] === void 0)
			return root.sf$space.modelFunc[name] = [[elem, name, root.sf$space]];

		if(root.sf$space.modelFunc[name].constructor === Array)
			return root.sf$space.modelFunc[name].push([elem, name, root.sf$space]);

		sf.model.init(elem, name, root.sf$space);
	},
};

class Space{
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
		if(func !== void 0){
			var old = this.scope.modelFunc[name];
			this.scope.modelFunc[name] = func;

			if(old !== void 0 && old.constructor === Array)
				for (var i = 0; i < old.length; i++){
					sf.model.init.apply(null, old[i]);
				}

			return;
		}

		sf.model(name, func, this.scope);
	}

	self.component = function(name, func){
		if(func !== void 0){
			if(func.constructor === Function)
				return sf.component.for(name, func, this.scope);
			return sf.component.html(name, func, this.scope);
		}

		return console.error("No Operation");
	}

	self.destroy = function(){
		var keys = Object.keys(this.root);
		for (var i = 0; i < keys.length; i++) {
			if(keys[i].indexOf(namespace) === 0){
				this.root[keys[i]].$el.remove();
				delete this.root[keys[i]];
			}
		}

		var keys = Object.keys(this.components.registered);
		for (var i = 0; i < keys.length; i++) {
			if(keys[i].indexOf(namespace) === 0)
				delete this.components.registered[keys[i]];
		}

		var keys = Object.keys(this.components.available);
		for (var i = 0; i < keys.length; i++) {
			if(keys[i].indexOf(namespace) === 0)
				delete this.components.available[keys[i]];
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