;(function(){
var gEval = routerEval;
routerEval = void 0; // Avoid this function being invoked out of scope

// Save reference
var aHashes = sf.url.hashes;
var aPaths = sf.url.paths;
var slash = '/';

var lastURL = sf.url();
var routingError = false;

window.addEventListener('popstate', function(ev){
	// Don't continue if the last routing was error
	// Because the router was trying to getting back
	if(routingError){
		routingError = false;
		return;
	}

	// Reparse URL
	sf.url.parse();
	var list = self.list;

	// Every views only backup one old history

	// For root path
	var newSlash = slash+aPaths.join(slash);
	var temp = list[slash];

	if(temp.oldPath === newSlash)
		temp.back();
	else if(temp.currentPath !== newSlash)
		temp.goto(newSlash);


	// For hash path
	var keys = Object.keys(aHashes);
	for (var i = 0; i < keys.length; i++) {
		var temp = list[keys[i]];
		if(temp === void 0) continue;

		if(temp.oldPath === aHashes[keys[i]])
			temp.back();
		else if(temp.currentPath !== aHashes[keys[i]])
			temp.goto(aHashes[keys[i]]);
	}
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
	self.currentPath = '';
	self.oldPath = '';

	var rootDOM = {};
	self.selector = function(selector_){
		rootDOM = document.querySelector(selector_ || selector);

		// Create listener for link click
		if(rootDOM){
			selector = selector_;
			$.on(rootDOM, 'click', 'a[href]', hrefClicked);
		}
	}

	self.selector();

    var selectorList = [selector];
	var routes = [];
	routes.findRoute = internal.router.findRoute;

	internal.router.enabled = true;

	var onEvent = {
		'routeStart':[],
		'routeFinish':[],
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

		if(attr[0] === '#') return;

		// Make sure it's from current origin
		var path = elem.href.replace(window.location.origin, '');
		if(path.indexOf('//') !== -1)
			return;

		ev.preventDefault();
		if(attr[0] === '@'){ // ignore
			var target = elem.getAttribute('target');
			if(target)
				window.open(attr.slice(1), target);
			else window.location = attr.slice(1);
			return;
		}

		if(!self.goto(path))
			console.error("Couldn't navigate to", path, "because path not found");
	}

	var RouterLoading = false; // xhr reference if the router still loading
	var currentRoute = {};

	var oldDOM = null;
	var nextDOM = null;
	var currentDOM = null;

	self.goto = function(path, data, method){
		// Get template URL
		var url = routes.findRoute(path);
		if(!url) return;

		// Check if view was exist
		if(!rootDOM.isConnected){
			if(rootDOM.nodeType !== void 0)
				rootDOM = {};

			return console.error(name, "can't route to", path, "because element with selector '"+selector+"' was not found");
		}

		for (var i = 0; i < onEvent['routeStart'].length; i++) {
			if(onEvent['routeStart'][i](self.oldPath, path)) return;
		}

		function routeError_(xhr, data){
			if(xhr.aborted) return;
			routingError = true;

			RouterLoading = false;
			for (var i = 0; i < onEvent['routeError'].length; i++) {
				onEvent['routeError'][i](xhr.status, data);
			}

			window.history.back();
		}

		// Abort other router loading if exist
		if(RouterLoading) RouterLoading.abort();

		RouterLoading = sf.ajax({
			url:window.location.origin + url.url,
			method:method || 'GET',
		    data:Object.assign(data || {}, {
		        _scarlets:'.dynamic.'
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

				if(currentRoute.on !== void 0 && currentRoute.on.leaving)
					currentRoute.on.leaving(url.data);

				if(currentRoute.on !== void 0 && currentRoute.on.coming)
					currentRoute.on.coming(url.data);

				if(currentDOM !== null){
					currentDOM.classList.add('page-previous');
					currentDOM.classList.remove('page-current');
					self.oldPath = self.currentPath;
					oldDOM = currentDOM;
				}

				// Save current URL
				self.currentPath = path;
				currentRoute = url;

				dom.classList.remove('page-prepare');
				dom.classList.add('page-current');

				currentDOM = dom;
				routingError = false;
			},
			error:routeError_
		});
		return true;
	}

	self.back = function(){
		if(oldDOM === null)
			return self.goto(window.location.pathname);

		// Restore hidden DOM
		oldDOM.classList.remove('page-previous');
		oldDOM.classList.add('page-current');

		currentDOM.classList.remove('page-current');
		currentDOM.classList.add('page-next');

		self.currentPath = self.oldPath;
		self.oldPath = false;

		nextDOM = currentDOM;
		oldDOM = null;

		return true;
	}

	return self;
}

sf.views.list = {};

})();