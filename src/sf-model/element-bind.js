import {SFOptions, internal, forProxying} from "../shared.js";
import {stringifyPropertyPath, deepProperty, parsePropertyPath} from "../utils.js";
import {syntheticTemplate, templateParser, syntheticReactiveArray} from "./template.js";
import {extractPreprocess, revalidateBindingPath} from "./parser.js";
import {initBindingInformation} from "./a_utils.js";
import {cachedReactivity} from "./bind-structure.js";
import {ReactiveArray, ReactiveMap, ReactiveSet, PropertyList, ElementManipulatorProxy, forceReactive, RL_BindStatus} from "./repeated-list.js";

export function removeModelBinding(ref, isDeep, isLazy, isUniqList, ignoreInElement){
	if(ref === void 0)
		return;

	if(window.sf$proxy !== void 0)
		return window.sf$proxy.removeModelBinding.apply(null, arguments);

	const hasIgnore = ignoreInElement !== void 0;

	const bindedKey = ref.sf$bindedKey;
	for(let key in bindedKey){
		const obj = ref[key];

		if(obj != null && obj.$EM !== void 0){
			// Deep remove for repeated element, only if it's object data type (primitive don't have sf$bindedKey)
			if(obj._$sfReactive === ReactiveArray){
				for (var i = 0; i < obj.length; i++){
					if(typeof obj[i] === 'object')
						removeModelBinding(obj[i], false, isLazy, void 0, ignoreInElement);
					else break;
				}
			}
			else if(obj._$sfReactive === ReactiveMap){
				for(const [k, v] of obj){
					if(typeof v === 'object')
						removeModelBinding(v, false, isLazy, void 0, ignoreInElement);
					else break;
				}
			}
			else if(obj._$sfReactive === ReactiveSet){
				for(const v of obj){
					if(typeof v === 'object')
						removeModelBinding(v, false, isLazy, void 0, ignoreInElement);
					else break;
				}
			}
			else{
				for(const k in obj){
					if(typeof obj[k] === 'object')
						removeModelBinding(obj[k], false, isLazy, void 0, ignoreInElement);
					else break;
				}
			}

			// Clean ElementManipulator first
			let onlyCleanEM = false;
			if(obj.$EM.constructor === ElementManipulatorProxy){
				const { list } = obj.$EM;
				for (var i = list.length-1; i >= 0; i--) {
					let temp = list[i];
					if(temp.parentNode.isConnected === false){
						if(!temp.isComponent)
							repeatedRemoveDeepBinding(obj, temp.template.modelRef_path, isLazy, isUniqList, ignoreInElement);

						if(hasIgnore && ignoreInElement.contains(temp.parentNode))
							continue;

						list.splice(i, 1);
					}
				}

				if(list.length === 1)
					obj.$EM = obj.$EM.list[0];

				if(list.length !== 0)
					onlyCleanEM = true;
			}
			else if(obj.$EM.parentNode.isConnected === false){
				if(!obj.$EM.isComponent)
					repeatedRemoveDeepBinding(obj, obj.$EM.template.modelRef_path, isLazy, isUniqList, ignoreInElement);

				if(hasIgnore && ignoreInElement.contains(obj.$EM.parentNode))
					onlyCleanEM = true;
			}
			else onlyCleanEM = true;

			if(onlyCleanEM === false){
				// Clear virtual scroll
				if(obj.$virtual){
					obj.$virtual.destroy();
					delete obj.$virtual;
				}

				if(obj.$EM !== void 0){
					if(obj.$EM.list === void 0) {
						obj.$EM = new ElementManipulatorProxy();
						obj.$EM.list = [];
					}
					else if(obj.$EM.constructor === ElementManipulatorProxy)
						obj.$EM.list.length = 0;
					else if(obj.$size === void 0 && obj.$length === void 0){
						delete obj.$EM;
						resetReactiveProto(obj);
					}
				}

				if(isUniqList)
					obj.length = 0;
				else if(isLazy === void 0){
					delete ref[key];
					ref[key] = obj;
				}
			}
		}

		let that = bindedKey[key];
		if(that === RL_BindStatus || that == null)
			continue; // This just RepeatedList bind status

		const {elements, callback, bindList, input} = that;
		var bindLength = 0;
		if(elements){
			for (var i = elements.length-1; i >= 0; i--) {
				if(elements[i].element.isConnected === false){
					if(hasIgnore && ignoreInElement.contains(elements[i].element))
						continue;

					elements.splice(i, 1);
				}
			}

			bindLength += elements.length;
		}
		if(bindList){
			let exist = new Set();
			for (let i = bindList.length-1; i >= 0; i--) {
				let bindList_ = bindList[i].bindList;

				if(exist.has(bindList_)){
					bindList.splice(i, 1);
					continue;
				}

				let EM = bindList_.$EM;
				if(EM && EM.constructor === ElementManipulatorProxy){
					let temp = EM.list;

					for (let a=temp.length-1; a >= 0; a--) {
						if(temp[a].parentNode.isConnected === false)
							temp.splice(a, 1);
					}

					if(temp.length === 0){
						let obj = bindList[i].bindList;
						EM = obj.$EM = void 0;
						resetReactiveProto(obj);
					}
				}

				if(EM === void 0)
					bindList.splice(i, 1);

				exist.add(bindList_);
			}

			bindLength += bindList.length;
		}
		if(input){
			for (var i = input.length-1; i >= 0; i--) {
				if(input[i].isConnected === false){
					if(hasIgnore && ignoreInElement.contains(input[i]))
						continue;

					input.splice(i, 1);
				}
			}

			if(input.length === 0)
				delete bindedKey[key].inputBound;

			bindLength += input.length;
		}
		if(callback){
			for (var i = callback.length-1; i >= 0; i--) {
				const els = callback[i].element;

				if(els && els.isConnected === false){
					if(hasIgnore && ignoreInElement.contains(els))
						continue;

					callback.splice(i, 1);
				}
			}

			bindLength += callback.length;
		}

		// if(bindLength === 0 && isLazy === void 0 && !isUniqList && ignoreInElement === void 0){
		// 	let desc = Object.getOwnPropertyDescriptor(ref, key);
		// 	if(obj === void 0 || desc === void 0 || desc.set === void 0)
		// 		continue;

		// 	// Reconfigure / Remove property descriptor
		// 	delete ref[key];
		// 	ref[key] = obj;
		// }
	}

	// Check for deeper sf$bindingKey
	if(isDeep !== void 0 || ref.sf$internal === void 0)
		return;

	const deep = ref.sf$internal.deepBinding;
	if(deep === void 0) return;

	for(let path in deep){
		const model = deepProperty(ref, path.split('%$'));
		if(model !== void 0)
			removeModelBinding(model, true, isLazy, path === 'sf$uniqList', ignoreInElement);
	}
}

