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

	var lastState = '';
	document.addEventListener("load", function domLoadEvent(event){
		// Add processing class to queued element
		if(document.body){
			document.removeEventListener('load', domLoadEvent, true);

			if(lastState === 'loading'){ // Find images
				var temp = $('img:not(onload)[src]');
				for (var i = 0; i < temp.length; i++) {
					sf.loader.totalContent++;
					temp[i].addEventListener('load', sf.loader.f, {once:true});
					temp[i].addEventListener('error', sf.loader.f, {once:true});
				}
			}
		}
	}, true);

	document.addEventListener('readystatechange', function domStateEvent(){
		if(document.readyState === 'interactive' || document.readyState === 'complete'){
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

			resourceWaitTimer = setInterval(waitResources, 100);
			document.removeEventListener('readystatechange', domStateEvent, true);
		}
	}, true);

	var resourceWaitTimer = -1;
	function waitResources(){
		if(self.turnedOff === false && self.loadedContent < self.totalContent)
			return;

		clearInterval(resourceWaitTimer);

		var listener = sf.dom('script, link, img');
		for (var i = 0; i < listener.length; i++) {
			listener[i].removeEventListener('error', sf.loader.f);
			listener[i].removeEventListener('load', sf.loader.f);
		}

		self.DOMWasLoaded = true;
		self.turnedOff = true;

		// Initialize all pending model
		var keys = Object.keys(internal.modelPending);
		for (var i = 0; i < keys.length; i++) {
			var ref = internal.modelPending[keys[i]];

			if(sf.model.root[keys[i]] === undefined)
				var scope = sf.model.root[keys[i]] = {};
			else var scope = sf.model.root[keys[i]];

			for (var a = 0; a < ref.length; a++) {
				ref[a](scope, root_);
			}

			delete internal.modelPending[keys[i]];
		}

		for (var i = internal.controller.pending.length - 1; i >= 0; i--) {
			var scope = sf.controller.pending[internal.controller.pending[i]];
			if(scope !== void 0){
				scope(root_(internal.controller.pending[i]), root_);
				internal.controller.pending.splice(i, 1);
			}
		}

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
	}
}
sf.prototype.constructor = sf.loader.onFinish;