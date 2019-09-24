var loopParser = function(name, template, script, parentNode){
	var method = script.split(' in ');
	var mask = method[0];

	var modelRef = root_(name);
	var items = modelRef[method[1]];
	if(items === void 0)
		items = modelRef[method[1]] = [];

	var isComponent = internal.component[template.tagName] !== void 0 
		? window['$'+capitalizeLetters(template.tagName.toLowerCase().split('-'))]
		: false;

	template.setAttribute('sf-bind-list', method[1]);

	// Get reference for debugging
	processingElement = template;
	template = self.extractPreprocess(template, mask, modelRef);

	if(method.length === 2){
		var tempDOM = document.createElement('div');

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
				return items.replace(val, true);
			}
		});

		bindArray(template, items, mask, name, method[1], parentNode, tempDOM);

		// Output to real DOM if not being used for virtual list
		if(items.$virtual === void 0){
			var children = tempDOM.children;
			for (var i = 0, n = children.length; i < n; i++) {
				parentNode.appendChild(children[0]);
			}

			tempDOM.remove();
			tempDOM = null;
		}
	}
}

var repeatedListBinding = internal.model.repeatedListBinding = function(elements, controller){
	for (var i = 0; i < elements.length; i++) {
		var element = elements[i];
		var parent = element.parentElement;

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

		// Check if the element was already bound to prevent vulnerability
		if(element.outerHTML.indexOf('sf-bind-list') !== -1){
			console.error("Can't parse element that already bound");
			return;
		}

		loopParser(controller, element, script, parent);
		element.remove();
	}
}

