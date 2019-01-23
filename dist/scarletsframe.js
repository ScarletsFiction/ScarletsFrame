(function(global, factory){
  var $ = null;
  if(typeof exports === 'object' && typeof module !== 'undefined'){
  	try { $ = require("dom7") }catch(e){
  		try { $ = require("jquery") }catch(e){}
  	}

  	if($ === null){
  		console.log("ScarletsFrame can't load jQuery or Dom7!");
  		return;
  	}

  	module.exports = factory($);
  }

  else{
	if(typeof Dom7 !== 'undefined')
		$ = Dom7;
	else if(typeof jQuery !== 'undefined')
		$ = jQuery;
	else
		throw "Please load jQuery before ScarletsFrame";

  	global.sf = factory($);
  }
}(this, (function($){'use strict';
// ===== Module Init =====

var sf = function(){
	if(arguments[0].constructor === Function){
		return sf.loader.onFinish.apply(null, arguments);
	}
};

sf.internal = {};
sf.regex = {
	// ToDo: Need help to skip escaped quote
	avoidQuotes:'(?=(?:[^"\']*(?:\'|")[^"\']*(?:\'|"))*[^"\']*$)',
	strictVar:'(?=\\b[^.]|^|\\n| +|\\t|\\W )'
};

if(!$.fn.extend){
	$.fn.extend = function(obj){
		for(var func in obj){
			$.fn[func] = obj[func];
		}
	}
}

if(!$.isEmptyObject){
	$.isEmptyObject = function(obj){
		for(var key in obj){
			return false;
		}
		return true
	}
}

// Add animate.css feature on jQuery
$.fn.extend({
  animateCSS: function(animationName, callback, duration) {
	var self = this;
	var animationEnd = {
		animation: 'animationend',
		OAnimation: 'oAnimationEnd',
		MozAnimation: 'mozAnimationEnd',
		WebkitAnimation: 'webkitAnimationEnd',
	};

	for (var t in animationEnd)
		if (self[0].style[t] !== undefined){
			animationEnd = animationEnd[t];
			break;
		}

	if(duration)
		self.css('-webkit-animation-duration', duration+'s').css('animation-duration', duration+'s');

	self.addClass('animated ' + animationName).one(animationEnd, function(){
		setTimeout(function(){
			$(self).removeClass('animated ' + animationName);
		}, 1);

		if(duration)
			$(self).css('-webkit-animation-duration', '').css('animation-duration', '');

		if (typeof callback === 'function') callback();
	});

	return self;
  }
});
// DOM Controller on loaded app
sf.controller = new function(){
	var self = this;
	self.pending = {};
	self.active = {};

	self.for = function(name, func){
		self.pending[name] = func;
	}

	self.modelScope = function(element, func){
		var elem = $(element);
		var model = sf.controller.modelName(element);

		if(!model)
			throw 'model or controller was not found';

		var bindedList = elem.attr('[sf-bind-list]');
		if(!bindedList)
			bindedList = elem.parents('[sf-bind-list]').attr('sf-bind-list');

		if(!bindedList){
			if(func) return func(sf.model.root[model], -1);
			else return sf.model.root[model];
		}

		// Find index
		var bindedListIndex = 0;
		if(bindedList)
			bindedListIndex = elem.parents('[sf-bind-list]').prevAll('[sf-bind-list]').length;

		if(func) return func(sf.model.root[model][bindedList], bindedListIndex);
		else return sf.model.root[model][bindedList][bindedListIndex];
	}

	self.modelName = function(element){
		var name = undefined;
		if(element.attributes['sf-controller'])
			name = element.attributes['sf-controller'].value;
		else
			name = $(element).parents('[sf-controller]').attr('sf-controller');

		// Initialize it first
		if(name !== undefined && !self.active[name])
			self.run(name);

		return name;
	}

	var listenSFClick = function(e){
		var element = $(e.target);
		var script = element.attr('sf-click');

		if(!script){
			element = element.parents('[sf-click]').eq(0);
			script = element.attr('sf-click');
		}

		var model = element.parents('[sf-controller]').attr('sf-controller');

		if(!sf.model.root[model])
			throw "Couldn't find model for "+model+" that was called from sf-click";

		var _modelScope = sf.model.root[model];

		var modelKeys = sf.model.modelKeys(_modelScope);
		var scopeMask = RegExp(sf.regex.strictVar+'('+modelKeys+')'+sf.regex.avoidQuotes+'\\b', 'g');

		script = script.replace(scopeMask, function(full, matched){
			return '_modelScope.'+matched;
		});

		script = script.split('(');

		var method = script[0];
		var method_ = method;

		// Get method reference
		try{
			method = eval(method);
		} catch(e) {
			method = false;
		}

		if(!method){
			console.error("Error on sf-click for model: " + model + ' [Cannot find '+method_+']\n', e.target);
			return;
		}

		// Take the argument list
		script.shift();
		script = script.join('(');
		script = script.split(')');
		script.pop();
		script = script.join('(');

		// Turn argument as array
		if(script.length !== 0)
			script = eval('['+script+']');
		if(!script)
			script = [];

		try{
			method.apply(element[0], script);
		} catch(e) {
			console.error("Error on sf-click for model: " + model + '\n', e.target, '\n', e);
		}
	}

	var root_ = function(scope){
		if(!sf.model.root[scope])
			sf.model.root[scope] = {};

		if(!sf.model.root[scope])
			sf.controller.run(scope);

		return sf.model.root[scope];
	}

	self.run = function(name, func){
		if(!sf.loader.DOMWasLoaded)
			return sf(function(){
				self.run(name, func);
			});

		if(self.pending[name]){
			if(!sf.model.root[name])
				sf.model.root[name] = {};

			self.pending[name](sf.model.root[name], root_);
			self.active[name] = true;
			delete self.pending[name];
		}

		if(func)
			func(sf.model.root[name], root_);
	}

	self.init = function(parent){
		if(!sf.loader.DOMWasLoaded)
			return sf(function(){
				self.init(name);
			});

		$('[sf-controller]', parent ? $(parent)[0] : document.body).each(function(){
			self.run(this.attributes['sf-controller'].value);
		});
	}

	// Create listener for sf-click
	$(document).one('DOMContentLoaded', function(){
		$(document.body).on('click', '[sf-click]', listenSFClick);
	});
}
sf.loader = new function(){
	var self = this;
	self.loadedContent = 0;
	self.totalContent = 0;
	self.DOMWasLoaded = false;
	self.DOMReady = false;
	self.turnedOff = false;

	var whenDOMReady = [];
	var whenDOMLoaded = [];
	var whenProgress = [];

	self.off = function(){
		self.turnedOff = true;
	}

	// Make event listener
	self.onFinish = function(func){
		if(self.DOMWasLoaded) return func();
		if(whenDOMLoaded.indexOf(func) !== -1) return;
		whenDOMLoaded.push(func);
	}
	self.domReady = function(func){
		if(self.DOMReady) return func();
		if(whenDOMReady.indexOf(func) !== -1) return;
		whenDOMReady.push(func);
	}
	self.onProgress = function(func){
		if(self.DOMWasLoaded) return func(self.loadedContent, self.totalContent);
		if(whenProgress.indexOf(func) !== -1) return;
		whenProgress.push(func);
	}

	self.f = function(element){
		self.loadedContent++;
		for (var i = 0; i < whenProgress.length; i++) {
			whenProgress[i](self.loadedContent, self.totalContent);
		}
		if(element && element.removeAttribute) element.removeAttribute('onload');
	}

	self.css = function(list){
		if(self.DOMWasLoaded){
			// check if some list was loaded
			for (var i = list.length - 1; i >= 0; i--) {
				if($('link[href*="'+list[i]+'"]').length!==0)
					list.splice(i, 1);
			}
			if(list.length === 0) return;
		}
		self.totalContent = self.totalContent + list.length;
		var temp = '';
		for(var i = 0; i < list.length; i++){
			temp += '<link onload="sf.loader.f(this);" rel="stylesheet" href="'+list[i]+'">';
		}

		self.domReady(function(){
			document.getElementsByTagName('body')[0].innerHTML += temp;
		});
	}

	self.js = function(list){
		if(self.DOMWasLoaded){
			// check if some list was loaded
			for (var i = list.length - 1; i >= 0; i--) {
				if($('script[src*="'+list[i]+'"]').length!==0)
					list.splice(i, 1);
			}
			if(list.length === 0) return;
		}
		self.totalContent = self.totalContent + list.length;
		for(var i = 0; i < list.length; i++){
			$.ajax({
			  url: list[i],
			  dataType: "script",
			  cache: true,
			  complete: sf.loader.f
			});
		}
	}

	setTimeout(function(){
		if(self.totalContent === 0 && !self.turnedOff){
			self.loadedContent = self.totalContent = 1;
			console.warn("If you don't use content loader feature, please turn it off with `sf.loader.off()`");
		}
	}, 10000);
	var everythingLoaded = setInterval(function() {
	if (/loaded|complete/.test(document.readyState)) {
		if(self.DOMReady === false){
			self.DOMReady = true;
			for (var i = 0; i < whenDOMReady.length; i++) {
				try{
					whenDOMReady[i]();
				} catch(e) {
					console.error(e);
				}
			}
		}

		if(self.loadedContent < self.totalContent || self.loadedContent === 0){
			if(!self.turnedOff)
				return;
		}

		clearInterval(everythingLoaded);
		self.DOMWasLoaded = true;
		for (var i = 0; i < whenDOMLoaded.length; i++) {
			try{
				whenDOMLoaded[i]();
			} catch(e){
				console.error(e);
			}
		}
		whenProgress.splice(0);
		whenDOMReady.splice(0);
		whenDOMLoaded.splice(0);
		whenProgress = whenDOMReady = whenDOMLoaded = null;

		// Last init
		sf.controller.init();
		sf.model.init();
		sf.router.init();
	}
	}, 100);
};
sf.prototype.constructor = sf.loader.onFinish;

// Find images
sf.loader.domReady(function(){
	$('img:not(onload)[src]').each(function(){
		sf.loader.totalContent++;
		this.setAttribute('onload', "sf.loader.f(this)");
	});
}, 0);
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
sf.router = new function(){
	var self = this;
	self.loading = false;
	self.enabled = false;
	self.pauseRenderOnTransition = false;
	self.currentPage = [];
	var initialized = false;
	var lazyRouting = false;
	var currentRouterURL = '';

	// Should be called if not using lazy page load
	self.init = function(targetNode){
		if(!sf.loader.DOMWasLoaded)
			return sf(function(){
				self.init();
			});

		// Reinit lazy router
		self.lazy();

		// Run 'before' event for new page view
		$('[sf-controller], [sf-page]', $(targetNode)[0]).each(function(){
			if(this.attributes['sf-controller'])
				sf.controller.run(this.attributes['sf-controller'].value);
			
			if(this.attributes['sf-page']){
				var name = this.attributes['sf-page'].value;
				beforeEvent(name);
			}
		});

		initialized = true;
		currentRouterURL = window.location.pathname;
	}

	self.enable = function(status){
		if(status === undefined) status = true;
		if(self.enabled === status) return;
		self.enabled = status;

		if(status)
			self.lazy();
		else{
			$('a[href][onclick]').each(function(){
				var current = $(this);
				if(current.attr('onclick') === 'return sf.router.load(this)')
					current.removeAttr('onclick');
			});
		}

		window.addEventListener('popstate', function(event) {
			// Don't continue if the last routing was error
			if(routingError){
				routingError = false;
				return;
			}

			routingBack = true;
			self.goto(window.location.pathname);
		}, false);
	}

	var before = {};
	// Set index with number if you want to replace old function
	self.before = function(name, func, index){
		if(!before[name])
			before[name] = [];

		if(index === undefined){
			if(before[name].indexOf(func) === -1)
				before[name].push(func);
		}
		else
			before[name][index] = func;
	}

	var after = {};
	// Set index with number if you want to replace old function
	self.after = function(name, func, index){
		if(!after[name])
			after[name] = [];

		if(index === undefined){
			if(after[name].indexOf(func) === -1)
				after[name].push(func);
		}
		else
			after[name][index] = func;
	}

	var root_ = function(scope){
		if(!sf.model.root[scope])
			sf.model.root[scope] = {};

		if(!sf.model.root[scope])
			sf.controller.run(scope);
		
		return sf.model.root[scope];
	}

	// Running 'before' new page going to be displayed
	var beforeEvent = function(name){
		if(self.currentPage.indexOf(name) === -1)
			self.currentPage.push(name);

		if(before[name]){
			for (var i = 0; i < before[name].length; i++) {
				before[name][i](root_);
			}
		}
	}

	// Running 'after' old page going to be removed
	var afterEvent = function(name){
		if(self.currentPage.indexOf(name) === -1)
			self.currentPage.splice(self.currentPage.indexOf(name), 1);

		if(after[name]){
			for (var i = 0; i < after[name].length; i++) {
				after[name][i](root_);
			}
		}
	}

	var onEvent = {
		'loading':[],
		'loaded':[],
		'special':[],
		'error':[]
	};
	self.on = function(event, func){
		if(onEvent[event].indexOf(func) === -1)
			onEvent[event].push(func);
	}

	self.lazyViewPoint = {};
	/*
		{
			oldURlPattern:{
				newURLPattern:'.viewPoint'
			}
		}
	*/
	self.lazy = function(){
		if(!self.enabled) return;

		$('a[href]:not([onclick])').each(function(){
			var url = this.href;
			if(url.indexOf('#') !== -1)
				return;

			if(url.indexOf(window.location.origin) !== 0 && url.charAt(0) !== '/')
				return; //Not current domain origin

			$(this).attr('onclick', 'return sf.router.load(this)');
		});
	}

	self.load = function(elem){
		if(!history.pushState || $(elem).attr('sf-router') == 'ignore')
			return true;

		return !self.goto(elem.href.replace(window.location.origin, ''));
	}

	var RouterLoading = false;
	var routingBack = false;
	var routingError = false;
	self.goto = function(path, data, method){
		if(!method) method = 'GET';
        else method = method.toUpperCase();

		for (var i = 0; i < onEvent['loading'].length; i++) {
			if(onEvent['loading'][i](path)) return;
		}
		var oldPath = window.location.pathname;
		initialized = false;

		if(RouterLoading) RouterLoading.abort();
		RouterLoading = $.ajax({
			url:window.location.origin + path,
			method:method,
            data:Object.assign(data, {
                _scarlets:'.dynamic.'
            }),
			success:function(data){
				if(initialized) return;
				lazyRouting = true;

				// Run 'loaded' event
				RouterLoading = false;

				// Find special data
				var regex = RegExp('<!-- SF-Special:(.*?)-->'+sf.regex.avoidQuotes, 'gm');
				var special = regex.exec(data);
				if(special && special.length !== 1){
					special = special[1].split('--|&>').join('-->');
					special = JSON.parse(special);

					if(!$.isEmptyObject(special)){
						for (var i = 0; i < onEvent['special'].length; i++) {
							if(onEvent['special'][i](special)) return;
						}
					}
				}

				var DOMReference = false;
				var foundAction = function(ref){
					DOMReference = $(ref);

					// Run 'after' event for old page view
					afterEvent($('[sf-page]', DOMReference[0]).attr('sf-page'));

					// Redefine title if exist
					if(special && special.title)
						$('head title').html(special.title);

					found = true;
				};

				var found = false;
				for(var oldURL in self.lazyViewPoint){
					if(currentRouterURL.indexOf(oldURL) !== -1){
						for(var newURL in self.lazyViewPoint[oldURL]){
							if(currentRouterURL.indexOf(oldURL) !== -1){
								foundAction(self.lazyViewPoint[oldURL][newURL]);
								break;
							}
						}
					}
					if(found) break;
				}

				// When the view point was not found
				if(!found){
					// Use fallback if exist
					if(sf.router.lazyViewPoint["@default"])
						foundAction(sf.router.lazyViewPoint["@default"]);

					if(!found){
						for (var i = 0; i < onEvent['error'].length; i++) {
							onEvent['error'][i]('sf.router.lazyViewPoint["'+oldURL+'"]["'+newURL+'"] was not found');
						}
					}
				}

				// Reinit lazy router
				self.lazy();

				// Run 'before' event for new page view
				if(!DOMReference) DOMReference = $(document.body);
				if(self.pauseRenderOnTransition)
					self.pauseRenderOnTransition.css('display', 'none');

				// Let page script running first, then update the data binding
				DOMReference.html(data);

				// Parse the DOM data binding
				sf.model.init(DOMReference);

				// Init template to model binding
				$('[sf-page]', DOMReference[0]).each(function(){
					if(this.attributes['sf-page'])
						beforeEvent(this.attributes['sf-page'].value);
				});

				if(self.pauseRenderOnTransition)
					self.pauseRenderOnTransition.css('display', '');

				routerLoaded(currentRouterURL, path, DOMReference);

				initialized = true;
				lazyRouting = false;

				currentRouterURL = path;
				routingError = false;
			},
			error:function(xhr, data){
				routingError = true;
				if(xhr.aborted) return;

				RouterLoading = false;
				for (var i = 0; i < onEvent['error'].length; i++) {
					onEvent['error'][i](xhr.status, data);
				}

				// Back on error
				window.history.back();
			}
		});

		if(!routingBack)
			window.history.pushState(null, "", path);

		routingBack = false;
		return true;
	}

	// Trigger loaded event
	function routerLoaded(currentRouterURL, path, data){
		for (var i = 0; i < onEvent['loaded'].length; i++) {
			onEvent['loaded'][i](currentRouterURL, path, data);
		}
	}
};
sf.internal.virtual_scroll = new function(){
	var self = this;
	var styleInitialized = false;
	var scrollingByScript = false;

	// before and after
	self.prepareCount = 4; // 4, 8, 12, 16, ...

	self.handle = function(list, targetNode, parentNode){
		if(!styleInitialized){
			initStyles();
			styleInitialized = true;
		}

		list.$virtual.elements = function(){
			return obtainElements(list, parentNode);
		}

		list.$virtual.dCursor = { // DOM Cursor
			ceiling:parentNode.querySelector('.virtual-spacer.ceiling'),
			floor:parentNode.querySelector('.virtual-spacer.floor')
		};

		list.$virtual.bounding = {
			ceiling:-1,
			floor:0
		}

		list.$virtual.vCursor = { // Virtual Cursor
			ceiling:null, // for forward direction
			floor:null // for backward direction
		}

		list.$virtual.targetNode = parentNode;
		list.$virtual.DOMCursor = 0; // cursor of first element in DOM tree as a cursor

		list.$virtual.scrollHeight = 
			list.$virtual.dCursor.floor.offsetTop - 
			list.$virtual.dCursor.ceiling.offsetTop;

		var scroller = null;
		list.$virtual.destroy = function(){
			$(scroller).off('scroll');
			$(parentNode).off('mousedown mouseup');
			list.$virtual.dom.innerHTML = '';
			offElementResize(parentNode);
			delete list.$virtual;
		}

		list.$virtual.resetViewport = function(){
			list.$virtual.visibleLength = Math.floor(scroller.clientHeight / list.$virtual.scrollHeight);
			list.$virtual.preparedLength = list.$virtual.visibleLength + self.prepareCount * 2;
		}

		setTimeout(function(){
			scroller = parentNode;

			var length = parentNode.getAttribute('scroll-parent-index') || 0;
			for (var i = 0; i < length; i++) {
				scroller = scroller.parentElement;
			}

			list.$virtual.resetViewport();

			if(parentNode.classList.contains('sf-list-dynamic'))
				dynamicHeight(list, targetNode, parentNode, scroller);
			else
				staticHeight(list, targetNode, parentNode, scroller);
		}, 500);
	}

	// Recommended for a list that have different element height
	function dynamicHeight(list, targetNode, parentNode, scroller){
		var virtual = list.$virtual;
		var ceiling = virtual.dCursor.ceiling;
		var floor = virtual.dCursor.floor;
		var vCursor = virtual.vCursor;
		vCursor.floor = virtual.dom.firstElementChild;
		
		virtual.scrollTo = function(index){
			scrollTo(index, list, self.prepareCount, parentNode, scroller);
		}

		virtual.refresh = function(force){
			refresh(force, list, self.prepareCount, parentNode, scroller);
		}

		// Insert some element until reach visible height
		fillViewport();

		virtual.visibleLength = parentNode.childElementCount - 2;
		virtual.preparedLength = virtual.visibleLength + self.prepareCount * 2;

		for (var i = 0; i < self.prepareCount; i++) {
			var temp = vCursor.floor;
			if(temp === null) break;

			vCursor.floor = temp.nextElementSibling;
			floor.insertAdjacentElement('beforeBegin', temp);
		}
		virtual.DOMCursor = 0;

		var ceilingHeight = 0;
		var floorHeight = 0;
		function previousCeiling(){
			var temp = null;
			var resetCeiling = false;

			// Add some element on the ceiling
			for (var i = 0; i < self.prepareCount; i++) {
				if(vCursor.floor === null)
					temp = virtual.dom.lastElementChild;
				else
					temp = vCursor.floor.previousElementSibling;

				if(temp === null) break;
				vCursor.ceiling = temp.previousElementSibling;
				virtual.DOMCursor--;

				ceiling.insertAdjacentElement('afterEnd', temp);

				if(ceilingHeight > 0)
					ceilingHeight -= getAbsoluteHeight(temp);

				if(virtual.DOMCursor < self.prepareCount && !resetCeiling){
					i = 0;
					resetCeiling = true;
					temp = null;
				}
			}

			if(ceilingHeight < 0 || temp === null)
				ceilingHeight = 0;

			var length = parentNode.childElementCount - 2 - list.$virtual.preparedLength;
			// Remove some element on the floor
			for (var i = 0; i < length; i++) {
				temp = floor.previousElementSibling;
				floorHeight += getAbsoluteHeight(temp);

				if(vCursor.floor === null)
					virtual.dom.insertAdjacentElement('beforeEnd', temp);
				else vCursor.floor.insertAdjacentElement('beforeBegin', temp);

				vCursor.floor = temp;
			}

			if(vCursor.floor === null)
				vCursor.ceiling = virtual.dom.lastElementChild;
			else 
				vCursor.ceiling = vCursor.floor.previousElementSibling;

			ceiling.style.height = ceilingHeight+'px';
			floor.style.height = floorHeight+'px';
		}

		function fillViewport(){
			// Insert some element depend on prepared length
			var length = virtual.preparedLength - (parentNode.childElementCount - 2);
			for (var i = 0; i < length; i++) {
				if(vCursor.ceiling === null)
					temp = virtual.dom.firstElementChild;
				else
					temp = vCursor.ceiling.nextElementSibling;

				if(temp === null) break;
				vCursor.floor = temp.nextElementSibling;

				floor.insertAdjacentElement('beforeBegin', temp);
			}
		}

		function nextFloor(){
			var temp = null;
			fillViewport();

			if(vCursor.ceiling === null)
				vCursor.ceiling = vCursor.floor.previousElementSibling;

			// Add extra element based on prepare count
			for (var i = 0; i < self.prepareCount; i++) {
				temp = vCursor.floor;
				if(temp === null) break;

				vCursor.floor = temp.nextElementSibling;
				floor.insertAdjacentElement('beforeBegin', temp);

				if(floorHeight > 0)
					floorHeight -= getAbsoluteHeight(temp);
			}

			if(floorHeight < 0 || temp === null)
				floorHeight = 0;

			// Remove some element on the ceiling
			var length = parentNode.childElementCount - 2 - list.$virtual.preparedLength;
			for (var i = 0; i < length; i++) {
				temp = ceiling.nextElementSibling;
				ceilingHeight += getAbsoluteHeight(temp);
				virtual.DOMCursor++;

				if(vCursor.ceiling === null)
					virtual.dom.insertAdjacentElement('afterBegin', temp);
				else vCursor.ceiling.insertAdjacentElement('afterEnd', temp);

				vCursor.ceiling = temp;
			}

			if(vCursor.ceiling === null)
				vCursor.floor = virtual.dom.firstElementChild;
			else 
				vCursor.floor = vCursor.ceiling.nextElementSibling;

			ceiling.style.height = ceilingHeight+'px';
			floor.style.height = floorHeight+'px';
		}

		var bounding = virtual.bounding;
		refreshScrollBounding(0, bounding, list, parentNode);

		var updating = false;
		function checkCursorPosition(){
			if(updating || scrollingByScript) return;
			updating = true;

			if(scroller.scrollTop < bounding.ceiling){
				// console.log('back', bounding, scroller.scrollTop, virtual.DOMCursor);
				previousCeiling();
				refreshScrollBounding(virtual.DOMCursor, bounding, list, parentNode);
				// console.warn('back', bounding, scroller.scrollTop, virtual.DOMCursor);
			}

			else if(scroller.scrollTop > bounding.floor){
				// console.log('front', bounding, scroller.scrollTop, virtual.DOMCursor);
				nextFloor();
				refreshScrollBounding(virtual.DOMCursor, bounding, list, parentNode);
				// console.warn('front', bounding, scroller.scrollTop, virtual.DOMCursor);
			}

			updating = false;
		}

		$(scroller).on('scroll', checkCursorPosition);
		onElementResize(parentNode, function(){
			refreshScrollBounding(virtual.DOMCursor, bounding, list, parentNode);
		});
	}

	// Recommended for a list that have similar element height
	function staticHeight(list, targetNode, parentNode, scroller){
		var virtual = list.$virtual;
		var ceiling = virtual.dCursor.ceiling;
		var floor = virtual.dCursor.floor;

		// Insert visible element to dom tree
		var insertCount = virtual.preparedLength <= list.length ? virtual.preparedLength : list.length;
		for (var i = 0; i < insertCount; i++) {
			if(virtual.dom.firstElementChild === null)
				break;

			floor.insertAdjacentElement('beforeBegin', virtual.dom.firstElementChild);
		}

		function refreshVirtualSpacer(cursor){
			if(cursor >= self.prepareCount){
				ceiling.style.height = (cursor - self.prepareCount) * virtual.scrollHeight + 'px';
				floor.style.height = (list.length - virtual.preparedLength - cursor) * virtual.scrollHeight + 'px';
			}
			else{
				ceiling.style.height = cursor * virtual.scrollHeight + 'px'; //'0px';
				var count = (list.length - virtual.preparedLength);
				floor.style.height = (count || 0) * virtual.scrollHeight + 'px';
			}
		}

		var bounding = virtual.bounding;

		refreshVirtualSpacer(0);
		refreshScrollBounding(self.prepareCount, bounding, list, parentNode);
		bounding.ceiling = -1;

		virtual.offsetTo = function(index){
			return index * virtual.scrollHeight + ceiling.offsetTop;
		}

		var vCursor = virtual.vCursor;
		vCursor.floor = virtual.dom.firstElementChild;
		virtual.scrollTo = function(index){
			scrollTo(index, list, self.prepareCount, parentNode, scroller, refreshVirtualSpacer);
		}

		virtual.refresh = function(force){
			refresh(force, list, self.prepareCount, parentNode, scroller, checkCursorPosition, refreshVirtualSpacer);
		}

		var updating = false;
		var fromCeiling = true;
		var scrollFocused = false;
		function checkCursorPosition(){
			if(updating || scrollingByScript || scroller.scrollTop >= bounding.ceiling && scroller.scrollTop <= bounding.floor){
				// Fix chrome scroll anchoring bugs when scrolling at corner
				if(scrollFocused){
					if(scroller.scrollTop === 0 || scroller.scrollTop === scroller.scrollHeight - scroller.clientHeight){
						removeUserScrollFocus(scroller);
						scrollFocused = false;
					}
				}
				return;
			}

			var cursor = Math.floor(scroller.scrollTop / virtual.scrollHeight);
			if(cursor + virtual.preparedLength > list.length)
				cursor = list.length - virtual.preparedLength;

			if(fromCeiling){
				if(cursor < self.prepareCount*2)
					cursor -= self.prepareCount;

				// Fix chrome scroll anchoring bugs
				if(scrollFocused){
					removeUserScrollFocus(scroller);
					scrollFocused = false;
				}
				fromCeiling = false;
			}

			if(cursor < self.prepareCount){
				cursor = 0;
				fromCeiling = true;
			}

			updating = true;

			var changes = cursor - virtual.DOMCursor;
			if(cursor + changes >= list.length)
				changes = cursor + changes - list.length;

			if(changes === 0){ // This should be fixed to improve performance and future bugs
				//console.warn("No changes (The scroll bounding is not correct)");
				updating = false;
				return;
			}

			virtual.DOMCursor = cursor;

			//console.log(cursor, changes);

			//console.log(cursor, changes, bounding.ceiling, bounding.floor, scroller.scrollTop);
			moveElementCursor(changes, list);
			refreshVirtualSpacer(cursor);
			refreshScrollBounding(cursor, bounding, list, parentNode);
			//console.log('a', bounding.ceiling, bounding.floor, scroller.scrollTop);

			updating = false;
		}

		$(scroller).on('scroll', checkCursorPosition);

		// For preventing scroll jump if scrolling over than viewport
		if(scroller === parentNode && navigator.userAgent.indexOf('Chrom') !== -1){
			$(parentNode).on('mousedown', function(){
				scrollFocused = true;
			});
			$(parentNode).on('mouseup', function(){
				scrollFocused = false;
			});
		}
	}

	function refreshScrollBounding(cursor, bounding, list, parentNode){
		var temp = Math.floor(self.prepareCount / 2); // half of element preparation
		if(cursor < self.prepareCount){
			bounding.ceiling = -1;
			bounding.floor = parentNode.children[self.prepareCount * 2 + 1];

			if(bounding.floor !== undefined)
				bounding.floor = bounding.floor.offsetTop;
			else bounding.floor = parentNode.lastElementChild.offsetTop + 1000;

			return;
		}
		else if(parentNode.children[temp + 1] !== undefined)
				bounding.ceiling = parentNode.children[temp + 1].offsetTop; // -2 element

		if(list.$virtual.preparedLength !== undefined && cursor >= list.length - list.$virtual.preparedLength)
			bounding.floor = list.$virtual.dCursor.floor.offsetTop + list.$virtual.scrollHeight*2;
		else{
			bounding.floor = parentNode.children[self.prepareCount + 3].offsetTop; // +2 element

			if(parentNode.hasAttribute('scroll-reduce-floor')){
				bounding.floor -= parentNode.getAttribute('scroll-reduce-floor');
				bounding.ceiling -= parentNode.getAttribute('scroll-reduce-floor');
			}
		}
	}

	function moveElementCursor(changes, list){
		var vDOM = list.$virtual.dom;
		var vCursor = list.$virtual.vCursor;
		var dCursor = list.$virtual.dCursor;

		if(changes > 0){ // forward
			var ref = 0;

			// Select from virtual ceiling cursor to Dom tree
			for (var i = 0; i < changes; i++) { // vDom -> Dom tree
				if(vCursor.ceiling === null)
					ref = vDOM.firstElementChild;

				else ref = vCursor.ceiling.nextElementSibling;
				dCursor.floor.insertAdjacentElement('beforeBegin', ref);
			}

			// Move element on the ceiling to vDom
			for (var i = changes; i > 0; i--) { // Dom tree -> vDom
				if(vCursor.ceiling === null){
					vCursor.ceiling = dCursor.ceiling.nextElementSibling;
					vDOM.insertAdjacentElement('afterBegin', vCursor.ceiling);
				}
				else{
					ref = dCursor.ceiling.nextElementSibling;
					vCursor.ceiling.insertAdjacentElement('afterEnd', ref);
					vCursor.ceiling = ref;
				}
			}

			vCursor.floor = vCursor.ceiling.nextElementSibling;
		}
		else if(changes < 0){ // backward
			var ref = 0;
			changes = -changes;

			// Select from virtual floor cursor to Dom tree
			for (var i = 0; i < changes; i++) { // vDom -> Dom tree
				if(vCursor.floor === null)
					ref = vDOM.lastElementChild;

				else ref = vCursor.floor.previousElementSibling;
				dCursor.ceiling.insertAdjacentElement('afterEnd', ref);
			}

			// Move element on the floor to vDom
			for (var i = 0; i < changes; i++) { // Dom tree -> vDom
				if(vCursor.floor === null){
					vCursor.floor = dCursor.floor.previousElementSibling;
					vDOM.insertAdjacentElement('beforeEnd', vCursor.floor);
				}

				else{
					ref = dCursor.floor.previousElementSibling;
					vCursor.floor.insertAdjacentElement('beforeBegin', ref);
					vCursor.floor = ref;
				}
			}

			vCursor.ceiling = vCursor.floor.previousElementSibling;
		}
	}

	function scrollTo(index, list, prepareCount, parentNode, scroller, refreshVirtualSpacer){
		var virtual = list.$virtual;
		var reduce = 0;

		if(index >= list.length - virtual.preparedLength){
			reduce -= prepareCount;
			index = list.length - virtual.preparedLength;
		}

		if(index - virtual.DOMCursor === 0 || index >= list.length) return;

		scrollingByScript = true;

		// Already on DOM tree
		if((virtual.DOMCursor === 0 && index < prepareCount + prepareCount/2) ||
			(virtual.DOMCursor + prepareCount/2 > index
			&& virtual.DOMCursor + prepareCount < index))
			scroller.scrollTop = parentNode.children[index - virtual.DOMCursor + 1].offsetTop;

		// Move cursor
		else {
			var temp = null;
			var ceiling = virtual.dCursor.ceiling;
			var floor = virtual.dCursor.floor;
			var vCursor = virtual.vCursor;

			// DOM tree to virtual DOM
			var length = parentNode.childElementCount - 2;
			for (var i = 0; i < length; i++) {
				temp = ceiling.nextElementSibling;

				if(vCursor.floor === null){
					virtual.dom.insertAdjacentElement('beforeEnd', temp);

					if(i === length-1)
						vCursor.floor = temp;
				}
				else vCursor.floor.insertAdjacentElement('beforeBegin', temp);
			}

			if(index >= prepareCount){
				if(index < list.length - virtual.preparedLength)
					index -= prepareCount;
			}
			else{
				reduce = prepareCount - index;
				virtual.DOMCursor = index = 0;
			}

			var insertCount = virtual.preparedLength <= list.length ? virtual.preparedLength : list.length;

			// Virtual DOM to DOM tree
			for (var i = 0; i < insertCount; i++) {
				temp = virtual.dom.children[index];
				if(temp === undefined) break;

				floor.insertAdjacentElement('beforeBegin', temp);
			}
			virtual.DOMCursor = index;

			vCursor.floor = virtual.dom.children[index] || null;
			vCursor.ceiling = vCursor.floor ? vCursor.floor.previousElementSibling : null;

			if(refreshVirtualSpacer)
				refreshVirtualSpacer(index);

			refreshScrollBounding(index, virtual.bounding, list, parentNode);

			temp = parentNode.children[prepareCount - reduce + 1];
			if(temp !== undefined)
				scroller.scrollTop = temp.offsetTop;
		}

		scrollingByScript = false;
	}

	function removeUserScrollFocus(parentNode){
		parentNode.style.overflow = 'hidden';
		setTimeout(function(){
			parentNode.style.overflow = '';
		}, 50);
	}

	function getAbsoluteHeight(el){
	  var styles = window.getComputedStyle(el);
	  var margin = parseInt(styles['marginTop']) + parseInt(styles['marginBottom']);
	  return el.offsetHeight + margin || 0;
	}

	function obtainElements(list, parentNode){
		var exist = [];
		var temp = undefined;

		var length = list.$virtual.DOMCursor;
		for (var i = 0; i < length; i++) {
			temp = list.$virtual.dom.children[i];
			if(temp === undefined) break;
			exist.push(temp);
		}

		length = parentNode.childElementCount - 2;
		for (var i = 1; i <= length; i++) {
			temp = parentNode.children[i];
			if(temp === undefined) break;
			exist.push(temp);
		}

		length = list.length - length - list.$virtual.DOMCursor;
		for (var i = 0; i < length; i++) {
			temp = list.$virtual.dom.children[list.$virtual.DOMCursor + i];
			if(temp === undefined) break;
			exist.push(temp);
		}

		return exist;
	}

	function refresh(force, list, prepareCount, parentNode, scroller, checkCursorPosition, refreshVirtualSpacer){
		var cursor = list.$virtual.DOMCursor;
		var additionalScroll = 0;

		// Find nearest cursor for current view position
		if(force){
			var i = -1;
			var length = list.$virtual.preparedLength;

			do{
				i++;
			} while(i < length && parentNode.children[i].offsetTop < scroller.scrollTop);

			cursor = cursor + i;
			if(cursor > 0) cursor -= 1;

			additionalScroll = scroller.scrollTop - parentNode.children[i].offsetTop;
		}

		// Force move cursor if element in the DOM tree was overloaded
		if(force || parentNode.childElementCount - 2 > list.$virtual.preparedLength){
			list.$virtual.DOMCursor = list.length;
			var moveTo = cursor;
			if(!force)
				moveTo = cursor <= prepareCount ? cursor : (cursor + prepareCount);

			scrollTo(moveTo,
				list,
				prepareCount,
				parentNode,
				scroller,
				refreshVirtualSpacer
			);

			scroller.scrollTop += additionalScroll;
		}

		if(refreshVirtualSpacer)
			refreshVirtualSpacer(cursor);

		if(checkCursorPosition)
			checkCursorPosition();

		refreshScrollBounding(cursor, list.$virtual.bounding, list, parentNode);
	}

	var _onElementResize = [];
	var _onElementResize_timer = -1;
	function onElementResize(parentNode, callback){
		if(_onElementResize_timer === -1){
			_onElementResize_timer = setInterval(function(){
				var temp = null;
				for (var i = _onElementResize.length - 1; i >= 0; i--) {
					temp = _onElementResize[i];

					// Check resize
					if(temp.element.scrollHeight === temp.height
						|| temp.element.scrollWidth === temp.width)
						continue;

					// Check if it's removed from DOM
					if(temp.element.parentElement === null){
						_onElementResize.splice(i, 1);
						continue;
					}

					temp.callback();
				}

				if(_onElementResize.length === 0){
					clearInterval(_onElementResize_timer);
					_onElementResize_timer = -1;
				}
			}, 200);
		}

		_onElementResize.push({
			element:parentNode,
			callback:callback,
			height:parentNode.scrollHeight,
			width:parentNode.scrollWidth
		});
	}

	function offElementResize(parentNode){
		for (var i = _onElementResize.length - 1; i >= 0; i--) {
			if(_onElementResize[i].element === parentNode)
				_onElementResize.splice(i, 1);
		}

		// Interval will be cleared when the array is empty
	}

	function initStyles(){
		var style = document.getElementById('sf-styles');

		if(!style){
			style = document.createElement('style');
			style.id = 'sf-styles';
        	document.head.appendChild(style);
		}

		style.sheet.insertRule(
		'.sf-virtual-list .virtual-spacer{'+
            'visibility: hidden;'+
            'position: relative;'+
            'height: 1px;'+
            'transform-origin: 0 0;'+
            'width: 1px;'+
            'margin: 0;'+
            'padding: 0;'+
            'background: none;'+
            'border: none;'+
            'box-shadow: none;'+
         '}');
	}
};
return sf;

// ===== Module End =====
})));