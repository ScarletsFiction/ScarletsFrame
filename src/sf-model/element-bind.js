import {internal, forProxying} from "../shared.js";
import {stringifyPropertyPath, deepProperty} from "../utils.js";
import {syntheticTemplate, templateParser, syntheticReactiveArray} from "./template.js";
import {extractPreprocess, revalidateBindingPath} from "./parser.js";
import {initBindingInformation} from "./a_utils.js";
import {ReactiveArray, ReactiveMap, ReactiveSet, ElementManipulatorProxy} from "./repeated-list.js";

export function removeModelBinding(ref, isDeep, isLazy, isUniqList){
	if(ref === void 0)
		return;

	if(window.sf$proxy !== void 0)
		return window.sf$proxy.removeModelBinding.apply(null, arguments);

	const bindedKey = ref.sf$bindedKey;
	for(let key in bindedKey){
		const obj = ref[key];
		if(obj !== void 0 && obj.$EM !== void 0){
			// Deep remove for repeated element, only if it's object data type (primitive don't have sf$bindedKey)
			if(obj.constructor === ReactiveArray){
				for (var i = 0; i < obj.length; i++){
					if(typeof obj[i] === 'object')
						removeModelBinding(obj[i], false, isLazy);
					else break;
				}
			}
			else if(obj.constructor === ReactiveMap){
				for(const [k, v] of obj){
					if(typeof v === 'object')
						removeModelBinding(v, false, isLazy);
					else break;
				}
			}
			else if(obj.constructor === ReactiveSet){
				for(const v of obj){
					if(typeof v === 'object')
						removeModelBinding(v, false, isLazy);
					else break;
				}
			}
			else{
				for(const k in obj){
					if(typeof obj[k] === 'object')
						removeModelBinding(obj[k], false, isLazy);
					else break;
				}
			}

			// Clean ElementManipulator first
			if(obj.$EM.constructor === ElementManipulatorProxy){
				const { list } = obj.$EM;
				for (var i = list.length-1; i >= 0; i--) {
					if(list[i].parentNode.isConnected === false){
						if(!list[i].isComponent)
							repeatedRemoveDeepBinding(obj, list[i].template.modelRef_path, isLazy);

						list.splice(i, 1);
					}
				}

				if(list.length === 1)
					obj.$EM = obj.$EM.list[0];

				if(list.length !== 0)
					continue;
			}
			else if(obj.$EM.parentNode.isConnected === false){
				if(!obj.$EM.isComponent)
					repeatedRemoveDeepBinding(obj, obj.$EM.template.modelRef_path, isLazy);
			}
			else continue;

			// Clear virtual scroll
			if(obj.$virtual){
				obj.$virtual.destroy();
				delete obj.$virtual;
			}

			delete obj.$EM;
			if(isUniqList)
				obj.length = 0;
			else if(isLazy === void 0){
				delete bindedKey[key];
				delete ref[key];
				ref[key] = obj;
			}

			// Reset prototype without copying the array to new reference
			if(obj.constructor === ReactiveArray){
				Object.setPrototypeOf(obj, Array.prototype);
				continue;
			}

			// Reset object proxies
			if(isLazy === void 0){
				Object.setPrototypeOf(obj, Object.prototype);
				for(let objKey in obj){
					const temp = obj[objKey];
					delete obj[objKey];
					obj[objKey] = temp;
				}
			}

			continue;
		}

		const {elements, callback, bindList, input} = bindedKey[key];
		var bindLength = 0;
		if(elements){
			for (var i = elements.length-1; i >= 0; i--) {
				if(elements[i].element.isConnected === false)
					elements.splice(i, 1);
			}

			bindLength += elements.length;
		}
		if(bindList){
			for (var i = bindList.length-1; i >= 0; i--) {
				if(bindList[i].bindList.$EM === void 0)
					bindList.splice(i, 1);
			}

			bindLength += bindList.length;
		}
		if(input){
			for (var i = input.length-1; i >= 0; i--) {
				if(input[i].isConnected === false)
					input.splice(i, 1);
			}

			if(input.length === 0)
				delete bindedKey[key].inputBound;

			bindLength += input.length;
		}
		if(callback){
			for (var i = callback.length-1; i >= 0; i--) {
				const els = callback[i].element;
				if(els && els.isConnected === false)
					callback.splice(i, 1);
			}
		}

		if(bindLength === 0 && isLazy === void 0 && !isUniqList){
			delete bindedKey[key];

			if(obj === void 0 || Object.getOwnPropertyDescriptor(ref, key).set === void 0)
				continue;

			// Reconfigure / Remove property descriptor
			delete ref[key];
			ref[key] = obj;
		}
	}

	// Check for deeper sf$bindingKey
	if(isDeep !== void 0 || ref.sf$internal === void 0)
		return;

	const deep = ref.sf$internal.deepBinding;
	for(let path in deep){
		const model = deepProperty(ref, path.split('%$'));
		if(model !== void 0)
			removeModelBinding(model, true, isLazy, path === 'sf$uniqList');
	}
}


if(window.sf$proxy === void 0)
	forProxying.removeModelBinding = removeModelBinding;

function repeatedRemoveDeepBinding(obj, refPaths, isLazy){
	if(refPaths.length === 0)
		return;

	that:for (let a = 0; a < refPaths.length; a++) {
		if(refPaths[a].length === 1)
			continue;

		const ref = refPaths[a].slice(0, -1);
		if(obj.constructor === ReactiveArray){
			for (let i = 0; i < obj.length; i++) {
				var deep = deepProperty(obj[i], ref);
				if(deep === void 0)
					continue;

				removeModelBinding(deep, false, isLazy);
			}
			continue that;
		}

		for(let key in obj){
			var deep = deepProperty(obj[key], ref);
			if(deep === void 0)
				continue;

			removeModelBinding(deep, false, isLazy);
		}
	}
}

