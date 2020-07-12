// ToDo: extract style attribute and use direct change into the CSS Style instead of modify attribute

// For contributor of this library
// Please be careful when you're passing the eval argument
// .apply() or spread ...array is slower than direct function call
// object[0] is slower than array[0]
var dataParser = function(html, _model_, template, _modelScope, preParsedReference, justName){
	var preParsed = [];
	var lastParsedIndex = preParsedReference.length;

	var prepared = html.replace(sfRegex.dataParser, function(actual, temp){
		temp = avoidQuotes(temp, function(temp_){
			// Unescape HTML
			temp_ = temp_.split('&amp;').join('&').split('&lt;').join('<').split('&gt;').join('>');

			// Mask item variable
			if(template.modelRef_regex !== void 0)
				temp_ = temp_.replace(template.modelRef_regex, function(full, left, right){
					return left+'_model_'+right;
				});

			// Mask model for variable
			return temp_.replace(template.modelRefRoot_regex, function(full, before, matched){
				return before+'_modelScope.'+matched;
			});
		}).split('_model_._modelScope.').join('_model_.').split('%@~_modelScope.').join('%@~');

		temp = temp.trim();

		// Simplicity similar
		var exist = preParsed.indexOf(temp);

		if(exist === -1){
			preParsed.push(temp);
			if(justName === true)
				preParsedReference.push(temp);
			else
				preParsedReference.push({type:REF_DIRECT, data:[temp, _model_, _modelScope]});
			return '{{%=' + (preParsed.length + lastParsedIndex - 1)+'%';
		}
		return '{{%=' + (exist + lastParsedIndex)+'%';
	});

	return prepared;
}

// Dynamic data parser
var uniqueDataParser = function(html, template, _modelScope){
	// Build script preparation
	html = html.replace(sfRegex.allTemplateBracket, function(full, matched){ // {[ ... ]}
		if(sfRegex.anyCurlyBracket.test(matched) === false) // {{ ... }}
			return "_result_ += '"+matched.split("\\").join("\\\\").split("'").join("\\'").split("\n").join("\\\n")+"'";

		var vars = [];
		matched = dataParser(matched, null, template, _modelScope, vars, true)
				.split('\\').join('\\\\').split('"').join('\\"').split("\n").join("\\\n");

		return '_result_ += (function(){return _escapeParse("'+matched+'", ['+vars.join(',')+' ])}).apply(null, arguments);';
	});

	var preParsedReference = [];
	var prepared = html.replace(sfRegex.uniqueDataParser, function(actual, temp){
		temp = avoidQuotes(temp, function(temp_){
			// Unescape HTML
			temp_ = temp_.split('&amp;').join('&').split('&lt;').join('<').split('&gt;').join('>');

			// Mask item variable
			if(template.modelRef_regex !== void 0)
				temp_ = temp_.replace(template.modelRef_regex, function(full, left, right){
					return left+'_model_'+right;
				});

			// Mask model for variable
			return temp_.replace(template.modelRefRoot_regex, function(full, before, matched){
				return before+'_modelScope.'+matched;
			});
		}).split('_model_._modelScope.').join('_model_.').split('%@~_modelScope.').join('%@~');

		var check = false;
		check = temp.split('@if ');
		if(check.length !== 1){
			check = check[1].split(':');

			var condition = check.shift();
			var elseIf = findElse(check);
			elseIf.type = REF_IF;
			elseIf.data = [null, _modelScope];

			// Trim Data
			elseIf.if = [condition.trim(), elseIf.if.trim()];
			if(elseIf.elseValue !== null)
				elseIf.elseValue = elseIf.elseValue.trim();

			for (var i = 0; i < elseIf.elseIf.length; i++) {
				elseIf.elseIf[i][0] = elseIf.elseIf[i][0].trim();
				elseIf.elseIf[i][1] = elseIf.elseIf[i][1].trim();
			}

			// Push data
			preParsedReference.push(elseIf);
			return '{{%%=' + (preParsedReference.length - 1);
		}

		// Warning! Avoid unencoded user inputted content
		// And always check/remove closing ']}' in user content
		check = temp.split('@exec');
		if(check.length !== 1){
			preParsedReference.push({type:REF_EXEC, data:[check[1], null, _modelScope]});
			return '{{%%=' + (preParsedReference.length - 1);
		}
		return '';
	});

	return [prepared, preParsedReference];
}

