// ToDo: extract style attribute and use direct change into the CSS Style instead of modify attribute

// For contributor of this library
// Please be careful when you're passing the eval argument
var dataParser = function(html, _model_, mask, _modelScope, runEval, preParsedReference){
	if(!runEval) runEval = '';

	var modelKeys = self.modelKeys(_modelScope).join('|');

	if(modelKeys.length === 0){
		console.error(_modelScope, $.parseElement(html));
		throw new Error("Template model was not found");
	}

	// Don't match text inside quote, or object keys
	var scopeMask = RegExp(sf.regex.scopeVar+'('+modelKeys+')', 'g');

	if(mask)
		var itemMask = RegExp(sf.regex.getSingleMask.join(mask), 'gm');

	bindingEnabled = true;

	if(runEval === '#noEval'){
		var preParsed = [];
		var lastParsedIndex = preParsedReference.length;
	}

	var prepared = html.replace(sf.regex.dataParser, function(actual, temp){
		temp = avoidQuotes(temp, function(temp_){
			// Unescape HTML
			temp_ = temp_.split('&amp;').join('&').split('&lt;').join('<').split('&gt;').join('>');

			// Mask item variable
			if(mask)
				temp_ = temp_.replace(itemMask, function(full, left, right){
					return left+'_model_'+right;
				});

			// Mask model for variable
			return temp_.replace(scopeMask, function(full, before, matched){
				return before+'_modelScope.'+matched;
			});
		}).split('_model_._modelScope.').join('_model_.');

		// Evaluate
		if(runEval === '#noEval'){
			temp = temp.trim();

			// Simplicity similar
			var exist = preParsed.indexOf(temp);

			if(exist === -1){
				preParsed.push(temp);
				preParsedReference.push({type:REF_DIRECT, data:[temp, _model_, _modelScope]});
				return '{{%=' + (preParsed.length + lastParsedIndex - 1)+'%';
			}
			return '{{%=' + (exist + lastParsedIndex)+'%';
		}

		temp = '' + localEval.apply(null, [runEval + temp, _model_, _modelScope]);

		return temp.replace(sf.regex.escapeHTML, function(i) {
	        return '&#'+i.charCodeAt(0)+';';
	    });
	});

	if(runEval === '#noEval'){
		// Clear memory before return
		_modelScope = preParsed = _model_ = mask = runEval = scopeMask = itemMask = html = null;
		setTimeout(function(){prepared = null});
	}
	return prepared;
}

