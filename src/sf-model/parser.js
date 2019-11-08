// For contributor of this library
// Please be careful when you're passing the eval argument
var dataParser = function(html, _model_, mask, _modelScope, runEval, preParsedReference){
	if(!runEval) runEval = '';

	var modelKeys = self.modelKeys(_modelScope).join('|');

	if(modelKeys.length === 0)
		throw "The model was not found";

	// Don't match text inside quote, or object keys
	var scopeMask = RegExp(sf.regex.strictVar+'('+modelKeys+')\\b', 'g');

	if(mask)
		var itemMask = RegExp(sf.regex.strictVar+mask+'\\.\\b', 'g');

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
				temp_ = temp_.replace(itemMask, function(matched){
					return '_model_.'+matched[0].slice(1);
				});

			// Mask model for variable
			return temp_.replace(scopeMask, function(full, matched){
				return '_modelScope.'+matched;
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
				return '{{%=' + (preParsed.length + lastParsedIndex - 1);
			}
			return '{{%=' + (exist + lastParsedIndex);
		}

		temp = '' + localEval.apply(self.root, [runEval + temp, _model_, _modelScope]);

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

	if(modelKeys.length === 0)
		throw "The model was not found";

	// Don't match text inside quote, or object keys
	var scopeMask = RegExp(sf.regex.strictVar+'('+modelKeys+')\\b', 'g');

	if(mask)
		var itemMask = RegExp(sf.regex.strictVar+mask+'\\.\\b', 'g');

	if(runEval === '#noEval')
		var preParsedReference = [];

	var prepared = html.replace(sf.regex.uniqueDataParser, function(actual, temp){
		temp = avoidQuotes(temp, function(temp_){
			// Unescape HTML
			temp_ = temp_.split('&amp;').join('&').split('&lt;').join('<').split('&gt;').join('>');

			// Mask item variable
			if(mask)
				temp_ = temp_.replace(itemMask, function(matched){
					return '_model_.'+matched[0].slice(1);
				});

			// Mask model for variable
			return temp_.replace(scopeMask, function(full, matched){
				return '_modelScope.'+matched;
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
			if(!localEval.apply(self.root, scopes)){
				check.shift();
				return elseIfHandle(findElse(check), scopes);
			}

			check.shift();
			scopes[0] = check.join(':');

			return localEval.apply(self.root, scopes);
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

			temp = localEval.apply(self.root, scopes);
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

self.extractPreprocess = function(targetNode, mask, modelScope){
	// Remove repeated list from further process
	// To avoid data parser
	var backup = targetNode.querySelectorAll('[sf-repeat-this]');
	for (var i = 0; i < backup.length; i++) {
		var current = backup[i];
		current.insertAdjacentHTML('afterEnd', '<sfrepeat-this></sfrepeat-this>');
		current.remove();
	}

	var copy = targetNode.outerHTML;

	// Mask the referenced item
	if(mask !== null)
		copy = copy.split('#'+mask).join('_model_');

	// Extract data to be parsed
	copy = uniqueDataParser(copy, null, mask, modelScope, '#noEval');
	var preParsed = copy[1];
	var _content_ = copy[2];
	copy = dataParser(copy[0], null, mask, modelScope, '#noEval', preParsed);

	function findModelProperty(){
		if(mask === null){ // For model items
			// Get model keys and sort by text length, make sure the longer one is from first index to avoid wrong match
			var extract = RegExp('(?:{{.*?\\b|_modelScope\\.)('+self.modelKeys(modelScope).sort(function(a, b){
				return b.length - a.length
			}).join('|')+')(\\b.*?}}|)', 'g');
		}
		else var extract = sf.regex.arrayItemsObserve; // For array items
		var found = {};

		for (var i = 0; i < preParsed.length; i++) {
			var current = preParsed[i];

			// Text or attribute
			if(current.type === REF_DIRECT){
				current.data[0].split('"').join("'").replace(extract, function(full, match){
					match = match.replace(/\['(.*?)'\]/g, function(full_, match_){
						return '.'+match_;
					});

					if(found[match] === void 0) found[match] = [i];
					else if(found[match].indexOf(i) === -1)
						found[match].push(i);
				});

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

			checkList.split('"').join("'").replace(extract, function(full, match){
				match = match.replace(/\['(.*?)'\]/g, function(full_, match_){
					return '.'+match_;
				});

				if(found[match] === void 0) found[match] = [i];
				else if(found[match].indexOf(i) === -1)
					found[match].push(i);
			});
		}

		return found;
	}

	// Rebuild element
	internal.component.skip = true;
	copy = $.parseElement(copy)[0];
	internal.component.skip = false;

	// Restore element repeated list
	var restore = copy.querySelectorAll('sfrepeat-this');
	for (var i = 0; i < restore.length; i++) {
		var current = restore[i];
		current.parentNode.replaceChild(backup[i], current);
	}

	var specialElement = {
		repeat:[],
		input:[]
	};

	// Start addressing
	var nodes = self.queuePreprocess(copy, true, specialElement).reverse();
	var addressed = [];

	function addressAttributes(currentNode){
		var attrs = currentNode.attributes;
		var keys = [];
		var indexes = 0;
		for (var a = attrs.length - 1; a >= 0; a--) {
			var found = attrs[a].value.split('{{%=');
			if(attrs[a].name[0] === '@'){
				// No template processing for this
				if(found.length !== 1){
					console.error("To avoid vulnerability, template can't be used inside event callback", currentNode);
					continue;
				}

				keys.push({
					name:attrs[a].name,
					value:attrs[a].value,
					event:true
				});

				currentNode.removeAttribute(attrs[a].name);
			}

			if(found.length !== 1){
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
				found = key.value.replace(/{{%=([0-9]+)/g, function(full, match){
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

	var currentElement = addressAttributes(copy);
	if(currentElement.length !== 0)
		addressed.push({
			nodeType:1,
			address:[0],
			attributes:currentElement
		});

	for (var i = 0; i < nodes.length; i++) {
		var temp = {
			nodeType:nodes[i].nodeType
		};

		if(temp.nodeType === 1){ // Element
			temp.attributes = addressAttributes(nodes[i]);
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
				else if(nodes[i].textContent.search(/{{%=[0-9]+/) === -1)
					continue;
			}

			// Check if it's only model value
			indexes = [];
			innerHTML = nodes[i].textContent.replace(/{{%=([0-9]+)/gm, function(full, match){
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

	var modelReference = findModelProperty();
	var keys = Object.keys(modelReference);
	var asArray = [];
	for (var i = 0; i < keys.length; i++) {
		asArray.push([keys[i], keys[i].split('.')]);
	}

	// Get the indexes for input bind
	var specialInput = specialElement.input;
	for (var i = 0; i < specialInput.length; i++) {
		specialInput[i] = $.getSelector(specialInput[i], true);
	}

	// Get the indexes for sf-repeat-this
	var specialRepeat = specialElement.repeat;
	for (var i = 0; i < specialRepeat.length; i++) {
		specialRepeat[i] = $.getSelector(specialRepeat[i], true);
	}

	return {
		html:copy,
		parse:preParsed,
		addresses:addressed,
		modelReference:modelReference,
		modelRef_array:asArray,
		specialElement:specialElement
	};
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
				break;
			}
		}
	}

	for (var i = childNodes.length - 1; i >= 0; i--) {
		var currentNode = childNodes[i];

		if(excludes[currentNode.nodeName] !== void 0)
			continue;

		if(currentNode.nodeType === 1){ // Tag
			if(enclosedHTMLParse === true)
				continue;

			// Skip nested sf-model
			if(currentNode.tagName === 'SF-M' || currentNode.sf$controlled)
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

			// Skip nested component
			if(internal.component[currentNode.tagName] !== void 0)
				continue;

			for (var a = 0; a < attrs.length; a++) {
				if(attrs[a].name[0] === '@' || attrs[a].value.indexOf('{{') !== -1){
					temp.add(currentNode);
					break;
				}
			}

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

			if(currentNode.nodeValue.indexOf('{{') !== -1){
				if(extracting === void 0){
					if(!temp.has(currentNode.parentNode))
						temp.add(currentNode.parentNode);
					break;
				}

				if(!temp.has(currentNode))
					temp.add(currentNode);
			}
		}
	}

	if(firstCall)
		return Array.from(temp);
}

self.parsePreprocess = function(nodes, model){
	var binded = [];
	for (var a = 0; a < nodes.length; a++) {
		// Get reference for debugging
		var current = processingElement = nodes[a];

		if(internal.modelPending[model] || self.root[model] === undefined)
			self(model);

		var modelRef = self.root[model];

		if(current.nodeType === 3 && binded.indexOf(current.parentNode) === -1){
			self.bindElement(current.parentNode, model);
			binded.push(current.parentNode);
			continue;
		}

		// Double check if the child element already bound to prevent vulnerability
		if(current.innerHTML.indexOf('sf-bind-list') !== -1 && current.tagName !== 'SF-M'){
			console.error("Can't parse element that already bound");
			console.log(current);
			return;
		}

		if(current.hasAttribute('sf-bind-ignore') === false)
			self.bindElement(current, model);
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