// {if, elseIf:([if, value], ...), elseValue}
var findElse = function(text){
	text = text.join(':');
	var else_ = null;

	// Split elseIf
	text = text.split('@elseif ');

	// Get else value
	var else_ = text[text.length - 1].split('@else');
	if(else_.length === 2){
		text[text.length - 1] = else_[0];
		else_ = else_.pop();
		else_ = else_.substr(else_.indexOf(':') + 1);
	}
	else else_ = null;

	var obj = {
		if:text.shift(),
		elseValue:else_
	};

	// Separate condition script and value
	obj.elseIf = new Array(text.length);
	for (var i = 0; i < text.length; i++) {
		var val = text[i].split(':');
		obj.elseIf[i] = [val.shift(), val.join(':')];
	}

	return obj;
}

function addressAttributes(currentNode, template){
	var attrs = currentNode.attributes;
	var keys = [];
	var indexes = 0;
	for (var a = attrs.length - 1; a >= 0; a--) {
		var found = attrs[a].value.includes('{{%=');
		if(attrs[a].name[0] === '@'){
			// No template processing for this
			if(found){
				console.error("To avoid vulnerability, template can't be used inside event callback", currentNode);
				continue;
			}

			if(template.modelRef_regex)
				attrs[a].value = attrs[a].value.replace(template.modelRef_regex, function(full, left, right){
					return left+'_model_'+right;
				});

			keys.push({
				name:attrs[a].name,
				value:attrs[a].value.trim(),
				event:true
			});

			currentNode.removeAttribute(attrs[a].name);
		}

		if(found){
			if(attrs[a].name[0] === ':'){
				var key = {
					name:attrs[a].name.slice(1),
					value:attrs[a].value.trim()
				};

				currentNode.removeAttribute(attrs[a].name);
				currentNode.setAttribute(key.name, '');
			}
			else var key = {
				name:attrs[a].name,
				value:attrs[a].value.trim()
			};

			indexes = [];
			found = key.value.replace(templateParser_regex, function(full, match){
				indexes.push(Number(match));
				return '';
			});

			if(found === '' && indexes.length === 1)
				key.direct = indexes[0];
			else{
				key.parse_index = indexes;
				key.value = key.value.replace(/[\t\r\n]/g, '').replace(/ {2,}/g, ' ').split(templateParser_regex_split);
				parseIndexAllocate(key.value);
			}

			keys.push(key);
		}
	}
	return keys;
}

function toObserve(full, model, properties){
	var place = model === '_model_' ? toObserve.template.modelRef : toObserve.template.modelRefRoot;

	// Get property name
	if(place[properties] === void 0){
		place[properties] = [toObserve.template.i];

		if(place === toObserve.template.modelRef)
			toObserve.template.modelRef_path.push(parsePropertyPath(properties));
		else
			toObserve.template.modelRefRoot_path.push(parsePropertyPath(properties));
	}
	else if(place[properties].includes(toObserve.template.i) === false)
		place[properties].push(toObserve.template.i);

	return full;
}

