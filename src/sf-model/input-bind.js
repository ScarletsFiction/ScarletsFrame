var callInputListener = function(ref, value){
	var v2m = ref.sfModel['v2m$'+ref.sfBounded];
	var on = ref.sfModel['on$'+ref.sfBounded];

	if(v2m !== void 0 || on !== void 0){
		var newValue;
		var old = ref.sfModel[ref.sfBounded];

		if(old !== null && old !== void 0 && old.constructor === Arr)
			old = old.slice(0);

		try{
			if(v2m !== void 0)
				newValue = v2m.call(ref.sfModel, old, value);

			if(on !== void 0){
				newValue = on.call(ref.sfModel, old, value, false);
				if(newValue !== void 0)
					ref.sfFeedback = true;
			}
		}catch(e){
			console.error(e);
			sf.onerror && sf.onerror(e);
		}

		return newValue;
	}
}

var inputBoundRunning = false;
var inputTextBound = function(e){
	if(e.fromSFFramework === true) return;

	var ref = inputBoundRunning = e.target;
	ref.viewInputted = true;
	var value = ref.typeData === Number ? Number(ref.value) : ref.value;
	var newValue = callInputListener(ref, value);

	if(ref.sfFeedback){
		ref.sfFeedback = false;
		ref.value = newValue;
	}

	ref.sfModel[ref.sfBounded] = newValue !== void 0 ? newValue : value;
}

var inputFilesBound = function(e){
	if(e.fromSFFramework === true) return;

	var ref = e.target;
	var newValue = callInputListener(ref, ref.files);
	if(newValue !== void 0){
		if(!newValue || newValue.length === 0)
			ref.value = '';
		else{
			var temp = new DataTransfer();
			for (var i = 0; i < newValue.length; i++)
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

var inputCheckBoxBound = function(e){
	if(e.fromSFFramework === true) return;

	var ref = inputBoundRunning = e.target;
	ref.viewInputted = true;

	var model = ref.sfModel;
	var constructor = model[ref.sfBounded].constructor;

	var value;
	if(constructor === Boolean || ref.typeData === Boolean)
		value = ref.checked;
	else if(ref.typeData === Number)
		value = Number(ref.value);
	else
		value = ref.value;

	var newValue = callInputListener(ref, value);
	if(newValue !== void 0){
		value = newValue;

		if(ref.sfFeedback){
			ref.sfFeedback = false;
			assignElementData.checkbox(value, ref);
		}
	}

	if(constructor === Arr){
		var i = model[ref.sfBounded].indexOf(value);

		if(i === -1 && ref.checked === true)
			model[ref.sfBounded].push(value);
		else if(i !== -1 && ref.checked === false)
			model[ref.sfBounded].splice(i, 1);
	}
	else model[ref.sfBounded] = value;
}

var inputSelectBound = function(e){
	if(e.fromSFFramework === true) return;

	var ref = inputBoundRunning = e.target;
	ref.viewInputted = true;
	var typeData = ref.typeData;

	var value = [];
	if(ref.multiple === true){
		var temp = ref.selectedOptions;
		for (var i = 0; i < temp.length; i++)
			value.push(typeData === Number ? Number(temp[i].value) : temp[i].value);
	}
	else value = typeData === Number ? Number(ref.selectedOptions[0].value) : ref.selectedOptions[0].value;

	var newValue = callInputListener(ref, value);
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
	select:function(val, element){
		var list = element.options;
		var typeData = element.typeData;

		if(val.constructor !== Arr){
			for (var i = 0, n = list.length; i < n; i++) {
				if(typeData === String)
					list[i].selected = list[i].value === val;
				else list[i].selected = list[i].value == val;
			}
		}
		else for (var i = 0, n = list.length; i < n; i++)
			list[i].selected = val.includes(typeData === Number ? Number(list[i].value) : list[i].value);
	},
	checkbox:function(val, element){
		if(val.constructor === Arr)
			element.checked = val.includes(element.typeData === Number ? Number(element.value) : element.value);
		else if(val.constructor === Boolean)
			element.checked = Boolean(val);
		else{
			if(element.typeData === String)
				element.checked = element.value === val;
			else element.checked = element.value == val;
		}
	},
	file:function(val, element){
		if(!val || val.length === 0)
			element.value = '';
		else{
			var temp = new DataTransfer();
			for (var i = 0; i < val.length; i++)
				temp.items.add(val[i]);

			element.files = temp.files;
		}
	}
}

var inputBoundRun = function(val, elements){
	if(val === null || val === void 0)
		return;

	for (var i = 0; i < elements.length; i++) {
		if(inputBoundRunning === elements[i])
			continue; // Avoid multiple assigment

		if(elements.type === 1) // text
			elements[i].value = val;
		else if(elements.type === 2) // select options
			assignElementData.select(val, elements[i]);
		else if(elements.type === 3) // radio
			elements[i].checked = val == elements[i].value;
		else if(elements.type === 4) // checkbox
			assignElementData.checkbox(val, elements[i]);
		else if(elements.type === 5){ // file
			assignElementData.file(val, elements[i]);
			continue;
		}

		var ev = new Event('change');
		ev.fromSFFramework = true;
		elements[i].dispatchEvent(ev);
	}
}

// For dynamic reference checking
inputBoundRun.inputBoundRun = true;

var triggerInputEvent = function(e){
	if(e.fromSFFramework === true) return;
	if(e.target.viewInputted === true){
		e.target.viewInputted = false;
		return;
	}
	e.target.dispatchEvent(new Event('input'));
}

var elementBoundChanges = function(model, property, element, oneWay, modelLocal, propertyNameLocal){
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
		type = 1;

		if(oneWay === false)
			element.value = val;
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
			type = 5;
		}
		else{
			$.on(element, 'input', inputTextBound);
			type = 1;

			if(oneWay === false)
				element.value = val;
		}
	}

	if(oneWay === true) return;
	modelToViewBinding(modelLocal, propertyNameLocal || property, inputBoundRun, element, type);
}

var bindInput = internal.model.bindInput = function(temp, modelLocal, mask, modelScope){
	var element, oneWay, propertyName;

	for (var i = 0; i < temp.length; i++) {
		if(temp[i].getAttribute === void 0){
			element = temp[i].el;
			oneWay = temp[i].id === 1;
			propertyName = temp[i].rule;
		}
		else{
			element = temp[i];
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
			console.error("Property key to be bound wasn't be found", element);
			continue;
		}

		var model = modelLocal;
		var currentModel = modelLocal;
		if(mask !== void 0){
			if(propertyName.indexOf(mask+'.') === 0)
				propertyName = propertyName.replace(/\w+\./, '');
			else
				currentModel = model = modelScope;
		}

		// Get reference
		var propertyNameLocal = null;
		if(model[propertyName] === void 0){
			var deepScope = parsePropertyPath(propertyName);
			propertyNameLocal = deepScope.slice();

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

		elementBoundChanges(model, propertyName, element, oneWay, currentModel, propertyNameLocal);
	}
}