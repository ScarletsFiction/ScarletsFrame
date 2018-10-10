// Data save and HTML content binding
sf.model = new function(){
	var self = this;
	self.root = {};

	var bindingEnabled = false;

	self.fromElement = function(element, func = false){
		var elem = $(element);
		var model = sf.controller.fromElement(element);

		if(!model)
			throw 'model or controller was not found';

		var bindedList = elem.attr('[sf-bind-list]');
		if(!bindedList)
			bindedList = elem.parents('[sf-bind-list]').attr('sf-bind-list');

		if(!bindedList){
			if(func) return func(self.root[model], -1);
			else return self.root[model];
		}

		// Find index
		var bindedListIndex = 0;
		if(bindedList)
			bindedListIndex = elem.parents('[sf-bind-list]').prevAll('[sf-bind-list]').length;

		if(func) return func(self.root[model][bindedList], bindedListIndex);
		else return self.root[model][bindedList][bindedListIndex];
	}

	self.for = function(name, func){
		if(!self.root[name])
			self.root[name] = {};

		func(self.root[name], self.root);
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
	var dataParser = function(html, _model_, mask, scope, runEval = ''){
		var _modelScope = sf.model.root[scope];

		// Don't match text inside quote, or object keys
		var scopeMask = RegExp('(?<=\\b[^.]|^|\\n| +|\\t|\\W )('+self.modelKeys(_modelScope)+')(?=(?:[^"\']*(?:\'|")[^"\']*(?:\'|"))*[^"\']*$)\\b', 'g');

		if(mask)
			var itemMask = RegExp('(?<=\\b[^.]|^|\\n| +|\\t|\\W )'+mask+'\\.(?=(?:[^"\']*(?:\'|")[^"\']*(?:\'|"))*[^"\']*$)\\b', 'g');

		bindingEnabled = true;

		return html.replace(/{{([^@].*?)}}/g, function(actual, temp){

			// Mask item variable
			if(mask)
				temp = temp.replace(itemMask, function(matched){
					return '_model_.'+matched[0].slice(1);
				});

			// Mask model for variable
			temp = temp.replace(scopeMask, function(full, matched){
				return '_modelScope.'+matched;
			});

			// Prevent vulnerability by remove bracket to avoid a function call
			temp = temp.split('(').join('').split(')').join('');

			// Evaluate
			temp = eval(runEval + temp);

			return temp;
		});
	}

	var uniqueDataParser = function(html, _model_, mask, scope){
		// Get prepared html content
		var _content_ = {
			length:0,
			take:function(passVar, currentIndex){
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

		var VarPass = ['i', 'obj'];
		for (var i = 0; i < VarPass.length; i++) {
			VarPass[i] += ':(typeof '+VarPass[i]+'!="undefined"?'+VarPass[i]+':null)';
		}
		VarPass = '{'+VarPass.join(',')+'}';
		html = html.replace(/{\[(.*?)\]}/gs, function(full, matched){
			_content_[_content_.length] = matched;
			_content_.length++;
			return 'result += _content_.take('+VarPass+', '+(_content_.length - 1)+');';
		});

		var _modelScope = sf.model.root[scope];

		// Don't match text inside quote, or object keys
		var scopeMask = RegExp('(?<=\\b[^.]|^|\\n| +|\\t|\\W )('+self.modelKeys(_modelScope)+')(?=(?:[^"\']*(?:\'|")[^"\']*(?:\'|"))*[^"\']*$)\\b', 'g');

		if(mask)
			var itemMask = RegExp('(?<=\\b[^.]|^|\\n| +|\\t|\\W )'+mask+'\\.(?=(?:[^"\']*(?:\'|")[^"\']*(?:\'|"))*[^"\']*$)\\b', 'g');

		return html.replace(/{{(@.*?)}}/gs, function(actual, temp){
			// Mask item variable
			if(mask)
				temp = temp.replace(itemMask, function(matched){
					return '_model_.'+matched[1].slice(1);
				});

			// Mask model for variable
			temp = temp.replace(scopeMask, function(matched){
				return '_modelScope.'+matched[1].slice(1);
			});

			// Prevent vulnerability by remove bracket to avoid a function call
			temp = temp.split(':');
			temp[0] = temp[0].split('(').join('').split(')').join('');
			temp = temp.join(':');

			var result = '';
			var check = false;

			check = temp.split('@if ');
			if(check.length != 1){
				check = check[1].split(':');
			
				// If condition was meet
				if(eval(check[0])){
					check.shift();
					result = check.join(':');
				}
			}

			// Function arguments should like: function@arg1, arg2
			// And it will converted to: model.function(arg1, arg2)
			check = temp.split('@call');
			if(check.length != 1){
				check = check[1].trim();
				var call = check.split('@');
				var args = [];

				if(call.length !== 1){
					args = call[1];

					args = args.split(' ').join('').split(',');
					for (var a = 0; a < args.length; a++) {
						args[a] = eval(args[a]);
					}
				}

				call = call[0];
				if(!sf.model.root[scope][call])
					throw "'"+call+"' was not available inside '"+scope+"' model";

				var values = sf.model.root[scope][call].apply(null, args);
				result = values;
			}

			// Warning! Avoid unencoded user inputted content
			// And always check/remove closing ']}' in user content
			// Any function call will be removed for addional security
			check = temp.split('@exec');
			if(check.length != 1){
				check = check[1].split('&lt;').join('<').split('&gt;').join('>').split('&amp;').join('&');

				// Allowed: for, if, while
				var regex = /(for|if|while)#(.*?):/gs;
				var match = regex.exec(check);
				while (match !== null) {
				  check = check.replace(match[0], match[1] + '(' + match[2] + ')');
				  match = regex.exec(check);
				}

				var currentIndex = i;
				try{
					eval(check);
				} catch(e) {
					console.error("Error in @exec with message: "+e.message);
					return;
				}
				i = currentIndex;
			}

			return result;
		});
	}

	var bindArray = function(html, list, mask, modelName, propertyName){
		var oldArray = JSON.parse(JSON.stringify(list));
		var editProperty = ['pop', 'push', 'splice', 'shift', 'unshift', 'refreshBind'];
		var processElement = function(index, update = false, insertBefore = false){
			var exist = $("[sf-model='"+modelName+"']");
			if(exist.length === 0)
				exist = $("[sf-controller='"+modelName+"']");

			if(exist.length === 0) return;
			exist = exist.find("[sf-bind-list='"+propertyName+"']");

			var callback = false;
			if(self.root[modelName]['on$'+propertyName])
				callback = self.root[modelName]['on$'+propertyName];

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

			var temp = dataParser(html, item, mask, modelName);
			temp = uniqueDataParser(temp, item, mask, modelName);
			temp = $(temp);

			// Create
			if(!exist[index]){
				if(callback.create)
					callback.create(temp[0]);

				temp.insertAfter(exist[exist.length - 1]);
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

					if(Array.prototype[name])
						temp = Array.prototype[name].apply(this, arguments);

					if(name === 'pop')
						processElement(this.length);

					else if(name === 'push')
						processElement(this.length - 1, true);

					else if(name === 'shift')
						processElement(0);

					else if(name === 'splice'){
						if(arguments.length >= 3){
							arguments[0] = false;
							name = 'refreshBind';
						}
						else{
							var real = arguments[0];
							if(real < 0) real = this.length + real + 1;

							var until = arguments[1];
							if(!until) until = this.length - real;

							for (var i = 0; i < until; i++) {
								processElement(real);
							}
						}
					}

					else if(name === 'unshift')
						processElement(0, true, true);

					if(name === 'refreshBind'){
						if(arguments[0] || arguments[0] === 0)
							processElement(arguments[0], true);
						else {
							var foundChanges = false;
							for (var i = 0; i < this.length; i++) {
								if(JSON.stringify(oldArray[i]) !== JSON.stringify(this[i])){
									foundChanges = true;
									processElement(i, true);
								}
							}
							if(foundChanges)
								oldArray = JSON.parse(JSON.stringify(this));
						}
					}

					return temp;
				}
			});
		}

		for (var i = 0; i < editProperty.length; i++) {
			propertyProxy(list, editProperty[i]);
		}
	}

	var loopParser = function(name, content, script){
		var returns = '';
		var method = script.split(' in ');
		var mask = method[0];

		if(!sf.model.root[name])
			return console.error("Can't parse element because model for '"+name+"' was not found", $(content)[0]);

		var items = self.root[name][method[1]];
		content = $(content).attr('sf-bind-list', method[1])[0].outerHTML;
		content = content.replace(/  +|\t+/g, '');

		if(method.length === 2){
			for(var i in items){
				var item = items[i];

				temp = dataParser(content, item, mask, name);
				temp = uniqueDataParser(temp, item, mask, name);
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
							items.refreshBind(i);
						}
						else items.push(val[i]);
					}

					if(items.length > val.length)
						items.splice(items.length - val.length);

					return items;
				}
			});
			bindArray(content, items, mask, name, method[1]);
		}
		return returns;
	}

	var bindInput = function(){
		$('input[sf-bound]').each(function(){
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

	self.init = function(targetNode = false){
		sf.model.queuePreprocess(targetNode);
		sf.model.parsePreprocess(targetNode);

		$('[sf-repeat-this]').each(function(){
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
			var controller = self.parents('[sf-controller]').attr('sf-controller');

			var content = this.outerHTML;

			var data = loopParser(controller, content, script);
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

	document.addEventListener('DOMNodeRemoved', function(e){
		if(!bindingEnabled || !bindRef.length) return;

		var element = e.target;
		var models = [];
		$(element).find('[sf-controller]').each(function(){
			models.push(this.attributes['sf-controller'].value);
		});

		if(element.attributes && element.attributes['sf-controller'])
			models.push(element.attributes['sf-controller'].value);

		$(element).find('[sf-bind-id], [sf-bind-list], [sf-bounded], [sf-repeat-this]').each(function(){
			removeBinding(this, models);
		});

		removeBinding(element);
	});

	var removeBinding = function(element, modelNames = false){
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

			var value = modelRef[propertyName];
			Object.defineProperty(modelRef, propertyName, {
				configurable: true,
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
	var dcBracket = /{{.*?}}/;
	var bindObject = function(element, object, propertyName, which){
		if(!(element instanceof Node))
			element = element[0];

		// First initialization
		var id = bindRef.index;
		$(element).attr('sf-bind-id', id);

		bindRef.index++;
		bindRef.length++;
		bindRef.cache[id] = {};
		var cache = bindRef.cache[id];

		cache.attrs = {};
		cache.innerHTML = '';
		cache.modelName = sf.controller.fromElement(element);
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

	self.bindElement = function(element, which = false){
		var modelName = sf.controller.fromElement(element);
		var model = self.root[modelName];
		if(!model) return console.error("Model for "+modelName+" was not found while binding:", element);

		var scopeMask = RegExp('(?<=\\b[^.]|^|\\n| +|\\t|\\W )('+self.modelKeys(model)+')(?=(?:[^"\']*(?:\'|")[^"\']*(?:\'|"))*[^"\']*$)\\b', 'g');

		var html = element.outerHTML;
		if(which === 'attr')
			html = html.replace(element.innerHTML, '');

		var brackets = html.match(/(?<={{).*?(?=}})/gs);
		for (var i = 0; i < brackets.length; i++) {
			while ((bindable = scopeMask.exec(brackets[i])) !== null) {
				bindObject(element, model, bindable[i], which);
			}
		}
	}

	self.queuePreprocess = function(targetNode = false){
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
				if(attrs['sf-bind-id'] || attrs['sf-repeat-this'] || attrs['sf-bind-list']) continue;

				for (var a = 0; a < attrs.length; a++) {
					if(attrs[a].value.indexOf('{{') !== -1){
						currentNode.setAttribute('sf-preprocess', 'attronly');
						temp.push(currentNode);
					}
				}

				self.queuePreprocess(currentNode);
			}

			else if(currentNode.nodeType === 3){ // Text
				if(currentNode.nodeValue.indexOf('{{') !== -1){
					currentNode.parentNode.setAttribute('sf-preprocess', '');

					// Reset Siblings
					for (var a = 0; a < temp.length; a++) {
						temp[a].removeAttribute('sf-preprocess');
					}
					return;
				}
			}
		}
	}

	self.parsePreprocess = function(targetNode = false){
		$(targetNode || document.body).find('[sf-preprocess]').each(function(){
			var model = sf.controller.fromElement(this);
			this.removeAttribute('sf-preprocess');

			if(!sf.model.root[model])
				return console.error("Can't parse element because model for '"+model+"' was not found", this);

			self.bindElement(this, $(this).attr('sf-bind'));

			// Avoid editing the outerHTML because it will remove the bind
			var temp = uniqueDataParser(this.innerHTML, sf.model.root[model], false, model);
			this.innerHTML = dataParser(temp, sf.model.root[model], false, model);
			for (var i = 0; i < this.attributes.length; i++) {
				if(this.attributes[i].value.indexOf('{{') !== -1){
					this.attributes[i].value = dataParser(this.attributes[i].value, sf.model.root[model], false, model);
				}
			}
		});

		bindInput();
	}
}