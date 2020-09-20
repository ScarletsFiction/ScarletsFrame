;(function(){
const gEval = routerEval;
routerEval = void 0; // Avoid this function being invoked out of scope

const rejectResponse = /<html/;

// Save reference
const slash = '/';

let routingError = false;
let routeDirection = 1;
let historyIndex = (window.history.state || 1);

let disableHistoryPush = false;

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

const cachedURL = {};

internal.router = {};
internal.router.parseRoutes = function(obj_, selectorList){
	const routes = [];
	const pattern = /\/:([^/]+)/g;
    const knownKeys = /^(path|url|template|templateURL|html|on|routes|beforeRoute|defaultData|cache)$/;

	function addRoutes(obj, addition, selector, parent){
		if(selector !== '')
			selector += ' ';

		for(let i = 0; i < obj.length; i++){
            const ref = obj[i];
			let current = addition+ref.path;

			if(ref.routes !== void 0)
				addRoutes(ref.routes, current, selector, parent);

			current = current.split('//').join('/');

			var keys = [];
			const regex = current.replace(pattern, function(full, match){
				keys.push(match);
				return '/([^/]+)';
			});
			const route = RegExp(`^${regex}$`);

			if(ref.url !== void 0)
				route.url = ref.url;

			else if(ref.templateURL !== void 0)
				route.templateURL = ref.templateURL;

			else if(ref.template !== void 0)
				route.template = ref.template;

			else if(ref.html !== void 0){
				// Create new element
				const dom = route.html = document.createElement('sf-page-view');
				internal.component.skip = true;

				if(ref.html.constructor === String){
					route.html = sf.dom.parseElement(`<template>${ref.html}</template>`, true)[0];
					internal.component.skip = false;
				}
				else dom.appendChild(ref.html);

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

			const hasChild = [];

			for(var keys in ref) {
                if(knownKeys.test(keys))
                	continue;

				hasChild.push(keys);
				addRoutes(ref[keys], current, keys, route);
                break;
            }

            if(hasChild.length !== 0){
            	route.hasChild = hasChild;
            	route.forChild = RegExp(regex);
            }

			routes.push(route);
		}
	}

	if(obj_.constructor !== Array)
		obj_ = [obj_];

    addRoutes(obj_, '', '');
	return routes;
}

internal.router.findRoute = function(url){
	for(let i=0; i<this.length; i++){
		const found = url.match(this[i]);
		if(found !== null){
			const { keys } = this[i];
			if(keys !== void 0){
				const data = this[i].data = {};
				found.shift();

				for (let a = 0; a < keys.length; a++) {
					data[keys[a]] = found[a];
				}
			}

			return this[i];
		}
	}

	return false;
}

const self = sf.views = function View(selector, name){
	if(name === void 0)
		name = slash;

	const self = this;

	if(name)
		sf.views.list[name] = self;

	let pendingAutoRoute = false;

	// Init current URL as current View Path
	if(name === slash)
		self.currentPath = sf.url.paths;
	else if(name === false)
		self.currentPath = '';
	else{
		self.currentPath = '';
		pendingAutoRoute = true;
	}

	let initialized = false;
	let firstRouted = false;

	self.lastPath = '/';
	self.lastDOM = null;
	self.currentDOM = null;
	self.relatedDOM = [];
	self.data = {};

	self.maxCache = 4;
	function removeOldCache(current){
		const parent = current.parentNode;
		if(parent.sf$cachedDOM === void 0)
			parent.sf$cachedDOM = [];

		const i = parent.sf$cachedDOM.indexOf(current);
		if(i === -1)
			parent.sf$cachedDOM.push(current);
		else
			parent.sf$cachedDOM.push(parent.sf$cachedDOM.splice(i, 1)[0]);

		if(self.maxCache < parent.sf$cachedDOM.length)
			parent.sf$cachedDOM.shift().remove();
	}

	let rootDOM = self.rootDOM = {};
	function getSelector(selector_, isChild, currentPath){
		let DOM = (isChild || (rootDOM.isConnected ? rootDOM : document.body)).getElementsByTagName(selector_ || selector);
		if(DOM.length === 0) return false;

		DOM = DOM[0];
		if(DOM.sf$viewInitialized) return false;

		initialized = true;

		if(collection === null)
			collection = DOM.getElementsByTagName('sf-page-view');

		// if(selector_)
		// 	selector = selector_;

		// Create listener for link click
		let temp = null;

		// Bring the content to an sf-page-view element
		if(DOM.childNodes.length !== 0){
			if(DOM.childNodes.length === 1 && DOM.firstChild.nodeName === '#text' && DOM.firstChild.textContent.trim() === '')
				DOM.firstChild.remove();
			else{
				temp = document.createElement('sf-page-view');
				DOM.insertBefore(temp, DOM.firstChild);

				for (let i = 1, n = DOM.childNodes.length; i < n; i++) {
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
			rootDOM = self.rootDOM = DOM;
			return true;
		}

		return DOM;
	}

    const selectorList = [selector];
	var routes = self.routes = [];
	routes.findRoute = internal.router.findRoute;

	internal.router.enabled = true;

	const onEvent = {
		'start':[],
		'finish':[],
		'loading':[],
		'loaded':[],
		'error':[]
	};

	self.on = function(event, func){
		if(event.includes(' ')){
			event = event.split(' ');
			for (let i = 0; i < event.length; i++) {
				self.on(event[i], func);
			}

			return self;
		}

		if(onEvent[event] === void 0)
			return console.error(`Event '${event}' was not exist`);

		if(onEvent[event].includes(func) === false)
			onEvent[event].push(func);

		return self;
	}

	self.off = function(event, func){
		if(event.includes(' ')){
			event = event.split(' ');
			for (var i = 0; i < event.length; i++) {
				self.off(event[i], func);
			}

			return self;
		}

		if(onEvent[event] === void 0)
			return console.error(`Event '${event}' was not exist`);

		if(func === void 0){
			onEvent[event].length = 0;
			return self;
		}

		var i = onEvent[event].indexOf(func);
		if(i === -1)
			return self;

		onEvent[event].splice(i, 1);
		return self;
	}

	self.addRoute = function(obj){
		routes.push.apply(routes, internal.router.parseRoutes(obj, selectorList));

		if(!initialized)
			getSelector();

		if(!firstRouted && name){
			$(function(){
				if(firstRouted)
					return;

				if(name === slash && !rootDOM.childElementCount){
					self.currentPath = '';
					firstRouted = self.goto(sf.url.paths);
				}

				if(pendingAutoRoute){
					if(sf.url.hashes[name] !== void 0)
						firstRouted = self.goto(sf.url.hashes[name]);
					else
						firstRouted = self.goto('/');

					if(firstRouted)
						pendingAutoRoute = false;
				}
			});
		}

		return self;
	}

	let RouterLoading = false; // xhr reference if the router still loading

	var collection = null;
	function findRelatedElement(currentURL){
		const found = [];
		for (let i = 0; i < collection.length; i++) {
			if(currentURL.indexOf(collection[i].routePath) === 0)
				found.push(collection[i]);
		}

		return found;
	}

	function findCachedURL(currentURL){
		for (let i = collection.length-1; i >= 0; i--) { // Search from deep view first
			if(currentURL === collection[i].routePath)
				return collection[i];
		}

		return false;
	}

	function routeErrorPassEvent(statusCode, data){
		const ref = onEvent.error;

		if(ref.length === 0){
			console.error('Unhandled router error:', statusCode, data);
			return;
		}

		for (let i = 0; i < ref.length; i++) {
			ref[i](statusCode, data);
		}
	}

	function routeError_(xhr, data){
		if(xhr.aborted) return;
		routingError = true;

		RouterLoading = false;
		routeErrorPassEvent(xhr.status, data);

		window.history.go(routeDirection * -1);
	}

	const pageViewNodeName = 'SF-PAGE-VIEW';
	function toBeShowed(element, event, path, data){
		const relatedPage = [element];

		let parent = element.parentNode;
		while(parent !== rootDOM && parent !== null){
			if(parent.nodeName === pageViewNodeName)
				relatedPage.unshift(parent);

			parent = parent.parentNode;
		}

		let lastSibling = null;
		let parentSimilarity = null;

		for (var i = 0; i < self.relatedDOM.length; i++) {
			if(relatedPage.includes(self.relatedDOM[i]) === false){
				if(lastSibling === null){
					lastSibling = self.relatedDOM[i];
					parentSimilarity = lastSibling.parentNode;
				}

				self.relatedDOM[i].classList.remove('page-current');
			}
		}

		let showedSibling = null;
		for (var i = 0; i < relatedPage.length; i++) {
			if(showedSibling === null && relatedPage[i].parentNode === parentSimilarity)
				showedSibling = relatedPage[i];

			relatedPage[i].classList.add('page-current');
		}

		self.showedSibling = showedSibling;
		self.lastSibling = lastSibling;

		element.classList.add('page-current');

		self.relatedDOM = relatedPage;
	}

	self.removeRoute = function(path){
		const found = routes.findRoute(path);
		if(found === false)
			return;

		for (var i = 0; i < rootDOM.children.length; i++) {
			if(rootDOM.children[i].routePath.match(found))
				rootDOM.children[i].remove();
		}

		var i = routes.indexOf(found);
		if(i === -1)
			return;

		routes.splice(i, 1);
	}

	let routeTotal = 0;
	self.goto = function(path, data, method, callback, _routeCount){
		if(self.currentPath === path)
			return;

		if(initialized === false){
			getSelector();

			if(initialized === false)
				return console.error("sf.views haven't finished initializing, and waiting for related parent element");
		}

		if(_routeCount === void 0){
			for (var i = 0; i < onEvent.start.length; i++)
				if(onEvent.start[i](self.currentPath, path)) return;

			self.lastPath = self.currentPath;
		}

		if(data !== void 0 && data.constructor === Function){
			callback = data;
			data = void 0;
		}

		if(method !== void 0 && method.constructor === Function){
			callback = method;
			method = void 0;
		}

		let dynamicHTML = false;
		if(data instanceof HTMLElement){
			dynamicHTML = data;
			data = void 0;
		}
		if(method instanceof HTMLElement){
			dynamicHTML = method;
			method = void 0;
		}

		pendingAutoRoute = false;

		// Get template URL
		const url = routes.findRoute(path);
		if(!url){
			return routeErrorPassEvent(404, {
				path,
				message:"Path was not found"
			});
		}

		// Return when beforeRoute returned truthy value
		if(url.beforeRoute !== void 0 && url.beforeRoute(url.data))
			return;

		if(name === slash)
			sf.url.paths = path;
		else if(name)
			sf.url.hashes[name] = path;

		// This won't trigger popstate event
		if(!disableHistoryPush && _routeCount === void 0 && name !== false)
			sf.url.push();

		// Check if view was exist
		if(rootDOM.isConnected === false){
			if(rootDOM.nodeType !== void 0)
				rootDOM = {};

			if(getSelector() === false)
				return console.error(name, "can't route to", path, `because element with selector '${selector}' was not found`);
		}

		// Abort other router loading if exist
		if(RouterLoading) RouterLoading.abort();

		// Return if the cache was exist
		if(dynamicHTML === false && tryCache(path)) return true;

		// Count all parent route
		if(_routeCount === void 0){
			routeTotal = 1;
			let routeParent = url.parent;
			while(routeParent !== void 0){
				routeTotal++;
				routeParent = routeParent.parent;
			}
		}

		const currentData = self.data = url.data;

		function insertLoadedElement(DOMReference, dom, pendingShowed){
			dom.routerData = {};
			if(dom.firstChild.nodeName === '#comment' && dom.firstChild.textContent.indexOf(' SF-View-Data') === 0){
				dom.routerData = JSON.parse(dom.firstChild.textContent.slice(14));
				dom.firstChild.remove();

				Object.assign(self.data, dom.routerData);
			}

			// Trigger loaded event
			const rC = routeTotal + 1 - (_routeCount || 1);
			for (var i = 0; i < onEvent.loaded.length; i++) {
				if(onEvent.loaded[i](rC, routeTotal, dom)) return;
			}

			// Let page script running first
			DOMReference.insertAdjacentElement('beforeend', dom);

			// This may dangerous if the server send a dynamic HTML
			// that have user/server generated content
			if(self.dynamicScript !== false){
				const scripts = dom.getElementsByTagName('script');
				for (var i = 0; i < scripts.length; i++) {
					var script = scripts[i];

					if(!!script.src)
						$.get(script.src, gEval);
				    else gEval(script.text);

				    script.sfLoaded = true;
				}
			}

			// ToDo: Maybe need to wait if there are some component that being initialized
			const tempDOM = self.currentDOM;
			self.lastDOM = tempDOM;
			self.currentDOM = dom;
			self.currentPath = path;

			if(url.on !== void 0 && url.on.coming)
				url.on.coming(self.data);

			if(url.cache)
				dom.routeNoRemove = true;

			toBeShowed(dom);

			if(pendingShowed !== void 0)
				self.relatedDOM.push.apply(self.relatedDOM, pendingShowed);

			if(tempDOM !== null){
				// Old route
				if(tempDOM.routeCached && tempDOM.routeCached.on !== void 0 && tempDOM.routeCached.on.leaving)
					tempDOM.routeCached.on.leaving(path, url);
			}

			// Save current URL
			dom.routeCached = url;
			dom.routePath = path;

			dom.classList.remove('page-prepare');
			routingError = false;

			// Clear old cache
			removeOldCache(dom);

			if(url.on !== void 0 && url.on.showed)
				url.on.showed(self.data);

			if(tempDOM !== null){
				// Old route
				if(tempDOM.routeCached && tempDOM.routeCached.on !== void 0 && tempDOM.routeCached.on.hidden)
					tempDOM.routeCached.on.hidden(path, url);
			}
		}

		const afterDOMLoaded = function(dom){
			if(url.selector || url.hasChild){
				var selectorElement = dom.sf$viewSelector;

				if(selectorElement === void 0)
					selectorElement = dom.sf$viewSelector = {};
			}

			if(hotReload && url.template !== void 0)
				dom.sf$templatePath = url.template;

			if(url.hasChild){
				var pendingShowed = [];
				for (var i = 0; i < url.hasChild.length; i++) {
					selectorElement[url.hasChild[i]] = getSelector(url.hasChild[i], dom, path);
					const tempPageView = selectorElement[url.hasChild[i]].firstElementChild;

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
				const selectorName = selectorList[url.selector];
				var DOMReference = null;

				const last = findRelatedElement(path);

				// Find current parent
				for (var i = 0; i < last.length; i++) {
					const found = last[i].sf$viewSelector;
					if(found === void 0 || found[selectorName] === void 0)
						continue;

					DOMReference = found[selectorName];
				}

				if(!DOMReference || DOMReference.isConnected === false){
					if(url.parent === void 0){
						dom.remove();
						return routeError_({status:0}, {
							path,
							target:dom,
							message:"Parent element was not found while adding this element. Maybe it was disconnected from the DOM."
						});
					}
					else{
						// Try to load parent router first
						const newPath = path.match(url.parent.forChild)[0];
						return self.goto(newPath, false, method, function(parentNode){
							DOMReference = parentNode.sf$viewSelector[selectorName];

							if(currentData !== self.data)
								self.data = Object.assign(currentData, self.data);

							insertLoadedElement(DOMReference, dom);
							if(callback) return callback(dom);

							if(dom.routerData)
								self.data = dom.routerData;
							else if(dom.parentElement !== null){
								const parent = dom.parentElement.closest('sf-page-view');
								if(parent !== null)
									self.data = parent.routerData;
							}

							for (let i = 0; i < onEvent.finish.length; i++)
								onEvent.finish[i](self.lastPath, path);

							const { defaultViewContent } = dom.parentNode;
							if(defaultViewContent !== void 0 && defaultViewContent.routePath !== path)
								defaultViewContent.classList.remove('page-current');
						}, _routeCount + 1 || 2);
					}
				}
			}

			insertLoadedElement(DOMReference, dom, pendingShowed);
			if(callback) return callback(dom);

			if(dom.routerData)
				self.data = dom.routerData;
			else if(dom.parentElement !== null){
				const parent = dom.parentElement.closest('sf-page-view');
				if(parent !== null)
					self.data = parent.routerData;
			}

			for (var i = 0; i < onEvent.finish.length; i++)
				onEvent.finish[i](self.lastPath, path);
		}

		if(dynamicHTML !== false){
			afterDOMLoaded(dynamicHTML);
			return true;
		}

		//(url.url || path)
		if(url.templateURL !== void 0 && cachedURL[url.templateURL] !== void 0){
			afterDOMLoaded(cachedURL[url.templateURL].cloneNode(true));
			return true;
		}

		if(url.template && url.html === void 0){
			if(window.templates === void 0)
				return console.error("`window.templates` was not found");

			// Create new element
			url.html = sf.dom.parseElement(`<template>${window.templates[url.template+'.html']}</template>`, true)[0];

			if(hotReload)
				url.template = url.template+'.html';
		}

		if(url.html){
			if(url.html.nodeName === 'TEMPLATE'){
				const node = document.createElement('sf-page-view');
				node.classList.add('page-prepare');

				const clone = url.html.cloneNode(true).content.childNodes;
				for(let p=0, n=clone.length; p < n; p++){
					node.insertBefore(clone[0], null);
				}

				afterDOMLoaded(node);
				return true;
			}

			afterDOMLoaded(url.html.cloneNode(true));
			return true;
		}

		let thePath = (url.templateURL || url.url || path);
		if(thePath[0] !== '/')
			thePath = `/${thePath}`;

		for (var i = 0; i < onEvent.loading.length; i++)
			if(onEvent.loading[i](_routeCount || 1, routeTotal)) return;

		RouterLoading = sf.request(
			method || 'GET',
			window.location.origin + thePath,
			Object.assign(data || url.defaultData, {
		        _sf_view:url.selector === void 0 ? selector : selectorList[url.selector].split(' ').pop()
		    })
		)
		.done(function(html_content){
			if(rejectResponse.test(html_content)){
				return routeError_({status:403}, {
					path,
					requestURL:window.location.origin + thePath,
					message:"Views request was received <html> while it was disallowed. Please check http response from Network Tab."
				});
			}

			// Create new element
			const dom = document.createElement('sf-page-view');
			dom.classList.add('page-prepare');

			var elements = sf.dom.parseElement(html_content);
			for(var p=0, n=elements.length; p < n; p++){
				dom.insertBefore(elements[0], null);
			}

			// Same as above but without the component initialization
			if(url.templateURL !== void 0){
				internal.component.skip = true;
				const temp = document.createElement('sf-page-view');
				temp.classList.add('page-prepare');

				var elements = sf.dom.parseElement(html_content);
				for(var p=0, n=elements.length; p < n; p++){
					temp.insertBefore(elements[0], null);
				}

				cachedURL[url.templateURL] = temp;
				internal.component.skip = false;
			}

			afterDOMLoaded(dom);
		})
		.fail(routeError_);
		return true;
	}

	// Use cache if exist
	function tryCache(path){
		let cachedDOM = false;

		function findDOM(dom){
			if(dom === null)
				return false;

			cachedDOM = findCachedURL(path);
			if(cachedDOM)
				return true;

			const childs = dom.children;
			for (let i = 0; i < childs.length; i++) {
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

		self.lastDOM = self.currentDOM;
		if(self.currentDOM.routeCached.on !== void 0 && self.currentDOM.routeCached.on.leaving)
			self.currentDOM.routeCached.on.leaving();

		self.currentDOM = cachedDOM;

		if(cachedDOM.routerData)
			self.data = cachedDOM.routerData;
		else if(cachedDOM.parentElement !== null){
			const parent = cachedDOM.parentElement.closest('sf-page-view');
			if(parent !== null)
				self.data = parent.routerData;
		}

		if(self.currentDOM.routeCached.on !== void 0 && self.currentDOM.routeCached.on.coming)
			self.currentDOM.routeCached.on.coming(self.data);

		self.currentPath = self.currentDOM.routePath;

		toBeShowed(cachedDOM);

		for(var i = 0; i < onEvent.finish.length; i++)
			onEvent.finish[i](self.lastPath, self.currentPath);

		if(self.currentDOM.routeCached.on !== void 0 && self.currentDOM.routeCached.on.showed)
			self.currentDOM.routeCached.on.showed(self.data);

		if(self.lastDOM.routeCached.on !== void 0 && self.lastDOM.routeCached.on.hidden)
			self.lastDOM.routeCached.on.hidden();

		return true;
	}

	return self;
};

self.list = {};
self.goto = function(url){
	const parsed = sf.url.parse(url);
	sf.url.data = parsed.data;

	const views = self.list;

	for(let list in self.list){
		// For root path
		if(list === slash){
			if(views[slash].currentPath !== parsed.paths)
				views[slash].goto(parsed.paths);

			continue;
		}

		// For hash path
		if(parsed.hashes[list] !== views[list].currentPath)
			views[list].goto(parsed.hashes[list] || '/');
	}
}

// Listen to every link click, capture mode
$(function(){
	if(sf.views.onCrossing === void 0)
		sf.views.onCrossing = function(url, target){
			console.error("Unhandled crossing URL origin", url, target);
			console.warn("Handle it by make your custom function like `sf.views.onCrossing = func(){}`");
		};

	$.on(document.body, 'click', 'a[href]', function(ev){
		ev.preventDefault();

		const attr = this.getAttribute('href');
		if(attr[0] === '@'){ // ignore
			const target = this.getAttribute('target');
			if(target)
				window.open(attr.slice(1), target);
			else window.location = attr.slice(1);
			return;
		}

		// Make sure it's from current origin
		const path = this.href.replace(window.location.origin, '');

		// If it's different domain
		if(path.includes('//')){
			sf.views.onCrossing(this.href, this.getAttribute('target'));
			return;
		}

		// Let ScarletsFrame handle this link
		self.goto(attr);
	}, true);
});

})();