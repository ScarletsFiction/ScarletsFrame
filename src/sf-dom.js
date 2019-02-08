sf.dom = function(selector, context){
	if(selector[0] === '<') return sf.dom.parseElement(selector);
	if(selector.constructor !== String) return selector;

	if(context) return context.querySelectorAll(selector);
	return document.querySelectorAll(selector);
}

var $ = sf.dom; // Shortcut

;(function(){
	var self = sf.dom;

	self.findOne = function(selector, context){
		if(context !== undefined) return context.querySelector(selector);
		return document.querySelector(selector);
	}

	self.parent = function(element, selector){
		if(element.closest) return element.closest(selector);
		var matches = 'matches';

		if(!element.matches)
			matches = element.msMatchesSelector ? 'msMatchesSelector' : 'webkitMatchesSelector';

		do {
			if(element[matches](selector) === true)
				return element;

			element = element.parentElement;
		} while (element !== null);

		return null;
	}

	self.prevAll = function(element, selector, isNext){
		var matches = 'matches';
		var result = [];

		if(!element.matches)
			matches = element.msMatchesSelector ? 'msMatchesSelector' : 'webkitMatchesSelector';

		do {
			if(element[matches](selector) === true)
				result.push(element);

			if(isNext)
				element = element.nextElementSibling;
			else
				element = element.previousElementSibling;
		} while (element !== null);

		return result;
	}

	// Shorcut
	self.nextAll = function(element, selector){
		return self.prevAll(element, selector, true);
	}

	/**
	 * Listen to an event
	 * @param  Node 			element 	parent element
	 * @param  string 			event   	event name
	 * @param  function|string  selector    callback function or selector
	 * @param  function			callback    callback function
	 * @param  boolean			once    	call once
	 * @return null
	 */
	self.on = function(element, event, selector, callback, once){
		if(typeof element === 'string'){
			element = document;
			callback = selector;
			selector = event;
			event = element;
		}

		if(typeof selector === 'function'){
			callback = selector;
			selector = null;
		}

		if(selector){
			var tempCallback = callback;
			callback = function(ev){
				if(self.parent(ev.target, selector) !== null)
					tempCallback(ev);
			}
		}

		callback.selector = selector;
		element.addEventListener(event, callback, {capture:true, once:once === true});
	}

	// Shorcut
	self.once = function(element, event, selector, callback){
		self.on(element, event, selector, callback, true);
	}

	/**
	 * Remove event listener
	 * @param  Node 	element 	parent element
	 * @param  string 	event   	event name
	 * @param  string  	selector    selector
	 * @return null
	 */
	self.off = function(element, event, selector){
		// Remove all event
		if(event === undefined){
			var events = getEventListeners(element);
			for (var i = 0; i < events.length; i++) {
				self.off(element, events[i]);
			}
			return;
		}

		var events = event.split(' ');
		if(events.length !== 0){
			for (var i = 0; i < events.length; i++) {
				self.off(element, events[i]);
			}
			return;
		}

		// Remove listener
		var ref = getEventListeners(element);
		if(ref !== undefined && ref[event] !== undefined){
			for (var i = ref[event].length - 1; i >= 0; i--) {
				if(selector && ref[event][i].selector !== selector)
					continue;

				element.removeEventListener(event, ref[event].splice(i, 1), true);
			}
		}
	}

	self.animateCSS = function(element, animationName, callback, duration) {
		var animationEnd = {
			animation: 'animationend',
			OAnimation: 'oAnimationEnd',
			MozAnimation: 'mozAnimationEnd',
			WebkitAnimation: 'webkitAnimationEnd',
		};

		for (var t in animationEnd){
			if(element.style[t] !== undefined){
				animationEnd = animationEnd[t];
				break;
			}
		}

		if(duration){
			element.style.webkitAnimationDuration = duration+'s';
			element.style.animationDuration = duration+'s';
		}

		var list = ('animated ' + animationName).split(' ');
		element.classList.add.apply(element.classList, list);
		$.once(element, animationEnd, function(){
			element.classList.remove.apply(element.classList, list);
			
			if(duration) setTimeout(function(){
				element.style.webkitAnimationDuration = duration+'s';
				element.style.animationDuration = duration+'s';
			}, 1);

			if(typeof callback === 'function') callback();
		});
	}

	var emptyDOM = {
		div:document.createElement('div'),
		ul:document.createElement('ul'),
		tbody:document.createElement('tbody'),
		tr:document.createElement('tr'),
		table:document.createElement('table'),
		select:document.createElement('select'),
	};
	self.parseElement = function(html){
		var result = null;
		var tempDOM = emptyDOM.div;

        if(html.indexOf('<li') === 0) tempDOM = emptyDOM.ul;
        if(html.indexOf('<tr') === 0) tempDOM = emptyDOM.tbody;
        if(html.indexOf('<td') === 0 || html.indexOf('<th') === 0) tempDOM = emptyDOM.tr;
        if(html.indexOf('<tbody') === 0) tempDOM = emptyDOM.table;
        if(html.indexOf('<option') === 0) tempDOM = emptyDOM.select;

		tempDOM.textContent = '';
		tempDOM.insertAdjacentHTML('afterBegin', html);

		var length = tempDOM.children.length;
		if(length === 1)
			result = tempDOM.firstElementChild;

		else if(length !== 0){
			result = [];
			var ref = tempDOM.children;
			for (var i = 0; i < ref.length; i++) {
				result.push(ref.item(i));
			}
		}

		return result;
	}

	self.remove = function(elements){
		if(elements.remove !== undefined)
			return elements.remove();

		for (var i = 0; i < elements.length; i++) {
			elements[i].remove();
		}
	}

	var documentElement = null;
	setTimeout(function(){
		sf.loader.domReady(function(){
			documentElement = document.body.parentElement;
		});
	}, 1);

	self.getSelector = function(element, childIndexes = false, untilElement = false){
		var names = [];
		if(untilElement === false) untilElement = documentElement;

		while(element.parentElement !== null){
			if(element.id){
				names.unshift('#'+element.id);
				break;
			}
			else{
				if(element === untilElement){
					if(childIndexes === false)
						names.unshift(element.tagName);
					else names.unshift(0);
				}
				else {
					var e = element;
					var i = childIndexes ? 0 : 1;

					while(e.previousElementSibling){
						e = e.previousElementSibling;
						i++;
					}

					if(childIndexes)
						names.unshift(i);
					else
						names.unshift(":nth-child("+i+")");
				}

				element = element.parentElement;
			}
		}

		if(childIndexes)
			return names;
		return names.join(" > ");
	}

	self.childIndexes = function(array, context){
		var element = context || documentElement;
		var i = 0;

		if(array[0].constructor === String){
			element = element.querySelector(array[0]);
			i = 1;
		}

		for (i = i; i < array.length; i++) {
			element = element.children.item(array[i]);

			if(element === null)
				return null;
		}

		return element;
	}

})();