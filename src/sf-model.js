// Data save and HTML content binding
sf.model = new function(){
	var self = this;
	var bindingEnabled = false;
	self.root = {};
	var root_ = function(scope){
		if(!self.root[scope])
			self.root[scope] = {};

		if(sf.controller.pending[scope])
			sf.controller.run(scope);

		return self.root[scope];
	};

	var processingElement = null;

	var bracketMatch = RegExp('([\\w.]*?[\\S\\s])\\('+sf.regex.avoidQuotes, 'g');
	var chackValidFunctionCall = /[a-zA-Z0-9 \]\$\)]/;
	var allowedFunction = [':', 'for', 'if', 'while', '_content_.take', 'console.log'];
	var localEval = function(script_, _model_, _modelScope, _content_){
		var script = script_;
		script_ = script_.split('\\"').join('\\$%*').split("\\'").join('\\%$*'); // ToDo: Escape
		script_ = script_.split('._modelScope').join('');
		script_ = script_.split('._model_').join('');

		// Prevent vulnerability by remove bracket to avoid a function call
		var preventExecution = false;
		var check = null;
		while((check = bracketMatch.exec(script_)) !== null){
			check[1] = check[1].trim();

			if(allowedFunction.indexOf(check[1]) === -1 &&
				check[1].split('.')[0] !== '_modelScope' &&
				chackValidFunctionCall.test(check[1][check[1].length-1])
			){
				preventExecution = check[1];
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
			var _evaled_ = eval(script_);
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
		return $(element).prevAll(element.tagName).length;
	}

	self.for = function(name, func){
		if(!sf.loader.DOMWasLoaded)
			return sf(function(){
				self.for(name, func);
			});
		
		func(root_(name), root_);
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

		// Don't match text inside quote, or object keys
		var scopeMask = RegExp(sf.regex.strictVar+'('+self.modelKeys(_modelScope)+')'+sf.regex.avoidQuotes+'\\b', 'g');

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
					VarPass[i] += ':(typeof '+VarPass[i]+'!="undefined"?'+VarPass[i]+':undefined)';
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

	var bindArray = function(html, list, mask, modelName, propertyName, targetNode){
		var oldArray = list.slice(0);
		var editProperty = ['pop', 'push', 'splice', 'shift', 'unshift', 'softRefresh', 'hardRefresh'];
		var processElement = function(index, update, insertBefore, insertAfter){
			var exist = $("[sf-controller='"+modelName+"']", targetNode);
			if(exist.length === 0) return;

			exist = exist.find("[sf-bind-list='"+propertyName+"']");

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
				var first = exist.eq(0).before();
				if(first[0] === exist[0])
					exist.parent().prepend(all);
				else
					$(all).insertAfter(first);
				exist.remove();
				
				return;
			}

			// Remove
			if(!update){
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
			if(!exist[index] || insertAfter){
				if(callback.create)
					callback.create(temp[0]);

				temp.insertAfter(exist[index !== 0 ? index - 1 : (exist.length - 1)]);
			}

			else{
				// Create
				if(insertBefore){
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
						processElement(lastLength - 1);

					else if(name === 'push')
						processElement(lastLength, true);

					else if(name === 'shift')
						processElement(0);

					else if(name === 'splice'){
						if(arguments.length >= 3){ // Inserting data
							arguments[0] = false;
							name = 'softRefresh';
						}
						else{ // Removing data
							var real = arguments[0];
							if(real < 0) real = lastLength + real;

							var limit = arguments[1];
							if(!limit) limit = oldArray.length;
							
							for (var i = limit - 1; i >= 0; i--) {
								processElement(real + i);
							}
						}
					}

					else if(name === 'unshift')
						processElement(0, true, true);

					if(name === 'softRefresh'){
						if(arguments[0] || arguments[0] === 0)
							processElement(arguments[0], !!oldArray[arguments[0]]);
						else {
							var foundChanges = false;

							// Removal
							if(oldArray.length > this.length){
								for (var i = oldArray.length - 1; i >= this.length; i--) {
									if(this.indexOf(oldArray[i]) === -1){
										foundChanges = true;
										processElement(i);
									}
								}
							}

							// Creates
							if(oldArray.length < this.length){
								for (var i = oldArray.length - 1; i < this.length; i++) {
									foundChanges = true;
									processElement(i, true, true);
								}
							}

							// Update
							for (var i = 0; i < this.length; i++) {
								if(compareObject(oldArray[i], this[i]) === false){
									foundChanges = true;
									processElement(i, true);
								}
							}

							if(foundChanges)
								oldArray = this.slice(0);
						}
					}
					else if(name === 'hardRefresh'){
						oldArray = this.slice(0);
						processElement(-1);
					}
					else Array.prototype[name].apply(oldArray, arguments);

					return temp;
				}
			});
		}

		for (var i = 0; i < editProperty.length; i++) {
			propertyProxy(list, editProperty[i]);
		}
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

	var loopParser = function(name, content, script, targetNode){
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
			Object.defineProperty(self.root[name], method[1], {
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
			bindArray(content, items, mask, name, method[1], targetNode);
		}
		return returns;
	}

	var bindInput = function(targetNode){
		$('input[sf-bound]', targetNode).each(function(){
			var element = $(this);
			var model = element.parents('[sf-controller]').attr('sf-controller');
			if(!model) return;

			var whichVar = element.attr('sf-bound');

			// Get reference
			if(typeof self.root[model][whichVar] === undefined){
				console.error('Cannot get reference for self.root["' + model + '"]["' + whichVar+'"]');
				return;
			}

			element.attr('sf-bounded', whichVar);
			element.removeAttr('sf-bound');

			// Bound key up
			element.keyup(function(e){
				self.root[model][whichVar] = element.val();
			});

			// Bind value
			element.attr('value', '{{'+whichVar+'}}');
			bindObject(element, self.root[model], whichVar, 'attr');
		});
	}

	var alreadyInitialized = false;
	self.init = function(targetNode){
		if(alreadyInitialized) return;
		alreadyInitialized = true;
		setTimeout(function(){
			alreadyInitialized = false;
		}, 50);

		targetNode = targetNode ? $(targetNode)[0] : document.body;
		self.parsePreprocess(self.queuePreprocess(targetNode));
		bindInput(targetNode);

		$('[sf-repeat-this]', targetNode).each(function(){
			var self = $(this);
			var parent = self.parent();

			var after = self.next();
			if(!after.length || self[0] === after[0])
				after = false;

			var before = self.before();
			if(!before.length || self[0] === before[0])
				before = false;

			var script = self.attr('sf-repeat-this');
			self.removeAttr('sf-repeat-this');
			var controller = sf.controller.modelName(this);

			var content = this.outerHTML;

			// Check if the element was already bound to prevent vulnerability
			if(/sf-bind-id|sf-bind-list/.test(content))
				throw "Can't parse element that already bound";

			var data = loopParser(controller, content, script, targetNode);
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
		var model = sf.controller.modelName(element);

		$('[sf-bind-id], [sf-bind-list], [sf-bounded], [sf-repeat-this]', element).each(function(){
			removeBinding(this, model);
		});

		removeBinding(element);
	}

	$(function(){
		if(typeof MutationObserver === 'function' && MutationObserver.prototype.observe){
			var observer = new MutationObserver(function(records){
				if(!bindingEnabled) return;

				for(var i in records){
					for(var a in records[i].removedNodes){
						var tagName = records[i].removedNodes[a].nodeName;
						if(tagName !== 'TEXT' || tagName !== '#comment') continue;
						DOMNodeRemoved(records[i].removedNodes[a]);
					}
				}
			});
			observer.observe(document.body, { childList: true, subtree: true });
		}
		else {
			document.body.addEventListener('DOMNodeRemoved', function(e){
				if(bindingEnabled){
					var tagName = e.target.nodeName;
					if(tagName !== 'TEXT' || tagName !== '#comment') return;
					DOMNodeRemoved(e.target);
				}
			});
		}
	});

	var removeBinding = function(element, modelNames){
		if(!element.attributes) return;

		var attrs = element.attributes;
		if(attrs['sf-bind-id']){
			var id = attrs['sf-bind-id'].value;

			if(!bindRef[id]) return;
			var ref = bindRef[id];

			for (var i = 0; i < ref.propertyName.length; i++) {
				var value = ref.object[ref.propertyName[i]];
				Object.defineProperty(ref.object, ref.propertyName[i], {
					configurable: true,
					enumerable:true,
					writable:true,
					value:value
				});
			}

			delete bindRef[id];

			// Remove callback left
			var cache = bindRef.cache
			for(var i in cache){
				if(cache[i].callback && cache[i].callback[id])
					delete cache[i].callback[id];
				if($.isEmptyObject(cache[i].callback))
					delete cache[i];
			}

			if(cache[id]){
				delete cache[id].attrs;
				delete cache[id].innerHTML;
				delete cache[id].modelName;
				delete cache[id].model;
				delete cache[id].created;
				delete cache[id].element;
			}

			bindRef.length--;
			if(bindRef.length === 0)
				bindRef.index = 0;
		}

		if(!modelNames) return;

		var propertyName = false;
		if(attrs['sf-bind-list'])
			propertyName = attrs['sf-bind-list'].value;

		if(attrs['sf-repeat-this'])
			propertyName = attrs['sf-repeat-this'].value.split(' in ')[1];

		if(attrs['sf-bounded'])
			propertyName = attrs['sf-bounded'].value;

		for (var i = 0; i < modelNames.length; i++) {
			var modelRef = self.root[modelNames[i]];
			if(!modelRef[propertyName]) continue;

			var value = modelRef[propertyName].slice(0);
			Object.defineProperty(modelRef, propertyName, {
				configurable: true,
				enumerable:true,
				writable:true,
				value:value
			});
		}
	}

	/*{
		id:{
			object,
			[propertyName]
		}
	}*/
	// For resetting object property it the element was removed from DOM
	var bindRef = {length:0, index:0, cache:{}};
	self.bindRef = bindRef;
	var dcBracket = /{{[\s\S]*?}}/;
	var bindObject = function(element, object, propertyName, which){
		if(!(element instanceof Node))
			element = element[0];

		// Get reference for debugging
		processingElement = element;

		// First initialization
		var id = bindRef.index;
		$(element).attr('sf-bind-id', id);

		bindRef.index++;
		bindRef.length++;
		bindRef.cache[id] = {};
		var cache = bindRef.cache[id];

		cache.attrs = {};
		cache.innerHTML = '';
		cache.modelName = sf.controller.modelName(element);
		cache.model = self.root[cache.modelName];
		cache.created = Date.now();

		if(which === 'attr' || !which){
			for(var i in element.attributes){
				// Check if it has a bracket
				if(!dcBracket.test(element.attributes[i].value))
					continue;

				var attrName = element.attributes[i].name;
				cache.attrs[attrName] = element.attributes[i].value;

				if(attrName === 'value')
					element.removeAttribute(attrName);
			}
		}

		if(which === 'html' || !which)
			cache.innerHTML = element.innerHTML;

		// Get current object reference
		if(!bindRef[id]) bindRef[id] = {object:object, propertyName:[]};
		bindRef[id].propertyName.push(propertyName);

		cache.element = $(element);
		var callbackFunction = function(){
			if(which === 'attr' || !which){
				for(var name in cache.attrs){
					if(cache.attrs[name].indexOf(propertyName) === -1)
						continue;

					var temp = dataParser(cache.attrs[name], cache.model, false, cache.modelName);
					if(name === 'value')
						cache.element.val(temp);
					else
						cache.element.attr(name, temp);
					break;
				}
			}

			if(which === 'html' || !which){
				var temp = uniqueDataParser(cache.innerHTML, cache.model, false, cache.modelName);
				temp = dataParser(temp, cache.model, false, cache.modelName);
				cache.element.html(temp);
			}
		};

		if(Object.getOwnPropertyDescriptor(cache.model, propertyName)['set']){
			for(var i in bindRef){
				if(cache.model === bindRef[i].object && bindRef[i].propertyName.indexOf(propertyName) !== -1){
					bindRef.cache[i].callback[id] = callbackFunction;
					break;
				}
			}
			return;
		}

		cache.callback = {};
		cache.callback[id] = callbackFunction;

		var objValue = object[propertyName]; // Object value
		Object.defineProperty(object, propertyName, {
			enumerable: true,
			configurable: true,
			get:function(){
				return objValue;
			},
			set:function(val){
				objValue = val;

				for(var i in cache.callback){
					cache.callback[i]();
				}

				return objValue;
			}
		});
	}

	self.bindElement = function(element, which){
		var modelName = sf.controller.modelName(element);
		var model = self.root[modelName];
		if(!model) return console.error("Model for "+modelName+" was not found while binding:", element);

		var html = element.outerHTML;

		// Check if the child element was already bound to prevent vulnerability
		if(/sf-bind-id|sf-bind-list/.test(html))
			throw "Can't parse element that already bound";

		if(which === 'attr')
			html = html.replace(element.innerHTML, '');

		var brackets = /{{([\s\S]*?)}}/g;
		var scopeMask = RegExp('\\b[^.]|^|\\n| +|\\t|\\W ('+self.modelKeys(model)+')'+sf.regex.avoidQuotes+'\\b', 'g');
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
				if(attrs['sf-bind-id'] || attrs['sf-repeat-this'] || attrs['sf-bind-list']) continue;

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

			// Get reference for debugging
			processingElement = nodes[a];

			// Double check if the child element already bound to prevent vulnerability
			if(/sf-bind-id|sf-bind-list/.test(nodes[a].innerHTML)){
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
}