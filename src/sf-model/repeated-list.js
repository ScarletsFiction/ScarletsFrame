var repeatedListBinding = internal.model.repeatedListBinding = function(elements, modelRef){
	for (var i = 0; i < elements.length; i++) {
		var element = elements[i];

		if(!element.hasAttribute('sf-repeat-this'))
			continue;

		var script = element.getAttribute('sf-repeat-this');
		element.removeAttribute('sf-repeat-this');

		var refName = script.split(' in ');
		if(refName.length !== 2)
			return console.error("'", script, "' must match the pattern like `item in items`");

		if(modelRef[refName[1]] === void 0)
			modelRef[refName[1]] = [];

		// Enable element binding
		if(modelRef.sf$bindedKey === void 0)
			initBindingInformation(modelRef);

		if(modelRef.sf$bindedKey[refName[1]] === void 0)
			modelRef.sf$bindedKey[refName[1]] = null;

		;(function(){
			var RE = new RepeatedElement(modelRef, element, refName, element.parentElement);
			window.asd = RE;
			Object.defineProperty(modelRef, refName[1], {
				enumerable: true,
				configurable: true,
				get:function(){
					return RE;
				},
				set:function(val){
					if(val.length === 0)
						return RE.splice(0);
					return RE.replace(val, true);
				}
			});
		})();
	}
}

var _double_zero = [0,0]; // For arguments
class RepeatedElement extends Array{
	constructor(modelRef, element, refName, parentNode){
		if(modelRef.constructor === Number)
			return Array(modelRef);

		var list = modelRef[refName[1]];

		super(list.length);

		if(list.length !== 0)
			for (var i = 0; i < list.length; i++) {
				this[i] = list[i];
			}

		list = null;

		var alone = (parentNode.children.length <= 1 || parentNode.textContent.trim().length === 0);

		var callback = modelRef['on$'+refName[1]] || {};
		Object.defineProperty(modelRef, 'on$'+refName[1], {
			enumerable: true,
			configurable: true,
			get:function(){
				return callback;
			},
			set:function(val){
				Object.assign(callback, val);
			}
		});

		var isComponent = internal.component[element.tagName] !== void 0 
			? window['$'+capitalizeLetters(element.tagName.toLowerCase().split('-'))]
			: false;

		var template;
		if(!isComponent){
			element.setAttribute('sf-bind-list', refName[1]);

			// Get reference for debugging
			processingElement = element;
			template = self.extractPreprocess(element, refName[0], modelRef);
		}

		hiddenProperty(this, '$EM', new ElementManipulator());
		this.$EM.template = isComponent || template;
		this.$EM.list = this;
		this.$EM.parentNode = parentNode;
		this.$EM.modelRef = modelRef;
		this.$EM.refName = refName;

		// Update callback
		this.$EM.callback = callback;

		var that = this;
		function injectElements(tempDOM, beforeChild){
			for (var i = 0; i < that.length; i++) {
				if(isComponent){
					var elem = new isComponent(that[i]);
					// elem.setAttribute('sf-bind-list', refName[1]);
				}
				else{
					var elem = templateParser(template, that[i]);
					syntheticCache(elem, template, that[i]);
				}

				if(beforeChild === void 0)
					tempDOM.appendChild(elem);
				else{
					that.$EM.elements.push(elem);
					tempDOM.insertBefore(elem, beforeChild);
				}
			}
		}

		if(parentNode.classList.contains('sf-virtual-list')){
			var ceiling = document.createElement(element.tagName);
			ceiling.classList.add('virtual-spacer');
			var floor = ceiling.cloneNode(true);

			ceiling.classList.add('ceiling');
			parentNode.insertBefore(ceiling, parentNode.firstElementChild); // prepend

			floor.classList.add('floor');
			parentNode.appendChild(floor); // append

			hiddenProperty(this, '$virtual', {});

			if(!alone)
				console.warn("Virtual list was initialized when the container has another child that was not sf-repeated element.", parentNode);

			var tempDOM = document.createElement('div');
			injectElements(tempDOM);

			// Transfer virtual DOM
			this.$virtual.dom = tempDOM;
			this.$virtual.callback = callback;

			// Put the html example for obtaining it's size
			parentNode.replaceChild(template.html, parentNode.children[1]);
			internal.virtual_scroll.handle(this, parentNode);
			template.html.remove(); // And remove it
		}
		else if(alone){
			// Output to real DOM if not being used for virtual list
			injectElements(parentNode);
			this.$EM.parentChilds = parentNode.children;
		}
		else{
			this.$EM.bound_end = document.createComment('');
			this.$EM.bound_start = document.createComment('');

			parentNode.insertBefore(this.$EM.bound_start, element);
			parentNode.insertBefore(this.$EM.bound_end, element);

			this.$EM.elements = Array(this.length);

			// Output to real DOM if not being used for virtual list
			injectElements(parentNode, this.$EM.bound_end);
		}

		element.remove();

		// Wait for scroll plugin initialization
		setTimeout(function(){
			var scroller = internal.findScrollerElement(parentNode);
			if(scroller === null) return;

			var computed = getComputedStyle(scroller);
			if(computed.backfaceVisibility === 'hidden' || computed.overflow.indexOf('hidden') !== -1)
				return;

			scroller.classList.add('sf-scroll-element');
			internal.addScrollerStyle();
		}, 1000);

		// Todo: Enable auto item binding
	}

