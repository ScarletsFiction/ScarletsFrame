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

		// Reinit lazy router
		self.lazy();

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

	self.enable = function(status = true){
		if(self.enabled === status) return;
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

		window.addEventListener('popstate', function(event) {
			// Don't continue if the last routing was error
			if(routingError){
				routingError = false;
				return;
			}

			routingBack = true;
			self.goto(window.location.pathname);
		}, false);
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

		return !self.goto(elem.href.replace(window.location.origin, ''));
	}

	var RouterLoading = false;
	var routingBack = false;
	var routingError = false;
	self.goto = function(path, data, method){
		if(!method) method = 'GET';
        else method = method.toUpperCase();

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
				var found = regex.exec(data);
				if(found && found.length !== 1){
					found = found[1].split('--|&>').join('-->');
					found = JSON.parse(found);

					if(!$.isEmptyObject(found)){
						for (var i = 0; i < onEvent['special'].length; i++) {
							if(onEvent['special'][i](found)) return;
						}
					}
				}

				var DOMReference = false;
				var foundAction = function(ref){
					DOMReference = $(ref);

					if(self.pauseRenderOnTransition)
						DOMReference.css('display', 'none'); // Pending DOM rendering

					// Run 'after' event for old page view
					afterEvent($('[sf-page]', DOMReference[0]));
					DOMReference.html(data);

					// Redefine title if exist
					var title = $('title', DOMReference[0]).eq(0).html();
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
				if(initialized){
					if(self.pauseRenderOnTransition)
						DOMReference.css('display', ''); // Resume DOM rendering

					routerLoaded(currentRouterURL, path, data);
					return;
				}

				// Reinit lazy router
				self.lazy();

				// Run 'before' event for new page view
				if(!DOMReference) DOMReference = $(document.body);
				$('[sf-page]', DOMReference[0]).each(function(){
					if(this.attributes['sf-page'])
						beforeEvent(this.attributes['sf-page'].value, DOMReference[0]);
				});

				if(self.pauseRenderOnTransition)
					DOMReference.css('display', ''); // Resume DOM rendering
				
				routerLoaded(currentRouterURL, path, data);

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