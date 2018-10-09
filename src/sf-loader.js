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
		if(element) element.removeAttribute('onload');
	}

	self.css = function(list){
		self.totalContent = self.totalContent + list.length;
		var temp = '';
		for(var i = 0; i < list.length; i++){
			temp += '<link onload="sf.loader.f(this)" rel="stylesheet" href="'+list[i]+'">';
		}
		document.getElementsByTagName('head')[0].innerHTML += temp;
	}

	self.js = function(list, target = 'head'){
		self.totalContent = self.totalContent + list.length;
		var text = '';
		for(var i = 0; i < list.length; i++){
			text += '<script onload="sf.loader.f(this)" type="text/'+'javascript" src="'+list[i]+'"></'+'script>';
		}
		$(text).appendTo(target);
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