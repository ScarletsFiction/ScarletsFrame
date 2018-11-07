if(typeof sf === 'undefined'){
	sf = function(){
		if(arguments[0].constructor === Function){
			return sf.loader.onFinish.apply(null, arguments);
		}
	};
	sf.regex = {
		// ToDo: Need help to skip escaped quote
		avoidQuotes:'(?=(?:[^"\']*(?:\'|")[^"\']*(?:\'|"))*[^"\']*$)',
	};
}

setTimeout(function(){
	sf(sf.router.init);
}, 10);

if(typeof $ === 'undefined' || !$.fn || !$.fn.extend){
	setTimeout(function(){
		console.clear();
		console.error("Please load jQuery before ScarletsFrame");
	}, 1000);
}

// Add animate.css feature on jQuery
$.fn.extend({
  animateCSS: function(animationName, callback, duration) {
	var self = this;
	var animationEnd = {
		animation: 'animationend',
		OAnimation: 'oAnimationEnd',
		MozAnimation: 'mozAnimationEnd',
		WebkitAnimation: 'webkitAnimationEnd',
	};

	for (var t in animationEnd)
		if (self[0].style[t] !== undefined){
			animationEnd = animationEnd[t];
			break;
		}

	if(duration)
		self.css('-webkit-animation-duration', duration+'s').css('animation-duration', duration+'s');

	self.addClass('animated ' + animationName).one(animationEnd, function(){
		setTimeout(function(){
			$(self).removeClass('animated ' + animationName);
		}, 1);

		if(duration)
			$(self).css('-webkit-animation-duration', '').css('animation-duration', '');

		if (typeof callback === 'function') callback();
	});

	return self;
  }
});