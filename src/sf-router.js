sf.router = new function(){
	var self = this;
	self.loading = false;
	self.enabled = false;
	self.pauseRenderOnTransition = false;
	self.currentPage = [];
	self.mode = 'server-side';
	var initialized = false;
	var lazyRouting = false;
	var currentRouterURL = '';

	var gEval = routerEval;
	routerEval = void 0;

	// Should be called if not using lazy page load
	self.init = function(targetNode){
		if(!sf.loader.DOMWasLoaded)
			return sf(function(){
				self.init();
			});

		// Run 'before' event for new page view
		var temp = $('[sf-controller], [sf-page]', targetNode);
		for (var i = 0; i < temp.length; i++) {
			var name = temp[i].getAttribute('sf-page') || '';
			if(name !== '')
				runLocalEvent('before', name);

			if(temp[i].hasAttribute('sf-controller') === true)
				sf.controller.run(temp[i].getAttribute('sf-controller'));

			if(name !== '')
				runLocalEvent('when', name);
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
		if(status === void 0) status = true;
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

	var localEvent = {before:{}, when:{}, after:{}};
	function registerLocalEvent(which, name, func){
		if(!localEvent[which][name])
			localEvent[which][name] = [];

		localEvent[which][name].push(func);
	}

	// Set index with number if you want to replace old function
	// Running 'before' new page going to be displayed
	self.before = function(name, func){
		registerLocalEvent('before', name, func);
	}

	// Running 'when' new page was been initialized
	self.when = function(name, func){
		registerLocalEvent('when', name, func);
	}

	// Running 'after' old page is going to be removed
	self.after = function(name, func){
		registerLocalEvent('after', name, func);
	}

	var runLocalEvent = internal.routerLocalEvent = function(which, name){
		if(which === 'before' && self.currentPage.indexOf(name) === -1)
			self.currentPage.push(name);

		if(which === 'after' && self.currentPage.indexOf(name) === -1)
			self.currentPage.splice(self.currentPage.indexOf(name), 1);

		if(localEvent[which][name]){
			for (var i = 0; i < localEvent[which][name].length; i++) {
				localEvent[which][name][i](sf.model);
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

	// This will enable script evaluation before the model/controller/route
	// being reinitialized after receiving template from the server.
	// To be safe, make sure you're not directly outputing any user content
	// like user's name, posts, modifiable data from user.
	self.dynamicScript = false;

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
		var attr = elem.getAttribute('href');

		if(!attr){
			elem = $.parent(elem, '[href]');
			attr = elem.getAttribute('href');
		}

		if(!attr || attr[0] === '#') return;

		// Make sure it's from current origin
		var path = elem.href.replace(window.location.origin, '');
		if(path.indexOf('//') !== -1)
			return;

		if(!window.history.pushState || elem.hasAttribute('sf-router-ignore'))
			return;

		ev.preventDefault();
		if(attr[0] === '@'){
			var target = elem.getAttribute('target');
			if(target)
				window.open(attr.slice(1), target);
			else window.location = attr.slice(1);
			return;
		}

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
		RouterLoading = sf.ajax({
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
				var regex = RegExp('<!-- SF-Special:(.*?)-->', 'gm');
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
					runLocalEvent('after', last ? last.getAttribute('sf-page') : '/');

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

				// Let page script running first
				DOMReference.innerHTML = data;
				if(self.dynamicScript !== false){
					var scripts = DOMReference.getElementsByTagName('script');
					for (var i = 0; i < scripts.length; i++) {
					    gEval(scripts[i].text);
					}
				}

				// Parse the DOM data binding
				sf.model.init(DOMReference);

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