	pop(){
		this.$EM.remove(this.length);
		Array.prototype.pop.apply(this, arguments);
	}

	push(){
		var lastLength = this.length;
		this.length += arguments.length;

		var n = 0;
		for (var i = lastLength; i < this.length; i++) {
			this[i] = arguments[n++];
		}

		if(arguments.length === 1)
			this.$EM.append(lastLength);
		else{
			for (var i = 0; i < arguments.length; i++) {
				this.$EM.append(lastLength + i);
			}
		}
	}

	splice(){
		if(arguments[0] === 0 && arguments[1] === void 0){
			this.$EM.clear(0);
			this.length = 0;
			return;
		}

		var lastLength = this.length;
		Array.prototype.splice.apply(this, arguments);

		// Removing data
		var real = arguments[0];
		if(real < 0) real = lastLength + real;

		var limit = arguments[1];
		if(!limit && limit !== 0) limit = this.length;

		for (var i = limit - 1; i >= 0; i--) {
			this.$EM.remove(real + i);
		}

		if(this.$virtual && this.$virtual.DOMCursor >= real)
			this.$virtual.DOMCursor = real - limit;

		if(arguments.length >= 3){ // Inserting data
			limit = arguments.length - 2;

			// Trim the index if more than length
			if(real >= this.length)
				real = this.length - 1;

			for (var i = 0; i < limit; i++) {
				this.$EM.insertAfter(real + i);
			}

			if(this.$virtual && this.$virtual.DOMCursor >= real)
				this.$virtual.DOMCursor += limit;
		}
	}

	shift(){
		Array.prototype.shift.apply(this, arguments);

		this.$EM.remove(0);
		if(this.$virtual && this.$virtual.DOMCursor > 0){
			this.$virtual.DOMCursor--;
			this.$virtual.reinitCursor();
		}
	}

	unshift(){
		Array.prototype.unshift.apply(this, arguments);

		if(arguments.length === 1)
			this.$EM.prepend(0);
		else{
			for (var i = arguments.length - 1; i >= 0; i--) {
				this.$EM.prepend(i);
			}
		}

		if(this.$virtual && this.$virtual.DOMCursor !== 0){
			this.$virtual.DOMCursor += arguments.length;
			this.$virtual.reinitCursor();
		}
	}

