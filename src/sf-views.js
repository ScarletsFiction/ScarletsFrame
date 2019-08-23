;(function(){
var gEval = routerEval;
routerEval = void 0; // Avoid this function being invoked out of scope

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

	// Reparse URL
	sf.url.parse();
	var list = self.list;

	if(window.history.state >= historyIndex)
		routeDirection = 1;
	else
		routeDirection = -1;

	historyIndex += routeDirection;

	// console.warn('historyIndex', historyIndex, window.history.state, routeDirection > 0 ? 'forward' : 'backward');

	// For root path
	list[slash].goto(sf.url.paths);

	// For hash path
	var keys = Object.keys(aHashes);
	for (var i = 0; i < keys.length; i++) {
		var temp = list[keys[i]];
		if(temp === void 0) continue;

		temp.goto(aHashes[keys[i]]);
	}

	disableHistoryPush = false;
}, false);

internal.router = {};
internal.router.parseRoutes = function(obj_, selectorList){
	var routes = [];
	var pattern = /\/:[^/]+/;
	var sep = /\-/;
    var knownKeys = /path|url|on|routes/;

	function addRoutes(obj, addition, selector, parent){
		if(selector !== false)
			selector += ' ';

		for(var i = 0; i < obj.length; i++){
            var ref = obj[i];
			var current = addition+ref.path;

			if(ref.routes !== void 0){
				addRoutes(ref.routes, current, selector, parent);
				continue;
			}

			var route = RegExp('^' + current.replace(pattern, '/([^/]+)') + '$');
			route.url = ref.url;

			if(selector !== false){
				route.selector = selectorList.indexOf(selector);

				if(route.selector === -1){
					route.selector = selectorList.length;
					selectorList.push(selector);
				}
			}

			if(parent !== void 0)
				route.parent = parent;

			if(ref.on !== void 0)
				route.on = ref.on;

            var keys = Object.keys(ref);
            for(var a = 0; a < keys.length; a++){
                if(knownKeys.test(keys[a]))
                  continue;

				addRoutes(ref[keys[a]], current, selector + keys[a], route);
                break;
            }

			routes.push(route);
		}
	}

    addRoutes(obj_, '', false);
	return routes;
}

internal.router.findRoute = function(url){
	for(var i=0; i<this.length; i++){
		var found = url.match(this[i]);
		if(found !== null){
			this[i].data = found;
			return this[i];
		}
	}

	return false;
}