// Dynamic data parser
var uniqueDataParser = function(html, _model_, mask, _modelScope, runEval){
	// Get prepared html content
	var _content_ = {
		length:0,
		_modelScope:_modelScope,
		take:function(passVar, currentIndex){
			if(passVar === null)
				return dataParser(this[currentIndex], _model_, mask, this._modelScope);

			// Use strict mode and prepare for new variables
			var strDeclare = '"use strict";var ';
			var firstTime = true;

			// Declare new variable
			for(var key in passVar){
				if(typeof passVar[key] === 'string')
					passVar[key] = '"'+passVar[key].split('"').join('\\"')+'"';
				else if(key === '_model_'){
					_model_ = passVar[key];
					continue;
				}
				else if(typeof passVar[key] === 'object')
					passVar[key] = JSON.stringify(passVar[key]);

				if(!firstTime)
					strDeclare += ',';

				strDeclare += key + ' = ' + passVar[key];
				firstTime = false;
			}

			// Remove var because no variable are being passed
			if(firstTime === true)
				strDeclare = strDeclare.replace('var ', '');

			// Escape function call for addional security eval protection
			strDeclare = strDeclare.split('(').join('&#40;').split(')').join('&#41;');

			// Pass to static data parser for another HTML data
			return dataParser(this[currentIndex], _model_, mask, this._modelScope, strDeclare + ';');
		}
	};

	// Build script preparation
	html = html.replace(/{\[([\s\S]*?)\]}/g, function(full, matched){
		if(/{{.*?}}/.test(matched) === false)
			return "_result_ += '"+matched.split("'").join("\\'")+"'";

		_content_[_content_.length] = matched;
		_content_.length++;
		return '_result_ += _content_.take(&VarPass&, '+(_content_.length - 1)+');';
	});

	var modelKeys = self.modelKeys(_modelScope).join('|');

	if(modelKeys.length === 0){
		console.error(_modelScope, $.parseElement(html));
		throw new Error("Template model was not found");
	}

	// Don't match text inside quote, or object keys
	var scopeMask = RegExp(sf.regex.scopeVar+'('+modelKeys+')', 'g');

	if(mask)
		var itemMask = RegExp(sf.regex.getSingleMask.join(mask), 'gm');

	if(runEval === '#noEval')
		var preParsedReference = [];

	var prepared = html.replace(sf.regex.uniqueDataParser, function(actual, temp){
		temp = avoidQuotes(temp, function(temp_){
			// Unescape HTML
			temp_ = temp_.split('&amp;').join('&').split('&lt;').join('<').split('&gt;').join('>');

			// Mask item variable
			if(mask)
				temp_ = temp_.replace(itemMask, function(full, left, right){
					return left+'_model_'+right;
				});

			// Mask model for variable
			return temp_.replace(scopeMask, function(full, before, matched){
				return before+'_modelScope.'+matched;
			});
		}).split('_model_._modelScope.').join('_model_.');;

		var result = '';
		var check = false;

		// Get defined variables
		var VarPass_ = /(var|let)([\w,\s]+)(?=\s(?==|in|of))/g;
		var VarPass = [];
		var s1 = null;
		while((s1 = VarPass_.exec(temp)) !== null){
			VarPass.push(s1[2]);
		}

		if(_model_ === null && runEval === '#noEval')
			VarPass.push('_model_');

		if(VarPass.length !== 0){
			var obtained = [];
			for (var i = 0; i < VarPass.length; i++) {
				VarPass[i].replace(/([\n\t\r]|  )+/g, '').split(',').forEach(function(val){
					obtained.push(val);
				});
			};
			VarPass = obtained;
			for (var i = 0; i < VarPass.length; i++) {
				VarPass[i] += ':typeof '+VarPass[i]+'!=="undefined"?'+VarPass[i]+':void 0';
			}

			if(VarPass.length === 0)
				VarPass = 'null';
			else VarPass = '{'+VarPass.join(',')+'}';
			temp = temp.split('&VarPass&').join(VarPass);
		}
		else temp = temp.split('&VarPass&').join('null');

		check = temp.split('@if ');
		if(check.length !== 1){
			check = check[1].split(':');

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
					elseIf:[],
					elseValue:else_
				};

				// Separate condition script and value
				for (var i = 0; i < text.length; i++) {
					var val = text[i].split(':');
					obj.elseIf.push([val.shift(), val.join(':')]);
				}

				return obj;
			}

			if(runEval === '#noEval'){
				var condition = check.shift();
				var elseIf = findElse(check);
				elseIf.type = REF_IF;
				elseIf.data = [_model_, _modelScope, _content_];

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

			var scopes = [check[0], _model_, _modelScope, _content_];

			// If condition was not meet
			if(!localEval.apply(null, scopes)){
				check.shift();
				return elseIfHandle(findElse(check), scopes);
			}

			check.shift();
			scopes[0] = check.join(':');

			return localEval.apply(null, scopes);
		}

		// Warning! Avoid unencoded user inputted content
		// And always check/remove closing ']}' in user content
		// Any function call will be removed for addional security
		check = temp.split('@exec');
		if(check.length !== 1){
			var scopes = [check[1], _model_, _modelScope, _content_];

			if(runEval === '#noEval'){
				preParsedReference.push({type:REF_EXEC, data:scopes});
				return '{{%%=' + (preParsedReference.length - 1);
			}

			temp = localEval.apply(null, scopes);
			return temp;
		}
		return '';
	});

	if(runEval === '#noEval'){
		// Clear memory before return
		_modelScope = runEval = scopeMask = itemMask = html = null;
		setTimeout(function(){prepared = null});
		return [prepared, preParsedReference, _content_];
	}

	return prepared;
}

