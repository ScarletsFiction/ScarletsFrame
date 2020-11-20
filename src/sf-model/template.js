function elseIfHandle(else_, item, modelScope){
	const { elseIf } = else_;

	// Else if
	for (let i = 0; i < elseIf.length; i++) {
		// Check the condition
		if(!elseIf[i].cond(item, modelScope, _eP))
			continue;

		// Get the value
		return elseIf[i].val(item, modelScope, _eP);
	}

	// Else
	if(else_.elseValue === null)
		return '';

	return else_.elseValue(item, modelScope, _eP);
}

// ==== Template parser ====
const templateParser_regex = /{{%=([0-9]+)%/g;
const templateParser_regex_split = /{{%=[0-9]+%/g;
const REF_DIRECT = 0, REF_IF = 1, REF_EXEC = 2;
const templateExec = function(parse, item, atIndex, parsed, repeatListIndex){
	var temp, changed = false;

	// Get or evaluate static or dynamic data
	var n = atIndex !== void 0 ? atIndex.length : parse.length;
	var a;
	for (let i = 0; i < n; i++) {
		a = atIndex !== void 0 ? atIndex[i] : i;
		const ref = parse[a];

		try{
			// Direct evaluation type
			if(ref.type === REF_DIRECT){
				temp = ref.get(item, ref.data._modelScope, _eP, repeatListIndex);
				if(temp === void 0)
					temp = '';
				else{
					if(temp.constructor === Object)
						temp = JSON.stringify(temp);
					else if(temp.constructor !== String)
						temp = String(temp);
				}

				if(changed === false){
					if(parsed[a] === temp) continue;
					changed = true;
				}

				parsed[a] = temp;
				continue;
			}

			if(ref.type === REF_EXEC){
				temp = ref.get(item, ref.data._modelScope, _eP, repeatListIndex);

				if(changed === false){
					if(parsed[a] === temp) continue;
					changed = true;
				}

				parsed[a] = temp;
				continue;
			}

			// Conditional type
			if(ref.type === REF_IF){
				// If condition was not meet
				if(!ref.if.cond(item, ref.data._modelScope, _eP, repeatListIndex)){
					temp = elseIfHandle(ref, item, ref.data._modelScope, repeatListIndex);

					if(changed === false){
						if(parsed[a] === temp) continue;
						changed = true;
					}

					parsed[a] = temp;
					continue;
				}

				temp = ref.if.val(item, ref.data._modelScope, _eP, repeatListIndex);

				if(changed === false){
					if(parsed[a] === temp) continue;
					changed = true;
				}

				parsed[a] = temp;
			}
		} catch(e) {
			if(ref.get !== void 0){
				temp = ref.get.toString();
				temp = temp.split('\n) {\n', 2)[1].slice(0, -2);
			}
			else{
				var temp2 = ref.if.cond.toString();
				temp2 = 'if('+temp2.split('\n) {\nreturn ', 2)[1].slice(0, -2)+'){\n';

				temp = temp2 + ref.if.val.toString().split('\n) {\n', 2)[1];
			}

			temp = temp.replace(/(_model_|_modelScope)\./g, '');
			temp = temp.replace(/var _model_=.*?;/, '');

			var slicedX = 0, slicedY = 0;
			if(temp.includes('var/**/_d')){
				temp = temp.slice(temp.indexOf('\n')+1);
				slicedY = 1;
			}

			if(temp.indexOf('return ') === 0){
				temp = temp.slice(7);
				slicedX = 7;
			}

			if(temp.includes('\n') === false)
				temp = `{{ ${temp} }}`;

			if(e.message === "Can't continue processing the template"){
				console.groupCollapsed("Click here to open more information..");
				findErrorLocation(temp, e, slicedX, "%cError in template's script:\n", slicedY);
			}
			else{
				console.groupCollapsed("%cError message:", 'color:orange', e.message, "\nClick here to open more information..");
				findErrorLocation(temp, e, slicedX, "%cWhen processing template's script:\n", slicedY);
			}

			throw new Error("Can't continue processing the template");
		}
	}

	return changed;
}
function parserForAttribute(current, ref, item, modelRef, parsed, changesReference, rootHandler, template, registerRootEvent){
	for(let a = 0; a < ref.length; a++){
		const refB = ref[a];

		// Pass to event handler
		if(refB.event){
			if(registerRootEvent)
				eventHandler(current, refB, modelRef || item, rootHandler, template);

			continue;
		}

		const isValueInput = (refB.name === 'value' && ((current.constructor._ref || current.constructor) === HTMLTextAreaElement ||
			((current.constructor._ref || current.constructor) === HTMLInputElement && sfRegex.inputAttributeType.includes(current.type) === false)
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
		var parsed;
		if(template.parse.length !== 0){
			parsed = new Array(template.parse.length);
			templateExec(template.parse, item, void 0, parsed, repeatListIndex);  //18ms
		}
		else parsed = emptyArray;
	}catch(e){
		if(e.message === "Can't continue processing the template"){
			if(modelRef === void 0){
				modelRef = item;
				item = void 0;
			}

			console.log("%cTemplate's data:%c", 'color:orange', '',
			            "\n - Element:", template.html,
			            "\n - Item value:", item,
			            "\n - Model root:", modelRef,
			            "\n - Internal cache:", template);

			if(modelRef.$el !== void 0){
				var el = modelRef.$el[0];
				if(el && el.constructor === SFModel)
					console.log("%cFrom one of shared model's element:\n", 'color:orange', modelRef.$el.slice(0));
				else console.log(el);
			}

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
	const registerRootEvent = !rootHandler?.sf$listListenerLock?.has(template);

	// Find element where the data belongs to
	for (var i = 0; i < addresses.length; i++) {
		var ref = addresses[i];
		const current = $.childIndexes(ref.address, html); //26ms

		// Modify element attributes
		if(ref.nodeType === 1){
			parserForAttribute(current, ref.attributes, item, modelRef, parsed, changesReference, rootHandler, template, registerRootEvent); //26ms
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

	// Save model item reference to node
	html.model = item;

	// Save reference to element
	if(changesReference.length !== 0){
		changesReference.template = template;
		html.sf$elementReferences = changesReference;
	}

	// html.sf$modelParsed = parsed;

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
			// Process element for sf-each
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

		// Process element for sf-scope
		if(template.specialElement.scope)
			initPendingComponentScope(template.specialElement.scope, html);
	}

	// Run the pending element
	for (var i = 0; i < pendingInsert.length; i++) {
		var ref = pendingInsert[i];
		let tDOM = parsed[ref.direct];

		// Check if it's an HTMLElement
		if(tDOM.nodeType === 1){
			ref.parentNode.insertBefore(tDOM, ref.dynamicFlag);
			continue;
		}

		ref.dynamicFlag.currentHTML = tDOM;

		// Parse if it's not HTMLElement
		if(tDOM.length !== 0)
			tDOM = $.parseElement(tDOM);
		else tDOM = document.createTextNode(tDOM);

		for(var a = 0, n = tDOM.length; a < n; a++)
			ref.parentNode.insertBefore(tDOM[0], ref.dynamicFlag);
	}

	return html;
}

sf.async = function(mode){
	if(mode)
		animFrameMode = false; // Enable async
	else animFrameMode = true; // Disable async
}

const syntheticRepeatedList = function(template, property, modelScope){
	const { bindList } = template;
	let elements = bindList.$EM.elements || bindList.$EM.parentChilds;
	const changes = template.modelRefRoot[property];

	for (var i = 0, n=elements.length; i < n; i++)
		syntheticTemplate(elements[i], template, property, bindList[i]);
}

var animFrameMode = false;
const animFrameStack = [];

var runFramePending = false;
function runFrameStack(){
	animFrameMode = true;
	for (var i = 0; i < animFrameStack.length; i++) {
		const t = animFrameStack[i];

		// if you want to know what is this
		// try to find "animFrameStack.push({" from your editor
		t.q.async = false;
		syntheticTemplate(t.w, t.e, t.r, t.t, true);

	}

	animFrameStack.length = 0;
	runFramePending = animFrameMode = false;
}

const syntheticTemplate = internal.model.syntheticTemplate = function(element, template, property, item, asyncing){
	var changes;
	if(property !== void 0){
		changes = (template.modelRef && template.modelRef[property]) || template.modelRefRoot[property];
		if(!changes || changes.length === 0){
			console.log(element, template, property, item);
			console.error(`Failed to run syntheticTemplate because property '${property}' is not observed`);
			return false;
		}
	}
	else if(template.parse.length === 0)
		return false;
	// else: Update all binding

	const changesReference = element.sf$elementReferences;

	if(changesReference.parsed === void 0){
		if(template.parse.length !== 0)
			changesReference.parsed = new Array(template.parse.length);
		else changesReference.parsed = emptyArray;
	}

	const { parsed } = changesReference;
	const repeatListIndex = element.sf$repeatListIndex;

	if(!asyncing
	   && template.parse.length !== 0
	   && templateExec(template.parse, item, changes, parsed, repeatListIndex) === false)
		return;

	if(!asyncing && animFrameMode === false){
		if(changesReference.async === true)
			return;

		changesReference.async = true;

		// if you want to know what is this for
		// try to find "runFrameStack(" from your editor
		animFrameStack.push({q:changesReference, w:element, e:template, r:property, t:item});

		if(!runFramePending){
			runFramePending = true;
			requestAnimationFrame(runFrameStack);
		}
		return;
	}

	let haveChanges = false, temp;
	for (let i = 0; i < changesReference.length; i++) {
		const cRef = changesReference[i];

		if(cRef.dynamicFlag !== void 0){ // Dynamic data
			if(parsed[cRef.direct] !== void 0){
				let temp2 = parsed[cRef.direct];
				if(cRef.dynamicFlag.currentHTML === temp2)
					continue;

				cRef.dynamicFlag.currentHTML = temp2;
				const tDOM = Array.from($.parseElement(temp2));
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
			temp = parsed[cRef.ref.direct];
			if(temp !== void 0){
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
			else if(parsed[cRef.ref.direct] !== void 0){
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
			else if(parsed[cRef.ref.direct] !== void 0)
				temp = parsed[cRef.ref.direct];
			else continue;

			if(cRef.style.cssText === temp) continue;
			cRef.style.cssText = temp;
			haveChanges = true;
		}
	}

	return haveChanges;
};