// ToDo: Use class instead of this
var bindArray = function(template, list, mask, modelName, propertyName, parentNode, tempDOM){
	var editProperty = ['pop', 'push', 'splice', 'shift', 'unshift', 'swap', 'move', 'replace', 'softRefresh', 'hardRefresh'];
	var refreshTimer = -1;
	var parentChilds = parentNode.children;

	// Update callback
	var modelRef = self.root[modelName];
	var eventVar = 'on$'+propertyName;
	var callback = modelRef[eventVar];

	var processElement = function(index, options, other, count){
		// Find boundary for inserting to virtual DOM
		if(list.$virtual){
			var vStartRange = list.$virtual.DOMCursor;
			var vEndRange = vStartRange + list.$virtual.preparedLength;
		}

		if(options === 'clear'){
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
			return;
		}

		// Avoid multiple refresh by set a timer
		if(list.$virtual){
			var exist = list.$virtual.elements();

			clearTimeout(refreshTimer);
			refreshTimer = setTimeout(function(){
				if(list.$virtual) // Somewhat it's uninitialized
					list.$virtual.reinitScroll();
			}, 100);
		}
		else exist = parentChilds;

		// Hard refresh - Append element
		if(options === 'hardRefresh'){
			// Clear siblings after the index
			for (var i = index; i < exist.length; i++) {
				exist[i].remove();
			}

			if(list.$virtual)
				var vCursor = list.$virtual.vCursor;

			for (var i = index; i < list.length; i++) {
				var temp = templateParser(template, list[i]);
				if(list.$virtual){
					if(vCursor.floor === null && i < vEndRange)
						parentNode.insertBefore(temp, parentNode.lastElementChild);
					else list.$virtual.dom.appendChild(temp);
				}
				else parentNode.appendChild(temp);

				syntheticCache(temp, template, list[i]);
			}

			if(list.$virtual && list.$virtual.refreshVirtualSpacer)
				list.$virtual.refreshVirtualSpacer(list.$virtual.DOMCursor);
			return;
		}

		if(callback === void 0)
			callback = modelRef[eventVar];

		if(options === 'swap' || options === 'move'){
			if(options === 'move'){
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
				return;
			}

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
			return;
		}

		// Clear unused element if current array < last array
		if(options === 'removeRange'){
			for (var i = index; i < other; i++) {
				exist[i].remove();
			}
			return;
		}

		// Remove
		if(options === 'remove'){
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
			return;
		}

		// Update
		else if(options === 'update'){
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

				var temp = templateParser(template, list[i]);
				syntheticCache(temp, template, list[i]);

				if(list.$virtual){
					oldChild.parentNode.replaceChild(temp, oldChild);
					continue;
				}

				parentNode.replaceChild(temp, oldChild);
				if(callback !== void 0 && callback.update)
					callback.update(temp, 'replace');
			}
		}

		var item = list[index];
		if(item === void 0) return;

		var temp = templateParser(template, item);
		syntheticCache(temp, template, item);

		// Create
		if(options === 'insertAfter'){
			if(exist.length === 0)
				parentNode.insertBefore(temp, parentNode.lastElementChild);
			else{
				var referenceNode = exist[index - 1];
				referenceNode.parentNode.insertBefore(temp, referenceNode.nextSibling);
			}

			if(callback !== void 0 && callback.create)
				callback.create(temp);
		}
		else if(options === 'prepend'){
			var referenceNode = exist[0];
			if(referenceNode !== void 0){
				referenceNode.parentNode.insertBefore(temp, referenceNode);

				if(callback !== void 0 && callback.create)
					callback.create(temp);
			}
			else options = 'append';
		}
		if(options === 'append'){
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
	}

	var _double_zero = [0,0]; // For arguments
	var propertyProxy = function(subject, name){
		Object.defineProperty(subject, name, {
			enumerable: false,
			configurable: true,
			value: function(){
				var temp = void 0;
				var lastLength = this.length;

				if(name === 'move'){
					var from = arguments[0];
					var to = arguments[1];
					if(from === to) return;
					var count = arguments[2] || 1;
					processElement(from, 'move', to, count);

					var temp = Array.prototype.splice.apply(this, [from, count]);
					temp.unshift(to, 0);
					Array.prototype.splice.apply(this, temp);

					// Reset virtual ceiling and floor
					if(list.$virtual)
						list.$virtual.reinitCursor();
					return;
				}

				if(name === 'swap'){
					var i = arguments[0];
					var o = arguments[1];
					if(i === o) return;
					processElement(i, 'swap', o);
					var temp = this[i];
					this[i] = this[o];
					this[o] = temp;
					return;
				}

				else if(name === 'replace'){
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
						processElement(0, 'hardRefresh');
						return;
					}

					// Clear all items and merge the new one
					var temp = [0, lastLength];
					Array.prototype.push.apply(temp, arguments[0]);
					Array.prototype.splice.apply(this, temp);

					// Rebuild all element
					if(arguments[1] !== true){
						processElement(0, 'clear');
						processElement(0, 'hardRefresh');
					}

					// Reuse some element
					else{
						// Clear unused element if current array < last array
						if(this.length < lastLength)
							processElement(this.length, 'removeRange', lastLength);

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

				else if(name === 'splice' && arguments[0] === 0 && arguments[1] === void 0){
					processElement(0, 'clear');
					return Array.prototype.splice.apply(this, arguments);
				}

				if(Array.prototype[name])
					temp = Array.prototype[name].apply(this, arguments);

				if(name === 'pop')
					processElement(this.length, 'remove');

				else if(name === 'push'){
					if(arguments.length === 1)
						processElement(lastLength, 'append');
					else{
						for (var i = 0; i < arguments.length; i++) {
							processElement(lastLength + i, 'append');
						}
					}
				}

				else if(name === 'shift'){
					processElement(0, 'remove');

					if(list.$virtual && list.$virtual.DOMCursor > 0){
						list.$virtual.DOMCursor--;
						list.$virtual.reinitCursor();
					}
				}

				else if(name === 'splice'){
					if(arguments[0] === 0 && arguments[1] === void 0)
						return temp;

					// Removing data
					var real = arguments[0];
					if(real < 0) real = lastLength + real;

					var limit = arguments[1];
					if(!limit && limit !== 0) limit = this.length;

					for (var i = limit - 1; i >= 0; i--) {
						processElement(real + i, 'remove');
					}

					if(list.$virtual && list.$virtual.DOMCursor >= real)
						list.$virtual.DOMCursor = real - limit;

					if(arguments.length >= 3){ // Inserting data
						limit = arguments.length - 2;

						// Trim the index if more than length
						if(real >= this.length)
							real = this.length - 1;

						for (var i = 0; i < limit; i++) {
							processElement(real + i, 'insertAfter');
						}

						if(list.$virtual && list.$virtual.DOMCursor >= real)
							list.$virtual.DOMCursor += limit;
					}
				}

				else if(name === 'unshift'){
					if(arguments.length === 1)
						processElement(0, 'prepend');
					else{
						for (var i = arguments.length - 1; i >= 0; i--) {
							processElement(i, 'prepend');
						}
					}

					if(list.$virtual && list.$virtual.DOMCursor !== 0){
						list.$virtual.DOMCursor += arguments.length;
						list.$virtual.reinitCursor();
					}
				}

				else if(name === 'softRefresh'){
					processElement(arguments[0], 'update', arguments[1]);

					if(list.$virtual && list.$virtual.DOMCursor)
						list.$virtual.reinitCursor();
				}

				else if(name === 'hardRefresh'){
					processElement(arguments[0] || 0, 'hardRefresh');

					if(list.$virtual)
						list.$virtual.DOMCursor = arguments[0] || 0;
				}

				return temp;
			}
		});
	}

	if(parentNode && parentNode.classList.contains('sf-virtual-list')){
		delete list.$virtual;
		list.$virtual = {};

		// Transfer virtual DOM
		list.$virtual.dom = tempDOM;
		if(callback !== void 0)
			list.$virtual.callback = callback;
		else list.$virtual.callback_ = {ref:modelRef, var:eventVar};

		parentNode.replaceChild(template.html, parentChilds[1]);
		sf.internal.virtual_scroll.handle(list, parentNode);
		template.html.remove();
	}
	else{
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

	for (var i = 0; i < editProperty.length; i++) {
		propertyProxy(list, editProperty[i]);
	}

	// Todo: Enable auto item binding
	if(false && list.auto !== false){
		// for (var i = 0; i < list.length; i++) {
		// 	list[i]
		// }
	}

	hiddenProperty(list, '$replace', function(index, key, needle, func){
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
	});

	hiddenProperty(list, 'refresh', function(index, length, property){
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
	});

	var virtualChilds = null;
	if(list.$virtual)
		virtualChilds = list.$virtual.dom.children;
	hiddenProperty(list, 'getElement', function(index){
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
	});
}