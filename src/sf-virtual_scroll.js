// If you learn/copy from this library or rewrite it to your code
// You must credit me on your code. I was struggling alone for many
// day to make this working since using scroll event :(

// ToDo: add sf$scrollPos and sf$heightPos
const ElementManipulatorProxy = internal.EMP;
// const ElementManipulator = internal.EM;
const VSM_Threshold = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
let virtualScrolling = false;

class VirtualScrollManipulator {
	waitMap = new Set();
	existMap = new WeakSet();
	observeMap = new WeakSet();
	waitingMap = false;
	dynamicSize = false;
	firstCursor = 0;
	lastCursor = 0;
	bottomHeight = 1;
	topHeight = 1;
	prepareSize = 12/2;
	totalHeight = 0;
	callbacks = void 0;
	currentPosition = 1; // 0 middle, 1 top, 2 bottom

	currentPositionChanged(id){
		var callbacks = this.callbacks;
		if(callbacks === void 0 || id === this.currentPosition)
			return;

		if(id === 1)
			callbacks.nearCeiling && callbacks.nearCeiling();
		else if(id === 2)
			callbacks.nearFloor && callbacks.nearFloor();

		this.currentPosition = id;
	}

	constructor(root, $EM, firstEl){
		this.$EM = $EM;
		this.elList = $EM.elements;
		this.list = $EM.list;
		this.iTop = document.createElement(firstEl.tagName);
		this.iTop.classList.add('virtual-spacer');
		this.iRoot = root;
		this.iBottom = this.iTop.cloneNode();

		root.insertBefore(this.iTop, null);
		root.appendChild(this.iBottom);
		root.insertBefore(firstEl, this.iBottom);

		const that = this;
		requestAnimationFrame(()=> {
			const styled = window.getComputedStyle(firstEl);
			that.elMarginY = parseFloat(styled.marginBottom) + parseFloat(styled.marginTop);

			that.elMaxHeight = that.elHeight = firstEl.offsetHeight + that.elMarginY;
			firstEl.remove();

			setTimeout(()=> {
				if(!root.isConnected) return; // Somewhat it's detached

				let scroller = internal.findScrollerElement(root);
				if(scroller === null){
					scroller = root;
					console.warn("Virtual List need scrollable container", root);
				}
				else scroller.classList.add('sf-scroll-element');
				that.iScroller = scroller;

				that.rootHeight = that.iScroller.offsetHeight;

				if(root.classList.contains('sf-list-dynamic'))
					that.dynamicSize = true;

				that.init();
			}, 500);
		});
	}

	init(){
		this.listSize = this.prepareSize + Math.round(this.rootHeight / this.elMaxHeight);

		const that = this;
		function intersectionCallback(){
			const entries = that.lastEntries;
			that.lastEntries = void 0;

			let refreshed = false, hitPos = 0;
			for(let i=entries.length-1; i>=0; i--){
				const entry = entries[i];
				if(entry.intersectionRect.height <= 1){
					if(entry.isIntersecting && entry.intersectionRect.height === 1){
						if(entry.target === that.iTop)
							hitPos |= 1;
						else if(entry.target === that.iBottom)
							hitPos |= 2;
					}

					continue;
				}

				if(entry.target === that.iTop || entry.target === that.iBottom){
					if(entry.isIntersecting === false || refreshed)
						continue;

					if(hitPos !== 0) hitPos = 3;

					refreshed = true;
					that.recalculateScrollPosition();
				}
				else if(that.observeMap.has(entry.target))
					that.waitObservedElement(entry.target, entry.intersectionRatio);
			}

			if(hitPos === 0 || hitPos === 3) return;
			that.currentPosition = hitPos;

			if(hitPos === 1 && (that.bottomHeight > 2 || entries.length === 1))
				that.callbacks.hitCeiling && that.callbacks.hitCeiling();
			else if(hitPos === 2 && (that.topHeight > 2 || entries.length === 1))
				that.callbacks.hitFloor && that.callbacks.hitFloor();
		}

		this.observer = new IntersectionObserver((entries)=> {
			if(that.lastEntries === void 0)
				requestAnimationFrame(intersectionCallback);
			that.lastEntries = entries;
		}, {
			root: that.iScroller,
			threshold: VSM_Threshold
		});

		this.observer.observe(this.iTop);
		this.observer.observe(this.iBottom);

		if(this.dynamicSize){
			this.rObserver = new ResizeObserver((entries)=> {
				const { elList } = that;
				let refresh = elList.length;

				var target;
				for(var i=0; i<entries.length; i++){
					target = entries[i].target;
					const newHeight = target.offsetHeight + that.elMarginY;

					if(target.sf$heightPos !== newHeight){
						that.totalHeight -= target.sf$heightPos;
						that.totalHeight += newHeight;
						target.sf$heightPos = newHeight;

						const index = elList.indexOf(target);
						if(index !== -1 && refresh > index)
							refresh = index;

						if(newHeight > that.elMaxHeight)
							that.elMaxHeight = newHeight;
					}
				}

				that.listSize = that.prepareSize + Math.round(that.rootHeight / that.elMaxHeight);

				if(refresh === 0)
					elList[refresh++].sf$scrollPos = 1;

				for(var i=refresh; i<elList.length; i++){
					const before = elList[i-1];
					const el = elList[i];
					if(before === void 0){
						el.sf$scrollPos = 1;
						continue;
					}

					el.sf$scrollPos = before.sf$scrollPos + before.sf$heightPos;
				}

				that.recalculateMargin(void 0, void 0, target);

				if(that.lastCursor !== elList.length){
					const el = elList[that.lastCursor-1];
					if(el !== void 0)
						that.bottomHeight = that.totalHeight - (el.sf$scrollPos + el.sf$heightPos);
					else
						that.lastCursor = elList.length;

					if(that.bottomHeight < 0)
						that.bottomHeight = 2;
				}
				else that.bottomHeight = 1;

				this.iBottom.style.height = `${this.bottomHeight}px`;
			});

			this.bottomHeight = 2;
		}
		else this.bottomHeight = this.elMaxHeight * this.elList.length;

		this.iTop.style.height = `${this.topHeight}px`;
		this.iBottom.style.height = `${this.bottomHeight}px`;

		// Since the beginning the scroll will start from the top
		this.currentPosition = 1;
	}

