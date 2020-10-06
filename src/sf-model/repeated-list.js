// Info: repeated list that using root binding or using property from root model (not the list property)
// will be slower on array operation because it's managing possible memory leak

// Known bugs: using keys for repeated list won't changed when refreshed
// - we also need to support bind into array key if specified

// var warnUnsupport = true;
const repeatedListBinding = internal.model.repeatedListBinding = function(elements, modelRef, namespace, modelKeysRegex){
	let element, script;

	for (let i = 0; i < elements.length; i++) {
		if(elements[i].getAttribute === void 0){
			element = elements[i].el;
			script = elements[i].rule;
		}
		else{
			element = elements[i];

			// ToDo: find the culprit why we need to check this
			if(!element.hasAttribute('sf-repeat-this'))
				continue;

			script = element.getAttribute('sf-repeat-this');
			element.removeAttribute('sf-repeat-this');
		}

		element.sf$componentIgnore = true;

		let pattern = script.match(sfRegex.repeatedList);
		if(pattern === null){
			console.error("'", script, "' should match the pattern like `key,val in list`");
			continue;
		}
		pattern = pattern.slice(1);

		if(pattern[0].includes(','))
			pattern[0] = pattern[0].split(' ').join('').split(',');

		let target = modelRef[pattern[1]];
		if(target === void 0){
			const isDeep = parsePropertyPath(pattern[1]);
			if(isDeep.length !== 1){
				pattern[1] = isDeep;
				target = deepProperty(modelRef, isDeep);

				// Cache deep
				if(modelRef.sf$internal)
					modelRef.sf$internal[isDeep.slice(0, -1).join('%$')] = true;
			}

			if(target === void 0)
				modelRef[pattern[1]] = target = [];
		}
		else{
			// Enable element binding
			if(modelRef.sf$bindedKey === void 0)
				initBindingInformation(modelRef);

			modelRef.sf$bindedKey[pattern[1]] = true;
		}

		const { constructor } = target;

		if(constructor === Array || constructor === RepeatedList){
			RepeatedList.construct(modelRef, element, pattern, element.parentNode, namespace, modelKeysRegex);
			continue;
		}

		if(constructor === Object || constructor === RepeatedProperty){
			RepeatedProperty.construct(modelRef, element, pattern, element.parentNode, namespace, modelKeysRegex);
			continue;
		}

		console.error(pattern[1], target, "should be an array or object but got", constructor);
	}
}

function prepareRepeated(modelRef, element, pattern, parentNode, namespace, modelKeysRegex){
	let callback, prop = pattern[1], targetDeep;

	if(prop.constructor !== Array)
		targetDeep = modelRef;
	else{
		targetDeep = deepProperty(modelRef, prop.slice(0, -1));
		prop = prop[prop.length - 1];
	}

	callback = targetDeep[`on$${prop}`] || {};

	const compTemplate = (namespace || sf.component).registered[element.tagName.toLowerCase()];
	if(compTemplate !== void 0 && compTemplate[3] === false && element.childNodes.length !== 0)
		compTemplate[3] = element;

	const isComponent = compTemplate !== void 0 ? compTemplate[1] : false;
	const EM = new ElementManipulator();

	if(this.$EM === void 0){
		hiddenProperty(this, '$EM', EM, true);
		Object.defineProperty(targetDeep, `on$${prop}`, {
			configurable: true,
			get(){
				return callback;
			},
			set(val){
				Object.assign(callback, val);
			}
		});
	}
	else if(this.$EM.constructor === ElementManipulatorProxy)
		this.$EM.list.push(EM);
	else{
		const newList = [this.$EM, EM];
		this.$EM = new ElementManipulatorProxy();
		this.$EM.list = newList;
	}

	let mask = pattern[0], uniqPattern;
	if(mask.constructor === Array){
		uniqPattern = mask[0];
		mask = mask.pop();
	}

	EM.asScope = void 0;

	let template;
	if(!isComponent){
		// Get reference for debugging
		processingElement = element;

		let container;
		if(element.namespaceURI === 'http://www.w3.org/2000/svg' && (element.constructor._ref || element.constructor) !== SVGSVGElement)
			container = 'svg';

		template = self.extractPreprocess(element, mask, modelRef, container, modelKeysRegex, true, uniqPattern);
		template.bindList = this;
	}
	else if(element.hasAttribute('sf-as-scope'))
		EM.asScope = true;

	EM.template = isComponent || template;
	EM.list = this;
	EM.parentNode = parentNode;
	EM.modelRef = modelRef;
	EM.isComponent = !!isComponent;
	EM.namespace = namespace;
	EM.template.mask = mask;
	EM.elementRef = new WeakMap();
	EM.callback = callback; // Update callback
	parentNode.$EM = EM;

	if(uniqPattern !== void 0)
		EM.template.uniqPattern = uniqPattern;

	const { nextSibling } = element;
	element.remove();

	// check if alone
	if(parentNode.childNodes.length <= 1 || parentNode.textContent.trim().length === 0)
		return true;

	const that = this;
	return function(){
		EM.bound_end = document.createComment('');
		parentNode.insertBefore(EM.bound_end, nextSibling);

		if(that.length !== void 0)
			EM.elements = new Array(that.length);
		else EM.elements = [];

		// Output to real DOM if not being used for virtual list
		injectArrayElements(EM, parentNode, EM.bound_end, that, modelRef, parentNode);
	}
}

