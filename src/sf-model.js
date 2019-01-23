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

	var bracketMatch = RegExp('([\\w.]*?[\\S\\s])\\('+sf.regex.avoidQuotes, 'g');
	var chackValidFunctionCall = /[a-zA-Z0-9 \]\$\)]/;
	var allowedFunction = [':', 'for', 'if', 'while', '_content_.take', 'console.log'];
	var localEval = function(script_, _model_, _modelScope, _content_){
		"use strict";
		var script = script_;
		script_ = script_.split('\\"').join('\\$%*').split("\\'").join('\\%$*'); // ToDo: Escape
		script_ = script_.split('._modelScope').join('');
		script_ = script_.split('._model_').join('');

		// Prevent vulnerability by remove bracket to avoid a function call
		var preventExecution = false;
		var check_ = null;
		while((check_ = bracketMatch.exec(script_)) !== null){
			check_[1] = check_[1].trim();

			if(allowedFunction.indexOf(check_[1]) === -1 &&
				check_[1].split('.')[0] !== '_modelScope' &&
				chackValidFunctionCall.test(check_[1][check_[1].length-1])
			){
				preventExecution = check_[1];
				break;
			}
		}

		var _result_ = '';
		script_ = script_.split('\\$%*').join('\\"').split('\\%$*').join("\\'"); // ToDo: Unescape
		if(preventExecution){
			console.error("Trying to executing unrecognized function ("+preventExecution+")");
			console.log($(processingElement.outerHTML)[0]);
			console.log(script_);
			return '';
		}

		try{
			if(/@return /.test(script_) === true){
				var _evaled_ = eval('(function(){'+script_.split('@return ').join('return ')+'})()');
				return _result_ + _evaled_;
			}
			else var _evaled_ = eval(script_);
		} catch(e){
			console.error(e);
			console.log(script_);
			console.log($(processingElement.outerHTML)[0]);
			return '';
		}

		if(_result_ !== '') return _result_;
		return _evaled_;
	}

	self.index = function(element){
		var i = $(element).prevAll(element.tagName).length;
		var list = element.getAttribute('sf-bind-list');
		if(!list) return i;

		var ref = sf.controller.modelScope(element)[list];
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

	var clearElementData = function(current){
		// Clean associated data on jQuery
		if($ && $.cleanData)
			$.cleanData(current.getElementsByTagName("*"));

		current.innerHTML = '';
		for (var i = 0; i < current.attributes.length; i++) {
			var name = current.attributes[i].name;
			if(name !== 'sf-bind-list')
				current.removeAttribute(name);
		}
		current.setAttribute('style', 'display:none');
	}

	// For contributor of this library
	// Please be careful when you're passing the eval argument
	var dataParser = function(html, _model_, mask, scope, runEval){
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

		return html.replace(/{{([^@][\s\S]*?)}}/g, function(actual, temp){
			// ToDo: The regex should be optimized to avoid match in a quote (but not escaped quote)
			temp = temp.split('\\"').join('\\$%*').split("\\'").join('\\%$*'); // ToDo: Escape

			// Mask item variable
			if(mask)
				temp = temp.replace(itemMask, function(matched){
					return '_model_.'+matched[0].slice(1);
				});

			// Mask model for variable
			temp = temp.replace(scopeMask, function(full, matched){
				return '_modelScope.'+matched;
			});

			temp = temp.split('\\$%*').join('\\"').split('\\%$*').join("\\'"); // ToDo: Unescape

			// Evaluate
			temp = '' + localEval.apply(self.root, [runEval + temp, _model_, _modelScope]);

			return temp.replace(/[\u00A0-\u9999<>\&]/gim, function(i) {
		        return '&#'+i.charCodeAt(0)+';';
		    });
		});
	}

	var uniqueDataParser = function(html, _model_, mask, scope){
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

				// Disable function call for addional security eval protection
				strDeclare = strDeclare.split('(').join('').split(')').join('');

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

		return html.replace(/{{(@[\s\S]*?)}}/g, function(actual, temp){
			// ToDo: The regex should be optimized to avoid match in a quote (but not escaped quote)
			temp = temp.split('\\"').join('\\$%*').split("\\'").join('\\%$*'); // ToDo: Escape

			// Mask item variable
			if(mask)
				temp = temp.replace(itemMask, function(matched){
					return '_model_.'+matched[0].slice(1);
				});

			// Mask model for variable
			temp = temp.replace(scopeMask, function(full, matched){
				return '_modelScope.'+matched;
			});
			temp = temp.split('\\$%*').join('\\"').split('\\%$*').join("\\'"); // ToDo: Unescape

			var result = '';
			var check = false;

			check = temp.split('@if ');
			if(check.length != 1){
				check = check[1].split(':');
			
				// If condition was meet
				if(localEval.apply(self.root, [check[0], _model_, _modelScope, _content_])){
					check.shift();
					return check.join(':');
				}
			}

			// Get defined variables
			var VarPass_ = /(var|let)([\w,\s]+)(?=\s(?==|in|of))/g;
			var VarPass = [];
			var s1 = null;
			while((s1 = VarPass_.exec(temp)) !== null){
				VarPass.push(s1[2]);
			}
			if(VarPass.length){
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
			if(check.length != 1){
				check = check[1].split('&lt;').join('<').split('&gt;').join('>').split('&amp;').join('&');

				temp = localEval.apply(self.root, [check, _model_, _modelScope, _content_]);
				return temp;
			}
			return '';
		});
	}

	var bindArray = function(html, list, mask, modelName, propertyName, targetNode, parentNode, htmlParsedData){
		var oldArray = list.slice(0);
		var editProperty = ['pop', 'push', 'splice', 'shift', 'unshift', 'softRefresh', 'hardRefresh'];
		var refreshTimer = -1;
		var processElement = function(index, options){
			var exist = $("[sf-controller='"+modelName+"']", targetNode);
			if(exist.length === 0){
				if(targetNode.getAttribute('sf-controller') === modelName)
					exist = targetNode;
				else return;
			}

			if(list.$virtual){
				var exist = $(list.$virtual.elements());

				clearTimeout(refreshTimer);
				refreshTimer = setTimeout(function(){
					list.$virtual.refresh(true);
				}, 100);
			}
			else exist = $("[sf-bind-list='"+propertyName+"']", exist);

			var callback = false;
			if(self.root[modelName]['on$'+propertyName])
				callback = self.root[modelName]['on$'+propertyName];

			// Hard refresh
			if(index === -1){
				var item = self.root[modelName][propertyName];
				var all = '';
				for (var i = 0; i < item.length; i++) {
					var temp = uniqueDataParser(html, item[i], mask, modelName);
					all += dataParser(temp, item[i], mask, modelName);
				}

				// Get first element
				var first = exist.eq(0).prev();
				if(first[0] === exist[0])
					exist.parent().prepend(all);
				else
					$(all).insertAfter(first);
				exist.remove();

				return;
			}

			// Remove
			if(options === 'remove'){
				if(exist[index]){
					var currentRemoved = false;
					var startRemove = function(){
						if(currentRemoved) return;
						currentRemoved = true;

						if(exist.length <= 1)
							return clearElementData(exist[index]);

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

			// Create or update
			var item = self.root[modelName][propertyName][index];

			var temp = uniqueDataParser(html, item, mask, modelName);
			temp = dataParser(temp, item, mask, modelName);
			temp = $(temp);

			// Create
			if(!exist[index] || options === 'insertAfter'){
				if(callback.create)
					callback.create(temp[0]);

				temp.insertAfter(exist[index !== 0 ? index - 1 : (exist.length - 1)]);
			}

			else{
				// Create
				if(options === 'insertBefore'){
					if(callback.create)
						callback.create(temp[0]);

					temp.insertBefore(exist[0]);
				}

				// Update
				else{
					if(callback.update)
						callback.update(temp[0]);

					// Clean associated data on jQuery
					if($ && $.cleanData){
						$.cleanData(exist[index].getElementsByTagName("*"));
						$.cleanData(exist[index]);
					}

					exist[index].outerHTML = temp[0].outerHTML;
				}
			}
		}

		var propertyProxy = function(subject, name){
			Object.defineProperty(subject, name, {
				enumerable: false,
				configurable: true,
				value: function(){
					var temp = undefined;
					var lastLength = this.length;

					if(Array.prototype[name])
						temp = Array.prototype[name].apply(this, arguments);

					if(name === 'pop')
						processElement(lastLength - 1, 'remove');

					else if(name === 'push')
						processElement(lastLength, 'add');

					else if(name === 'shift')
						processElement(0, 'remove');

					else if(name === 'splice'){
						// Obtaining all data
						if(arguments[0] === null){
							oldArray.splice(0);
							return temp;
						}

						// Removing data
						var real = arguments[0];
						if(real < 0) real = lastLength + real;

						var limit = arguments[1];
						if(!limit && limit !== 0) limit = oldArray.length;
						
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

					else if(name === 'softRefresh'){
						if(arguments[0] || arguments[0] === 0)
							processElement(arguments[0], !!oldArray[arguments[0]] ? 'add':'remove');
						else {
							var foundChanges = false;

							// Removal
							if(oldArray.length > this.length){
								for (var i = oldArray.length - 1; i >= this.length; i--) {
									if(this.indexOf(oldArray[i]) === -1){
										foundChanges = true;
										processElement(i, 'remove');
									}
								}
							}

							// Creates
							if(oldArray.length < this.length){
								for (var i = oldArray.length - 1; i < this.length; i++) {
									foundChanges = true;
									processElement(i, 'insertBefore');
								}
							}

							// Update
							for (var i = 0; i < this.length; i++) {
								if(compareObject(oldArray[i], this[i]) === false){
									foundChanges = true;
									processElement(i, 'add');
								}
							}

							if(foundChanges)
								oldArray = this.slice(0);
						}
					}
					else if(name === 'hardRefresh')
						processElement(-1, 'remove');

					if(Array.prototype[name])
						oldArray = this.slice(0);

					return temp;
				}
			});
		}

		if(parentNode && parentNode.classList.contains('sf-virtual-list')){
			Object.defineProperty(list, '$virtual', {
				enumerable: false,
				configurable: true,
				value:{}
			});

			// Parse in virtual DOM
			list.$virtual.dom = document.createElement('div');
			list.$virtual.dom.innerHTML = htmlParsedData;

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
					var reducedIndex = index - parentNode.childElementCount + 2;
					if(reducedIndex <= 0)
						return parentNode.children[index + 1];

					return list.$virtual.dom.children[index + list.$virtual.DOMCursor];
				}

				if(parentNode.childElementCount === list.length)
					return parentNode.children[index];

				return parentNode.querySelectorAll('[sf-bind-list="'+propertyName+'"]')[index];
			}
		});
	}

	function compareObject(obj1, obj2){
		if(!obj1 || !obj2)
			return false;

		for(var i in obj1){
			if(typeof obj1[i] !== 'object' && obj1[i] !== obj2[i])
				return false;
		}
		return true;
	}

	var loopParser = function(name, content, script, targetNode, parentNode){
		var returns = '';
		var method = script.split(' in ');
		var mask = method[0];

		if(!self.root[name])
			return console.error("Can't parse element because model for '"+name+"' was not found", $(content)[0]);

		var items = self.root[name][method[1]];

		// Get reference for debugging
		processingElement = $(content).attr('sf-bind-list', method[1])[0];

		content = processingElement.outerHTML;
		content = content.replace(/  +|\t+/g, '');

		if(method.length === 2){
			for(var i in items){
				var item = items[i];

				temp = uniqueDataParser(content, item, mask, name);
				temp = dataParser(temp, item, mask, name);
				returns += temp;
			}

			var modelRef = self.root[name];

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
					for (var i = 0; i < val.length; i++) {
						if(items[i]){
							items[i] = val[i];
							items.softRefresh(i);
						}
						else items.push(val[i]);
					}

					if(items.length > val.length)
						items.splice(val.length);

					return items;
				}
			});

			bindArray(content, items, mask, name, method[1], targetNode, parentNode, returns);
		}
		return returns;
	}

	var bindInput = function(targetNode){
		$('input[sf-bound]', targetNode).each(function(){
			var model = sf.controller.modelName(this);
			if(!model) return;

			var whichVar = this.getAttribute('sf-bound');

			// Get reference
			if(typeof self.root[model][whichVar] === undefined){
				console.error('Cannot get reference for self.root["' + model + '"]["' + whichVar+'"]');
				return;
			}

			this.setAttribute('sf-bounded', whichVar);
			this.removeAttribute('sf-bound');

			// Bound value change
			var element = $(this);
			if(this.tagName === 'INPUT' || this.tagName === 'TEXTAREA')
				element.on('keyup', function(e){
					self.root[model][whichVar] = element.val();
				});

			else
				element.on('change', function(e){
					self.root[model][whichVar] = element.val();
				});
		});
	}

	var alreadyInitialized = false;
	self.init = function(targetNode){
		if(alreadyInitialized && !targetNode) return;
		alreadyInitialized = true;
		setTimeout(function(){
			alreadyInitialized = false;
		}, 50);

		if(targetNode){
			if(!(targetNode instanceof Node))
				targetNode = $(targetNode)[0];
		}
		else targetNode = document.body;

		self.parsePreprocess(self.queuePreprocess(targetNode));
		bindInput(targetNode);

		$('[sf-repeat-this]', targetNode).each(function(){
			var self = $(this);
			var parent = self.parent();

			if(this.parentNode.classList.contains('sf-virtual-list')){
				var tagName = $(this.parentNode).children('[sf-repeat-this]')[0].tagName;
				var ceiling = document.createElement(tagName);
				ceiling.classList.add('virtual-spacer');
				ceiling.classList.add('ceiling');
				//ceiling.style.transform = 'scaleY(0)';
				this.parentNode.prepend(ceiling);

				var floor = document.createElement(tagName);
				floor.classList.add('virtual-spacer');
				floor.classList.add('floor');
				//floor.style.transform = 'scaleY(0)';
				this.parentNode.append(floor);

				// His total scrollHeight
				var styles = window.getComputedStyle(this);
				var absHeight = parseFloat(styles['marginTop']) + parseFloat(styles['marginBottom']);
				styles = null;

				// Element height + margin
				absHeight = Math.ceil(this.offsetHeight + absHeight);
			}

			var after = self.next();
			if(!after.length || self[0] === after[0])
				after = false;

			var before = self.prev();
			if(!before.length || self[0] === before[0])
				before = false;

			var script = self.attr('sf-repeat-this');
			self.removeAttr('sf-repeat-this');
			var controller = sf.controller.modelName(this);

			var content = this.outerHTML;

			// Check if the element was already bound to prevent vulnerability
			if(/sf-bind-key|sf-bind-list/.test(content))
				throw "Can't parse element that already bound";

			if(this.parentNode.classList.contains('sf-virtual-list')){
				if(loopParser(controller, content, script, targetNode, this.parentNode))
					self.remove();
				else {
					self.attr('sf-bind-list', script.split(' in ')[1]);
					clearElementData(this);
				}
				return;
			}

			var data = loopParser(controller, content, script, targetNode, this.parentNode);
			if(data){
				self.remove();
				
				data = $(data);
				if(after)
					data.insertBefore(after);
				else if(before)
					data.insertAfter(before);
				else
					parent.append(data);
			}
			else{
				self.attr('sf-bind-list', script.split(' in ')[1]);
				clearElementData(this);
			}
		});
	}

	// Reset model properties
	// Don't call if the removed element is TEXT or #comment
	function DOMNodeRemoved(element){
		$('[sf-controller]', element).each(function(){
			removeModelBinding(this.getAttribute('sf-controller'));
		});

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

			for(var i in element.attributes){
				// Check if it has a bracket
				if(!dcBracket.test(element.attributes[i].value))
					continue;

				var attrName = element.attributes[i].name;
				if(attrName === 'value')
					element.removeAttribute(attrName);

				attrs[attrName] = element.attributes[i].value;
			}
		}

		// Cache html content
		if(which === 'html' || !which)
			var innerHTML = element.innerHTML;

		element = $(element);
		var onChanges = function(){
			if(which === 'attr' || !which){
				for(var name in attrs){
					if(attrs[name].indexOf(propertyName) === -1)
						continue;

					var temp = dataParser(attrs[name], modelRef, false, modelName);
					if(name === 'value')
						element.val(temp);
					else
						element.attr(name, temp);
					break;
				}
			}

			if(which === 'html' || !which){
				var temp = uniqueDataParser(innerHTML, modelRef, false, modelName);
				temp = dataParser(temp, modelRef, false, modelName);
				element.html(temp);
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

	self.queuePreprocess = function(targetNode){
		var childNodes = (targetNode || document.body).childNodes;

		var excludes = ['html','head','style','link','meta','script','object','iframe'];
		for (var i = 0; i < excludes.length; i++) {
			excludes[i] = excludes[i].toUpperCase();
		}

		var temp = [];
		for (var i = 0; i < childNodes.length; i++) {
			var currentNode = childNodes[i];
			if(excludes.indexOf(currentNode.nodeName) !== -1)
				continue;

			if(currentNode.nodeType === 1){ // Tag
				var attrs = currentNode.attributes;

				// Skip element and it's childs that already bound to prevent vulnerability
				if(attrs['sf-bind-key'] || attrs['sf-repeat-this'] || attrs['sf-bind-list']) continue;

				for (var a = 0; a < attrs.length; a++) {
					if(attrs[a].value.indexOf('{{') !== -1){
						currentNode.setAttribute('sf-preprocess', 'attronly');
						temp.push(currentNode);
					}
				}

				temp = temp.concat(self.queuePreprocess(currentNode));
			}

			else if(currentNode.nodeType === 3){ // Text
				if(currentNode.nodeValue.indexOf('{{') !== -1){
					currentNode.parentNode.setAttribute('sf-preprocess', '');

					// Reset Siblings
					for (var a = 0; a < temp.length; a++) {
						temp[a].removeAttribute('sf-preprocess');
					}
					temp.push(currentNode.parentNode);

					break;
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
				console.log($(processingElement.outerHTML)[0]);
				return;
			}

			if($(nodes[a]).attr('sf-bind'))
				self.bindElement(nodes[a], $(nodes[a]).attr('sf-bind'));

			// Avoid editing the outerHTML because it will remove the bind
			var temp = uniqueDataParser(nodes[a].innerHTML, self.root[model], false, model);
			nodes[a].innerHTML = dataParser(temp, self.root[model], false, model);
			for (var i = 0; i < nodes[a].attributes.length; i++) {
				if(nodes[a].attributes[i].value.indexOf('{{') !== -1){
					nodes[a].attributes[i].value = dataParser(nodes[a].attributes[i].value, self.root[model], false, model);
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