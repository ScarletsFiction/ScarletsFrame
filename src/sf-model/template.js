function elseIfHandle(else_, scopes){
	var elseIf = else_.elseIf;

	// Else if
	for (var i = 0; i < elseIf.length; i++) {
		// Check the condition
		if(!elseIf[i][0].apply(self.root, scopes))
			continue;

		// Get the value
		return elseIf[i][1].apply(self.root, scopes);
	}

	// Else
	if(else_.elseValue === null)
		return '';

	return else_.elseValue.apply(self.root, scopes);
}

// ==== Template parser ====
var templateParser_regex = /{{%=([0-9]+)/gm;
var REF_DIRECT = 0, REF_IF = 1, REF_EXEC = 2;
var templateExec = function(parse, item, atIndex, parsed){
	parsed = parsed || {};
	var temp = null;

	// Get or evaluate static or dynamic data
	for (var i = 0, n = parse.length; i < n; i++) {
		if(atIndex !== void 0){
			if(atIndex.constructor === Number){
				i = atIndex;
				n = i+1;
			}
			else if(atIndex.indexOf(i) === -1)
				continue;
		}

		var ref = parse[i];
		ref.data[0] = item;

		// Direct evaluation type
		if(ref.type === REF_DIRECT){
			temp = ref.get.apply(self.root, ref.data);
			if(temp === void 0)
				temp = '';
			else{
				if(temp.constructor === Object)
					temp = JSON.stringify(temp);
				if(temp.constructor !== String)
					temp = String(temp);
			}

			parsed[i] = {type:ref.type, data:temp};
			continue;
		}

		if(ref.type === REF_EXEC){
			parsed[i] = {type:ref.type, data:ref.get.apply(self.root, ref.data)};
			continue;
		}

		// Conditional type
		if(ref.type === REF_IF){
			var scopes = ref.data;
			parsed[i] = {type:ref.type, data:''};

			// If condition was not meet
			if(!ref.if[0].apply(self.root, scopes)){
				parsed[i].data = elseIfHandle(ref, scopes);
				continue;
			}

			parsed[i].data = ref.if[1].apply(self.root, scopes);
		}
	}
	return parsed;
}

function parserForAttribute(current, ref, item, modelRef, parsed, changesReference, rootHandler, template){
	for(var a = 0; a < ref.length; a++){
		var refB = ref[a];

		// Pass to event handler
		if(refB.event){
			if(rootHandler === void 0 || rootHandler.sf$listListenerLock === void 0)
				eventHandler(current, refB, modelRef || item, rootHandler);

			continue;
		}

		var isValueInput = (refB.name === 'value' && (current.tagName === 'TEXTAREA' ||
			(current.tagName === 'INPUT' && /checkbox|radio|hidden/.test(current.type) === false)
		));

		var temp = {
			attribute:isValueInput === true ? current : current.attributes[refB.name],
			ref:refB,
			from:template
		};

		if(current.hasAttribute('sf-lang'))
			temp.sf_lang = current;

		changesReference.push(temp);

		if(refB.direct !== void 0){
			if(refB.name === 'value' && isValueInput === true){
				current.value = parsed[refB.direct].data;
				current.removeAttribute('value');
				continue;
			}
			current.setAttribute(refB.name, parsed[refB.direct].data);
			continue;
		}

		// Below is used for multiple data
		if(refB.name === 'value' && isValueInput === true){
			var temp = current.value;
			current.removeAttribute('value');
			current.value = temp;
			current.value = current.value.replace(templateParser_regex, function(full, match){
				return parsed[match].data;
			});
		}
		else current.setAttribute(refB.name, (refB.value || current.value).replace(templateParser_regex, function(full, match){
				return parsed[match].data;
			}));
	}
}

var templateParser = internal.model.templateParser = function(template, item, original, modelRef, rootHandler, copy){
	processingElement = template.html;

	var html = original === true ? template.html : template.html.cloneNode(true);
	var addresses = template.addresses;
	var parsed = templateExec(template.parse, item);

	if(copy !== void 0){
		var childs = html.childNodes;
		for (var i = 0, n = childs.length; i < n; i++) {
			copy.appendChild(childs[0]);
		}

		// Assign attributes
		var attr = html.attributes;
		for (var i = 0; i < attr.length; i++) {
			copy.setAttribute(attr[i].name, attr[i].value);
		}

		html = copy;
	}

	var changesReference = [];
	var pendingInsert = [];

	// Find element where the data belongs to
	for (var i = 0; i < addresses.length; i++) {
		var ref = addresses[i];
		var current = $.childIndexes(ref.address, html);

		// Modify element attributes
		if(ref.nodeType === 1){
			parserForAttribute(current, ref.attributes, item, modelRef, parsed, changesReference, rootHandler, template);
			continue;
		}

		// Replace text node
		if(ref.nodeType === 3){
			var refA = current;

			changesReference.push({
				textContent:refA,
				ref:ref
			});

			if(ref.direct !== void 0){
				refA.textContent = parsed[ref.direct].data;
				continue;
			}

			// Below is used for multiple/dynamic data
			refA.textContent = refA.textContent.replace(templateParser_regex, function(full, match){
				return parsed[match].data;
			});
			continue;
		}

		// Replace dynamic node
		if(ref.nodeType === -1){
			var cRef = {
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
	if(changesReference.length !== 0)
		html.sf$elementReferences = changesReference;

	// internal.language.refreshLang(html);
	// html.sf$modelParsed = parsed;

	// Run the pending element
	for (var i = 0; i < pendingInsert.length; i++) {
		var ref = pendingInsert[i];
		var tDOM = parsed[ref.direct].data;

		// Check if it's an HTMLElement
		if(tDOM.nodeType === 1){
			ref.parentNode.insertBefore(tDOM, ref.dynamicFlag);
			continue;
		}

		// Parse if it's not HTMLElement
		tDOM = $.parseElement(parsed[ref.direct].data, true);
		for (var a = 0, n = tDOM.length; a < n; a++) {
			ref.parentNode.insertBefore(tDOM[0], ref.dynamicFlag);
		}
	}

	if(template.specialElement.input.length !== 0){
		// Process element for input bind
		var specialInput = template.specialElement.input;
		var specialInput_ = [];
		for (var i = 0; i < specialInput.length; i++) {
			specialInput_.push($.childIndexes(specialInput[i], html));
		}

		bindInput(specialInput_, item, template.mask, modelRef);
	}

	if(template.specialElement.repeat.length !== 0){
		// Process element for sf-repeat-this
		var specialRepeat = template.specialElement.repeat;
		var specialRepeat_ = [];
		for (var i = 0; i < specialRepeat.length; i++) {
			specialRepeat_.push($.childIndexes(specialRepeat[i], html));
		}

		repeatedListBinding(specialRepeat_, item);
	}

	return html;
}

var syntheticTemplate = internal.model.syntheticTemplate = function(element, template, property, item){
	if(property !== void 0){
		var changes = (template.modelRef && template.modelRef[property]) || template.modelRefRoot[property];
		if(changes === void 0 || changes === null || changes.length === 0){
			console.log(element, template, property, item);
			console.error("Failed to run syntheticTemplate because property '"+property+"' is not observed");
			return false;
		}
	}
	else{ // This will trying to update all binding
		var changes = [];

		var ref = template.modelRefRoot_array;
		for (var i = 0; i < ref.length; i++) {
			Array.prototype.push.apply(changes, template.modelRefRoot[ref[i][0]]);
		}

		if(template.modelRef_array !== null){
			ref = template.modelRef_array;
			for (var i = 0; i < ref.length; i++) {
				Array.prototype.push.apply(changes, template.modelRef[ref[i][0]]);
			}
		}

		if(changes.length === 0) return false;
	}

	var parsed = templateExec(template.parse, item, changes);
	function checkRelatedChanges(parseIndex){
		var found = false;
		for (var i = 0; i < parseIndex.length; i++) {
			if(parsed[parseIndex] !== void 0){
				found = true;
				break;
			}
		}
		if(found === false)
			return false;

		// Prepare all required data
		var changes_ = [];
		for (var i = 0; i < parseIndex.length; i++) {
			if(parsed[parseIndex[i]] === void 0)
				changes_.push(parseIndex[i]);
		}

		Object.assign(parsed, templateExec(template.parse, item, changes_));
		return true;
	}

	var changesReference = element.sf$elementReferences;
	var haveChanges = false;
	for (var i = 0; i < changesReference.length; i++) {
		var cRef = changesReference[i];

		if(cRef.dynamicFlag !== void 0){ // Dynamic data
			if(parsed[cRef.direct] !== void 0){
				var tDOM = Array.from($.parseElement(parsed[cRef.direct].data, true)).reverse();
				var currentDOM = $.prevAll(cRef.dynamicFlag, cRef.startFlag);
				var notExist = false;

				// internal.language.refreshLang(tDOM);

				// Replace if exist, skip if similar
				for (var a = 0; a < tDOM.length; a++) {
					if(currentDOM[a] === void 0){
						notExist = true;
						break;
					}

					if(currentDOM[a].isEqualNode(tDOM[a]) === false)
						cRef.parentNode.replaceChild(tDOM[a], currentDOM[a]);
				}

				// Add if not exist
				if(notExist){
					for (var a = tDOM.length - 1; a >= 0; a--)
						cRef.parentNode.insertBefore(tDOM[a], cRef.dynamicFlag);
				}

				// Remove if over index
				else{
					for (var a = tDOM.length; a < currentDOM.length; a++) {
						currentDOM[a].remove();
					}
				}

				haveChanges = true;
			}
			continue;
		}

		if(cRef.textContent !== void 0){ // Text only
			if(cRef.ref.parse_index !== void 0){ // Multiple
				var temp = cRef.ref.value.replace(templateParser_regex, function(full, match){
					if(parsed[match] === void 0)
						templateExec(template.parse, item, Number(match), parsed);

					return parsed[match].data;
				});

				if(cRef.textContent.textContent === temp) continue;
				cRef.textContent.textContent = temp;

				haveChanges = true;
				continue;
			}

			// Direct value
			if(parsed[cRef.ref.direct]){
				var value = parsed[cRef.ref.direct].data;
				if(cRef.textContent.textContent === value) continue;

				var ref_ = cRef.textContent;
				// Remove old element if exist
				if(ref_.sf$haveChilds === true){
					while(ref_.previousSibling && ref_.previousSibling.sf$childRoot === ref_){
						ref_.previousSibling.remove();
					}
				}

				// if(item['each$'+])
				ref_.textContent = value;
			}
			continue;
		}

		if(cRef.attribute !== void 0){ // Attributes
			if(cRef.ref.parse_index !== void 0){ // Multiple
				var temp = cRef.ref.value.replace(templateParser_regex, function(full, match){
					if(parsed[match] === void 0)
						templateExec(template.parse, item, Number(match), parsed);

					return parsed[match].data;
				});

				if(cRef.attribute.value === temp) continue;
				cRef.attribute.value = temp;

				haveChanges = true;
				continue;
			}

			// Direct value
			if(parsed[cRef.ref.direct]){
				var value = parsed[cRef.ref.direct].data;
				if(cRef.attribute.value == value) continue;
				cRef.attribute.value = value;

				haveChanges = true;
			}
		}
	}

	return haveChanges;
}