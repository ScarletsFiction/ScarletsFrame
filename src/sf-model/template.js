function elseIfHandle(else_, scopes){
	var elseIf = else_.elseIf;

	// Else if
	for (var i = 0; i < elseIf.length; i++) {
		// Check the condition
		scopes[0] = elseIf[i][0];
		if(!localEval.apply(self.root, scopes))
			continue;

		// Get the value
		scopes[0] = elseIf[i][1];
		return localEval.apply(self.root, scopes);
	}

	// Else
	if(else_.elseValue === null)
		return '';

	scopes[0] = else_.elseValue;
	return localEval.apply(self.root, scopes);
}

// ==== Template parser ====
var templateParser_regex = /{{%=([0-9]+)/gm;
var REF_DIRECT = 0, REF_IF = 1, REF_EXEC = 2;
var templateExec = function(parse, item, atIndex){
	var parsed = {};
	var temp = null;

	// Get or evaluate static or dynamic data
	for (var i = 0; i < parse.length; i++) {
		if(atIndex !== void 0 && atIndex.indexOf(i) === -1)
			continue;

		var ref = parse[i];
		ref.data[1] = item;

		// Direct evaluation type
		if(ref.type === REF_DIRECT){
			temp = localEval.apply(self.root, ref.data);
			if(temp === void 0)
				temp = ''; // console.error('`'+ref.data[0]+'` was not defined');
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
			parsed[i] = {type:ref.type, data:localEval.apply(self.root, ref.data)};
			continue;
		}

		// Conditional type
		if(ref.type === REF_IF){
			var scopes = ref.data;
			parsed[i] = {type:ref.type, data:''};
			scopes[0] = ref.if[0];

			// If condition was not meet
			if(!localEval.apply(self.root, scopes)){
				parsed[i].data = elseIfHandle(ref, scopes);
				continue;
			}

			scopes[0] = ref.if[1];
			parsed[i].data = localEval.apply(self.root, scopes);
		}
	}
	return parsed;
}

var templateParser = function(template, item, original){
	processingElement = template.html;

	var html = original === true ? template.html : template.html.cloneNode(true);
	var addresses = template.addresses;
	var parsed = templateExec(template.parse, item);

	// Save model item reference to node
	html.model = item;

	var changesReference = [];
	var pendingInsert = [];

	// Find element where the data belongs to
	for (var i = 0; i < addresses.length; i++) {
		var ref = addresses[i];
		var current = $.childIndexes(ref.address, html);

		// Modify element attributes
		if(ref.nodeType === 1){
			var refA = ref.attributes;
			for(var a = 0; a < refA.length; a++){
				var refB = refA[a];

				var isValueInput = (refB.name === 'value' && (current.tagName === 'TEXTAREA' ||
					(current.tagName === 'INPUT' && /checkbox|radio|hidden/.test(current.type) === false)
				));

				changesReference.push({
					attribute:isValueInput === true ? current : current.attributes[refB.name],
					ref:refB
				});

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
				else{
					current.setAttribute(refB.name, (refB.value || current.value).replace(templateParser_regex, function(full, match){
						return parsed[match].data;
					}));
				}
			}
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

	// Save reference to element
	html.sf$elementReferences = changesReference;
	// html.sf$modelParsed = parsed;

	// Run the pending element
	for (var i = 0; i < pendingInsert.length; i++) {
		var ref = pendingInsert[i];
		var tDOM = parsed[ref.direct].data;

		// Check if it's an HTMLElement
		if(tDOM.onclick !== void 0){
			ref.parentNode.insertBefore(tDOM, ref.dynamicFlag);
			continue;
		}

		tDOM = $.parseElement(parsed[ref.direct].data, true);
		for (var a = 0; a < tDOM.length; a++) {
			ref.parentNode.insertBefore(tDOM[a], ref.dynamicFlag);
		}
	}

	return html;
}

function syntheticCache(element, template, item){
	if(element.sf$cache === void 0)
		element.sf$cache = {};

	var cache = element.sf$cache;
	var modelRef_array = template.modelRef_array;

	for (var i = 0; i < modelRef_array.length; i++) {
		var ref = modelRef_array[i];
		cache[ref[0]] = deepProperty(item, ref[1]);
	}
}

function syntheticTemplate(element, template, property, item){
	var cache = element.sf$cache;
	var modelRef_array = template.modelRef_array;

	if(property !== void 0){
		var changes = template.modelReference[property];
		if(changes === void 0 || changes.length === 0){
			console.log(element, template, property, item);
			console.error("Failed to run syntheticTemplate because property '"+property+"' is not observed");
			return false;
		}

		if(cache)
			for (var i = 0; i < modelRef_array.length; i++) {
				var ref = modelRef_array[i];
				if(ref[0] !== property) continue;

				var newData = deepProperty(item, ref[1]);

				// Check if data was different
				if(cache[ref[0]] !== newData)
					cache[ref[0]] = newData;
			}
	}
	else{
		var changes = [];
		for (var i = 0; i < modelRef_array.length; i++) {
			var ref = modelRef_array[i];
			if(cache === void 0){
				Array.prototype.push.apply(changes, template.modelReference[ref[0]]);
				continue;
			}
			var newData = deepProperty(item, ref[1]);

			// Check if data was different
			if(cache[ref[0]] !== newData){
				Array.prototype.push.apply(changes, template.modelReference[ref[0]]);
				cache[ref[0]] = newData;
			}
		}

		if(changes.length === 0) return false;
	}

	var parsed = templateExec(template.parse, item, changes);
	function checkRelatedChanges(parseIndex){
		var found = false;
		for (var i = 0; i < parseIndex.length; i++) {
			if(changes.indexOf(parseIndex[i]) !== -1){
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
				var tDOM = $.parseElement(parsed[cRef.direct].data, true).reverse();
				var currentDOM = $.prevAll(cRef.dynamicFlag, cRef.startFlag);
				var notExist = false;

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
				if(checkRelatedChanges(cRef.ref.parse_index) === true){
					var temp = cRef.ref.value.replace(templateParser_regex, function(full, match){
						return parsed[match].data;
					});

					if(cRef.textContent.textContent === temp) continue;
					cRef.textContent.textContent = temp;

					haveChanges = true;
				}
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
				if(checkRelatedChanges(cRef.ref.parse_index) === true){
					var temp = cRef.ref.value.replace(templateParser_regex, function(full, match){
						return parsed[match].data;
					});

					if(cRef.attribute.value === temp) continue;
					cRef.attribute.value = temp;

					haveChanges = true;
				}
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