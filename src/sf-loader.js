sf.loader = new function(){
	var self = this;
	self.loadedContent = 0;
	self.totalContent = 0;
	self.DOMWasLoaded = false;
	self.DOMReady = false;
	self.turnedOff = false;

	var whenDOMReady = [];
	var whenDOMLoaded = [];
	var whenProgress = [];

	self.off = function(){
		self.turnedOff = true;
	}

	// Make event listener
	self.onFinish = function(func){
		if(self.DOMWasLoaded) return func();
		if(whenDOMLoaded.indexOf(func) !== -1) return;
		whenDOMLoaded.push(func);
	}
	self.domReady = function(func){
		if(self.DOMReady) return func();
		if(whenDOMReady.indexOf(func) !== -1) return;
		whenDOMReady.push(func);
	}
	self.onProgress = function(func){
		if(self.DOMWasLoaded) return func(self.loadedContent, self.totalContent);
		if(whenProgress.indexOf(func) !== -1) return;
		whenProgress.push(func);
	}

	self.f = function(element){
		self.loadedContent++;
		for (var i = 0; i < whenProgress.length; i++) {
			whenProgress[i](self.loadedContent, self.totalContent);
		}
		if(element && element.removeAttribute) element.removeAttribute('onload');
	}

	self.css = function(list){
		if(self.DOMWasLoaded){
			// check if some list was loaded
			for (var i = list.length - 1; i >= 0; i--) {
				if($('link[href*="'+list[i]+'"]').length!==0)
					list.splice(i, 1);
			}
			if(list.length === 0) return;
		}
		self.totalContent = self.totalContent + list.length;
		var temp = '';
		for(var i = 0; i < list.length; i++){
			temp += '<link onload="sf.loader.f(this);" rel="stylesheet" href="'+list[i]+'">';
		}

		self.domReady(function(){
			document.getElementsByTagName('body')[0].innerHTML += temp;
		});
	}

	self.js = function(list){
		if(self.DOMWasLoaded){
			// check if some list was loaded
			for (var i = list.length - 1; i >= 0; i--) {
				if($('script[src*="'+list[i]+'"]').length!==0)
					list.splice(i, 1);
			}
			if(list.length === 0) return;
		}
		self.totalContent = self.totalContent + list.length;
		for(var i = 0; i < list.length; i++){
			$.ajax({
			  url: list[i],
			  dataType: "script",
			  cache: true,
			  complete: sf.loader.f
			});
		}
	}

	setTimeout(function(){
		if(self.totalContent === 0 && !self.turnedOff){
			self.loadedContent = self.totalContent = 1;
			console.warn("If you don't use content loader feature, please turn it off with `sf.loader.off()`");
		}
	}, 10000);
	var everythingLoaded = setInterval(function() {
	if (/loaded|complete/.test(document.readyState)) {
		if(self.DOMReady === false){
			self.DOMReady = true;
			for (var i = 0; i < whenDOMReady.length; i++) {
				try{
					whenDOMReady[i]();
				} catch(e) {
					console.error(e);
				}
			}
		}

		if(self.loadedContent < self.totalContent || self.loadedContent === 0){
			if(!self.turnedOff)
				return;
		}

		clearInterval(everythingLoaded);
		self.DOMWasLoaded = true;
		for (var i = 0; i < whenDOMLoaded.length; i++) {
			try{
				whenDOMLoaded[i]();
			} catch(e){
				console.error(e);
			}
		}
		whenProgress.splice(0);
		whenDOMReady.splice(0);
		whenDOMLoaded.splice(0);
		whenProgress = whenDOMReady = whenDOMLoaded = null;

		// Last init
		sf.controller.init();
		sf.model.init();
		sf.router.init();
	}
	}, 100);
};
sf.prototype.constructor = sf.loader.onFinish;

// Find images
sf.loader.domReady(function(){
	$('img:not(onload)[src]').each(function(){
		sf.loader.totalContent++;
		this.setAttribute('onload', "sf.loader.f(this)");
	});
}, 0);