class RepeatedProperty{ // extends Object
	static construct(modelRef, element, pattern, parentNode, namespace, modelKeysRegex){
		let prop = pattern[1];
		const that = prop.constructor === String ? modelRef[prop] : deepProperty(modelRef, prop);

		// Initialize property once
		if(that.constructor !== RepeatedProperty){
			// Hide property that have $
			for(let k in that){
				if(k.includes('$'))
					hiddenProperty(that, k, that[k], true);
			}

			hiddenProperty(that, '_list', Object.keys(that), true);

			let target;
			if(prop.constructor !== Array)
				target = modelRef;
			else{
				target = deepProperty(modelRef, prop.slice(0, -1));
				prop = prop[prop.length-1];
			}

			Object.setPrototypeOf(that, RepeatedProperty.prototype);
			Object.defineProperty(target, prop, {
				enumerable: true,
				configurable: true,
				get(){
					return that;
				},
				set(val){
					const olds = that._list;
					const news = Object.keys(val);

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
						sf.delete(that, olds[i]);

					for (var i = a; i < news.length; i++)
						sf.set(that, news[i], val[news[i]]);

					that._list = news;
				}
			});
		}

		const alone = prepareRepeated.apply(that, arguments);
		const EM = that.$EM.constructor === ElementManipulatorProxy ? that.$EM.list[that.$EM.list.length-1] : that.$EM;

		// Proxy known property
		for(let key in that)
			ProxyProperty(that, key, true);

		if(alone === true){
			// Output to real DOM if not being used for virtual list
			EM.parentChilds = parentNode.children;
			injectArrayElements(EM, parentNode, void 0, that, modelRef, parentNode, namespace);
		}
		else alone();
	}

	$el(selector){
		const { $EM } = this;
		if($EM.constructor === ElementManipulatorProxy)
			return $EM.$el(selector)
		return $(queryElements(($EM.parentChilds || $EM.elements), selector));
	}

	getElement(prop){
		if(prop === void 0 || prop === null)
			return; // undefined

		let { $EM } = this;
		if($EM.constructor === ElementManipulatorProxy)
			$EM = $EM.list[0];

		// If single RepeatedElement instance
		if(typeof this[prop] === 'object')
			return $EM.elementRef.get(this[prop]);
		return ($EM.parentChilds || $EM.elements)[this._list.indexOf(prop)];
	}

	// Return array
	getElements(index){
		if(this.$EM.constructor === ElementManipulatorProxy)
			return this.$EM.getElement_RP(this, index);

		return [this.getElement(index)];
	}

	refresh(){
		if(this.$EM.constructor === ElementManipulatorProxy)
			return this.$EM.refresh_RP(this);

		const elemList = (this.$EM.parentChilds || this.$EM.elements);
		if(elemList === void 0)
			return;

		// If single RepeatedElement instance
		const list = this._list;
		for (let i = 0; i < list.length; i++) {
			const elem = elemList[i];

			if(this[list[i]] !== elem.model){
				const newElem = this.$EM.createElement(list[i]);
				this.$EM.parentNode.replaceChild(newElem, elem);

				if(this.$EM.elements !== void 0)
					elemList[i] = newElem;
			}
		}
	}
}

// Only for Object or RepeatedProperty
sf.set = function(obj, prop, val){
	if(obj[prop] === val)
		return;

	if(obj.$EM === void 0){
		obj[prop] = val;
		return;
	}

	if(obj[prop] === void 0){
		obj[prop] = val;
		ProxyProperty(obj, prop, false);

		obj.$EM.append(prop);
		obj._list.push(prop);
	}
}

sf.delete = function(obj, prop){
	if(obj.$EM === void 0){
		delete obj[prop];
		return;
	}

	const i = obj._list.indexOf(prop);
	if(i === -1)
		return;

	obj.$EM.remove(i);
	delete obj[prop];

	obj._list.splice(i, 1);
}

function ProxyProperty(obj, prop, force){
	if(force || Object.getOwnPropertyDescriptor(obj, prop).set === void 0){
		let temp = obj[prop];

		Object.defineProperty(obj, prop, {
			configurable:true,
			enumerable:true,
			get(){return temp},
			set(val){
				temp = val;
				obj.refresh(prop);
			}
		});
	}
}

