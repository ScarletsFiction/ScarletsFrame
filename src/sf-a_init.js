sf = function(){
	if(arguments[0].constructor === Function){
		return sf.loader.onFinish.apply(null, arguments);
	}
};

sf.internal = {};
sf.regex = {
	// ToDo: Need help to skip escaped quote
	avoidQuotes:'(?=(?:[^"\']*(?:\'|")[^"\']*(?:\'|"))*[^"\']*$)',
	strictVar:'(?=\\b[^.]|^|\\n| +|\\t|\\W )'
};

if(typeof $ === 'undefined' || !$.fn){
	if(typeof jQuery !== 'undefined')
		$ = jQuery;
	else if(typeof Dom7 !== 'undefined')
		$ = Dom7;
	else
		throw "Please load jQuery before ScarletsFrame";
}

if(!$.fn.extend){
	$.fn.extend = function(obj){
		for(var func in obj){
			$.fn[func] = obj[func];
		}
	}
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