export function modelToViewBinding(model, propertyName, callback, elementBind, type, bindName){
	const originalModel = model;
	let originalPropertyName = propertyName;

	// Dive to the last object, create if not exist
	if(propertyName.constructor === Array){
		if(propertyName.length === 1)
			propertyName = propertyName[0];
		else{
			const deep = deepProperty(model, propertyName.slice(0, -1));
			if(deep === void 0)
				return;

			// Register every path as fixed object (where any property replacement will being assigned)
			for (let i = 0, n = propertyName.length-1; i < n; i++) {
				let value = model[propertyName[i]];

				// Return if this not an object
				if(typeof value !== 'object')
					return;

				if(Object.getOwnPropertyDescriptor(model, propertyName[i]).set === void 0){
					Object.defineProperty(model, propertyName[i], {
						enumerable: true,
						configurable: true,
						get:()=> value,
						set:(val)=>{
							Object.assign(value, val)
						}
					});
				}

				model = value;
			}

			propertyName = propertyName[propertyName.length-1];
		}
	}

	// Enable multiple element binding
	if(model.sf$bindedKey === void 0)
		initBindingInformation(model);

	let bindedKey = model.sf$bindedKey;

	if(propertyName in bindedKey){
		var hasBindInit = true;
		bindedKey = bindedKey[propertyName];

		if(bindName === 'inputBound'){
			if(elementBind !== void 0){
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
			let ref = bindedKey[bindName] ??= [];

			if(ref.includes(callback) === false){
				const prop = stringifyPropertyPath(originalPropertyName);

				if(bindName === 'bindList'){
					let RefRoot = callback.modelRefRoot_path;
					if(RefRoot.length !== 0 && callback.hasDeep === void 0){
						if(callback.hasDeep === void 0){
							let deep = callback.hasDeep = {};
							// console.log(originalModel);
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

						originalModel.sf$internal.deepBinding = callback.hasDeep;
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

		// For contributor: don't delete sf$bindedKey from model because can cause memory leak
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
	if(model.splice !== void 0 && propertyName === 'length')
		isALength = '$length'; // Array
	else if(model.entries !== void 0 && propertyName === 'size' && (model.add !== void 0 || model.set !== void 0)){
		isALength = '$size'; // Set/Map
	}

	// Proxy property
	const desc = isALength !== false ? {set:true} : Object.getOwnPropertyDescriptor(model, propertyName);
	if(desc !== void 0 && desc.set !== void 0){
		if(!callback.template || bindedKey._regex === callback.template.modelRefRoot_regex)
			return;

		if(desc.configurable === false)
			return console.error(`Object property '${propertyName}' in `, model, ` is not configurable`);

		// Proxy the setter
		if(isALength === false && hasBindInit === false){
			console.log('hello', desc);
		}
	}

	if(originalPropertyName.constructor === Array){
		if(originalModel.sf$internal === void 0){
			Object.defineProperty(originalModel, 'sf$internal', {configurable:true, value:{
				deepBinding:{}
			}});
		}

		// Cache deep sf$bindingKey path
		if(originalPropertyName.length !== 1)
			originalModel.sf$internal.deepBinding[originalPropertyName.slice(0, -1).join('%$')] = true;

		originalPropertyName = stringifyPropertyPath(originalPropertyName);
	}

	bindedKey._regex ??= callback.template && callback.template.modelRefRoot_regex;

	if(model.sf$internal && model.sf$internal._regex === void 0 && bindedKey._regex !== void 0)
		model.sf$internal._regex = bindedKey._regex;

	let objValue = model[propertyName]; // Object value
	if(objValue == null)
		objValue = '';

	let _on = model[`on$${propertyName}`]; // Everytime value's going changed, callback value will assigned as new value
	let _m2v = model[`m2v$${propertyName}`]; // Everytime value changed from script (not from View), callback value will only affect View

	if(_on)
		Object.defineProperty(model, `on$${propertyName}`, {
			set:(val)=> _on = val,
			get:()=> _on
		});

	if(_m2v)
		Object.defineProperty(model, `m2v$${propertyName}`, {
			set:(val)=>_m2v = val,
			get:()=> _m2v
		});

	const set = (val)=> {
		if(objValue !== val){
			let newValue, noFeedback;
			if(internal.inputBoundRunning === false){
				if(_m2v !== void 0){
					newValue = _m2v.call(model, val);

					if(newValue !== void 0)
						noFeedback = true;
				}

				if(_on !== void 0)
					newValue = _on.call(model, val, true);
			}

			objValue = newValue !== void 0 ? newValue : val;

			if(bindedKey.inputBound)
				bindedKey.inputBound(objValue, bindedKey.input);

			if(bindedKey.callback){
				const {callback} = bindedKey;
				for (var i = 0; i < callback.length; i++)
					callback[i]();
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

	if(isALength !== false && !(isALength in model)){
		Object.defineProperty(model, isALength, {
			value(){
				set(model[propertyName]);
			}
		});
	}

	// Add custom original because the creation was from different template
	if(desc !== void 0 && desc.set !== void 0){
		if(callback.prop && callback.prop !== originalPropertyName)
			console.error(`Key already has bind information '${callback.prop}' but being replaced with ${originalPropertyName}`);

		callback.model = originalModel;
		callback.prop = originalPropertyName;
		return;
	}

	Object.defineProperty(model, propertyName, {
		enumerable: true,
		configurable: true,
		get:()=> objValue,
		set
	});
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
				modelScope.$el[0] = newElem;
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