// This is called only once when RepeatedProperty/RepeatedList is initializing
// So we don't need to use cache
function injectArrayElements(EM, tempDOM, beforeChild, that, modelRef, parentNode, namespace){
	let temp,
		{ isComponent,
		template } = EM;

	if(that.constructor === RepeatedProperty){
		temp = that;
		that = Object.values(that);
	}

	const len = that.length;
	let elem;
	for (var i = 0; i < len; i++) {
		if(isComponent)
			elem = new template(that[i], namespace, EM.asScope);
		else{
			if(temp === void 0)
				elem = templateParser(template, that[i], false, modelRef, parentNode, void 0, template.uniqPattern && i);
			else
				elem = templateParser(template, that[i], false, modelRef, parentNode, void 0, template.uniqPattern && temp._list[i]);
		}

		if(typeof that[i] === "object"){
			if(isComponent === false)
				self.bindElement(elem, modelRef, template, that[i]);

			EM.elementRef.set(that[i], elem);
		}

		if(beforeChild === void 0)
			tempDOM.appendChild(elem);
		else if(beforeChild === true) // Virtual Scroll
			EM.elements[i] = elem;
		else{
			EM.elements[i] = elem;
			tempDOM.insertBefore(elem, beforeChild);
		}
	}

	if(temp !== void 0){
		var i = 0;
		for(let keys in temp)
			temp[keys] = that[i++];
	}
}

class RepeatedList extends Array{
	static construct(modelRef, element, pattern, parentNode, namespace, modelKeysRegex){
		let prop = pattern[1];
		const that = prop.constructor === String ? modelRef[prop] : deepProperty(modelRef, prop);

		// Initialize property once
		if(that.constructor !== RepeatedList){
			let target;
			if(prop.constructor !== Array)
				target = modelRef;
			else{
				target = deepProperty(modelRef, prop.slice(0, -1));
				prop = prop[prop.length-1];
			}

			Object.setPrototypeOf(that, RepeatedList.prototype);
			Object.defineProperty(target, prop, {
				enumerable: true,
				configurable: true,
				get(){
					return that;
				},
				set(val){
					if(val.length === 0)
						that.splice(0);
					else that.remake(val, true);
				}
			});
		}

		const alone = prepareRepeated.apply(that, arguments);
		const EM = that.$EM.constructor === ElementManipulatorProxy ? that.$EM.list[that.$EM.list.length-1] : that.$EM;
		const { template } = EM;

		if(parentNode.classList.contains('sf-virtual-list')){
			hiddenProperty(that, '$virtual', new VirtualScroll(EM));

			if(alone !== true)
				console.warn("Virtual list was initialized when the container has another child that was not sf-repeated element.", parentNode);

			EM.elements = new Array(that.length);
			parentNode.$VSM = EM.$VSM = new VirtualScrollManipulator(parentNode, EM, template.html);

			// Put DOM element to the EM.elements only, and inject to the real DOM when ready
			injectArrayElements(EM, parentNode, true, that, modelRef, parentNode, namespace);
			EM.$VSM.startInjection();
		}
		else if(alone === true){
			// Output to real DOM if not being used for virtual list
			EM.parentChilds = parentNode.children;
			injectArrayElements(EM, parentNode, void 0, that, modelRef, parentNode, namespace);
		}
		else alone();

		// Wait for scroll plugin initialization
		setTimeout(function(){
			const scroller = internal.findScrollerElement(parentNode);
			if(scroller === null) return;

			internal.addScrollerStyle();

			const computed = getComputedStyle(scroller);
			if(computed.backfaceVisibility === 'hidden' || computed.overflow.includes('hidden'))
				return;

			scroller.classList.add('sf-scroll-element');
		}, 1000);
	}

	$el(selector){
		const { $EM } = this;
		if($EM.constructor === ElementManipulatorProxy)
			return $EM.$el(selector)
		return $(queryElements(($EM.parentChilds || $EM.elements), selector));
	}

	pop(){
		this.$EM.remove(this.length - 1);
		return Array.prototype.pop.apply(this, arguments);
	}

	push(){
		const lastLength = this.length;
		Array.prototype.push.apply(this, arguments);

		if(arguments.length === 1)
			this.$EM.append(lastLength);
		else this.$EM.hardRefresh(lastLength);

		return this.length;
	}

	splice(){
		if(arguments[0] === 0 && arguments[1] === void 0){
			this.$EM.clear(0);
			return Array.prototype.splice.apply(this, arguments);
		}

		const lastLength = this.length;
		const ret = Array.prototype.splice.apply(this, arguments);

		// Removing data
		let real = arguments[0];
		if(real < 0) real = lastLength + real;

		let limit = arguments[1];
		if(!limit && limit !== 0) limit = this.length;

		for (var i = limit - 1; i >= 0; i--)
			this.$EM.remove(real + i);

		if(arguments.length >= 3){ // Inserting data
			limit = arguments.length - 2;

			// Trim the index if more than length
			if(real >= this.length)
				real = this.length - 1;

			for (var i = 0; i < limit; i++)
				this.$EM.insertAfter(real + i);
		}

		return ret;
	}

	shift(){
		const ret = Array.prototype.shift.apply(this, arguments);

		this.$EM.remove(0);
		return ret;
	}

