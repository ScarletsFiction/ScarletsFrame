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
		});
	});

	// Get function reference
	if(direct)
		script = eval(script);

	// Wrap into a function
	else
		script = (new Function('var event = arguments[1];'+script.split('_modelScope.').join('arguments[0].')))
			.bind(that, _modelScope);

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

			script.call(this, ev);
		}
	}

	that.addEventListener(eventName, callback, options);

	if(!options.once){
		that['sf$eventDestroy_'+eventName] = function(){
			that.removeEventListener(eventName, callback, options);
		}
	}
}

var specialEvent = internal.model.specialEvent = {
	taphold:function(that, keys, script, _modelScope){
		var set = new Set();
		var evStart = null;

		function callback(){
			that.removeEventListener('pointerup', callbackEnd, {once:true});
			that.removeEventListener('pointercancel', callbackEnd, {once:true});

			document.removeEventListener('pointermove', callbackMove);
			set.delete(evStart.pointerId);

			script.call(that, evStart);
		}

		function callbackMove(ev){
			ev.preventDefault();
			ev.stopPropagation();

			if(Math.abs(evStart.clientX - ev.clientX) > 1 || Math.abs(evStart.clientY - ev.clientY) > 1){
				clearTimeout(timer);
				set.delete(ev.pointerId);
				that.removeEventListener('pointerup', callbackEnd, {once:true});
				that.removeEventListener('pointercancel', callbackEnd, {once:true});
				document.removeEventListener('pointermove', callbackMove);

				evStart = null;
			}
		}

		var timer = 0;

		function callbackStart(ev){
			clearTimeout(timer);

			set.add(ev.pointerId);
			if(set.size > 1){
				ev.preventDefault();
				ev.stopPropagation();

				that.removeEventListener('pointerup', callbackEnd, {once:true});
				that.removeEventListener('pointercancel', callbackEnd, {once:true});
				document.removeEventListener('pointermove', callbackMove);
				return;
			}

			evStart = ev;
			timer = setTimeout(callback, 700);

			that.addEventListener('pointerup', callbackEnd, {once:true});
			that.addEventListener('pointercancel', callbackEnd, {once:true});
			document.addEventListener('pointermove', callbackMove);
		}

		function callbackEnd(ev){
			document.removeEventListener('pointermove', callbackMove);
			evStart = null;

			set.delete(ev.pointerId);
			clearTimeout(timer);
		}

		that.addEventListener('pointerdown', callbackStart);

		that['sf$eventDestroy_taphold'] = function(){
			that.removeEventListener('pointerdown', callbackStart);
		}
	},
	gesture:function(that, keys, script, _modelScope){
		touchGesture(that, function callback(data){
			script.call(that, data);
		});
	},
	dragmove:function(that, keys, script, _modelScope){
		var length = 0;
		var actionBackup = '';
		var startEv = null;

		function callbackMove(ev){
			ev.stopPropagation();
			ev.preventDefault();

			script.call(that, ev);
		}

		var callbackStart = function(ev){
			ev.preventDefault();

			if(++length !== 1){
				document.removeEventListener('pointermove', callbackMove);
				document.removeEventListener('pointerup', callbackEnd, {once:true});
				document.removeEventListener('pointercancel', callbackEnd, {once:true});
				return;
			}

			script.call(that, ev);
			startEv = ev;

			actionBackup = that.style.touchAction;
			that.style.touchAction = 'none';

			document.addEventListener('pointermove', callbackMove);
			document.addEventListener('pointerup', callbackEnd, {once:true});
			document.addEventListener('pointercancel', callbackEnd, {once:true});
		}

		var callbackEnd = function(ev){
			ev.preventDefault();

			if(--length === 1){
				document.addEventListener('pointermove', callbackMove);
				document.addEventListener('pointerup', callbackEnd, {once:true});
				document.addEventListener('pointercancel', callbackEnd, {once:true});
				return;
			}

			script.call(that, ev);
			startEv = null;

			that.style.touchAction = actionBackup;

			document.removeEventListener('pointermove', callbackMove);
			that.addEventListener('pointerdown', callbackStart, {once:true});
		}

		that.addEventListener('pointerdown', callbackStart, {once:true});

		that['sf$eventDestroy_dragmove'] = function(){
			that.removeEventListener('pointerdown', callbackStart, {once:true});
			that.removeEventListener('pointermove', callbackMove);
			that.removeEventListener('pointercancel', callbackEnd, {once:true});
			that.removeEventListener('pointerup', callbackEnd, {once:true});
		}
	}
};

