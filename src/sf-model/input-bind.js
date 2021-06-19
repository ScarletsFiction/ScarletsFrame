import {internal as Internal} from "../internal.js";
import {internal} from "../shared.js";
import {initBindingInformation} from "./a_utils.js";
import {onEvent} from "../sf-dom.utils.js";
import {modelToViewBinding} from "./element-bind.js";
import {parsePropertyPath, deepProperty} from "../utils.js";

internal.inputBoundRunning = false;
function callInputListener(ref, value){
	const v2m = ref.sfModel[`v2m$${ref.sfBounded}`];
	const on = ref.sfModel[`on$${ref.sfBounded}`];

	if(v2m !== void 0 || on !== void 0){
		let newValue, v2mValue;

		try{
			if(v2m !== void 0)
				v2mValue = v2m.call(ref.sfModel, value);

			if(on !== void 0 && on.constructor === Function){
				newValue = on.call(ref.sfModel, value, false);
				if(newValue !== void 0)
					ref.sfFeedback = true;
			}
		}catch(e){
			console.error(e);
			Internal.onerror && Internal.onerror(e);
		}

		return newValue || v2mValue;
	}
}

function inputTextBound(e){
	if(e.fromSFFramework === true) return;

	const ref = internal.inputBoundRunning = e.target;
	ref.viewInputted = true;
	const value = ref.typeData === Number ? Number(ref.value) : ref.value;
	const newValue = callInputListener(ref, value);

	if(ref.sfFeedback){
		ref.sfFeedback = false;
		ref.value = newValue;
	}

	ref.sfModel[ref.sfBounded] = newValue !== void 0 ? newValue : value;
}

function inputFilesBound(e){
	if(e.fromSFFramework === true) return;

	const ref = e.target;
	const newValue = callInputListener(ref, ref.files);
	if(newValue !== void 0){
		if(!newValue || newValue.length === 0)
			ref.value = '';
		else{
			const temp = new DataTransfer();
			for (let i = 0; i < newValue.length; i++)
				temp.items.add(newValue[i]);

			ref.sfModel[ref.sfBounded] = temp.files;
			if(ref.sfFeedback){
				ref.sfFeedback = false;
				ref.files = temp.files;
			}
		}
	}
	else ref.sfModel[ref.sfBounded] = ref.files;
}

function inputCheckBoxBound(e){
	if(e.fromSFFramework === true) return;

	const ref = internal.inputBoundRunning = e.target;
	ref.viewInputted = true;

	const model = ref.sfModel;
	const modelData = model[ref.sfBounded];
	const { constructor } = modelData;

	let value;
	if(constructor === Boolean || ref.typeData === Boolean)
		value = ref.checked;
	else if(ref.typeData === Number)
		value = Number(ref.value);
	else
		value = ref._value || ref.value;

	const newValue = callInputListener(ref, value);
	if(newValue !== void 0){
		value = newValue;

		if(ref.sfFeedback){
			ref.sfFeedback = false;
			assignElementData.checkbox(value, ref);
		}
	}

	if(modelData.splice !== void 0){ // Array
		const i = modelData.indexOf(value);

		if(i === -1 && ref.checked === true)
			modelData.push(value);
		else if(i !== -1 && ref.checked === false)
			modelData.splice(i, 1);
	}
	else if(modelData.add !== void 0){ // Set
		if(ref.checked === true)
			modelData.add(value);
		else modelData.delete(value);
	}
	else model[ref.sfBounded] = value;
}

// Could have raw value other than string/number
function inputSelectBound(e){
	if(e.fromSFFramework === true) return;

	const ref = internal.inputBoundRunning = e.target;
	ref.viewInputted = true;
	const { typeData } = ref;

	let value;
	const temp = ref.selectedOptions;
	if(ref.multiple === true){
		value = new Array(temp.length);

		for (let i = 0; i < temp.length; i++)
			value[i] = typeData === Number ? Number(temp[i].value)
				: (typeData === Object ? temp[i]._value : temp[i].value);
	}
	else value = typeData === Number ? Number(temp[0].value)
			: (typeData === Object ? temp[0]._value : temp[0].value);

	const newValue = callInputListener(ref, value);
	if(newValue !== void 0){
		if(ref.sfFeedback){
			ref.sfFeedback = false;
			assignElementData.select(newValue, ref);
		}

		ref.sfModel[ref.sfBounded] = newValue;
	}
	else ref.sfModel[ref.sfBounded] = value;
}

var assignElementData = {
	select(val, element){
		const list = element.options;
		const { typeData } = element;
		var temp;

		if(val.splice === void 0){
			for (var i = 0, n = list.length; i < n; i++) {
				temp = list[i];
				if(typeData === String || typeData === Object)
					temp.selected = temp.value === val;
				else temp.selected = temp.value == val;
			}
		}
		else if(val.add !== void 0){
			for (var i = 0, n = list.length; i < n; i++){
				temp = list[i];
				temp.selected = val.has(typeData === Number ? Number(temp.value)
				                    	: (temp._value || temp.value));
			}
		}
		else for (var i = 0, n = list.length; i < n; i++){
			temp = list[i];
			temp.selected = val.includes(typeData === Number ? Number(temp.value)
			                        	: (temp._value || temp.value));
		}
	},
	checkbox(val, element){
		const { typeData } = element;
		if(val.splice !== void 0)
			element.checked = val.includes(typeData === Number ? Number(element.value)
			                        : (element._value || element.value));
		else if(val.add !== void 0)
			element.checked = val.has(typeData === Number ? Number(element.value)
			                		: (element._value || element.value));
		else if(typeData === Boolean)
			element.checked = Boolean(val);
		else if(typeData === String || typeData === Object)
			element.checked = element.value === val;
		else element.checked = element.value == val;
	},
	file(val, element){
		if(!val || val.length === 0)
			element.value = '';
		else{
			const temp = new DataTransfer();
			for (let i = 0; i < val.length; i++)
				temp.items.add(val[i]);

			element.files = temp.files;
		}
	}
}