function resetReactiveProto(obj){
	// reset prototype
	if(obj._$sfReactive === ReactiveArray)
		Object.setPrototypeOf(obj, Array.prototype);
	else if(obj._$sfReactive === ReactiveMap)
		Object.setPrototypeOf(obj, Map.prototype);
	else if(obj._$sfReactive === ReactiveSet)
		Object.setPrototypeOf(obj, Set.prototype);
	else if(obj._$sfReactive === PropertyList)
		Object.setPrototypeOf(obj, Object.prototype);
}


if(window.sf$proxy === void 0)
	forProxying.removeModelBinding = removeModelBinding;

function repeatedRemoveDeepBinding(obj, refPaths, isLazy, isUniqList, ignoreInElement){
	if(refPaths.length === 0)
		return;

	that:for (let a = 0; a < refPaths.length; a++) {
		if(refPaths[a].length === 1)
			continue;

		const ref = refPaths[a].slice(0, -1);
		if(obj._$sfReactive === ReactiveArray){
			for (let i = 0; i < obj.length; i++) {
				var deep = deepProperty(obj[i], ref);
				if(deep === void 0)
					continue;

				removeModelBinding(deep, false, isLazy, isUniqList, ignoreInElement);
			}
			continue that;
		}

		// ToDo: check if ReactiveMap, ReactiveSet, PropertyList also need to be cleared

		for(let key in obj){
			var deep = deepProperty(obj[key], ref);
			if(deep === void 0)
				continue;

			removeModelBinding(deep, false, isLazy, isUniqList, ignoreInElement);
		}
	}
}

