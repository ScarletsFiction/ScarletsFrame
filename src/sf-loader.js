sf.loader = new function(){
	var self = this;
	self.loadedContent = 0;
	self.totalContent = 0;
	self.DOMWasLoaded = false;
	self.DOMReady = false;
	self.turnedOff = true;

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
	}

	self.css = function(list){
		if(self.DOMWasLoaded){
			// check if some list was loaded
			for (var i = list.length - 1; i >= 0; i--) {
				if($('link[href*="'+list[i]+'"]').length !== 0)
					list.splice(i, 1);
			}
			if(list.length === 0) return;
		}
		self.turnedOff = false;

		self.totalContent = self.totalContent + list.length;
		for(var i = 0; i < list.length; i++){
			var s = document.createElement('link');
	        s.rel = 'stylesheet';
	        s.href = list[i];
	        s.addEventListener('load', sf.loader.f, {once:true});
	        s.addEventListener('error', sf.loader.f, {once:true});
	        document.head.appendChild(s);
		}
	}

	self.js = function(list){
		if(self.DOMWasLoaded){
			// check if some list was loaded
			for (var i = list.length - 1; i >= 0; i--) {
				if($('script[src*="'+list[i]+'"]').length !== 0)
					list.splice(i, 1);
			}
			if(list.length === 0) return;
		}
		self.turnedOff = false;

		self.totalContent = self.totalContent + list.length;
		for(var i = 0; i < list.length; i++){
			var s = document.createElement('script');
	        s.type = "text/javascript";
	        s.async = true;
	        s.src = list[i];
	        s.addEventListener('load', sf.loader.f, {once:true});
	        s.addEventListener('error', sf.loader.f, {once:true});
	        document.head.appendChild(s);
		}
	}

	setTimeout(function(){
		if(self.totalContent === 0 && !self.turnedOff){
			self.loadedContent = self.totalContent = 1;
			console.warn("If you don't use content loader feature, please turn it off with `sf.loader.off()`");
		}
	}, 10000);

	var isQueued = false;
	document.addEventListener("DOMContentLoaded", function(event){
		// Add processing class to queued element
		if(isQueued === false && document.body){
			isQueued = sf.model.queuePreprocess(document.body);
			for (var i = 0; i < isQueued.length; i++) {
				if(isQueued[i].nodeType === 1)
					isQueued[i].classList.add('sf-dom-queued');
			}

			var repeatedList = $('[sf-repeat-this]', document.body);
			for (var i = 0; i < repeatedList.length; i++) {
				repeatedList[i].classList.add('sf-dom-queued');
			}

			// Find images
			var temp = $('img:not(onload)[src]');
			for (var i = 0; i < temp.length; i++) {
				sf.loader.totalContent++;
				temp[i].addEventListener('load', sf.loader.f, {once:true});
				temp[i].addEventListener('error', sf.loader.f, {once:true});
			}
		}

		function onReadyState(){
			if(isQueued === null){
				clearInterval(onReadyState_timer);
				return;
			}

			if(self.turnedOff === false && self.loadedContent < self.totalContent)
				return;

			if(/loaded|complete/.test(document.readyState) === false)
				return;

			clearInterval(onReadyState_timer);

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

			var listener = sf.dom('script, link, img');
			for (var i = 0; i < listener.length; i++) {
				listener[i].removeEventListener('error', sf.loader.f);
				listener[i].removeEventListener('load', sf.loader.f);
			}

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
			whenDOMReady = whenDOMLoaded = null;

			// Last init
			sf.controller.init();
			sf.model.init(document.body, isQueued);
			sf.router.init();

			isQueued = null;
		}

		var onReadyState_timer = setInterval(onReadyState, 100);
		onReadyState();
	});
}
sf.prototype.constructor = sf.loader.onFinish;