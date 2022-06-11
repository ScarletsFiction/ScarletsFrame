// Known bugs: using keys for repeated list won't changed when refreshed
// - we also need to support bind into array/object index/key if specified
//
// Note: using .apply can be more faster than ...spread

import {component as Component} from "../sf-component.js";
import {internal as Internal} from "../internal.js";
import {$, queryElements} from "../sf-dom.js";
import {modelScript, initBindingInformation} from "./a_utils.js";
import {findScrollerElement, addScrollerStyle, VirtualScroll, VirtualScrollManipulator} from "../sf-virtual_scroll.js";
import {internal, SFOptions, sfRegex, emptyArray} from "../shared.js";
import {extractPreprocess} from "./parser.js";
import {getScope, findBindListElement, avoidQuotes, hiddenProperty, parsePropertyPath, deepProperty, compareObject} from "../utils.js";
import {getSelector} from "../sf-dom.utils.js";
import {modelToViewBinding, repeatedListBindRoot, bindElement} from "./element-bind.js";
import {syntheticTemplate, templateParser} from "./template.js";

var RE_Assign = false;
var RE_ProcessIndex;
export let RL_BindStatus = Object.freeze({ _RL: true });
export function repeatedListBinding(elements, modelRef, namespace, modelKeysRegex){
	// modelKeysRegex can be a template too
	let element, script;

	for (let i = 0; i < elements.length; i++) {
		element = elements[i];

		if(element.getAttribute === void 0){
			if(element.model !== void 0)
				modelRef = element.model;

			script = element.rule;
			element = element.el;

			RE_ProcessIndex = i;
		}
		else{
			// ToDo: find why we need to check this
			if(!element.hasAttribute('sf-each'))
				continue;

			script = element.getAttribute('sf-each');
			element.removeAttribute('sf-each');

			var mask = modelKeysRegex.modelRef_regex_mask;
			if(mask !== void 0)
				script = script.replace(` in ${mask}.`, ' in ');
		}

		element.sf$componentIgnore = true;

		let pattern = script.match(sfRegex.repeatedList);
		if(pattern === null){
			console.error("'", script, "' should match the pattern like `key,val in list`");
			continue;
		}

		pattern = {
			props: pattern[1],
			source: pattern[2]
		};

		if(pattern.props.includes(','))
			pattern.props = pattern.props.split(' ').join('').split(',');

		let target = modelRef[pattern.source];
		if(target === void 0){
			let isDeep;
			if(pattern.source.slice(-1) === ')'){
				if(modelRef.sf$uniqList === void 0)
					Object.defineProperty(modelRef, 'sf$uniqList', {value:{}});

				let ref = modelRef.sf$uniqList;
				if(!(pattern.source in ref)){
					const that = ref[pattern.source] = [];
					that.$data = pattern;

					(ref.sf$bindedKey ??= {})[pattern.source] = RL_BindStatus;

					listFromFunction(modelRef, pattern, that);
					isDeep = pattern.source;
				}
				else{
					const {props} = pattern;
					Object.assign(pattern, ref[pattern.source].$data);
					pattern.props = props;
					isDeep = pattern.source;
				}

				let {observe} = pattern;
				for (var a = 0; a < observe.length; a++) {
					var deep = parsePropertyPath(observe[a]);
					if(deep.length === 1) deep = deep[0];

					modelToViewBinding(modelRef, deep, pattern.call, void 0, void 0, 'callback');
				}
			}
			else isDeep = parsePropertyPath(pattern.source);

			if(isDeep.length !== 1){
				pattern.source = isDeep;
				target = deepProperty(modelRef, isDeep);

				// Cache deep
				if(modelRef.sf$internal)
					modelRef.sf$internal.deepBinding[isDeep.slice(0, -1).join('%$')] = true;
			}

			if(target === void 0){
				return console.error(`Failed to bind sf-each '${pattern.source}' with undefined property\nModel:`, modelRef, '\nElement:', element, '\nParent:', element.parentNode, '\nsf-each\'s Pattern:', pattern);
			}
		}
		else{
			// Enable element binding
			if(modelRef.sf$bindedKey === void 0)
				initBindingInformation(modelRef);

			const bindedKey = modelRef.sf$bindedKey;
			if(pattern.source in bindedKey){
				const val = bindedKey[pattern.source];

				if(val !== RL_BindStatus)
					val._RL = true;
				else bindedKey[pattern.source] = RL_BindStatus;
			}
			else bindedKey[pattern.source] = RL_BindStatus;

		}

		const { constructor, _$sfReactive } = target;
		let proto;

		if(_$sfReactive !== void 0)
			proto = _$sfReactive;
		else{
			if(constructor === Array) proto = ReactiveArray;
			else if(constructor === Object) proto = PropertyList;
			else if(constructor === Map) proto = ReactiveMap;
			else if(constructor === Set) proto = ReactiveSet;
			else if(constructor === WeakSet || constructor === WeakMap){
				console.error(pattern.source, target, "WeakMap or WeakSet is not supported");
				continue;
			}
			else{
				console.error(pattern.source, target, "should be an array or object but got", constructor);
				continue;
			}
		}

		// Parse the sf-each="rule in pattern"
		pattern = parsePatternRule(modelRef, pattern, proto);
		proto.construct(modelRef, element, pattern, element.parentNode, namespace, modelKeysRegex);
	}
}