	recalculateMargin(totalX, totalY, showedEl){
		if(totalX === void 0 && totalY === void 0){
			showedEl = showedEl || this.iRoot.children[1];
			if(showedEl === this.iBottom) return;

			const styled = window.getComputedStyle(showedEl);
			totalX = parseFloat(styled.marginLeft) + parseFloat(styled.marginRight);
			totalY = parseFloat(styled.marginTop) + parseFloat(styled.marginBottom);

			if(Number.isNaN(totalX))
				totalX = this.elMarginX;
			if(Number.isNaN(totalY))
				totalY = this.elMarginY;
		}

		if(this.elMarginY === totalY) return;

		const oldMarginY = this.elMarginY;
		this.elMarginY = totalY;

		this.elMaxHeight = (this.elMaxHeight - oldMarginY) + totalY;
		this.elHeight = (this.elHeight - oldMarginY) + totalY;

		const { elList } = this;
		this.totalHeight = (this.totalHeight - oldMarginY*elList.length) + totalY*elList.length;

		for(var i=0; i < elList.length; i++){
			const target = elList[i];
			target.sf$heightPos = (target.sf$heightPos - oldMarginY) + totalY;
		}

		this.recalculateElementData(0);
	}

	waitObservedElement(el, ratio){
		if(ratio < 0.7){
			this.waitMap.delete(el);
			if(this.existMap.has(el)){
				this.existMap.delete(el);
				this.list.visibilityCallback(elList.indexOf(el), false);
			}
		}
		else if(!this.existMap.has(el))
			this.waitMap.add(el);

		if(this.waitingMap === false){
			setTimeout(this.waitObservedFinish, 1000);
			this.waitingMap = true;
		}
	}

	waitObservedFinish(){
		const startMark = this.iScroller.scrollTop;
		const endMark = startMark + this.iScroller.offsetHeight;

		for(let val of waitMap){
			if(val.sf$scrollPos < startMark || val.sf$scrollPos > endMark)
				continue;

			this.existMap.add(val);
			this.list.visibilityCallback(elList.indexOf(el), true);
		}

		this.waitMap.clear();
		this.waitingMap = false;
	}

