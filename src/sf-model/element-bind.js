internal.model.removeModelBinding = function(ref, noBackup){
	if(ref === void 0)
		return;

	var bindedKey = ref.sf$bindedKey;
	var temp = null;
	for(var key in bindedKey){
		if(bindedKey[key] === null)
			continue;

		for (var i = bindedKey[key].length-1; i >= 0; i--) {
			if(bindedKey[key][i].constructor === Function)
				continue;

			if(bindedKey[key][i].element.isConnected === false)
				bindedKey[key].splice(i, 1);
		}

		if(bindedKey[key].input !== void 0)
			for (var i = bindedKey[key].input.length-1; i >= 0; i--) {
				if(bindedKey[key].input[i].isConnected === false)
					bindedKey[key].input.splice(i, 1);
			}

		if(ref[key].constructor === String ||
			ref[key].constructor === Number ||
			ref[key].constructor === Boolean
		){/* Ok */}

		else if(ref[key].constructor === Array){
			if(ref[key].$virtual){
				ref[key].$virtual.destroy();
				ref[key].$virtual = void 0;
			}

			// Reset property without copying the array to new reference
			if(noBackup === void 0){
				temp = ref[key].splice();
				delete ref[key];
				ref[key] = temp;
			}
			else delete ref[key];
		}
		else continue;

		if(bindedKey[key].length === 0){
			delete bindedKey[key];

			if(Object.getOwnPropertyDescriptor(ref, key) === void 0)
				continue;

			// Reconfigure / Remove property descriptor
			if(noBackup === void 0){
				var temp = ref[key];
				delete ref[key];
				ref[key] = temp;
			}
			else delete ref[key];
		}
	}
}

function modelToViewBinding(model, propertyName, callback, elementBind, type){
	var originalModel = model;
	var originalPropertyName = propertyName;

	// Dive to the last object, create if not exist
	if(propertyName.constructor === Array){
		if(propertyName.length === 1)
			propertyName = propertyName[0];
		else{
			var deep = deepProperty(model, propertyName.slice(0, -1));
			if(deep === void 0)
				return;

			// Register every path as fixed object (where any property replacement will being assigned)
			for (var i = 0, n = propertyName.length-1; i < n; i++) {
				let value = model[propertyName[i]];

				// ToDo: also support/apply for RepeatedProperty/RepeatedList

				// Only apply if this is an Object/Array
				if(value === void 0 || value === null || (value.constructor !== Object && value.constructor !== Array))
					return;

				Object.defineProperty(model, propertyName[i], {
					enumerable: true,
					configurable: true,
					get:function(){
						return value;
					},
					set:function(val){
						Object.assign(value, val);
						return val;
					}
				});

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

	var bindedKey = model.sf$bindedKey;

	if(bindedKey[propertyName] !== void 0){
		var ref = bindedKey[propertyName];
		if(ref.indexOf(callback) === -1)
			ref.push(callback);

		if(elementBind !== void 0){
			if(ref.input === void 0){
				ref.input = [elementBind];
				ref.input.type = type;
			}
			else ref.input.push(elementBind);
		}
		return;
	}

	if(originalPropertyName.constructor === Array)
		originalPropertyName = stringifyPropertyPath(originalPropertyName);

	// For contributor: don't delete sf$bindedKey from model because can cause memory leak
	bindedKey = bindedKey[propertyName] = [callback];

	if(elementBind !== void 0){
		var ref = bindedKey;
		ref.input = [elementBind];
		ref.input.type = type;
	}

	// Proxy property
	var desc = Object.getOwnPropertyDescriptor(model, propertyName);
	if(desc === void 0 || desc.set !== void 0)
		return;

	var objValue = model[propertyName]; // Object value
	if(objValue === void 0 || objValue === null)
		objValue = '';

	var _on = model['on$'+propertyName]; // Everytime value's going changed, callback value will assigned as new value
	var _m2v = model['m2v$'+propertyName]; // Everytime value changed from script (not from View), callback value will only affect View

	if(model['out$'+propertyName])
		console.warn(`'out$${propertyName}' is removed, please use 'on$${propertyName} = (old, now, isOut)=>{...};'`);

	Object.defineProperty(model, propertyName, {
		enumerable: true,
		configurable: true,
		get:function(){
			return objValue;
		},
		set:function(val){
			if(objValue !== val){
				var newValue, noFeedback;
				if(inputBoundRunning === false && _m2v !== void 0){
					newValue = _m2v.call(model, objValue, val);

					if(newValue !== void 0)
						noFeedback = true;
				}

				if(_on !== void 0)
					newValue = _on.call(model, objValue, val, true);

				objValue = newValue !== void 0 ? newValue : val;

				for (var i = 0; i < bindedKey.length; i++) {
					if(inputBoundRun === bindedKey[i]){
						bindedKey[i](objValue, bindedKey.input);
						continue;
					}

					syntheticTemplate(bindedKey[i].element, bindedKey[i].template, originalPropertyName, originalModel); // false === no update
				}

				if(noFeedback) objValue = val;
			}

			inputBoundRunning = false;
			return objValue;
		}
	});
}

self.bindElement = function(element, modelScope, template, localModel, modelKeysRegex){
	if(template === void 0){
		if(element.model !== void 0){
			console.error('Unexpected rebinding', element, 'Try wrap the level one {{ mustache }} with an <element/>');
			return;
		}

		template = self.extractPreprocess(element, null, modelScope, void 0, modelKeysRegex);
		templateParser(template, modelScope, true);
		delete template.addresses;

		if(element.parentNode !== null){
			var newElem = template.html;
			if(element.tagName.indexOf('-') !== -1)
				element.sf$componentIgnore = true;

			element.parentNode.replaceChild(newElem, element);
		}

		element = template.html;
	}

	// modelRefRoot_path index is not related with modelRefRoot property/key position
	var properties = template.modelRefRoot_path;
	for (var i = 0; i < properties.length; i++) {
		modelToViewBinding(modelScope, properties[i], {
			element:element,
			template:template
		});
	}

	if(template.modelRef_path !== void 0){
		properties = template.modelRef_path;
		for (var i = 0; i < properties.length; i++) {
			modelToViewBinding(localModel, properties[i], {
				element:element,
				template:template
			});
		}
	}
}