sf.router = new function(){
	var self = this;
	self.loading = false;
	self.enabled = false;
	self.currentPage = '';
	var initialized = false;
	var lazyRouting = false;

	// Should be called if not using lazy page load
	self.init = function(name){
		if(!sf.loader.DOMWasLoaded)
			return sf(function(){
				self.init(name);
			});

		var path = window.location.pathname;

		// Reinit lazy router
		self.lazy();

		// Run 'before' event foxr new page view
		beforeEvent(name);

		initialized = true;
		self.currentPage = name;
		currentRouterURL = path;
	}

	self.enable = function(status = true){
		self.enabled = status;

		if(status)
			self.lazy();
		else{
			$('a[href][onclick]').each(function(){
				var current = $(this);
				if(current.attr('onclick') === 'return sf.router.load(this)')
					current.removeAttr('onclick');
			});
		}
	}

	var before = {};
	// Set index with number if you want to replace old function
	self.before = function(name, func, index = false){
		if(!before[name])
			before[name] = [];

		if(index === false){
			if(before[name].indexOf(func) === -1)
				before[name].push(func);
		}
		else
			before[name][index] = func;
	}

	var after = {};
	// Set index with number if you want to replace old function
	self.after = function(name, func, index = false){
		if(!after[name])
			after[name] = [];

		if(index === false){
			if(after[name].indexOf(func) === -1)
				after[name].push(func);
		}
		else
			after[name][index] = func;
	}

	// Running 'before' new page going to be displayed
	var beforeEvent = function(name, DOMReference = false){
		// Load controller
		sf.controller.run(name);

		if(before[name]){
			if(!sf.model.root[name])
				sf.model.root[name] = {};

			for (var i = 0; i < before[name].length; i++) {
				before[name][i](sf.model.root[name], sf.model.root);
			}
		}

		// Init model binding
		sf.model.init(DOMReference);
	}

	// Running 'after' old page going to be removed
	var afterEvent = function(){
		if(self.currentPage !== '' && after[self.currentPage]){
			if(!sf.model.root[self.currentPage])
				sf.model.root[self.currentPage] = {};

			for (var i = 0; i < after[self.currentPage].length; i++) {
				after[self.currentPage][i](sf.model.root[self.currentPage], sf.model.root);
			}
		}
	}

	var onEvent = {
		'loading':[],
		'loaded':[],
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
	self.lazy = function(){
		if(!self.enabled) return;

		$('a[href]:not([onclick])').each(function(){
			var url = this.href;
			if(url.indexOf('#') !== -1)
				return;

			if(url.indexOf(window.location.origin) !== 0 && url.charAt(0) !== '/')
				return; //Not current domain origin

			$(this).attr('onclick', 'return sf.router.load(this)');
		});
	}

	self.load = function(elem){
		if(!history.pushState || $(elem).attr('sf-router') == 'ignore')
			return true;

		return !LazyRouter(elem.href.replace(window.location.origin, ''));
	}

	var RouterLoading = false;
	var currentRouterURL = '';
	var LazyRouter = function(path){
		for (var i = 0; i < onEvent['loading'].length; i++) {
			onEvent['loading'][i](path);
		}
		var oldPath = window.location.pathname;
		initialized = false;

		if(RouterLoading) RouterLoading.abort();
		RouterLoading = loadURL(window.location.origin + path, {
            data:{
                _scarlets:'.dynamic.'
            },
			success:function(data){
				if(initialized) return;
				lazyRouting = true;

				// Run 'after' event for old page view
				afterEvent();

				// Run 'loaded' event
				RouterLoading = false;
				var skipLazyView = false;
				for (var i = 0; i < onEvent['loaded'].length; i++) {
					skipLazyView = onEvent['loaded'][i](currentRouterURL, path, data) || skipLazyView;
				}

				var DOMReference = false;
				if(!skipLazyView){
					var found = false;
					for(var oldURL in self.lazyViewPoint){
						if(currentRouterURL.indexOf(oldURL) !== -1){
							for(var newURL in self.lazyViewPoint[oldURL]){
								if(currentRouterURL.indexOf(oldURL) !== -1){
									// Put new view
									DOMReference = $(self.lazyViewPoint[oldURL][newURL]);
									DOMReference.html(data);

									found = true;
									break;
								}
							}
						}
						if(found) break;
					}

					// When the view point was not found
					if(!found){
						// Use fallback if exist
						if(sf.router.lazyViewPoint["@default"]){
							DOMReference = $(sf.router.lazyViewPoint["@default"]);
							DOMReference.html(data);
							found = true;
						}

						if(!found){
							for (var i = 0; i < onEvent['error'].length; i++) {
								onEvent['error'][i]('sf.router.lazyViewPoint["'+oldURL+'"]["'+newURL+'"] was not found');
							}
						}
					}

					// If the init function was called
					if(initialized) return;
				}

				// Reinit lazy router
				self.lazy();

				// Run 'before' event for new page view
				beforeEvent(name, DOMReference[0]);

				initialized = true;
				lazyRouting = false;

				self.currentPage = name;
				currentRouterURL = path;
			},
			error:function(e){
				window.history.replaceState(null, "", oldPath);
				for (var i = 0; i < onEvent['error'].length; i++) {
					onEvent['error'][i](e.message);
				}
			}
		});

		window.history.pushState(null, "", path);
		return true;
	}
};