	recalculatePending = false;
	// appendPos: 1 bottom, 2 top
	recalculateScrollPosition(afterPending, appendPos){
		if(this.listSize === void 0 || this.recalculatePending)
			return; // Haven't been initialized

		if(afterPending === void 0){
			this.recalculatePending = true;
			let that = this;
			requestAnimationFrame(()=> {
				that.recalculatePending = false;
				that.recalculateScrollPosition(true, appendPos);
			});
			return;
		}

		const { scrollTop } = this.iScroller;
		const { elList } = this;

		for(var i = Math.floor(scrollTop/this.elMaxHeight); i < elList.length; i++){
			const scrollPos = elList[i].sf$scrollPos;
			if(scrollPos === void 0 || scrollPos >= scrollTop)
				break;
		}

		i = i - this.prepareSize;
		if(i < 0) i=0;
		else if(i > elList.length) i = elList.length - this.listSize;

		let until = i + this.listSize + this.prepareSize;
		if(until > elList.length) until = elList.length;

		if(i >= until){
			this.iBottom.style.height = `${this.bottomHeight}px`;

			if(this.topHeight !== 1)
				this.currentPositionChanged(0);
			return;
		}

		if(appendPos === 1)
			this.iScroller.scrollTop -= 5;
		else if(appendPos === 2)
			this.iScroller.scrollTop += 5;

		this.firstCursor = i;

		if(appendPos === void 0)
			virtualScrolling = true;

		const expect = elList[i] || this.iBottom;
		let next = this.iTop.nextElementSibling;
		let last;

		for (var a = i; a < until; a++)
			elList[a].$Vi = a;

		while(next !== expect){
			last = next;
			next = last.nextElementSibling;

			if(next === null){
				next = this.iBottom;
				break;
			}

			if(last.$Vi >= i && last.$Vi < until)
				continue;

			last.remove();
			last.sf$removed = true;

			if(this.dynamicSize)
				this.rObserver.unobserve(last);
		}

		if(next === this.iBottom)
			next = this.iTop.nextElementSibling;

		this.topHeight = expect.sf$scrollPos;
		if(this.topHeight > 1)
			this.topHeight -= this.elMarginY/2;

		for(; i < until; i++){
			last = elList[i];

			if(last === next){
				next = next.nextElementSibling;
				continue;
			}

			this.iRoot.insertBefore(last, next);
			if(last.sf$removed && this.dynamicSize)
				this.rObserver.observe(last);

			last.sf$removed = false;
		}

		while(next !== this.iBottom){
			last = next;
			last.sf$removed = true;
			next = last.nextElementSibling;
			last.remove();

			if(this.dynamicSize)
				this.rObserver.unobserve(last);
		}

		last = elList[until-1];
		this.lastCursor = until;

		if(i === elList.length)
			this.bottomHeight = 1;
		else
			this.bottomHeight = this.totalHeight - (last.sf$scrollPos + last.sf$heightPos);

		if(this.bottomHeight < 0) this.bottomHeight = 2;

		this.iTop.style.height = `${this.topHeight}px`;
		this.iBottom.style.height = `${this.bottomHeight}px`;

		virtualScrolling = false;
		if(this.topHeight === 1 && this.bottomHeight === 1)
			return;

		if(this.topHeight === 1)
			this.currentPositionChanged(1);
		else if(this.bottomHeight === 1)
			this.currentPositionChanged(2);
	}

	observeVisibility(index){
		this.observer.observe(this.elList[index]);
		this.observeMap.add(this.elList[index]);
	}

	unobserveVisibility(index){
		this.observer.unobserve(this.elList[index]);
		this.observeMap.delete(this.elList[index]);
	}

	scrollTo(index){
		const target = this.elList[index];
		if(!target) return;

		this.iScroller.scrollTop = target.sf$scrollPos;
	}

	offsetTo(index){
		if(!this.elList[index]) return -1;
		return this.elList[index].sf$scrollPos;
	}
}

