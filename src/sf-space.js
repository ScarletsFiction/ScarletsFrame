// ToDo: component list on registrar[2] still using same reference

sf.space = (namespace, options)=> new Space(namespace, options);

// { name:{ default:{}, id:{}, ... } }
sf.space.list = {};
function getNamespace(name, id){
	let scope = sf.space.list[name];
	if(scope === void 0)
		scope = sf.space.list[name] = {};

	if(scope[id] === void 0){
		let ref = scope.default;
		if(ref === void 0){
			ref = scope.default = createRoot_({}, {});

			if(id === 'default')
				return ref;
		}

		scope[id] = createRoot_(ref.modelFunc, ref.registered);
	}

	return scope[id];
}

function createRoot_(modelFunc, registered){
	var root_ = function(scope){
		let temp = root_.registered[scope];
		if(temp) return temp[2];

		temp = root_.root;
		if(temp[scope] === void 0){
			temp[scope] = {};

			if(modelFunc[scope].constructor !== Function)
				console.warn(scope, "haven't been registered. Please check your compiler settings or the compiled file");
			else modelFunc[scope](temp[scope], root_);
		}

		return temp[scope];
	}

	root_.root = {};
	root_.modelFunc = modelFunc;
	root_.registered = registered;
	const domList = root_.domList = [];

	return root_;
}

if(window.sf$proxy)
	internal.space = window.sf$proxy.internalSpace;
else
	internal.space = {
		empty:true,
		initComponent(root, tagName, elem, $item, asScope){
			sf.component.new(tagName, elem, $item, root.constructor === Function ? root : root.sf$space, asScope);
		},
		initModel(root, elem){
			const name = elem.getAttribute('name');

			// Pending if model handler was not loaded
			if(root.sf$space.modelFunc[name] === void 0)
				return root.sf$space.modelFunc[name] = [[elem, name, root.sf$space]];

			if(root.sf$space.modelFunc[name].constructor === Array)
				return root.sf$space.modelFunc[name].push([elem, name, root.sf$space]);

			sf.model.init(elem, name, root.sf$space);
		},
	};

if(window.sf$proxy === void 0)
	forProxying.internalSpace = internal.space;

class Space{
	constructor(namespace, options){
		if(namespace === void 0)
			throw new Error('`namespace` parameter need to be specified');

		if(namespace !== namespace.toLowerCase())
			throw new Error('`namespace` must be lowercase');

		this.namespace = namespace;
		this.default = getNamespace(namespace, 'default');

		this.list = sf.space.list[namespace];

		if(options)
			this.templatePath = options.templatePath;
	}

	getScope(index){
		return getNamespace(this.namespace, index || 'default');
	}

	createHTML(index){
		const that = this;
		return $(window.templates[this.templatePath]
			.replace(/<sf-space(.*?)(?:|="(.*?)")>/, function(full, namespace, index_){
				if(index_ && isNaN(index_) === false)
					index_ = Number(index_) + 1;

				index = index || index_ || false;
				if(index)
					index = `="${index}"`;

				return `<sf-space ${that.namespace}>`;
			}))[0];
	}

	destroy(){

	}
}

;(function(){
	const self = Space.prototype;
	self.model = function(name, options, func){
		if(options !== void 0){
			if(options.constructor === Function)
				func = options;
			else{
				internal.modelInherit[name] = options.extend;
			}

			const old = this.default.modelFunc[name];
			this.default.modelFunc[name] = func;

			if(old !== void 0 && old.constructor === Array)
				for (let i = 0; i < old.length; i++){
					const arg = old[i];
					sf.model.init(arg[0], arg[1], arg[2]);
				}

			return;
		}

		sf.model(name, options, func, this.default);
	}

	self.component = function(name, options, func){
		return sf.component(name, options, func, this.default);
	}

	self.destroy = function(){
		for(var keys in this.root){
			if(keys.indexOf(namespace) === 0){
				this.root[keys].$el.remove();
				delete this.root[keys];
			}
		}

		for(var keys in this.components.registered){
			if(keys.indexOf(namespace) === 0)
				delete this.components.registered[keys];
		}

		for(var keys in internal.component){
			if(keys.indexOf(namespace) === 0)
				delete internal.component[keys];
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
		forProxying.internalSpaceEmpty = internal.space.empty = false;

		// Extract namespace name
		for(let i=0, n=this.attributes.length; i < n; i++){
			var { name } = this.attributes[i]
			if(name === 'class' || name === 'style' || name === 'id')
				continue;

			this.sf$spaceName = name;
			this.sf$spaceID = this.attributes[i].value || 'default';
			break;
		}

		if(this.sf$spaceName === void 0)
			throw new Error("<sf-space>: space name was undefined");

		this.sf$space = getNamespace(name, this.sf$spaceID);
		this.sf$space.domList.push(this);
	}
	disconnectedCallback(){
		const that = this;
		const destroy = function(){
			const i = that.sf$space.domList.indexOf(that);
			if(i !== -1)
				that.sf$space.domList.splice(i, 1);
		}

		if(window.destroying)
			return destroy();

		this.sf$destroying = setTimeout(destroy, 1000);
	}
}

customElements.define('sf-space', SFSpace);