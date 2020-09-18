function elseIfHandle(else_, arg){
	const { elseIf } = else_;

	// Else if
	for (let i = 0; i < elseIf.length; i++) {
		// Check the condition
		if(!elseIf[i][0](arg[0], arg[1], _escapeParse))
			continue;

		// Get the value
		return elseIf[i][1](arg[0], arg[1], _escapeParse);
	}

	// Else
	if(else_.elseValue === null)
		return '';

	return else_.elseValue(arg[0], arg[1], _escapeParse);
}

// ==== Template parser ====
const templateParser_regex = /{{%=([0-9]+)%/g;
const templateParser_regex_split = /{{%=[0-9]+%/g;
const REF_DIRECT = 0, REF_IF = 1, REF_EXEC = 2;
const templateExec = function(parse, item, atIndex, parsed, repeatListIndex){
	if(parse.length === 0) return parse;
	var temp;

	if(parsed === void 0)
		parsed = new Array(parse.length);

	// Get or evaluate static or dynamic data
	for (let i = 0, n = parse.length; i < n; i++) {
		if(atIndex !== void 0 && atIndex.includes(i) === false)
			continue;

		const ref = parse[i];
		const arg = ref.data;
		arg[0] = item; //7ms

		try{
			// Direct evaluation type
			if(ref.type === REF_DIRECT){
				temp = ref.get(arg[0], arg[1], _escapeParse, repeatListIndex);
				if(temp === void 0)
					temp = '';
				else{
					if(temp.constructor === Object)
						temp = JSON.stringify(temp);
					else if(temp.constructor !== String)
						temp = String(temp);
				}

				parsed[i] = temp;
				continue;
			}

			if(ref.type === REF_EXEC){
				parsed[i] = ref.get(arg[0], arg[1], _escapeParse, repeatListIndex);
				continue;
			}

			// Conditional type
			if(ref.type === REF_IF){
				// If condition was not meet
				if(!ref.if[0](arg[0], arg[1], _escapeParse, repeatListIndex)){
					parsed[i] = elseIfHandle(ref, arg, repeatListIndex);
					continue;
				}

				parsed[i] = ref.if[1](arg[0], arg[1], _escapeParse, repeatListIndex);
			}
		} catch(e) {
			var temp = (ref.get || ref.if).toString();
			temp = temp.split(') {', 2)[1].slice(1, -2);
			temp = temp.replace(/(_model_|_modelScope)\./g, '');
			temp = temp.replace(/var _model_=.*?;/, '');

			if(e.message === "Can't continue processing the template"){
				console.groupCollapsed("Click here to open more information..");
				console.log("%cError in template's script:\n", 'color:orange', temp);
			}
			else{
				console.groupCollapsed("%cError message:", 'color:orange', e.message, "\nClick here to open more information..");
				console.log(e.stack);
				console.log("%cWhen processing template's script:\n", 'color:orange', temp);
				console.groupEnd();
			}

			throw new Error("Can't continue processing the template");
		}
	}

	return parsed;
}
function parserForAttribute(current, ref, item, modelRef, parsed, changesReference, rootHandler, template){
	for(let a = 0; a < ref.length; a++){
		const refB = ref[a];

		// Pass to event handler
		if(refB.event){
			if(rootHandler === void 0 || rootHandler.sf$listListenerLock === void 0)
				eventHandler(current, refB, modelRef || item, rootHandler, template);

			continue;
		}

		const isValueInput = (refB.name === 'value' && (current.tagName === 'TEXTAREA' ||
			(current.tagName === 'INPUT' && sfRegex.inputAttributeType.test(current.type) === false)
		));

		var temp = {ref:refB};

		if(refB.name === 'style')
			temp.style = current.style;
		else{
			temp.attribute = isValueInput === true
				? current
				: (refB.name === 'class'
				   ? current.classList
				   : current.attributes[refB.name]);
		}

		if(current.hasAttribute('sf-lang'))
			temp.sf_lang = current;

		changesReference.push(temp);

		if(refB.direct !== void 0){
			if(refB.name === 'value' && isValueInput === true){
				current.value = parsed[refB.direct];
				current.removeAttribute('value');
				continue;
			}
			current.setAttribute(refB.name, parsed[refB.direct]);
			continue;
		}

		// Below is used for multiple data
		if(refB.name === 'value' && isValueInput === true){
			var temp = current.value;
			current.removeAttribute('value');
			current.value = applyParseIndex(refB.value, refB.parse_index, parsed);
		}
		else current.setAttribute(refB.name, applyParseIndex(refB.value, refB.parse_index, parsed));
	}
}

const templateParser = internal.model.templateParser = function(template, item, original, modelRef, rootHandler, copy, repeatListIndex){
	processingElement = template.html;

	let html = original === true ? template.html : template.html.cloneNode(true);
	const { addresses } = template;

	try{
		var parsed = templateExec(template.parse, item, void 0, void 0, repeatListIndex);  //18ms
	}catch(e){
		if(e.message === "Can't continue processing the template"){
			console.error("Error when processing:", template.html, item, modelRef);
			console.groupEnd();
		}
		else sf.onerror && sf.onerror(e);

		throw e;
	}

	if(template.uniqPattern !== void 0)
		html.sf$repeatListIndex = repeatListIndex;

	if(copy !== void 0){
		const childs = html.childNodes;
		for (var i = 0, n = childs.length; i < n; i++) {
			copy.appendChild(childs[0]);
		}

		// Assign attributes
		const attr = html.attributes;
		for (var i = 0; i < attr.length; i++) {
			copy.setAttribute(attr[i].name, attr[i].value);
		}

		html = copy;
	}

	const changesReference = [];
	const pendingInsert = [];

	changesReference.parsed = parsed;

	// Find element where the data belongs to
	for (var i = 0; i < addresses.length; i++) {
		var ref = addresses[i];
		const current = $.childIndexes(ref.address, html); //26ms

		// Modify element attributes
		if(ref.nodeType === 1){
			parserForAttribute(current, ref.attributes, item, modelRef, parsed, changesReference, rootHandler, template); //26ms
			continue;
		}

		// Replace text node
		if(ref.nodeType === 3){
			const refA = current;

			changesReference.push({
				textContent:refA,
				ref
			});

			if(ref.direct !== void 0){
				refA.textContent = parsed[ref.direct]; //40ms
				continue;
			}

			// Below is used for multiple/dynamic data
			current.textContent = applyParseIndex(ref.value, ref.parse_index, parsed);
			continue;
		}

		// Replace dynamic node
		if(ref.nodeType === -1){
			const cRef = {
				dynamicFlag:current,
				direct:ref.parse_index,
				parentNode:current.parentNode,
				startFlag:ref.startFlag && $.childIndexes(ref.startFlag, html)
			};
			changesReference.push(cRef);

			// Pending element insert to take other element reference
			pendingInsert.push(cRef);
		}
	}

	if(rootHandler !== void 0)
		rootHandler.sf$listListenerLock = true;

	// Save model item reference to node
	html.model = item;

	// Save reference to element
	if(changesReference.length !== 0){
		changesReference.template = template;
		html.sf$elementReferences = changesReference;
	}

	// html.sf$modelParsed = parsed;

	// Run the pending element
	for (var i = 0; i < pendingInsert.length; i++) {
		var ref = pendingInsert[i];
		let tDOM = parsed[ref.direct];

		// Check if it's an HTMLElement
		if(tDOM.nodeType === 1){
			ref.parentNode.insertBefore(tDOM, ref.dynamicFlag);
			continue;
		}

		// Parse if it's not HTMLElement
		tDOM = $.parseElement(parsed[ref.direct]);
		for (var a = 0, n = tDOM.length; a < n; a++) {
			ref.parentNode.insertBefore(tDOM[0], ref.dynamicFlag);
		}
	}

	if(template.specialElement){
		if(template.specialElement.input){
			// Process element for input bind
			const specialInput = template.specialElement.input;
			const specialInput_ = new Array(specialInput.length);
			for (var i = 0; i < specialInput.length; i++) {
				var ref = specialInput[i];
				specialInput_[i] = {
					el:$.childIndexes(ref.addr, html),
					rule:ref.rule,
					id:ref.id,
				};
			}

			bindInput(specialInput_, item, template.mask, modelRef);
		}

		if(template.specialElement.repeat){
			// Process element for sf-repeat-this
			const specialRepeat = template.specialElement.repeat;
			const specialRepeat_ = new Array(specialRepeat.length);
			for (var i = 0; i < specialRepeat.length; i++) {
				var ref = specialRepeat[i];
				specialRepeat_[i] = {
					el:$.childIndexes(ref.addr, html),
					rule:ref.rule
				};
			}

			repeatedListBinding(specialRepeat_, item, void 0, template);
		}
	}

	return html;
}

sf.async = function(mode){
	if(mode)
		animFrameMode = false; // Enable async
	else animFrameMode = true; // Disable async
}

var animFrameMode = false;
const syntheticTemplate = internal.model.syntheticTemplate = function(element, template, property, item, asyncing){
	if(property !== void 0){
		var changes = (template.modelRef && template.modelRef[property]) || template.modelRefRoot[property];
		if(!changes || changes.length === 0){
			console.log(element, template, property, item);
			console.error(`Failed to run syntheticTemplate because property '${property}' is not observed`);
			return false;
		}
	}
	else{ // This will trying to update all binding
		if(template.parse.length === 0)
			return false;

		var changes = void 0;
	}

	const changesReference = element.sf$elementReferences;

	if(changesReference.parsed === void 0)
		changesReference.parsed = new Array(template.parse.length);

	const { parsed } = changesReference;
	const repeatListIndex = element.sf$repeatListIndex;

	if(!asyncing)
		templateExec(template.parse, item, changes, parsed, repeatListIndex);

	if(!asyncing && animFrameMode === false){
		if(changesReference.async === true)
			return;

		changesReference.async = true;
		requestAnimationFrame(function(){
			changesReference.async = false;
			animFrameMode = true;
			syntheticTemplate(element, template, property, item, true);
			animFrameMode = false;
		});
		return;
	}

	let haveChanges = false, temp;
	for (let i = 0; i < changesReference.length; i++) {
		const cRef = changesReference[i];

		if(cRef.dynamicFlag !== void 0){ // Dynamic data
			if(parsed[cRef.direct] !== void 0){
				const tDOM = Array.from($.parseElement(parsed[cRef.direct]));
				const currentDOM = $.prevAll(cRef.dynamicFlag, cRef.startFlag);
				let notExist = false;

				// Replace if exist, skip if similar
				for (var a = tDOM.length-1; a >= 0; a--) {
					if(currentDOM[a] === void 0){
						notExist = true;
						break;
					}

					if(currentDOM[a].isEqualNode(tDOM[a]) === false)
						cRef.parentNode.replaceChild(tDOM[a], currentDOM[a]);
				}

				// Add if not exist
				if(notExist){
					for (var a = 0; a < tDOM.length; a++)
						cRef.parentNode.insertBefore(tDOM[a], cRef.dynamicFlag);
				}

				// Remove if over index
				else{
					for (var a = tDOM.length; a < currentDOM.length; a++)
						currentDOM[a].remove();
				}

				haveChanges = true;
			}
			continue;
		}

		if(cRef.textContent !== void 0){ // Text only
			if(cRef.ref.parse_index !== void 0){ // Multiple
				temp = applyParseIndex(cRef.ref.value, cRef.ref.parse_index, parsed, template.parse, item, repeatListIndex);
				if(cRef.textContent.textContent === temp) continue;
				cRef.textContent.textContent = temp;

				haveChanges = true;
				continue;
			}

			// Direct value
			if(parsed[cRef.ref.direct]){
				temp = parsed[cRef.ref.direct];
				if(cRef.textContent.textContent === temp) continue;

				const ref_ = cRef.textContent;
				// Remove old element if exist
				if(ref_.sf$haveChilds === true){
					while(ref_.previousSibling && ref_.previousSibling.sf$childRoot === ref_)
						ref_.previousSibling.remove();
				}

				ref_.textContent = temp;
				haveChanges = true;
			}
			continue;
		}

		if(cRef.attribute !== void 0){ // Attributes
			if(cRef.ref.parse_index !== void 0){ // Multiple
				temp = applyParseIndex(cRef.ref.value, cRef.ref.parse_index, parsed, template.parse, item, repeatListIndex);
				if(cRef.attribute.value === temp) continue;
			}

			// Direct value
			else if(parsed[cRef.ref.direct]){
				temp = parsed[cRef.ref.direct];
				if(cRef.attribute.value == temp) continue; // non-strict compare
			}
			else continue;

			cRef.attribute.value = temp;
			haveChanges = true;
			continue;
		}

		if(cRef.style !== void 0){ // Styles
			if(cRef.ref.parse_index !== void 0) // Multiple
				temp = applyParseIndex(cRef.ref.value, cRef.ref.parse_index, parsed, template.parse, item, repeatListIndex);

			// Direct value
			else if(parsed[cRef.ref.direct])
				temp = parsed[cRef.ref.direct];
			else continue;

			if(cRef.style.cssText === temp) continue;
			cRef.style.cssText = temp;
			haveChanges = true;
		}
	}

	return haveChanges;
};