	unshift(){
		Array.prototype.unshift.apply(this, arguments);

		if(arguments.length === 1)
			this.$EM.prepend(0);

		else{
			for (let i = arguments.length - 1; i >= 0; i--)
				this.$EM.prepend(i);
		}

		return this.slice(0, arguments.length);
	}

	constructor(arr){return new Array(arr)}
	assign(fromIndex, withArray, removes, putLast){
		if(fromIndex.constructor !== Number){
			if(removes === void 0 || removes.constructor === Boolean)
				putLast = removes; // true=last index, false=first, undefined=depends

			if(withArray !== void 0 && withArray.constructor === Object)
				removes = withArray;

			withArray = fromIndex;
			fromIndex = 0;
		}

		if(withArray.constructor !== Array)
			withArray = [withArray];

		if(removes !== void 0){
			if(removes.constructor === Object){
				const temp = {};

				for(let key in removes){
					if(key.slice(-1) === ']'){
						const k = key.split('[');
						switch(k[1]){
							case "!]":
							if(temp.b === void 0) temp.b = [];
							temp.b.push({key:key[0], val:removes[key]});
							break;
							case "<]":
							if(temp.c === void 0) temp.c = [];
							temp.c.push({key:key[0], val:removes[key]});
							break;
							case "<=]":
							if(temp.d === void 0) temp.d = [];
							temp.d.push({key:key[0], val:removes[key]});
							break;
							case ">]":
							if(temp.e === void 0) temp.e = [];
							temp.e.push({key:key[0], val:removes[key]});
							break;
							case ">=]":
							if(temp.f === void 0) temp.f = [];
							temp.f.push({key:key[0], val:removes[key]});
							break;
							default:
							if(temp.a === void 0) temp.a = [];
							temp.a.push({key:key[0], val:removes[key]});
							break;
						}
					}
					else{
						if(temp.a === void 0) temp.a = [];
						temp.a.push({key:key[0], val:removes[key]});
					}
				}

				removes = temp;
			}

			let processed;
			if(putLast === true)
				processed = new WeakSet();

			that:for(var i = fromIndex; i < this.length; i++){
				if(putLast === true && processed.has(this[i]))
					break;

				if(removes.constructor === Object){
					const temp1 = this[i];
					if(removes.a !== void 0){ // ===
						for(var z=0, n=removes.a.length; z < n; z++){
							var temp2 = removes.a[z];
							if(temp1[temp2.key] !== temp2.val)
								continue that;
						}
					}
					if(removes.b !== void 0){ // !==
						for(var z=0, n=removes.b.length; z < n; z++){
							var temp2 = removes.b[z];
							if(temp1[temp2.key] === temp2.val)
								continue that;
						}
					}
					if(removes.c !== void 0){ // <
						for(var z=0, n=removes.c.length; z < n; z++){
							var temp2 = removes.c[z];
							if(temp1[temp2.key] >= temp2.val)
								continue that;
						}
					}
					if(removes.d !== void 0){ // <=
						for(var z=0, n=removes.d.length; z < n; z++){
							var temp2 = removes.d[z];
							if(temp1[temp2.key] > temp2.val)
								continue that;
						}
					}
					if(removes.e !== void 0){ // >
						for(var z=0, n=removes.e.length; z < n; z++){
							var temp2 = removes.e[z];
							if(temp1[temp2.key] <= temp2.val)
								continue that;
						}
					}
					if(removes.f !== void 0){ // >=
						for(var z=0, n=removes.f.length; z < n; z++){
							var temp2 = removes.f[z];
							if(temp1[temp2.key] < temp2.val)
								continue that;
						}
					}
				}
				else if(!removes(this[i]))
					continue;

				if(withArray.length === 0){
					this.splice(i--, 1);
					continue;
				}

				const current = withArray.shift();
				if(this[i] !== current)
					Object.assign(this[i], current);

				if(putLast === true){
					processed.add(this[i]);
					this.push(this.splice(i--, 1)[0]);
				}
				else if(putLast === false)
					this.unshift(this.splice(i, 1)[0]);
			}

			if(withArray.length !== 0){
				if(putLast === false)
					this.unshift.apply(this, withArray);
				else
					this.push.apply(this, withArray);
			}

			return this;
		}
		else{
			for(var i = 0; i < withArray.length; i++){
				if(i === this.length)
					break;

				if(this[i + fromIndex] !== withArray[i])
					Object.assign(this[i + fromIndex], withArray[i]);
			}
		}

		if(withArray.length === this.length || fromIndex !== 0)
			return this;

		const lastLength = this.length;
		if(withArray.length > this.length){
			Array.prototype.push.apply(this, withArray.slice(this.length));
			this.$EM.hardRefresh(lastLength);
			return this;
		}

		if(withArray.length < this.length){
			Array.prototype.splice.call(this, withArray.length);
			this.$EM.removeRange(withArray.length, lastLength);
			return this;
		}
	}

	remake(newList, atMiddle){
		const lastLength = this.length;

		// Check if item has same reference
		if(newList.length >= lastLength && lastLength !== 0){
			let matchLeft = lastLength;

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
		}

		return this;
	}

