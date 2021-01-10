import {internal, forProxying, SFOptions} from "./shared.js";
import {getCallerFile, hotModel} from "./sf-hot-reload.js";
import $ from "./sf-dom.js";
import Loader from "./sf-loader.js";
import Component from "./sf-component.js";
import {getStaticMethods, getPrototypeMethods} from "./utils.js";
import {ModelInit} from "./sf-model/a_model.js";
import {removeModelBinding} from "./sf-model/element-bind.js";

// Data save and HTML content binding
export default function Self(name, options, func, namespace){
	if(options !== void 0)
		return Self.for(name, options, func, namespace);

	// If it's component tag
	if((namespace || Component).registered[name] !== void 0)
		return (namespace || root_)(name);

	const scope = namespace || Self;
	if(scope.root[name] === void 0){
		if(internal.modelInherit[name] !== void 0)
			scope.root[name] = new internal.modelInherit[name]();
		else
			scope.root[name] = {};

		scope.root[name].$el = $();
	}

	return scope.root[name];
};

export function findBindListElement(el, includeComponent){
	el = el.parentNode;
	while(el !== null){
		if((el.sf$elementReferences && el.sf$elementReferences.template.bindList) || (includeComponent && el.sf$controlled !== void 0))
			return el;

		el = el.parentNode;
	}
	return null;
}

export function getScope(el, returnNode){
	if(el === void 0)
		el = $0;

	// If it's Node type
	if(el.tagName !== void 0){
		if(el.sf$controlled === void 0 && !(el.sf$elementReferences && el.sf$elementReferences.template.bindList))
			el = findBindListElement(el, true);

		if(el === null)
			return el;

		if(returnNode)
			return el;
		return el.model;
	}
};

Self.root = {};
internal.modelPending = {};
internal.modelInherit = {};

// Find an index for the element on the list
Self.index = function(element, getProp){
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
Self.for = function(name, options, func, namespace){
	if(options.constructor === Function){
		func = options;

		// It's a class
		if(func.prototype.init !== void 0){
			internal.modelInherit[name] = func;
			func = {class:func};
		}
	}
	else{
		if(func === void 0){
			let root = (namespace || Self).root;

			if(root[name] === void 0){
				options.$el = $();
				root[name] = options;
			}
			else Object.assign(root[name], options);

			return root[name];
		}

		internal.modelInherit[name] = options.extend;
	}

	const scope = namespace || Self;
	if(SFOptions.hotReload)
		hotModel(scope, name, func);

	let scopeTemp = scope(name);

	// Call it it's a function
	if(!SFOptions.hotReload && func.constructor === Function)
		func(scopeTemp, scope);

	if(Loader.DOMWasLoaded && internal.modelPending[name] !== void 0){
		const temp = internal.modelPending[name];
		for (let i = 0; i < temp.length; i++) {
			ModelInit(temp[i], temp[i].getAttribute('name'));
		}

		delete internal.modelPending[name];
	}

	if(SFOptions.devMode){
		if(scopeTemp.$el === void 0)
			scopeTemp.$el = $();

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

// Get property of the model
export function modelKeys(modelRef, toString){
	// it maybe custom class
	if(modelRef.constructor !== Object && modelRef.constructor !== Array){
		var keys = new Set();
		for(var key in modelRef){
			if(key.includes('$'))
				continue;

			keys.add(key);
		}

		getStaticMethods(keys, modelRef.constructor);
		getPrototypeMethods(keys, modelRef.constructor);

		if(toString){
			let temp = '';
			for(var key of keys){
				if(temp.length === 0){
					temp += key;
					continue;
				}

				temp += `|${key}`;
			}

			return temp;
		}

		return [...keys];
	}

	var keys = [];
	for(var key in modelRef){
		if(key.includes('$'))
			continue;

		keys.push(key);
	}

	if(toString)
		return keys.join('|');

	return keys;
}
Self.modelKeys = modelKeys;

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
		if(Self.root[name] !== void 0 && internal.modelPending[name] === void 0){
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
		if(internal.modelPending[name] === void 0)
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
					var model = that.model;
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

customElements.define('sf-m', SFModel);

var root_ = function(scope){
	if(Component.registered[scope])
		return Component(scope);

	if(Self.root[scope] === void 0)
		Self.root[scope] = {};

	return Self.root[scope];
}

// Let's check all pending model
$(function(){
	for(var keys in internal.modelPending){
		var ref = internal.modelPending[keys];
		for (var z = 0; z < ref.length; z++)
			ModelInit(ref[z], ref[z].getAttribute('name'));

		delete internal.modelPending[keys];
	}
});