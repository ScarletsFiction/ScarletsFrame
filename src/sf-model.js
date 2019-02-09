// Data save and HTML content binding
sf.model = function(scope){
	if(!sf.model.root[scope])
		sf.model.root[scope] = {};

	if(sf.controller.pending[scope])
		sf.controller.run(scope);

	return sf.model.root[scope];
};

(function(){
	var self = sf.model;
	var bindingEnabled = false;
	self.root = {};

	var processingElement = null;

	function trimIndentation(text){
		var indent = text.split("\n", 3);
		if(indent[0][0] !== ' ' || indent[0][0] !== "\t")
			indent = indent[1];
		else indent = indent[0];

		indent = indent.length - indent.trim().length;
		if(indent === 0) return text;
		return text.replace(RegExp('^([\\t ]{'+indent+'})', 'gm'), '');
	}

	var bracketMatch = RegExp('([\\w.]*?[\\S\\s])\\('+sf.regex.avoidQuotes, 'g');
	var chackValidFunctionCall = /[a-zA-Z0-9 \]\$\)]/;
	var allowedFunction = [':', 'for', 'if', 'while', '_content_.take', 'console.log'];
	var localEval = function(script, _model_, _modelScope, _content_){
		"use strict";

		// ==== Security check ====
		var tempScript = script;

		// Remove quotes
		tempScript = tempScript.replace(sf.regex.getQuotes, '"Quotes"');

		// Prevent vulnerability by remove bracket to avoid a function call
		var preventExecution = false;
		var check_ = null;
		while((check_ = bracketMatch.exec(tempScript)) !== null){
			check_[1] = check_[1].trim();

			if(allowedFunction.indexOf(check_[1]) === -1 &&
				check_[1].split('.')[0] !== '_modelScope' &&
				chackValidFunctionCall.test(check_[1][check_[1].length-1])
			){
				preventExecution = check_[1];
				break;
			}
		}

		if(preventExecution){
			console.error("Trying to executing unrecognized function ("+preventExecution+")");
			console.log(trimIndentation(processingElement.innerHTML));
			//console.log(tempScript.replace(/_result_ \+=.*?;/g, '{[ DOM ]}'));
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
			console.log(trimIndentation(processingElement.innerHTML));
			//console.log(tempScript.replace(/_result_ \+=.*?;/g, '{[ DOM ]}'));
			return '#DOMError';
		}

		if(_result_ !== '') return _result_;
		return _evaled_;
	}

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

		var ref = sf.model.root[sf.controller.modelName(currentElement)][list];
		if(!ref.$virtual) return i;

		return i + ref.$virtual.DOMCursor - 1;
	}

	self.for = function(name, func){
		if(!sf.loader.DOMWasLoaded)
			return sf(function(){
				self.for(name, func);
			});
		
		func(self(name), self);
	}

	self.modelKeys = function(modelRef){
		var keys = Object.keys(modelRef);
		for (var i = keys.length - 1; i >= 0; i--) {
			if(keys[i].indexOf('$') !== -1)
				keys.splice(i, 1);
		}
		return keys.join('|');
	}

	function escapeEscapedQuote(text){
		return text.split('\\"').join('\\$%*').split("\\'").join('\\%$*');
	}

	function unescapeEscapedQuote(text){
		return text.split('\\$%*').join('\\"').split('\\%$*').join("\\'");
	}

	var preparedParser_regex = /{{%=([0-9]+)/gm;
	var REF_DIRECT = 0, REF_IF = 1, REF_EXEC = 2;
	var preparedParser = function(template, item){
		var html = template.html.cloneNode(true);
		var addresses = template.addresses;
		var parse = template.parse;
		var parsed = {};

		for (var i = 0; i < parse.length; i++) {
			var ref = parse[i];
			ref.data[1] = item;

			if(ref.type === REF_DIRECT || ref.type === REF_EXEC)
				parsed[i] = {type:ref.type, data:localEval.apply(self.root, ref.data)};

			else if(ref.type === REF_IF){
				var check = ref.data[0].split(':');
				var scopes = ref.data.slice(0);
				scopes[0] = check[0];

				var condition = localEval.apply(self.root, scopes);

				// If condition was not meet
				if(condition === false)
					condition = '';
				else {
					check.shift();
					scopes.splice(0, 1, check.join(':').split('&VarPass&').join('{}'));
					condition = localEval.apply(self.root, scopes);
				}

				parsed[i] = {type:ref.type, data:condition};
			}
		}

		for (var i = 0; i < addresses.length; i++) {
			var ref = addresses[i];
			var current = $.childIndexes(ref.address, html);

			// Modify element attributes
			if(ref.nodeType === 1){
				var refA = ref.attributes;
				for (var a = 0; a < refA.length; a++) {
					var refB = refA[a];
					if(refB.direct !== false){
						current.attributes[refB.name].value = parsed[refB.direct].data;
						continue;
					}

					// Below is used for multiple data
					refB = current.attributes[refB.name];
					refB.value = refB.value.replace(preparedParser_regex, function(full, match){
						return parsed[match].data;
					});
				}
				continue;
			}

			// Replace text node
			if(ref.nodeType === 3){
				var refA = current;
				if(ref.direct !== false){
					refA.textContent = parsed[ref.direct].data;
					continue;
				}

				// Below is used for multiple/dynamic data
				var haveDynamicData = false;
				refA.textContent = refA.textContent.replace(preparedParser_regex, function(full, match){
					var replacement = parsed[match];

					// Not text only type
					if(haveDynamicData === false && replacement.type !== 3)
						haveDynamicData = true;

					// Create new node
					if(haveDynamicData){
						if(replacement.type === 1){ // as Element from text
							var tDOM = $.parseElement(replacement.data, true);
							var parentNode = current.parentNode;
							for (var a = 0; a < tDOM.length; a++) {
								parentNode.insertBefore(tDOM[a], current.nextSibling);
								current = tDOM[a];
							}
						}
						else{ // as Text node
							var tDOM = document.createTextNode(replacement.data);
							current.parentNode.insertBefore(tDOM, current.nextSibling);
						}

						current = tDOM;
						return '';
					}

					return replacement.data;
				}).trim();
				continue;
			}
		}

		return html;
	}

	// For contributor of this library
	// Please be careful when you're passing the eval argument
	var dataParser = function(html, _model_, mask, scope, runEval, preParsedReference){
		var _modelScope = self.root[scope];
		if(!runEval) runEval = '';
		
		// Unmatch any function
		var variableList = self.modelKeys(_modelScope);
		for(var i = variableList.length - 1; i >= 0; i--){
			if(_modelScope[variableList[i]] instanceof Function)
				variableList.splice(i, 1);
		}

		// Don't match text inside quote, or object keys
		var scopeMask = RegExp(sf.regex.strictVar+'('+variableList+')'+sf.regex.avoidQuotes+'\\b', 'g');

		if(mask)
			var itemMask = RegExp(sf.regex.strictVar+mask+'\\.'+sf.regex.avoidQuotes+'\\b', 'g');

		bindingEnabled = true;

		if(runEval === '#noEval')
			var preParsed = [];

		var prepared = html.replace(/{{([^@][\s\S]*?)}}/g, function(actual, temp){
			// ToDo: The regex should be optimized to avoid match in a quote (but not escaped quote)
			temp = escapeEscapedQuote(temp); // ToDo: Escape

			// Mask item variable
			if(mask)
				temp = temp.replace(itemMask, function(matched){
					return '_model_.'+matched[0].slice(1);
				});

			// Mask model for variable
			temp = temp.replace(scopeMask, function(full, matched){
				return '_modelScope.'+matched;
			});

			temp = unescapeEscapedQuote(temp); // ToDo: Unescape

			// Evaluate
			if(runEval === '#noEval'){
				temp = temp.trim();

				// Simplicity similar
				var exist = preParsed.indexOf(temp);

				if(exist === -1){
					preParsed.push(temp);
					preParsedReference.push({type:REF_DIRECT, data:[temp, _model_, _modelScope]});
					return '{{%=' + (preParsedReference.length - 1);
				}
				return '{{%=' + (exist + preParsedReference.length - 1);
			}

			temp = '' + localEval.apply(self.root, [runEval + temp, _model_, _modelScope]);

			return temp.replace(/(?!&#.*?;)[\u00A0-\u9999<>\&]/gm, function(i) {
		        return '&#'+i.charCodeAt(0)+';';
		    });
		});

		if(runEval === '#noEval'){
			// Clear memory before return
			preParsed = variableList = _modelScope = _model_ = mask = scope = runEval = scopeMask = itemMask = html = null;
			setTimeout(function(){prepared = null}, 1);
		}
		return prepared;
	}

	var uniqueDataParser = function(html, _model_, mask, scope, runEval){
		// Get prepared html content
		var _content_ = {
			length:0,
			take:function(passVar, currentIndex){
				if(!passVar)
					return dataParser(this[currentIndex], _model_, mask, scope);

				var strDeclare = '"use strict";var ';
				var firstTime = true;

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

				return dataParser(this[currentIndex], _model_, mask, scope, strDeclare + ';');
			}
		};

		html = html.replace(/{\[([\s\S]*?)\]}/g, function(full, matched){
			if(/{{.*?}}/.test(matched) === false)
				return "_result_ += '"+matched.split("'").join("\\'")+"'";

			_content_[_content_.length] = matched;
			_content_.length++;
			return '_result_ += _content_.take(&VarPass&, '+(_content_.length - 1)+');';
		});

		var _modelScope = self.root[scope];

		// Don't match text inside quote, or object keys
		var scopeMask = RegExp(sf.regex.strictVar+'('+self.modelKeys(_modelScope)+')'+sf.regex.avoidQuotes+'\\b', 'g');

		if(mask)
			var itemMask = RegExp(sf.regex.strictVar+mask+'\\.'+sf.regex.avoidQuotes+'\\b', 'g');

		if(runEval === '#noEval')
			var preParsedReference = [];

		var prepared = html.replace(/{{(@[\s\S]*?)}}/g, function(actual, temp){
			// ToDo: The regex should be optimized to avoid match in a quote (but not escaped quote)
			temp = escapeEscapedQuote(temp); // ToDo: Escape

			// Mask item variable
			if(mask)
				temp = temp.replace(itemMask, function(matched){
					return '_model_.'+matched[0].slice(1);
				});

			// Mask model for variable
			temp = temp.replace(scopeMask, function(full, matched){
				return '_modelScope.'+matched;
			});
			temp = unescapeEscapedQuote(temp); // ToDo: Unescape

			var result = '';
			var check = false;

			check = temp.split('@if ');
			if(check.length !== 1){
				if(runEval === '#noEval'){
					preParsedReference.push({
						type:REF_IF,
						data:[check[1], _model_, _modelScope, _content_]
					});
					return '{{%=' + (preParsedReference.length - 1);
				}

				check = check[1].split(':');
				var scopes = [check[0], _model_, _modelScope, _content_];
			
				// If condition was not meet
				if(localEval.apply(self.root, scopes) == false)
					return '';

				check.shift();
				scopes.splice(0, 1, check.join(':').split('&VarPass&').join('{}'));

				return localEval.apply(self.root, scopes);
			}

			// Get defined variables
			var VarPass_ = /(var|let)([\w,\s]+)(?=\s(?==|in|of))/g;
			var VarPass = [];
			var s1 = null;
			while((s1 = VarPass_.exec(temp)) !== null){
				VarPass.push(s1[2]);
			}
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
				VarPass = '{'+VarPass.join(',')+'}';
				temp = temp.split('&VarPass&').join(VarPass);
			}
			temp = temp.split('&VarPass&').join('{}'); 

			// Warning! Avoid unencoded user inputted content
			// And always check/remove closing ']}' in user content
			// Any function call will be removed for addional security
			check = temp.split('@exec');
			if(check.length !== 1){
				check = check[1].split('&lt;').join('<').split('&gt;').join('>').split('&amp;').join('&');

				var scopes = [check, _model_, _modelScope, _content_];

				if(runEval === '#noEval'){
					preParsedReference.push({type:REF_EXEC, data:scopes});
					return '{{%=' + (preParsedReference.length - 1);
				}

				temp = localEval.apply(self.root, scopes);
				return temp;
			}
			return '';
		});

		if(runEval === '#noEval'){
			// Clear memory before return
			_modelScope = _model_ = mask = scope = runEval = scopeMask = itemMask = html = null;
			setTimeout(function(){prepared = null}, 1);
			return [prepared, preParsedReference];
		}

		return prepared;
	}

	var bindArray = function(template, list, mask, modelName, propertyName, targetNode, parentNode, tempDOM){
		var editProperty = ['pop', 'push', 'splice', 'shift', 'unshift', 'swap', '$replace', 'softRefresh', 'hardRefresh'];
		var refreshTimer = -1;
		var processElement = function(index, options, other){
			if(options === 'clear'){
				if(list.$virtual)
					var spacer = [parentNode.firstElementChild, parentNode.lastElementChild];

				parentNode.textContent = '';

				if(list.$virtual){
					parentNode.appendChild(spacer[0]);
					parentNode.appendChild(spacer[1]);
				}
				return;
			}

			if(options === 'swap'){
				var ref = parentNode.children;
				ref[index].insertAdjacentElement('afterEnd', ref[other]);
				ref[other].insertAdjacentElement('afterEnd', ref[index]);
				return;
			}

			// Hard refresh
			if(options === 'hardRefresh'){
				var item = self.root[modelName][propertyName];
				for (var i = index; i < item.length; i++) {
					if(list.$virtual)
						parentNode.insertBefore(preparedParser(template, item[i]), parentNode.lastElementChild);
					else
						parentNode.appendChild(preparedParser(template, item[i]));
				}
				return;
			}

			if(list.$virtual){
				var exist = list.$virtual.elements();

				clearTimeout(refreshTimer);
				refreshTimer = setTimeout(function(){
					list.$virtual.refresh(true);
				}, 100);
			}
			else exist = parentNode.children;

			var callback = false;
			if(self.root[modelName]['on$'+propertyName])
				callback = self.root[modelName]['on$'+propertyName];

			// Remove
			if(options === 'remove'){
				if(exist[index]){
					var currentRemoved = false;
					var startRemove = function(){
						if(currentRemoved) return;
						currentRemoved = true;

						exist[index].remove();
					}

					if(callback.remove){
						// Auto remove if return false
						if(!callback.remove(exist[index], startRemove))
							setTimeout(startRemove, 800);
					}

					// Auto remove if no callback
					else startRemove();
				}
				return;
			}

			var item = self.root[modelName][propertyName][index];
			var temp = preparedParser(template, item);
			var referenceNode = exist[index];

			// Create
			if(options === 'insertAfter'){
				var index = index !== 0 ? index - 1 : (exist.length - 1);
				var referenceNode = exist[index];

				if(!referenceNode){
					if(!list.$virtual || list.length === 0){
						parentNode.insertAdjacentElement('afterBegin', temp);
						if(callback.create) callback.create(temp);
					}
					return;
				}

				referenceNode.insertAdjacentElement('afterEnd', temp);
				if(callback.create) callback.create(temp);
			}
			else if(options === 'append'){
				if(list.$virtual && list.length !== 0){
					exist[index-1].insertAdjacentElement('afterEnd', temp);
					if(callback.create) callback.create(temp);
					return;
				}

				parentNode.appendChild(temp);
				if(callback.create) callback.create(temp);
			}
			else{
				// Create
				if(options === 'insertBefore'){
					exist[0].insertAdjacentElement('beforeBegin', temp);
					if(callback.create) callback.create(temp);
				}

				// Update
				else{
					if(list.$virtual){
						exist[index].parentNode.replaceChild(temp, exist[index]);
						return;
					}
					parentNode.replaceChild(temp, exist[index]);
					if(callback.update) callback.update(temp);
				}
			}
		}

		var _single_zero = [0]; // For arguments
		var _double_zero = [0,0]; // For arguments
		var propertyProxy = function(subject, name){
			Object.defineProperty(subject, name, {
				enumerable: false,
				configurable: true,
				value: function(){
					var temp = undefined;
					var lastLength = this.length;

					if(name === 'swap'){
						var i = arguments[0];
						var o = arguments[1];
						processElement(i, 'swap', o);
						var temp = this[i];
						this[i] = this[o];
						this[o] = temp;
						return;
					}

					else if(name === '$replace'){
						// Check if appending
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

							if(matchLeft === 0){
								if(ref.length === lastLength) return;

								var takeIndex = lastLength-1;
								Array.prototype.splice.apply(this, [takeIndex, 0].concat(arguments[0].slice(takeIndex)));
								processElement(lastLength, 'hardRefresh');
								return;
							}
						}

						if(lastLength !== 0){
							Array.prototype.splice.apply(this, _single_zero);
							processElement(0, 'clear');
						}
						Array.prototype.splice.apply(this, _double_zero.concat(arguments[0]));
						processElement(0, 'hardRefresh');
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

					else if(name === 'push')
						processElement(lastLength, 'append');

					else if(name === 'shift')
						processElement(0, 'remove');

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

						if(arguments.length >= 3){ // Inserting data
							limit = arguments.length - 2;
							for (var i = 0; i < limit; i++) {
								processElement(real + i, 'insertAfter');
							}
						}
					}

					else if(name === 'unshift')
						processElement(0, 'insertBefore');

					else if(name === 'softRefresh')
						processElement(arguments[0], 'update');

					else if(name === 'hardRefresh')
						processElement(0, 'hardRefresh');

					return temp;
				}
			});
		}

		if(parentNode && parentNode.classList.contains('sf-virtual-list')){
			delete list.$virtual;
			list.$virtual = {};

			// Transfer virtual DOM
			list.$virtual.dom = tempDOM;

			sf.internal.virtual_scroll.handle(list, targetNode, parentNode);
		}

		for (var i = 0; i < editProperty.length; i++) {
			propertyProxy(list, editProperty[i]);
		}

		Object.defineProperty(list, 'getElement', {
			enumerable: false,
			configurable: true,
			value: function(index){
				if(list.$virtual){
					if(index < list.$virtual.DOMCursor)
						return list.$virtual.dom.children[index];

					index -= list.$virtual.DOMCursor;
					var childElement = parentNode.childElementCount - 2;
					if(index <= childElement)
						return parentNode.children[index + 1];

					return list.$virtual.dom.children[index - childElement + list.$virtual.DOMCursor];
				}

				return parentNode.children[index];
			}
		});
	}

	var loopParser = function(name, template, script, targetNode, parentNode){
		var method = script.split(' in ');
		var mask = method[0];

		if(!self.root[name])
			return console.error("Can't parse element because model for '"+name+"' was not found", template);

		var items = self.root[name][method[1]];

		template.setAttribute('sf-bind-list', method[1]);

		// Get reference for debugging
		processingElement = template;
		template = self.extractPreprocess(template, mask, name);

		if(method.length === 2){
			var tempDOM = document.createElement('div');
			var modelRef = self.root[name];
			
			for(var i in items){
				tempDOM.appendChild(preparedParser(template, items[i]));
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
					return items.$replace(val);
				}
			});

			bindArray(template, items, mask, name, method[1], targetNode, parentNode, tempDOM);

			// Output to real DOM if not being used for virtual list
			if(parentNode.classList.contains('sf-virtual-list') === false){
				for (var i = 0; i < tempDOM.length; i++) {
					parentNode.appendChild(tempDOM[i]);
				}

				tempDOM.remove();
				tempDOM = null;
			}
		}
	}

	var inputBoundFunction = function(e){
		self.root[e.target['sf-model']][e.target['sf-bounded']] = e.target.value;
	};

	var bindInput = function(targetNode){
		var temp = $('input[sf-bound]', targetNode);

		for (var i = 0; i < temp.length; i++) {
			var element = temp[i];
			var model = sf.controller.modelName(element);
			if(!model) return;

			var whichVar = element.getAttribute('sf-bound');

			// Get reference
			if(typeof self.root[model][whichVar] === undefined){
				console.error('Cannot get reference for self.root["' + model + '"]["' + whichVar+'"]');
				return;
			}

			element['sf-bounded'] = whichVar;
			element['sf-model'] = model;
			element.setAttribute('sf-bounded', '');
			element.removeAttribute('sf-bound');

			// Bound value change
			if(element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')
				$.on(element, 'keyup', inputBoundFunction);

			else
				$.on(element, 'change', inputBoundFunction);
		}
	}

	var alreadyInitialized = false;
	self.init = function(targetNode){
		if(alreadyInitialized && !targetNode) return;
		alreadyInitialized = true;
		setTimeout(function(){
			alreadyInitialized = false;
		}, 50);

		if(!targetNode) targetNode = document.body;
		self.parsePreprocess(self.queuePreprocess(targetNode));
		bindInput(targetNode);

		var temp = $('[sf-repeat-this]', targetNode);
		for (var i = 0; i < temp.length; i++) {
			var element = temp[i];
			var parent = element.parentElement;

			if(element.parentNode.classList.contains('sf-virtual-list')){
				var ceiling = document.createElement(element.tagName);
				ceiling.classList.add('virtual-spacer');
				var floor = ceiling.cloneNode(true);

				ceiling.classList.add('ceiling');
				//ceiling.style.transform = 'scaleY(0)';
				element.parentNode.insertAdjacentElement('afterBegin', ceiling); // prepend

				floor.classList.add('floor');
				//floor.style.transform = 'scaleY(0)';
				element.parentNode.insertAdjacentElement('beforeEnd', floor); // append

				// His total scrollHeight
				var styles = window.getComputedStyle(element);
				var absHeight = parseFloat(styles['marginTop']) + parseFloat(styles['marginBottom']);
				styles = null;

				// Element height + margin
				absHeight = Math.ceil(element.offsetHeight + absHeight);
			}

			var after = element.nextElementSibling;
			if(after === null || element === after)
				after = false;

			var before = element.previousElementSibling;
			if(before === null || element === before)
				before = false;

			var script = element.getAttribute('sf-repeat-this');
			element.removeAttribute('sf-repeat-this');
			var controller = sf.controller.modelName(element);

			// Check if the element was already bound to prevent vulnerability
			if(/sf-bind-key|sf-bind-list/.test(element.outerHTML))
				throw "Can't parse element that already bound";

			loopParser(controller, element, script, targetNode, element.parentNode);
			element.remove();
		}
	}

	// Reset model properties
	// Don't call if the removed element is TEXT or #comment
	function DOMNodeRemoved(element){
		var temp = $('[sf-controller]', element);
		for (var i = 0; i < temp.length; i++) {
			removeModelBinding(temp[i].getAttribute('sf-controller'));
		}

		if(element.hasAttribute('sf-controller') === false)
			return;

		removeModelBinding(element.getAttribute('sf-controller'));
	}

	sf(function(){
		var everyRemovedNodes = function(nodes){
			var tagName = nodes.nodeName;
			if(tagName === 'TEXT' || tagName === '#text' || tagName === '#comment') return;

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

	var removeModelBinding = function(modelName){
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

	var dcBracket = /{{[\s\S]*?}}/;
	var bindObject = function(element, modelRef, propertyName, which){
		if(!(element instanceof Node))
			element = element[0];

		// Get reference for debugging
		processingElement = element;

		// First initialization
		element.setAttribute('sf-bind-key', propertyName);
		var modelName = sf.controller.modelName(element);

		// Cache attribute content
		if(which === 'attr' || !which){
			var attrs = {};

			for (var i = 0; i < element.attributes.length; i++) {
				var attr = element.attributes[i].name;

				// Check if it has a bracket
				if(dcBracket.test(element.getAttribute(attr)) === false)
					continue;

				attrs[attr] = element.getAttribute(attr);
				element.removeAttribute(attr);
			}
		}

		// Cache html content
		if(which === 'html' || !which)
			var htmlClone = element.cloneNode(true).innerHTML;

		var onChanges = function(){
			if(which === 'attr' || !which){
				for(var name in attrs){
					if(attrs[name].indexOf(propertyName) === -1)
						continue;

					var temp = dataParser(attrs[name], modelRef, false, modelName);
					if(name === 'value')
						element.value = temp;
					else
						element.setAttribute(name, temp);
					break;
				}
			}

			if(which === 'html' || !which){
				var temp = uniqueDataParser(htmlClone, modelRef, false, modelName);
				temp = dataParser(temp, modelRef, false, modelName);
				element.textContent = '';
				element.insertAdjacentHTML('afterBegin', temp);
			}
		};

		if(modelRef[propertyName] === undefined)
			throw "Property '"+propertyName+"' was not found on '"+modelName+"' model";

		// Enable multiple element binding
		if(modelRef.sf$bindedKey === undefined)
			initBindingInformation(modelRef);

		if(modelRef.sf$bindedKey[propertyName] !== undefined){
			modelRef.sf$bindedKey[propertyName].push(onChanges);
			return;
		}

		var objValue = modelRef[propertyName]; // Object value
		Object.defineProperty(modelRef, propertyName, {
			enumerable: true,
			configurable: true,
			get:function(){
				return objValue;
			},
			set:function(val){
				objValue = val;

				var ref = modelRef.sf$bindedKey[propertyName];
				for (var i = 0; i < ref.length; i++) {
					ref[i]();
				}

				return objValue;
			}
		});

		modelRef.sf$bindedKey[propertyName] = [onChanges];
	}

	self.bindElement = function(element, which){
		var modelName = sf.controller.modelName(element);
		var model = self.root[modelName];
		if(!model) return console.error("Model for "+modelName+" was not found while binding:", element);

		var html = element.outerHTML;

		// Check if the child element was already bound to prevent vulnerability
		if(/sf-bind-key|sf-bind-list/.test(html))
			throw "Can't parse element that already bound";

		if(which === 'attr')
			html = html.replace(element.innerHTML, '');

		var brackets = /{{([\s\S]*?)}}/g;

		// Unmatch any function
		var variableList = self.modelKeys(model);
		for(var i = variableList.length - 1; i >= 0; i--){
			if(model[variableList[i]] instanceof Function)
				variableList.splice(i, 1);
		}

		var scopeMask = RegExp(sf.regex.strictVar+'('+variableList+')'+sf.regex.avoidQuotes+'\\b', 'g');
		var s1, s2 = null;
		while((s1 = brackets.exec(html)) !== null){
			while ((s2 = scopeMask.exec(s1[1])) !== null) {
				bindObject(element, model, s2[1], which);
			}
		}
	}

	self.extractPreprocess = function(targetNode, mask, name){
		var copy = targetNode.outerHTML;

		// Extract data to be parsed
		copy = uniqueDataParser(copy, null, mask, name, '#noEval');
		var preParsed = copy[1];
		copy = dataParser(copy[0], null, mask, name, '#noEval', preParsed);

		// Build element and start addressing
		copy = $.parseElement(copy)[0];
		var nodes = self.queuePreprocess(copy, true);
		var addressed = [];

		function addressAttributes(currentNode){
			var attrs = currentNode.attributes;
			var keys = [];
			for (var a = 0; a < attrs.length; a++) {
				var found = attrs[a].value.split('{{%=');
				if(found.length !== 1)
					keys.push({direct:found.length === 2 ? Number(found[1]) : false, name:attrs[a].name});
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
				nodeType:nodes[i].nodeType,
				direct:false,
				address:$.getSelector(nodes[i], true)
			};

			if(temp.nodeType === 1)
				temp.attributes = addressAttributes(nodes[i]);

			else if(temp.nodeType === 3){
				var innerHTML = nodes[i].parentNode.innerHTML;

				if(innerHTML.split('<').length === 1){
					innerHTML = innerHTML.split('{{%=');

					if(innerHTML.length === 2)
						temp.direct = Number(innerHTML[1]);
				}
			}

			addressed.push(temp);
		}

		return {
			html:copy,
			parse:preParsed,
			addresses:addressed
		}
	}

	var excludes = ['HTML','HEAD','STYLE','LINK','META','SCRIPT','OBJECT','IFRAME'];
	self.queuePreprocess = function(targetNode, extracting = false){
		var childNodes = (targetNode || document.body).childNodes;

		var temp = [];
		for (var i = childNodes.length - 1; i >= 0; i--) {
			var currentNode = childNodes[i];

			if(extracting === false && excludes.indexOf(currentNode.nodeName) !== -1)
				continue;

			if(currentNode.nodeType === 1){ // Tag
				var attrs = currentNode.attributes;

				// Skip element and it's childs that already bound to prevent vulnerability
				if(attrs['sf-bind-key'] || attrs['sf-repeat-this'] || attrs['sf-bind-list']) continue;

				for (var a = 0; a < attrs.length; a++) {
					if(attrs[a].value.indexOf('{{') !== -1){
						if(extracting === false)
							currentNode.setAttribute('sf-preprocess', 'attronly');
						temp.push(currentNode);
					}
				}

				temp = temp.concat(self.queuePreprocess(currentNode, extracting));
			}

			else if(currentNode.nodeType === 3){ // Text
				currentNode.textContent = currentNode.textContent.trim();

				if(currentNode.textContent.length === 0){
					currentNode.remove();
					continue;
				}

				if(currentNode.nodeValue.indexOf('{{') !== -1){
					if(extracting === false){
						currentNode.parentNode.setAttribute('sf-preprocess', '');

						// Reset Siblings
						for (var a = 0; a < temp.length; a++) {
							temp[a].removeAttribute('sf-preprocess');
						}

						temp.push(currentNode.parentNode);
						break;
					}

					temp.push(currentNode);
				}
			}
		}

		return temp;
	}

	self.parsePreprocess = function(nodes){
		for (var a = 0; a < nodes.length; a++) {
			var model = sf.controller.modelName(nodes[a]);
			nodes[a].removeAttribute('sf-preprocess');

			if(!self.root[model])
				return console.error("Can't parse element because model for '"+model+"' was not found", nodes[a]);

			var modelRef = self.root[model];

			// Get reference for debugging
			processingElement = nodes[a];

			// Double check if the child element already bound to prevent vulnerability
			if(/sf-bind-key|sf-bind-list/.test(nodes[a].innerHTML)){
				console.error("Can't parse element that already bound");
				console.log(processingElement.cloneNode(true));
				return;
			}

			if(nodes[a].hasAttribute('sf-bind'))
				self.bindElement(nodes[a], nodes[a].getAttribute('sf-bind'));

			// Avoid editing the outerHTML because it will remove the bind
			var temp = uniqueDataParser(nodes[a].innerHTML, self.root[model], false, model);
			nodes[a].innerHTML = dataParser(temp, self.root[model], false, model);

			var attrs = nodes[a].attributes;
			for (var i = 0; i < attrs.length; i++) {
				if(attrs[i].value.indexOf('{{') !== -1){
					var attr = attrs[i];
					attr.value = dataParser(attr.value, self.root[model], false, model);
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