	replace(newList, atMiddle){
		var lastLength = this.length;

		if(this.$virtual)
			this.$virtual.resetViewport();

		// Check if item has same reference
		if(newList.length >= lastLength && lastLength !== 0){
			var matchLeft = lastLength;

			for (var i = 0; i < lastLength; i++) {
				if(newList[i] === this[i]){
					matchLeft--;
					continue;
				}
				break;
			}

			// Add new element at the end
			if(matchLeft === 0){
				if(newList.length === lastLength) return;

				var temp = newList.slice(lastLength);
				temp.unshift(lastLength, 0);
				this.splice.apply(this, temp);
				return;
			}

			// Add new element at the middle
			else if(matchLeft !== lastLength){
				if(atMiddle === true){
					var temp = newList.slice(i);
					temp.unshift(i, lastLength - i);
					Array.prototype.splice.apply(this, temp);

					this.refresh(i, lastLength);
				}
				return;
			}
		}

		// Build from zero
		if(lastLength === 0){
			Array.prototype.push.apply(this, arguments[0]);
			this.$EM.hardRefresh(0);
			return;
		}

		// Clear all items and merge the new one
		var temp = [0, lastLength];
		Array.prototype.push.apply(temp, arguments[0]);
		Array.prototype.splice.apply(this, temp);

		// Rebuild all element
		if(arguments[1] !== true){
			this.$EM.clear(0);
			this.$EM.hardRefresh(0);
		}

		// Reuse some element
		else{
			// Clear unused element if current array < last array
			if(this.length < lastLength)
				this.$EM.removeRange(this.length, lastLength);

			// And start refreshing
			this.refresh(0, this.length);

			if(this.$virtual && this.$virtual.refreshVirtualSpacer)
				this.$virtual.refreshVirtualSpacer(this.$virtual.DOMCursor);
		}

		// Reset virtual this
		if(this.$virtual)
			this.$virtual.reset();

		return this;
	}

	swap(i, o){
		if(i === o) return;
		this.$EM.swap(i, o);
		var temp = this[i];
		this[i] = this[o];
		this[o] = temp;
	}

	move(from, to, count){
		if(from === to) return;

		if(count === void 0)
			count = 1;

		this.$EM.move(from, to, count);

		var temp = Array.prototype.splice.apply(this, [from, count]);
		temp.unshift(to, 0);
		Array.prototype.splice.apply(this, temp);

		// Reset virtual ceiling and floor
		if(this.$virtual)
			this.$virtual.reinitCursor();
	}

	getElement(index){
		if(this.$virtual){
			var virtualChilds = this.$virtual.dom.children;

			if(index >= this.$virtual.DOMCursor) {
				index -= this.$virtual.DOMCursor;
				var childElement = this.$EM.parentNode.childElementCount - 2;

				if(index < childElement)
					return this.$EM.parentNode.children[index + 1];
				else
					return virtualChilds[index - childElement + this.$virtual.DOMCursor];
			}

			return virtualChilds[index];
		}

		if(this.$EM.elements)
			return this.$EM.elements[index];

		return this.$EM.parentChilds[index];
	}

	refresh(index, length, property){
		if(index === void 0 || index.constructor === String){
			property = index;
			index = 0;
			length = this.length;
		}
		else if(length === void 0) length = index + 1;
		else if(length.constructor === String){
			property = length;
			length = index + 1;
		}
		else if(length < 0) length = this.length + length;
		else length += index;

		// Trim length
		var overflow = this.length - length;
		if(overflow < 0) length = length + overflow;

		for (var i = index; i < length; i++) {
			var elem = this.getElement(i);

			// Create element if not exist
			if(elem === void 0){
				this.$EM.hardRefresh(i || 0);

				if(this.$virtual)
					this.$virtual.DOMCursor = i || 0;
				break;
			}
			else if(syntheticTemplate(elem, this.$EM.template, property, this[i]) === false)
				continue; // Continue if no update

			if(elem.model !== this[i])
				elem.model = this[i];

			if(this.$EM.callback.update)
				this.$EM.callback.update(elem, 'replace');
		}
	}

	hardRefresh(i, o){
		this.$EM.update(i, o);

		if(this.$virtual && this.$virtual.DOMCursor)
			this.$virtual.reinitCursor();
	}
}

class ElementManipulator{
	createElement(index){
		var item = this.list[index];
		if(item === void 0) return;

		var template = this.template;

		if(template.constructor === Function)
			return new template(item);
		else{
			var temp = templateParser(template, item);
			syntheticCache(temp, template, item);
			return temp;
		}
	}

	virtualRefresh(){
		var that = this;

		clearTimeout(this.refreshTimer);
		this.refreshTimer = setTimeout(function(){
			if(that.list.$virtual) // Somewhat it's uninitialized
				that.list.$virtual.reinitScroll();
		}, 100);

		return this.list.$virtual.elements();
	}