var self = sf.views = function View(selector, name){
	if(name === void 0)
		name = slash;

	var self = sf.views.list[name] = this;
	self.currentPath = '/';
	self.lastPath = '/';
	self.currentDOM = null;
	self.lastDOM = null;

	self.maxCache = 2;

	var rootDOM = {};
	self.selector = function(selector_){
		rootDOM = document.querySelector(selector_ || selector);

		// Create listener for link click
		if(rootDOM){
			if(selector_)
				selector = selector_;

			// Bring the content to an sf-page-view element
			var temp = document.createElement('sf-page-view');
			rootDOM.insertBefore(temp, rootDOM.firstChild);

			for (var i = 1; i <= rootDOM.childNodes.length; i++) {
				temp.appendChild(rootDOM.childNodes[1]);
			}

			temp.routeCached = {};
			temp.routePath = self.currentPath;
			self.currentDOM = temp;

			$.on(rootDOM, 'click', 'a[href]', hrefClicked);
			return true;
		}
		return false;
	}

	self.selector();

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
		routes.push(...internal.router.parseRoutes(obj, selectorList));
	}

	function hrefClicked(ev){
		var elem = ev.target;
		var attr = elem.getAttribute('href');

		if(attr[0] === '@'){ // ignore
			var target = elem.getAttribute('target');
			if(target)
				window.open(attr.slice(1), target);
			else window.location = attr.slice(1);
			return;
		}

		if(attr[0] === '#'){
			ev.preventDefault();
			var keys = attr.slice(1).split('#');
			for (var i = 0; i < keys.length; i++) {
				var key = keys[i].split(slash);
				var ref = sf.views.list[key.shift()];

				if(ref !== void 0){
					key = key.join(slash);
					if(ref.currentPath !== key)
						ref.goto(key);
				}
			}
		}

		// Make sure it's from current origin
		var path = elem.href.replace(window.location.origin, '');
		if(path.indexOf('//') !== -1)
			return;

		ev.preventDefault();
		if(!self.goto(path))
			console.error("Couldn't navigate to", path, "because path not found");
	}

	var RouterLoading = false; // xhr reference if the router still loading

	function routeError_(xhr, data){
		if(xhr.aborted) return;
		routingError = true;

		RouterLoading = false;
		for (var i = 0; i < onEvent['routeError'].length; i++) {
			onEvent['routeError'][i](xhr.status, data);
		}

		window.history.go(routeDirection * -1);
	}

	self.goto = function(path, data, method){
		if(self.currentPath === path)
			return;

		// Get template URL
		var url = routes.findRoute(path);
		if(!url) return;

		if(name === slash)
			sf.url.paths = path;
		else
			aHashes[name] = path;

		// This won't trigger popstate event
		if(!disableHistoryPush)
			sf.url.push();

		// Check if view was exist
		if(!rootDOM.isConnected){
			if(rootDOM.nodeType !== void 0)
				rootDOM = {};

			if(!self.selector());
				return console.error(name, "can't route to", path, "because element with selector '"+selector+"' was not found");
		}

		// Abort other router loading if exist
		if(RouterLoading) RouterLoading.abort();

		// Return if the cache was exist
		if(tryCache(path)) return true;

		for (var i = 0; i < onEvent['routeStart'].length; i++) {
			if(onEvent['routeStart'][i](self.currentPath, path)) return;
		}

		RouterLoading = sf.ajax({
			url:window.location.origin + (url.url || path),
			method:method || 'GET',
		    data:Object.assign(data || {}, {
		        _sf_view:url.selector === void 0 ? selector : selectorList[url.selector].split(' ').pop()
		    }),
			success:function(data){
				// Create new element
				var dom = document.createElement('sf-page-view');
				dom.innerHTML = data;
				dom.classList.add('page-prepare');
				dom.style.display = 'none';

				if(url.selector === void 0)
					var DOMReference = rootDOM;

				else // Get element from selector
					var DOMReference = rootDOM.querySelector(selectorList[url.selector]);

				// Let page script running first
				DOMReference.insertAdjacentElement('beforeend', dom);

				try{
					if(self.dynamicScript !== false){
						var scripts = dom.getElementsByTagName('script');
						for (var i = 0; i < scripts.length; i++) {
						    gEval(scripts[i].text);
						}
					}

					// Parse the DOM data binding
					sf.model.init(dom);

					// Trigger loaded event
					for (var i = 0; i < onEvent['routeFinish'].length; i++) {
						if(onEvent['routeFinish'][i](self.currentPath, path, url.data)) return;
					}
				}catch(e){
					console.error(e);
					dom.remove();
					return routeError_({status:0});
				}

				dom.style.display = '';

				if(self.currentDOM !== null){
					self.currentDOM.classList.add('page-hidden');
					self.currentDOM.classList.remove('page-current');
					self.lastPath = self.currentPath;

					// Old route
					if(self.currentDOM.routeCached.on !== void 0 && self.currentDOM.routeCached.on.leaving)
						self.currentDOM.routeCached.on.leaving();

					if(self.lastDOM !== null)
						self.lastDOM.remove();

					self.lastDOM = self.currentDOM;
				}

				// Save current URL
				self.currentPath = path;
				dom.routeCached = url;
				dom.routePath = path;

				if(url.on !== void 0 && url.on.coming)
					url.on.coming(url.data);

				dom.classList.remove('page-prepare');
				dom.classList.add('page-current');

				self.currentDOM = dom;
				routingError = false;

				// Clear old cache
				var parent = self.currentDOM.parentNode;
				for (var i = parent.childElementCount - self.maxCache - 1; i >= 0; i--) {
					parent.firstElementChild.remove();
				}
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

		if(self.currentDOM.routeCached.on !== void 0 && self.currentDOM.routeCached.on.leaving)
			self.currentDOM.routeCached.on.leaving();

		self.currentDOM.classList.add('page-hidden');
		self.currentDOM.classList.remove('page-current');
		cachedDOM.classList.remove('page-hidden');
		cachedDOM.classList.add('page-current');
		self.currentDOM = cachedDOM;

		if(self.currentDOM.routeCached.on !== void 0 && self.currentDOM.routeCached.on.coming)
			self.currentDOM.routeCached.on.coming();

		for (var i = 0; i < onEvent['routeCached'].length; i++) {
			if(onEvent['routeCached'][i](self.currentPath, self.lastPath)) return;
		}

		// Trigger reinit for the model
		var reinitList = self.currentDOM.querySelectorAll('sf-controller');
		var models = sf.model.root;
		for (var i = 0; i < reinitList.length; i++) {
			if(models[reinitList[i]].reinit)
				models[reinitList[i]].reinit();
		}

		self.lastPath = self.currentPath;
		self.currentPath = self.currentDOM.routePath;

		return true;
	}

	return self;
}

sf.views.list = {};

})();