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
			$(document.body).on('click', 'a[href]', self.load);

			// Create listener when navigate backward
			window.addEventListener('popstate', popstateListener, false);
		}
		else{
			$(document.body).off('click', 'a[href]', self.load);
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