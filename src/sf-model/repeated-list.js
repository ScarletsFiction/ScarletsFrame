// ToDo: repeated list that using root binding may have memory leak on sf$elementReference (because I haven't check it)
// this may happen when list are removed (splice, pop, shift, hardRefresh)
// and using property from root model (not the list property)

// var warnUnsupport = true;
var repeatedListBinding = internal.model.repeatedListBinding = function(elements, modelRef, namespace, modelKeysRegex){
	for (var i = 0; i < elements.length; i++) {
		var element = elements[i];

		if(!element.hasAttribute('sf-repeat-this'))
			continue;

		var script = element.getAttribute('sf-repeat-this');
		element.removeAttribute('sf-repeat-this');
		element.sf$componentIgnore = true;

		var pattern = script.match(sf.regex.repeatedList);
		if(pattern === null){
			console.error("'", script, "' should match the pattern like `item in items`");
			continue;
		}
		pattern = pattern.slice(1);

		if(pattern[0].indexOf(',') !== -1)
			pattern[0] = pattern[0].split(' ').join('').split(',');

		if(modelRef[pattern[1]] === void 0){
			//var temp = pattern[1].split('.');
			//if(temp.length === 1)
				modelRef[pattern[1]] = [];
			/*else{
				pattern[1] = temp.pop();
				temp.shift();

				if(temp.length !== 0)
					modelRef = deepProperty(modelRef, temp);

				if(warnUnsupport){
					warnUnsupport = false;
					console.warn("Currently nested RepeatedList can't use parent's scope on it's scope");
				}
			}*/
		}

		// Enable element binding
		if(modelRef.sf$bindedKey === void 0)
			initBindingInformation(modelRef);

		var constructor = modelRef[pattern[1]].constructor;
		if(constructor === Array){
			RepeatedList.construct(modelRef, element, pattern, element.parentNode, namespace, modelKeysRegex);
			continue;
		}

		if(constructor === Object){
			RepeatedProperty.construct(modelRef, element, pattern, element.parentNode, namespace, modelKeysRegex);
			continue;
		}

		console.error(pattern[1], modelRef[pattern[1]], "should be an array or object");
	}
}

function prepareRepeated(modelRef, element, pattern, parentNode, namespace, modelKeysRegex){
	var callback = modelRef['on$'+pattern[1]] || {};
	Object.defineProperty(modelRef, 'on$'+pattern[1], {
		enumerable: true,
		configurable: true,
		get:function(){
			return callback;
		},
		set:function(val){
			Object.assign(callback, val);
		}
	});

	var compTemplate = (namespace || sf.component).registered[element.tagName.toLowerCase()];
	if(compTemplate !== void 0 && compTemplate[3] === false && element.childNodes.length !== 0)
		compTemplate[3] = element;

	var isComponent = compTemplate !== void 0 ? compTemplate[1] : false;
	hiddenProperty(this, '$EM', new ElementManipulator());

	var mask = pattern[0].constructor === Array ? pattern[0].pop() : pattern[0];

	var template;
	if(!isComponent){
		element.setAttribute('sf-bind-list', pattern[1]);

		// Get reference for debugging
		processingElement = element;

		var container;
		if(element.namespaceURI === 'http://www.w3.org/2000/svg' && element.tagName !== 'SVG')
			container = 'svg';

		template = self.extractPreprocess(element, mask, modelRef, container, modelKeysRegex, true);
	}

	this.$EM.template = isComponent || template;
	this.$EM.list = this;
	this.$EM.parentNode = parentNode;
	this.$EM.modelRef = modelRef;
	this.$EM.isComponent = !!isComponent;
	this.$EM.namespace = namespace;
	this.$EM.template.mask = mask;
	this.$EM.template.uniqPattern = pattern;
	this.$EM.elementRef = new WeakMap();
	this.$EM.callback = callback; // Update callback

	// check if alone
	if(parentNode.children.length <= 1 || parentNode.textContent.trim().length === 0)
		return true;

	var that = this;
	return function(injectElements){
		var nextSibling = element.nextSibling;
		element.remove();

		that.$EM.bound_end = document.createComment('');
		that.$EM.bound_start = document.createComment('');

		parentNode.insertBefore(that.$EM.bound_start, nextSibling);
		parentNode.insertBefore(that.$EM.bound_end, nextSibling);

		that.$EM.elements = Array(that.length);

		// Output to real DOM if not being used for virtual list
		injectArrayElements(parentNode, that.$EM.bound_end, that, modelRef, parentNode, isComponent, that.$EM.template);
	}
}

