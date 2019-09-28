var loopParser = function(modelRef, template, script, parentNode){
	var method = script.split(' in ');
	var mask = method[0];

	if(method.length !== 2)
		return console.error("'", script, "' must match the pattern like `item in items`");

	var items = modelRef[method[1]];
	if(items === void 0)
		items = modelRef[method[1]] = [];

	var isComponent = internal.component[template.tagName] !== void 0 
		? window['$'+capitalizeLetters(template.tagName.toLowerCase().split('-'))]
		: false;

	if(!parentNode.classList.contains('sf-virtual-list')){
		var boundary = document.createComment('');
		template.parentNode.insertBefore(boundary, template);
	}

	if(!isComponent){
		template.setAttribute('sf-bind-list', method[1]);

		// Get reference for debugging
		processingElement = template;
		template = self.extractPreprocess(template, mask, modelRef);
	}
	else template = isComponent;

	// Enable element binding
	if(modelRef.sf$bindedKey === void 0)
		initBindingInformation(modelRef);

	if(modelRef.sf$bindedKey[method[1]] === void 0)
		modelRef.sf$bindedKey[method[1]] = null;

	Object.defineProperty(modelRef, method[1], {
		enumerable: true,
		configurable: true,
		get:function(){
			return items;
		},
		set:function(val){
			if(val.length === 0)
				return items.splice(0);
			return items[replace](val, true);
		}
	});

	modelRef[method[1]] = new RepeatedElement(template, items, mask, modelRef, method[1], boundary);
}

var repeatedListBinding = internal.model.repeatedListBinding = function(elements, controller){
	for (var i = 0; i < elements.length; i++) {
		var element = elements[i];

		if(!element.hasAttribute('sf-repeat-this'))
			continue;

		var parent = element.parentElement; // ToDO: fix this for component

		if(parent.classList.contains('sf-virtual-list')){
			var ceiling = document.createElement(element.tagName);
			ceiling.classList.add('virtual-spacer');
			var floor = ceiling.cloneNode(true);

			ceiling.classList.add('ceiling');
			parent.insertBefore(ceiling, parent.firstElementChild); // prepend

			floor.classList.add('floor');
			parent.appendChild(floor); // append
		}

		var after = element.nextElementSibling;
		if(after === null || element === after)
			after = false;

		var before = element.previousElementSibling;
		if(before === null || element === before)
			before = false;

		var script = element.getAttribute('sf-repeat-this');
		element.removeAttribute('sf-repeat-this');

		loopParser(controller, element, script, parent);
		element.remove();
	}
}

var _double_zero = [0,0]; // For arguments
class RepeatedElement extends Array{
	constructor(template, list, mask, modelRef, propertyName, boundary){
		hiddenProperty(this, '$internal', {
			EM:new ElementManipulator(template, this, modelRef, boundary)
		});

		if(boundary.parentNode && boundary.parentNode.classList.contains('sf-virtual-list'))
			hiddenProperty(this, '$virtual', {});

		if(list.length !== 0)
			this[replace](list);

		list = null;

		var self = this.$internal;

		self.refreshTimer = -1;
		self.parentChilds = boundary.children;

		self.isComponent = template.constructor === Function;

		// Update callback
		self.eventVar = 'on$'+propertyName;
		self.callback = modelRef[eventVar];

		if(boundary && boundary.classList.contains('sf-virtual-list')){
			// Transfer virtual DOM
			this.$virtual.dom = tempDOM;
			if(callback !== void 0)
				this.$virtual.callback = callback;
			else this.$virtual.callback_ = {ref:modelRef, var:eventVar};

			boundary.replaceChild(template.html, parentChilds[1]);
			sf.internal.virtual_scroll.handle(this, boundary);
			template.html.remove();
		}

		var tempDOM = document.createElement('div');

		// Output to real DOM if not being used for virtual list
		if(items.$virtual === void 0){
			for (var i = 0; i < items.length; i++) {
				if(isComponent){
					var elem = new isComponent(items[i]);
					elem.setAttribute('sf-bind-list', method[1]);
				}
				else{
					var elem = templateParser(template, items[i]);
					syntheticCache(elem, template, items[i]);
				}

				tempDOM.appendChild(elem);
			}

			var children = tempDOM.children;
			for (var i = 0, n = children.length; i < n; i++) {
				parentNode.appendChild(children[0]);
			}

			tempDOM.remove();
			tempDOM = null;
		}
		else{
			for (var i = 0; i < items.length; i++) {
				if(isComponent){
					var elem = new isComponent(items[i]);
					elem.setAttribute('sf-bind-list', method[1]);
				}
				else{
					var elem = templateParser(template, items[i]);
					syntheticCache(elem, template, items[i]);
				}

				tempDOM.appendChild(elem);
			}
		}

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
		if(false && list.auto !== false){
			// for (var i = 0; i < list.length; i++) {
			// 	list[i]
			// }
		}

		return self;
	}