function inputBoundRun(val, elements){
	if(val == null) val = '';

	for (let i = 0; i < elements.length; i++) {
		if(internal.inputBoundRunning === elements[i])
			continue; // Avoid multiple assigment

		const el = elements[i];

		if(el.sfType === 1) // text
			el.value = val;
		else if(el.sfType === 2) // select options
			assignElementData.select(val, el);
		else if(el.sfType === 3) // radio
			el.checked = val == el.value;
		else if(el.sfType === 4) // checkbox
			assignElementData.checkbox(val, el);
		else if(el.sfType === 5){ // file
			assignElementData.file(val, el);
			continue;
		}

		const ev = new Event('change');
		ev.fromSFFramework = true;
		el.dispatchEvent(ev);
	}
}

// For dynamic reference checking
inputBoundRun.inputBoundRun = true;

function triggerInputEvent(e){
	if(e.fromSFFramework === true) return;
	if(e.target.viewInputted === true){
		e.target.viewInputted = false;
		return;
	}
	e.target.dispatchEvent(new Event('input'));
}

function elementBoundChanges(model, property, element, oneWay, modelLocal, propertyNameLocal){
	// Enable multiple element binding
	if(model.sf$bindedKey === void 0)
		initBindingInformation(model);

	const val = model[property];

	var type = 0;
	let typeData = null;

	const assignedType = (element.getAttribute('typedata') || '').toLowerCase();
	if(assignedType === 'number')
		typeData = Number;
	else if(val != null)
		typeData = typeof val === 'object' ? Object : val.constructor;

	element.typeData = typeData;
	onEvent(element, 'change', triggerInputEvent);

	// Bound value change
	if(element.constructor === HTMLTextAreaElement){
		onEvent(element, 'input', inputTextBound);
		type = 1;

		if(oneWay === false)
			element.value = val;
	}
	else if(element.selectedOptions !== void 0){
		onEvent(element, 'input', inputSelectBound);
		type = 2;

		assignElementData.select(val, element);
	}
	else{
		var type = element.type.toLowerCase();
		if(type === 'radio'){
			onEvent(element, 'input', inputTextBound);
			type = 3;

			element.checked = val == element.value;
		}
		else if(type === 'checkbox'){
			onEvent(element, 'input', inputCheckBoxBound);
			type = 4;

			if(typeData === Object){
				if(val.has !== void 0) // ReactiveSet
					element.hasRS = val;
				else if(val.includes !== void 0) // ReactiveList
					element.hasRL = val;
			}

			assignElementData.checkbox(val, element);
		}
		else if(type === 'file'){
			onEvent(element, 'input', inputFilesBound);
			type = 5;
		}
		else{
			onEvent(element, 'input', inputTextBound);
			type = 1;

			if(oneWay === false)
				element.value = val;
		}
	}

	element.sfType = type;

	if(oneWay === true) return;
	modelToViewBinding(modelLocal, propertyNameLocal || property, inputBoundRun, element, type, 'inputBound');
}

export function bindInput(temp, modelLocal, mask, modelScope){
	let element, oneWay, propertyName;

	for (let i = 0; i < temp.length; i++) {
		element = temp[i];
		if(element.getAttribute === void 0){
			oneWay = element.id === 1;
			propertyName = element.rule;
			element = element.el;
		}
		else{
			oneWay = element.hasAttribute('sf-into');
			propertyName = oneWay ? element.getAttribute('sf-into') : element.getAttribute('sf-bind');

			if(oneWay === false)
				element.removeAttribute('sf-bind');
			else
				element.removeAttribute('sf-into');
		}

		if(propertyName === "")
			propertyName = element.getAttribute('name');

		if(propertyName === null){
			console.error("Property key to be bound wasn't found", element);
			continue;
		}

		let model = modelLocal;
		let currentModel = modelLocal;
		if(mask !== void 0){
			if(propertyName.indexOf(`${mask}.`) === 0)
				propertyName = propertyName.replace(/\w+\./, '');
			else
				currentModel = model = modelScope;
		}

		// Get reference
		let propertyNameLocal = null;
		if(!(propertyName in model)){
			let deepScope = parsePropertyPath(propertyName);
			propertyNameLocal = deepScope.slice();

			if(deepScope.length !== 1){
				var property = deepScope.pop();
				deepScope = deepProperty(model, deepScope);
			}
			else deepScope = void 0;

			if(deepScope === void 0){
				console.error(`Can't get property "${propertyName}" on model`, model);
				return;
			}

			model = deepScope;
			propertyName = property;
		}

		element.sfBounded = propertyName;
		element.sfModel = model;

		elementBoundChanges(model, propertyName, element, oneWay, currentModel, propertyNameLocal);
	}
}