export function forceReactive(modelRef, property){
	let that = modelRef[property];
	if(!that)
		return console.error(`Trying to make reactive element list from '${property}' in`, modelRef, "but got", that);

	const { constructor, _$sfReactive } = that;
	if(_$sfReactive != null) return;

	let proto;
	if(constructor === Array)
		proto = ReactiveArray;
	else if(constructor === Object)
		proto = PropertyList;
	else if(constructor === Map)
		proto = ReactiveMap;
	else if(constructor === Set)
		proto = ReactiveSet;

	Object.defineProperty(that, '_$pending', {
		configurable: true,
		value: true
	});

	// Enable element binding
	if(modelRef.sf$bindedKey === void 0)
		initBindingInformation(modelRef);

	const bindedKey = modelRef.sf$bindedKey;
	if(property in bindedKey){
		const val = bindedKey[property];

		if(val !== RL_BindStatus)
			val._RL = true;
		else bindedKey[property] = RL_BindStatus;
	}
	else bindedKey[property] = RL_BindStatus;

	Object.setPrototypeOf(that, proto.prototype);
	proto.construct(modelRef, void 0, {
		that,
		target: modelRef,
		prop: property,
		pattern: {},
		firstInit: true
	});
}

const listFunctionHandle = {
	generator(ret, list, modelRef){
		let val = ret.next();
		if(val.done) return list.splice(0);

		// Async Generator
		if(val.then !== void 0){
			list.splice(0);
			val.then(({value, done})=>{
				list.push(value);

				if(!done)
					listFunctionHandle.asyncGenerator(ret, list, modelRef);
			})
			return;
		}

		list.remake([val.value, ...ret], true);
	},
	async asyncGenerator(ret, list, modelRef){
		var promise = await ret.next();

		while(promise.done === false){
			list.push(promise.value);
			promise = (await ret.next());
		}
	}
};

function listFromFunction(modelRef, pattern, list){
	if(modelRef.sf$internal._regex === void 0)
		modelRef.sf$internal._regex = modelRef.sf$internal.modelKeysRegex.modelRefRoot_regex;

	let temp = pattern.source;
	// Unescape HTML
	temp = temp.split('&amp;').join('&').split('&lt;').join('<').split('&gt;').join('>');

	let func = avoidQuotes(pattern.source, function(temp){
		// Mask model for variable
		return temp.replace(modelRef.sf$internal._regex.v, (full, before, matched)=> `${before}_modelScope.${matched}`);
	});

	// Replace "range" into the internal function
	if(func.indexOf('range(') === 0)
		func = '_eP('+func.slice(6);

	let observe = pattern.observe = [];
	func.replace(sfRegex.itemsObserve, (full, _, match)=> {
		pattern.observe.push(match);
	});

	func = modelScript(false, 'return '+func.replace('(', '.call(_model_,'));

	if(observe.length !== 0){
		let debouncing = false;
		pattern.call = ()=>{
			if(debouncing) return;
			debouncing = true;

			setTimeout(()=> {
				debouncing = false;

				let ret = func(list, modelRef, rangeFunction);
				if(ret === void 0) return;

				// Generator
				if(ret.next !== void 0)
					return listFunctionHandle.generator(ret, list, modelRef);

				// Async Function
				if(ret.then !== void 0){
					ret.then(val=> {
						list.remake(val, true);
					})
					return;
				}

				// Array
				list.remake(ret, true);
			}, 1);
		};

		pattern.call();
	}
	else{
		pattern.call = {}; // Dummy
		setTimeout(function(){
			func(list, modelRef, rangeFunction);
		}, 1);
	}

	pattern.source = ['sf$uniqList', pattern.source];
}

function rangeFunction(begin, end, step){
	const isNumber = begin.constructor === Number;
	if(!isNumber){
		begin = begin.charCodeAt(0);
		end = end.charCodeAt(0);
	}

	const direction = Math.sign(end - begin); // -1 or 1

	if(step === void 0)
		step = direction;
	else if(direction === 0)
		return this.remake([begin], true);
	else if(Math.sign(step) !== direction)
		return this.remake(emptyArray, true);

	var arr = new Array(Math.ceil(direction*(end - begin) / Math.abs(step)));
	if(direction === 1){
		for (var i=0; begin <= end; begin += step, i++)
			arr[i] = begin;
	}
	else for (var i=0; begin >= end; begin += step, i++)
		arr[i] = begin;

	if(!isNumber){
		for(var i=0; i < arr.length; i++)
			arr[i] = String.fromCharCode(arr[i]);
	}
	else{
		const _step = step % 1;
		if(_step !== 0){
			const multiplier = 1 / _step;
			for (var i = 0; i < arr.length; i++)
				arr[i] = Math.round(arr[i]*multiplier)/multiplier;
		}
	}

	this.remake(arr, true);
}

function parsePatternRule(modelRef, pattern, proto){
	let prop = pattern.source;
	const that = prop.constructor === String ? modelRef[prop] : deepProperty(modelRef, prop);

	if(pattern.props.constructor !== Array && (proto === PropertyList || proto === ReactiveMap))
		pattern.props = ['_k_', pattern.props];

	var firstInit;
	if(that._$sfReactive !== proto){
		Object.setPrototypeOf(that, proto.prototype);
		firstInit = true;
	}

	if(that._$pending === true){
		delete that._$pending;
		firstInit = true;
	}

	// that = the list object
	// target = model or the parent object of the list
	// prop = property name

	if(prop.constructor !== Array)
		return {that, target: modelRef, prop, pattern, firstInit};

	return {
		that,
		target: deepProperty(modelRef, prop.slice(0, -1)),
		prop: prop[prop.length-1],
		pattern,
		firstInit
	};
}

