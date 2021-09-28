import {internal, forProxying, SFOptions, HotReload} from "./shared.js";
import {$} from "./sf-dom.js";
import {loader as Loader} from "./sf-loader.js";
import {component as Component} from "./sf-component.js";
import {getCallerFile, modelKeys, findBindListElement, isClass, proxyClass} from "./utils.js";
import {ModelInit} from "./sf-model/a_model.js";
import {ModelInternal} from "./sf-model/a_shared.js";
import {removeModelBinding} from "./sf-model/element-bind.js";
import "./sf-space.js";

var root_ = function(scope){
	if(Component.registered[scope])
		return Component(scope);

	if(!(scope in model.root))
		model.root[scope] = {};

	return model.root[scope];
}

// Data save and HTML content binding
export function model(name, options, func, namespace){
	if(options !== void 0)
		return model.for(name, options, func, namespace);

	// If it's component tag
	if(name in (namespace || Component).registered)
		return (namespace || root_)(name);

	const scope = namespace || model;
	if(!(name in scope.root)){
		if(name in internal.modelInherit)
			scope.root[name] = new internal.modelInherit[name]((namespace || root_));
		else
			scope.root[name] = {};

		scope.root[name].$el = $.callableList();
	}

	return scope.root[name];
};

model.root = {};
internal.modelPending = {};
internal.modelInherit = {};

// Find an index for the element on the list
model.index = function(element, getProp){
	if(!element.sf$elementReferences || !element.sf$elementReferences.template.bindList)
		element = findBindListElement(element);

	if(element === null)
		return -1;

	if(getProp)
		return element.sf$repeatListIndex;

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
	if(VSM !== void 0) return i - 1 + VSM.firstCursor; // -1 for virtual spacer
	return i;
}

// Declare model for the name with a function
model.for = function(name, options, func, namespace){
	const scope = namespace || model;
	let { root } = scope;
	let isExist = name in root;

	if(options.constructor === Function)
		func = options;
	else{
		if(func === void 0){
			if(!(name in root)){
				options.$el = $.callableList();
				root[name] = options;
			}
			else Object.assign(root[name], options);

			return root[name];
		}

		internal.modelInherit[name] = options.extend;
	}

	if(func !== void 0){
		// It's a class
		if(isClass(func)){
			if(!(func.prototype instanceof Model))
				throw new Error("sf.model> Class must extend sf.Model");

			internal.componentInherit[name] = func;
			func = {class:func};
		}
		else if(options.extend !== void 0){
			if(isExist)
				Model.reuse = root[name];

			let temp = root[name] = new options.extend(scope);

			if(isExist) // This need to be here
				Object.setPrototypeOf(temp, options.extend.prototype);
		}
	}
	else func = NOOP;

	if(SFOptions.hotReload)
		HotReload.Model(scope, name, func);

	let scopeTemp = scope(name);

	// Call it it's a function
	if(!SFOptions.hotReload && func.constructor === Function)
		func(scopeTemp, scope);

	if(func.class && scopeTemp.constructor !== func.class){
		let temp = scopeTemp;
		if(isExist)
			Model.reuse = root[name];

		scopeTemp = root[name] = new func.class(scope);

		if(isExist) // This need to be here
			Object.setPrototypeOf(scopeTemp, func.class.prototype);

		// Class combine, non-enumerable
		// Object.defineProperties(scopeTemp, Object.getOwnPropertyDescriptors(temp));
	}
	else proxyClass(scopeTemp);

	if(Loader.DOMWasLoaded && name in internal.modelPending){
		const temp = internal.modelPending[name];
		for (let i = 0; i < temp.length; i++) {
			const ref = temp[i];
			ModelInit(ref, ref.getAttribute('name'));
		}

		delete internal.modelPending[name];
	}

	if(SFOptions.devMode){
		scopeTemp.$el ??= $.callableList();

		if(scopeTemp.$el.$devData === void 0)
			Object.defineProperty(scopeTemp.$el, '$devData', {
				configurable: true,
				value: {
					func,
					filePath: getCallerFile(namespace ? 2 : 2)
				}
			});
	}

	// Return model scope
	return scopeTemp;
}

model.modelKeys = modelKeys;

// Define sf-model element
export class SFModel extends HTMLElement {
	constructor(){
		super();
		this.sf$firstInit = true;
	}
	connectedCallback(){
		if(internal.virtualScrolling) return;

		if(this.sf$destroying !== void 0){
			clearTimeout(this.sf$destroying);
			delete this.sf$destroying;
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
		if(name in model.root && !(name in internal.modelPending)){
			// Run init when all assets have loaded
			if(Loader.DOMWasLoaded){
				internal.language.refreshLang(this);
				return ModelInit(this, name);
			}

			const that = this;
			Loader.onFinish(function(){
				internal.language.refreshLang(that);
				ModelInit(that, name);
			});
			return;
		}

		// Pending model initialization
		if(!(name in internal.modelPending))
			internal.modelPending[name] = [];

		internal.modelPending[name].push(this);
	}
	disconnectedCallback(){
		if(internal.virtualScrolling) return;

		const that = this;
		const destroy = function(){
			if(that.model === void 0)
				return;

			if(that.model.$el){
				const i = that.model.$el.indexOf(that);
				if(i !== -1){
					const model = that.model;
					const temp = model.$el[i];

					model.$el = model.$el.splice(i, 1);
					model.destroy && model.destroy(temp, model.$el.length === 0);
				}
			}

			removeModelBinding(that.model);
		};

		if(window.destroying)
			return destroy();

		this.sf$destroying = setTimeout(destroy, 1000);
	}
}

if(window.sf$proxy)
	SFModel._ref = window.sf$proxy.SFModel;
else forProxying.SFModel = SFModel._ref = SFModel;

ModelInternal._ref = SFModel._ref;
customElements.define('sf-m', SFModel);

let Super = {
	get(obj, prop){
		if(!(prop in obj.prototype))
			return;
		obj.prototype[prop];
	}
};

export class Model {
	static reuse;
	constructor(){
		if(Model.reuse !== void 0){
			let temp = Model.reuse;
			Model.reuse = void 0;

			if(!(temp.constructor.prototype instanceof Model))
				Object.setPrototypeOf(temp, Model.prototype);

			return temp;
		}
	}
}

// Let's check all pending model
setTimeout(()=> {
	$(function(){
		try{
			for(var keys in internal.modelPending){
				var ref = internal.modelPending[keys];
				for (var z = 0; z < ref.length; z++){
					const temp = ref[z];
					ModelInit(temp, temp.getAttribute('name'));
				}

				delete internal.modelPending[keys];
			}
		} catch(e) {
			e.model = {Name:ref[z].getAttribute('name'), ModelContext:ref[z].model};
			throw e;
		}
	});
}, 10);