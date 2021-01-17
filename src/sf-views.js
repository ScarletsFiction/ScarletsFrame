import {internal, forProxying, SFOptions} from "./shared.js";
import $ from "./sf-dom.js";
import SFURI from "./sf-uri.js";
import Request from "./sf-request.js";
import Security from "./sf-security.js";
import {getCallerFile} from "./sf-hot-reload.js";

export class SFPageView extends HTMLElement{}
if(window.sf$proxy)
	SFPageView._ref = window.sf$proxy.SFPageView;
else forProxying.SFPageView = SFPageView._ref = SFPageView;

customElements.define('sf-page-view', SFPageView);

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

	// Reparse current URL
	Self.goto();
	disableHistoryPush = false;
	SFURI.trigger();
}, false);

const cachedURL = {};
const knownKeys = ['path','url','template','templateURL','html','on','routes','beforeRoute','defaultData','cache'];

internal.router = {};
internal.router.parseRoutes = function(obj_, selectorList){
	const routes = [];
	const pattern = /\/:([^/]+)/g;

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
					route.html = $.parseElement(`<template>${ref.html}</template>`, true)[0];
					internal.component.skip = false;
				}
				else dom.appendChild(ref.html);

				internal.component.skip = false;
				dom.className = 'page-prepare';
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
                if(knownKeys.includes(keys))
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