	pop(){
		this.EM.remove(this.length);
		Array.prototype.pop.apply(this, arguments);
	}

	push(){
		var lastLength = this.length;
		if(arguments.length === 1)
			this.EM.append(lastLength);
		else{
			for (var i = 0; i < arguments.length; i++) {
				this.EM.append(lastLength + i);
			}
		}
		Array.prototype.push.apply(this, arguments);
	}

	splice(){
		if(arguments[0] === 0 && arguments[1] === void 0){
			this.EM.clear(0);
			return Array.prototype.splice.apply(this, arguments);
		}

		var lastLength = this.length;
		Array.prototype.splice.apply(this, arguments);

		if(arguments[0] === 0 && arguments[1] === void 0)
			return temp;

		// Removing data
		var real = arguments[0];
		if(real < 0) real = lastLength + real;

		var limit = arguments[1];
		if(!limit && limit !== 0) limit = this.length;

		for (var i = limit - 1; i >= 0; i--) {
			this.EM.remove(real + i);
		}

		if(list.$virtual && list.$virtual.DOMCursor >= real)
			list.$virtual.DOMCursor = real - limit;

		if(arguments.length >= 3){ // Inserting data
			limit = arguments.length - 2;

			// Trim the index if more than length
			if(real >= this.length)
				real = this.length - 1;

			for (var i = 0; i < limit; i++) {
				this.EM.insertAfter(real + i);
			}

			if(list.$virtual && list.$virtual.DOMCursor >= real)
				list.$virtual.DOMCursor += limit;
		}
	}

	shift(){
		var lastLength = this.length;
		Array.prototype.shift.apply(this, arguments);

		this.EM.remove(0);
		if(list.$virtual && list.$virtual.DOMCursor > 0){
			list.$virtual.DOMCursor--;
			list.$virtual.reinitCursor();
		}
	}

	unshift(){
		var lastLength = this.length;
		Array.prototype.unshift.apply(this, arguments);

		if(arguments.length === 1)
			this.EM.prepend(0);
		else{
			for (var i = arguments.length - 1; i >= 0; i--) {
				this.EM.prepend(i);
			}
		}

		if(list.$virtual && list.$virtual.DOMCursor !== 0){
			list.$virtual.DOMCursor += arguments.length;
			list.$virtual.reinitCursor();
		}
	}

	replace(){
		var lastLength = this.length;

		if(list.$virtual)
			list.$virtual.resetViewport();

		// Check if item has same reference
		if(arguments[0].length >= lastLength && lastLength !== 0){
			var matchLeft = lastLength;
			var ref = arguments[0];

			for (var i = 0; i < lastLength; i++) {
				if(ref[i] === this[i]){
					matchLeft--;
					continue;
				}
				break;
			}

			// Add new element at the end
			if(matchLeft === 0){
				if(ref.length === lastLength) return;

				var temp = arguments[0].slice(lastLength);
				temp.unshift(lastLength, 0);
				this.splice.apply(this, temp);
				return;
			}

			// Add new element at the middle
			else if(matchLeft !== lastLength){
				if(arguments[1] === true){
					var temp = arguments[0].slice(i);
					temp.unshift(i, lastLength - i);
					Array.prototype.splice.apply(this, temp);

					list.refresh(i, lastLength);
				}
				return;
			}
		}

		// Build from zero
		if(lastLength === 0){
			Array.prototype.push.apply(this, arguments[0]);
			this.EM.hardRefresh(0);
			return;
		}

		// Clear all items and merge the new one
		var temp = [0, lastLength];
		Array.prototype.push.apply(temp, arguments[0]);
		Array.prototype.splice.apply(this, temp);

		// Rebuild all element
		if(arguments[1] !== true){
			this.EM.clear(0);
			this.EM.hardRefresh(0);
		}

		// Reuse some element
		else{
			// Clear unused element if current array < last array
			if(this.length < lastLength)
				this.EM.removeRange(this.length, lastLength);

			// And start refreshing
			list.refresh(0, this.length);

			if(list.$virtual && list.$virtual.refreshVirtualSpacer)
				list.$virtual.refreshVirtualSpacer(list.$virtual.DOMCursor);
		}

		// Reset virtual list
		if(list.$virtual)
			list.$virtual.reset();

		return this;
	}

