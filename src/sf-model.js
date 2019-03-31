// Data save and HTML content binding
sf.model = function(scope){
	if(sf.component.registered[scope] !== undefined)
		return root_(scope);

	if(!sf.model.root[scope])
		sf.model.root[scope] = {};

	if(sf.controller.pending[scope])
		sf.controller.run(scope);

	return sf.model.root[scope];
};

(function(){
	var self = sf.model;
	var scope = internal.model = {};
	var bindingEnabled = false;
	self.root = {};

	var processingElement = null;

	// For debugging, normalize indentation
	function trimIndentation(text){
		var indent = text.split("\n", 3);
		if(indent[0][0] !== ' ' || indent[0][0] !== "\t")
			indent = indent[1];
		else indent = indent[0];

		if(indent === undefined) return text;
		indent = indent.length - indent.trim().length;
		if(indent === 0) return text;
		return text.replace(RegExp('^([\\t ]{'+indent+'})', 'gm'), '');
	}

	// Secured evaluation
	var bracketMatch = RegExp('([\\w.]*?[\\S\\s])\\('+sf.regex.avoidQuotes, 'g');
	var chackValidFunctionCall = sf.regex.validFunctionCall;
	var localEval = function(script, _model_, _modelScope, _content_){
		"use strict";

		// ==== Security check ====
		var tempScript = script;

		// Remove all inner quotes
		tempScript = tempScript.replace(sf.regex.getQuotes, '"Quotes"');

		// Prevent vulnerability by remove bracket to avoid a function call
		var preventExecution = false;
		var check_ = null;
		while((check_ = bracketMatch.exec(tempScript)) !== null){
			check_[1] = check_[1].trim();

			if(allowedFunctionEval.indexOf(check_[1]) === -1 &&
				check_[1].split('.')[0] !== '_modelScope' &&
				chackValidFunctionCall.test(check_[1][check_[1].length-1])
			){
				preventExecution = check_[1];
				break;
			}
		}

		if(preventExecution){
			console.error("Trying to executing unrecognized function ("+preventExecution+")");
			console.log(trimIndentation(processingElement.outerHTML).trim());
			//console.log(tempScript);
			return '#DOMError';
		}
		// ==== Security check ended ====
	
		var _result_ = '';
		try{
			if(/@return /.test(script) === true){
				var _evaled_ = eval('(function(){'+script.split('@return ').join('return ')+'})()');
				return _result_ + _evaled_;
			}
			else var _evaled_ = eval(script);
		} catch(e){
			console.error(e);
			console.log(trimIndentation(processingElement.outerHTML).trim());
			//console.log(tempScript);
			return '#DOMError';
		}

		if(_result_ !== '') return _result_;
		return _evaled_;
	}

	// Find an index for the element on the list
	self.index = function(element){
		var i = -1;
		var tagName = element.tagName;
		var currentElement = element;

		while(element !== null) {
			if(element.tagName === tagName)
				i++;

			element = element.previousElementSibling;
		}

		var list = currentElement.getAttribute('sf-bind-list');
		if(!list) return i;

		var ref = self.root[sf.controller.modelName(currentElement)][list];
		if(!ref.$virtual) return i;

		return i + ref.$virtual.DOMCursor - 1;
	}

	// Declare model for the name with a function
	self.for = function(name, func){
		if(!sf.loader.DOMWasLoaded)
			return sf(function(){
				self.for(name, func);
			});
		
		func(self(name), self);
	}

	// Get property of the model
	self.modelKeys = function(modelRef){
		var keys = Object.keys(modelRef);
		for (var i = keys.length - 1; i >= 0; i--) {
			if(keys[i].indexOf('$') !== -1)
				keys.splice(i, 1);
		}
		return keys;
	}

	// Escape the escaped quote
	function escapeEscapedQuote(text){
		return text.split('\\"').join('\\$%*').split("\\'").join('\\%$*');
	}

	function unescapeEscapedQuote(text){
		return text.split('\\$%*').join('\\"').split('\\%$*').join("\\'");
	}

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

		// Get or evaluate static or dynamic data
		for (var i = 0; i < parse.length; i++) {
			if(atIndex !== undefined && atIndex.indexOf(i) === -1)
				continue;

			var ref = parse[i];
			ref.data[1] = item;

			// Direct evaluation type
			if(ref.type === REF_DIRECT || ref.type === REF_EXEC)
				parsed[i] = {type:ref.type, data:localEval.apply(self.root, ref.data)};

			// Conditional type
			else if(ref.type === REF_IF){
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

					changesReference.push({
						attribute:(refB.name === 'value' ? current : current.attributes[refB.name]),
						ref:refB
					});

					if(refB.direct !== undefined){
						if(refB.name === 'value'){
							current.value = parsed[refB.direct].data;
							current.removeAttribute('value');
							continue;
						}
						current.setAttribute(refB.name, parsed[refB.direct].data);
						continue;
					}

					// Below is used for multiple data
					if(refB.name === 'value'){
						var temp = current.value;
						current.removeAttribute('value');
						current.value = temp;
						refB = current;
					}
					else refB = current.attributes[refB.name];

					refB.value = refB.value.replace(templateParser_regex, function(full, match){
						return parsed[match].data;
					});
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

				if(ref.direct !== undefined){
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
			var tDOM = $.parseElement(parsed[ref.direct].data, true);
			for (var a = 0; a < tDOM.length; a++) {
				ref.parentNode.insertBefore(tDOM[a], ref.dynamicFlag);
			}
		}

		return html;
	}

	function syntheticCache(element, template, item){
		if(element.sf$cache === undefined)
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

		if(property !== undefined){
			var changes = template.modelReference[property];
			if(changes === undefined || changes.length === 0){
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
				if(cache === undefined){
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
			changes = [];
			for (var i = 0; i < parseIndex.length; i++) {
				if(parsed[parseIndex[i]] === undefined){
					changes.push(parseIndex[i]);
				}
			}

			Object.assign(parsed, templateExec(template.parse, item, changes));
			return true;
		}

		var changesReference = element.sf$elementReferences;
		var haveChanges = false;
		for (var i = 0; i < changesReference.length; i++) {
			var cRef = changesReference[i];

			if(cRef.dynamicFlag !== undefined){ // Dynamic data
				if(parsed[cRef.direct] !== undefined){
					var tDOM = $.parseElement(parsed[cRef.direct].data, true).reverse();
					var currentDOM = $.prevAll(cRef.dynamicFlag, cRef.startFlag);
					var notExist = false;

					// Replace if exist, skip if similar
					for (var a = 0; a < tDOM.length; a++) {
						if(currentDOM[a] === undefined){
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
						for (var a = tDOM.length; a < currentDOM.length; a++) {
							currentDOM[a].remove();
						}
					}

					haveChanges = true;
				}
				continue;
			}

			if(cRef.textContent !== undefined){ // Text only
				if(cRef.ref.parse_index !== undefined){ // Multiple
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
				else if(parsed[cRef.ref.direct]){
					var value = parsed[cRef.ref.direct].data;
					if(cRef.textContent.textContent === value) continue;

					var ref_ = cRef.textContent;
					// Remove old element if exist
					if(ref_.sf$haveChilds === true){
						while(ref_.previousSibling && ref_.previousSibling.sf$childRoot === ref_){
							ref_.previousSibling.remove();
						}
					}

					ref_.textContent = value;
					haveChanges = true;
				}
			}
			else if(cRef.attribute !== undefined){ // Attributes
				if(cRef.ref.parse_index !== undefined){ // Multiple
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
				else if(parsed[cRef.ref.direct]){
					var value = parsed[cRef.ref.direct].data;
					if(cRef.attribute.value === value) continue;
					cRef.attribute.value = value;

					haveChanges = true;
				}
			}
		}

		return haveChanges;
	}

	// For contributor of this library
	// Please be careful when you're passing the eval argument
	var dataParser = function(html, _model_, mask, scope, runEval, preParsedReference){
		var _modelScope = self.root[scope];
		if(!runEval) runEval = '';

		// Don't match text inside quote, or object keys
		var scopeMask = RegExp(sf.regex.strictVar+'('+self.modelKeys(_modelScope).join('|')+')\\b', 'g');

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
				temp = temp.split('&amp;').join('&').split('&lt;').join('<').split('&gt;').join('>');

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
			preParsed = _modelScope = _model_ = mask = scope = runEval = scopeMask = itemMask = html = null;
			setTimeout(function(){prepared = null}, 1);
		}
		return prepared;
	}

	// Dynamic data parser
	var uniqueDataParser = function(html, _model_, mask, scope, runEval){
		// Get prepared html content
		var _content_ = {
			length:0,
			take:function(passVar, currentIndex){
				if(passVar === null)
					return dataParser(this[currentIndex], _model_, mask, scope);

				// Use strict mode and prepare for new variables
				var strDeclare = '"use strict";var ';
				var firstTime = true;

				// Declare new variable
				for(var key in passVar){
					if(typeof passVar[key] === 'string')
						passVar[key] = '"'+passVar[key].split('"').join('\\"')+'"';
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
				return dataParser(this[currentIndex], _model_, mask, scope, strDeclare + ';');
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

		var _modelScope = self.root[scope];

		// Don't match text inside quote, or object keys
		var scopeMask = RegExp(sf.regex.strictVar+'('+self.modelKeys(_modelScope).join('|')+')\\b', 'g');

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
			}).split('_model_._modelScope.').join('_model_.');

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
					VarPass[i] += ':(typeof '+VarPass[i]+'!=="undefined"?'+VarPass[i]+':undefined)';
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
					elseIf.data = [null, _model_, _modelScope, _content_];

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
			setTimeout(function(){prepared = null}, 1);
			return [prepared, preParsedReference, _content_];
		}

		return prepared;
	}

	var bindArray = function(template, list, mask, modelName, propertyName, targetNode, parentNode, tempDOM){
		var editProperty = ['pop', 'push', 'splice', 'shift', 'unshift', 'swap', 'move', 'replace', 'softRefresh', 'hardRefresh'];
		var refreshTimer = -1;
		var parentChilds = parentNode.children;
		var isKeyed = parentNode.classList.contains('sf-keyed-list');

		// Update callback
		var modelRef = self.root[modelName];
		var eventVar = 'on$'+propertyName;
		var callback = modelRef[eventVar];

		var processElement = function(index, options, other, count){
			// Find boundary for inserting to virtual DOM
			if(list.$virtual){
				var vStartRange = list.$virtual.DOMCursor;
				var vEndRange = vStartRange + list.$virtual.preparedLength;
			}

			if(options === 'clear'){
				if(list.$virtual)
					var spacer = [parentNode.firstElementChild, parentNode.lastElementChild];

				parentNode.textContent = '';

				if(list.$virtual){
					parentNode.appendChild(spacer[0]);
					parentNode.appendChild(spacer[1]);
					list.$virtual.dom.textContent = '';
					spacer[1].style.height = 
					spacer[0].style.height = 0;
					list.$virtual.reset(true);
				}
				return;
			}

			// Avoid multiple refresh by set a timer
			if(list.$virtual){
				var exist = list.$virtual.elements();

				clearTimeout(refreshTimer);
				refreshTimer = setTimeout(function(){
					list.$virtual.reinitScroll();
				}, 100);
			}
			else exist = parentChilds;

			// Hard refresh - Append element
			if(options === 'hardRefresh'){
				// Clear siblings after the index
				for (var i = index; i < exist.length; i++) {
					exist[i].remove();
				}

				if(list.$virtual)
					var vCursor = list.$virtual.vCursor;

				for (var i = index; i < list.length; i++) {
					var temp = templateParser(template, list[i]);
					if(list.$virtual){
						if(vCursor.floor === null && i < vEndRange)
							parentNode.insertBefore(temp, parentNode.lastElementChild);
						else list.$virtual.dom.appendChild(temp);
					}
					else parentNode.appendChild(temp);

					if(isKeyed === false)
						syntheticCache(temp, template, list[i]);
				}

				if(list.$virtual && list.$virtual.refreshVirtualSpacer)
					list.$virtual.refreshVirtualSpacer(list.$virtual.DOMCursor);
				return;
			}

			if(callback === undefined)
				callback = modelRef[eventVar];

			if(options === 'swap' || options === 'move'){
				if(options === 'move'){
					var overflow = list.length - index - count;
					if(overflow < 0)
						count += overflow;

					// Move to virtual DOM
					var vDOM = document.createElement('div');
					for (var i = 0; i < count; i++) {
						vDOM.appendChild(exist[index + i]);
					}

					var nextSibling = exist[other] || null;
					var theParent = nextSibling && nextSibling.parentNode;

					if(theParent === false){
						if(list.$virtual && list.length >= vEndRange)
							theParent = list.$virtual.dom;
						else theParent = parentNode;
					}

					// Move to defined index
					for (var i = 0; i < count; i++) {
						theParent.insertBefore(vDOM.firstElementChild, nextSibling);

						if(callback !== undefined && callback.update)
							callback.update(exist[index + i], 'move');
					}
					return;
				}

				if(index > other){
					var index_a = exist[other];
					other = exist[index];
					index = index_a;
				} else {
					index = exist[index];
					other = exist[other];
				}

				var other_sibling = other.nextSibling;
				var other_parent = other.parentNode;
	            index.parentNode.insertBefore(other, index.nextSibling);
	            other_parent.insertBefore(index, other_sibling);

				if(callback !== undefined && callback.update){
					callback.update(exist[other], 'swap');
					callback.update(exist[index], 'swap');
				}
				return;
			}

			// Clear unused element if current array < last array
			if(options === 'removeRange'){
				for (var i = index; i < other; i++) {
					exist[i].remove();
				}
				return;
			}

			// Remove
			if(options === 'remove'){
				if(exist[index]){
					var currentRemoved = false;
					var startRemove = function(){
						if(currentRemoved) return;
						currentRemoved = true;

						exist[index].remove();
					}

					if(callback !== undefined && callback.remove){
						// Auto remove if return false
						if(!callback.remove(exist[index], startRemove))
							startRemove();
					}

					// Auto remove if no callback
					else startRemove();
				}
				return;
			}

			// Update
			else if(options === 'update'){
				if(index === undefined){
					index = 0;
					other = list.length;
				}
				else if(other === undefined) other = index + 1;
				else if(other < 0) other = list.length + other;
				else other += index;

				// Trim length
				var overflow = list.length - other;
				if(overflow < 0) other = other + overflow;

				for (var i = index; i < other; i++) {
					var oldChild = exist[i];
					if(oldChild === undefined || list[i] === undefined)
						break;

					var temp = templateParser(template, list[i]);
					if(isKeyed === false)
						syntheticCache(temp, template, list[i]);

					if(list.$virtual){
						oldChild.parentNode.replaceChild(temp, oldChild);
						continue;
					}

					parentNode.replaceChild(temp, oldChild);
					if(callback !== undefined && callback.update)
						callback.update(temp, 'replace');
				}
			}

			var item = list[index];
			if(item === undefined) return;

			var temp = templateParser(template, item);
			if(isKeyed === false)
				syntheticCache(temp, template, item);

			// Create
			if(options === 'insertAfter'){
				if(exist.length === 0)
					parentNode.insertBefore(temp, parentNode.lastElementChild);
				else{
					var referenceNode = exist[index - 1];
					referenceNode.parentNode.insertBefore(temp, referenceNode.nextSibling);
				}

				if(callback !== undefined && callback.create)
					callback.create(temp);
			}
			else if(options === 'prepend'){
				var referenceNode = exist[0];
				if(referenceNode !== undefined){
					referenceNode.parentNode.insertBefore(temp, referenceNode);

					if(callback !== undefined && callback.create)
						callback.create(temp);
				}
				else options = 'append';
			}
			if(options === 'append'){
				if(list.$virtual){
					if(index === 0) // Add before virtual scroller
						parentNode.insertBefore(temp, parentNode.lastElementChild);
					else if(index >= vEndRange){ // To virtual DOM
						if(list.$virtual.vCursor.floor === null)
							list.$virtual.vCursor.floor = temp;

						list.$virtual.dom.appendChild(temp);
					}
					else // To real DOM
						exist[index-1].insertAdjacentElement('afterEnd', temp);

					if(callback !== undefined && callback.create)
						callback.create(temp);
					return;
				}

				parentNode.appendChild(temp);
				if(callback !== undefined && callback.create)
					callback.create(temp);
			}
		}

		var _double_zero = [0,0]; // For arguments
		var propertyProxy = function(subject, name){
			Object.defineProperty(subject, name, {
				enumerable: false,
				configurable: true,
				value: function(){
					var temp = undefined;
					var lastLength = this.length;

					if(name === 'move'){
						var from = arguments[0];
						var to = arguments[1];
						if(from === to) return;
						var count = arguments[2] || 1;
						processElement(from, 'move', to, count);

						var temp = Array.prototype.splice.apply(this, [from, count]);
						temp.unshift(to, 0);
						Array.prototype.splice.apply(this, temp);

						// Reset virtual ceiling and floor
						if(list.$virtual)
							list.$virtual.reinitCursor();
						return;
					}

					if(name === 'swap'){
						var i = arguments[0];
						var o = arguments[1];
						if(i === o) return;
						processElement(i, 'swap', o);
						var temp = this[i];
						this[i] = this[o];
						this[o] = temp;
						return;
					}

					else if(name === 'replace'){
						if(list.$virtual)
							list.$virtual.resetViewport();

						// Check if item has same reference
						if(arguments[0].length >= lastLength && lastLength !== 0){
							var matchLeft = lastLength;
							var ref = arguments[0];

							for (var i = 0; i < lastLength; i++) {
								if(ref[i] === this[i]){
									matchLeft--;
									continue;
								}
								break;
							}

							// Add new element at the end
							if(matchLeft === 0){
								if(ref.length === lastLength) return;

								var temp = arguments[0].slice(lastLength);
								temp.unshift(lastLength, 0);
								this.splice.apply(this, temp);
								return;
							}

							// Add new element at the middle
							else if(matchLeft !== lastLength){
								if(arguments[1] === true){
									var temp = arguments[0].slice(i);
									temp.unshift(i, lastLength - i);
									Array.prototype.splice.apply(this, temp);

									list.refresh(i, lastLength);
								}
								return;
							}
						}

						// Build from zero
						if(lastLength === 0){
							Array.prototype.push.apply(this, arguments[0]);
							processElement(0, 'hardRefresh');
							return;
						}

						// Clear all items and merge the new one
						var temp = [0, lastLength];
						Array.prototype.push.apply(temp, arguments[0]);
						Array.prototype.splice.apply(this, temp);

						// Rebuild all element
						if(arguments[1] !== true || isKeyed){
							processElement(0, 'clear');
							processElement(0, 'hardRefresh');
						}

						// Reuse some element
						else{
							// Clear unused element if current array < last array
							if(this.length < lastLength)
								processElement(this.length, 'removeRange', lastLength);

							// And start refreshing
							list.refresh(0, this.length);

							if(list.$virtual && list.$virtual.refreshVirtualSpacer)
								list.$virtual.refreshVirtualSpacer(list.$virtual.DOMCursor);
						}

						// Reset virtual list
						if(list.$virtual)
							list.$virtual.reset();

						return this;
					}

					else if(name === 'splice' && arguments[0] === 0 && arguments[1] === undefined){
						processElement(0, 'clear');
						return Array.prototype.splice.apply(this, arguments);
					}

					if(Array.prototype[name])
						temp = Array.prototype[name].apply(this, arguments);

					if(name === 'pop')
						processElement(this.length, 'remove');

					else if(name === 'push'){
						if(arguments.length === 1)
							processElement(lastLength, 'append');
						else{
							for (var i = 0; i < arguments.length; i++) {
								processElement(lastLength + i, 'append');
							}
						}
					}

					else if(name === 'shift'){
						processElement(0, 'remove');

						if(list.$virtual && list.$virtual.DOMCursor > 0){
							list.$virtual.DOMCursor--;
							list.$virtual.reinitCursor();
						}
					}

					else if(name === 'splice'){
						if(arguments[0] === 0 && arguments[1] === undefined)
							return temp;

						// Removing data
						var real = arguments[0];
						if(real < 0) real = lastLength + real;

						var limit = arguments[1];
						if(!limit && limit !== 0) limit = this.length;

						for (var i = limit - 1; i >= 0; i--) {
							processElement(real + i, 'remove');
						}

						if(list.$virtual && list.$virtual.DOMCursor >= real)
							list.$virtual.DOMCursor = real - limit;

						if(arguments.length >= 3){ // Inserting data
							limit = arguments.length - 2;

							// Trim the index if more than length
							if(real >= this.length)
								real = this.length - 1;

							for (var i = 0; i < limit; i++) {
								processElement(real + i, 'insertAfter');
							}

							if(list.$virtual && list.$virtual.DOMCursor >= real)
								list.$virtual.DOMCursor += limit;
						}
					}

					else if(name === 'unshift'){
						if(arguments.length === 1)
							processElement(0, 'prepend');
						else{
							for (var i = arguments.length - 1; i >= 0; i--) {
								processElement(i, 'prepend');
							}
						}

						if(list.$virtual && list.$virtual.DOMCursor !== 0){
							list.$virtual.DOMCursor += arguments.length;
							list.$virtual.reinitCursor();
						}
					}

					else if(name === 'softRefresh'){
						processElement(arguments[0], 'update', arguments[1]);

						if(list.$virtual && list.$virtual.DOMCursor)
							list.$virtual.reinitCursor();
					}

					else if(name === 'hardRefresh'){
						processElement(arguments[0] || 0, 'hardRefresh');

						if(list.$virtual)
							list.$virtual.DOMCursor = arguments[0] || 0;
					}

					return temp;
				}
			});
		}

		if(parentNode && parentNode.classList.contains('sf-virtual-list')){
			delete list.$virtual;
			list.$virtual = {};

			// Transfer virtual DOM
			list.$virtual.dom = tempDOM;
			if(callback !== undefined)
				list.$virtual.callback = callback;
			else list.$virtual.callback_ = {ref:modelRef, var:eventVar};

			parentNode.replaceChild(template.html, parentChilds[1]);
			sf.internal.virtual_scroll.handle(list, targetNode, parentNode);
			template.html.remove();
		}

		for (var i = 0; i < editProperty.length; i++) {
			propertyProxy(list, editProperty[i]);
		}

		// Todo: Enable auto item binding
		if(false && list.auto !== false){
			// for (var i = 0; i < list.length; i++) {
			// 	list[i]
			// }
		}

		hiddenProperty(list, '$replace', function(index, key, needle, func){
			var elRef = list.getElement(index).sf$elementReferences;
			var process = template.modelReference[key];
			if(process === undefined){
				console.error("Can't found binding for '"+key+"'");
				return;
			}

			for (var i = 0; i < elRef.length; i++) {
				if(elRef[i].textContent === undefined || elRef[i].ref.direct === undefined)
					continue;

				if(process.indexOf(elRef[i].ref.direct) !== -1){
					var ref = elRef[i].textContent;
					var content = $.escapeText(list[index][key]).replace(needle, func);

					// Skip if nothing was changed
					if(list[index][key] === content) continue;
					ref.textContent = ''; // Let this empty for later referencing
					ref.sf$haveChilds = true;
					content = $.parseElement(content, true);

					// Remove old element if exist
					while(ref.previousSibling && ref.previousSibling.sf$childRoot === ref){
						ref.previousSibling.remove();
					}

					var parentNode_ = ref.parentNode;
					for (var i = 0; i < content.length; i++) {
						content[i].sf$childRoot = ref;
						parentNode_.insertBefore(content[i], ref);
					}
				}
			}
		});

		hiddenProperty(list, 'refresh', function(index, length, property){
			if(index === undefined || index.constructor === String){
				property = index;
				index = 0;
				length = list.length;
			}
			else if(length === undefined) length = index + 1;
			else if(length.constructor === String){
				property = length;
				length = index + 1;
			}
			else if(length < 0) length = list.length + length;
			else length += index;

			// Trim length
			var overflow = list.length - length;
			if(overflow < 0) length = length + overflow;

			for (var i = index; i < length; i++) {
				var elem = list.getElement(i);

				// Create element if not exist
				if(elem === undefined){
					list.hardRefresh(i);
					break;
				}
				else{
					if(isKeyed === true)
						list.softRefresh(i);
					else if(syntheticTemplate(elem, template, property, list[i]) === false)
						continue; // Continue if no update
				}

				if(callback !== undefined && callback.update)
					callback.update(elem, 'replace');
			}
		});

		var virtualChilds = null;
		if(list.$virtual)
			virtualChilds = list.$virtual.dom.children;
		hiddenProperty(list, 'getElement', function(index){
			if(virtualChilds !== null){
				var ret = undefined;
				if(index < list.$virtual.DOMCursor)
					return virtualChilds[index];
				else {
					index -= list.$virtual.DOMCursor;
					var childElement = parentNode.childElementCount - 2;

					if(index < childElement)
						return parentChilds[index + 1];
					else
						return virtualChilds[index - childElement + list.$virtual.DOMCursor];
				}

				return undefined;
			}

			return parentChilds[index];
		});
	}

	var loopParser = function(name, template, script, targetNode, parentNode){
		var method = script.split(' in ');
		var mask = method[0];
		var isKeyed = parentNode.classList.contains('sf-keyed-list');

		var items = root_(name)[method[1]];
		if(items === undefined)
			items = root_(name)[method[1]] = [];

		template.setAttribute('sf-bind-list', method[1]);

		// Get reference for debugging
		processingElement = template;
		template = self.extractPreprocess(template, mask, name);

		if(method.length === 2){
			var tempDOM = document.createElement('div');
			var modelRef = self.root[name];

			for (var i = 0; i < items.length; i++) {
				var elem = templateParser(template, items[i]);
				tempDOM.appendChild(elem);

				if(isKeyed === false)
					syntheticCache(elem, template, items[i]);
			}

			// Enable element binding
			if(modelRef.sf$bindedKey === undefined)
				initBindingInformation(modelRef);

			if(modelRef.sf$bindedKey[method[1]] === undefined)
				modelRef.sf$bindedKey[method[1]] = null;

			Object.defineProperty(modelRef, method[1], {
				enumerable: true,
				configurable: true,
				get:function(){
					return items;
				},
				set:function(val){
					if(val.length === 0)
						return items.splice(0);
					return items.replace(val, true);
				}
			});

			bindArray(template, items, mask, name, method[1], targetNode, parentNode, tempDOM);

			// Output to real DOM if not being used for virtual list
			if(items.$virtual === undefined){
				var children = tempDOM.children;
				for (var i = 0, n = children.length; i < n; i++) {
					parentNode.appendChild(children[0]);
				}

				tempDOM.remove();
				tempDOM = null;
			}
		}
	}

	var callInputListener = function(model, property, newValue){
		var callback = model['on$'+property];
		var v2m = model['v2m$'+property];
		var pause = false;
		if(callback !== undefined || v2m !== undefined){
			var assigner = Object.getOwnPropertyDescriptor(model, property);
			assigner = assigner.get !== undefined ? assigner.get(true) : undefined;

			var old = model[property];
			if(old !== null && old !== undefined && old.constructor === Array)
				old = old.slice(0);

			if(callback !== undefined)
				pause = Boolean(callback(old, newValue, assigner));

			if(v2m !== undefined)
				pause = Boolean(v2m(old, newValue, assigner));
		}
		return pause;
	}

	var inputBoundRunning = false;
	var inputTextBound = function(e){
		if(e.fromSFFramework === true) return;

		inputBoundRunning = true;
		var ref = e.target;
		var value = ref.typeData === Number ? Number(ref.value) : ref.value;
		if(callInputListener(ref.sfModel, ref.sfBounded, value) === true)
			return;

		ref.sfModel[ref.sfBounded] = value;
	}
	var inputFilesBound = function(e){
		if(e.fromSFFramework === true) return;
		
		var ref = e.target;
		callInputListener(ref.sfModel, ref.sfBounded, ref.files);
		ref.sfModel[ref.sfBounded] = ref.files;
	}

	var inputCheckBoxBound = function(e){
		if(e.fromSFFramework === true) return;
		
		inputBoundRunning = true;
		var ref = e.target;
		var value = ref.typeData === Number ? Number(ref.value) : ref.value;
		if(callInputListener(ref.sfModel, ref.sfBounded, value) === true)
			return;

		var model = ref.sfModel;
		var constructor = model[ref.sfBounded];

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
		
		inputBoundRunning = true;
		var ref = e.target;
		var typeData = ref.typeData;
		if(ref.multiple === true){
			var temp = ref.selectedOptions;
			var value = [];
			for (var i = 0; i < temp.length; i++) {
				value.push(typeData === Number ? Number(temp[i].value) : temp[i].value);
			}
		}
		else value = typeData === Number ? Number(ref.selectedOptions[0].value) : ref.selectedOptions[0].value;

		if(callInputListener(ref.sfModel, ref.sfBounded, value) === true)
			return;

		ref.sfModel[ref.sfBounded] = value;
	}

	var assignElementData = {
		select:function(model, property, element){
			var list = element.options;
			var typeData = element.typeData;
			var arrayValue = model[property].constructor === Array ? model[property] : false;
			for (var i = 0, n = list.length; i < n; i++) {
				if(arrayValue === false){
					if(typeData === String)
						list[i].selected = list[i].value === model[property];
					else list[i].selected = list[i].value == model[property];
				}
				else list[i].selected = arrayValue.indexOf(typeData === Number ? Number(list[i].value) : list[i].value) !== -1;
			}
		},
		checkbox:function(model, property, element){
			if(model[property].constructor === Array)
				element.checked = model[property].indexOf(element.typeData === Number ? Number(element.value) : element.value) !== -1;
			else if(model[property].constructor === Boolean)
				element.checked = Boolean(model[property]);
			else{
				if(element.typeData === String)
					element.checked = element.value === model[property];
				else element.checked = element.value == model[property];
			}
		}
	}

	var inputBoundRun = function(model, property, elements){
		if(inputBoundRunning === true)
			return; // Avoid multiple assigment

		for (var i = 0; i < elements.length; i++) {
			var ev = new Event('change');
			ev.fromSFFramework = true;

			if(elements.type === 1) // text
				elements[i].value = model[property];
			else if(elements.type === 2) // select options
				assignElementData.select(model, property, elements[i]);
			else if(elements.type === 3) // radio
				elements[i].checked = model[property] == elements[i].value;
			else if(elements.type === 4) // checkbox
				assignElementData.checkbox(model, property, elements[i]);

			elements[i].dispatchEvent(ev);
		}
	}

	var elementBoundChanges = function(model, property, element, oneWay){
		// Enable multiple element binding
		if(model.sf$bindedKey === undefined)
			initBindingInformation(model);

		var type = 0;
		var typeData = null;
		if(model[property] !== null && model[property] !== undefined)
			typeData = model[property].constructor;

		var assignedType = (element.getAttribute('typedata') || '').toLowerCase();
		if(assignedType === 'number')
			typeData = Number;

		// Bound value change
		if(element.tagName === 'TEXTAREA'){
			$.on(element, 'keyup', inputTextBound);
			element.value = model[property];
			type = 1;
		}

		else if(element.selectedOptions !== undefined){
			$.on(element, 'change', inputSelectBound);
			type = 2;

			assignElementData.select(model, property, element);
		}

		else{
			var type = element.type.toLowerCase();
			if(type === 'radio'){
				$.on(element, 'change', inputTextBound);
				type = 3;

				element.checked = model[property] == element.value;
			}
			else if(type === 'checkbox'){
				$.on(element, 'change', inputCheckBoxBound);
				type = 4;

				assignElementData.checkbox(model, property, element);
			}

			else if(type === 'file'){
				$.on(element, 'change', inputFilesBound);
				return;
			}

			else{
				if(type === 'range')
					$.on(element, 'change', inputTextBound);
				else $.on(element, 'keyup', inputTextBound);
				element.value = model[property];
				type = 1;
			}
		}

		if(oneWay === true) return;
		modelToViewBinding(model, property, inputBoundRun, element, type, typeData);
	}

	var bindInput = function(targetNode){
		var temp = $('input[sf-bound], textarea[sf-bound], select[sf-bound], input[sf-bind], textarea[sf-bind], select[sf-bind]', targetNode);

		for (var i = 0; i < temp.length; i++) {
			var element = temp[i];
			var model = sf.controller.modelName(element);
			if(!model) return;
			var modelScope = self.root[model];

			var oneWay = false;
			var propertyName = element.getAttribute('sf-bound');
			if(propertyName === null){
				propertyName = element.getAttribute('sf-bind');
				oneWay = true;
			}
			if(propertyName === "")
				propertyName = element.getAttribute('name');

			if(propertyName === null){
				console.error("Property key to be bound wasn't be found", element);
				continue;
			}

			// Get reference
			if(modelScope[propertyName] === undefined){
				console.error('Can\'t get property "'+propertyName+'" on model "' + model + '"');
				return;
			}

			element.sfBounded = propertyName;
			element.sfModel = modelScope;
			if(oneWay === false){
				element.setAttribute('sf-bounded', '');
				element.removeAttribute('sf-bound');
			}
			else{
				element.setAttribute('sf-binded', '');
				element.removeAttribute('sf-bind');
			}

			elementBoundChanges(modelScope, propertyName, element, oneWay);
		}
	}

	var alreadyInitialized = false;
	self.init = function(targetNode, queued){
		if(alreadyInitialized && !targetNode) return;
		alreadyInitialized = true;
		setTimeout(function(){
			alreadyInitialized = false;
		}, 50);

		if(!targetNode) targetNode = document.body;

		self.parsePreprocess(queued || self.queuePreprocess(targetNode), queued);
		bindInput(targetNode);

		// Find element for array binding
		var temp = $('[sf-repeat-this]', targetNode);
		for (var a = 0; a < temp.length; a++) {
			var element = temp[a];
			var parent = element.parentElement;

			if(queued !== undefined)
				element.classList.remove('sf-dom-queued');

			if(parent.classList.contains('sf-virtual-list')){
				var ceiling = document.createElement(element.tagName);
				ceiling.classList.add('virtual-spacer');
				var floor = ceiling.cloneNode(true);

				ceiling.classList.add('ceiling');
				parent.insertBefore(ceiling, parent.firstElementChild); // prepend

				floor.classList.add('floor');
				parent.appendChild(floor); // append
			}

			var after = element.nextElementSibling;
			if(after === null || element === after)
				after = false;

			var before = element.previousElementSibling;
			if(before === null || element === before)
				before = false;

			var script = element.getAttribute('sf-repeat-this');
			element.removeAttribute('sf-repeat-this');

			// Check if the element was already bound to prevent vulnerability
			if(/sf-bind-key|sf-bind-list/.test(element.outerHTML))
				throw "Can't parse element that already bound";

			var controller = sf.controller.modelName(element);
			loopParser(controller, element, script, targetNode, parent);
			element.remove();
		}
	}

	// Reset model properties
	// Don't call if the removed element is TEXT or #comment
	var DOMNodeRemoved = scope.DOMNodeRemoved = function(element){
		if(element.hasAttribute('sf-controller') !== false){
			var modelName = element.getAttribute('sf-controller');

			removeModelBinding(modelName);
			if(element.sf$component !== undefined){
				var modelFrom = element.sf$componentFrom;
				var components = sf.component.available[modelFrom];
				components.splice(components.indexOf(modelName), 1);
				internal.component.triggerEvent(modelFrom, 'removed', self.root[modelName]);
				delete self.root[modelName];
			}
			return;
		}

		var temp = $('[sf-controller]', element);
		for (var i = 0; i < temp.length; i++) {
			var modelName = temp[i].getAttribute('sf-controller');

			removeModelBinding(modelName);
			if(element.sf$component !== undefined){
				modelName = element.sf$componentFor;
				var modelFrom = element.sf$componentFrom;
				var components = sf.component.available[modelName];
				components.splice(components.indexOf(modelName), 1);
				internal.component.triggerEvent(modelFrom, 'removed', self.root[modelName]);
				delete self.root[modelName];
			}
		}
	}

	sf(function(){
		var everyRemovedNodes = function(nodes){
			if(nodes.nodeType !== 1 || nodes.firstElementChild === null)
				return;

			if(nodes.sf$elementReferences !== undefined) return;
			DOMNodeRemoved(nodes);
		}

		if(typeof MutationObserver === 'function' && MutationObserver.prototype.observe){
			var everyRecords = function(record){
				record.removedNodes.forEach(everyRemovedNodes);
			}

			var observer = new MutationObserver(function(records){
				if(!bindingEnabled) return;
				records.forEach(everyRecords);
			});

			observer.observe(document.body, { childList: true, subtree: true });
		}
		else {
			document.body.addEventListener('DOMNodeRemoved', function(e){
				if(!bindingEnabled) return;
				everyRemovedNodes(e.target);
			});
		}
	});

	var removeModelBinding = self.reset = function(modelName){
		var ref = self.root[modelName];
		if(ref === undefined)
			return;

		var bindedKey = ref.sf$bindedKey;
		var temp = null;
		for(var key in bindedKey){
			delete bindedKey[key];

			if(ref[key] === undefined || ref[key] === null)
				continue;

			if(ref[key].constructor === String ||
				ref[key].constructor === Number ||
				ref[key].constructor === Boolean
			){/* Ok */}

			else if(ref[key].constructor === Array){
				if(ref[key].$virtual){
					ref[key].$virtual.destroy();
					delete ref[key].$virtual;
				}

				// Reset property without copying the array
				temp = ref[key].splice('obtain');
				delete ref[key];
				ref[key] = temp;
			}
			else continue;

			if(Object.getOwnPropertyDescriptor(ref, key) === undefined)
				continue;

			// Reconfigure / Remove property descriptor
			var temp = ref[key];
			delete ref[key];
			ref[key] = temp;
		}
	}

	function modelToViewBinding(model, propertyName, callback, elementBind, type, typeData){
		// Enable multiple element binding
		if(model.sf$bindedKey === undefined)
			initBindingInformation(model);

		if(elementBind !== undefined)
			elementBind.typeData = typeData;

		if(model.sf$bindedKey[propertyName] !== undefined){
			var ref = model.sf$bindedKey[propertyName];
			if(ref.indexOf(callback) === -1)
				ref.push(callback);

			if(elementBind !== undefined){
				if(ref.input === undefined){
					ref.input = [elementBind];
					ref.input.type = type;
				}
				else ref.input.push(elementBind);
			}
			return;
		}

		model.sf$bindedKey[propertyName] = [callback];

		if(elementBind !== undefined){
			var ref = model.sf$bindedKey[propertyName];
			ref.input = [elementBind];
			ref.input.type = type;
		}

		// Proxy property
		if(Object.getOwnPropertyDescriptor(model, propertyName).set !== undefined)
			return;

		var assigner = function(val){
			objValue = val;

			var ref = model.sf$bindedKey[propertyName];
			for (var i = 0; i < ref.length; i++) {
				if(inputBoundRun === ref[i]){
					ref[i](model, propertyName, ref.input);
					continue;
				}
				ref[i]();
			}
		}

		var objValue = model[propertyName]; // Object value
		Object.defineProperty(model, propertyName, {
			enumerable: true,
			configurable: true,
			get:function(getAssigner){
				if(getAssigner === true)
					return assigner;
				return objValue;
			},
			set:function(val){
				var callback = inputBoundRunning === false ? model['on$'+propertyName] : undefined;
				var m2v = model['m2v$'+propertyName];
				if(callback !== undefined || m2v !== undefined){
					var pause = false;
					if(callback !== undefined)
						pause = Boolean(callback(objValue, val, assigner));

					if(m2v !== undefined)
						pause = Boolean(m2v(objValue, val, assigner));

					if(pause === true)
						return objValue;
				}

				objValue = val;

				var ref = model.sf$bindedKey[propertyName];
				for (var i = 0; i < ref.length; i++) {
					if(inputBoundRun === ref[i]){
						if(inputBoundRunning !== true) // Avoid multiple assigment
							ref[i](model, propertyName, ref.input);
						continue;
					}
					ref[i]();
				}

				inputBoundRunning = false;
				return objValue;
			}
		});
	}

	var dcBracket = /{{[^#][\s\S]*?}}/;
	self.bindElement = function(element){
		var modelName = sf.controller.modelName(element);
		var model = self.root[modelName];
		if(!model) return console.error("Model for "+modelName+" was not found while binding:", element);

		var data = self.extractPreprocess(element, null, modelName);
		templateParser(data, model, true);
		delete data.addresses;
		element.parentNode.replaceChild(data.html, element);
		element = data.html;

		var onChanges = function(){
			if(syntheticTemplate(element, data, undefined, model) === false)
				0; //No update
		};

		var properties = data.modelRef_array;
		for (var i = 0; i < properties.length; i++) {
			var propertyName = properties[i][0];

			if(model[propertyName] === undefined)
				model[propertyName] = '';

			modelToViewBinding(model, propertyName, onChanges);
		}
	}

	self.extractPreprocess = function(targetNode, mask, name){
		var copy = targetNode.outerHTML;

		// Mask the referenced item
		if(mask !== null)
			copy = copy.split('#'+mask).join('_model_');

		// Extract data to be parsed
		copy = uniqueDataParser(copy, null, mask, name, '#noEval');
		var preParsed = copy[1];
		var _content_ = copy[2];
		copy = dataParser(copy[0], null, mask, name, '#noEval', preParsed);

		function findModelProperty(){
			if(mask === null){
				// Get model keys and sort by text length, make sure the longer one is from first index to avoid wrong match
				var extract = RegExp('('+self.modelKeys(self.root[name]).sort(function(a, b){
					return b.length - a.length
				}).join('|')+')', 'g');
			}
			else
				var extract = RegExp('\\b(?:_model_|'+mask+')\\.([a-zA-Z0-9.[\'\\]]+)(?:$|[^\'\\]])', 'g');
			var found = {};

			for (var i = 0; i < preParsed.length; i++) {
				var current = preParsed[i];

				// Text or attribute
				if(current.type === 0){
					current.data[0].split('"').join("'").replace(extract, function(full, match){
						match = match.replace(/\['(.*?)'\]/g, function(full_, match_){
							return '.'+match_;
						});

						if(found[match] === undefined) found[match] = [i];
						else if(found[match].indexOf(i) === -1)
							found[match].push(i);
					});
					continue;
				}

				// Dynamic data
				if(current.type === 1){
					var checkList = current.if.join(';');

					if(current.elseValue !== null)
						checkList += ';' + current.elseValue;

					for (var a = 0; a < current.elseIf.length; a++) {
						checkList += current.elseIf[a].join(';');
					}
				}
				else if(current.type === 2)
					var checkList = current.data[0];

				checkList = checkList.replace(/_result_ \+= _content_\.take\(.*?, ([0-9]+)\);/g, function(full, match){
					return _content_[match];
				});

				checkList.split('"').join("'").replace(extract, function(full, match){
					match = match.replace(/\['(.*?)'\]/g, function(full_, match_){
						return '.'+match_;
					});

					if(found[match] === undefined) found[match] = [i];
					else if(found[match].indexOf(i) === -1)
						found[match].push(i);
				});
			}

			return found;
		}

		// Build element and start addressing
		copy = $.parseElement(copy)[0];
		var nodes = self.queuePreprocess(copy, true).reverse();
		var addressed = [];

		function addressAttributes(currentNode){
			var attrs = currentNode.attributes;
			var keys = [];
			var indexes = 0;
			for (var a = 0; a < attrs.length; a++) {
				var found = attrs[a].value.split('{{%=');
				if(found.length !== 1){
					if(attrs[a].name[0] === ':'){
						var key = {
							name:attrs[a].name.split(':').join(''),
							value:attrs[a].value
						};
						currentNode.removeAttribute(attrs[a].name);
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

		return {
			html:copy,
			parse:preParsed,
			addresses:addressed,
			modelReference:modelReference,
			modelRef_array:asArray
		};
	}

	var enclosedHTMLParse = false;
	var excludes = ['HTML','HEAD','STYLE','LINK','META','SCRIPT','OBJECT','IFRAME'];
	self.queuePreprocess = function(targetNode, extracting){
		var childNodes = (targetNode || document.body).childNodes;

		var temp = [];
		for (var i = childNodes.length - 1; i >= 0; i--) {
			var currentNode = childNodes[i];

			if(extracting === undefined && excludes.indexOf(currentNode.nodeName) !== -1)
				continue;

			if(currentNode.nodeType === 1){ // Tag
				if(enclosedHTMLParse === true) continue;
				var attrs = currentNode.attributes;

				// Skip element and it's childs that already bound to prevent vulnerability
				if(attrs['sf-bind-key'] || attrs['sf-repeat-this'] || attrs['sf-bind-list']) continue;

				for (var a = 0; a < attrs.length; a++) {
					if(attrs[a].value.indexOf('{{') !== -1){
						temp.push(currentNode);
						break;
					}
				}

				Array.prototype.push.apply(temp, self.queuePreprocess(currentNode, extracting));
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
					if(extracting === undefined){
						temp.push(currentNode.parentNode);
						break;
					}

					temp.push(currentNode);
				}
			}
		}

		return temp;
	}

	self.parsePreprocess = function(nodes, queued){
		for (var a = 0; a < nodes.length; a++) {
			// Get reference for debugging
			var current = processingElement = nodes[a];

			var modelElement = sf.controller.modelElement(current);
			if(modelElement === null)
				continue;

			var model = modelElement.getAttribute('sf-controller');

			if(queued !== undefined)
				current.classList.remove('sf-dom-queued');

			// Check if it's component
			if(self.root[model] === undefined && sf.component.registered[model])
				model = sf.component.new(model, modelElement);

			var modelRef = self.root[model] || root_(model);

			// Double check if the child element already bound to prevent vulnerability
			if(/sf-bind-key|sf-bind-list/.test(current.innerHTML)){
				console.error("Can't parse element that already bound");
				console.log(processingElement.cloneNode(true));
				return;
			}

			if(current.hasAttribute('sf-bind-ignore') === false)
				self.bindElement(current);
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
		if(modelRef.sf$bindedKey !== undefined)
			return;

		// Element binding data
		Object.defineProperty(modelRef, 'sf$bindedKey', {
			configurable: true,
			enumerable:false,
			writable:true,
			value:{}
		});
	}
})();