function touchGesture(that, callback){
	var startScale = 0;
	var startAngle = 0;
	var lastScale = 0;
	var lastAngle = 0;
	var actionBackup = '';

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

		if(pointers.length === 1){
			if(force)
				pointers.unshift({
					pointerId:'custom',
					clientX:that.offsetLeft + that.offsetWidth/2,
					clientY:that.offsetTop + that.offsetHeight/2
				});

			actionBackup = that.style.touchAction;
			that.style.touchAction = 'none';

			document.addEventListener('pointerup', callbackEnd);
			document.addEventListener('pointercancel', callbackEnd);
		}

		if(pointers.length === 2){
			ev.stopPropagation();

			var dx = pointers[1].clientX - pointers[0].clientX;
			var dy = pointers[1].clientY - pointers[0].clientY;

			lastScale = startScale = Math.sqrt(dx**2 + dy**2) * 0.01;
			lastAngle = startAngle = Math.atan2(dy, dx) * 180/Math.PI;

			ev.scale = 
			ev.angle = 
			ev.totalScale = 
			ev.totalAngle = 0;

			callback(ev);
			document.addEventListener('pointermove', callbackMove);
		}
		else document.removeEventListener('pointermove', callbackMove);
	}

	var callbackMove = function(ev){
		ev.preventDefault();
		ev.stopPropagation();
		findAnd(1, ev);

		var dx = pointers[1].clientX - pointers[0].clientX;
		var dy = pointers[1].clientY - pointers[0].clientY;

		var currentScale = Math.sqrt(dx**2 + dy**2) * 0.01;
		var currentAngle = Math.atan2(dy, dx) * 180/Math.PI;

		ev.scale = currentScale - lastScale;
		ev.angle = currentAngle - lastAngle;
		ev.totalScale = currentScale - startScale;
		ev.totalAngle = currentAngle - startAngle;

		callback(ev);

		lastScale = currentScale;
		lastAngle = currentAngle;
	}

	var callbackEnd = function(ev){
		ev.preventDefault();
		findAnd(2, ev);

		if(pointers.length <= 1){
			if(pointers.length === 0){
				document.removeEventListener('pointerup', callbackEnd);
				document.removeEventListener('pointercancel', callbackEnd);
			}

			that.style.touchAction = actionBackup;

			document.removeEventListener('pointermove', callbackMove);

			ev.scale = ev.angle = 0;
			ev.totalScale = lastScale - startScale;
			ev.totalAngle = lastAngle - startAngle;
			callback(ev);
		}
		else{
			document.addEventListener('pointerup', callbackEnd);
			document.addEventListener('pointercancel', callbackEnd);

			if(pointers.length === 2){
				document.removeEventListener('pointermove', callbackMove);

				ev.scale = ev.angle = 0;
				callback(ev);
			}
		}
	}

	that.addEventListener('pointerdown', callbackStart);

	that['sf$eventDestroy_gesture'] = function(){
		that.removeEventListener('pointerdown', callbackStart);
		document.removeEventListener('keydown', keyStart);
	}

	var keyEnd = function(ev){
		if(!force || ev.ctrlKey)
			return;

		force = false;
		pointers.length = 0;

		document.removeEventListener('pointermove', callbackMove);
		document.removeEventListener('keyup', keyEnd);
	}

	var keyStart = function(ev){
		if(!ev.ctrlKey)
			return;

		force = true;
		document.addEventListener('keyup', keyEnd);
	}

	document.addEventListener('keydown', keyStart);
}