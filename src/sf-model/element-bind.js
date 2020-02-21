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

			if(!bindedKey[key][i].element.isConnected)
				bindedKey[key].splice(i, 1);
		}

		if(bindedKey[key].input !== void 0)
			for (var i = bindedKey[key].input.length-1; i >= 0; i--) {
				if(!bindedKey[key].input[i].isConnected)
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

			// Reset property without copying the array
			if(noBackup === void 0){
				temp = ref[key].splice('obtain');
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
	// Dive to the last object, create if not exist
	if(propertyName.constructor === Array){
		if(propertyName.length === 1)
			propertyName = propertyName[0];
		else{
			// Register every path as fixed object (where any property replacement will being assigned)
			for (var i = 0; i < propertyName.length-1; i++) {
				let value = model[propertyName[i]];
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

	// Enable multiple element binding
	if(model.sf$bindedKey === void 0)
		initBindingInformation(model);

	if(model.sf$bindedKey[propertyName] !== void 0){
		var ref = model.sf$bindedKey[propertyName];
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

	model.sf$bindedKey[propertyName] = [callback];

	if(elementBind !== void 0){
		var ref = model.sf$bindedKey[propertyName];
		ref.input = [elementBind];
		ref.input.type = type;
	}

	// Proxy property
	if(Object.getOwnPropertyDescriptor(model, propertyName).set !== void 0)
		return;

	var objValue = model[propertyName] || ''; // Object value
	Object.defineProperty(model, propertyName, {
		enumerable: true,
		configurable: true,
		get:function(){
			return objValue;
		},
		set:function(val){
			if(objValue !== val){
				var newValue = void 0;
				if(inputBoundRunning === false){
					var on = model['on$'+propertyName];
					var out = model['out$'+propertyName];

					try{
						if(on !== void 0)
							newValue = on(objValue, val);
						if(out !== void 0)
							newValue = out(objValue, val);
					}catch(e){console.error(e)}
				}

				var m2v = model['m2v$'+propertyName];
				if(m2v !== void 0){
					newValue = m2v(objValue, val);

					if(newValue !== void 0){
						objValue = newValue;
						m2v = val;
					}
					else{
						m2v = void 0;
						objValue = val;
					}
				}
				else
					objValue = newValue !== void 0 ? newValue : val;

				var ref = model.sf$bindedKey[propertyName];
				for (var i = 0; i < ref.length; i++) {
					if(inputBoundRun === ref[i]){
						ref[i](objValue, ref.input);
						continue;
					}

					if(syntheticTemplate(ref[i].element, ref[i].template, void 0, model) === false)
						0; //No update
				}

				if(m2v !== void 0)
					objValue = m2v;
			}

			inputBoundRunning = false;
			return objValue;
		}
	});
}

self.bindElement = function(element, modelScope, template, localModel){
	if(template === void 0){
		template = self.extractPreprocess(element, null, modelScope);
		templateParser(template, modelScope, true);
		delete template.addresses;

		element.parentNode.replaceChild(template.html, element);
		element = template.html;
	}

	var properties = template.modelRefRoot_array;
	for (var i = 0; i < properties.length; i++) {
		modelToViewBinding(modelScope, properties[i][1], {
			element:element,
			template:template
		});
	}

	if(template.modelRef_array !== null){
		properties = template.modelRef_array;
		for (var i = 0; i < properties.length; i++) {
			modelToViewBinding(localModel, properties[i][1], {
				element:element,
				template:template
			});
		}
	}
}