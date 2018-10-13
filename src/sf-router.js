sf.router = new function(){
	var self = this;
	self.loading = false;
	self.enabled = false;
	self.currentPage = [];
	var initialized = false;
	var lazyRouting = false;
	var RouterLoading = false;
	var currentRouterURL = '';

	// Should be called if not using lazy page load
	self.init = function(){
		if(!sf.loader.DOMWasLoaded)
			return sf(function(){
				self.init();
			});

		// Reinit lazy router
		self.lazy();

		// Run 'before' event for new page view
		$('[sf-page]').each(function(){
			var name = this.attributes['sf-page'].value;
			beforeEvent(name);
		});

		initialized = true;
		currentRouterURL = window.location.pathname;
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
		if(self.currentPage.indexOf(name) === -1)
			self.currentPage.push(name);

		// Init all controller
		sf.controller.init();

		// Init template to model binding
		sf.model.init(DOMReference);

		if(before[name]){
			if(!sf.model.root[name])
				sf.model.root[name] = {};

			for (var i = 0; i < before[name].length; i++) {
				before[name][i](sf.model.root);
			}
		}
	}

	// Running 'after' old page going to be removed
	var afterEvent = function(){
		if(self.currentPage.indexOf(name) === -1)
			self.currentPage.splice(self.currentPage.indexOf(name), 1);

		if(self.currentPage !== '' && after[self.currentPage]){
			if(!sf.model.root[self.currentPage])
				sf.model.root[self.currentPage] = {};

			for (var i = 0; i < after[self.currentPage].length; i++) {
				after[self.currentPage][i](sf.model.root);
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

	var LazyRouter = function(path){
		for (var i = 0; i < onEvent['loading'].length; i++) {
			if(onEvent['loading'][i](path)) return;
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

				// Run 'loaded' event
				RouterLoading = false;
				var skipLazyView = false;

				// Find special data
				var special = {};
				
				// This will not match string inside quotes to avoid security problem
				data = data.replace(/<!-- SF-Special:(.*?)-->(?=(?:[^"\']*(?:\'|")[^"\']*(?:\'|"))*[^"\']*$)/g, function(full, matched){
					// Unescape symbol
					var temp = matched.split('--|&>').join('-->');
					special = Object.assign(special, JSON.parse(temp));

					return '';
				});

				if(!$.isEmptyObject(special)){
					for (var i = 0; i < onEvent['special'].length; i++) {
						if(onEvent['special'][i](special)) return;
					}
				}

				// Trigger loaded event
				for (var i = 0; i < onEvent['loaded'].length; i++) {
					skipLazyView = onEvent['loaded'][i](currentRouterURL, path, data) || skipLazyView;
				}

				var DOMReference = false;
				if(!skipLazyView){
					var foundAction = function(ref){
						DOMReference = $(ref);

						// Run 'after' event for old page view
						afterEvent(DOMReference.find('[sf-page]'));
						DOMReference.html(data);

						// Redefine title if exist
						var title = DOMReference.find('title').eq(0).html();
						if(title)
							$('head title').html(title);

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

					// If the init function was called
					if(initialized) return;
				}

				// Reinit lazy router
				self.lazy();

				// Run 'before' event for new page view
				if(!DOMReference) DOMReference = $('body');
				DOMReference.find('[sf-controller], [sf-page]').each(function(){
					if(this.attributes['sf-controller'])
						sf.controller.run(this.attributes['sf-controller'].value);

					if(this.attributes['sf-page'])
						beforeEvent(this.attributes['sf-page'].value, DOMReference[0]);
				});

				initialized = true;
				lazyRouting = false;

				currentRouterURL = path;
				routingError = false;
			},
			error:function(xhr, data){
				RouterLoading = false;
				for (var i = 0; i < onEvent['error'].length; i++) {
					onEvent['error'][i](xhr.status, data);
				}

				// Back on error
				routingError = true;
				window.history.back();
			}
		});

		window.history.pushState(null, "", path);
		return true;
	}

	var routingError = false;
	window.addEventListener('popstate', function(event) {
		// Don't continue if the last routing was error
		if(routingError){
			routingError = false;
			return;
		}

		LazyRouter(window.location.pathname);
	}, false);
};