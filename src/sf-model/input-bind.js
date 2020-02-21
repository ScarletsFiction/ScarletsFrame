var callInputListener = function(model, property, value){
	var on = model['on$'+property];
	var v2m = model['v2m$'+property];
	var newValue1 = void 0; var newValue2 = void 0;
	if(on !== void 0 || v2m !== void 0){
		var old = model[property];
		if(old !== null && old !== void 0 && old.constructor === Array)
			old = old.slice(0);

		try{
			if(v2m !== void 0)
				newValue1 = v2m(old, value);

			if(on !== void 0)
				newValue2 = on(old, value);
		}catch(e){console.error(e)}
	}
	return newValue2 !== void 0 ? newValue2 : newValue1;
}

var inputBoundRunning = false;
var inputTextBound = function(e){
	if(e.fromSFFramework === true) return;

	var ref = inputBoundRunning = e.target;
	ref.viewInputted = true;
	var value = ref.typeData === Number ? Number(ref.value) : ref.value;
	var newValue = callInputListener(ref.sfModel, ref.sfBounded, value);
	if(newValue !== void 0)
		ref.sfModel[ref.sfBounded] = newValue;
	else ref.sfModel[ref.sfBounded] = value;
}
var inputFilesBound = function(e){
	if(e.fromSFFramework === true) return;
	
	var ref = e.target;
	callInputListener(ref.sfModel, ref.sfBounded, ref.files);
	ref.sfModel[ref.sfBounded] = ref.files;
}

var inputCheckBoxBound = function(e){
	if(e.fromSFFramework === true) return;
	
	var ref = inputBoundRunning = e.target;
	ref.viewInputted = true;
	var value = ref.typeData === Number ? Number(ref.value) : ref.value;
	var newValue = callInputListener(ref.sfModel, ref.sfBounded, value);
	if(newValue !== void 0)
		value = newValue;

	var model = ref.sfModel;
	var constructor = model[ref.sfBounded].constructor;

	if(constructor === Array){
		var i = model[ref.sfBounded].indexOf(value);

		if(i === -1 && ref.checked === true)
			model[ref.sfBounded].push(value);
		else if(i !== -1 && ref.checked === false)
			model[ref.sfBounded].splice(i, 1);
	}
	else if(constructor === Boolean || ref.typeData === Boolean)
		model[ref.sfBounded] = ref.checked;
	else model[ref.sfBounded] = value;
}

var inputSelectBound = function(e){
	if(e.fromSFFramework === true) return;
	
	var ref = inputBoundRunning = e.target;
	ref.viewInputted = true;
	var typeData = ref.typeData;
	if(ref.multiple === true){
		var temp = ref.selectedOptions;
		var value = [];
		for (var i = 0; i < temp.length; i++) {
			value.push(typeData === Number ? Number(temp[i].value) : temp[i].value);
		}
	}
	else value = typeData === Number ? Number(ref.selectedOptions[0].value) : ref.selectedOptions[0].value;

	var newValue = callInputListener(ref.sfModel, ref.sfBounded, value);
	if(newValue !== void 0)
		ref.sfModel[ref.sfBounded] = newValue;
	else ref.sfModel[ref.sfBounded] = value;
}

var assignElementData = {
	select:function(val, element){
		var list = element.options;
		var typeData = element.typeData;
		var arrayValue = val.constructor === Array ? val : false;
		for (var i = 0, n = list.length; i < n; i++) {
			if(arrayValue === false){
				if(typeData === String)
					list[i].selected = list[i].value === val;
				else list[i].selected = list[i].value == val;
			}
			else list[i].selected = arrayValue.indexOf(typeData === Number ? Number(list[i].value) : list[i].value) !== -1;
		}
	},
	checkbox:function(val, element){
		if(val.constructor === Array)
			element.checked = val.indexOf(element.typeData === Number ? Number(element.value) : element.value) !== -1;
		else if(val.constructor === Boolean)
			element.checked = Boolean(val);
		else{
			if(element.typeData === String)
				element.checked = element.value === val;
			else element.checked = element.value == val;
		}
	}
}