// For repeated-list.js
Object.assign(VirtualScrollManipulator.prototype, {
	startInjection(){
		const { elList } = this;
		let n = this.listSize;
		if(n > elList.length)
			n = elList.length;

		for (let i = 0; i < n; i++){
			this.iRoot.insertBefore(elList[i], this.iBottom);
			this.newElementInit(elList[i], i-1);
		}

		this.firstCursor = 0;
		this.lastCursor = n;

		if(elList.length === n)
			this.bottomHeight = 1;
		else this.bottomHeight = 2;
		this.topHeight = 1;
	},

	newElementInit(el, before){
		if(el.sf$heightPos === void 0)
			el.sf$heightPos = this.elHeight + this.elMarginY;

		if(before === 0)
			el.sf$scrollPos = 1;
		else{
			before = this.elList[before];
			if(before !== void 0)
				el.sf$scrollPos = before.sf$scrollPos + before.sf$heightPos;
			else el.sf$scrollPos = 1;
		}

		if(this.dynamicSize)
			this.rObserver.observe(el);

		this.totalHeight += el.sf$heightPos;
	},

	clear(){
		this.topHeight = this.bottomHeight = 1;
		this.totalHeight = this.lastCursor = this.firstCursor = 0;

		if(this.dynamicSize)
			this.rObserver.disconnect();

		this.waitMap.clear();
		this.iRoot.appendChild(this.iTop);
		this.iRoot.appendChild(this.iBottom);
	},

	append(index){
		this.recalculateScrollPosition(void 0, 1);
	},

	prepend(index){
		this.recalculateElementData(index);
		this.recalculateScrollPosition(void 0, 2);
	},

	move(from, to, count, vDOM){
		if(from > to) from = to;

		this.recalculateElementData(from);
		this.recalculateScrollPosition();
	},

	swap(index, other){
		if(index > other) index = other;

		this.recalculateElementData(index);
		this.recalculateScrollPosition();
	},

	remove(index){
		this.totalHeight -= this.elList[index].sf$heightPos;
		this.recalculateElementData(index);
		this.recalculateScrollPosition();
	},

	removeRange(index, other){
		for (let i = index; i < other; i++)
			this.totalHeight -= this.elList[i].sf$heightPos;

		this.elList.splice(index, other-index);
		this.recalculateElementData(index);
		this.recalculateScrollPosition();
	},

	insertAfter(index){
		this.totalHeight -= this.elList[index].sf$heightPos;
		this.recalculateScrollPosition();
	},

	update(i, temp){
		this.recalculateScrollPosition();
	},

	hardRefresh(index){
		this.recalculateElementData(index);
		this.recalculateScrollPosition();
	},

	reverse(){
		this.recalculateElementData(0);
		this.recalculateScrollPosition();
	},

	recalculateElementData(index){
		const { elList } = this;
		for (let i = index+1; i < elList.length; i++) {
			const before = elList[i-1];
			const now = elList[i];
			now.sf$scrollPos = before.sf$scrollPos + before.sf$heightPos;
		}
	},
});

class VirtualScroll{
	constructor($EM){
		this.$EM = $EM;
	}

	visibilityCallback = function(){
		console.log('Please set "visibilityCallback" property when using "observeVisibility"');
	}

	// Note: Don't use ...spread for args
	_proxying(name, args){
		const func = VirtualScrollManipulator.prototype[name];
		if(this.$EM.constructor === ElementManipulatorProxy){
			const { list } = this.$EM;
			let val;
			for (let i = 0; i < list.length; i++)
				val = func.apply(list[i].$VSM, args);
			return val;
		}
		else return func.apply(this.$EM.$VSM, args);
	}

	observeVisibility(index){
		this._proxying('observeVisibility', arguments);
	}

	unobserveVisibility(index){
		this._proxying('unobserveVisibility', arguments);
	}

	scrollTo(index){
		this._proxying('scrollTo', arguments);
	}

	offsetTo(index){
		return this._proxying('offsetTo', arguments);
	}

	destroy(){
		// console.log("VirtualScroll destroy haven't been implemented");
	}
}

;(function(){
	let styleInitialized = false;
	internal.addScrollerStyle = ()=> {
		if(styleInitialized === false){
			let style = document.getElementById('sf-styles');

			if(!style){
				style = document.createElement('style');
				style.id = 'sf-styles';
				document.head.appendChild(style);
			}

			style.sheet.insertRule(
`.sf-virtual-list .virtual-spacer{\
visibility:hidden!important;\
position:relative!important;\
transform-origin:0 0!important;\
width:1px!important;\
margin:0!important;\
padding:0!important;\
background:none!important;\
border:none!important;\
box-shadow:none!important;\
transition:none!important;\
pointer-events:none;\
}`, style.sheet.cssRules.length);

			style.sheet.insertRule(
			'.sf-scroll-element,textarea{backface-visibility:hidden}', style.sheet.cssRules.length);
			styleInitialized = true;
		}
	}

	const isScroller = /auto|scroll|overlay|hidden/;
	internal.findScrollerElement = (el)=> {
		const doc = el.ownerDocument;
		const win = doc.defaultView;
		if(!win) return null;

		while(el !== null && isScroller.test(win.getComputedStyle(el).overflow) === false){
			el = el.parentNode;
			if(el === doc.body)
				return null;
		};

		return el;
	}
})();