function eventHandler(that, data, _modelScope){
	var modelKeys = sf.model.modelKeys(_modelScope).join('|');

	var direct = false;
	var script = data.value;
	script = avoidQuotes(script, function(script_){
		if(/[ =(+-]/.test(script_) === false)
			direct = true;

		// Replace variable to refer to current scope
		return script_.replace(RegExp(sf.regex.strictVar+'('+modelKeys+')\\b', 'g'), function(full, matched){
			return '_modelScope.'+matched;
		})

		// Replace this to refer to the element
		.replace(/,this|\[this/g, function(found){
			return 'sf_that';
		});
	});

	// Get function reference
	if(direct)
		script = eval(script);

	var containSingleChar = false;
	var keys = data.name.slice(1).split('.');
	var eventName = keys.shift();

	if(eventName === 'unfocus')
		eventName = 'blur';

	for (var i = keys.length - 1; i >= 0; i--) {
		if(keys[i].length === 1){
			containSingleChar = true;
			break;
		}
	}

	keys = new Set(keys);

	var options = {};
	if(keys.has('once')){
		options.once = true;
		keys.delete('once');
	}

	if(keys.has('passive')){
		if(keys.has('prevent'))
			console.error("Can't preventDefault when using passive listener", that);

		options.passive = true;
		keys.delete('passive');
	}

	// https://dev.to/clickys/bubble-vs-capture--3b19
	if(keys.has('capture')){
		options.capture = true;
		keys.delete('capture');
	}

	if(eventName.indexOf('mouse') === 0){
		eventName = 'pointer'+eventName.slice(5);

		// Prevent context menu on mouse event
		if(keys.has('right'))
			that.addEventListener('contextmenu', function(ev){
				ev.preventDefault();
			}, options);
	}


	if(specialEvent[eventName]){
		specialEvent[eventName](that, keys, script, _modelScope);
		return;
	}

	if(direct && keys.size === 0)
		var callback = script;
	else{
		var callback = function(ev){
			if(!keys.has('bot') && ev.isTrusted === false)
				return;

			if(keys.has('stop'))
				ev.stopPropagation();

			if(ev.ctrlKey !== void 0){
				if(ev.ctrlKey !== keys.has('ctrl')
					|| ev.altKey !== keys.has('alt')
					|| ev.shiftKey !== keys.has('shift')
					|| ev.metaKey !== keys.has('meta'))
					return;
			}

			if(ev.constructor === KeyboardEvent){
				if(containSingleChar && !keys.has(ev.key))
					return;

				ev.preventDefault();
			}

			/*
			0 : No button or un-initialized
			1 : Primary button (usually the left button)
			2 : Secondary button (usually the right button)
			4 : Auxilary button (usually the mouse wheel button or middle button)
			8 : 4th button (typically the "Browser Back" button)
			16 : 5th button (typically the "Browser Forward" button)
			*/
			else if(ev.constructor === PointerEvent){
				if(!(ev.buttons & 1) && keys.has('left')
					|| !(ev.buttons & 2) && keys.has('right')
					|| !(ev.buttons & 4) && keys.has('middle')
					|| !(ev.buttons & 8) && keys.has('4th')
					|| !(ev.buttons & 16) && keys.has('5th'))
					return;

				ev.preventDefault();
			}

			else if(ev.constructor === TouchEvent){
				if(containSingleChar && !keys.has(ev.touches.length))
					return;

				ev.preventDefault();
			}

			else if(keys.has('prevent'))
				ev.preventDefault();

			if(direct)
				return script.call(this, ev);

			eval(script);
		}
	}

	that.addEventListener(eventName, callback, options);

	that.sf$eventDestroy = function(){
		that.removeEventListener(eventName, callback, options);
	}
}

var specialEvent = {
	taphold:function(that, keys, script, _modelScope){
		var set = new Set();
		var evStart = null;

		function callback(){
			that.removeEventListener('pointerup', callbackEnd, {once:true});
			document.removeEventListener('pointermove', callbackMove);
			set.delete(evStart.pointerId);

			if(script.constructor === Function)
				return script.call(that, evStart);

			eval(script);
		}

		function callbackMove(ev){
			if(Math.abs(evStart.screenX - ev.screenX) > 1 || Math.abs(evStart.screenY - ev.screenY) > 1){
				clearTimeout(timer);
				set.delete(ev.pointerId);
				that.removeEventListener('pointerup', callbackEnd, {once:true});
				document.removeEventListener('pointermove', callbackMove);

				evStart = null;
			}
		}

		var timer = 0;

		function callbackStart(ev){
			clearTimeout(timer);

			set.add(ev.pointerId);
			if(set.size > 1){
				that.removeEventListener('pointerup', callbackEnd, {once:true});
				document.removeEventListener('pointermove', callbackMove);
				return;
			}

			evStart = ev;
			timer = setTimeout(callback, 700);

			that.addEventListener('pointerup', callbackEnd, {once:true});
			document.addEventListener('pointermove', callbackMove);
		}

		function callbackEnd(ev){
			document.removeEventListener('pointermove', callbackMove);
			evStart = null;

			set.delete(ev.pointerId);
			clearTimeout(timer);
		}

		that.addEventListener('pointerdown', callbackStart);
	},
	gesture:function(that, keys, script, _modelScope){
		touchGesture(that, function callback(data){
			if(script.constructor === Function)
				return script.call(that, data);

			eval(script);
		});
	},
	dragmove:function(that, keys, script, _modelScope){
		var length = 0;
		function callbackMove(ev){
			ev.stopPropagation();
			ev.preventDefault();

			if(script.constructor === Function)
				return script.call(that, ev);

			eval(script);
		}

		var callbackStart = function(ev){
			ev.preventDefault();

			if(++length !== 1){
				document.removeEventListener('pointermove', callbackMove);
				document.removeEventListener('pointerup', callbackEnd, {once:true});
				return;
			}

			document.addEventListener('pointermove', callbackMove);
			document.addEventListener('pointerup', callbackEnd, {once:true});
		}

		var callbackEnd = function(ev){
			ev.preventDefault();

			if(--length === 1){
				document.addEventListener('pointermove', callbackMove);
				document.addEventListener('pointerup', callbackEnd, {once:true});
				return;
			}

			document.removeEventListener('pointermove', callbackMove);
			that.addEventListener('pointerdown', callbackStart, {once:true});
		}

		that.addEventListener('pointerdown', callbackStart, {once:true});
	}
};

function touchGesture(that, callback){
	var startScale = 0;
	var startAngle = 0;
	var lastScale = 0;
	var lastAngle = 0;

	var force = false;
	var pointers = [];

	function findAnd(action, ev){
		for (var i = 0; i < pointers.length; i++) {
			if(pointers[i].pointerId === ev.pointerId){
				if(action === 2) // delete
					pointers.splice(i, 1);
				else if(action === 1) // replace
					pointers.splice(i, 1, ev);
				return;
			}
		}

		if(action === 0) // add
			pointers.push(ev);
	}

	var callbackStart = function(ev){
		ev.preventDefault();
		findAnd(0, ev);

		if(pointers.length === 2){
			var dx = pointers[1].x - pointers[0].x;
			var dy = pointers[1].y - pointers[0].y;

			lastScale = startScale = Math.sqrt(dx**2 + dy**2) * 0.01;
			lastAngle = startAngle = Math.atan2(dy, dx) * 180/Math.PI;

			document.addEventListener('pointermove', callbackMove);
		}
		else document.removeEventListener('pointermove', callbackMove);

		if(pointers.length === 1)
			document.addEventListener('pointerend', callbackEnd);
	}

	var callbackMove = function(ev){
		ev.preventDefault();
		findAnd(1, ev);

		var dx = pointers[1].x - pointers[0].x;
		var dy = pointers[1].y - pointers[0].y;

		var currentScale = Math.sqrt(dx**2 + dy**2) * 0.01;
		var currentAngle = Math.atan2(dy, dx) * 180/Math.PI;

		callback({
			scale:currentScale - startScale,
			angle:currentAngle - startAngle,
			deltaScale:currentScale - lastScale,
			deltaAngle:currentAngle - lastAngle,
		});

		lastScale = currentScale;
		lastAngle = currentAngle;
	}

	var callbackEnd = function(ev){
		ev.preventDefault();
		findAnd(2, ev);

		if(pointers.length <= 1){
			document.removeEventListener('pointerend', callbackEnd);
			document.removeEventListener('pointermove', callbackMove);
		}
		else{
			document.addEventListener('pointerend', callbackEnd);

			if(pointers.length === 2)
				document.removeEventListener('pointermove', callbackMove);
		}
	}

	that.addEventListener('pointerstart', callbackStart);

	if(navigator.maxTouchPoints > 1)
		return;

	var keyEnd = function(ev){
		ev.preventDefault();
		if(ev.ctrlKey)
			return;

		force = false;
		that.removeEventListener('keyup', keyEnd);
	}

	var keyStart = function(ev){
		ev.preventDefault();
		if(!ev.ctrlKey)
			return;

		force = true;
		that.addEventListener('keyup', keyEnd);
	}

	that.addEventListener('keydown', keyStart);
}