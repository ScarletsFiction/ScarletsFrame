internal.model.removeModelBinding = function(ref, isDeep, isLazy){
	if(ref === void 0)
		return;

	if(window.sf$proxy !== void 0)
		return window.sf$proxy.removeModelBinding.apply(null, arguments);

	const bindedKey = ref.sf$bindedKey;
	for(let key in bindedKey){
		const obj = ref[key];
		if(obj !== void 0 && obj.$EM !== void 0){
			// Deep remove for repeated element, only if it's object data type (primitive don't have sf$bindedKey)
			if(obj.constructor === RepeatedList){
				for (var i = 0; i < obj.length; i++){
					if(typeof obj[i] === 'object')
						internal.model.removeModelBinding(obj[i], false, isLazy);
					else break;
				}
			}
			else if(obj.constructor === RepeatedMap){
				for(const [k, v] of obj){
					if(typeof v === 'object')
						internal.model.removeModelBinding(v, false, isLazy);
					else break;
				}
			}
			else if(obj.constructor === RepeatedSet){
				for(const v of obj){
					if(typeof v === 'object')
						internal.model.removeModelBinding(v, false, isLazy);
					else break;
				}
			}
			else{
				for(const k in obj){
					if(typeof obj[k] === 'object')
						internal.model.removeModelBinding(obj[k], false, isLazy);
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
			if(isLazy === void 0){
				delete bindedKey[key];
				delete ref[key];
				ref[key] = obj;
			}

			// Reset prototype without copying the array to new reference
			if(obj.constructor === RepeatedList){
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

		const bindRef = bindedKey[key];
		for (var i = bindRef.length-1; i >= 0; i--) {
			if(bindRef[i].constructor === Function)
				continue;

			var temp = bindRef[i];
			if(temp.bindList){
				if(temp.template.bindList.$EM === void 0)
					bindRef.splice(i, 1);

				continue;
			}

			if(temp.element.isConnected === false)
				bindRef.splice(i, 1);
		}

		if(bindRef.input !== void 0){
			for (var i = bindRef.input.length-1; i >= 0; i--) {
				if(bindRef.input[i].isConnected === false)
					bindRef.input.splice(i, 1);
			}

			if(bindRef.input.length === 0)
				for (var i = bindRef.length-1; i >= 0; i--) {
					if(bindRef[i].inputBoundRun)
						bindRef.splice(i, 1);
				}
		}

		if(bindRef.length === 0 && isLazy === void 0){
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
			internal.model.removeModelBinding(model, true, isLazy);
	}
}


if(window.sf$proxy === void 0)
	forProxying.removeModelBinding = internal.model.removeModelBinding;

function repeatedRemoveDeepBinding(obj, refPaths, isLazy){
	if(refPaths.length === 0)
		return;

	that:for (let a = 0; a < refPaths.length; a++) {
		if(refPaths[a].length === 1)
			continue;

		const ref = refPaths[a].slice(0, -1);
		if(obj.constructor === RepeatedList){
			for (let i = 0; i < obj.length; i++) {
				var deep = deepProperty(obj[i], ref);
				if(deep === void 0)
					continue;

				internal.model.removeModelBinding(deep, false, isLazy);
			}
			continue that;
		}

		for(let key in obj){
			var deep = deepProperty(obj[key], ref);
			if(deep === void 0)
				continue;

			internal.model.removeModelBinding(deep, false, isLazy);
		}
	}
}

function modelToViewBinding(model, propertyName, callback, elementBind, type){
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

	// We can't redefine length on array
	if(model.constructor === Array && propertyName === 'length')
		return;

	// Enable multiple element binding
	if(model.sf$bindedKey === void 0)
		initBindingInformation(model);

	let bindedKey = model.sf$bindedKey;

	if(bindedKey[propertyName] !== void 0){
		bindedKey = bindedKey[propertyName];
		if(bindedKey.includes(callback) === false)
			bindedKey.push(callback);

		if(elementBind !== void 0){
			if(bindedKey.input === void 0){
				bindedKey.input = [elementBind];
				bindedKey.input.type = type;
			}
			else bindedKey.input.push(elementBind);
		}

		if(!callback.template || bindedKey._regex === callback.template.modelRefRoot_regex)
			return;
	}
	else{
		// For contributor: don't delete sf$bindedKey from model because can cause memory leak
		bindedKey = bindedKey[propertyName] = [callback];

		if(elementBind !== void 0){
			var ref = bindedKey;
			ref.input = [elementBind];
			ref.input.type = type;
		}
	}

	// Proxy property
	const desc = Object.getOwnPropertyDescriptor(model, propertyName);
	if(desc !== void 0 && desc.set !== void 0 && (!callback.template || bindedKey._regex === callback.template.modelRefRoot_regex))
		return;

	if(originalPropertyName.constructor === Array){
		// Cache deep sf$bindingKey path if this a shared model
		if(originalModel.sf$internal !== void 0 && originalPropertyName.length !== 1)
			originalModel.sf$internal.deepBinding[originalPropertyName.slice(0, -1).join('%$')] = true;

		originalPropertyName = stringifyPropertyPath(originalPropertyName);
	}

	// Add custom original because the creation was from different template
	if(desc !== void 0 && desc.set !== void 0){
		// ToDo: Use other workaround when this was undefined for fixing unobserved stuff
		if(bindedKey._regex === void 0){
			bindedKey._regex = callback.template.modelRefRoot_regex;
			return;
		}

		callback.model = originalModel;
		callback.prop = originalPropertyName;
		return;
	}

	bindedKey._regex = callback.template && callback.template.modelRefRoot_regex;

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

	Object.defineProperty(model, propertyName, {
		enumerable: true,
		configurable: true,
		get:()=> objValue,
		set:(val)=> {
			if(objValue !== val){
				let newValue, noFeedback, temp;
				if(inputBoundRunning === false){
					if(_m2v !== void 0){
						newValue = _m2v.call(model, val);

						if(newValue !== void 0)
							noFeedback = true;
					}

					if(_on !== void 0)
						newValue = _on.call(model, val, true);
				}

				objValue = newValue !== void 0 ? newValue : val;

				for (let i = 0; i < bindedKey.length; i++) {
					temp = bindedKey[i];
					if(temp.inputBoundRun){
						temp(objValue, bindedKey.input);
						continue;
					}

					if(temp.bindList){
						syntheticRepeatedList(temp.template, originalPropertyName, originalModel);
						continue;
					}

					syntheticTemplate(temp.element, temp.template, temp.prop || originalPropertyName, temp.model || originalModel); // false === no update
				}

				if(noFeedback) objValue = val;
			}

			inputBoundRunning = false;
		}
	});
}

self.repeatedListBindRoot = function(template, modelScope){
	let ref = {bindList:true, template};
	let properties = template.modelRefRoot_path;
	for (var i = 0; i < properties.length; i++)
		modelToViewBinding(modelScope, properties[i], ref);
}

self.bindElement = function(element, modelScope, template, localModel, modelKeysRegex){
	if(template === void 0){
		if(element.model !== void 0){
			console.error('Unexpected rebinding', element, 'Try wrap the level one {{ mustache }} with an <element/>');
			return;
		}

		if(element.parentNode !== null && element.parentNode.hasAttribute('sf-lang'))
			return;

		template = self.extractPreprocess(element, null, modelScope, void 0, modelKeysRegex);
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

	const ref = {element, template};

	// modelRefRoot_path index is not related with modelRefRoot property/key position
	let properties = template.modelRefRoot_path;
	if(template.repeatedList === void 0){
		for (var i = 0; i < properties.length; i++)
			modelToViewBinding(modelScope, properties[i], ref);
	}

	if(template.modelRef_path !== void 0){
		// Check if there are pending revalidation
		if(template.modelRef_path.revalidate){
			delete template.modelRef_path.revalidate;
			revalidateBindingPath(template.modelRef, template.modelRef_path, localModel);
		}

		properties = template.modelRef_path;
		for (var i = 0; i < properties.length; i++)
			modelToViewBinding(localModel, properties[i], ref);
	}
}