class RepeatedProperty{ // extends Object
	static construct(modelRef, element, pattern, parentNode, namespace, modelKeysRegex){
		var that = modelRef[pattern[1]];
		hiddenProperty(that, '_list', Object.keys(that));

		Object.setPrototypeOf(that, RepeatedProperty.prototype);
		Object.defineProperty(modelRef, pattern[1], {
			enumerable: true,
			configurable: true,
			get:function(){
				return that;
			},
			set:function(val){
				var olds = that._list;
				var news = Object.keys(val);

				// Assign if keys order was similar
				for (var a = 0; a < olds.length; a++) {
					if(olds[a] === news[a]){
						that[olds[a]] = val[olds[a]];
						continue;
					}
					break;
				}

				// Return if all new value has been assigned
				if(a === news.length && olds[a] === void 0)
					return;

				for (var i = a; i < olds.length; i++)
					that.$delete(olds[i]);

				for (var i = a; i < news.length; i++)
					that.$add(news[i], val[news[i]]);

				that._list = news;
			}
		});

		var alone = prepareRepeated.apply(that, arguments);
		if(alone === true){
			element.remove();
			injectArrayElements(parentNode, void 0, that, modelRef, parentNode, isComponent, template, namespace);
		}
		else alone();
	}

	add(prop, val){
		if(this[prop] === val)
			return;

		if(this[prop] !== void 0)
			this[prop] = val;
		else{
			this[prop] = val;
			this.$EM.append(prop);
			this._list.push(prop);
		}
	}

	delete(prop){
		var i = this._list.indexOf(prop);
		if(i === -1)
			return;

		Object.defineProperty(this, prop, {value:null});
		this.$EM.remove(i);
		delete this[prop];

		this._list.splice(i, 1);
	}

	getElement(prop){
		if(typeof this[prop] === 'object')
			return this.$EM.elementRef.get(this[prop]);
		return (this.$EM.parentChilds || this.$EM.elements)[this._list.indexOf(prop)];
	}

	refresh(){
		var list = this._list;
		for (var i = 0; i < list.length; i++) {
			var elem = (this.$EM.parentChilds || this.$EM.elements)[i];

			if(this[list[i]] !== elem.model)
				elem.parentNode.replaceChild(this.$EM.createElement(list[i]), elem);
		}
	}
}

function injectArrayElements(tempDOM, beforeChild, that, modelRef, parentNode, isComponent, template, namespace){
	var temp;

	if(that.constructor === RepeatedProperty){
		temp = that;
		that = Object.values(that);
		that.$EM = temp.$EM;
	}

	var len = that.length;
	for (var i = 0; i < len; i++) {
		var elem = that.$EM.elementRef.get(that[i]);

		if(elem === void 0){
			if(isComponent){
				elem = new template(that[i], namespace);
				that[i] = elem.model;
			}
			else{
				elem = templateParser(template, that[i], false, modelRef, parentNode);

				// Check if this is a component container
				if(elem.childElementCount === 1 && elem.children[0].model !== void 0)
					that[i] = elem.model = elem.children[0].model;
			}

			if(typeof that[i] === "object"){
				if(isComponent === false)
					self.bindElement(elem, modelRef, template, that[i]);

				that.$EM.elementRef.set(that[i], elem);
			}
		}
		else if(elem.model.$el === void 0){
			// This is not a component, lets check if all property are equal
			if(compareObject(elem.model, that[i]) === false){
				elem = templateParser(template, that[i], false, modelRef, parentNode);

				if(typeof that[i] === "object"){
					if(isComponent === false)
						self.bindElement(elem, modelRef, template, that[i]);

					that.$EM.elementRef.set(that[i], elem);
				}
			}
		}

		if(beforeChild === void 0)
			tempDOM.appendChild(elem);
		else{
			that.$EM.elements[i] = elem;
			tempDOM.insertBefore(elem, beforeChild);
		}
	}

	if(temp !== void 0){
		var keys = Object.keys(temp);

		for (var i = 0; i < len; i++)
			temp[keys[i]] = that[i];
	}
}