// Return element or
internal.model.templateInjector = function(targetNode, modelScope, cloneDynamic){
	var reservedTemplate = targetNode.getElementsByTagName('sf-reserved');
	var injectTemplate = targetNode.getElementsByTagName('sf-template');

	if(injectTemplate.length !== 0){
		var temp = window.templates;
		if(temp === void 0)
			throw new Error("<sf-template> need `window.templates` to be loaded first");

		for (var i = injectTemplate.length - 1; i >= 0; i--) {
			var path = injectTemplate[i].getAttribute('path')
			if(path === null){
				path = injectTemplate[i].getAttribute('get-path');

				if(path !== null) // below got undefined if not found
					path = deepProperty(window, parsePropertyPath(path));
			}

			var serve;
			if(path !== null){
				if(path !== void 0) {
					if(path[0] === '.' && targetNode.templatePath !== void 0)
						path = path.replace('./', targetNode.templatePath);

					serve = temp[path];
				}
			}
			else {
				path = injectTemplate[i].getAttribute('get-html');
				serve = deepProperty(window, parsePropertyPath(path));
			}

			if(serve === void 0){
				console.log(injectTemplate[i], 'Template path was not found', path);
				injectTemplate[i].remove();
				continue;
			}

			serve = $.parseElement(serve);
			$(serve).insertBefore(injectTemplate[i].nextSibling || injectTemplate[i]);
			injectTemplate[i].remove();
		}
	}

	var isDynamic = reservedTemplate.length !== 0;
	if(cloneDynamic === true && isDynamic === true){
		targetNode.sf$hasReserved = true;
		targetNode.sf$componentIgnore = true;

		var temp = internal.component.skip;
		internal.component.skip = true;
		isDynamic = targetNode.cloneNode(true);
		internal.component.skip = temp;
	}

	if(reservedTemplate.length !== 0){
		if(modelScope.sf$reserved === void 0){
			for (var i = reservedTemplate.length - 1; i >= 0; i--) {
				reservedTemplate[i].remove();
			}
		}
		else{
			var temp = modelScope.sf$reserved;
			for (var i = reservedTemplate.length - 1; i >= 0; i--) {
				var serve = temp[reservedTemplate[i].getAttribute('name')];
				if(serve === void 0){
					reservedTemplate[i].remove();
					continue;
				}

				serve = $.parseElement(serve);
				$(serve).insertBefore(reservedTemplate[i].nextSibling || reservedTemplate[i]);
				reservedTemplate[i].remove();
			}
		}
	}

	return isDynamic;
}

var createModelKeysRegex = internal.model.createModelKeysRegex = function(targetNode, modelScope, mask){
	var modelKeys = self.modelKeys(modelScope, true);
	if(modelKeys.length === 0){
		console.error(modelScope, $(targetNode.outerHTML)[0]);
		throw new Error("Template model was not found");
	}

	var obj = {};

	// Don't match text inside quote, or object keys
	obj.modelRefRoot_regex = new RegExp(sfRegex.scopeVar+'('+modelKeys+')', 'g');
	if(mask !== null)
		obj.modelRef_regex = new RegExp(sfRegex.getSingleMask.join(mask), 'gm');

	obj.modelRef_regex_mask = mask;
	return obj;
}