	// Recreate the item element after the index
	hardRefresh(index){
		var list = this.list;
		var isComponent = this.template.constructor === Function;

		if(list.$virtual){
			var vStartRange = list.$virtual.DOMCursor;
			var vEndRange = vStartRange + list.$virtual.preparedLength;
		}

		var exist = this.parentChilds || this.elements || this.virtualRefresh();

		// Clear siblings after the index
		for (var i = index; i < exist.length; i++) {
			exist[i].remove();
		}

		if(list.$virtual)
			var vCursor = list.$virtual.vCursor;

		for (var i = index; i < list.length; i++) {
			if(isComponent){
				var temp = new this.template(list[i]);
			}
			else{
				var temp = templateParser(this.template, list[i]);
				syntheticCache(temp, this.template, list[i]);
			}
			
			if(this.list.$virtual){
				if(vCursor.floor === null && i < vEndRange)
					this.parentNode.insertBefore(temp, this.parentNode.lastElementChild);
				else list.$virtual.dom.appendChild(temp);
			}
			else this.parentNode.appendChild(temp);
		}

		if(list.$virtual && list.$virtual.refreshVirtualSpacer)
			list.$virtual.refreshVirtualSpacer(list.$virtual.DOMCursor);
	}

	move(from, to, count){
		if(this.list.$virtual){
			var vStartRange = this.list.$virtual.DOMCursor;
			var vEndRange = vStartRange + this.list.$virtual.preparedLength;
		}

		var exist = this.parentChilds || this.elements || this.virtualRefresh();

		var overflow = this.list.length - from - count;
		if(overflow < 0)
			count += overflow;

		// Move to virtual DOM
		var vDOM = document.createElement('div');
		for (var i = 0; i < count; i++) {
			vDOM.appendChild(exist[from + i]);
		}

		var nextSibling = exist[to] || null;
		var theParent = nextSibling && nextSibling.parentNode;

		if(theParent === false){
			if(this.list.$virtual && this.list.length >= vEndRange)
				theParent = this.list.$virtual.dom;
			else theParent = parentNode;
		}

		// Move to defined index
		for (var i = 0; i < count; i++) {
			theParent.insertBefore(vDOM.firstElementChild, nextSibling);

			if(this.callback.update)
				this.callback.update(exist[from + i], 'move');
		}
	}

	swap(index, other){
		var exist = this.parentChilds || this.elements || this.virtualRefresh();

		if(index > other){
			var index_a = exist[other];
			other = exist[index];
			index = index_a;
		} else {
			index = exist[index];
			other = exist[other];
		}

		var other_sibling = other.nextSibling;
		var other_parent = other.parentNode;
		index.parentNode.insertBefore(other, index.nextSibling);
		other_parent.insertBefore(index, other_sibling);

		if(this.callback.update){
			this.callback.update(exist[other], 'swap');
			this.callback.update(exist[index], 'swap');
		}
	}

	remove(index){
		var exist = this.parentChilds || this.elements || this.virtualRefresh();

		if(exist[index]){
			var currentEl = exist[index];

			if(this.callback.remove){
				var currentRemoved = false;
				var startRemove = function(){
					if(currentRemoved) return;
					currentRemoved = true;

					currentEl.remove();
				};

				// Auto remove if return false
				if(!this.callback.remove(currentEl, startRemove))
					startRemove();
			}

			// Auto remove if no callback
			else currentEl.remove();
		}
	}

	update(index, other){
		var exist = this.parentChilds || this.elements || this.virtualRefresh();
		var list = this.list;
		var template = this.template;
		var isComponent = template.constructor === Function;

		if(index === void 0){
			index = 0;
			other = list.length;
		}
		else if(other === void 0) other = index + 1;
		else if(other < 0) other = list.length + other;
		else other += index;

		// Trim length
		var overflow = list.length - other;
		if(overflow < 0) other = other + overflow;

		for (var i = index; i < other; i++) {
			var oldChild = exist[i];
			if(oldChild === void 0 || list[i] === void 0)
				break;

			if(isComponent){
				var temp = new template(list[i]);
			}
			else{
				var temp = templateParser(template, list[i]);
				syntheticCache(temp, template, list[i]);
			}

			if(this.list.$virtual){
				oldChild.parentNode.replaceChild(temp, oldChild);
				continue;
			}

			this.parentNode.replaceChild(temp, oldChild);
			if(this.callback.update)
				this.callback.update(temp, 'replace');
		}
	}