class RepeatedList extends Array{
	static construct(modelRef, element, pattern, parentNode, namespace, modelKeysRegex){
		var that = modelRef[pattern[1]];
		Object.setPrototypeOf(that, RepeatedList.prototype);

		var alone = prepareRepeated.apply(that, arguments);

		var template = that.$EM.template;
		if(parentNode.classList.contains('sf-virtual-list')){
			var ceiling = document.createElement(element.tagName);
			ceiling.classList.add('virtual-spacer');
			var floor = ceiling.cloneNode(true);

			ceiling.classList.add('ceiling');
			parentNode.insertBefore(ceiling, parentNode.firstElementChild); // prepend

			floor.classList.add('floor');
			parentNode.appendChild(floor); // append

			hiddenProperty(that, '$virtual', {});

			if(alone !== true)
				console.warn("Virtual list was initialized when the container has another child that was not sf-repeated element.", parentNode);

			var tempDOM = document.createElement('div');
			injectArrayElements(tempDOM, void 0, that, modelRef, parentNode, that.$EM.isComponent, template, namespace);

			// Transfer virtual DOM
			that.$virtual.dom = tempDOM;
			that.$virtual.callback = that.$EM.callback;

			// Put the html example for obtaining it's size
			parentNode.replaceChild(template.html, parentNode.children[1]);
			internal.virtual_scroll.handle(that, parentNode);
			template.html.remove(); // And remove it
		}
		else if(alone === true){
			// Output to real DOM if not being used for virtual list
			element.remove();
			that.$EM.parentChilds = parentNode.children;
			injectArrayElements(parentNode, void 0, that, modelRef, parentNode, that.$EM.isComponent, template, namespace);
		}
		else alone();

		Object.defineProperty(modelRef, pattern[1], {
			enumerable: true,
			configurable: true,
			get:function(){
				return that;
			},
			set:function(val){
				if(val.length === 0)
					that.splice(0);
				else that.remake(val, true);
			}
		});

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
	}

	pop(){
		this.$EM.remove(this.length - 1);
		return Array.prototype.pop.apply(this, arguments);
	}

	push(){
		var lastLength = this.length;
		this.length += arguments.length;

		for (var i = lastLength, n = 0; i < this.length; i++)
			this[i] = arguments[n++];

		if(arguments.length === 1)
			this.$EM.append(lastLength);

		else{
			for (var i = 0; i < arguments.length; i++)
				this.$EM.append(lastLength + i);
		}

		return this.length;
	}

	splice(){
		if(arguments[0] === 0 && arguments[1] === void 0){
			this.$EM.clear(0);
			return Array.prototype.splice.apply(this, arguments);
		}

		var lastLength = this.length;
		var ret = Array.prototype.splice.apply(this, arguments);

		// Removing data
		var real = arguments[0];
		if(real < 0) real = lastLength + real;

		var limit = arguments[1];
		if(!limit && limit !== 0) limit = this.length;

		for (var i = limit - 1; i >= 0; i--)
			this.$EM.remove(real + i);

		if(this.$virtual && this.$virtual.DOMCursor >= real)
			this.$virtual.DOMCursor = real - limit;

		if(arguments.length >= 3){ // Inserting data
			limit = arguments.length - 2;

			// Trim the index if more than length
			if(real >= this.length)
				real = this.length - 1;

			for (var i = 0; i < limit; i++)
				this.$EM.insertAfter(real + i);

			if(this.$virtual && this.$virtual.DOMCursor >= real)
				this.$virtual.DOMCursor += limit;
		}

		return ret;
	}

