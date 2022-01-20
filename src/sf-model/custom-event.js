import {onEvent, offEvent} from "../sf-dom.utils.js";
import {internal, isTouchDevice} from "../shared.js";

const toDegree = 180/Math.PI;
export const CustomEvent = {
	taphold(that, script, keys){
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
	gesture(that, script, keys){
		function callback(data){
			script.call(that, data);
		}

		callback.listener = script;
		touchGesture(that, callback);
	},
	dragmove(that, script, keys){
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

			// Lock sf-each target if exist
			script.lock && script.lock(true);

			script.call(that, ev);
			view = ev.view === null ? ev.target.ownerDocument : ev.view.document;

			if(isTouchDevice())
				that.addEventListener('touchmove', prevent, {passive:false, capture:true});

			view.addEventListener('pointermove', callbackMove);
			view.addEventListener('pointerup', callbackEnd, {once:true});
			view.addEventListener('pointercancel', callbackEnd, {once:true});
		}

		const callbackEnd = function(ev){
			ev.preventDefault();
			ev.stopPropagation();

			script.call(that, ev);
			view = ev.view === null ? ev.target.ownerDocument : ev.view.document;

			// Lock sf-each target if exist
			script.lock && script.lock(false);

			if(isTouchDevice())
				that.removeEventListener('touchmove', prevent, {passive:false, capture:true});

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
	filedrop(that, script, keys){
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
	const script = callback.listener;

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

			const [p1, p2] = pointers;
			const dx = p1.clientX - p2.clientX;
			const dy = p1.clientY - p2.clientY;

			lastScale = startScale = ((dx**2 + dy**2) ** 0.5) / 100;
			lastAngle = startAngle = Math.atan2(dy, dx) * toDegree;

			ev.scale =
			ev.angle =
			ev.totalScale =
			ev.totalAngle = 0;
			ev.pointerEvents = pointers;

			// Lock sf-each target if exist
			script.lock && script.lock(true);

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

		const [p1, p2] = pointers;
		const dx = p2.clientX - p1.clientX;
		const dy = p2.clientY - p1.clientY;

		const currentScale = ((dx**2 + dy**2) ** 0.5) / 100;
		const currentAngle = Math.atan2(dy, dx) * toDegree;

		ev.scale = currentScale - lastScale;
		ev.angle = currentAngle - lastAngle;
		ev.totalScale = currentScale - startScale;
		ev.totalAngle = currentAngle - startAngle;
		ev.pointerEvents = pointers;

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
			ev.pointerEvents = pointers;

			// Lock sf-each target if exist
			script.lock && script.lock(true);
			callback(ev);
		}
		else{
			view.addEventListener('pointerup', callbackEnd);
			view.addEventListener('pointercancel', callbackEnd);

			if(pointers.length === 2){
				view.removeEventListener('pointermove', callbackMove);
				ev.scale = ev.angle = 0;
				ev.pointerEvents = pointers;

				// Lock sf-each target if exist
				script.lock && script.lock(true);
				callback(ev);
			}
		}
	};

	that.addEventListener('pointerdown', callbackStart);

	that['sf$eventDestroy_gesture'] = function(){
		that.removeEventListener('pointerdown', callbackStart);
		offEvent(internal.WindowClass, 'keydown', keyStart);
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

	onEvent(internal.WindowClass, 'keydown', keyStart);
}