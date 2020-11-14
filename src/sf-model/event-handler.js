if(!window.TouchEvent)
	window.TouchEvent = void 0;

function eventHandler(that, data, _modelScope, rootHandler, template){
	const modelKeys = sf.model.modelKeys(_modelScope, true);

	let direct = false;
	let script = data.value;
	script = avoidQuotes(script, function(script_){
		if(sfRegex.anyOperation.test(script_) === false)
			direct = true;

		// Replace variable to refer to current scope
		return script_.replace(template.modelRefRoot_regex, (full, before, matched)=> `${before}_modelScope.${matched}`);
	});

	const name_ = data.name.slice(1);
	let wantTrusted = name_.includes('.trusted') || rejectUntrusted;

	// Create custom listener for repeated element
	if(rootHandler){
		const elementIndex = $.getSelector(that, true, rootHandler); // `rootHandler` may not the parent of `that`

		if(rootHandler.sf$listListener === void 0)
			rootHandler.sf$listListener = {};

		let withKey = false;
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

		let listener = rootHandler.sf$listListener[name_];
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

		let found = null;
		const findEventFromList = function(arr){
			// Partial array compare ([0,1,2] with [0,1,2,3,4] ==> true)
			parent:for (let i = 0; i < listener.length; i++) {
				const ref = listener[i];
				if(arr === void 0){
					if(ref[0].length !== 0)
						continue;

					found = ref[0];
					return ref[1];
				}

				const ref2 = ref[0];
				for (let z = 0; z < ref2.length; z++) {
					if(ref2[z] !== arr[z])
						continue parent;
				}

				found = ref[0];
				return ref[1];
			}

			return;
		}

		// We need to get element with 'sf-bind-list' and check current element before processing
		script = function(ev){
			if(ev.isTrusted === false && wantTrusted){
				sf.security.report && sf.security.report(1, ev);
				return;
			}

			const elem = ev.target;
			if(elem === rootHandler)
				return;

			if(!elem.sf$elementReferences || !elem.sf$elementReferences.template.bindList){
				const realThat = findBindListElement(elem);
				if(realThat === null)
					return;

				var call = findEventFromList($.getSelector(elem, true, realThat));
				if(call !== void 0)
					call.call($.childIndexes(found, realThat), ev, realThat.model, _modelScope, withKey && realThat.sf$repeatListIndex);

				return;
			}

			var call = findEventFromList(void 0);
			if(call !== void 0)
				call.call(ev.target, ev, ev.target.model, _modelScope, withKey && ev.target.sf$repeatListIndex);
		};

		script.listener = listener;
	}

	// Get function reference
	else if(direct){
		script = eval(script);

		if(rejectUntrusted || name_.includes('.trusted')){
			let original = script;
			script = function(ev){
				if(ev.isTrusted === false){
					sf.security.report && sf.security.report(1, ev);
					return;
				}

				original(ev);
			}
		}
	}

	// Wrap into a function, var event = firefox compatibility
	else{
		if(wantTrusted){
			script = 'if(!event.isTrusted){sf.security.report&&sf.security.report(1,event);return};'+ script;
		}

		script = (new Function('_modelScope', 'event', script)).bind(that, _modelScope);
	}

	let containSingleChar = false;
	let keys = name_.split('.');
	let eventName = keys.shift();

	if(eventName === 'unfocus')
		eventName = 'blur';

	for (let i = keys.length - 1; i >= 0; i--) {
		if(keys[i].length === 1){
			containSingleChar = true;
			break;
		}
	}

	keys = new Set(keys);

	const options = {};
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

	let pointerCode = 0;
	if(keys.has('left')){ pointerCode |= 1; keys.delete('left'); }
	if(keys.has('middle')){ pointerCode |= 2; keys.delete('middle'); }
	if(keys.has('right')){ pointerCode |= 4; keys.delete('right'); }
	if(keys.has('4th')){ pointerCode |= 8; keys.delete('4th'); }
	if(keys.has('5th')){ pointerCode |= 16; keys.delete('5th'); }

	let modsCode = 0;
	if(keys.has('ctrl')){ modsCode |= 1; keys.delete('ctrl'); }
	if(keys.has('alt')){ modsCode |= 2; keys.delete('alt'); }
	if(keys.has('shift')){ modsCode |= 4; keys.delete('shift'); }
	if(keys.has('meta')){ modsCode |= 8; keys.delete('meta'); }

	if(direct && keys.size === 0 && pointerCode === 0 && modsCode === 0)
		var callback = script;
	else{
		var callback = function(ev){
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

		callback.listener = script;
	}

	(rootHandler || that).addEventListener(eventName, callback, options);

	// ToDo: Check if there are unused event attachment on detached element
	// console.error(231, rootHandler, that, eventName, callback, options);

	if(options.once === void 0){
		(rootHandler || that)[`sf$eventDestroy_${eventName}`] = function(){
			(rootHandler || that).removeEventListener(eventName, callback, options);
		}
	}

	// Avoid small memory leak when event still listening
	if(rootHandler)
		that = null;
}

const toDegree = 180/Math.PI;
var specialEvent = internal.model.specialEvent = {
	taphold(that, keys, script, _modelScope){
		const set = new Set();
		let evStart = null;

		function callback(){
			that.removeEventListener('pointerup', callbackEnd, {once:true});
			that.removeEventListener('pointercancel', callbackEnd, {once:true});

			view.removeEventListener('pointermove', callbackMove);
			set.delete(evStart.pointerId);

			script.call(that, evStart);
		}

		function callbackMove(ev){
			if(Math.abs(evStart.clientX - ev.clientX) > 1 || Math.abs(evStart.clientY - ev.clientY) > 1){
				clearTimeout(timer);
				set.delete(ev.pointerId);
				that.removeEventListener('pointerup', callbackEnd, {once:true});
				that.removeEventListener('pointercancel', callbackEnd, {once:true});
				view.removeEventListener('pointermove', callbackMove);

				evStart = null;
			}
		}

		var timer = 0;
		var view = document;

		function callbackStart(ev){
			clearTimeout(timer);

			view = ev.view.document;

			set.add(ev.pointerId);
			if(set.size > 1){
				ev.preventDefault();
				ev.stopPropagation();

				that.removeEventListener('pointerup', callbackEnd, {once:true});
				that.removeEventListener('pointercancel', callbackEnd, {once:true});
				view.removeEventListener('pointermove', callbackMove);
				return;
			}

			evStart = ev;
			timer = setTimeout(callback, 700);

			that.addEventListener('pointerup', callbackEnd, {once:true});
			that.addEventListener('pointercancel', callbackEnd, {once:true});
			view.addEventListener('pointermove', callbackMove);
		}

		callbackStart.listener = script;

		function callbackEnd(ev){
			view.removeEventListener('pointermove', callbackMove);
			evStart = null;

			set.delete(ev.pointerId);
			clearTimeout(timer);
		}

		that.addEventListener('pointerdown', callbackStart);

		that['sf$eventDestroy_taphold'] = function(){
			that.removeEventListener('pointerdown', callbackStart);
		}
	},
	gesture(that, keys, script, _modelScope){
		function callback(data){
			script.call(that, data);
		}

		touchGesture(that, callback);
		callback.listener = script;
	},
	dragmove(that, keys, script, _modelScope){
		function callbackMove(ev){
			ev.stopPropagation();
			ev.preventDefault();
			ev.stopImmediatePropagation();
			script.call(that, ev);
		}

		function prevent(ev){
			if(ev.cancelable) ev.preventDefault()
		}

		let view = document;
		const callbackStart = function(ev){
			ev.preventDefault();
			ev.stopPropagation();

			script.call(that, ev);
			view = ev.view === null ? ev.target.ownerDocument : ev.view.document;

			if(isTouchDevice())
				that.addEventListener('touchmove', prevent, {passive:false, once:true});

			view.addEventListener('pointermove', callbackMove);
			view.addEventListener('pointerup', callbackEnd, {once:true});
			view.addEventListener('pointercancel', callbackEnd, {once:true});
		}

		const callbackEnd = function(ev){
			ev.preventDefault();
			ev.stopPropagation();

			script.call(that, ev);
			view = ev.view === null ? ev.target.ownerDocument : ev.view.document;

			if(isTouchDevice())
				that.removeEventListener('touchmove', prevent, {passive:false, once:true});

			view.removeEventListener('pointermove', callbackMove);
			view.removeEventListener('pointercancel', callbackEnd, {once:true});
			that.addEventListener('pointerdown', callbackStart, {once:true});
		};

		callbackStart.listener = script;
		that.addEventListener('pointerdown', callbackStart);

		that['sf$eventDestroy_dragmove'] = function(){
			that.removeEventListener('pointerdown', callbackStart, {once:true});
			document.removeEventListener('pointermove', callbackMove);
			document.removeEventListener('pointercancel', callbackEnd, {once:true});
			document.removeEventListener('pointerup', callbackEnd, {once:true});
		}
	},
	filedrop(that, keys, script, _modelScope){
		that.addEventListener('dragover', function dragover(ev){
			ev.preventDefault();
		});

		function drop(ev){
			ev.preventDefault();

			if(ev.dataTransfer.items) {
				const found = [];
				for (let i = 0; i < ev.dataTransfer.items.length; i++) {
					if (ev.dataTransfer.items[i].kind === 'file')
						found.push(ev.dataTransfer.items[i].getAsFile());
				}

				script.call(that, found);
			}
			else script.call(that, ev.dataTransfer.files);
		}

		that.addEventListener('drop', drop);
		drop.listener = script;

		that['sf$eventDestroy_filedrop'] = function(){
			that.removeEventListener('dragover', dragover);
			that.removeEventListener('drop', drop);
		}
	}
};

function touchGesture(that, callback){
	let startScale = 0;
	let startAngle = 0;
	let lastScale = 0;
	let lastAngle = 0;
	let actionBackup = '';

	let force = false;
	const pointers = [];

	function findAnd(action, ev){
		for (let i = pointers.length - 1; i >= 0; i--) {
			if(pointers[i].pointerId === ev.pointerId){
				if(action === 2) // delete
					pointers.splice(i, 1);
				else if(action === 1) // replace
					pointers[i] = ev;
				return;
			}
		}

		if(action === 0) // add
			pointers.push(ev);
	}

	let view = document;
	const callbackStart = function(ev){
		ev.preventDefault();
		findAnd(0, ev);

		view = ev.view.document;

		if(pointers.length === 1){
			if(force)
				pointers.unshift({
					pointerId:'custom',
					clientX:that.offsetLeft + that.offsetWidth/2,
					clientY:that.offsetTop + that.offsetHeight/2
				});

			actionBackup = that.style.touchAction;
			that.style.touchAction = 'none';

			view.addEventListener('pointerup', callbackEnd);
			view.addEventListener('pointercancel', callbackEnd);
		}

		if(pointers.length === 2){
			ev.stopPropagation();

			const dx = pointers[1].clientX - pointers[0].clientX;
			const dy = pointers[1].clientY - pointers[0].clientY;

			lastScale = startScale = Math.sqrt(dx**2 + dy**2) * 0.01;
			lastAngle = startAngle = Math.atan2(dy, dx) * toDegree;

			ev.scale =
			ev.angle =
			ev.totalScale =
			ev.totalAngle = 0;

			callback(ev);
			view.addEventListener('pointermove', callbackMove);
		}
		else view.removeEventListener('pointermove', callbackMove);
	}

	const callbackMove = function(ev){
		ev.preventDefault();
		ev.stopPropagation();
		ev.stopImmediatePropagation();
		findAnd(1, ev);

		const p1 = pointers[0];
		const p2 = pointers[1];
		const dx = p2.clientX - p1.clientX;
		const dy = p2.clientY - p1.clientY;

		const currentScale = Math.sqrt(dx**2 + dy**2) * 0.01;
		const currentAngle = Math.atan2(dy, dx) * toDegree;

		ev.scale = currentScale - lastScale;
		ev.angle = currentAngle - lastAngle;
		ev.totalScale = currentScale - startScale;
		ev.totalAngle = currentAngle - startAngle;

		callback(ev);

		lastScale = currentScale;
		lastAngle = currentAngle;
	};

	const callbackEnd = function(ev){
		ev.preventDefault();
		findAnd(2, ev);

		if(pointers.length <= 1){
			if(pointers.length === 0){
				view.removeEventListener('pointerup', callbackEnd);
				view.removeEventListener('pointercancel', callbackEnd);
			}

			that.style.touchAction = actionBackup;

			view.removeEventListener('pointermove', callbackMove);

			ev.scale = ev.angle = 0;
			ev.totalScale = lastScale - startScale;
			ev.totalAngle = lastAngle - startAngle;
			callback(ev);
		}
		else{
			view.addEventListener('pointerup', callbackEnd);
			view.addEventListener('pointercancel', callbackEnd);

			if(pointers.length === 2){
				view.removeEventListener('pointermove', callbackMove);

				ev.scale = ev.angle = 0;
				callback(ev);
			}
		}
	};

	that.addEventListener('pointerdown', callbackStart);

	that['sf$eventDestroy_gesture'] = function(){
		that.removeEventListener('pointerdown', callbackStart);
		$(sf.window).off('keydown', keyStart);
	}

	const keyEnd = function(ev){
		if(!force || ev.ctrlKey)
			return;

		force = false;
		pointers.length = 0;

		view.removeEventListener('pointermove', callbackMove);
		view.removeEventListener('keyup', keyEnd);
	};

	const keyStart = function(ev){
		if(!ev.ctrlKey)
			return;

		view = ev.view.document;

		force = true;
		view.addEventListener('keyup', keyEnd);
	};

	$(sf.window).on('keydown', keyStart);
}