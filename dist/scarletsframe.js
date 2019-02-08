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
	getQuotes:/((?<![\\])['"])((?:.(?!(?<![\\])\1))*.?)\1/gm,
	avoidQuotes:'(?=(?:[^"\']*(?:\'|")[^"\']*(?:\'|"))*[^"\']*$)',
	strictVar:'(?=\\b[^.]|^|\\n| +|\\t|\\W )'
};

function isEmptyObject(obj){
	for(var key in obj){
		return false;
	}
	return true
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
			console.error("Error on sf-click for model: " + model + ' [Cannot find '+method_+']\n', element[0]);
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
		} catch(e) {
			console.error("Error on sf-click for model: " + model + '\n', element[0], '\n', e);
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
		var matches = 'matches';

		if(!element.matches)
			matches = element.msMatchesSelector ? 'msMatchesSelector' : 'webkitMatchesSelector';

		do {
			if(element[matches](selector) === true)
				return element;

			element = element.parentElement;
		} while (element !== null);

		return null;
	}

	self.prevAll = function(element, selector, isNext){
		var matches = 'matches';
		var result = [];

		if(!element.matches)
			matches = element.msMatchesSelector ? 'msMatchesSelector' : 'webkitMatchesSelector';

		do {
			if(element[matches](selector) === true)
				result.push(element);

			if(isNext)
				element = element.nextElementSibling;
			else
				element = element.previousElementSibling;
		} while (element !== null);

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
		if(events.length !== 0){
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
	self.parseElement = function(html){
		var result = null;
		var tempDOM = emptyDOM.div;

        if(html.indexOf('<li') === 0) tempDOM = emptyDOM.ul;
        if(html.indexOf('<tr') === 0) tempDOM = emptyDOM.tbody;
        if(html.indexOf('<td') === 0 || html.indexOf('<th') === 0) tempDOM = emptyDOM.tr;
        if(html.indexOf('<tbody') === 0) tempDOM = emptyDOM.table;
        if(html.indexOf('<option') === 0) tempDOM = emptyDOM.select;

		tempDOM.textContent = '';
		tempDOM.insertAdjacentHTML('afterBegin', html);

		var length = tempDOM.children.length;
		if(length === 1)
			result = tempDOM.firstElementChild;

		else if(length !== 0){
			result = [];
			var ref = tempDOM.children;
			for (var i = 0; i < ref.length; i++) {
				result.push(ref.item(i));
			}
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

	self.getSelector = function(element, childIndexes = false, untilElement = false){
		var names = [];
		if(untilElement === false) untilElement = documentElement;

		while(element.parentElement !== null){
			if(element.id){
				names.unshift('#'+element.id);
				break;
			}
			else{
				if(element === untilElement){
					if(childIndexes === false)
						names.unshift(element.tagName);
					else names.unshift(0);
				}
				else {
					var e = element;
					var i = childIndexes ? 0 : 1;

					while(e.previousElementSibling){
						e = e.previousElementSibling;
						i++;
					}

					if(childIndexes)
						names.unshift(i);
					else
						names.unshift(":nth-child("+i+")");
				}

				element = element.parentElement;
			}
		}

		if(childIndexes)
			return names;
		return names.join(" > ");
	}

	self.childIndexes = function(array, context){
		var element = context || documentElement;
		var i = 0;

		if(array[0].constructor === String){
			element = element.querySelector(array[0]);
			i = 1;
		}

		for (i = i; i < array.length; i++) {
			element = element.children.item(array[i]);

			if(element === null)
				return null;
		}

		return element;
	}

})();
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
				if($('link[href*="'+list[i]+'"]').length !== 0)
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
			document.getElementsByTagName('body')[0].insertAdjacentHTML('beforeend', temp);
		});
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
		self.totalContent = self.totalContent + list.length;
		for(var i = 0; i < list.length; i++){
			var s = document.createElement('script');
	        s.type = "text/javascript";
	        s.async = true;
	        s.src = list[i];
	        s.addEventListener('load', sf.loader.f, false);
	        document.head.appendChild(s);
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
	var temp = $('img:not(onload)[src]');
	for (var i = 0; i < temp.length; i++) {
		sf.loader.totalContent++;
		temp[i].setAttribute('onload', "sf.loader.f(this)");
	}
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

			return temp.replace(/(?!&#.*?;)[\u00A0-\u9999<>\&]/gm, function(i) {
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

			// Hard refresh
			if(options === 'hardRefresh'){
				var item = self.root[modelName][propertyName];
				var all = '';
				for (var i = index; i < item.length; i++) {
					var temp = uniqueDataParser(html, item[i], mask, modelName);
					all += dataParser(temp, item[i], mask, modelName);
				}

				if(list.$virtual)
					parentNode.lastElementChild.insertAdjacentHTML('beforeBegin', all);
				else parentNode.insertAdjacentHTML('beforeEnd', all);
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
			temp = $.parseElement(temp);

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
							Array.prototype.splice.apply(this, [0]);
							processElement(0, 'clear');
						}
						Array.prototype.splice.apply(this, [0,0].concat(arguments[0]));
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
					var childElement = parentNode.childElementCount - 2;
					if(index <= childElement)
						return parentNode.children[index + 1];

					return list.$virtual.dom.children[index - childElement + list.$virtual.DOMCursor];
				}

				return parentNode.children[index];
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

	var loopParser = function(name, template, script, targetNode, parentNode){
		var returns = '';
		var method = script.split(' in ');
		var mask = method[0];

		if(!self.root[name])
			return console.error("Can't parse element because model for '"+name+"' was not found", template);

		var items = self.root[name][method[1]];

		template.setAttribute('sf-bind-list', method[1]);

		// Get reference for debugging
		processingElement = template;
		template = template.outerHTML.replace(/  +|\t+/g, '');

		if(method.length === 2){
			var temp = '';
			for(var i in items){
				var item = items[i];

				temp = uniqueDataParser(template, item, mask, name);
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
					if(val.length === 0)
						return items.splice(0);
					return items.$replace(val);
				}
			});

			bindArray(template, items, mask, name, method[1], targetNode, parentNode, returns);
		}
		return returns;
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

			if(element.parentNode.classList.contains('sf-virtual-list')){
				if(!loopParser(controller, element, script, targetNode, element.parentNode))
					element.setAttribute('sf-bind-list', script.split(' in ')[1]);
				element.remove();
				continue;
			}

			var data = loopParser(controller, element, script, targetNode, element.parentNode);
			if(data){
				if(after)
					after.insertAdjacentHTML('beforeBegin', data); // before
				else if(before)
					before.insertAdjacentHTML('afterEnd', data); // after
				else
					parent.insertAdjacentHTML('beforeEnd', data); // append
			}
			else
				element.setAttribute('sf-bind-list', script.split(' in ')[1]);

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

	var excludes = ['HTML','HEAD','STYLE','LINK','META','SCRIPT','OBJECT','IFRAME'];
	self.queuePreprocess = function(targetNode){
		var childNodes = (targetNode || document.body).childNodes;

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
			$.off(scroller, 'scroll');
			$.off(parentNode, 'mousedown mouseup');
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