function prepareRepeated(modelRef, element, rule, parentNode, namespace, modelKeysRegex){
	if(element === void 0 && this.$EM !== void 0)
		return;

	const {target, prop, pattern} = rule;
	let callback = target[`on$${prop}`] || {};

	let EM = new ElementManipulator();
	if(this.$EM === void 0){
		if(element === void 0){
			EM = new ElementManipulatorProxy();
			EM.list = [];
		}

		hiddenProperty(this, '$EM', EM, true);

		if(pattern.call === void 0){
			Object.defineProperty(target, `on$${prop}`, {
				configurable: true,
				get:()=> callback,
				set:val=> Object.assign(callback, val)
			});
		}
	}
	else if(this.$EM.constructor === ElementManipulatorProxy){
		if(this.$EM.list.length !== 0)
			this.$EM.list.push(EM);
		else this.$EM = EM;
	}
	else{
		const newList = [this.$EM, EM];
		this.$EM = new ElementManipulatorProxy();
		this.$EM.list = newList;
	}

	if(element === void 0) return;

	const compTemplate = (namespace || Component).registered[element.tagName.toLowerCase()];
	if(compTemplate !== void 0 && compTemplate[3] === void 0 && element.childNodes.length !== 0)
		compTemplate[3] = element;

	const isComponent = compTemplate !== void 0 ? compTemplate[1] : false;

	let mask = pattern.props, uniqPattern;
	if(mask.constructor === Array){
		uniqPattern = mask[0];
		mask = mask.pop();
	}

	EM.asScope = void 0;

	let template, originalAddr;
	if(!isComponent){
		let rootModelScope = modelRef;

		if(modelKeysRegex.specialElement !== void 0){
			originalAddr = modelKeysRegex.specialElement.repeat[RE_ProcessIndex];
			rootModelScope = modelKeysRegex.scopes._modelScope;
		}

		if(!originalAddr || originalAddr.template === void 0){
			let container;
			if(element.namespaceURI === 'http://www.w3.org/2000/svg' && (element.constructor._ref || element.constructor) !== SVGSVGElement)
				container = 'svg';

			template = extractPreprocess(element, mask, modelRef, container, modelKeysRegex, true, uniqPattern);

			if(originalAddr !== void 0 && originalAddr.rule !== void 0){
				originalAddr.template = {...template};
				const temp = originalAddr.template;
				delete temp.bindList;

				if(this._$sfReactive === ReactiveArray)
					originalAddr.template.repeatedList ??= true;

				if(SFOptions.devMode === true)
					originalAddr.template.rootIndex = getSelector(parentNode, true, getScope(parentNode, true));
			}

			if(this._$sfReactive === ReactiveArray)
				template.repeatedList ??= true;

			if(SFOptions.devMode === true)
				template.rootIndex = getSelector(parentNode, true, getScope(parentNode, true));
		}
		else {
			template = Object.create(originalAddr.template);
			
			if(template.parse.length !== 0){
				let parses = template.parse = template.parse.slice(0);
				template.scopes = Object.create(template.scopes);
				template.scopes._modelScope = rootModelScope;

				// Create from the original to new object
				for (let i = 0; i < parses.length; i++) {
					let ref = parses[i] = Object.create(parses[i]);
					ref.data = template.scopes;
				}
			}
		}

		template.bindList = this;

		if(this._$sfReactive === ReactiveArray)
			repeatedListBindRoot(template, rootModelScope);
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

	const isAlone = parentNode.$EM === void 0;
	parentNode.$EM = this.$EM;

	if(pattern.call !== void 0)
		pattern.call.bindList = this;

	if(uniqPattern !== void 0)
		EM.template.uniqPattern = uniqPattern;

	// Check if this was nested repeated element
	if(originalAddr && modelKeysRegex.bindList !== void 0){
		template.parentTemplate = modelKeysRegex;
		var _list = modelKeysRegex.scopes._list ??= [];
		let hasChanges = false;

		if(!modelKeysRegex._keyListAdded){
			if(modelKeysRegex.uniqPattern !== void 0)
				_list.push(modelKeysRegex.uniqPattern);

			if(modelKeysRegex.modelRef_regex_mask !== void 0)
				_list.push(modelKeysRegex.modelRef_regex_mask);
		}
		else if(!template._keyListAdded) {
			if(template.uniqPattern !== void 0)
				_list.push(template.uniqPattern);

			if(template.modelRef_regex_mask !== void 0)
				_list.push(template.modelRef_regex_mask);
		}

		modelKeysRegex._keyListAdded = true;
		template.scopes = modelKeysRegex.scopes;

		if(hasChanges)
			_list.regex = RegExp(sfRegex.getScopeList.join(_list.join('|').split('$').join('\\$')), 'gm');

		originalAddr.template = template;
	}

	const { nextSibling } = element;
	element.remove();

	// check if alone
	if(isAlone && (parentNode.childNodes.length <= 1 || parentNode.textContent.trim().length === 0))
		return true;

	const that = this;
	return function(){
		EM.bound_end = document.createComment('');
		parentNode.insertBefore(EM.bound_end, nextSibling);

		if(that.length !== void 0)
			EM.elements = new Array(that.length);
		if(that instanceof Map || that instanceof Set)
			EM.elements = new Array(that.size);
		else EM.elements = [];

		// Output to real DOM if not being used for virtual list
		injectArrayElements(EM, parentNode, EM.bound_end, that, modelRef, parentNode);
	}
}

// This will be called when constructing the
// Reactive (Object,Map,Set), but not for ReactiveArray
function afterConstruct(modelRef, element, rule, parentNode, namespace){
	const { that } = rule;

	const alone = prepareRepeated.apply(that, arguments);
	if(element === void 0) return;

	const EM = that.$EM.constructor === ElementManipulatorProxy ? that.$EM.list[that.$EM.list.length-1] : that.$EM;

	if(alone === true){
		// Output to real DOM if not being used for virtual list
		EM.parentChilds = parentNode.children;

		injectArrayElements(EM, parentNode, void 0, that, modelRef, parentNode, namespace);
	}
	else alone();
}

function forceRefreshKeyData(list){
	if(list.$EM.constructor === ElementManipulatorProxy){
		list.$EM.list.forEach(refreshKeyFromEM);
		return;
	}

	refreshKeyFromEM(list.$EM);
}

function refreshKeyFromEM(EM){
	const {template, list} = EM;
	if(template.modelRef._sfkey_ === void 0) return;
	const elements = EM.elements || EM.parentChilds;

	if(list._$sfReactive === ReactiveArray){
		for (var i = 0; i < list.length; i++) {
			const temp = elements[i];
			temp.sf$repeatListIndex = i;
			syntheticTemplate(temp, template, '_sfkey_', list[i]);
		}
	}
	else{ // ReactiveMap
		var i = 0;
		for(const [key, val] of list){
			const temp = elements[i++];
			temp.sf$repeatListIndex = key;
			syntheticTemplate(temp, template, '_sfkey_', val);
		}
	}
}

export class PropertyList { // extends Object
	static construct(modelRef, element, rule, parentNode, namespace, modelKeysRegex){
		const {that, target, prop, firstInit} = rule;

		// Initialize property once
		if(firstInit){
			hiddenProperty(that, '_list', Object.keys(that), true);

			Object.defineProperty(target, prop, {
				configurable: true,
				get:()=> that,
				set:val=> {
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
					if(a === news.length && !(a in olds))
						return;

					for (var i = a; i < olds.length; i++)
						Obj.delete(that, olds[i]);

					for (var i = a; i < news.length; i++)
						Obj.set(that, news[i], val[news[i]]);

					that._list = news;
				}
			});
		}

		afterConstruct.apply(this, arguments);

		// Proxy known property
		for(let key in that)
			ProxyProperty(that, key, true);
	}

	getElement(prop){
		if(prop == null)
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
		const list = this._list;

		// Check if not a single RepeatedElement instance
		if(this.$EM.constructor === ElementManipulatorProxy)
			this.$EM.refresh_RP(this);
		else{
			const elemList = (this.$EM.parentChilds || this.$EM.elements);
			if(elemList === void 0)
				return;

			let values = Object.values(this);
			let isArray = elemList.constructor === Array;

			// Remove element first
			for (let i = elemList.length-1; i >= 0; i--) {
				const elem = elemList[i];
				if(values.includes(elem.model)) continue;

				elem.remove();
				if(isArray) elemList.splice(i, 1);
			}

			for (let i = 0; i < list.length; i++) {
				const elem = elemList[i];
				let item = this[list[i]];

				if(item == null){
					delete this[list[i]];
					list.splice(i--, 1);
					continue;
				}

				if(elem == null)
					this.$EM.append(list[i]);
				else if(item !== elem.model){
					const newElem = this.$EM.createElement(list[i]);
					this.$EM.parentNode.replaceChild(newElem, elem);

					if(this.$EM.elements !== void 0)
						elemList[i] = newElem;
				}
			}
		}

		for (let key in this) {
			if(this[key] == null || list.includes(key))
				continue;

			this.$EM.append(key);
			ProxyProperty(this, key, false);
			list.push(key);
		}

		this.$EM.inputBoundCheck();
	}
}

Object.defineProperties(PropertyList.prototype, {
	constructor: {value: Object},
	_$sfReactive: {value: PropertyList},
});

// Only for Object or PropertyList
export const Obj = {
	set(obj, prop, val){
		if(obj[prop] === val)
			return;

		if(obj.$EM === void 0){
			obj[prop] = val;
			return;
		}

		if(!(prop in obj)){
			let oldIndex = obj._list.indexOf(prop);
			if(oldIndex !== -1){
				obj[prop] = val;
				ProxyProperty(obj, prop, false);
				obj.$EM.update(oldIndex);
				return;
			}

			obj[prop] = val;
			ProxyProperty(obj, prop, false);

			obj.$EM.append(prop);
			obj._list.push(prop);
		}
	},
	delete(obj, prop){
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
};

export class ReactiveMap extends Map {
	static construct(modelRef, element, rule, parentNode, namespace, modelKeysRegex){
		const {that, target, prop, firstInit} = rule;

		// Initialize property once
		if(firstInit){
			Object.defineProperty(target, prop, {
				configurable: true,
				get:()=> that,
				set:val=> {
					// Delete first
					for(const [key, v] of that)
						!val.has(key) && that.delete(key);

					// Adding new item
					for(const [key, v] of val){
						if(that.get(key) === v) continue;
						that.set(key, v);
					}
				}
			});
		}

		afterConstruct.apply(this, arguments);
	}
	set(key, val){
		if(super.has(key)){
			const oldVal = super.get(key);
			if(oldVal === val) return this;
			this.$EM.remove(key, oldVal, true);
		}
		else if(this.$size !== void 0)
			this.$size();

		super.set.apply(this, arguments);
		this.$EM.append(key, val, true);
		this.$EM.inputBoundCheck();
		return this;
	}
	clear(){
		this.$EM.clear();
		super.clear();

		if(this.$size !== void 0)
			this.$size();

		return this;
	}
	delete(key){
		if(!this.has(key)) return this;

		const val = super.get(key);
		super.delete(key);
		this.$EM.remove(key, val, true);

		if(this.$size !== void 0) this.$size();
		return this;
	}
	refresh(){
		forceRefreshKeyData(this);
	}
}

Object.defineProperties(ReactiveMap.prototype, {
	constructor: {value: Map},
	_$sfReactive: {value: ReactiveMap},
});

export class ReactiveSet extends Set {
	static construct(modelRef, element, rule, parentNode, namespace, modelKeysRegex){
		const {that, target, prop, firstInit} = rule;

		// Initialize property once
		if(firstInit){
			Object.defineProperty(target, prop, {
				configurable: true,
				get:()=> that,
				set:val=> {
					// If an Set
					if(val.has !== void 0){
						for(const v of that) // Delete first
							!val.has(v) && that.delete(v);

						for(const v of val) // Adding new item
							!that.has(v) && that.add(v);

						return;
					}

					// If an Array
					for(const v of that) // Delete first
						!val.includes(v) && that.delete(v);

					for(var i = 0; i < val.length; i++) { // Adding new item
						const temp = val[i];
						!that.has(temp) && that.add(temp);
					}
				}
			});
		}

		afterConstruct.apply(this, arguments);
	}
	add(val){
		if(super.has(val)) return this;
		super.add(val);
		this.$EM.append(void 0, val, false);

		this.$EM.inputBoundCheck();
		if(this.$size !== void 0) this.$size();
		return this;
	}
	clear(){
		this.$EM.clear();
		super.clear();

		if(this.$size !== void 0)
			this.$size();

		return this;
	}
	delete(val){
		if(!this.has(val)) return this;

		super.delete(val);
		this.$EM.remove(void 0, val, false);

		if(this.$size !== void 0) this.$size();
		return this;
	}
}

Object.defineProperties(ReactiveSet.prototype, {
	constructor: {value: Set},
	_$sfReactive: {value: ReactiveSet},
});

function ProxyProperty(obj, prop, force){
	if(force || Object.getOwnPropertyDescriptor(obj, prop).set === void 0){
		let temp = obj[prop];

		Object.defineProperty(obj, prop, {
			configurable:true,
			get:()=> temp,
			set:val=> {
				temp = val;
				obj.refresh(prop);
			}
		});
	}
}

// This is called only once when RepeatedElement is initializing
// So we don't need to use cache
function injectArrayElements(EM, tempDOM, beforeChild, that, modelRef, parentNode, namespace){
	let temp, elem, scopes, { isComponent, template } = EM;

	// Has child repeated element
	const hasChild = template.parentTemplate !== void 0 || (template.specialElement && template.specialElement.repeat !== void 0);
	if(hasChild)
		scopes = template.scopes;

	if(that._$sfReactive === ReactiveMap || that._$sfReactive === ReactiveSet){
		const isMap = that instanceof Map;
		let i = -1;
		let pending = beforeChild === void 0 ? [] : false;

		for(let item of that){
			i++;

			let key;
			if(isMap) [key, item] = item;

			if(hasChild){
				if(template.uniqPattern)
					scopes[template.uniqPattern] = key;

				scopes[template.modelRef_regex_mask] = item;
			}

			if(isComponent){
				if(isMap)
					item.$key = key;

				elem = new template(item, namespace, EM.asScope);
			}
			else elem = templateParser(template, item, false, modelRef, parentNode, void 0, key);

			if(typeof item === "object"){
				if(isComponent === false)
					bindElement(elem, modelRef, template, item);

				EM.elementRef.set(item, elem);
			}

			if(beforeChild === void 0)
				pending.push(elem);
			else{
				EM.elements[i] = elem;
				tempDOM.insertBefore(elem, beforeChild);
			}
		}

		if(pending !== false)
			tempDOM.append(...pending);
		return;
	}

	if(that._$sfReactive === PropertyList){
		temp = that;
		that = Object.values(that);
	}

	const len = that.length;
	let pending = beforeChild === void 0 ? new Array(len) : false;

	for (var i = 0; i < len; i++) {
		const item = that[i];

		if(hasChild){
			if(template.uniqPattern)
				scopes[template.uniqPattern] = (temp === void 0 ? i : temp._list[i]);

			scopes[template.modelRef_regex_mask] = item;
		}

		if(isComponent)
			elem = new template(item, namespace, EM.asScope);
		else{
			elem = templateParser(template, item, false, modelRef, parentNode, void 0, template.uniqPattern && (temp === void 0 ? i : temp._list[i]));
		}

		if(typeof item === "object"){
			if(isComponent === false)
				bindElement(elem, modelRef, template, item);

			EM.elementRef.set(item, elem);
		}

		if(beforeChild === void 0)
			pending[i] = elem;
		else if(beforeChild === true) // Virtual Scroll
			EM.elements[i] = elem;
		else{
			EM.elements[i] = elem;
			tempDOM.insertBefore(elem, beforeChild);
		}
	}

	if(pending !== false)
		tempDOM.append(...pending);

	// For PropertyList
	if(temp !== void 0){
		var i = 0;
		for(let keys in temp)
			temp[keys] = that[i++];
	}
}

export class ReactiveArray extends Array {
	static construct(modelRef, element, rule, parentNode, namespace, modelKeysRegex){
		const {that, target, prop, firstInit, pattern} = rule;

		// Initialize property once
		if(firstInit && pattern.call === void 0){
			Object.defineProperty(target, prop, {
				configurable: true,
				get:()=> that,
				set:val=> {
					if(val.length === 0)
						that.splice(0);
					else if(RE_Assign)
						that.assign(val);
					else that.remake(val, true);
				}
			});
		}

		const alone = prepareRepeated.apply(that, arguments);
		if(element === void 0) return;

		const EM = that.$EM.constructor === ElementManipulatorProxy ? that.$EM.list[that.$EM.list.length-1] : that.$EM;

		if(parentNode.classList.contains('sf-virtual-list')){
			hiddenProperty(that, '$virtual', new VirtualScroll(EM));

			if(alone !== true)
				console.warn("Virtual list was initialized when the container has another child that was not sf-repeated element.", parentNode);

			EM.elements = new Array(that.length);
			parentNode.$VSM = EM.$VSM = new VirtualScrollManipulator(parentNode, EM, EM.template.html);

			// Put DOM element to the EM.elements only, and inject to the real DOM when ready
			injectArrayElements(EM, parentNode, true, that, modelRef, parentNode, namespace);

			EM.$VSM.startInjection();
			EM.$VSM.callbacks = target[`on$${prop}`];
		}
		else if(alone === true){
			// Output to real DOM if not being used for virtual list
			EM.parentChilds = parentNode.children;
			injectArrayElements(EM, parentNode, void 0, that, modelRef, parentNode, namespace);
		}
		else alone();

		// Wait for scroll plugin initialization
		setTimeout(function(){
			const scroller = findScrollerElement(parentNode);
			if(scroller === null) return;

			addScrollerStyle();

			const computed = getComputedStyle(scroller);
			if(computed.backfaceVisibility === 'hidden' || computed.overflow.includes('hidden'))
				return;

			scroller.classList.add('sf-scroll-element');
		}, 1000);
	}

	pop(){
		this.$EM.remove(this.length - 1);
		if(this.$length !== void 0) this.$length();
		return super.pop();
	}

	push(){
		const lastLength = this.length;
		super.push.apply(this, arguments);

		if(arguments.length === 1)
			this.$EM.append(lastLength);
		else this.$EM.hardRefresh(lastLength);

		this.$EM.inputBoundCheck();
		if(this.$length !== void 0) this.$length();
		return this.length;
	}

	splice(index, limit){
		if(index === 0 && limit === void 0){
			this.$EM.clear();
			const ret = super.splice.apply(this, arguments);
			if(this.$length !== void 0) this.$length();
			return ret;
		}

		const lastLength = this.length;

		if(lastLength === 0) index = -1;
		// Trim the index if more than length
		else if(arguments.length >= 3){
			if(index >= lastLength)
				index = lastLength - 1;
			else index--;
		}

		if(index < 0) index = lastLength + index;
		if(!limit && limit !== 0) limit = this.length;

		// Removing data
		for (var i = limit - 1; i >= 0; i--)
			this.$EM.remove(index + i);

		const ret = super.splice.apply(this, arguments);
		if(arguments.length >= 3){ // Inserting data
			limit = arguments.length - 2;

			for (var i = 1; i <= limit; i++)
				this.$EM.insertAfter(index + i);

			this.$EM.inputBoundCheck();
		}

		if(this.$length !== void 0) this.$length();
		return ret;
	}

	shift(){
		const ret = super.shift();
		this.$EM.remove(0);

		if(this.$length !== void 0) this.$length();
		return ret;
	}

	unshift(){
		super.unshift.apply(this, arguments);

		if(arguments.length === 1)
			this.$EM.prepend(0);
		else for (let i = arguments.length - 1; i >= 0; i--)
			this.$EM.prepend(i);

		this.$EM.inputBoundCheck();
		if(this.$length !== void 0) this.$length();
		return this.length;
	}

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
				processed = new Set();

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
					this.unshift(...withArray);
				else
					this.push(...withArray);
			}

			return this;
		}
		else{
			for(var i = 0; i < withArray.length; i++){
				if(i === this.length)
					break;

				const old = this[i + fromIndex], now = withArray[i];
				if(old !== now){
					let oldStatus = RE_Assign;
					RE_Assign = true;

					Object.assign(old, now);
					RE_Assign = oldStatus;
				}
			}
		}

		if(withArray.length === this.length || fromIndex !== 0)
			return this;

		const lastLength = this.length;
		if(withArray.length > this.length){
			super.push(...withArray.slice(this.length));
			this.$EM.hardRefresh(lastLength);
			this.$EM.inputBoundCheck();
		}
		else{
			super.splice(withArray.length);
			this.$EM.removeRange(withArray.length, lastLength);
		}

		if(this.$length !== void 0) this.$length();
		return this;
	}

	remake(newList, atMiddle){
		if(newList.splice === void 0)
			throw new Error("ReactiveArray expect an array data but got:\n"+newList);

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
				this.push(...newList.slice(lastLength));

				if(this.$length !== void 0) this.$length();
				return;
			}

			// Add new element at the middle
			else if(matchLeft !== lastLength){
				if(atMiddle === true){
					super.splice(i, lastLength - i, ...newList.slice(i));
					this.refresh(i, lastLength);

					if(this.$length !== void 0) this.$length();
				}
				return;
			}
		}

		// Build from zero
		if(lastLength === 0){
			super.push(...newList);
			this.$EM.hardRefresh(0);
			this.$EM.inputBoundCheck();

			if(this.$length !== void 0) this.$length();
			return;
		}

		var c = 0, a = lastLength; // Clear from this index
		if(lastLength !== 0){
			for(c--, a++; c < lastLength; c++, a--) {
				if(this[c] !== newList[c]) break;
			}
		}

		if(c !== 0) newList = newList.slice(c);

		// Clear all items and merge the new one
		super.splice(c, a, ...newList);

		// Rebuild all element
		if(atMiddle !== true && c === 0){
			this.$EM.clear();
			this.$EM.hardRefresh(0);
		}

		// Reuse some element
		else{
			// Clear unused element if current array < last array
			if(this.length < lastLength)
				this.$EM.removeRange(this.length, lastLength);

			// And start refreshing
			this.$EM.hardRefresh(c);
		}

		this.$EM.inputBoundCheck();
		if(this.$length !== void 0) this.$length();
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
		if(count === void 0) count = 1;

		this.$EM.move(from, to, count);
		super.splice(to, 0, ...super.splice(from, count));
	}

	// Return single element from first $EM
	getElement(index){
		if(index == null)
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
		if(item != null && item.children !== void 0 && item.children.constructor === HTMLCollection){
			if(!item.sf$elementReferences || !item.sf$elementReferences.template.bindList)
				item = findBindListElement(item);

			if(item === null)
				return -1;

			arguments[0] = item.model;
		}

		return super.indexOf.apply(this, arguments);
	}

	reverse(){
		this.$EM.reverse();
		super.reverse();
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
			if(!(i in elems)){
				this.$EM.hardRefresh(i);
				this.$EM.inputBoundCheck();
				return;
			}

			if(this.$EM.constructor === ElementManipulatorProxy)
				var oldElem = this.$EM.list[0].elementRef.get(this[i]);
			else
				var oldElem = this.$EM.elementRef.get(this[i]);

			if(oldElem === void 0 || elems[i].model !== oldElem.model)
				this.$EM.update(i, 1);
		}

		forceRefreshKeyData(this);
		this.$EM.inputBoundCheck();
	}
}