// ToDo: need performance optimization
self.extractPreprocess = function(targetNode, mask, modelScope, container, modelRegex, preserveRegex, repeatedListKey){
	// Remove repeated list from further process
	// To avoid data parser
	var backup = targetNode.querySelectorAll('[sf-repeat-this]');
	for (var i = 0; i < backup.length; i++) {
		var current = backup[i];
		current.insertAdjacentHTML('afterEnd', '<sfrepeat-this></sfrepeat-this>');
		current.remove();
	}

	if(targetNode.model !== void 0)
		return console.error('[Violation] element already has a model, template extraction aborted', targetNode, targetNode.model, mask, modelScope);

	var template;

	// modelRefRoot_regex should be placed on template prototype
	if(modelRegex.parse === void 0)
		template = Object.create(modelRegex);
	else{
		template = {
			modelRefRoot_regex:modelRegex.modelRefRoot_regex,
			modelRef_regex:modelRegex.modelRef_regex,
			modelRef_regex_mask:modelRegex.modelRef_regex_mask,
		};
	}

	// For preparing the next model too
	if(template.modelRef_regex_mask !== mask){
		template.modelRef_regex = RegExp(sfRegex.getSingleMask.join(mask), 'gm');
		template.modelRef_regex_mask = mask;
	}

	template.modelRefRoot = {};
	template.modelRefRoot_path = [];

	// Mask the referenced item
	if(mask !== null){
		template.modelRef = {};
		template.modelRef_path = [];
	}

	var copy = targetNode.outerHTML.replace(/[ \t]{2,}/g, ' ');

	// Extract data to be parsed
	copy = uniqueDataParser(copy, template, modelScope);
	var preParsed = copy[1];
	copy = dataParser(copy[0], null, template, modelScope, preParsed);

	function findModelProperty(){
		for (var i = 0; i < preParsed.length; i++) {
			var current = preParsed[i];

			// Text or attribute
			if(current.type === REF_DIRECT){
				toObserve.template.i = i;
				current.data[0] = current.data[0].replace(sfRegex.itemsObserve, toObserve, template, true);

				// Convert to function
				current.get = modelScript(mask, current.data.shift(), repeatedListKey);
				continue;
			}

			// Dynamic data
			if(current.type === REF_IF){
				var checkList = current.if.join(';');
				current.if[0] = modelScript(mask, current.if[0], repeatedListKey);
				current.if[1] = modelScript(mask, current.if[1], repeatedListKey);

				if(current.elseValue !== null){
					checkList += ';' + current.elseValue;
					current.elseValue = modelScript(mask, current.elseValue, repeatedListKey);
				}

				for (var a = 0; a < current.elseIf.length; a++) {
					var refElif = current.elseIf[a];

					checkList += refElif.join(';');
					refElif[0] = modelScript(mask, refElif[0], repeatedListKey);
					refElif[1] = modelScript(mask, refElif[1], repeatedListKey);
				}
			}
			else if(current.type === REF_EXEC){
				var checkList = current.data.shift();

				// Convert to function
				current.get = modelScript(mask, checkList, repeatedListKey);
			}

			toObserve.template.i = i;
			checkList.split('"').join("'").replace(sfRegex.itemsObserve, toObserve);
		}
	}

	// Rebuild element
	var tempSkip = internal.component.skip;
	internal.component.skip = true;
	if(container !== void 0)
		copy = '<'+container+'>'+copy+'</'+container+'>';

	copy = $.parseElement(copy, true)[0];
	if(container !== void 0){
		copy = copy.firstElementChild;
		copy.remove();
	}

	internal.component.skip = tempSkip;

	// Restore element repeated list
	var restore = copy.querySelectorAll('sfrepeat-this');
	for (var i = 0; i < backup.length; i++) {
		var current = restore[i];
		current.parentNode.replaceChild(backup[i], current);
	}

	template.specialElement = {
		repeat:[],
		input:[],
	};

	// It seems we can't use for.. of because need to do from backward
	// Start addressing
	var nodes = Array.from(self.queuePreprocess(copy, true, template.specialElement));
	var addressed = [];

	for (var i = nodes.length - 1; i >= 0; i--) {
		var temp = {
			nodeType:nodes[i].nodeType
		};

		if(temp.nodeType === 1){ // Element
			temp.attributes = addressAttributes(nodes[i], template);
			temp.address = $.getSelector(nodes[i], true);
		}

		else if(temp.nodeType === 3){ // Text node
			var innerHTML = nodes[i].textContent;
			var indexes = [];

			innerHTML.replace(/{{%%=([0-9]+)/gm, function(full, match){
				indexes.push(Number(match));
			});

			// Check for dynamic mode
			if(indexes.length !== 0){
				innerHTML = innerHTML.split(/{{%%=[0-9]+/gm);
				for (var a = 0; a < innerHTML.length; a++) {
					innerHTML[a] = trimIndentation(innerHTML[a]).trim();
				}
				nodes[i].textContent = innerHTML.shift();

				var parent = nodes[i].parentNode;
				var nextSibling = nodes[i].nextSibling;

				// Dynamic boundary start
				var addressStart = null;
				if(indexes.length !== 0 && nodes[i].textContent.length !== 0)
					addressStart = $.getSelector(nodes[i], true);
				else if(nodes[i].previousSibling !== null)
					addressStart = $.getSelector(nodes[i].previousSibling, true);

				// Find boundary ends
				var commentFlag = addressed.length;
				for(var a = 0; a < indexes.length; a++){
					var flag = document.createComment('');
					parent.insertBefore(flag, nextSibling);

					// Add comment element as a flag
					addressed.push({
						nodeType:-1,
						parse_index:indexes[a],
						startFlag:addressStart,
						address:$.getSelector(flag, true)
					});

					if(innerHTML[a]){
						var textNode = document.createTextNode(innerHTML[a]);
						parent.insertBefore(textNode, nextSibling);

						// Get new start flag
						if(a + 1 < indexes.length)
							addressStart = $.getSelector(textNode, true);
					}
					else if(addressStart !== null && a + 1 < indexes.length){
						addressStart = addressStart.slice();
						addressStart[addressStart.length-1]++;
					}
				}

				// Merge boundary address
				if(nodes[i].textContent === ''){
					nodes[i].remove();

					// Process the comment flag only
					for (var a = commentFlag; a < addressed.length; a++) {
						var ref = addressed[a].address;
						ref[ref.length - 1]--;
					}
					continue;
				}
				else if(nodes[i].textContent.search(/{{%=[0-9]+%/) === -1)
					continue;
			}

			// Check if it's only model value
			indexes = [];
			innerHTML = nodes[i].textContent.replace(templateParser_regex, function(full, match){
				indexes.push(Number(match));
				return '';
			});

			if(innerHTML === '' && indexes.length === 1)
				temp.direct = indexes[0];
			else{
				temp.value = nodes[i].textContent.replace(/[ \t]{2,}/g, ' ').split(templateParser_regex_split);
				parseIndexAllocate(temp.value);
				temp.parse_index = indexes;
			}

			temp.address = $.getSelector(nodes[i], true);
		}

		addressed.push(temp);
	}

	toObserve.template = template;
	findModelProperty();

	delete toObserve.template.i;
	toObserve.template = void 0;

	revalidateTemplateRef(template, modelScope);

	// Get the indexes for input bind
	var specialInput = template.specialElement.input;
	for (var i = 0; i < specialInput.length; i++) {
		specialInput[i] = $.getSelector(specialInput[i], true);
	}

	// Get the indexes for sf-repeat-this
	var specialRepeat = template.specialElement.repeat;
	for (var i = 0; i < specialRepeat.length; i++) {
		specialRepeat[i] = $.getSelector(specialRepeat[i], true);
	}

	// internal.language.refreshLang(copy);
	template.html = copy;
	template.parse = preParsed;
	template.addresses = addressed;

	if(preserveRegex === void 0 && modelRegex.parse !== void 0){
		delete template.modelRefRoot_regex;
		delete template.modelRef_regex;
		delete template.modelRef_regex_mask;
	}

	return template;
}

var enclosedHTMLParse = false;
var excludes = {HTML:1,HEAD:1,STYLE:1,LINK:1,META:1,SCRIPT:1,OBJECT:1,IFRAME:1};
self.queuePreprocess = function(targetNode, extracting, collectOther, temp){
	var childNodes = targetNode.childNodes;

	if(temp === void 0){
		temp = new Set();

		var attrs = targetNode.attributes;
		for (var a = 0; a < attrs.length; a++) {
			if(attrs[a].name[0] === '@' || attrs[a].value.includes('{{')){
				temp.add(targetNode);
				targetNode.sf$onlyAttribute = true;
				break;
			}
		}
	}

	// Scan from last into first element
	for (var i = childNodes.length - 1; i >= 0; i--) {
		var currentNode = childNodes[i];

		if(excludes[currentNode.nodeName] !== void 0)
			continue;

		if(currentNode.nodeType === 1){ // Tag
			// Skip {[ ..enclosed template.. ]}
			if(enclosedHTMLParse === true)
				continue;

			// Skip nested sf-model or sf-space
			if(currentNode.tagName === 'SF-M' || currentNode.sf$controlled !== void 0)
				continue;

			var attrs = currentNode.attributes;

			// Skip element and it's childs that already bound to prevent vulnerability
			if(attrs['sf-bind-list'] !== void 0)
				continue;

			if(attrs['sf-repeat-this'] !== void 0){
				collectOther.repeat.push(currentNode);
				continue;
			}

			if(attrs['sf-into'] !== void 0 || attrs['sf-bind'] !== void 0)
				collectOther.input.push(currentNode);

			// Skip any custom element
			if(currentNode.hasAttribute('sf-parse') === false && currentNode.tagName.includes('-')){
				if(currentNode.tagName !== 'SF-PAGE-VIEW' || currentNode.parentNode.hasAttribute('sf-parse') === false)
					continue;
			}

			for (var a = 0; a < attrs.length; a++) {
				if(attrs[a].name[0] === '@' || attrs[a].value.includes('{{')){
					temp.add(currentNode);
					currentNode.sf$onlyAttribute = true;
					break;
				}
			}

			if(currentNode.childNodes.length !== 0)
				self.queuePreprocess(currentNode, extracting, collectOther, temp);
		}

		else if(currentNode.nodeType === 3){ // Text
			if(currentNode.textContent.length === 0){
				currentNode.remove();
				continue;
			}

			// The scan is from bottom to first index
			var enclosing = currentNode.textContent.indexOf('{[');
			if(enclosing !== -1)
				enclosedHTMLParse = false;
			else if(enclosedHTMLParse === true)
				continue;

			// Start enclosed if closing pattern was found
			var enclosed = currentNode.textContent.indexOf(']}');
			if(enclosed !== -1 && (enclosing === -1 || enclosing > enclosed)){ // avoid {[ ... ]}
				enclosedHTMLParse = true; // when ]} ...
				continue;
			}

			// Continue here when enclosed template {[...]} was skipped

			if(currentNode.textContent.includes('{{')){
				if(extracting === void 0){
					var theParent = currentNode.parentNode;

					// If it's not single/regular template
					if(currentNode.textContent.includes('{{@') || enclosing !== -1)
						temp.add(theParent); // get the element (from current text node)
					else temp.add(currentNode);

					if(theParent.sf$onlyAttribute !== void 0)
						delete theParent.sf$onlyAttribute;

					// Remove because the parent will be removed
					for (var i = collectOther.input.length-1; i >= 0; i--)
						if(theParent.contains(collectOther.input[i]))
							collectOther.input.splice(i, 1);

					break;
				}

				if(!temp.has(currentNode)){
					temp.add(currentNode);

					if(currentNode.parentNode.sf$onlyAttribute !== void 0)
						delete currentNode.parentNode.sf$onlyAttribute;
				}
			}
		}
	}

	return temp;
}

self.parsePreprocess = function(nodes, modelRef, modelKeysRegex){
	var binded = [];

	for(var current of nodes){
		// Get reference for debugging
		processingElement = current;

		if(current.nodeType === 3 && binded.includes(current.parentNode) === false){
			self.bindElement(current.parentNode, modelRef, void 0, void 0, modelKeysRegex);
			binded.push(current.parentNode);
			continue;
		}

		// Create attribute template only because we're not going to process HTML content
		if(current.sf$onlyAttribute !== void 0){
			var preParsedRef = [];

			var template = Object.create(modelKeysRegex);
			template.parse = preParsedRef;
			template.modelRefRoot = {};
			template.modelRefRoot_path = [];

			var attrs = current.attributes;
			for (var i = 0; i < attrs.length; i++) {
				var attr = attrs[i];

				if(attr.value.includes('{{'))
					attr.value = dataParser(attr.value, null, template, modelRef, preParsedRef);
			}

			template.addresses = addressAttributes(current, template);
			toObserve.template = template;

			// Create as function
			for (var i = 0; i < preParsedRef.length; i++) {
				var ref = preParsedRef[i];

				if(ref.type === REF_DIRECT){
					toObserve.template.i = i;
					ref.data[0] = ref.data[0].replace(sfRegex.itemsObserve, toObserve);

					// Convert to function
					ref.get = modelScript(void 0, ref.data.shift());
					continue;
				}
			}

			delete toObserve.template.i;
			toObserve.template = void 0;

			revalidateTemplateRef(template, modelRef);

			var parsed = templateExec(preParsedRef, modelRef);
			var currentRef = [];
			parserForAttribute(current, template.addresses, null, modelRef, parsed, currentRef, void 0, template);

			// Save reference to element
			if(currentRef.length !== 0){
				currentRef.template = template;
				current.sf$elementReferences = currentRef;
			}

			self.bindElement(current, modelRef, template);

			delete current.sf$onlyAttribute;
			continue;
		}

		// Double check if the child element already bound to prevent vulnerability
		if(current.innerHTML.includes('sf-bind-list') && current.tagName !== 'SF-M'){
			console.error("Can't parse element that already parsed with other component", current);
			console.log("To fix this, the sf-m element need to be initialized before the component-element");
			console.log(nodes);
			continue;
		}

		self.bindElement(current, modelRef, void 0, void 0, modelKeysRegex);
	}
}

function initBindingInformation(modelRef){
	if(modelRef.sf$bindedKey !== void 0)
		return;

	// Element binding data
	Object.defineProperty(modelRef, 'sf$bindedKey', {
		configurable: true,
		enumerable:false,
		writable:true,
		value:{}
	});
}

function revalidateTemplateRef(template, modelRef){
	revalidateBindingPath(template.modelRefRoot, template.modelRefRoot_path, modelRef);

	// for repeated list if exist
	if(template.modelRef_path !== void 0 && template.modelRef_path.length !== 0){
		template.modelRef_path.revalidate = true;
		revalidateBindingPath(template.modelRef, template.modelRef_path, modelRef);
	}
}

// This will affect syntheticTemplate validation on property observer
function revalidateBindingPath(refRoot, paths, modelRef){
	for (var i = 0; i < paths.length; i++) {
		var path = paths[i];
		var deep = deepProperty(modelRef, path.slice(0, -1));

		// We're not bind the native stuff
		if(path.includes('constructor')){
			for(var keys in refRoot){
				if(keys.includes('.constructor'))
					delete refRoot[keys];
			}

			for (var a = i+1; a < paths.length; a++) {
				if(paths[a].includes('constructor'))
					paths.splice(a--, 1);
			}

			paths.splice(i, 1);
			return;
		}

		// We can't verify it if not exist '-'
		if(deep === void 0)
			continue;

		// Decrease one level, maybe because from calling string/number manipulation function like .slice or .toFixed
		if(deep.constructor === String || deep.constructor === Number){
			// if it's taking index of string, then decrease two level
			if(path.length > 3 && path[path.length-2].constructor === Number)
				path.splice(path.length-2);
			else
				path.splice(path.length-1);

			// Remove other similar paths
			that:for (var a = i+1; a < paths.length; a++) {
				var check = paths[a];
				for (var z = 0; z < path.length; z++) {
					if(check[z] !== path[z])
						continue that;
				}

				paths.splice(a--, 1);
			}

			// Replace the property, we need to search it and collect the index
			var str = stringifyPropertyPath(path);
			var collect = [];

			for(var keys in refRoot){
				if(keys.indexOf(str) === 0){
					var rootIndex = refRoot[keys];
					delete refRoot[keys];

					for (var a = 0; a < rootIndex.length; a++) {
						if(collect.includes(rootIndex[a]) === false)
							collect.push(rootIndex[a]);
					}
				}
			}

			refRoot[str] = collect;
		}
		// We're not binding the native stuff
		else if((deep.constructor === Array && path[path.length-1] === 'length') || deep.constructor === Function){
			// Delete the property
			var str = stringifyPropertyPath(path);
			for(var keys in refRoot){
				if(keys.indexOf(str) === 0)
					delete refRoot[keys];
			}
		}
	}
}