	swap(){
		var i = arguments[0];
		var o = arguments[1];
		if(i === o) return;
		this.EM.swap(i, o);
		var temp = this[i];
		this[i] = this[o];
		this[o] = temp;
	}

	move(){
		var from = arguments[0];
		var to = arguments[1];
		if(from === to) return;
		var count = arguments[2] || 1;
		this.EM.move(from, to, count);

		var temp = Array.prototype.splice.apply(this, [from, count]);
		temp.unshift(to, 0);
		Array.prototype.splice.apply(this, temp);

		// Reset virtual ceiling and floor
		if(list.$virtual)
			list.$virtual.reinitCursor();
	}

	getElement(){

		if(virtualChilds !== null){
			var ret = void 0;
			if(index < list.$virtual.DOMCursor)
				return virtualChilds[index];
			else {
				index -= list.$virtual.DOMCursor;
				var childElement = parentNode.childElementCount - 2;

				if(index < childElement)
					return parentChilds[index + 1];
				else
					return virtualChilds[index - childElement + list.$virtual.DOMCursor];
			}

			return void 0;
		}

		return parentChilds[index];
	}

	refresh(){
		if(index === void 0 || index.constructor === String){
			property = index;
			index = 0;
			length = list.length;
		}
		else if(length === void 0) length = index + 1;
		else if(length.constructor === String){
			property = length;
			length = index + 1;
		}
		else if(length < 0) length = list.length + length;
		else length += index;

		// Trim length
		var overflow = list.length - length;
		if(overflow < 0) length = length + overflow;

		for (var i = index; i < length; i++) {
			var elem = list.getElement(i);

			// Create element if not exist
			if(elem === void 0){
				list.hardRefresh(i);
				break;
			}
			else if(syntheticTemplate(elem, template, property, list[i]) === false)
				continue; // Continue if no update

			if(elem.model !== list[i])
				elem.model = list[i];

			if(callback !== void 0 && callback.update)
				callback.update(elem, 'replace');
		}
	}
}

var virtualChilds = null;
	if(list.$virtual)
		virtualChilds = list.$virtual.dom.children;

	// else if(name === 'softRefresh'){
	// 	this.EM.update(arguments[0], arguments[1]);

	// 	if(list.$virtual && list.$virtual.DOMCursor)
	// 		list.$virtual.reinitCursor();
	// }

	// else if(name === 'hardRefresh'){
	// 	this.EM.hardRefresh(arguments[0] || 0);

	// 	if(list.$virtual)
	// 		list.$virtual.DOMCursor = arguments[0] || 0;
	// }

class ElementManipulator{
	constructor(template, list, modelRef, parentNode){

	}

	createElement(){
		var item = list[index];
		if(item === void 0) return;

		if(isComponent)
			return new template(item);
		else{
			var temp = templateParser(template, item);
			syntheticCache(temp, template, item);
			return temp;
		}
	}

	virtualRefresh(){
		if(list.$virtual){
			clearTimeout(refreshTimer);
			refreshTimer = setTimeout(function(){
				if(list.$virtual) // Somewhat it's uninitialized
					list.$virtual.reinitScroll();
			}, 100);

			var exist = list.$virtual.elements();
		}
		else exist = parentChilds;
	}

	hardRefresh(){
		var exist = self.virtualRefresh();

		// Clear siblings after the index
		for (var i = index; i < exist.length; i++) {
			exist[i].remove();
		}

		if(list.$virtual)
			var vCursor = list.$virtual.vCursor;

		for (var i = index; i < list.length; i++) {
			if(isComponent){
				var temp = new template(list[i]);
			}
			else{
				var temp = templateParser(template, list[i]);
				syntheticCache(temp, template, list[i]);
			}
			
			if(list.$virtual){
				if(vCursor.floor === null && i < vEndRange)
					parentNode.insertBefore(temp, parentNode.lastElementChild);
				else list.$virtual.dom.appendChild(temp);
			}
			else parentNode.appendChild(temp);
		}

		if(list.$virtual && list.$virtual.refreshVirtualSpacer)
			list.$virtual.refreshVirtualSpacer(list.$virtual.DOMCursor);
	}

