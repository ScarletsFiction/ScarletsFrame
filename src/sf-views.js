;(function(){
var gEval = routerEval;
routerEval = void 0; // Avoid this function being invoked out of scope

var rejectResponse = /<html/;

// Save reference
var aHashes = sf.url.hashes;
var slash = '/';

var routingError = false;
var routeDirection = 1;
var historyIndex = (window.history.state || 1);

var disableHistoryPush = false;

window.addEventListener('popstate', function(ev){
	// Don't continue if the last routing was error
	// Because the router was trying to getting back
	if(routingError){
		routingError = false;
		historyIndex -= routeDirection;
		return;
	}

	disableHistoryPush = true;

	if(window.history.state >= historyIndex)
		routeDirection = 1;
	else
		routeDirection = -1;

	historyIndex += routeDirection;

	// console.warn('historyIndex', historyIndex, window.history.state, routeDirection > 0 ? 'forward' : 'backward');

	// Reparse URL
	self.goto();

	disableHistoryPush = false;
}, false);

// Listen to every link click
sf(function(){
	$.on(document.body, 'click', 'a[href]', function(ev){
		ev.preventDefault();

		var elem = ev.target;
		var attr = elem.getAttribute('href');

		if(attr === null){
			elem = $.parent(elem, 'a[href]');
			attr = elem.getAttribute('href');
		}

		if(attr[0] === '@'){ // ignore
			var target = elem.getAttribute('target');
			if(target)
				window.open(attr.slice(1), target);
			else window.location = attr.slice(1);
			return;
		}

		// Make sure it's from current origin
		var path = elem.href.replace(window.location.origin, '');
		if(path.indexOf('//') !== -1)
			return;

		self.goto(attr);
	});
});

var cachedURL = {};

internal.router = {};
internal.router.parseRoutes = function(obj_, selectorList){
	var routes = [];
	var pattern = /\/:([^/]+)/g;
    var knownKeys = /^(path|url|template|templateURL|html|on|routes|beforeRoute|defaultData|cache)$/;

	function addRoutes(obj, addition, selector, parent){
		if(selector !== '')
			selector += ' ';

		for(var i = 0; i < obj.length; i++){
            var ref = obj[i];
			var current = addition+ref.path;

			if(ref.routes !== void 0)
				addRoutes(ref.routes, current, selector, parent);

			current = current.split('//').join('/');

			var keys = [];
			var regex = current.replace(pattern, function(full, match){
				keys.push(match);
				return '/([^/]+)';
			});
			var route = RegExp('^' + regex + '$');

			if(ref.url !== void 0)
				route.url = ref.url;

			else if(ref.templateURL !== void 0)
				route.templateURL = ref.templateURL;

			else if(ref.template !== void 0)
				route.template = ref.template;

			else if(ref.html !== void 0){
				// Create new element
				var dom = route.html = document.createElement('sf-page-view');
				internal.component.skip = true;

				if(ref.html.constructor === String)
					dom.innerHTML = ref.html;
				else
					dom.appendChild(ref.html);

				internal.component.skip = false;
				dom.classList.add('page-prepare');
			}

			route.keys = keys;
			route.beforeRoute = ref.beforeRoute;
			route.defaultData = ref.defaultData || {};

			if(selector !== ''){
				route.selector = selectorList.indexOf(selector);

				if(route.selector === -1){
					route.selector = selectorList.length;
					selectorList.push(selector.trim());
				}
			}

			if(parent !== void 0)
				route.parent = parent;

			if(ref.on !== void 0)
				route.on = ref.on;

			if(ref.cache)
				route.cache = true;

			var hasChild = [];

            var keys = Object.keys(ref);
            for(var a = 0; a < keys.length; a++){
                if(knownKeys.test(keys[a]))
                	continue;

				hasChild.push(keys[a]);
				addRoutes(ref[keys[a]], current, keys[a], route);
                break;
            }

            if(hasChild.length !== 0){
            	route.hasChild = hasChild;
            	route.forChild = RegExp(regex);
            }

			routes.push(route);
		}
	}

    addRoutes(obj_, '', '');
	return routes;
}

internal.router.findRoute = function(url){
	for(var i=0; i<this.length; i++){
		var found = url.match(this[i]);
		if(found !== null){
			var keys = this[i].keys;
			if(keys !== void 0){
				var data = this[i].data = {};
				found.shift();

				for (var a = 0; a < keys.length; a++) {
					data[keys[a]] = found[a];
				}
			}

			return this[i];
		}
	}

	return false;
}

var self = sf.views = function View(selector, name){
	if(name === void 0)
		name = slash;

	var self = this;

	if(name){
		if(sf.views.list[name] === void 0)
			sf.views.list[name] = [];

		sf.views.list[name].push(self);
	}

	var pendingAutoRoute = false;

	// Init current URL as current View Path
	if(name === slash)
		self.currentPath = sf.url.paths;
	else if(name === false)
		self.currentPath = '';
	else{
		self.currentPath = '';
		pendingAutoRoute = true;
	}

	var initialized = false;
	var firstRouted = false;

	self.lastPath = '/';
	self.currentDOM = null;
	self.lastDOM = null;
	self.relatedDOM = [];
	self.data = {};

	self.maxCache = 3;

	var rootDOM = {};
	self.selector = function(selector_, isChild, currentPath){
		initialized = true;

		var DOM = (isChild || (rootDOM.isConnected ? rootDOM : document.body)).getElementsByTagName(selector_ || selector);
		if(DOM.length === 0) return false;

		DOM = DOM[0];

		if(DOM.sf$viewInitialized) return false;

		if(collection === null)
			collection = DOM.getElementsByTagName('sf-page-view');

		// if(selector_)
		// 	selector = selector_;

		// Create listener for link click
		var temp = null;

		// Bring the content to an sf-page-view element
		if(DOM.childNodes.length !== 0){
			if(DOM.childNodes.length === 1 && DOM.firstChild.nodeName === '#text' && DOM.firstChild.textContent.trim() === '')
				DOM.firstChild.remove();
			else{
				temp = document.createElement('sf-page-view');
				DOM.insertBefore(temp, DOM.firstChild);

				for (var i = 1, n = DOM.childNodes.length; i < n; i++) {
					temp.appendChild(DOM.childNodes[1]);
				}

				temp.routePath = currentPath || self.currentPath;
				temp.routeCached = routes.findRoute(temp.routePath);
				temp.classList.add('page-current');
				DOM.defaultViewContent = temp;
			}
		}

		DOM.sf$viewInitialized = true;

		if(!isChild){
			self.currentDOM = temp;
			rootDOM = DOM;
			return true;
		}

		return DOM;
	}

    var selectorList = [selector];
	var routes = [];
	routes.findRoute = internal.router.findRoute;

	internal.router.enabled = true;

	var onEvent = {
		'routeStart':[],
		'routeFinish':[],
		'routeCached':[],
		'routeError':[]
	};

	self.on = function(event, func){
		if(onEvent[event] === void 0)
			return console.error("Event '"+event+"' was not exist");

		if(onEvent[event].indexOf(func) === -1)
			onEvent[event].push(func);
	}

	self.addRoute = function(obj){
		routes.push.apply(routes, internal.router.parseRoutes(obj, selectorList));

		if(!initialized)
			self.selector();

		if(!firstRouted && name){
			sf(function(){
				if(firstRouted)
					return;

				if(name === slash && !rootDOM.childElementCount){
					self.currentPath = '';
					firstRouted = self.goto(sf.url.paths);
				}

				if(pendingAutoRoute){
					if(aHashes[name] !== void 0)
						firstRouted = self.goto(aHashes[name]);
					else
						firstRouted = self.goto('/');

					if(firstRouted)
						pendingAutoRoute = false;
				}
			});
		}
	}

	var RouterLoading = false; // xhr reference if the router still loading

	var collection = null;
	function findRelatedElement(currentURL){
		var found = [];
		for (var i = 0; i < collection.length; i++) {
			if(currentURL.indexOf(collection[i].routePath) === 0)
				found.push(collection[i]);
		}

		return found;
	}

	function findCachedURL(currentURL){
		for (var i = collection.length-1; i >= 0; i--) { // Search from deep view first
			if(currentURL === collection[i].routePath)
				return collection[i];
		}

		return false;
	}

	function routeError_(xhr, data){
		if(xhr.aborted) return;
		routingError = true;

		RouterLoading = false;
		for (var i = 0; i < onEvent['routeError'].length; i++) {
			onEvent['routeError'][i](xhr.status, data);
		}

		window.history.go(routeDirection * -1);
	}

	var pageViewNodeName = 'SF-PAGE-VIEW';
	function toBeShowed(element, event, path, data){
		var relatedPage = [element];

		var parent = element.parentNode;
		while(parent !== rootDOM && parent !== null){
			if(parent.nodeName === pageViewNodeName)
				relatedPage.unshift(parent);

			parent = parent.parentNode;
		}

		var lastSibling = void 0;
		var parentSimilarity = void 0;

		for (var i = 0; i < self.relatedDOM.length; i++) {
			if(relatedPage.indexOf(self.relatedDOM[i]) === -1){
				if(lastSibling === void 0){
					lastSibling = self.relatedDOM[i];
					parentSimilarity = lastSibling.parentNode;
				}

				self.relatedDOM[i].classList.remove('page-current');
			}
		}

		var showedSibling = void 0;
		for (var i = 0; i < relatedPage.length; i++) {
			if(showedSibling === void 0 && relatedPage[i].parentNode === parentSimilarity)
				showedSibling = relatedPage[i];

			relatedPage[i].classList.add('page-current');
		}

		self.showedSibling = showedSibling;
		self.lastSibling = lastSibling;

		element.classList.add('page-current');

		self.relatedDOM = relatedPage;
	}

	self.goto = function(path, data, method, _callback){
		if(self.currentPath === path)
			return;

		pendingAutoRoute = false;

		// Get template URL
		var url = routes.findRoute(path);
		if(!url) return;

		// Return when beforeRoute returned truthy value
		if(url.beforeRoute !== void 0 && url.beforeRoute(url.data))
			return;

		if(name === slash)
			sf.url.paths = path;
		else if(name)
			aHashes[name] = path;

		// This won't trigger popstate event
		if(!disableHistoryPush && !_callback)
			sf.url.push();

		// Check if view was exist
		if(!rootDOM.isConnected){
			if(rootDOM.nodeType !== void 0)
				rootDOM = {};

			if(self.selector() === false)
				return console.error(name, "can't route to", path, "because element with selector '"+selector+"' was not found");
		}

		// Abort other router loading if exist
		if(RouterLoading) RouterLoading.abort();

		// Return if the cache was exist
		if(tryCache(path)) return true;

		for (var i = 0; i < onEvent['routeStart'].length; i++) {
			if(onEvent['routeStart'][i](self.currentPath, path)) return;
		}

		self.data = url.data;

		function insertLoadedElement(DOMReference, dom, parentNode, pendingShowed){
			if(parentNode)
				dom.parentPageElement = parentNode;

			dom.routerData = {};
			if(dom.firstChild.nodeName === '#comment' && dom.firstChild.textContent.indexOf(' SF-View-Data') === 0){
				dom.routerData = JSON.parse(dom.firstChild.textContent.slice(14));
				dom.firstChild.remove();
			}

			Object.assign(self.data, dom.routerData)

			// Let page script running first
			DOMReference.insertAdjacentElement('beforeend', dom);

			if(self.dynamicScript !== false){
				var scripts = dom.getElementsByTagName('script');
				for (var i = 0; i < scripts.length; i++) {
				    gEval(scripts[i].text);
				}
			}

			// Wait if there are some component that being initialized
			setTimeout(function(){
				// Parse the DOM data binding
				// sf.model.init(dom);

				if(url.on !== void 0 && url.on.coming)
					url.on.coming(self.data);

				if(url.cache)
					dom.routeNoRemove = true;

				var tempDOM = self.currentDOM;
				self.currentDOM = dom;

				toBeShowed(dom);

				// Trigger loaded event
				var event = onEvent['routeFinish'];
				for (var i = 0; i < event.length; i++) {
					if(event[i](self.currentPath, path)) return;
				}

				if(pendingShowed !== void 0)
					self.relatedDOM.push.apply(self.relatedDOM, pendingShowed);

				if(tempDOM !== null){
					self.lastPath = self.currentPath;

					// Old route
					if(tempDOM.routeCached && tempDOM.routeCached.on !== void 0 && tempDOM.routeCached.on.leaving)
						tempDOM.routeCached.on.leaving(path, url);

					self.lastDOM = tempDOM;
				}

				// Save current URL
				self.currentPath = path;
				dom.routeCached = url;
				dom.routePath = path;

				dom.classList.remove('page-prepare');
				routingError = false;

				// Clear old cache
				var parent = self.currentDOM.parentNode;
				for (var i = parent.childElementCount - self.maxCache - 1; i >= 0; i--) {
					if(parent.defaultViewContent !== parent.firstElementChild && parent.firstElementChild.routeNoRemove)
						parent.firstElementChild.remove();
					else if(parent.childElementCount > 1)
						parent.firstElementChild.nextElementSibling.remove();
				}

				if(url.on !== void 0 && url.on.showed)
					url.on.showed(self.data);

				if(tempDOM !== null){
					// Old route
					if(tempDOM.routeCached && tempDOM.routeCached.on !== void 0 && tempDOM.routeCached.on.hidden)
						tempDOM.routeCached.on.hidden(path, url);
				}
			});
		}

		var afterDOMLoaded = function(dom){
			if(url.selector || url.hasChild){
				var selectorElement = dom.sf$viewSelector;

				if(selectorElement === void 0)
					selectorElement = dom.sf$viewSelector = {};
			}

			if(url.hasChild){
				var pendingShowed = [];
				for (var i = 0; i < url.hasChild.length; i++) {
					selectorElement[url.hasChild[i]] = self.selector(url.hasChild[i], dom, path);
					var tempPageView = selectorElement[url.hasChild[i]].firstElementChild;

					if(tempPageView)
						pendingShowed.unshift(tempPageView);
				}

				if(pendingShowed.length === 0)
					pendingShowed = void 0;
			}
			else var pendingShowed = void 0;

			if(url.selector === void 0)
				var DOMReference = rootDOM;
			else{ // Get element from selector
				var selectorName = selectorList[url.selector];
				var DOMReference = null;

				var last = findRelatedElement(path);

				// Find current parent
				for (var i = 0; i < last.length; i++) {
					var found = last[i].sf$viewSelector;
					if(found === void 0 || found[selectorName] === void 0)
						continue;

					DOMReference = found[selectorName];
				}

				if(!DOMReference || !DOMReference.isConnected){
					if(url.parent === void 0){
						dom.remove();
						return routeError_({status:0});
					}
					else{
						// Try to load parent router first
						var newPath = path.match(url.parent.forChild)[0];
						return self.goto(newPath, false, method, function(parentNode){
							DOMReference = parentNode.sf$viewSelector[selectorName];
							insertLoadedElement(DOMReference, dom, parentNode);

							if(_callback) return _callback(dom);

							var defaultViewContent = dom.parentNode.defaultViewContent;
							if(defaultViewContent.routePath !== path)
								defaultViewContent.classList.remove('page-current');
						});
					}
				}
			}

			insertLoadedElement(DOMReference, dom, false, pendingShowed);
			if(_callback) _callback(dom);
		}

		//(url.url || path)
		if(url.templateURL !== void 0 && cachedURL[url.templateURL] !== void 0){
			afterDOMLoaded(cachedURL[url.templateURL].cloneNode(true));
			return true;
		}

		if(url.template && url.html === void 0){
			if(window.templates === void 0)
				return console.error("`window.templates` was not found");
			internal.component.skip = true;

			// Create new element
			url.html = document.createElement('sf-page-view');
			url.html.innerHTML = window.templates[url.template+'.html'];

			internal.component.skip = false;
			url.html.classList.add('page-prepare');
		}

		if(url.html){
			afterDOMLoaded(url.html.cloneNode(true));
			return true;
		}

		RouterLoading = sf.ajax({
			url:window.location.origin + (url.templateURL || url.url || path),
			method:method || 'GET',
		    data:Object.assign(data || url.defaultData, {
		        _sf_view:url.selector === void 0 ? selector : selectorList[url.selector].split(' ').pop()
		    }),
			success:function(html_content){
				if(rejectResponse.test(html_content)){
					console.error("Views request was received <html> while it was disalowed. Please check http response from Network Tab.");
					return routeError_(1);
				}

				// Create new element
				var dom = document.createElement('sf-page-view');
				dom.innerHTML = html_content;
				dom.classList.add('page-prepare');

				// Same as above but without the component initialization
				if(url.templateURL !== void 0){
					internal.component.skip = true;
					var temp = document.createElement('sf-page-view');
					temp.innerHTML = html_content;
					temp.classList.add('page-prepare');
					cachedURL[url.templateURL] = temp;
					internal.component.skip = false;
				}

				afterDOMLoaded(dom);
			},
			error:routeError_
		});
		return true;
	}

	// Use to cache if exist
	function tryCache(path){
		var cachedDOM = false;

		function findDOM(dom){
			if(dom === null)
				return false;

			cachedDOM = findCachedURL(path);
			if(cachedDOM)
				return true;

			var childs = dom.children;
			for (var i = 0; i < childs.length; i++) {
				if(childs[i].routePath === path){
					cachedDOM = childs[i];
					// console.warn('cache found for', path, childs[i]);
					return true;
				}
			}

			return false;
		}

		if(findDOM(rootDOM) === false)
			for (var i = 0; i < selectorList.length; i++) {
				if(findDOM(rootDOM.querySelector(selectorList[i])))
					break;
			}

		if(cachedDOM === false)
			return false;

		var lastDOM = self.currentDOM;
		if(self.currentDOM.routeCached.on !== void 0 && self.currentDOM.routeCached.on.leaving)
			self.currentDOM.routeCached.on.leaving();

		self.currentDOM = cachedDOM;
		self.data = cachedDOM.routerData;

		if(self.currentDOM.routeCached.on !== void 0 && self.currentDOM.routeCached.on.coming)
			self.currentDOM.routeCached.on.coming();

		toBeShowed(cachedDOM);

		var event = onEvent['routeCached'];
		for (var i = 0; i < event.length; i++) {
			event[i](self.currentPath, self.lastPath);
		}

		self.lastPath = self.currentPath;
		self.currentPath = self.currentDOM.routePath;

		if(self.currentDOM.routeCached.on !== void 0 && self.currentDOM.routeCached.on.showed)
			self.currentDOM.routeCached.on.showed();

		if(lastDOM.routeCached.on !== void 0 && lastDOM.routeCached.on.hidden)
			lastDOM.routeCached.on.hidden();

		return true;
	}

	return self;
}

self.list = {};
self.goto = function(url){
	var parsed = sf.url.parse(url);
	sf.url.data = parsed.data;

	var list = self.list;

	// For root path
	if(list[slash] !== void 0){
		var ref = list[slash];
		for (var a = 0; a < ref.length; a++) {
			if(ref[a].currentPath !== parsed.paths)
				ref[a].goto(parsed.paths);
		}
	}

	// For hash path
	var view = Object.keys(parsed.hashes);
	for (var i = 0; i < view.length; i++) {
		var ref = list[view[i]];
		if(ref === void 0) continue;

		for (var a = 0; a < ref.length; a++) {
			if(ref[a].currentPath !== parsed.hashes[view[i]])
				ref[a].goto(parsed.hashes[view[i]]);
		}
	}
}

})();