export function watch(model, propertyName, callback){
	if(propertyName.constructor === Object){
		for(var key in propertyName){
			callback = propertyName[key];
			callback._sf = false;
			watch(model, key, callback);
		}
		return;
	}

	if(propertyName.constructor === Array){
		for (var i = 0; i < propertyName.length; i++)
			watch(model, propertyName[i], callback);
		return;
	}

	callback._sf = false;
	modelToViewBinding(model, propertyName, callback, void 0, void 0, 'callback');
}

export function unwatch(model, propertyName, callback){
	let bindedKey = model.sf$bindedKey;
	if(bindedKey === void 0) return;

	if(propertyName.constructor === Array){
		for (var i = 0; i < propertyName.length; i++)
			unwatch(model, propertyName[i]);

		return;
	}

	const callbacks = bindedKey[propertyName].callback;
	if(callbacks === void 0) return;

	if(callback === void 0){
		for (var i = callbacks.length - 1; i >= 0; i--) {
			if(callbacks[i]._sf === false)
				callbacks.splice(i, 1);
		}

		return;
	}

	if(callbacks.includes(callback) === false)
		return;

	callbacks.splice(callbacks.indexOf(callback), 1);
}

export function modelToViewBinding(model, propertyName, callback, elementBind, type, bindName){
	const originalModel = model;
	let originalPropertyName = propertyName;

	// Dive to the last object, create if not exist
	if(propertyName.constructor === Array){
		if(propertyName.length === 1)
			propertyName = propertyName[0];
		else{
			// Register every path as fixed object (where any property replacement will being assigned)
			for (let i = 0, n = propertyName.length-1; i < n; i++) {
				let temp = propertyName[i];
				let value = model[temp];

				// Return if this not an object
				if(typeof value !== 'object')
					return;

				let desc = Object.getOwnPropertyDescriptor(model, temp);
				if(desc.set === void 0){
					Object.defineProperty(model, temp, {
						enumerable: desc.enumerable ?? false,
						configurable: true,
						get:()=> value,
						set:val=> Object.assign(value, val)
					});
				}

				model = value;
			}

			propertyName = propertyName[propertyName.length-1];
		}
	}

	if(model.splice !== void 0
	   && propertyName.constructor === Number
	   && model[propertyName] === void 0) return;

	// Enable multiple element binding
	if(model.sf$bindedKey === void 0)
		initBindingInformation(model);

	let bindedKey = model.sf$bindedKey;

	if(propertyName in bindedKey){
		var hasBindInit = true;
		bindedKey = bindedKey[propertyName];

		if(bindName === 'inputBound'){
			if(elementBind !== void 0){
				if(bindedKey === RL_BindStatus)
					bindedKey = {_RL: true}; // Unfreeze

				if(bindedKey.input === void 0){
					bindedKey.input = [elementBind];
					bindedKey.input.type = type;
				}
				else bindedKey.input.push(elementBind);
			}

			if(bindName in bindedKey) return;
			bindedKey.inputBound = callback;
		}
		else{
			if(bindedKey === RL_BindStatus)
				bindedKey = {_RL: true}; // Unfreeze

			let ref = bindedKey[bindName] ??= [];

			if(ref.includes(callback) === false){
				const prop = stringifyPropertyPath(originalPropertyName);

				if(bindName === 'bindList'){
					let RefRoot = callback.modelRefRoot_path;
					if(RefRoot.length !== 0 && callback.hasDeep === void 0){
						if(callback.hasDeep === void 0){
							let deep = callback.hasDeep = {};

							for (var i = 0; i < RefRoot.length; i++) {
								const item = RefRoot[i];
								if(item.length !== 1)
									deep[item.slice(0, -1).join('%$')] = true;
							}
						}

						if(originalModel.sf$internal === void 0){
							Object.defineProperty(originalModel, 'sf$internal', {
								configurable:true, value:{}
							});
						}

						let deepBinding = originalModel.sf$internal.deepBinding;

						if(deepBinding != null) Object.assign(deepBinding, callback.hasDeep);
						else originalModel.sf$internal.deepBinding = callback.hasDeep;
					}

					// ToDo: Make this more efficient
					if(callback.model){
						if(callback.model !== originalModel && callback.prop !== prop)
							console.error(`Key already has bind information '${callback.prop}' but being replaced with ${prop}`);
						else callback = Object.create(callback);
					}
				}

				callback.prop = prop;
				callback.model = originalModel;
				ref.push(callback);
			}
		}

		if(!callback.template || bindedKey._regex === callback.template.modelRefRoot_regex)
			return;
	}
	else{
		var hasBindInit = false;

		// Don't delete sf$bindedKey from model because can cause memory leak
		bindedKey = bindedKey[propertyName] = {
			[bindName]: (bindName !== 'inputBound' ? [callback] : callback)
		};

		if(elementBind !== void 0){
			var ref = bindedKey;
			ref.input = [elementBind];
			ref.input.type = type;
		}
	}

	var isALength = false;

	// We can't redefine length on array
	if(model.splice !== void 0){
		if(propertyName === 'length')
			isALength = '$length'; // Array
	}
	else if(model.entries !== void 0 && propertyName === 'size' && (model.add !== void 0 || model.set !== void 0)){
		isALength = '$size'; // Set/Map
	}

	// Proxy property
	const desc = isALength !== false ? {set:true} : findDescriptor(model, propertyName);

	let getter, setter;
	if(desc !== void 0 && desc.set !== void 0){
		if(callback._sf === void 0 && (!callback.template || bindedKey._regex === callback.template.modelRefRoot_regex))
			return;

		if(desc.configurable === false)
			return console.error(`Object property '${propertyName}' in `, model, ` is not configurable`);

		// Proxy the setter
		if(isALength === false && hasBindInit === false){
			getter = desc.get;
			setter = desc.set;
		}
	}

	let isDeepProperty = false;
	if(originalPropertyName.constructor === Array){
		// Cache deep sf$bindingKey path
		if(originalPropertyName.length !== 1){
			isDeepProperty = true;

			if(originalModel.sf$internal === void 0){
				Object.defineProperty(originalModel, 'sf$internal', {configurable:true, value:{
					deepBinding:{}
				}});
			}

			originalModel.sf$internal.deepBinding[originalPropertyName.slice(0, -1).join('%$')] = true;
		}

		originalPropertyName = stringifyPropertyPath(originalPropertyName);
	}

	bindedKey._regex ??= callback.template && callback.template.modelRefRoot_regex;

	if(model.sf$internal && model.sf$internal._regex === void 0 && bindedKey._regex !== void 0)
		model.sf$internal._regex = bindedKey._regex;

	let objValue = model[propertyName]; // Object value
	let set;

	if(isALength === false && callback.template != null && callback.template.repeatedList){
		let cache = cachedReactivity(model, propertyName, setter);
		set = cache.set;
		getter ??= cache.get;

		if(isDeepProperty){
			callback.model = originalModel;
			callback.prop = originalPropertyName;
		}
	}
	else{
		let _on = `on$${propertyName}`; // Everytime value's going changed, callback value will assigned as new value
		let _m2v = `m2v$${propertyName}`; // Everytime value changed from script (not from View), callback value will only affect View

		// Must use function, and don't use ()=> {}
		// If this was modified, please also adapt it to ./bind-structure.js
		set = function(val){
			if(objValue !== val){
				let newValue, noFeedback;
				if(internal.inputBoundRunning === false){
					if(_m2v in model){
						newValue = model[_m2v](val);

						if(newValue !== void 0)
							noFeedback = true;
					}

					if(_on in model)
						newValue = model[_on](val, true);
				}

				objValue = newValue !== void 0 ? newValue : val;

				if(setter !== void 0){
					setter.call(this, objValue);
					objValue = getter.call(this);
				}

				if(bindedKey.inputBound)
					bindedKey.inputBound(objValue, bindedKey.input);

				if(bindedKey.callback){
					const {callback} = bindedKey;
					for (var i = 0; i < callback.length; i++)
						callback[i].call(this, propertyName, objValue);
				}

				var temp;
				if(bindedKey.bindList){
					const {bindList} = bindedKey;
					for (var i = 0; i < bindList.length; i++){
						temp = bindList[i];

						syntheticReactiveArray(temp, temp.prop || originalPropertyName, temp.model || originalModel);
					}
				}

				if(bindedKey.elements){
					const {elements} = bindedKey;
					for (var i = 0; i < elements.length; i++){
						temp = elements[i];

						// false === no update
						syntheticTemplate(temp.element, temp.template, temp.prop || originalPropertyName, temp.model || originalModel);
					}
				}

				if(noFeedback) objValue = val;
			}

			internal.inputBoundRunning = false;
		}

		if(setter !== void 0) set.cache = setter;
	}

	// binding for Array.length, Set.size, or Map.size
	if(isALength !== false && !(isALength in model)){
		let propName = parsePropertyPath(originalPropertyName);
		if(propName.length === 1){
			propName.unshift('_$self');
			originalModel._$self = originalModel;
		}

		propName.pop();
		let lastProp = propName.pop();
		let lastModel = originalModel;

		if(propName.length !== 0)
			lastModel = deepProperty(lastModel, propName);

		if(lastModel.sf$bindedKey === void 0)
			Object.defineProperty(lastModel, 'sf$bindedKey', {
				value: {}
			});

		let bindedKey2 = lastModel.sf$bindedKey[lastProp] ??= {};
		Object.defineProperty(model, isALength, {
			value(){
				set(model[propertyName]);
				bindedKey2.inputBound && bindedKey2.inputBound(model, bindedKey2.input);
			}
		});

		forceReactive(lastModel, lastProp);
	}

	// Add custom original because the creation was from different template
	if(desc !== void 0 && desc.set !== void 0){
		if(callback._sf === void 0){
			if(callback.prop && callback.prop !== originalPropertyName)
				console.error(`Key already has bind information '${callback.prop}' but being replaced with ${originalPropertyName}`, {model, propertyName, callback, bindedKey, bindName});

			callback.model = originalModel;
			callback.prop = originalPropertyName;
		}

		if(getter === void 0)
			return;
	}

	if(SFOptions.devMode && objValue != null && objValue.$EM !== void 0)
		return forceReactive(model, propertyName);

	Object.defineProperty(model, propertyName, {
		enumerable: desc?.enumerable ?? false,
		configurable: true,
		get: getter || (()=> objValue),
		set
	});
}