	swap(i, o){
		if(i === o) return;
		this.$EM.swap(i, o);
		const temp = this[i];
		this[i] = this[o];
		this[o] = temp;
	}

	move(from, to, count){
		if(from === to) return;

		if(count === void 0)
			count = 1;

		this.$EM.move(from, to, count);

		const temp = Array.prototype.splice.call(this, from, count);
		temp.unshift(to, 0);
		Array.prototype.splice.apply(this, temp);
	}

	// Return single element from first $EM
	getElement(index){
		if(index === void 0 || index === null)
			return; // undefined

		let { $EM } = this;
		if($EM.constructor === ElementManipulatorProxy)
			$EM = $EM.list[0];

		// If single RepeatedElement instance
		if(index.constructor === Number){
			if(typeof this[index] !== 'object')
				return ($EM.parentChilds || $EM.elements)[index];

			return $EM.elementRef.get(this[index]);
		}

		return $EM.elementRef.get(index);
	}

	// Return array
	getElements(index){
		if(this.$EM.constructor === ElementManipulatorProxy)
			return this.$EM.getElement_RL(this, index);

		return [this.getElement(index)];
	}

	indexOf(item){
		if(item !== void 0 && item !== null && item.children !== void 0 && item.children.constructor === HTMLCollection){
			if(!item.sf$elementReferences || !item.sf$elementReferences.template.bindList)
				item = findBindListElement(item);

			if(item === null)
				return -1;

			arguments[0] = item.model;
		}

		return Array.prototype.indexOf.apply(this, arguments);
	}

	reverse(){
		this.$EM.reverse();
		Array.prototype.reverse.call(this);
	}

	refresh(index, length){
		if(index === void 0 || index.constructor === String){
			index = 0;
			({ length } = this);
		}
		else if(length === void 0) length = index + 1;
		else if(length < 0) length = this.length + length;
		else length += index;

		// Trim length
		const overflow = this.length - length;
		if(overflow < 0) length = length + overflow;

		if(this.$EM.constructor === ElementManipulatorProxy)
			var elems = this.$EM.list[0].parentChilds || this.$EM.list[0].elements;
		else
			var elems = this.$EM.parentChilds || this.$EM.elements;

		for (let i = index; i < length; i++) {
			// Create element if not exist
			if(elems[i] === void 0){
				this.$EM.hardRefresh(i);
				return;
			}

			if(this.$EM.constructor === ElementManipulatorProxy)
				var oldElem = this.$EM.list[0].elementRef.get(this[i]);
			else
				var oldElem = this.$EM.elementRef.get(this[i]);

			if(oldElem === void 0 || elems[i].model !== oldElem.model)
				this.$EM.update(i, 1);
		}
	}
}

class ElementManipulator{
	createElement(index){
		const item = this.list[index];
		if(item === void 0) return;

		const { template } = this;
		let temp = this.elementRef && this.elementRef.get(item);

		if(temp !== void 0){
			if(temp.model.$el === void 0){
				// This is not a component, lets check if all property are equal
				if(compareObject(temp.model, item) === false){
					temp = templateParser(template, item, false, this.modelRef, this.parentNode, void 0, template.uniqPattern && index);

					if(typeof item === "object"){
						if(this.isComponent === false)
							self.bindElement(temp, this.modelRef, template, item);

						if(this.elementRef !== void 0)
							this.elementRef.set(item, temp);
					}
				}
				else if(temp.sf$bindedBackup !== void 0){
					RE_restoreBindedList(this.modelRef, temp.sf$bindedBackup);
					temp.sf$bindedBackup = void 0;
				}
			}

			if(this.$VSM) this.$VSM.newElementInit(temp, index-1);
			return temp;
		}

		if(template.constructor === Function)
			temp = new template(item, this.namespace, this.asScope);
		else temp = templateParser(template, item, false, this.modelRef, this.parentNode, void 0, template.uniqPattern && index);

		if(typeof item === "object"){
			if(this.isComponent === false)
				self.bindElement(temp, this.modelRef, template, item);

			if(this.elementRef !== void 0)
				this.elementRef.set(item, temp);
		}

		if(this.$VSM) this.$VSM.newElementInit(temp, index-1);
		return temp;
	}

