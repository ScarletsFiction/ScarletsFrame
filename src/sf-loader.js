sf.loader = new function(){
	var self = this;
	self.loadedContent = 0;
	self.totalContent = 1;
	self.DOMWasLoaded = false;

	var whenDOMLoaded = [];
	var whenProgress = [];

	// Make event listener
	self.onFinish = function(func){
		if(self.DOMWasLoaded) return func();
		if(whenDOMLoaded.indexOf(func) !== -1) return;
		whenDOMLoaded.push(func);
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

		$(function(){
			document.getElementsByTagName('body')[0].innerHTML += temp;
		});
	}

	self.js = function(list, target = 'body'){
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
			  success: sf.loader.f
			});
		}
	}

	var everythingLoaded = setInterval(function() {
	if (/loaded|complete/.test(document.readyState)) {
		clearInterval(everythingLoaded);
		self.DOMWasLoaded = true;
		for (var i = 0; i < whenDOMLoaded.length; i++) {
			whenDOMLoaded[i]();
		}
		whenProgress.splice(0);
		whenDOMLoaded.splice(0);
	}
	}, 100);
};
sf.prototype.constructor = sf.loader.onFinish;

// Find images
$(function(){
	$('img:not(onload)[src]').each(function(){
		sf.loader.totalContent++;
		this.setAttribute('onload', "sf.loader.f(this)");
	});
});