// ToDo turn this into a class
export default function Self(selector, name){
	if(this.Views === Self)
		return console.error('sf.Views need to be constructed using "new sf.Views"');

	// If undefined then name set it as '/'
	name ??= slash;

	// if have name and  not false
	if(name)
		Self.list[name] = Self;

	let pendingAutoRoute = false;

	// Init current URL as current View Path
	if(name === slash)
		Self.currentPath = SFURI.path;
	else if(name === false)
		Self.currentPath = '';
	else{
		Self.currentPath = '';
		pendingAutoRoute = true;
	}

	let initialized = false;
	let firstRouted = false;

	Self.lastPath = '/';
	Self.lastDOM = null;
	Self.currentDOM = null;
	Self.dynamicScript = false;
	Self.relatedDOM = [];
	Self.data = {};

	Self.maxCache = 4;
	function removeOldCache(current){
		const parent = current.parentNode;
		parent.sf$cachedDOM ??= [];

		const i = parent.sf$cachedDOM.indexOf(current);
		if(i === -1)
			parent.sf$cachedDOM.push(current);
		else
			parent.sf$cachedDOM.push(parent.sf$cachedDOM.splice(i, 1)[0]);

		if(Self.maxCache < parent.sf$cachedDOM.length)
			parent.sf$cachedDOM.shift().remove();
	}

	let rootDOM = Self.rootDOM = {};
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
			const { firstChild } = DOM;
			if(DOM.childNodes.length === 1 && (firstChild.constructor._ref || firstChild.constructor) === Text && firstChild.textContent.trim() === '')
				firstChild.remove();
			else{
				temp = document.createElement('sf-page-view');
				DOM.insertBefore(temp, firstChild);

				for (let i = 1, n = DOM.childNodes.length; i < n; i++) {
					temp.appendChild(DOM.childNodes[1]);
				}

				temp.routePath = currentPath || Self.currentPath;
				temp.routeCached = routes.findRoute(temp.routePath);
				temp.classList.add('page-current');
				DOM.defaultViewContent = temp;
			}
		}

		DOM.sf$viewInitialized = true;

		if(SFOptions.devMode) DOM.scope = Self;

		if(!isChild){
			Self.currentDOM = temp;
			rootDOM = Self.rootDOM = DOM;
			return true;
		}

		return DOM;
	}

    const selectorList = [selector];
	var routes = Self.routes = [];
	routes.findRoute = internal.router.findRoute;

	internal.router.enabled = true;

	const onEvent = {
		'start':[],
		'finish':[],
		'loading':[],
		'loaded':[],
		'error':[]
	};

	Self.on = function(event, func){
		if(event.includes(' ')){
			event = event.split(' ');
			for (let i = 0; i < event.length; i++) {
				Self.on(event[i], func);
			}

			return Self;
		}

		if(!(event in onEvent))
			return console.error(`Event '${event}' was not exist`);

		if(onEvent[event].includes(func) === false)
			onEvent[event].push(func);

		return Self;
	}

	Self.off = function(event, func){
		if(event.includes(' ')){
			event = event.split(' ');
			for (var i = 0; i < event.length; i++) {
				Self.off(event[i], func);
			}

			return Self;
		}

		if(!(event in onEvent))
			return console.error(`Event '${event}' was not exist`);

		if(func === void 0){
			onEvent[event].length = 0;
			return Self;
		}

		var i = onEvent[event].indexOf(func);
		if(i === -1)
			return Self;

		onEvent[event].splice(i, 1);
		return Self;
	}

	var devAddLocked = 0;
	Self.addRoute = function(obj){
		routes.push(...internal.router.parseRoutes(obj, selectorList));

		if(SFOptions.devMode && devAddLocked !== true){
			if(Self.$devData === void 0)
				Object.defineProperty(Self, '$devData', {
					configurable: true,
					value: {
						path:[],
					}
				});

			clearTimeout(devAddLocked);
			devAddLocked = setTimeout(function(){devAddLocked = true}, 1000);
			Self.$devData.path.push(getCallerFile(1));
		}

		if(!initialized)
			getSelector();

		if(!firstRouted && name){
			$(function(){
				if(firstRouted)
					return;

				if(name === slash && !rootDOM.childElementCount){
					Self.currentPath = '';
					disableHistoryPush = true;
					firstRouted = Self.goto(SFURI.path);
					disableHistoryPush = false;
				}

				if(pendingAutoRoute){
					if(name in SFURI.routes)
						firstRouted = Self.goto(SFURI.routes[name]);
					else
						firstRouted = Self.goto('/');

					if(firstRouted)
						pendingAutoRoute = false;
				}
			});
		}

		return Self;
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

	function toBeShowed(element){
		const relatedPage = [element];

		let parent = element.parentNode;
		while(parent !== rootDOM && parent !== null){
			if(parent.constructor._ref === SFPageView._ref)
				relatedPage.unshift(parent);

			parent = parent.parentNode;
		}

		let lastSibling = null;
		let parentSimilarity = null;

		for (var i = 0; i < Self.relatedDOM.length; i++) {
			if(relatedPage.includes(Self.relatedDOM[i]) === false){
				if(lastSibling === null){
					lastSibling = Self.relatedDOM[i];
					parentSimilarity = lastSibling.parentNode;
				}

				Self.relatedDOM[i].classList.remove('page-current');
			}
		}

		let showedSibling = null;
		for (var i = 0; i < relatedPage.length; i++) {
			if(showedSibling === null && relatedPage[i].parentNode === parentSimilarity)
				showedSibling = relatedPage[i];

			relatedPage[i].classList.add('page-current');
		}

		Self.showedSibling = showedSibling;
		Self.lastSibling = lastSibling;

		element.classList.add('page-current');

		Self.relatedDOM = relatedPage;
	}

	Self.removeRoute = function(path){
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
	Self.goto = function(path, data, method, callback, _routeCount){
		if(Self.currentPath === path)
			return;

		if(initialized === false){
			getSelector();

			if(initialized === false)
				return console.error("sf.Views haven't finished initializing, and waiting for related parent element");
		}

		if(_routeCount === void 0){
			for (var i = 0; i < onEvent.start.length; i++)
				if(onEvent.start[i](Self.currentPath, path)) return;

			Self.lastPath = Self.currentPath;
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
		const realPath = path.split('?')[0];

		// Get template URL
		const url = routes.findRoute(realPath);
		if(!url){
			return routeErrorPassEvent(404, {
				path,
				message:"Path was not found"
			});
		}

		// Return when beforeRoute returned truthy value
		if(url.beforeRoute !== void 0 && url.beforeRoute(url.data))
			return;

		if(_routeCount === void 0){
			if(name === slash)
				SFURI.path = path;
			else if(name)
				SFURI.routes[name] = path;

			// This won't trigger popstate event
			if(!disableHistoryPush && name !== false)
				SFURI.push();
		}

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

		const currentData = Self.data = url.data;

		function insertLoadedElement(DOMReference, dom, pendingShowed){
			dom.routerData = {};
			const { firstChild } = dom;
			if((firstChild.constructor._ref || firstChild.constructor) === Comment && firstChild.textContent.indexOf(' SF-View-Data') === 0){
				dom.routerData = JSON.parse(firstChild.textContent.slice(14));
				firstChild.remove();

				Object.assign(Self.data, dom.routerData);
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
			if(Self.dynamicScript !== false){
				const scripts = dom.getElementsByTagName('script');
				for (var i = 0; i < scripts.length; i++) {
					var script = scripts[i];

					if(script.sfLoaded)
						continue;

					var newTag = document.createElement('script');
					if(script.src)
						newTag.src = script.src;
					else newTag.text = script.text;

					var next = script.nextSibling;
					var parent = script.parentNode;
					script.remove();
					parent.insertBefore(newTag, next);

				    newTag.sfLoaded = true;
				}
			}

			// ToDo: Maybe need to wait if there are some component that being initialized
			const tempDOM = Self.currentDOM;
			Self.lastDOM = tempDOM;
			Self.currentDOM = dom;
			Self.currentPath = path;

			if(url.on !== void 0 && url.on.coming)
				url.on.coming(Self.data);

			if(url.cache)
				dom.routeNoRemove = true;

			toBeShowed(dom);

			if(pendingShowed !== void 0)
				Self.relatedDOM.push(...pendingShowed);

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
				url.on.showed(Self.data);

			if(tempDOM !== null){
				// Old route
				if(tempDOM.routeCached && tempDOM.routeCached.on !== void 0 && tempDOM.routeCached.on.hidden)
					tempDOM.routeCached.on.hidden(path, url);
			}
		}

		const afterDOMLoaded = function(dom){
			if(url.selector || url.hasChild)
				var selectorElement = dom.sf$viewSelector ??= {};

			if(SFOptions.devMode && url.template !== void 0)
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
					if(found === void 0 || !(selectorName in found))
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
						return Self.goto(newPath, false, method, function(parentNode){
							DOMReference = parentNode.sf$viewSelector[selectorName];

							if(currentData !== Self.data)
								Self.data = Object.assign(currentData, Self.data);

							insertLoadedElement(DOMReference, dom);
							if(callback) return callback(dom);

							if(dom.routerData)
								Self.data = Object.assign(dom.routerData, Self.data);
							else if(dom.parentElement !== null){
								const parent = dom.parentElement.closest('sf-page-view');
								if(parent !== null)
									Self.data = parent.routerData;
							}

							for (let i = 0; i < onEvent.finish.length; i++)
								onEvent.finish[i](Self.lastPath, path);

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
				Self.data = Object.assign(dom.routerData, Self.data);
			else if(dom.parentElement !== null){
				const parent = dom.parentElement.closest('sf-page-view');
				if(parent !== null)
					Self.data = parent.routerData;
			}

			for (var i = 0; i < onEvent.finish.length; i++)
				onEvent.finish[i](Self.lastPath, path);
		}

		if(dynamicHTML !== false){
			afterDOMLoaded(dynamicHTML);
			return true;
		}

		//(url.url || path)
		if(url.templateURL !== void 0 && url.templateURL in cachedURL){
			afterDOMLoaded(cachedURL[url.templateURL].cloneNode(true));
			return true;
		}

		if(url.template && url.html === void 0){
			if(window.templates === void 0)
				return console.error("`window.templates` was not found");

			const htmlTemp = window.templates[url.template];
			if(htmlTemp === void 0) return console.error("Template not found: '"+url.template+"', does the file extension was match?");

			// Create new element
			url.html = $.parseElement(`<template>${htmlTemp}</template>`, true)[0];
		}

		if(url.html){
			if((url.html.constructor._ref || url.html.constructor) === HTMLTemplateElement){
				const node = document.createElement('sf-page-view');
				node.className = 'page-prepare';

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
		if(thePath.slice(0, 1) !== '/')
			thePath = `/${thePath}`;

		for (var i = 0; i < onEvent.loading.length; i++)
			if(onEvent.loading[i](_routeCount || 1, routeTotal)) return;

		RouterLoading = Request(
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
			dom.className = 'page-prepare';

			var elements = $.parseElement(html_content);
			for(var p=0, n=elements.length; p < n; p++){
				dom.insertBefore(elements[0], null);
			}

			// Same as above but without the component initialization
			if(url.templateURL !== void 0){
				internal.component.skip = true;
				const temp = document.createElement('sf-page-view');
				temp.className = 'page-prepare';

				var elements = $.parseElement(html_content);
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

		Self.lastDOM = Self.currentDOM;
		if(Self.currentDOM.routeCached.on !== void 0 && Self.currentDOM.routeCached.on.leaving)
			Self.currentDOM.routeCached.on.leaving();

		Self.currentDOM = cachedDOM;

		if(cachedDOM.routerData)
			Self.data = cachedDOM.routerData;
		else if(cachedDOM.parentElement !== null){
			const parent = cachedDOM.parentElement.closest('sf-page-view');
			if(parent !== null)
				Self.data = parent.routerData;
		}

		if(Self.currentDOM.routeCached.on !== void 0 && Self.currentDOM.routeCached.on.coming)
			Self.currentDOM.routeCached.on.coming(Self.data);

		Self.currentPath = Self.currentDOM.routePath;

		toBeShowed(cachedDOM);

		for(var i = 0; i < onEvent.finish.length; i++)
			onEvent.finish[i](Self.lastPath, Self.currentPath);

		if(Self.currentDOM.routeCached.on !== void 0 && Self.currentDOM.routeCached.on.showed)
			Self.currentDOM.routeCached.on.showed(Self.data);

		if(Self.lastDOM.routeCached.on !== void 0 && Self.lastDOM.routeCached.on.hidden)
			Self.lastDOM.routeCached.on.hidden();

		return true;
	}

	Self.resetCache = function(){
		delete cachedURL[views.currentDOM.routeCached.templateURL];
		Self.currentDOM.remove();

		const relation = views.relatedDOM;
		for (var i = 1; i < relation.length; i++){
			delete cachedURL[relation[i].routeCached.templateURL];
			relation[i].remove();
		}

		const temp = Self.currentPath;
		Self.currentPath = '';
		Self.currentDOM = {routeCached:{}};
		Self.goto(temp);
	}

	return Self;
};

Self.list = {};
Self.goto = function(url){
	const parsed = SFURI.parse(url);
	SFURI.data = parsed.data;
	SFURI.query = parsed.query;
	// SFURI.routes = parsed.routes;

	const views = Self.list;

	for(let list in Self.list){
		// For root path
		if(list === slash){
			if(views[slash].currentPath !== parsed.path)
				views[slash].goto(parsed.path);

			continue;
		}

		// For hash path
		if(parsed.routes[list] !== views[list].currentPath)
			views[list].goto(parsed.routes[list] || '/');
	}
}

Self.resetCache = function(){
	cachedURL = {};
}

// Listen to every link click, capture mode
$(function(){
	if(Self.onCrossing === void 0)
		Self.onCrossing = function(url, target){
			console.error("Unhandled crossing URL origin", url, target);
			console.warn("Handle it by make your custom function like `sf.Views.onCrossing = func(){}`");
		};

	$.on(document.body, 'click', 'a[href]', function(ev){
		ev.preventDefault();

		if(ev.isTrusted === false && internal.rejectUntrusted)
			return Security.report && Security.report(1,ev);

		const attr = this.getAttribute('href');
		if(attr.slice(0, 1) === '@'){ // ignore
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
			Self.onCrossing(this.href, this.getAttribute('target'));
			return;
		}

		// Let ScarletsFrame handle this link
		Self.goto(attr);
	}, true);
});