Object.defineProperties(ReactiveArray.prototype, {
	constructor: {value: Array},
	_$sfReactive: {value: ReactiveArray},
});

export class ElementManipulator{
	createElement(index, item, isMap){
		if(isMap === void 0) // array
			item = this.list[index];

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
							bindElement(temp, this.modelRef, template, item);

						if(this.elementRef !== void 0)
							this.elementRef.set(item, temp);
					}
				}
				else if(temp.sf$bindedBackup !== void 0){
					RE_restoreBindedList(this.modelRef, temp.sf$bindedBackup);
					temp.sf$bindedBackup = void 0;
				}

				if(template.modelRef._sfkey_ !== void 0){
					temp.sf$repeatListIndex = index;
					syntheticTemplate(temp, template, '_sfkey_', item);
				}
			}

			if(this.$VSM) this.$VSM.newElementInit(temp, index-1);
			return temp;
		}

		if(template instanceof Function)
			temp = new template(item, this.namespace, this.asScope);
		else temp = templateParser(template, item, false, this.modelRef, this.parentNode, void 0, template.uniqPattern && index);

		if(typeof item === "object"){
			if(this.isComponent === false)
				bindElement(temp, this.modelRef, template, item);

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
			exist.length = list.length || 0;

		let pending = false;
		if(this.$VSM === void 0 && this.bound_end === void 0)
			pending = new Array(list.length - index);

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
						bindElement(temp, this.modelRef, this.template, ref);

					this.elementRef.set(ref, temp);
				}
			}
			else if(temp.model.$el === void 0){
				// This is not a component, lets check if all property are equal
				if(compareObject(temp.model, ref) === false){
					temp = templateParser(this.template, ref, false, this.modelRef, this.parentNode, void 0, this.template.uniqPattern && i);

					if(typeof ref === "object"){
						if(this.isComponent === false)
							bindElement(temp, this.modelRef, this.template, ref);

						this.elementRef.set(ref, temp);
					}
				}
				else if(temp.sf$bindedBackup !== void 0){
					RE_restoreBindedList(this.modelRef, temp.sf$bindedBackup);
					temp.sf$bindedBackup = void 0;
				}

				if(this.template.modelRef._sfkey_ !== void 0){
					temp.sf$repeatListIndex = i;
					syntheticTemplate(temp, this.template, '_sfkey_', ref);
				}
			}

			if(this.elements !== void 0)
				exist[i] = temp;

			if(this.$VSM === void 0){
				if(this.bound_end !== void 0)
					this.parentNode.insertBefore(temp, this.bound_end);
				else pending[i - index] = temp;
			}
			else this.$VSM.newElementInit(temp, i-1);
		}

		if(pending !== false && pending.length !== 0)
			this.parentNode.append(...pending);

		if(this.$VSM) this.$VSM.hardRefresh(index);
	}

	update(index, other){
		const exist = this.parentChilds || this.elements;
		const { list, template } = this;

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
			if(oldChild === void 0 || !(i in list))
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
						bindElement(temp, this.modelRef, template, ref);

					this.elementRef.set(ref, temp);
				}
			}
			else if(temp.model.$el === void 0){
				// This is not a component, lets check if all property are equal
				if(compareObject(temp.model, ref) === false){
					temp = templateParser(template, ref, false, this.modelRef, this.parentNode, void 0, template.uniqPattern && i);

					if(typeof ref === "object"){
						if(this.isComponent === false)
							bindElement(temp, this.modelRef, template, ref);

						this.elementRef.set(ref, temp);
					}
				}
				else if(temp.sf$bindedBackup !== void 0){
					RE_restoreBindedList(this.modelRef, temp.sf$bindedBackup);
					temp.sf$bindedBackup = void 0;
				}

				if(this.template.modelRef._sfkey_ !== void 0){
					temp.sf$repeatListIndex = i;
					syntheticTemplate(temp, this.template, '_sfkey_', ref);
				}
			}

			if(this.elements !== void 0)
				exist[i] = temp;

			if(this.$VSM){
				this.$VSM.newElementInit(temp, i-1);
				this.$VSM.update(i, temp);
				continue;
			}

			this.parentNode.replaceChild(temp, oldChild);

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

		if(this.elements !== void 0){
			exist.splice(from, count);
			exist.splice(to, 0, ...vDOM);

			if(this.$VSM !== void 0)
				this.$VSM.move(from, to, count, vDOM);
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
			exist[oo] = temp;
		}

		if(this.$VSM === void 0){
			const other_sibling = other.nextSibling;
			const parentNode = this.parentNode;
			parentNode.replaceChild(other, index);
			parentNode.insertBefore(index, other_sibling);
		}
		else this.$VSM.swap(ii, oo);

		if(this.callback.update){
			this.callback.update(exist[other], 'swap');
			this.callback.update(exist[index], 'swap');
		}
	}

	remove(index, item, isMap){
		const exist = this.parentChilds || this.elements;
		if(isMap !== void 0){
			if(isMap === true){
				let key = index;
				for (index = 0; index < exist.length; index++) {
					if(exist[index].sf$repeatListIndex === key)
						break;
				}
			}
			else{
				for (index = 0; index < exist.length; index++) {
					if(exist[index].model === item)
						break;
				}
			}
		}

		if(this.template.modelRefRoot_path && this.template.modelRefRoot_path.length !== 0)
			this.clearBinding(exist, index, index+1);

		if(exist[index]){
			if(this.callback.remove){
				if(this.elements !== void 0)
					var currentEl = exist[index];
				else{
					// This for fix bug when some element are pending to be deleted
					if(isMap === void 0)
						item = this.list[index];

					for (var i = 0, n=exist.length; i < n; i++)
						if(exist[i].model === item) break;

					var currentEl = exist[i];
				}

				let currentRemoved = false;
				const startRemove = function(){
					if(currentRemoved) return;
					currentRemoved = true;

					currentEl.remove();
				};

				// Instant remove if return falsy value
				if(!this.callback.remove(currentEl, startRemove))
					startRemove();
			}
			// Instant remove if no callback
			else exist[index].remove();

			if(this.$VSM) this.$VSM.remove(index);

			if(this.elements !== void 0)
				exist.splice(index, 1);
		}
	}

	removeRange(index, other){
		const exist = this.parentChilds || this.elements;

		if(this.parentChilds)
			for (let i = index; i < other; i++)
				exist[index].remove();
		else
			for (let i = index; i < other; i++)
				exist[i].remove();

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

		if(this.bound_end === void 0)
			this.parentNode.textContent = '';
		else{
			let els = this.elements;
			for (var i = els.length-1; i >= 0; i--)
				els[i].remove();
		}

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
			exist.splice(index, 0, temp);

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

	append(index, item, isMap){
		const exist = this.parentChilds || this.elements;
		const temp = this.createElement(index, item, isMap);

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
				this.parentNode.append(...elems);
			else
				for (var i = 0; i < elems.length; i++)
					this.parentNode.insertBefore(elems[i], this.bound_end);
		}
	}

	clearBinding(elemList, from, to){
		to ??= this.list.length || this.list.size;

		const modelRoot = this.modelRef;
		const binded = this.template.modelRefRoot_path;

		if(elemList.constructor !== Array){
			// Loop for every element between range first (important)
			for (var i = from; i < to; i++) {
				var elem = elemList[i];

				// Loop for any related property
				for (var a = binded.length-1; a >= 0; a--) {
					var bindList = RE_getBindedList(modelRoot, binded[a]);
					if(bindList === void 0)
						continue;

					for (var z = bindList.length-1; z >= 0; z--) {
						if(bindList[z].element === elem)
							(elem.sf$bindedBackup ??= []).push([binded[a], bindList.splice(z, 1)[0]]);
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
				(elem.sf$bindedBackup ??= []).push([binded[a], bindList.splice(z, 1)[0]]);
			}
		}
	}

	inputBoundCheck(){
		let parentNode = this.parentNode;
		if(parentNode.sfBounded === void 0) return;

		// Currently the select input that need to be recheck
		if(parentNode.tagName === 'SELECT'){
			let { sfBounded, sfModel } = parentNode;
			let binding = sfModel.sf$bindedKey[sfBounded];
			binding.inputBound(sfModel[sfBounded], binding.input);
		}
	}
}

export class ElementManipulatorProxy{
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
		if(prop == null)
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
		if(index == null)
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

	$el(selector, key){
		if(key != null){
			let list = [];
			let $EMs = this.list;

			let isObject, objValue;
			for (let i = 0; i < $EMs.length; i++) {
				let em = $EMs[i];

				if(isObject == null){
					objValue = em.list[key];
					isObject = typeof objValue === 'object';
				}

				let el;
				if(isObject)
					el = em.elementRef.get(objValue);
				else el = (em.parentChilds || em.elements)[key];

				if(el == null) continue;
				el = el.querySelector(selector);

				if(el != null)
					list.push(el);
			}

			return $(list);
		}

		let list = [];
		let $EMs = this.list;
		for (let i = 0; i < $EMs.length; i++) {
			let em = $EMs[i];
			list.push(...queryElements((em.parentChilds || em.elements), selector));
		}

		return $(list);
	}

	hardRefresh(){
		const { list } = this;
		for (let i = 0; i < list.length; i++)
			EM_Proto.hardRefresh.apply(list[i], arguments);
	}
	update(){
		const { list } = this;
		for (let i = 0; i < list.length; i++)
			EM_Proto.update.apply(list[i], arguments);
	}
	move(){
		const { list } = this;
		for (let i = 0; i < list.length; i++)
			EM_Proto.move.apply(list[i], arguments);
	}
	swap(){
		const { list } = this;
		for (let i = 0; i < list.length; i++)
			EM_Proto.swap.apply(list[i], arguments);
	}
	remove(){
		const { list } = this;
		for (let i = 0; i < list.length; i++)
			EM_Proto.remove.apply(list[i], arguments);
	}
	removeRange(){
		const { list } = this;
		for (let i = 0; i < list.length; i++)
			EM_Proto.removeRange.apply(list[i], arguments);
	}
	clear(){
		const { list } = this;
		for (let i = 0; i < list.length; i++)
			EM_Proto.clear.apply(list[i], arguments);
	}
	insertAfter(){
		const { list } = this;
		for (let i = 0; i < list.length; i++)
			EM_Proto.insertAfter.apply(list[i], arguments);
	}
	prepend(){
		const { list } = this;
		for (let i = 0; i < list.length; i++)
			EM_Proto.prepend.apply(list[i], arguments);
	}
	append(){
		const { list } = this;
		for (let i = 0; i < list.length; i++)
			EM_Proto.append.apply(list[i], arguments);
	}
	reverse(){
		const { list } = this;
		for (let i = 0; i < list.length; i++)
			EM_Proto.reverse.apply(list[i], arguments);
	}

	inputBoundCheck(){
		const { list } = this;
		for (let i = 0; i < list.length; i++)
			EM_Proto.inputBoundCheck.apply(list[i], arguments);
	}
}

var EM_Proto = ElementManipulator.prototype;
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

;{
	const RE_Prototype = {
		// For PropertyList, ReactiveArray, ReactiveMap, ReactiveSet
		$el:{
			value(selector, key){
				const { $EM } = this;
				if($EM.constructor === ElementManipulatorProxy)
					return $EM.$el(selector, key)

				if(key != null)
					return $(selector, this.getElements(key));

				return $(queryElements(($EM.parentChilds || $EM.elements), selector));
			}
		},
	};

	const d = Object.defineProperties;
	d(PropertyList.prototype, RE_Prototype);
	d(ReactiveArray.prototype, RE_Prototype);
	d(ReactiveMap.prototype, RE_Prototype);
	d(ReactiveSet.prototype, RE_Prototype);
};

internal.ElementManipulatorProxy = ElementManipulatorProxy;