	// Recreate the item element after the index
	hardRefresh(index){
		const { list } = this;
		const exist = this.parentChilds || this.elements;

		if(this.template.modelRefRoot_path && this.template.modelRefRoot_path.length !== 0)
			this.clearBinding(exist, index);

		if(index === 0 && this.$VSM === void 0 && this.bound_end === void 0)
			this.parentNode.textContent = '';
		else{
			// Clear siblings after the index
			if(this.parentChilds){
				for (var i = index, n = exist.length; i < n; i++) {
					exist[index].remove();
				}
			}
			else for (var i = index; i < exist.length; i++) {
				exist[i].remove();
			}

			if(this.elements !== void 0)
				exist.length = index;
		}

		if(this.elements !== void 0)
			exist.length = list.length;

		for (var i = index; i < list.length; i++) {
			const ref = list[i];
			let temp = this.elementRef.get(ref);

			if(temp === void 0){
				if(this.isComponent)
					temp = new this.template(ref, this.namespace, this.asScope);
				else
					temp = templateParser(this.template, ref, false, this.modelRef, this.parentNode, void 0, this.template.uniqPattern && i);

				if(typeof ref === "object"){
					if(this.isComponent === false)
						self.bindElement(temp, this.modelRef, this.template, ref);

					this.elementRef.set(ref, temp);

					if(this.elements !== void 0)
						exist[i] = temp;
				}
			}
			else if(temp.model.$el === void 0){
				// This is not a component, lets check if all property are equal
				if(compareObject(temp.model, ref) === false){
					temp = templateParser(this.template, ref, false, this.modelRef, this.parentNode, void 0, this.template.uniqPattern && i);

					if(typeof ref === "object"){
						if(this.isComponent === false)
							self.bindElement(temp, this.modelRef, this.template, ref);

						this.elementRef.set(ref, temp);

						if(this.elements !== void 0)
							exist[i] = temp;
					}
				}
				else if(temp.sf$bindedBackup !== void 0){
					RE_restoreBindedList(this.modelRef, temp.sf$bindedBackup);
					temp.sf$bindedBackup = void 0;
				}
			}

			if(this.$VSM === void 0)
				this.parentNode.appendChild(temp);
			else{
				exist[i] = temp;
				this.$VSM.newElementInit(temp, i-1);
			}
		}

		if(this.$VSM) this.$VSM.hardRefresh(index);
	}

