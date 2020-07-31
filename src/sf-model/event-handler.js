function eventHandler(that, data, _modelScope, rootHandler, template){
	var modelKeys = sf.model.modelKeys(_modelScope, true);

	var direct = false;
	var script = data.value;
	script = avoidQuotes(script, function(script_){
		if(sfRegex.anyOperation.test(script_) === false)
			direct = true;

		// Replace variable to refer to current scope
		return script_.replace(template.modelRefRoot_regex, function(full, before, matched){
			return before+'_modelScope.'+matched;
		});
	});

	var name_ = data.name.slice(1);

	// Create custom listener for repeated element
	if(rootHandler){
		var elementIndex = $.getSelector(that, true, rootHandler); // `rootHandler` may not the parent of `that`

		if(rootHandler.sf$listListener === void 0)
			rootHandler.sf$listListener = {};

		var withKey = false;
		if(template.uniqPattern !== void 0)
			withKey = true;

		if(direct)
			var func = eval(script);
		else{
			if(withKey)
				var func = new Function('event', '_model_', '_modelScope', template.uniqPattern, script);
			else
				var func = new Function('event', '_model_', '_modelScope', script);
		}

		var listener = rootHandler.sf$listListener[name_];
		if(listener === void 0){
			listener = rootHandler.sf$listListener[name_] = [[elementIndex, func]];
			listener.set = new Set([elementIndex.join('')]);
		}
		else{
			if(listener.set.has(elementIndex.join('')) === false){
				listener.push([elementIndex, func]);
				listener.set.add(elementIndex.join(''));
			}
			return;
		}

		var found = null;
		var findEventFromList = function(arr){
			// Partial array compare ([0,1,2] with [0,1,2,3,4] ==> true)
			parent:for (var i = 0; i < listener.length; i++) {
				var ref = listener[i];
				if(arr === void 0){
					if(ref[0].length !== 0)
						continue;

					found = ref[0];
					return ref[1];
				}

				var ref2 = ref[0];
				for (var z = 0; z < ref2.length; z++) {
					if(ref2[z] !== arr[z])
						continue parent;
				}

				found = ref[0];
				return ref[1];
			}

			return;
		}

		// We need to get element with 'sf-bind-list' and check current element before processing
		script = function(event){
			if(event.target.hasAttribute('sf-bind-list') === false){
				var realThat = event.target.closest('[sf-bind-list]');
				if(realThat === null)
					return;

				var call = findEventFromList($.getSelector(event.target, true, realThat));
				if(call !== void 0)
					call.call($.childIndexes(found, realThat), event, realThat.model, _modelScope, withKey && realThat.sf$repeatListIndex);

				return;
			}

			var call = findEventFromList(void 0);
			if(call !== void 0)
				call.call(event.target, event, event.target.model, _modelScope, withKey && event.target.sf$repeatListIndex);
		};
	}

	// Get function reference
	else if(direct)
		script = eval(script);

	// Wrap into a function, var event = firefox compatibility
	else script = (new Function('_modelScope', 'event', script)).bind(that, _modelScope);

	var containSingleChar = false;
	var keys = name_.split('.');
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

	if(keys.has('right') && (eventName.includes('mouse') || eventName.includes('pointer'))){
		// Prevent context menu on mouse event
		(rootHandler || that).addEventListener('contextmenu', function(ev){
			ev.preventDefault();
		}, options);
	}

	if(specialEvent[eventName]){
		specialEvent[eventName](that, keys, script, _modelScope, rootHandler);
		return;
	}

	var pointerCode = 0;
	if(keys.has('left')) pointerCode |= 1;
	if(keys.has('middle')) pointerCode |= 2;
	if(keys.has('right')) pointerCode |= 4;
	if(keys.has('4th')) pointerCode |= 8;
	if(keys.has('5th')) pointerCode |= 16;

	var modsCode = 0;
	if(keys.has('ctrl')) modsCode |= 1;
	if(keys.has('alt')) modsCode |= 2;
	if(keys.has('shift')) modsCode |= 4;
	if(keys.has('meta')) modsCode |= 8;

	if(direct && keys.size === 0)
		var callback = script;
	else{
		var callback = function(ev){
			if(ev.isTrusted === false && keys.has('trusted'))
				return;

			if(keys.has('stop'))
				ev.stopPropagation();
			else if(keys.has('stopAll')){
				ev.stopImmediatePropagation();
				ev.stopPropagation();
			}

			if(ev.ctrlKey !== void 0 && modsCode !== 0){
				if(modsCode & 1 && ev.ctrlKey !== true
					|| modsCode & 2 && ev.altKey !== true
					|| modsCode & 4 && ev.shiftKey !== true
					|| modsCode & 8 && ev.metaKey !== true)
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
			else if(ev.constructor === MouseEvent || ev.constructor === PointerEvent){
				if(pointerCode !== 0 && !(ev.buttons === 0 ? pointerCode & (1 << (ev.which-1)) : ev.buttons === pointerCode))
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

	(rootHandler || that).addEventListener(eventName, callback, options);

	// ToDo: Check if there are unused event attachment on detached element
	// console.error(231, rootHandler, that, eventName, callback, options);

	if(options.once === void 0){
		(rootHandler || that)['sf$eventDestroy_'+eventName] = function(){
			(rootHandler || that).removeEventListener(eventName, callback, options);
		}
	}

	// Avoid small memory leak when event still listening
	if(rootHandler)
		that = null;
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
		that.style.touchAction = 'none';
		function callbackMove(ev){
			ev.stopPropagation();
			ev.preventDefault();
			ev.stopImmediatePropagation();
			script.call(that, ev);
		}

		function prevent(ev){ev.preventDefault()}

		var callbackStart = function(ev){
			ev.preventDefault();
			ev.stopPropagation();

			script.call(that, ev);

			document.addEventListener('pointermove', callbackMove);
			document.addEventListener('touchmove', prevent, {passive: false});
			document.addEventListener('pointerup', callbackEnd, {once:true});
			document.addEventListener('pointercancel', callbackEnd, {once:true});
		}

		var callbackEnd = function(ev){
			ev.preventDefault();
			ev.stopPropagation();

			script.call(that, ev);

			document.removeEventListener('pointermove', callbackMove);
			document.removeEventListener('touchmove', prevent, {passive: false});
			document.removeEventListener('pointercancel', callbackEnd, {once:true});
			that.addEventListener('pointerdown', callbackStart, {once:true});
		}

		that.addEventListener('pointerdown', callbackStart);

		that['sf$eventDestroy_dragmove'] = function(){
			that.removeEventListener('pointerdown', callbackStart, {once:true});
			document.removeEventListener('pointermove', callbackMove);
			document.removeEventListener('pointercancel', callbackEnd, {once:true});
			document.removeEventListener('pointerup', callbackEnd, {once:true});
		}
	},
	filedrop:function(that, keys, script, _modelScope){
		that.addEventListener('dragover', function dragover(ev){
			ev.preventDefault();
		});

		that.addEventListener('drop', function drop(ev){
			ev.preventDefault();

			if(ev.dataTransfer.items) {
				var found = [];
				for (var i = 0; i < ev.dataTransfer.items.length; i++) {
					if (ev.dataTransfer.items[i].kind === 'file')
						found.push(ev.dataTransfer.items[i].getAsFile());
				}

				script.call(that, found);
			}
			else script.call(that, ev.dataTransfer.files);
		});

		that['sf$eventDestroy_filedrop'] = function(){
			that.removeEventListener('dragover', dragover);
			that.removeEventListener('drop', drop);
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
		ev.stopImmediatePropagation();
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