function addressAttributes(currentNode, template, itemMask){
	var attrs = currentNode.attributes;
	var keys = [];
	var indexes = 0;
	for (var a = attrs.length - 1; a >= 0; a--) {
		var found = attrs[a].value.indexOf('{{%=') !== -1;
		if(attrs[a].name[0] === '@'){
			// No template processing for this
			if(found){
				console.error("To avoid vulnerability, template can't be used inside event callback", currentNode);
				continue;
			}

			if(itemMask)
				attrs[a].value = attrs[a].value.replace(itemMask, function(full, left, right){
					return left+'_model_'+right;
				});

			keys.push({
				name:attrs[a].name,
				value:attrs[a].value,
				event:true
			});

			currentNode.removeAttribute(attrs[a].name);
		}

		if(found){
			if(attrs[a].name[0] === ':'){
				var key = {
					name:attrs[a].name.slice(1),
					value:attrs[a].value
				};

				currentNode.removeAttribute(attrs[a].name);
				currentNode.setAttribute(key.name, '');
			}
			else var key = {
				name:attrs[a].name,
				value:attrs[a].value
			};

			indexes = [];
			found = key.value.replace(templateParser_regex, function(full, match){
				indexes.push(Number(match));
				return '';
			});

			if(found === '' && indexes.length === 1)
				key.direct = indexes[0];
			else
				key.parse_index = indexes;

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
			toObserve.template.modelRef_array.push([properties, parsePropertyPath(properties)]);
		else
			toObserve.template.modelRefRoot_array.push([properties, parsePropertyPath(properties)]);
	}
	else if(place[properties].indexOf(toObserve.template.i) === -1)
		place[properties].push(toObserve.template.i);

	return full;
};

self.templateInjector = function(targetNode, modelScope){
	var injectTemplate = targetNode.getElementsByTagName('sf-template');
	var reservedTemplate = targetNode.getElementsByTagName('sf-reserved');
	var isDynamic = reservedTemplate.length !== 0;

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

	if(injectTemplate.length !== 0){
		var temp = window.templates;
		if(temp === void 0)
			throw new Error("<sf-template> need `window.templates` to be loaded first");

		for (var i = injectTemplate.length - 1; i >= 0; i--) {
			var path = injectTemplate[i].getAttribute('path');

			if(path[0] === '.')
				path = path.replace('./', targetNode.templatePath);

			var serve = temp[path];
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
}

self.extractPreprocess = function(targetNode, mask, modelScope, container){
	self.templateInjector(targetNode, modelScope);

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

	var copy = targetNode.outerHTML;
	var template = {
		modelRefRoot:{},
		modelRefRoot_array:[],
		modelRef:null,
		modelRef_array:null,
	};

	// Mask the referenced item
	if(mask !== null){
		template.modelRef = {};
		template.modelRef_array = [];
	}

	// Extract data to be parsed
	copy = uniqueDataParser(copy, null, mask, modelScope, '#noEval');
	var preParsed = copy[1];
	var _content_ = copy[2];
	copy = dataParser(copy[0], null, mask, modelScope, '#noEval', preParsed);

	function findModelProperty(){
		for (var i = 0; i < preParsed.length; i++) {
			var current = preParsed[i];

			// Text or attribute
			if(current.type === REF_DIRECT){
				toObserve.template.i = i;
				current.data[0] = current.data[0].replace(sf.regex.itemsObserve, toObserve, template);

				// Convert to function
				current.get = modelScript(current.data.shift());
				continue;
			}

			// Dynamic data
			if(current.type === REF_IF){
				var checkList = current.if.join(';');
				current.if[0] = modelScript(current.if[0]);
				current.if[1] = modelScript(current.if[1]);

				if(current.elseValue !== null){
					checkList += ';' + current.elseValue;
					current.elseValue = modelScript(current.elseValue);
				}

				for (var a = 0; a < current.elseIf.length; a++) {
					var refElif = current.elseIf[a];

					checkList += refElif.join(';');
					refElif[0] = modelScript(refElif[0]);
					refElif[1] = modelScript(refElif[1]);
				}
			}
			else if(current.type === REF_EXEC){
				var checkList = current.data.shift();

				// Convert to function
				current.get = modelScript(checkList);
			}

			checkList = checkList.replace(/_result_ \+= _content_\.take\(.*?, ([0-9]+)\);/g, function(full, match){
				return _content_[match];
			});

			toObserve.template.i = i;
			checkList.split('"').join("'").replace(sf.regex.itemsObserve, toObserve);
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

	// Start addressing
	var nodes = self.queuePreprocess(copy, true, template.specialElement).reverse();
	var addressed = [];

	var itemMask = mask ? RegExp(sf.regex.getSingleMask.join(mask), 'gm') : void 0;
	for (var i = 0; i < nodes.length; i++) {
		var temp = {
			nodeType:nodes[i].nodeType
		};

		if(temp.nodeType === 1){ // Element
			temp.attributes = addressAttributes(nodes[i], template, itemMask);
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
				var commentFlag = [];
				for(var a = 0; a < indexes.length; a++){
					var flag = document.createComment('');
					parent.insertBefore(flag, nextSibling);
					commentFlag.push({
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
				Array.prototype.push.apply(addressed, commentFlag);
				if(nodes[i].textContent === ''){
					nodes[i].remove();
					for (var a = 0; a < commentFlag.length; a++) {
						var ref = commentFlag[a].address;
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
				temp.value = nodes[i].textContent;
				temp.parse_index = indexes;
			}

			temp.address = $.getSelector(nodes[i], true);
		}

		addressed.push(temp);
	}

	toObserve.template = template;
	findModelProperty();
	delete toObserve.template.i;
	delete toObserve.template;

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

	return template;
}

var enclosedHTMLParse = false;
var excludes = {HTML:1,HEAD:1,STYLE:1,LINK:1,META:1,SCRIPT:1,OBJECT:1,IFRAME:1};
self.queuePreprocess = function(targetNode, extracting, collectOther, temp){
	var childNodes = targetNode.childNodes;
	var firstCall = false;

	if(temp === void 0){
		temp = new Set();
		firstCall = true;

		var attrs = targetNode.attributes;
		for (var a = 0; a < attrs.length; a++) {
			if(attrs[a].name[0] === '@' || attrs[a].value.indexOf('{{') !== -1){
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
			if(currentNode.hasAttribute('sf-parse') === false && currentNode.tagName.indexOf('-') !== -1){
				if(currentNode.tagName !== 'SF-PAGE-VIEW' || currentNode.parentNode.hasAttribute('sf-parse') === false)
					continue;
			}

			for (var a = 0; a < attrs.length; a++) {
				if(attrs[a].name[0] === '@' || attrs[a].value.indexOf('{{') !== -1){
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

			if(currentNode.textContent.indexOf('{{') !== -1){
				if(extracting === void 0){
					// If it's not single/regular template
					if(currentNode.textContent.indexOf('{{@') !== -1 || enclosing !== -1)
						temp.add(currentNode.parentNode); // get the element (from current text node)
					else temp.add(currentNode);

					if(currentNode.parentNode.sf$onlyAttribute !== void 0)
						delete currentNode.parentNode.sf$onlyAttribute;
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

	if(firstCall)
		return Array.from(temp);
}

self.parsePreprocess = function(nodes, modelRef){
	var binded = [];
	for (var a = 0; a < nodes.length; a++) {
		// Get reference for debugging
		var current = processingElement = nodes[a];

		if(current.nodeType === 3 && binded.indexOf(current.parentNode) === -1){
			self.bindElement(current.parentNode, modelRef);
			binded.push(current.parentNode);
			continue;
		}

		// Create attribute template only because we're not going to process HTML content
		if(current.sf$onlyAttribute !== void 0){
			var preParsedRef = [];

			var attrs = current.attributes;
			for (var i = 0; i < attrs.length; i++) {
				var attr = attrs[i];

				if(attr.value.indexOf('{{') !== -1)
					attr.value = dataParser(attr.value, null, false, modelRef, '#noEval', preParsedRef);
			}

			var template = {
				parse:preParsedRef,
				modelRefRoot:{},
				modelRefRoot_array:[],
				modelRef:null,
				modelRef_array:null
			};

			template.addresses = addressAttributes(current, template);
			toObserve.template = template;

			// Create as function
			for (var i = 0; i < preParsedRef.length; i++) {
				var ref = preParsedRef[i];

				if(ref.type === REF_DIRECT){
					toObserve.template.i = i;
					ref.data[0] = ref.data[0].replace(sf.regex.itemsObserve, toObserve);

					// Convert to function
					ref.get = modelScript(ref.data.shift());
					continue;
				}
			}

			delete toObserve.template.i;
			delete toObserve.template;

			var parsed = templateExec(preParsedRef, modelRef);
			var currentRef = [];
			parserForAttribute(current, template.addresses, null, modelRef, parsed, currentRef);

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
		if(current.innerHTML.indexOf('sf-bind-list') !== -1 && current.tagName !== 'SF-M'){
			console.error("Can't parse element that already parsed with other component", current);
			console.log("To fix this, the sf-m element need to be initialized before the component-element");
			console.log(nodes);
			continue;
		}

		if(current.hasAttribute('sf-bind-ignore') === false)
			self.bindElement(current, modelRef);

		// Deprecate
		else{
			var temp = uniqueDataParser(current.innerHTML, modelRef, false, model);
			current.innerHTML = dataParser(temp, modelRef, false, model);
			var attrs = current.attributes;
			for (var i = 0; i < attrs.length; i++) {
				if(attrs[i].value.indexOf('{{') !== -1){
					var attr = attrs[i];
					attr.value = dataParser(attr.value, modelRef, false, model);
				}
			}
		}
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