var inputBoundRun = function(val, elements){
	if(val !== 0 && !val)
		return;

	for (var i = 0; i < elements.length; i++) {
		if(inputBoundRunning === elements[i])
			continue; // Avoid multiple assigment

		var ev = new Event('change');
		ev.fromSFFramework = true;

		if(elements.type === 1) // text
			elements[i].value = val;
		else if(elements.type === 2) // select options
			assignElementData.select(val, elements[i]);
		else if(elements.type === 3) // radio
			elements[i].checked = val == elements[i].value;
		else if(elements.type === 4) // checkbox
			assignElementData.checkbox(val, elements[i]);

		elements[i].dispatchEvent(ev);
	}
}

var triggerInputEvent = function(e){
	if(e.fromSFFramework === true) return;
	if(e.target.viewInputted === true){
		e.target.viewInputted = false;
		return;
	}
	e.target.dispatchEvent(new Event('input'));
}

var elementBoundChanges = function(model, property, element, oneWay){
	// Enable multiple element binding
	if(model.sf$bindedKey === void 0)
		initBindingInformation(model);

	var val = model[property];

	var type = 0;
	var typeData = null;
	if(val !== null && val !== void 0)
		typeData = val.constructor;

	var assignedType = (element.getAttribute('typedata') || '').toLowerCase();
	if(assignedType === 'number')
		typeData = Number;

	element.typeData = typeData;
	$.on(element, 'change', triggerInputEvent);

	// Bound value change
	if(element.tagName === 'TEXTAREA'){
		$.on(element, 'input', inputTextBound);
		element.value = val;
		type = 1;
	}

	else if(element.selectedOptions !== void 0){
		$.on(element, 'input', inputSelectBound);
		type = 2;

		assignElementData.select(val, element);
	}

	else{
		var type = element.type.toLowerCase();
		if(type === 'radio'){
			$.on(element, 'input', inputTextBound);
			type = 3;

			element.checked = val == element.value;
		}
		else if(type === 'checkbox'){
			$.on(element, 'input', inputCheckBoxBound);
			type = 4;

			assignElementData.checkbox(val, element);
		}

		else if(type === 'file'){
			$.on(element, 'input', inputFilesBound);
			return;
		}

		else{
			$.on(element, 'input', inputTextBound);
			element.value = val;
			type = 1;
		}
	}

	if(oneWay === true) return;
	modelToViewBinding(model, property, inputBoundRun, element, type);
}

var bindInput = internal.model.bindInput = function(temp, model, mask, modelScope){
	for (var i = 0; i < temp.length; i++) {
		var element = temp[i];

		var oneWay = false;
		var propertyName = element.getAttribute('sf-bind');
		if(propertyName === null){
			propertyName = element.getAttribute('sf-into');
			oneWay = true;
		}

		if(propertyName === "")
			propertyName = element.getAttribute('name');

		if(propertyName === null){
			console.error("Property key to be bound wasn't be found", element);
			continue;
		}

		if(mask !== void 0){
			if(propertyName.indexOf(mask+'.') === 0)
				propertyName = propertyName.replace(/\w+\./, '');
			else
				model = modelScope;
		}

		// Get reference
		if(model[propertyName] === void 0){
			var deepScope = propertyName.split('.');
			if(deepScope.length !== 1){
				var property = deepScope.pop();
				deepScope = deepProperty(model, deepScope);
			}
			else deepScope = void 0;

			if(deepScope === void 0){
				console.error('Can\'t get property "'+propertyName+'" on model', model);
				return;
			}

			model = deepScope;
			propertyName = property;
		}

		element.sfBounded = propertyName;
		element.sfModel = model;
		if(oneWay === false){
			element.setAttribute('sf-bound', '');
			element.removeAttribute('sf-bind');
		}
		else{
			element.setAttribute('sf-bound', '');
			element.removeAttribute('sf-into');
		}

		elementBoundChanges(model, propertyName, element, oneWay);
	}
}