function findDescriptor(object, propertyName){
	let desc = Object.getOwnPropertyDescriptor(object, propertyName);
	if(desc !== void 0) return desc;

	if(object.constructor !== Object && (object instanceof Function) === false)
		return findDescriptor(Object.getPrototypeOf(object), propertyName);
}

export function repeatedListBindRoot(template, modelScope){
	let properties = template.modelRefRoot_path;
	for (var i = 0; i < properties.length; i++)
		modelToViewBinding(modelScope, properties[i], template, void 0, void 0, 'bindList');
}

export function bindElement(element, modelScope, template, localModel, modelKeysRegex){
	if(template === void 0){
		if(element.model !== void 0){
			console.error('Unexpected rebinding', element, 'Try wrap the level one {{ mustache }} with an <element/>');
			return;
		}

		if(element.parentNode !== null && element.parentNode.hasAttribute('sf-lang'))
			return;

		template = extractPreprocess(element, null, modelScope, void 0, modelKeysRegex);
		templateParser(template, modelScope, true);
		delete template.addresses;

		if(element.parentNode !== null){
			const newElem = template.html;
			if(element.tagName.includes('-')){
				newElem.sf$componentIgnore = true;
				element.sf$componentIgnore = true;
				modelScope.$el = modelScope.$el.push(newElem);
			}

			element.parentNode.replaceChild(newElem, element);
		}

		element = template.html;
		delete template.html;
	}

	// Don't use shared object or it would be modified by other property binding
	// const ref = {element, template};

	// modelRefRoot_path index is not related with modelRefRoot property/key position
	let properties = template.modelRefRoot_path;
	if(template.repeatedList === void 0){
		for (var i = 0; i < properties.length; i++)
			modelToViewBinding(modelScope, properties[i], {element, template}, void 0, void 0, 'elements');
	}

	if(template.modelRef_path !== void 0){
		// Check if there are pending revalidation
		if(template.modelRef_path.revalidate){
			delete template.modelRef_path.revalidate;
			revalidateBindingPath(template.modelRef, template.modelRef_path, localModel);
		}

		properties = template.modelRef_path;
		for (var i = 0; i < properties.length; i++)
			modelToViewBinding(localModel, properties[i], {element, template}, void 0, void 0, 'elements');
	}
}