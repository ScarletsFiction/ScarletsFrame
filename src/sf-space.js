sf.space = function(namespace, options){
	return new Space(namespace, options);
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

			for (var i = 0; i < domList.length; i++) {
				var component = domList[i].getElementsByTagName(scope);
				if(component.length === 0)
					continue;

				for (var a = 0, n = component.length; a < n; a++)
					available.push(component[a].model);
			}

			return available;
		}

		if(root_.root[scope] === void 0){
			root_.root[scope] = {};

			if(modelFunc[scope].constructor !== Function)
				console.warn(scope, "haven't been registered. Please check your compiler settings or the compiled file");
			else modelFunc[scope](root_.root[scope], root_);
		}

		return root_.root[scope];
	}

	root_.root = {};
	root_.modelFunc = modelFunc;
	root_.registered = registered;
	var domList = root_.domList = [];

	return root_;
}

internal.space = {
	empty:true,
	initComponent:function(root, tagName, elem, $item, asScope){
		sf.component.new(tagName, elem, $item, root.constructor === Function ? root : root.sf$space, asScope);
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
	constructor(namespace, options){
		if(namespace === void 0)
			throw new Error('`namespace` parameter need to be specified');

		if(namespace !== namespace.toLowerCase())
			throw new Error('`namespace` must be lowercase');

		this.namespace = namespace;
		this.scope = getNamespace(this.namespace, '');

		if(options){
			this.templatePath = options.templatePath;
		}
	}

	getScope(index){
		return getNamespace(this.namespace, index || '');
	}

	createHTML(index){
		var that = this;
		return $(window.templates[this.templatePath]
			.replace(/<sf-space(.*?)(?:|="(.*?)")>/, function(full, namespace, index_){
				if(index_ && isNaN(index_) === false)
					index_ = Number(index_) + 1;

				index = index || index_ || false;
				if(index)
					index = '="'+index+'"';

				return '<sf-space '+that.namespace+'>';
			}))[0];
	}

	destroy(){
		
	}
}

;(function(){
	var self = Space.prototype;
	self.model = function(name, options, func){
		if(options !== void 0){
			if(options.constructor === Function)
				func = options;
			else{
				internal.modelInherit[name] = options.extend;
			}

			var old = this.scope.modelFunc[name];
			this.scope.modelFunc[name] = func;

			if(old !== void 0 && old.constructor === Array)
				for (var i = 0; i < old.length; i++){
					sf.model.init.apply(null, old[i]);
				}

			return;
		}

		sf.model(name, options, func, this.scope);
	}

	self.component = function(name, options, func){
		return sf.component(name, options, func, this.scope);
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
		this.sf$space.domList.push(this);
	}
	disconnectedCallback(){
		var that = this;
		this.sf$destroying = setTimeout(function(){
			var i = that.sf$space.domList.indexOf(that);
			if(i !== -1)
				that.sf$space.domList.splice(i, 1);
		}, 1000);
	}
}

customElements.define('sf-space', SFSpace);