	move(){
		var exist = self.virtualRefresh();

		var overflow = list.length - index - count;
		if(overflow < 0)
			count += overflow;

		// Move to virtual DOM
		var vDOM = document.createElement('div');
		for (var i = 0; i < count; i++) {
			vDOM.appendChild(exist[index + i]);
		}

		var nextSibling = exist[other] || null;
		var theParent = nextSibling && nextSibling.parentNode;

		if(theParent === false){
			if(list.$virtual && list.length >= vEndRange)
				theParent = list.$virtual.dom;
			else theParent = parentNode;
		}

		// Move to defined index
		for (var i = 0; i < count; i++) {
			theParent.insertBefore(vDOM.firstElementChild, nextSibling);

			if(callback !== void 0 && callback.update)
				callback.update(exist[index + i], 'move');
		}
	}

	swap(){
		var exist = self.virtualRefresh();

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

		if(callback !== void 0 && callback.update){
			callback.update(exist[other], 'swap');
			callback.update(exist[index], 'swap');
		}
	}

	remove(){
		var exist = self.virtualRefresh();

		if(exist[index]){
			var currentEl = exist[index];

			if(callback !== void 0 && callback.remove){
				var currentRemoved = false;
				var startRemove = function(){
					if(currentRemoved) return;
					currentRemoved = true;

					currentEl.remove();
				};

				// Auto remove if return false
				if(!callback.remove(exist[index], startRemove))
					startRemove();
			}

			// Auto remove if no callback
			else currentEl.remove();
		}
	}

	update(){
		var exist = self.virtualRefresh();

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

			if(list.$virtual){
				oldChild.parentNode.replaceChild(temp, oldChild);
				continue;
			}

			parentNode.replaceChild(temp, oldChild);
			if(callback !== void 0 && callback.update)
				callback.update(temp, 'replace');
		}
	}

	removeRange(){
		var exist = self.virtualRefresh();

		for (var i = index; i < other; i++) {
			exist[i].remove();
		}
	}

	clear(){
		if(list.$virtual)
			var spacer = [parentNode.firstElementChild, parentNode.lastElementChild];

		parentNode.textContent = '';

		if(list.$virtual){
			parentNode.appendChild(spacer[0]);
			parentNode.appendChild(spacer[1]);
			list.$virtual.dom.textContent = '';
			spacer[1].style.height = 
			spacer[0].style.height = 0;
			list.$virtual.reset(true);
		}
	}

	insertAfter(){
		var exist = self.virtualRefresh();
		var temp = self.createElement();

		if(exist.length === 0)
			parentNode.insertBefore(temp, parentNode.lastElementChild);
		else{
			var referenceNode = exist[index - 1];
			referenceNode.parentNode.insertBefore(temp, referenceNode.nextSibling);
		}

		if(callback !== void 0 && callback.create)
			callback.create(temp);
	}

	prepend(){
		var exist = self.virtualRefresh();
		var temp = self.createElement();

		var referenceNode = exist[0];
		if(referenceNode !== void 0){
			referenceNode.parentNode.insertBefore(temp, referenceNode);

			if(callback !== void 0 && callback.create)
				callback.create(temp);
		}
		else this.append();
	}

	append(){
		var exist = self.virtualRefresh();
		var temp = self.createElement();

		if(list.$virtual){
			if(index === 0) // Add before virtual scroller
				parentNode.insertBefore(temp, parentNode.lastElementChild);
			else if(index >= vEndRange){ // To virtual DOM
				if(list.$virtual.vCursor.floor === null)
					list.$virtual.vCursor.floor = temp;

				list.$virtual.dom.appendChild(temp);
			}
			else // To real DOM
				exist[index-1].insertAdjacentElement('afterEnd', temp);

			if(callback !== void 0 && callback.create)
				callback.create(temp);
			return;
		}

		parentNode.appendChild(temp);
		if(callback !== void 0 && callback.create)
			callback.create(temp);
	}

	replace(){
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