	update(index, other){
		const exist = this.parentChilds || this.elements;
		const { list } = this;
		const { template } = this;

		if(index === void 0){
			index = 0;
			other = list.length;
		}
		else if(other === void 0) other = index + 1;
		else if(other < 0) other = list.length + other;
		else other += index;

		// Trim length
		const overflow = list.length - other;
		if(overflow < 0) other = other + overflow;

		if(this.template.modelRefRoot_path && this.template.modelRefRoot_path.length !== 0)
			this.clearBinding(exist, index, other);

		for (let i = index; i < other; i++) {
			const oldChild = exist[i];
			if(oldChild === void 0 || list[i] === void 0)
				break;

			const ref = list[i];
			let temp = this.elementRef.get(ref);

			if(temp === void 0){
				if(this.isComponent)
					temp = new template(ref, this.namespace, this.asScope);
				else
					temp = templateParser(template, ref, false, this.modelRef, this.parentNode, void 0, template.uniqPattern && i);

				if(typeof ref === "object"){
					if(this.isComponent === false)
						self.bindElement(temp, this.modelRef, template, ref);

					this.elementRef.set(ref, temp);

					if(this.elements != void 0)
						exist[i] = temp;
				}
			}
			else if(temp.model.$el === void 0){
				// This is not a component, lets check if all property are equal
				if(compareObject(temp.model, ref) === false){
					temp = templateParser(template, ref, false, this.modelRef, this.parentNode, void 0, template.uniqPattern && i);

					if(typeof ref === "object"){
						if(this.isComponent === false)
							self.bindElement(temp, this.modelRef, template, ref);

						this.elementRef.set(ref, temp);

						if(this.elements != void 0)
							exist[i] = temp;
					}
				}
				else if(temp.sf$bindedBackup !== void 0){
					RE_restoreBindedList(this.modelRef, temp.sf$bindedBackup);
					temp.sf$bindedBackup = void 0;
				}
			}

			if(this.$VSM){
				this.$VSM.newElementInit(temp, i-1);
				this.$VSM.update(i, temp);
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
		const exist = this.parentChilds || this.elements;

		const overflow = this.list.length - from - count;
		if(overflow < 0)
			count += overflow;

		const vDOM = new Array(count);
		for (var i = 0; i < count; i++)
			(vDOM[i] = exist[from + i]).remove();

		if(this.$VSM === void 0){
			const nextSibling = exist[to] || null;

			// Move to defined index
			for (var i = 0; i < count; i++) {
				this.parentNode.insertBefore(vDOM[i], nextSibling);

				if(this.callback.update)
					this.callback.update(vDOM[i], 'move');
			}
		}
		else this.$VSM.move(from, to, count, vDOM);

		if(this.elements !== void 0){
			exist.splice(from, count);
			vDOM.unshift(from, 0);
			exist.splice.apply(exist, vDOM);
		}
	}

	swap(index, other){
		const exist = this.parentChilds || this.elements;

		const ii=index, oo=other;
		if(index > other){
			const index_a = exist[other];
			other = exist[index];
			index = index_a;
		} else {
			index = exist[index];
			other = exist[other];
		}

		if(this.elements !== void 0){
			const temp = exist[ii];
			exist[ii] = exist[oo];
			exist[oo] = exist[ii];
		}

		if(this.$VSM === void 0){
			const other_sibling = other.nextSibling;
			const other_parent = other.parentNode;
			index.parentNode.insertBefore(other, index.nextSibling);
			other_parent.insertBefore(index, other_sibling);
		}
		else this.$VSM.swap(ii, oo);

		if(this.callback.update){
			this.callback.update(exist[other], 'swap');
			this.callback.update(exist[index], 'swap');
		}
	}

	remove(index){
		const exist = this.parentChilds || this.elements;

		if(this.template.modelRefRoot_path && this.template.modelRefRoot_path.length !== 0)
			this.clearBinding(exist, index, index+1);

		if(exist[index]){
			const currentEl = exist[index];

			if(this.callback.remove){
				let currentRemoved = false;
				const startRemove = function(){
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

			if(this.$VSM) this.$VSM.remove(index);

			if(this.elements !== void 0)
				exist.splice(index, 1);
		}
	}

	removeRange(index, other){
		const exist = this.parentChilds || this.elements;

		for (let i = index; i < other; i++)
			exist[index].remove();

		if(this.template.modelRefRoot_path && this.template.modelRefRoot_path.length !== 0)
			this.clearBinding(exist, index, other);

		if(this.$VSM)
			this.$VSM.removeRange(index, other);
		else if(this.elements !== void 0)
			exist.splice(index, other-index);
	}

	clear(){
		if(this.template.modelRefRoot_path && this.template.modelRefRoot_path.length !== 0)
			this.clearBinding(this.parentChilds || this.elements, 0);

		this.parentNode.textContent = '';

		if(this.$VSM !== void 0)
			this.$VSM.clear();

		if(this.elements !== void 0)
			this.elements.length = 0;
	}

	insertAfter(index){
		const exist = this.parentChilds || this.elements;
		const temp = this.createElement(index);

		if(this.$VSM === void 0){
			if(exist.length === 0)
				this.parentNode.insertBefore(temp, this.parentNode.lastElementChild);
			else{
				const referenceNode = exist[index-1];
				referenceNode.parentNode.insertBefore(temp, referenceNode.nextSibling);
			}
		}

		if(this.elements !== void 0)
			exist.splice(index-1, 0, temp);

		if(this.$VSM) this.$VSM.insertAfter(index);

		if(this.callback.create)
			this.callback.create(temp);
	}

	prepend(index){
		const exist = this.parentChilds || this.elements;
		const temp = this.createElement(index);

		if(this.$VSM === void 0){
			const referenceNode = exist[0];
			if(referenceNode !== void 0){
				referenceNode.parentNode.insertBefore(temp, referenceNode);

				if(this.callback.create)
					this.callback.create(temp);
			}
			else this.parentNode.insertBefore(temp, this.parentNode.lastElementChild);
		}

		if(this.elements !== void 0)
			exist.unshift(temp);

		if(this.$VSM) this.$VSM.prepend(index);
	}

	append(index){
		const exist = this.parentChilds || this.elements;
		const temp = this.createElement(index);

		if(this.elements !== void 0)
			exist.push(temp);

		if(this.$VSM === void 0){
			if(this.bound_end !== void 0)
				this.parentNode.insertBefore(temp, this.bound_end);
			else
				this.parentNode.appendChild(temp);
		}
		else this.$VSM.append(index);

		if(this.callback.create)
			this.callback.create(temp);
	}

	reverse(){
		if(this.parentChilds !== void 0){
			const len = this.parentChilds.length;
			if(len === 0)
				return;

			const beforeChild = this.parentChilds[0];
			for (var i = 1; i < len; i++) {
				this.parentNode.insertBefore(this.parentNode.lastElementChild, beforeChild);
			}
		}
		else{
			const elems = this.elements;
			elems.reverse();

			if(this.$VSM)
				return this.$VSM.reverse();

			if(this.bound_end === void 0)
				for (var i = 0; i < elems.length; i++)
					this.parentNode.appendChild(elems[i]);
			else
				for (var i = 0; i < elems.length; i++)
					this.parentNode.insertBefore(elems[i], this.bound_end);
		}
	}

	clearBinding(elemList, from, to){
		if(to === void 0)
			to = this.list.length;

		const modelRoot = this.modelRef;
		const binded = this.template.modelRefRoot_path;

		if(elemList.constructor !== Array){
			// Loop for every element between range first (important)
			for (var i = from; i < to; i++) {
				var elem = elemList.item(i);

				// Loop for any related property
				for (var a = binded.length-1; a >= 0; a--) {
					var bindList = RE_getBindedList(modelRoot, binded[a]);
					if(bindList === void 0)
						continue;

					for (var z = bindList.length-1; z >= 0; z--) {
						if(bindList[z].element === elem){
							if(elem.sf$bindedBackup === void 0)
								elem.sf$bindedBackup = [];

							elem.sf$bindedBackup.push([binded[a], bindList.splice(z, 1)[0]]);
						}
					}
				}
			}
			return;
		}

		// Loop for any related property
		for (var a = binded.length-1; a >= 0; a--) {
			var bindList = RE_getBindedList(modelRoot, binded[a]);
			if(bindList === void 0)
				continue;

			for (var z = bindList.length-1; z >= 0; z--) {
				var i = elemList.indexOf(bindList[z].element);

				// Is between range?
				if(i === -1 || i < from ||  i >= to)
					continue;

				var elem = bindList[z].element;
				if(elem.sf$bindedBackup === void 0)
					elem.sf$bindedBackup = [];

				elem.sf$bindedBackup.push([binded[a], bindList.splice(z, 1)[0]]);
			}
		}
	}
}

class ElementManipulatorProxy{
	refresh_RP(instance){
		const { list } = this;
		const keys = instance._list;
		for (let i = 0; i < list.length; i++) {
			const EM = list[i];
			const elemList = (EM.parentChilds || EM.elements);

			if(elemList === void 0)
				continue;

			for (let a = 0; a < keys.length; a++) {
				const elem = elemList[a];

				if(elem === void 0){
					EM.append(keys[a]);
					continue;
				}

				if(instance[keys[a]] !== elem.model){
					const newElem = EM.createElement(keys[a]);
					EM.parentNode.replaceChild(newElem, elem);

					if(EM.elements !== void 0)
						elemList[a] = newElem;
				}
			}
		}
	}
	getElement_RP(instance, prop){
		if(prop === void 0 || prop === null)
			return [];

		const { list } = this;
		const keys = instance._list;

		const got = [];
		for (let i = 0; i < list.length; i++) {
			let val;
			if(typeof this[prop] === 'object')
				val = list[i].elementRef.get(instance[prop]);
			else
				val = (list[i].parentChilds || list[i].elements)[keys.indexOf(prop)];

			if(val)
				got.push(val);
		}
		return got;
	}
	getElement_RL(instance, index){
		if(index === void 0 || index === null)
			return [];

		const { list } = this;
		const got = [];

		for (let i = 0; i < list.length; i++) {
			const EM = list[i];
			let val;

			if(index.constructor === Number){
				if(typeof instance[index] !== 'object')
					val = (EM.parentChilds || EM.elements)[index];
				else
					val = EM.elementRef.get(instance[index]);
			}
			else val = EM.elementRef.get(index);

			if(val)
				got.push(val);
		}

		return got;
	}

	$el(selector){
		const list = [];
		const $EMs = this.list;
		for (let i = 0; i < $EMs.length; i++) {
			const em = $EMs[i];
			list.push.apply(list, queryElements((em.parentChilds || em.elements), selector));
		}
		return $(list);
	}

	hardRefresh(){
		const { list } = this;
		for (let i = 0; i < list.length; i++)
			list[i].hardRefresh.apply(list[i], arguments);
	}
	update(){
		const { list } = this;
		for (let i = 0; i < list.length; i++)
			list[i].update.apply(list[i], arguments);
	}
	move(){
		const { list } = this;
		for (let i = 0; i < list.length; i++)
			list[i].move.apply(list[i], arguments);
	}
	swap(){
		const { list } = this;
		for (let i = 0; i < list.length; i++)
			list[i].swap.apply(list[i], arguments);
	}
	remove(){
		const { list } = this;
		for (let i = 0; i < list.length; i++)
			list[i].remove.apply(list[i], arguments);
	}
	removeRange(){
		const { list } = this;
		for (let i = 0; i < list.length; i++)
			list[i].removeRange.apply(list[i], arguments);
	}
	clear(){
		const { list } = this;
		for (let i = 0; i < list.length; i++)
			list[i].clear.apply(list[i], arguments);
	}
	insertAfter(){
		const { list } = this;
		for (let i = 0; i < list.length; i++)
			list[i].insertAfter.apply(list[i], arguments);
	}
	prepend(){
		const { list } = this;
		for (let i = 0; i < list.length; i++)
			list[i].prepend.apply(list[i], arguments);
	}
	append(){
		const { list } = this;
		for (let i = 0; i < list.length; i++)
			list[i].append.apply(list[i], arguments);
	}
	reverse(){
		const { list } = this;
		for (let i = 0; i < list.length; i++)
			list[i].reverse.apply(list[i], arguments);
	}
}

internal.EM = ElementManipulator;
internal.EMP = ElementManipulatorProxy;

function RE_restoreBindedList(modelRoot, lists){
	// lists [paths, backup]
	for (let i = 0; i < lists.length; i++) {
		const bindList = RE_getBindedList(modelRoot, lists[i][0]);
		if(bindList === void 0)
			continue;

		bindList.push(lists[i][1]);
	}
}

// return sf$bindedKey or undefined
function RE_getBindedList(modelRoot, binded){
	if(binded.length === 1)
		return modelRoot.sf$bindedKey[binded[0]];

	const check = deepProperty(modelRoot, binded.slice(0, -1));
	if(check === void 0 || check.sf$bindedKey === void 0)
		return;

	return check.sf$bindedKey[binded[binded.length - 1]];
}