	shift(){
		var ret = Array.prototype.shift.apply(this, arguments);

		this.$EM.remove(0);
		if(this.$virtual && this.$virtual.DOMCursor > 0){
			this.$virtual.DOMCursor--;
			this.$virtual.reinitCursor();
		}

		return ret;
	}

	unshift(){
		Array.prototype.unshift.apply(this, arguments);

		if(arguments.length === 1)
			this.$EM.prepend(0);

		else{
			for (var i = arguments.length - 1; i >= 0; i--)
				this.$EM.prepend(i);
		}

		if(this.$virtual && this.$virtual.DOMCursor !== 0){
			this.$virtual.DOMCursor += arguments.length;
			this.$virtual.reinitCursor();
		}

		return this.slice(0, arguments.length);
	}

	constructor(arr){return Array(arr)}
	assign(whichIndex, withArray){
		if(whichIndex.constructor !== Number){
			withArray = whichIndex;
			whichIndex = 0;
		}

		if(withArray.constructor !== Array)
			withArray = [withArray];

		for(var i = 0; i < withArray.length; i++){
			if(i === this.length)
				break;

			if(this[i + whichIndex] !== withArray[i])
				Object.assign(this[i + whichIndex], withArray[i]);
		}

		if(withArray.length === this.length || whichIndex !== 0)
			return withArray;

		var lastLength = this.length;
		if(withArray.length > this.length){
			Array.prototype.push.apply(this, withArray.slice(this.length));
			this.$EM.hardRefresh(lastLength);
			return withArray;
		}

		if(withArray.length < this.length){
			Array.prototype.splice.call(this, withArray.length);
			this.$EM.removeRange(withArray.length, lastLength);
			return withArray;
		}
	}

	remake(newList, atMiddle){
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
			this.$EM.hardRefresh(0, this.length);

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

		var temp = Array.prototype.splice.call(this, from, count);
		temp.unshift(to, 0);
		Array.prototype.splice.apply(this, temp);

		// Reset virtual ceiling and floor
		if(this.$virtual)
			this.$virtual.reinitCursor();
	}

	getElement(index){
		if(index.constructor === Number){
			if(typeof this[index] !== 'object')
				return (this.$EM.parentChilds || this.$EM.elements || this.$EM.virtualRefresh())[index];

			return this.$EM.elementRef.get(this[index]);
		}

		return this.$EM.elementRef.get(index);
	}

	indexOf(item){
		if(item.children !== void 0 && item.children.constructor === HTMLCollection){
			if(item.hasAttribute('sf-bind-list') === false)
				item = item.closest('[sf-bind-list]');

			if(item === null)
				return -1;

			arguments[0] = item.model;
		}

		return Array.prototype.indexOf.apply(this, arguments);
	}

	refresh(index, length, property){
		if(index === void 0 || index.constructor === String){
			index = 0;
			length = this.length;
		}
		else if(length === void 0) length = index + 1;
		else if(length < 0) length = this.length + length;
		else length += index;

		// Trim length
		var overflow = this.length - length;
		if(overflow < 0) length = length + overflow;

		var elems = this.$EM.parentChilds || this.$EM.elements || this.$EM.virtualRefresh();
		for (var i = index; i < length; i++) {
			// Create element if not exist
			if(elems[i] === void 0){
				this.$EM.hardRefresh(i);

				if(this.$virtual){
					// this.$virtual.DOMCursor = i;
					this.$virtual.reinitCursor();
					this.$virtual.refresh();
				}

				return;
			}

			var oldElem = this.$EM.elementRef.get(this[i]);
			if(oldElem === void 0 || elems[i].model !== oldElem.model)
				this.$EM.update(i, 1);
		}

		if(this.$virtual)
			this.$virtual.refresh();
	}
}

