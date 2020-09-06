// If you learn/copy from this library or rewrite it to your code
// You must credit me on your code. I was struggling alone for many
// day to make this working since using scroll event :(

// ToDo: add sf$scrollPos and sf$heightPos
var ElementManipulatorProxy = internal.EMP;
var ElementManipulator = internal.EM;
var VSM_Threshold = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];

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

		var that = this;
		requestAnimationFrame(function(){
			setTimeout(function(){
				if(!root.isConnected) return; // Somewhat it's detached

				var scroller = internal.findScrollerElement(root);
				if(scroller === null){
					scroller = root;
					console.warn("Virtual List need scrollable container", root);
				}
				else scroller.classList.add('sf-scroll-element');
				that.iScroller = scroller;

				var styled = firstEl.computedStyleMap();
				that.elMargin = styled.get('margin-bottom').value + styled.get('margin-top').value;

				that.elMaxHeight = that.elHeight = firstEl.offsetHeight + that.elMargin;
				firstEl.remove();

				that.rootHeight = that.iScroller.offsetHeight;

				if(root.classList.contains('sf-list-dynamic'))
					that.dynamicSize = true;

				that.init();
			}, 500);
		});
	}

	init(){
		this.listSize = this.prepareSize + Math.round(this.rootHeight / this.elMaxHeight);

		var that = this;
		function intersectionCallback(){
			var entries = that.lastEntries;
			that.lastEntries = void 0;

			var refreshed = false;
			for(var i=entries.length-1; i>=0; i--){
				var entry = entries[i];
				if(entry.intersectionRect.height <= 1)
					continue;

				if(entry.target === that.iTop || entry.target === that.iBottom){
					if(entry.isIntersecting === false || refreshed)
						continue;

					refreshed = true;
					that.recalculateScrollPosition();
				}
				else if(that.observeMap.has(entry.target))
					that.waitObservedElement(entry.target, entry.intersectionRatio);
			}
		}

		this.observer = new IntersectionObserver(function(entries){
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
			this.rObserver = new ResizeObserver(function(entries){
				var elList = that.elList;
				var refresh = elList.length;

				for(var i=0; i<entries.length; i++){
					var el = entries[i].target;
					var newHeight = el.offsetHeight + that.elMargin;

					if(el.sf$heightPos !== newHeight){
						that.totalHeight -= el.sf$heightPos;
						that.totalHeight += newHeight;
						el.sf$heightPos = newHeight;

						var index = elList.indexOf(el);
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
					var before = elList[i-1];
					var el = elList[i];
					if(before === void 0){
						el.sf$scrollPos = 1;
						continue;
					}

					el.sf$scrollPos = before.sf$scrollPos + before.sf$heightPos;
				}

				if(that.lastCursor !== elList.length){
					var el = elList[that.lastCursor];
					that.bottomHeight = that.totalHeight - (el.sf$scrollPos + el.sf$heightPos);

					if(that.bottomHeight < 0)
						that.bottomHeight = 2;
				}
				else that.bottomHeight = 1;

				that.iBottom.style.height = that.bottomHeight+'px';
			});

			this.bottomHeight = 2;
		}
		else this.bottomHeight = this.elMaxHeight * this.elList.length;

		this.iTop.style.height = this.topHeight+'px';
		this.iBottom.style.height = this.bottomHeight+'px';
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
		var startMark = this.iScroller.scrollTop;
		var endMark = startMark + this.iScroller.offsetHeight;

		for(var val of waitMap){
			if(val.sf$scrollPos < startMark || val.sf$scrollPos > endMark)
				continue;

			this.existMap.add(val);
			this.list.visibilityCallback(elList.indexOf(el), true);
		}

		this.waitMap.clear();
		this.waitingMap = false;
	}

	recalculateScrollPosition(){
		if(this.listSize === void 0)
			return; // Haven't been initialized

		var scrollTop = this.iScroller.scrollTop;
		var elList = this.elList;

		for(var i = Math.floor(scrollTop/this.elMaxHeight); i < elList.length; i++){
			var scrollPos = elList[i].sf$scrollPos;
			if(scrollPos === void 0 || scrollPos >= scrollTop)
				break;
		}

		i = i - this.prepareSize;
		if(i < 0) i=0;
		else if(i > elList.length) i = elList.length - this.listSize;

		var until = i + this.listSize + this.prepareSize;
		if(until > elList.length) until = elList.length;

		if(i >= until){
			this.iBottom.style.height = this.bottomHeight+'px';
			return;
		}

		this.firstCursor = i;

		var expect = elList[i] || null;
		var next = this.iTop.nextElementSibling;
		var last;

		while(next !== expect){
			last = next;
			last.sf$removed = true;
			next = last.nextElementSibling;

			if(next !== this.iBottom){
				next = this.iTop;
				break;
			}

			last.remove();
			if(this.dynamicSize)
				this.rObserver.unobserve(last);
		}

		this.topHeight = expect.sf$scrollPos;

		for(; i < until; i++){
			last = elList[i];
			next.insertAdjacentElement('afterEnd', last);

			if(last.sf$removed && this.dynamicSize)
				this.rObserver.observe(last);

			last.sf$removed = false;
			next = last;
		}

		next = next.nextElementSibling;

		while(next !== this.iBottom){
			last = next;
			last.sf$removed = true;
			next = last.nextElementSibling;
			last.remove();

			if(this.dynamicSize)
				this.rObserver.unobserve(last);
		}

		last = elList[until];
		this.lastCursor = until;

		if(i === elList.length)
			this.bottomHeight = 1;
		else
			this.bottomHeight = this.totalHeight - (last.sf$scrollPos + last.sf$heightPos);

		if(this.bottomHeight < 0) this.bottomHeight = 2;

		this.iTop.style.height = this.topHeight+'px';
		this.iBottom.style.height = this.bottomHeight+'px';
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
		var target = this.elList[index];
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
		// console.log(this.elList);
		var elList = this.elList;
		var n = this.listSize;
		if(n > elList.length)
			n = elList.length;

		for (var i = 0; i < n; i++){
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
			el.sf$heightPos = this.elHeight + this.elMargin;

		before = this.elList[before];
		if(before !== void 0)
			el.sf$scrollPos = before.sf$scrollPos + before.sf$heightPos;
		else el.sf$scrollPos = 1;

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
		this.recalculateScrollPosition();
	},

	prepend(index){
		this.recalculateElementData(index);
		this.recalculateScrollPosition();
	},

	move(from, to, count, vDOM){
		this.recalculateScrollPosition();
	},

	swap(index, other){
		this.recalculateScrollPosition();
	},

	remove(index){
		this.totalHeight -= this.elList[index].sf$heightPos;
		this.recalculateElementData(index);
		this.recalculateScrollPosition();
	},

	removeRange(index, other){
		for (var i = index; i < other; i++) {
			this.totalHeight -= this.elList[i].sf$heightPos;
		}

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
		this.recalculateScrollPosition();
	},

	reverse(){
		this.recalculateScrollPosition();
	},

	recalculateElementData(index){
		var elList = this.elList;
		for (var i = index+1; i < elList.length; i++) {
			var before = elList[i-1];
			var now = elList[i];
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

	_proxying(name, args){
		if(this.$EM.constructor === ElementManipulatorProxy){
			var list = this.$EM.list;
			var val;
			for (var i = 0; i < list.length; i++)
				val = VirtualScrollManipulator.prototype[name].apply(list[i].$VSM, args);
			return val;
		}
		else return VirtualScrollManipulator.prototype[name].apply(this.$EM.$VSM, args);
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
	var styleInitialized = false;
	internal.addScrollerStyle = function(){
		if(styleInitialized === false){
			var style = document.getElementById('sf-styles');

			if(!style){
				style = document.createElement('style');
				style.id = 'sf-styles';
				document.head.appendChild(style);
			}

			style.sheet.insertRule(
			'.sf-virtual-list .virtual-spacer{'+
				'visibility: hidden !important;'+
				'position: relative !important;'+
				'transform-origin: 0 0 !important;'+
				'width: 1px !important;'+
				'margin: 0 !important;'+
				'padding: 0 !important;'+
				'background: none !important;'+
				'border: none !important;'+
				'box-shadow: none !important;'+
				'transition: none !important;'+
			 '}', style.sheet.cssRules.length);

			style.sheet.insertRule(
			'.sf-scroll-element {'+
				'backface-visibility: hidden;'+
			'}', style.sheet.cssRules.length);
			styleInitialized = true;
		}
	}

	var isScroller = /auto|scroll|overlay|hidden/;
	internal.findScrollerElement = function(el){
		var doc = el.ownerDocument;
		var win = doc.defaultView;
		if(!win) return null;

		while(el !== null && isScroller.test(win.getComputedStyle(el).overflow) === false){
			el = el.parentNode;
			if(el === doc.body)
				return null;
		};

		return el;
	}
})();