	removeRange(index, other){
		var exist = this.parentChilds || this.elements || this.virtualRefresh();

		for (var i = index; i < other; i++) {
			exist[i].remove();
		}
	}

	clear(){
		var parentNode = this.parentNode;

		if(this.list.$virtual)
			var spacer = [parentNode.firstElementChild, parentNode.lastElementChild];

		parentNode.textContent = '';

		if(this.list.$virtual){
			parentNode.appendChild(spacer[0]);
			parentNode.appendChild(spacer[1]);

			this.list.$virtual.dom.textContent = '';

			spacer[1].style.height = 
			spacer[0].style.height = 0;

			this.list.$virtual.reset(true);
		}
	}

	insertAfter(index){
		var exist = this.parentChilds || this.elements || this.virtualRefresh();
		var temp = this.createElement(index);

		if(exist.length === 0)
			this.parentNode.insertBefore(temp, this.parentNode.lastElementChild);
		else{
			var referenceNode = exist[index - 1];
			referenceNode.parentNode.insertBefore(temp, referenceNode.nextSibling);
		}

		if(this.callback.create)
			this.callback.create(temp);
	}

	prepend(index){
		var exist = this.parentChilds || this.elements || this.virtualRefresh();
		var temp = this.createElement(index);

		var referenceNode = exist[0];
		if(referenceNode !== void 0){
			referenceNode.parentNode.insertBefore(temp, referenceNode);

			if(this.callback.create)
				this.callback.create(temp);
		}
		else this.parentNode.insertBefore(temp, this.parentNode.lastElementChild);
	}

	append(index){
		var list = this.list;

		if(list.$virtual){
			var vStartRange = list.$virtual.DOMCursor;
			var vEndRange = vStartRange + list.$virtual.preparedLength;
		}

		var exist = this.parentChilds || this.elements || this.virtualRefresh();
		var temp = this.createElement(index);

		if(list.$virtual){
			if(index === 0) // Add before virtual scroller
				this.parentNode.insertBefore(temp, this.parentNode.lastElementChild);
			else if(index >= vEndRange){ // To virtual DOM
				if(list.$virtual.vCursor.floor === null)
					list.$virtual.vCursor.floor = temp;

				list.$virtual.dom.appendChild(temp);
			}
			else // To real DOM
				exist[index-1].insertAdjacentElement('afterEnd', temp);

			if(this.callback.create)
				this.callback.create(temp);
			return;
		}

		this.parentNode.appendChild(temp);
		if(this.callback.create)
			this.callback.create(temp);
	}

	// Deprecated?
	replace(index){
		var list = this.list;
		var elRef = list.getElement(index).sf$elementReferences;
		var process = template.modelReference[key];

		if(process === void 0){
			console.error("Can't found binding for '"+key+"'");
			return;
		}

		for (var i = 0; i < elRef.length; i++) {
			if(elRef[i].textContent === void 0 || elRef[i].ref.direct === void 0)
				continue;

			if(process.indexOf(elRef[i].ref.direct) !== -1){
				var ref = elRef[i].textContent;
				var content = $.escapeText(list[index][key]).replace(needle, func);

				// Skip if nothing was changed
				if(list[index][key] === content) continue;
				ref.textContent = ''; // Let this empty for later referencing
				ref.sf$haveChilds = true;
				content = $.parseElement(content, true);

				// Remove old element if exist
				while(ref.previousSibling && ref.previousSibling.sf$childRoot === ref){
					ref.previousSibling.remove();
				}

				var parentNode_ = ref.parentNode;
				for (var i = 0; i < content.length; i++) {
					content[i].sf$childRoot = ref;
					parentNode_.insertBefore(content[i], ref);
				}
			}
		}
	}
}