class ElementManipulator{
	createElement(index){
		var item = this.list[index];
		if(item === void 0) return;

		var template = this.template;
		var temp = this.elementRef && this.elementRef.get(item);

		if(temp !== void 0){
			if(temp.model.$el === void 0){
				// This is not a component, lets check if all property are equal
				if(compareObject(temp.model, item) === false){
					temp = templateParser(template, item, false, this.modelRef, this.parentNode);

					// Check if this is a component container
					if(temp.childElementCount === 1 && temp.children[0].model !== void 0)
						item = temp.model = temp.children[0].model;

					if(typeof item === "object"){
						if(this.isComponent === false)
							self.bindElement(temp, this.modelRef, template, item);

						if(this.elementRef !== void 0)
							this.elementRef.set(item, temp);
					}
				}
			}

			return temp;
		}

		if(template.constructor === Function){
			temp = new template(item, this.namespace);
			this.list[index] = temp.model;
		}
		else temp = templateParser(template, item, false, this.modelRef, this.parentNode);

		if(typeof item === "object"){
			if(this.isComponent === false)
				self.bindElement(temp, this.modelRef, template, item);

			if(this.elementRef !== void 0)
				this.elementRef.set(item, temp);
		}

		return temp;
	}

	virtualRefresh(){
		clearTimeout(this.refreshTimer);

		var that = this;
		this.refreshTimer = setTimeout(function(){
			if(that.list.$virtual) // Somewhat it's uninitialized
				that.list.$virtual.reinitScroll();
		}, 100);

		return this.list.$virtual.elements();
	}

