(function(global, factory){
  var $ = null;
  if(typeof exports === 'object' && typeof module !== 'undefined'){
  	$ = require("dom7");

  	if($ === null){
  		console.log("ScarletsFrame can't load Dom7!");
  		return;
  	}
  	if($.fn.one === undefined)
  		$.fn.one = $.fn.once;

  	module.exports = factory($, global);
  }

  else{
	if(typeof Dom7 !== 'undefined')
		$ = Dom7;
	else if(typeof jQuery !== 'undefined')
		$ = jQuery;
	else
		throw "Please load jQuery or Dom7 before ScarletsFrame";

  	global.sf = factory($, global);
  }
}(typeof window !== "undefined" ? window : this, (function($, window){'use strict';
if(typeof document === undefined)
	document = window.document;
// ===== Module Init =====

var sf = function(){
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

if(!$.fn.extend){
	$.fn.extend = function(obj){
		for(var func in obj){
			$.fn[func] = obj[func];
		}
	}
}

if(!$.isEmptyObject){
	$.isEmptyObject = function(obj){
		for(var key in obj){
			return false;
		}
		return true
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
		self.css({
			'-webkit-animation-duration':duration+'s',
			'animation-duration':duration+'s'
		});

	self.addClass('animated ' + animationName).one(animationEnd, function(){
		self.removeClass('animated ' + animationName);
		
		if(duration) setTimeout(function(){
			self.css({
				'-webkit-animation-duration':'',
				'animation-duration':''
			});
		}, 1);

		if(typeof callback === 'function') callback();
	});

	return self;
  }
});