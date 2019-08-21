;(function(){
var gEval = routerEval;
routerEval = void 0;


internal.router = {};
internal.router.toRegexp = function(obj_){
	var routes = [];
	var pattern = /\/:[^/]+/;

	function addRoutes(obj, addition){
		for(var i = 0; i < obj.length; i++){
			var current = addition+obj[i].path;

			if(obj[i].routes !== void 0){
				addRoutes(obj[i].routes, current);
				continue;
			}

			current = RegExp('^' + current.replace(pattern, '/(.*?)') + '$');
			current.url = obj[i].url;
			routes.push(current);
		}
	}

	addRoutes(obj_, '');
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

function View(DOMReference){
	var self = this;
	self.pageRemoveDelay = 300;
	self.currentURL = '';

	var routes = [];
	routes.findRoute = internal.router.findRoute;

	internal.router.enabled = true;

	var onEvent = {
		'routeStart':[],
		'routeFinish':[],
		'routeError':[]
	};

	self.on = function(event, func){
		if(onEvent[event].indexOf(func) === -1)
			onEvent[event].push(func);
	}

	self.addRoute = function(obj){
		routes.push(...internal.router.toRegexp(obj));
	}

	// Create listener for link click
	$.on(DOMReference, 'click', 'a[href]', function(ev){
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
	});

	var sandboxDOM = document.createElement('sandbox-dom');
	var RouterLoading = false; // xhr reference if the router still loading

	self.goto = function(path, data, method){
		if(!method) method = 'GET';
		if(!data) data = {};

		for (var i = 0; i < onEvent['routeStart'].length; i++) {
			if(onEvent['routeStart'][i](path)) return;
		}

		var oldPath = window.location.pathname;

		// Abort other router loading if exist
		if(RouterLoading) RouterLoading.abort();
		RouterLoading = sf.ajax({
			url:window.location.origin + path,
			method:method,
            data:Object.assign(data, {
                _scarlets:'.dynamic.'
            }),
			success:function(data){
				sandboxDOM.innerHTML = data;

				if(sandboxDOM.childElementCount !== 1){
					var dom = document.createElement('div');
					for (var i = 0, n = sandboxDOM.childElementCount; i < n; i++) {
						dom.insertBefore(sandboxDOM.firstElementChild, null);
					}
				}
				else var dom = sandboxDOM.firstElementChild;

				dom.classList.add('page-prepare');

				// Let page script running first
				DOMReference.insertAdjacentElement('beforeend', dom);
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
					if(onEvent['routeFinish'][i](self.currentURL, path, data)) return;
				}

				// Save current URL
				self.currentURL = path;
			},
			error:function(xhr, data){
				if(xhr.aborted) return;

				RouterLoading = false;
				for (var i = 0; i < onEvent['error'].length; i++) {
					onEvent['error'][i](xhr.status, data);
				}
			}
		});
	}

	return self;
}

sf.views = function(el){
	if(el.constructor === String)
		el = $(el);

	return new View(el);
};

})();