	// Recreate the item element after the index
	hardRefresh(index){
		var list = this.list;

		if(list.$virtual){
			var vStartRange = list.$virtual.DOMCursor;
			var vEndRange = vStartRange + list.$virtual.preparedLength;
		}

		var exist = this.parentChilds || this.elements || this.virtualRefresh();

		if(index === 0 && list.$virtual === void 0)
			this.parentNode.textContent = '';
		else{
			// Clear siblings after the index
			if(list.$virtual === void 0){
				for (var i = index, n = exist.length; i < n; i++) {
					exist[index].remove();
				}
			}
			else {
				for (var i = index; i < exist.length; i++) {
					exist[i].remove();
				}
			}

			if(this.elements !== void 0)
				exist.length = index;
		}

		if(list.$virtual)
			var vCursor = list.$virtual.vCursor;

		if(this.elements !== void 0)
			exist.length = list.length;

		for (var i = index; i < list.length; i++) {
			var temp = this.elementRef.get(list[i]);
			if(temp === void 0){
				if(this.isComponent){
					temp = new this.template(list[i], this.namespace);
					list[i] = temp.model;
				}
				else{
					temp = templateParser(this.template, list[i], false, this.modelRef, this.parentNode);

					// Check if this is a component container
					if(temp.childElementCount === 1 && temp.children[0].model !== void 0)
						list[i] = temp.model = temp.children[0].model;
				}

				if(typeof list[i] === "object"){
					if(this.isComponent === false)
						self.bindElement(temp, this.modelRef, this.template, list[i]);

					this.elementRef.set(list[i], temp);

					if(this.elements !== void 0)
						exist[i] = temp;
				}
			}
			else if(temp.model.$el === void 0){
				// This is not a component, lets check if all property are equal
				if(compareObject(temp.model, list[i]) === false){
					temp = templateParser(this.template, list[i], false, this.modelRef, this.parentNode);

					if(typeof list[i] === "object"){
						if(this.isComponent === false)
							self.bindElement(temp, this.modelRef, this.template, list[i]);

						this.elementRef.set(list[i], temp);

						if(this.elements !== void 0)
							exist[i] = temp;
					}
				}
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

	update(index, other){
		var exist = this.parentChilds || this.elements || this.virtualRefresh();
		var list = this.list;
		var template = this.template;

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

			var temp = this.elementRef.get(list[i]);
			if(temp === void 0){
				if(this.isComponent){
					temp = new template(list[i], this.namespace);
					list[i] = temp.model;
				}
				else{
					temp = templateParser(template, list[i], false, this.modelRef, this.parentNode);

					// Check if this is a component container
					if(temp.childElementCount === 1 && temp.children[0].model !== void 0)
						list[i] = temp.model = temp.children[0].model;
				}

				if(typeof list[i] === "object"){
					if(this.isComponent === false)
						self.bindElement(temp, this.modelRef, template, list[i]);

					this.elementRef.set(list[i], temp);

					if(this.elements != void 0)
						exist[i] = temp;
				}
			}
			else if(temp.model.$el === void 0){
				// This is not a component, lets check if all property are equal
				if(compareObject(temp.model, list[i]) === false){
					temp = templateParser(template, list[i], false, this.modelRef, this.parentNode);

					if(typeof list[i] === "object"){
						if(this.isComponent === false)
							self.bindElement(temp, this.modelRef, template, list[i]);

						this.elementRef.set(list[i], temp);

						if(this.elements != void 0)
							exist[i] = temp;
					}
				}
			}

			if(this.list.$virtual){
				oldChild.parentNode.replaceChild(temp, oldChild);
				continue;
			}

			this.parentNode.replaceChild(temp, oldChild);

			if(this.elements != void 0)
				exist[i] = temp;

			if(this.callback.update)
				this.callback.update(temp, 'replace');
		}
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

		var vDOM = Array(count);
		for (var i = 0; i < count; i++) {
			vDOM[i] = exist[from + i];
			vDOM[i].remove();
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
			theParent.insertBefore(vDOM[i], nextSibling);

			if(this.callback.update)
				this.callback.update(vDOM[i], 'move');
		}

		if(this.elements !== void 0){
			exist.splice(from, count);
			vDOM.unshift(from, 0);
			exist.splice.apply(exist, vDOM);
		}
	}

	swap(index, other){
		var exist = this.parentChilds || this.elements || this.virtualRefresh();

		var ii=index, oo=other;
		if(index > other){
			var index_a = exist[other];
			other = exist[index];
			index = index_a;
		} else {
			index = exist[index];
			other = exist[other];
		}

		if(this.elements !== void 0){
			var temp = exist[ii];
			exist[ii] = exist[oo];
			exist[oo] = exist[ii];
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

		if(this.elements !== void 0)
			exist.splice(index, 1);
	}

	removeRange(index, other){
		var exist = this.parentChilds || this.elements || this.virtualRefresh();

		for (var i = index; i < other; i++)
			exist[index].remove();

		if(this.elements != void 0)
			exist.splice(index, other-index);
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

		if(this.elements !== void 0)
			this.elements.length = 0;
	}

	insertAfter(index){
		var exist = this.parentChilds || this.elements || this.virtualRefresh();
		var temp = this.createElement(index);

		if(exist.length === 0)
			this.parentNode.insertBefore(temp, this.parentNode.lastElementChild);
		else{
			var referenceNode = exist[index-1];
			referenceNode.parentNode.insertBefore(temp, referenceNode.nextSibling);
		}

		if(this.elements !== void 0)
			exist.splice(index-1, 0, temp);

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

		if(this.elements !== void 0)
			exist.unshift(temp);
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

		if(this.elements !== void 0)
			exist.push(temp);

		if(this.bound_end !== void 0)
			this.parentNode.insertBefore(temp, this.bound_end);
		else
			this.parentNode.appendChild(temp);

		if(this.callback.create)
			this.callback.create(temp);
	}
}