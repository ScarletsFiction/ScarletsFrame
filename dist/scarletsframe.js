(function(global, factory){
  if(typeof exports === 'object' && typeof module !== 'undefined') module.exports = factory(global);
  else global.sf = factory(global);
}(typeof window !== "undefined" ? window : this, (function(window){'use strict';
if(typeof document === undefined)
	document = window.document;
// ===== Module Init =====

var sf = function(){
	if(arguments[0].constructor === Function){
		return sf.loader.onFinish.apply(null, arguments);
	}
};

sf.internal = {};
sf.regex = {
	// ToDo: Need help to skip escaped quote
	getQuotes:/(['"])[\s\S]*?[^\\]\1/g,
	avoidQuotes:'(?=(?:[^"\']*(?:\'|")[^"\']*(?:\'|"))*[^"\']*$)',
	strictVar:'(?=\\b[^.]|^|\\n| +|\\t|\\W )'
};

function isEmptyObject(obj){
	for(var key in obj){
		return false;
	}
	return true
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

function hiddenProperty(obj, property, value){
	Object.defineProperty(obj, property, {
		enumerable: false,
		configurable: true,
		value: value
	});
}

function deepProperty(obj, path){
  for(var i = 0; i < path.length; i++){
    obj = obj[path[i]];
    if(obj === undefined) return obj;
  }
  return obj;
}
sf.dom = function(selector, context){
	if(selector[0] === '<') return sf.dom.parseElement(selector);
	if(selector.constructor !== String) return selector;

	if(context) return context.querySelectorAll(selector);
	return document.querySelectorAll(selector);
}

var $ = sf.dom; // Shortcut

;(function(){
	var self = sf.dom;

	self.findOne = function(selector, context){
		if(context !== undefined) return context.querySelector(selector);
		return document.querySelector(selector);
	}

	self.parent = function(element, selector){
		if(element.closest) return element.closest(selector);

		do {
			if(element.matches(selector) === true)
				return element;

			element = element.parentElement;
		} while (element !== null);

		return null;
	}

	self.prevAll = function(element, selector, isNext){
		var result = [];
		var findNodes = selector === null || selector.constructor !== String ? true : false;

		// Skip current element
		element = isNext ? element.nextSibling : element.previousSibling;
		while (element !== null) {
			if(findNodes === false && element.matches(selector) === true)
				result.push(element);
			else{
				if(element === selector)
					break;
				result.push(element);
			}

			if(isNext)
				element = element.nextSibling;
			else
				element = element.previousSibling;
		}

		return result;
	}

	// Shorcut
	self.nextAll = function(element, selector){
		return self.prevAll(element, selector, true);
	}

	/**
	 * Listen to an event
	 * @param  Node 			element 	parent element
	 * @param  string 			event   	event name
	 * @param  function|string  selector    callback function or selector
	 * @param  function			callback    callback function
	 * @param  boolean			once    	call once
	 * @return null
	 */
	self.on = function(element, event, selector, callback, once){
		if(typeof element === 'string'){
			element = document;
			callback = selector;
			selector = event;
			event = element;
		}

		if(typeof selector === 'function'){
			callback = selector;
			selector = null;
		}

		if(selector){
			var tempCallback = callback;
			callback = function(ev){
				if(self.parent(ev.target, selector) !== null)
					tempCallback(ev);
			}
		}

		callback.selector = selector;
		element.addEventListener(event, callback, {capture:true, once:once === true});
	}

	// Shorcut
	self.once = function(element, event, selector, callback){
		self.on(element, event, selector, callback, true);
	}

	/**
	 * Remove event listener
	 * @param  Node 	element 	parent element
	 * @param  string 	event   	event name
	 * @param  string  	selector    selector
	 * @return null
	 */
	self.off = function(element, event, selector){
		// Remove all event
		if(event === undefined){
			var events = getEventListeners(element);
			for (var i = 0; i < events.length; i++) {
				self.off(element, events[i]);
			}
			return;
		}

		var events = event.split(' ');
		if(events.length !== 1){
			for (var i = 0; i < events.length; i++) {
				self.off(element, events[i]);
			}
			return;
		}

		// Remove listener
		var ref = getEventListeners(element);
		if(ref !== undefined && ref[event] !== undefined){
			for (var i = ref[event].length - 1; i >= 0; i--) {
				if(selector && ref[event][i].selector !== selector)
					continue;

				element.removeEventListener(event, ref[event].splice(i, 1), true);
			}
		}
	}

	self.animateCSS = function(element, animationName, callback, duration) {
		var animationEnd = {
			animation: 'animationend',
			OAnimation: 'oAnimationEnd',
			MozAnimation: 'mozAnimationEnd',
			WebkitAnimation: 'webkitAnimationEnd',
		};

		for (var t in animationEnd){
			if(element.style[t] !== undefined){
				animationEnd = animationEnd[t];
				break;
			}
		}

		if(duration){
			element.style.webkitAnimationDuration = duration+'s';
			element.style.animationDuration = duration+'s';
		}

		var list = ('animated ' + animationName).split(' ');
		element.classList.add.apply(element.classList, list);
		$.once(element, animationEnd, function(){
			element.classList.remove.apply(element.classList, list);
			
			if(duration) setTimeout(function(){
				element.style.webkitAnimationDuration = duration+'s';
				element.style.animationDuration = duration+'s';
			}, 1);

			if(typeof callback === 'function') callback();
		});
	}

	var emptyDOM = {
		div:document.createElement('div'),
		ul:document.createElement('ul'),
		tbody:document.createElement('tbody'),
		tr:document.createElement('tr'),
		table:document.createElement('table'),
		select:document.createElement('select'),
	};
	self.parseElement = function(html, returnNode){
		var result = [];
		var tempDOM = emptyDOM.div;

        if(html.indexOf('<li') === 0) tempDOM = emptyDOM.ul;
        if(html.indexOf('<tr') === 0) tempDOM = emptyDOM.tbody;
        if(html.indexOf('<td') === 0 || html.indexOf('<th') === 0) tempDOM = emptyDOM.tr;
        if(html.indexOf('<tbody') === 0) tempDOM = emptyDOM.table;
        if(html.indexOf('<option') === 0) tempDOM = emptyDOM.select;

		tempDOM.textContent = '';
		tempDOM.insertAdjacentHTML('afterBegin', html);

		var ref = tempDOM[returnNode ? 'childNodes' : 'children'];
		for (var i = 0; i < ref.length; i++) {
			result.push(ref.item(i));
		}

		return result;
	}

	self.remove = function(elements){
		if(elements.remove !== undefined)
			return elements.remove();

		for (var i = 0; i < elements.length; i++) {
			elements[i].remove();
		}
	}

	var documentElement = null;
	setTimeout(function(){
		sf.loader.domReady(function(){
			documentElement = document.body.parentElement;
		});
	}, 1);

	self.getSelector = function(element, childIndexes, untilElement){
		var names = [];
		if(untilElement === undefined) untilElement = documentElement;

		var previousSibling = childIndexes ? 'previousSibling' : 'previousElementSibling';

		while(element.parentNode !== null){
			if(element.id){
				names.unshift('#'+element.id);
				break;
			}
			else{
				if(element === untilElement){
					if(childIndexes === undefined)
						names.unshift(element.tagName);
					else names.unshift(0);
				}
				else {
					var e = element;
					var i = childIndexes ? 0 : 1;

					while(e[previousSibling]){
						e = e[previousSibling];
						i++;
					}

					if(childIndexes)
						names.unshift(i);
					else
						names.unshift(":nth-child("+i+")");
				}

				element = element.parentNode;
				if(element === null)
					break;
			}
		}

		if(childIndexes)
			return names;
		return names.join(" > ");
	}

	self.childIndexes = function(array, context){
		var element = context || documentElement;
		var i = 1;

		if(array[0].constructor === String)
			element = element.querySelector(array[0]);

		else if(array.length === 1)
			return element;

		for (i = i; i < array.length; i++) {
			element = element.childNodes.item(array[i]);

			if(element === null)
				return null;
		}

		return element;
	}

})();
sf.loader = new function(){
	var self = this;
	self.loadedContent = 0;
	self.totalContent = 0;
	self.DOMWasLoaded = false;
	self.DOMReady = false;
	self.turnedOff = true;

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
	}

	self.css = function(list){
		if(self.DOMWasLoaded){
			// check if some list was loaded
			for (var i = list.length - 1; i >= 0; i--) {
				if($('link[href*="'+list[i]+'"]').length !== 0)
					list.splice(i, 1);
			}
			if(list.length === 0) return;
		}
		self.turnedOff = false;

		self.totalContent = self.totalContent + list.length;
		for(var i = 0; i < list.length; i++){
			var s = document.createElement('link');
	        s.rel = 'stylesheet';
	        s.href = list[i];
	        s.addEventListener('load', sf.loader.f, {once:true});
	        s.addEventListener('error', sf.loader.f, {once:true});
	        document.head.appendChild(s);
		}
	}

	self.js = function(list){
		if(self.DOMWasLoaded){
			// check if some list was loaded
			for (var i = list.length - 1; i >= 0; i--) {
				if($('script[src*="'+list[i]+'"]').length !== 0)
					list.splice(i, 1);
			}
			if(list.length === 0) return;
		}
		self.turnedOff = false;

		self.totalContent = self.totalContent + list.length;
		for(var i = 0; i < list.length; i++){
			var s = document.createElement('script');
	        s.type = "text/javascript";
	        s.async = true;
	        s.src = list[i];
	        s.addEventListener('load', sf.loader.f, {once:true});
	        s.addEventListener('error', sf.loader.f, {once:true});
	        document.head.appendChild(s);
		}
	}

	setTimeout(function(){
		if(self.totalContent === 0 && !self.turnedOff){
			self.loadedContent = self.totalContent = 1;
			console.warn("If you don't use content loader feature, please turn it off with `sf.loader.off()`");
		}
	}, 10000);


	var isQueued = false;
	var lastState = '';
	document.addEventListener("load", function domLoadEvent(event){
		// Add processing class to queued element
		if(isQueued === false && document.body){
			document.removeEventListener('load', domLoadEvent, true);

			isQueued = sf.model.queuePreprocess(document.body);

			for (var i = 0; i < isQueued.length; i++) {
				isQueued[i].classList.add('sf-dom-queued');
			}

			if(isQueued.length === 0) isQueued = false;

			if(lastState === 'loading'){
				var repeatedList = $('[sf-repeat-this]', document.body);
				for (var i = 0; i < repeatedList.length; i++) {
					repeatedList[i].classList.add('sf-dom-queued');
				}

				// Find images
				var temp = $('img:not(onload)[src]');
				for (var i = 0; i < temp.length; i++) {
					sf.loader.totalContent++;
					temp[i].addEventListener('load', sf.loader.f, {once:true});
					temp[i].addEventListener('error', sf.loader.f, {once:true});
				}
			}
		}
	}, true);

	document.addEventListener('readystatechange', function domStateEvent(){
		if(document.readyState === 'interactive' || document.readyState === 'complete'){
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

			if(isQueued === false)
				isQueued = sf.model.queuePreprocess(document.body);

			resourceWaitTimer = setInterval(waitResources, 100);
			document.removeEventListener('readystatechange', domStateEvent, true);
		}
	}, true);

	var resourceWaitTimer = -1;
	function waitResources(){
		if(self.turnedOff === false && self.loadedContent < self.totalContent)
			return;

		clearInterval(resourceWaitTimer);

		var listener = sf.dom('script, link, img');
		for (var i = 0; i < listener.length; i++) {
			listener[i].removeEventListener('error', sf.loader.f);
			listener[i].removeEventListener('load', sf.loader.f);
		}

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
		whenDOMReady = whenDOMLoaded = null;

		// Last init
		sf.controller.init();
		sf.model.init(document.body, isQueued);
		sf.router.init();

		isQueued = null;
	}
}
sf.prototype.constructor = sf.loader.onFinish;
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

		var ref = sf.model.root[sf.controller.modelName(currentElement)][list];
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
		return keys.join('|');
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

	var templateParser = function(template, item){
		var html = template.html.cloneNode(true);
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
						attribute:current.attributes[refB.name],
						ref:refB
					});

					if(refB.direct !== undefined){
						current.setAttribute(refB.name, parsed[refB.direct].data);
						continue;
					}

					// Below is used for multiple data
					refB = current.attributes[refB.name];

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
					var tDOM = $.parseElement(parsed[cRef.direct].data, true);
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
					cRef.textContent.textContent = value;

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

		if(runEval === '#noEval'){
			var preParsed = [];
			var lastParsedIndex = preParsedReference.length;
		}

		var prepared = html.replace(/{{([^@%][\s\S]*?)}}/g, function(actual, temp){
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

			// Unescape HTML
			temp = temp.split('&amp;').join('&').split('&lt;').join('<').split('&gt;').join('>');

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

			// Unescape HTML
			temp = temp.split('&amp;').join('&').split('&lt;').join('<').split('&gt;').join('>');

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

					// Get else value
					var text = text.split('@else' + (text.indexOf(':') !== -1 ? ':' : ' :'));
					if(text.length === 2)
						else_ = text.pop();
					else text = text[0];

					// Split elseIf
					text = text.split('@elseif ');

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
		var callback = self.root[modelName]['on$'+propertyName];

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
				}
				return;
			}

			// Avoid multiple refresh by set a timer
			if(list.$virtual){
				var exist = list.$virtual.elements();

				clearTimeout(refreshTimer);
				refreshTimer = setTimeout(function(){
					list.$virtual.refresh(true);
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
						if(vCursor.floor === null)
							parentNode.insertBefore(temp, parentNode.lastElementChild);
						else list.$virtual.dom.appendChild(temp);
					}
					else parentNode.appendChild(temp);

					if(isKeyed === false)
						syntheticCache(temp, template, list[i]);
				}

				if(list.$virtual) list.$virtual.refresh();
				return;
			}

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
					exist[index].remove();
				}
			}

			// Remove
			if(options === 'remove'){
				if(exist[index]){
					var currentRemoved = false;
					var startRemove = function(){
						if(currentRemoved) return;
						currentRemoved = true;

						exist[index].remove();
						if(list.$virtual) list.$virtual.refresh();
					}

					if(callback !== undefined && callback.remove){
						// Auto remove if return false
						if(!callback.remove(exist[index], startRemove))
							setTimeout(startRemove, 800);
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

				// Refresh virtual scroll
				if(list.$virtual) list.$virtual.refresh();
			}
			else if(options === 'prepend'){
				var referenceNode = exist[0];
				if(referenceNode !== undefined){
					referenceNode.parentNode.insertBefore(temp, referenceNode);

					if(callback !== undefined && callback.create)
						callback.create(temp);

					// Refresh virtual scroll
					if(list.$virtual) list.$virtual.refresh();
				}
				else options = 'append';
			}
			if(options === 'append'){
				if(list.$virtual){
					if(index === 0)
						parentNode.insertBefore(temp, parentNode.lastElementChild);
					else 
						exist[index-1].insertAdjacentElement('afterEnd', temp);

					if(callback !== undefined && callback.create)
						callback.create(temp);

					// Refresh virtual scroll
					list.$virtual.refresh();
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

								if(list.$virtual) list.$virtual.refresh();
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

							// Trim the index if more than length
							if(real >= this.length)
								real = this.length - 1;

							for (var i = 0; i < limit; i++) {
								processElement(real + i, 'insertAfter');
							}
						}
					}

					else if(name === 'unshift')
						processElement(0, 'prepend');

					else if(name === 'softRefresh')
						processElement(arguments[0], 'update', arguments[1]);

					else if(name === 'hardRefresh')
						processElement(arguments[0] || 0, 'hardRefresh');

					return temp;
				}
			});
		}

		if(parentNode && parentNode.classList.contains('sf-virtual-list')){
			delete list.$virtual;
			list.$virtual = {};

			// Transfer virtual DOM
			list.$virtual.dom = tempDOM;

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
		if(list.$virtual){
			virtualChilds = list.$virtual.dom.children;
			var floorBound = list.$virtual.dCursor.floor;
		}
		hiddenProperty(list, 'getElement', function(index){
			if(virtualChilds !== null){
				var ret = undefined;
				if(index < list.$virtual.DOMCursor)
					ret = virtualChilds[index];
				else {
					index -= list.$virtual.DOMCursor;
					var childElement = parentNode.childElementCount - 2;

					if(index <= childElement)
						ret = parentChilds[index + 1];
					else
						ret = virtualChilds[index - childElement + list.$virtual.DOMCursor];
				}

				if(ret !== floorBound)
					return ret;
				return undefined;
			}

			return parentChilds[index];
		});
	}

	var loopParser = function(name, template, script, targetNode, parentNode){
		var method = script.split(' in ');
		var mask = method[0];
		var isKeyed = parentNode.classList.contains('sf-keyed-list');

		if(!self.root[name])
			return console.error("Can't parse element because model for '"+name+"' was not found", template);

		var items = self.root[name][method[1]];
		if(items === undefined){
			console.error("Can't bind array to `"+method[1]+"` because undefined property in model `"+name+"`");
			return;
		}

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
	self.init = function(targetNode, queued){
		if(alreadyInitialized && !targetNode) return;
		alreadyInitialized = true;
		setTimeout(function(){
			alreadyInitialized = false;
		}, 50);

		if(!targetNode) targetNode = document.body;
		self.parsePreprocess(queued || self.queuePreprocess(targetNode), queued);
		bindInput(targetNode);

		var temp = $('[sf-repeat-this]', targetNode);
		for (var i = 0; i < temp.length; i++) {
			var element = temp[i];
			var parent = element.parentElement;

			if(queued !== undefined)
				element.classList.remove('sf-dom-queued');

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
		if(/sf-bind-key|sf-bind-list/.test(html)){
			console.error("Can't parse element that already bound");
			return;
		}

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

		// Mask the referenced item
		copy = copy.split('#'+mask).join('_model_');

		// Extract data to be parsed
		copy = uniqueDataParser(copy, null, mask, name, '#noEval');
		var preParsed = copy[1];
		var _content_ = copy[2];
		copy = dataParser(copy[0], null, mask, name, '#noEval', preParsed);

		function findModelProperty(){
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
					var key = {
						name:attrs[a].name,
						value:attrs[a].value
					};

					indexes = [];
					found = attrs[a].value.replace(/{{%=([0-9]+)/g, function(full, match){
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
		}
	}

	var excludes = ['HTML','HEAD','STYLE','LINK','META','SCRIPT','OBJECT','IFRAME'];
	self.queuePreprocess = function(targetNode, extracting){
		var childNodes = (targetNode || document.body).childNodes;

		var temp = [];
		for (var i = childNodes.length - 1; i >= 0; i--) {
			var currentNode = childNodes[i];

			if(extracting === undefined && excludes.indexOf(currentNode.nodeName) !== -1)
				continue;

			if(currentNode.nodeType === 1){ // Tag
				var attrs = currentNode.attributes;

				// Skip element and it's childs that already bound to prevent vulnerability
				if(attrs['sf-bind-key'] || attrs['sf-repeat-this'] || attrs['sf-bind-list']) continue;

				for (var a = 0; a < attrs.length; a++) {
					if(attrs[a].value.indexOf('{{') !== -1){
						if(extracting === undefined)
							currentNode.setAttribute('sf-preprocess', 'attronly');
						temp.push(currentNode);
					}
				}

				Array.prototype.push.apply(temp, self.queuePreprocess(currentNode, extracting));
			}

			else if(currentNode.nodeType === 3){ // Text
				currentNode.textContent = currentNode.textContent;

				if(currentNode.textContent.length === 0){
					currentNode.remove();
					continue;
				}

				if(currentNode.nodeValue.indexOf('{{') !== -1){
					if(extracting === undefined){
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

	self.parsePreprocess = function(nodes, queued){
		for (var a = 0; a < nodes.length; a++) {
			// Get reference for debugging
			var current = processingElement = nodes[a];

			var model = sf.controller.modelName(current);
			current.removeAttribute('sf-preprocess');

			if(queued !== undefined)
				current.classList.remove('sf-dom-queued');

			var modelRef = self.root[model];

			if(!modelRef){
				modelRef = root_(model);
				//return console.error("Can't parse element because model for '"+model+"' was not found", current);
			}

			// Double check if the child element already bound to prevent vulnerability
			if(/sf-bind-key|sf-bind-list/.test(current.innerHTML)){
				console.error("Can't parse element that already bound");
				console.log(processingElement.cloneNode(true));
				return;
			}

			if(current.hasAttribute('sf-bind'))
				self.bindElement(current, current.getAttribute('sf-bind'));

			// Avoid editing the outerHTML because it will remove the bind
			var temp = uniqueDataParser(current.innerHTML, modelRef, false, model);
			current.innerHTML = dataParser(temp, modelRef, false, model);

			var attrs = nodes[a].attributes;
			for (var i = 0; i < attrs.length; i++) {
				if(attrs[i].value.indexOf('{{') !== -1){
					var attr = attrs[i];
					attr.value = dataParser(attr.value, modelRef, false, model);
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
// ==== ES5 Polyfill ====
if(typeof Object.assign != 'function'){
  Object.defineProperty(Object, "assign", {
    value: function assign(target, varArgs) {
      'use strict';
      if (target == null)
        throw new TypeError('Cannot convert undefined or null to object');
      var to = Object(target);
      for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];
        if (nextSource != null) {
          for (var nextKey in nextSource) {
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey))
              to[nextKey] = nextSource[nextKey];
          }
        }
      }
      return to;
    },
    writable: true,
    configurable: true
  });
}

if(Element.prototype.remove === undefined || CharacterData.prototype.remove === undefined || DocumentType.prototype.remove === undefined){
  (function (arr) {
    arr.forEach(function (item) {
      if (item.hasOwnProperty('remove')) {
        return;
      }
      Object.defineProperty(item, 'remove', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: function remove() {
          if (this.parentNode !== null)
            this.parentNode.removeChild(this);
        }
      });
    });
  })([Element.prototype, CharacterData.prototype, DocumentType.prototype]);
}

if(!Element.prototype.matches){
  Element.prototype.matches = (Element.prototype).matchesSelector ||
    (Element.prototype).mozMatchesSelector || (Element.prototype).msMatchesSelector ||
    (Element.prototype).oMatchesSelector || (Element.prototype).webkitMatchesSelector ||
    function (s) {
      var matches = (this.document || this.ownerDocument).querySelectorAll(s),
      i = matches.length;
      while (--i >= 0 && matches.item(i) !== this){}
      return i > -1;
    };
}

if(!NodeList.prototype.forEach){
    NodeList.prototype.forEach = function (callback, thisArg) {
        thisArg = thisArg || window;
        for (var i = 0; i < this.length; i++) {
            callback.call(thisArg, this[i], i, this);
        }
    };
}

if(!window.location.origin){
  window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
}
// DOM Controller on loaded app
sf.controller = new function(){
	var self = this;
	self.pending = {};
	self.active = {};

	self.for = function(name, func){
		self.pending[name] = func;
	}

	self.modelScope = function(element, func){
		var model = sf.controller.modelName(element);

		if(!model)
			throw 'model or controller was not found';

		var bindedList = element.getAttribute('sf-bind-list');
		if(!bindedList){
			var parentEl = $.parent(element, '[sf-bind-list]');
			if(parentEl !== null)
				bindedList = parentEl.getAttribute('sf-bind-list');
		}
		else var parentEl = element;

		if(!bindedList){
			if(func) return func(sf.model.root[model], -1);
			else return sf.model.root[model];
		}

		// Find index
		var bindedListIndex = 0;
		if(bindedList)
			bindedListIndex = $.prevAll(parentEl, '[sf-bind-list]').length;

		if(func) return func(sf.model.root[model][bindedList], bindedListIndex);
		else return sf.model.root[model][bindedList][bindedListIndex];
	}

	self.modelName = function(element){
		var name = undefined;
		if(element.hasAttribute('sf-controller'))
			name = element.getAttribute('sf-controller');
		else
			name = $.parent(element, '[sf-controller]').getAttribute('sf-controller');

		// Initialize it first
		if(name !== undefined && !self.active[name])
			self.run(name);

		return name;
	}

	var listenSFClick = function(e){
		var element = e.target;
		var script = element.getAttribute('sf-click');

		if(!script){
			element = $.parent(element, '[sf-click]');
			script = element.getAttribute('sf-click');
		}

		var model = $.parent(element, '[sf-controller]').getAttribute('sf-controller');

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
			console.error("Error on sf-click for model: " + model + ' [Cannot call `'+method_+'`]\n', element);
			return;
		}

		// Take the argument list
		script.shift();
		script = script.join('(');
		script = script.split(')');
		script.pop();
		script = script.join('(');

		// Turn argument as array
		if(script.length !== 0){
			// Replace `this` to `element`
			script = eval(('['+script+']').replace(/,this|\[this/g, function(found){
				return found[0] + 'element';
			}));
		}
		if(!script)
			script = [];

		try{
			method.apply(element, script);
			e.preventDefault();
		} catch(e) {
			console.error("Error on sf-click for model: " + model + '\n', element, '\n', e);
		}
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

		var temp = $('[sf-controller]', parent || document.body);
		for (var i = 0; i < temp.length; i++) {
			self.run(temp[i].getAttribute('sf-controller'));
		}
	}

	// Create listener for sf-click
	document.addEventListener('DOMContentLoaded', function(){
		$.on(document.body, 'click', '[sf-click]', listenSFClick);
	}, {capture:true, once:true});
}

var root_ = function(scope){
	if(!sf.model.root[scope])
		sf.model.root[scope] = {};

	if(!sf.model.root[scope])
		sf.controller.run(scope);

	return sf.model.root[scope];
}
/*
  Special Thanks to Vladimir Kharlampidi
  https://github.com/nolimits4web/
*/

var globals = {};
var jsonpRequests = 0;
function Request(requestOptions) {
    var globalsNoCallbacks = Object.assign({}, globals);
    ('beforeCreate beforeOpen beforeSend error complete success statusCode').split(' ').forEach(function (callbackName) {
        delete globalsNoCallbacks[callbackName];
    });
    var defaults = Object.assign({
        url: window.location.toString(),
        method: 'GET',
        data: false,
        async: true,
        cache: true,
        user: '',
        password: '',
        headers: {},
        xhrFields: {},
        statusCode: {},
        processData: true,
        dataType: 'text',
        contentType: 'application/x-www-form-urlencoded',
        timeout: 0,
    }, globalsNoCallbacks);
    var options = Object.assign({}, defaults, requestOptions);
    var proceedRequest;
    // Function to run XHR callbacks and events
    function fireCallback(callbackName) {
        var data = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            data[_i - 1] = arguments[_i];
        }
        /*
          Callbacks:
          beforeCreate (options),
          beforeOpen (xhr, options),
          beforeSend (xhr, options),
          error (xhr, status),
          complete (xhr, stautus),
          success (response, status, xhr),
          statusCode ()
        */
        var globalCallbackValue;
        var optionCallbackValue;
        if (globals[callbackName]) {
            globalCallbackValue = globals[callbackName].apply(globals, data);
        }
        if (options[callbackName]) {
            optionCallbackValue = options[callbackName].apply(options, data);
        }
        if (typeof globalCallbackValue !== 'boolean')
            globalCallbackValue = true;
        if (typeof optionCallbackValue !== 'boolean')
            optionCallbackValue = true;
        return (globalCallbackValue && optionCallbackValue);
    }
    // Before create callback
    proceedRequest = fireCallback('beforeCreate', options);
    if (proceedRequest === false)
        return undefined;
    // For jQuery guys
    if (options.type)
        options.method = options.type;
    // Parameters Prefix
    var paramsPrefix = options.url.indexOf('?') >= 0 ? '&' : '?';
    // UC method
    var method = options.method.toUpperCase();
    // Data to modify GET URL
    if ((method === 'GET' || method === 'HEAD' || method === 'OPTIONS' || method === 'DELETE') && options.data) {
        var stringData = void 0;
        if (typeof options.data === 'string') {
            // Should be key=value string
            if (options.data.indexOf('?') >= 0)
                stringData = options.data.split('?')[1];
            else
                stringData = options.data;
        }
        else {
            // Should be key=value object
            stringData = serializeQuery(options.data);
        }
        if (stringData.length) {
            options.url += paramsPrefix + stringData;
            if (paramsPrefix === '?')
                paramsPrefix = '&';
        }
    }
    // JSONP
    if (options.dataType === 'json' && options.url.indexOf('callback=') >= 0) {
        var callbackName_1 = "jsonp_" + (Date.now() + ((jsonpRequests += 1)));
        var abortTimeout_1;
        var callbackSplit = options.url.split('callback=');
        var requestUrl = callbackSplit[0] + "callback=" + callbackName_1;
        if (callbackSplit[1].indexOf('&') >= 0) {
            var addVars = callbackSplit[1].split('&').filter(function (el) { return el.indexOf('=') > 0; }).join('&');
            if (addVars.length > 0)
                requestUrl += "&" + addVars;
        }
        // Create script
        var script_1 = document.createElement('script');
        script_1.type = 'text/javascript';
        script_1.onerror = function onerror() {
            clearTimeout(abortTimeout_1);
            fireCallback('error', null, 'scripterror');
            fireCallback('complete', null, 'scripterror');
        };
        script_1.src = requestUrl;
        // Handler
        window[callbackName_1] = function jsonpCallback(data) {
            clearTimeout(abortTimeout_1);
            fireCallback('success', data);
            script_1.parentNode.removeChild(script_1);
            script_1 = null;
            delete window[callbackName_1];
        };
        document.querySelector('head').appendChild(script_1);
        if (options.timeout > 0) {
            abortTimeout_1 = setTimeout(function () {
                script_1.parentNode.removeChild(script_1);
                script_1 = null;
                fireCallback('error', null, 'timeout');
            }, options.timeout);
        }
        return undefined;
    }
    // Cache for GET/HEAD requests
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS' || method === 'DELETE') {
        if (options.cache === false) {
            options.url += paramsPrefix + "_nocache" + Date.now();
        }
    }
    // Create XHR
    var xhr = new XMLHttpRequest();
    // Save Request URL
    xhr.requestUrl = options.url;
    xhr.requestParameters = options;
    // Before open callback
    proceedRequest = fireCallback('beforeOpen', xhr, options);
    if (proceedRequest === false)
        return xhr;
    // Open XHR
    xhr.open(method, options.url, options.async, options.user, options.password);
    // Create POST Data
    var postData = null;
    if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && options.data) {
        if (options.processData) {
            var postDataInstances = [ArrayBuffer, Blob, Document, FormData];
            // Post Data
            if (postDataInstances.indexOf(options.data.constructor) >= 0) {
                postData = options.data;
            }
            else {
                // POST Headers
                var boundary = "---------------------------" + Date.now().toString(16);
                if (options.contentType === 'multipart/form-data') {
                    xhr.setRequestHeader('Content-Type', "multipart/form-data; boundary=" + boundary);
                }
                else {
                    xhr.setRequestHeader('Content-Type', options.contentType);
                }
                postData = '';
                var data = serializeQuery(options.data);
                if (options.contentType === 'multipart/form-data') {
                    data = data.split('&');
                    var newData = [];
                    for (var i = 0; i < data.length; i += 1) {
                        newData.push("Content-Disposition: form-data; name=\"" + data[i].split('=')[0] + "\"\r\n\r\n" + data[i].split('=')[1] + "\r\n");
                    }
                    postData = "--" + boundary + "\r\n" + newData.join("--" + boundary + "\r\n") + "--" + boundary + "--\r\n";
                }
                else if (options.contentType === 'application/json') {
                    postData = JSON.stringify(options.data);
                }
                else {
                    postData = data;
                }
            }
        }
        else {
            postData = options.data;
            xhr.setRequestHeader('Content-Type', options.contentType);
        }
    }
    // Additional headers
    if (options.headers) {
        Object.keys(options.headers).forEach(function (headerName) {
            xhr.setRequestHeader(headerName, options.headers[headerName]);
        });
    }
    // Check for crossDomain
    if (typeof options.crossDomain === 'undefined') {
        // eslint-disable-next-line
        options.crossDomain = /^([\w-]+:)?\/\/([^\/]+)/.test(options.url) && RegExp.$2 !== window.location.host;
    }
    if (!options.crossDomain) {
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    }
    if (options.xhrFields) {
        Object.assign(xhr, options.xhrFields);
    }
    var xhrTimeout;
    // Handle XHR
    xhr.onload = function onload() {
        if (xhrTimeout)
            clearTimeout(xhrTimeout);
        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 0) {
            var responseData = void 0;
            if (options.dataType === 'json') {
                var parseError = void 0;
                try {
                    responseData = JSON.parse(xhr.responseText);
                }
                catch (err) {
                    parseError = true;
                }
                if (!parseError) {
                    fireCallback('success', responseData, xhr.status, xhr);
                }
                else {
                    fireCallback('error', xhr, 'parseerror');
                }
            }
            else {
                responseData = xhr.responseType === 'text' || xhr.responseType === '' ? xhr.responseText : xhr.response;
                fireCallback('success', responseData, xhr.status, xhr);
            }
        }
        else {
            fireCallback('error', xhr, xhr.status);
        }
        if (options.statusCode) {
            if (globals.statusCode && globals.statusCode[xhr.status])
                globals.statusCode[xhr.status](xhr);
            if (options.statusCode[xhr.status])
                options.statusCode[xhr.status](xhr);
        }
        fireCallback('complete', xhr, xhr.status);
    };
    xhr.onerror = function onerror() {
        if (xhrTimeout)
            clearTimeout(xhrTimeout);
        fireCallback('error', xhr, xhr.status);
        fireCallback('complete', xhr, 'error');
    };
    // Timeout
    if (options.timeout > 0) {
        xhr.onabort = function onabort() {
            if (xhrTimeout)
                clearTimeout(xhrTimeout);
        };
        xhrTimeout = setTimeout(function () {
            xhr.abort();
            fireCallback('error', xhr, 'timeout');
            fireCallback('complete', xhr, 'timeout');
        }, options.timeout);
    }
    // Ajax start callback
    proceedRequest = fireCallback('beforeSend', xhr, options);
    if (proceedRequest === false)
        return xhr;
    // Send XHR
    xhr.send(postData);
    // Return XHR object
    return xhr;
}
function RequestShortcut(method) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    var _a = [], url = _a[0], data = _a[1], success = _a[2], error = _a[3], dataType = _a[4];
    if (typeof args[1] === 'function') {
        url = args[0], success = args[1], error = args[2], dataType = args[3];
    }
    else {
        url = args[0], data = args[1], success = args[2], error = args[3], dataType = args[4];
    }
    [success, error].forEach(function (callback) {
        if (typeof callback === 'string') {
            dataType = callback;
            if (callback === success)
                success = undefined;
            else
                error = undefined;
        }
    });
    dataType = dataType || (method === 'json' || method === 'postJSON' ? 'json' : undefined);
    var requestOptions = {
        url: url,
        method: method === 'post' || method === 'postJSON' ? 'POST' : 'GET',
        data: data,
        success: success,
        error: error,
        dataType: dataType,
    };
    if (method === 'postJSON') {
        Object.assign(requestOptions, {
            contentType: 'application/json',
            processData: false,
            crossDomain: true,
            data: typeof data === 'string' ? data : JSON.stringify(data),
        });
    }
    return Request(requestOptions);
}
Object.assign(Request, {
    get: function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return RequestShortcut.apply(void 0, ['get'].concat(args));
    },
    post: function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return RequestShortcut.apply(void 0, ['post'].concat(args));
    },
    json: function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return RequestShortcut.apply(void 0, ['json'].concat(args));
    },
    getJSON: function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return RequestShortcut.apply(void 0, ['json'].concat(args));
    },
    postJSON: function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return RequestShortcut.apply(void 0, ['postJSON'].concat(args));
    },
});
Request.setup = function setup(options) {
    if (options.type && !options.method) {
        Object.assign(options, { method: options.type });
    }
    Object.assign(globals, options);
};
function serializeQuery(params, prefix) {
    var key = Object.keys(params);
    for (var i = 0; i < key.length; i++) {
      var value = params[key[i]];
      if (params.constructor === Array)
          key[i] += prefix + "[]";
      else if (params.constructor === Object)
          key[i] = (prefix ? prefix + "[" + key[i] + "]" : key[i]);

      if (typeof value === 'object')
          key[i] = serializeQuery(value, key[i]);
      else
          key[i] = key[i] + "=" + encodeURIComponent(value);
    }
    return key.join('&');
}
$.ajax = sf.ajax = Request;
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

		// Run 'before' event for new page view
		var temp = $('[sf-controller], [sf-page]', targetNode);
		for (var i = 0; i < temp.length; i++) {
			if(temp[i].getAttribute('sf-controller'))
				sf.controller.run(temp[i].getAttribute('sf-controller'));
			
			if(temp[i].getAttribute('sf-page')){
				var name = temp[i].getAttribute('sf-page');
				beforeEvent(name);
			}
		}

		initialized = true;
		currentRouterURL = window.location.pathname;
	}

	function popstateListener(event) {
		// Don't continue if the last routing was error
		if(routingError){
			routingError = false;
			return;
		}

		routingBack = true;
		self.goto(window.location.pathname);
	}

	self.enable = function(status){
		if(status === undefined) status = true;
		if(self.enabled === status) return;
		self.enabled = status;

		if(status === true){
			// Create listener for link click
			$.on(document.body, 'click', 'a[href]', self.load);

			// Create listener when navigate backward
			window.addEventListener('popstate', popstateListener, false);
		}
		else{
			$.off(document.body, 'click', 'a[href]', self.load);
			window.removeEventListener('popstate', popstateListener, false);
		}
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

	self.load = function(ev){
		if(self.enabled !== true) return;

		var elem = ev.target;
		if(!elem.href) return;

		if(!history.pushState || elem.hasAttribute('sf-router-ignore'))
			return;

		// Make sure it's from current origin
		var path = elem.href.replace(window.location.origin, '');
		if(path.indexOf('//') !== -1)
			return;

		ev.preventDefault()
		return !self.goto(path);
	}

	var RouterLoading = false;
	var routingBack = false;
	var routingError = false;
	self.goto = function(path, data, method){
		if(!method) method = 'GET';
        else method = method.toUpperCase();

		if(!data) data = {};

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

					if(!isEmptyObject(special)){
						for (var i = 0; i < onEvent['special'].length; i++) {
							if(onEvent['special'][i](special)) return;
						}
					}
				}

				var DOMReference = false;
				var foundAction = function(ref){
					DOMReference = $.findOne(ref);

					// Run 'after' event for old page view
					var last = $.findOne('[sf-page]', DOMReference);
					afterEvent(last ? last.getAttribute('sf-page') : '/');

					// Redefine title if exist
					if(special && special.title)
						$('head > title').innerHTML = special.title;

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

				// Run 'before' event for new page view
				if(!DOMReference) DOMReference = document.body;
				if(self.pauseRenderOnTransition)
					self.pauseRenderOnTransition.css('display', 'none');

				// Let page script running first, then update the data binding
				DOMReference.innerHTML = data;

				// Parse the DOM data binding
				sf.model.init(DOMReference);

				// Init template to model binding
				var temp = $('[sf-page]', DOMReference);
				for (var i = 0; i < temp.length; i++) {
					beforeEvent(temp[i].getAttribute('sf-page'));
				}

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

		var virtual = list.$virtual;
		virtual.reset = function(){
			virtual.DOMCursor = 0; // cursor of first element in DOM tree as a cursor

			virtual.bounding.initial = 0;
			virtual.bounding.ceiling = -1;
			virtual.bounding.floor = 0;

			virtual.vCursor.ceiling = null; // for forward direction
			virtual.vCursor.floor = virtual.dom.firstElementChild; // for backward direction

			virtual.bounding.initial = virtual.dCursor.ceiling.offsetTop;
			refreshScrollBounding(0, virtual.bounding, list, parentNode);
		}

		virtual.elements = function(){
			return obtainElements(list, parentNode);
		}

		virtual.dCursor = { // DOM Cursor
			ceiling:parentNode.querySelector('.virtual-spacer.ceiling'),
			floor:parentNode.querySelector('.virtual-spacer.floor')
		};

		virtual.bounding = {};
		virtual.vCursor = {};

		virtual.reset();
		virtual.targetNode = parentNode;
		virtual.scrollHeight = virtual.dCursor.floor.offsetTop - virtual.bounding.initial;

		var scroller = null;
		virtual.destroy = function(){
			$.off(scroller, 'scroll');
			$.off(parentNode, 'mousedown mouseup');
			virtual.dom.innerHTML = '';
			offElementResize(parentNode);

			delete list.$virtual;
		}

		virtual.resetViewport = function(){
			virtual.visibleLength = Math.floor(scroller.clientHeight / virtual.scrollHeight);
			virtual.preparedLength = virtual.visibleLength + self.prepareCount * 2;
		}

		setTimeout(function(){
			scroller = parentNode;

			var length = parentNode.getAttribute('scroll-parent-index') || 0;
			for (var i = 0; i < length; i++) {
				scroller = scroller.parentElement;
			}

			virtual.resetViewport();

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

			// Reset virtual spacer height
			ceilingHeight = 0;
			floorHeight = 0;
			ceiling.style.height = ceilingHeight+'px';
			floor.style.height = floorHeight+'px';
		}

		virtual.refresh = function(force){
			refresh(force, list, self.prepareCount, parentNode, scroller);
			fillViewport();
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

		$.on(scroller, 'scroll', checkCursorPosition);
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

		$.on(scroller, 'scroll', checkCursorPosition);

		// For preventing scroll jump if scrolling over than viewport
		if(scroller === parentNode && navigator.userAgent.indexOf('Chrom') !== -1){
			$.on(parentNode, 'mousedown', function(){
				scrollFocused = true;
			});
			$.on(parentNode, 'mouseup', function(){
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

			bounding.floor -= bounding.initial;
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

		bounding.ceiling -= bounding.initial;
		bounding.floor -= bounding.initial;
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
				scroller.scrollTop = temp.offsetTop - scroller.offsetTop;
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
			}, 1000);
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
         '}', style.sheet.cssRules.length);
	}
};
return sf;

// ===== Module End =====
})));