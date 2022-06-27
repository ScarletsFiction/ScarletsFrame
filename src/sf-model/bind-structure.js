import { internal } from "../shared.js";
import { syntheticTemplate, syntheticReactiveArray } from "./template.js";

let cache = {};
export function cachedReactivity(model, key, setter) {
	let ref = cache[key] ??= createReactiveSetter(key);
	let temp = model.sf$bindedKey._$fo ??= {};

	temp[key] = model[key];

	if(setter){
		temp._$st ??= {};
		temp._$st[key] = setter;
	}

	return ref;
}

// Adapted from ./sf-model/element-bind.js
function createReactiveSetter(key){
	// Sanitize key to avoid vulnerability
	if(/[/*-+.`~!@#%^&*()-++{} \[\]:"|;'\\<>?,./]/.test(key)) // but allow _ and $
		throw new Error("Key mustn't contain any symbol");

	let _m2v = `m2v$${key}`;
	let _on = `on$${key}`;

	let getKey;
	if(/^\d/.test(key)) getKey = `[${key}]`;
	else getKey = `.${key}`;
	
	return {
		get: Function(`return this.sf$bindedKey._$fo${getKey}`),
		set(val){
			var bindedKey = this.sf$bindedKey[key];
			var objSave = this.sf$bindedKey._$fo;
			var objValue = objSave[key];

			if(objValue !== val){
				var newValue, noFeedback;
				if(internal.inputBoundRunning === false){
					if(_m2v in this){
						newValue = this[_m2v](val);

						if(newValue !== void 0)
							noFeedback = true;
					}

					if(_on in this)
						newValue = this[_on](val, true);
				}
	
				objValue = newValue !== void 0 ? newValue : val;

				var setter = objSave._$st?.[key];
				if(setter != null){
					setter.call(this, objValue);  // trigger setter
					objSave[key] = objValue = this[key]; // trigger getter
				}
				else objSave[key] = objValue;

				if(bindedKey.inputBound)
					bindedKey.inputBound(objValue, bindedKey.input);

				if(bindedKey.callback){
					var callback = bindedKey.callback;
					for (var i = 0; i < callback.length; i++)
						callback[i].call(this, key, objValue);
				}

				var temp;
				if(bindedKey.bindList){
					var bindList = bindedKey.bindList;
					for (var i = 0; i < bindList.length; i++){
						temp = bindList[i];

						syntheticReactiveArray(temp, temp.prop || key, temp.model || this);
					}
				}

				if(bindedKey.elements){
					var elements = bindedKey.elements;
					for (var i = 0; i < elements.length; i++){
						temp = elements[i];

						// false === no update
						syntheticTemplate(temp.element, temp.template, temp.prop || key, temp.model || this);
					}
				}

				if(noFeedback) objSave[key] = val;
			}

			internal.inputBoundRunning = false;
		},
	};
}