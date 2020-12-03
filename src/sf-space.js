// ToDo: Tidy up, the implementation seems dirty
function getNamespace(name, id){
	let scope = sf.space.list[name];
	if(scope === void 0)
		scope = sf.space.list[name] = {_waiting:[]};

	if(scope[id] === void 0){
		let ref = scope.default;
		if(ref === void 0){
			ref = scope.default = createRoot_({}, 'default', scope);

			if(id === 'default')
				return ref;
		}

		scope[id] = createRoot_(ref.registered, id, scope);
	}

	return scope[id];
}

function createRoot_(registered, id, space){
	function SpaceScope(scope){
		let temp = SpaceScope.components[scope];
		if(temp) return temp[2];

		temp = SpaceScope.root;
		if(temp[scope] === void 0){
			temp = temp[scope] = {$el:$()};

			const func = modelFunc[scope];
			if(func && func.constructor === Function)
				func(temp, SpaceScope);

			return temp;
		}

		return temp[scope];
	};

	if(space.Space === void 0){
		if(space._pendingInit === void 0)
			space = space._pendingInit = {modelFunc:{}, modelList:{}, componentList:{}, _scope:[]};
		else space = space._pendingInit;

		space._scope.push(SpaceScope);
	}
	else space = space.Space;

	var modelFunc = space.modelFunc;
	SpaceScope.Space = space;
	SpaceScope.id = id;
	SpaceScope.registered = registered;
	SpaceScope.domList = [];
	space.modelList[id] = SpaceScope.root = {};
	space.componentList[id] = SpaceScope.components = {};

	return SpaceScope;
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
			const space = root.sf$space.Space;

			// Pending if model handler was not loaded
			if(space.modelFunc[name] === void 0)
				return space.modelFunc[name] = [[elem, name, root.sf$space]];

			if(space.modelFunc[name].constructor === Array)
				return space.modelFunc[name].push([elem, name, root.sf$space]);

			sf.model.init(elem, name, root.sf$space);
		},
	};

if(window.sf$proxy === void 0)
	forProxying.internalSpace = internal.space;

class Space{
	inherit = {};
	// modelList = {default:{model-name:{ model here }}};
	// modelFunc = {};
	// componentList = {default:{comp-name:[ comp list here ]}};

	constructor(namespace, options){
		if(namespace === void 0)
			throw new Error('`namespace` parameter need to be specified');

		if(namespace !== namespace.toLowerCase())
			throw new Error('`namespace` must be lowercase');

		this.namespace = namespace;

		let scope = sf.space.list[namespace];
		if(scope === void 0)
			scope = sf.space.list[namespace] = {};

		if(scope._pendingInit){
			let temp = scope._pendingInit;
			this.modelList = temp.modelList;
			this.modelFunc = temp.modelFunc;
			this.componentList = temp.componentList;
			for (var i = 0; i < temp._scope.length; i++) {
				temp._scope[i].Space = this;
			}
			delete scope._pendingInit;
		}
		else{
			this.modelList = {};
			this.modelFunc = {};
			this.componentList = {};
		}

		scope.Space = this;
		if(scope._waiting !== void 0){
			let waiting = scope._waiting;
			delete scope._waiting;
			for (var i = 0; i < waiting.length; i++) {
				let temp = waiting[i];
				temp.sf$space = getNamespace(namespace, temp.sf$spaceID);
				temp.sf$space.domList.push(temp);
			}
		}

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

	model(name, options, func){
		if(options !== void 0){
			if(options.constructor === Function)
				func = options;
			else
				internal.modelInherit[name] = options.extend;

			const old = this.modelFunc[name];
			this.modelFunc[name] = func;

			if(this.modelList.default[name] === void 0)
				this.modelList.default[name] = {};

			if(old !== void 0 && old.constructor === Array){
				sf.model.for(name, options, func, this.default);

				for (let i = 0; i < old.length; i++){
					const arg = old[i];
					sf.model.init(arg[0], arg[1], arg[2], this.default);
				}
				return this.modelList.default[name];
			}
		}

		sf.model.for(name, options, func, this.default);
		return this.modelList.default[name];
	}

	component(name, options, func){
		const temp = this.componentList.default;
		temp[name] = sf.component(name, options, func, this.default);
		return temp[name];
	}

	destroy(){
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
}

sf.space = Space;

// { name:{ default:{}, id:{}, ... } }
sf.space.list = {};

// Define sf-model element
class SFSpace extends HTMLElement {
	constructor(){
		super();
		this.sf$firstInit = true;
	}
	connectedCallback(){
		if(this.sf$destroying !== void 0){
			clearTimeout(this.sf$destroying);
			delete this.sf$destroying;
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
		if(this.sf$space._waiting !== void 0)
			this.sf$space._waiting.push(this);
		else
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