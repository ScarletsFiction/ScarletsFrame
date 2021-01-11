import {internal, TemplatePending, SFOptions} from "./shared.js";
import {capitalizeLetters, proxyClass} from "./utils.js";
import $ from "./sf-dom.js";
import Model from "./sf-model.js";
import Space from "./sf-space.js";
import {templateParser} from "./sf-model/template.js";
import {templateInjector, createModelKeysRegex, extractPreprocess, parsePreprocess, queuePreprocess} from "./sf-model/parser.js";
import {bindInput} from "./sf-model/input-bind.js";
import {repeatedListBinding} from "./sf-model/repeated-list.js";
import {removeModelBinding, bindElement} from "./sf-model/element-bind.js";
import {getCallerFile, hotComponentTemplate, hotTemplate, hotComponentRefresh, hotComponentRemove, hotComponentAdd, proxyTemplate, backupCompTempl} from "./sf-hot-reload.js";

export default function Self(name, options, func, namespace){
	if(options !== void 0){
		if(options.constructor === Function)
			func = options;

		if(func !== options)
			Self.html(name, options, namespace);

		if(func === void 0 || func.constructor === Function)
			return Self.for(name, options, func, namespace);
	}

	const temp = Self.registered[name];
	return temp ? temp[2] : [];
}

export function prepareComponentTemplate(temp, tempDOM, name, newObj, registrar){
	if(temp.nodeType !== 1)
		return console.error(name, "component with content", temp, "should be wrapped inside of element");

	tempDOM = temp.tempDOM || temp.tagName.toLowerCase() === name;

	const isDynamic = templateInjector(temp, newObj, true);
	temp = extractPreprocess(temp, null, newObj, void 0, registrar[4]);

	if(isDynamic === false)
		registrar[3] = temp;

	// We need to improve sf-reserved to reduce re-extraction
	else{
		isDynamic.tempDOM = tempDOM;
		registrar[3] = isDynamic;
	}

	temp.tempDOM = tempDOM;
	return temp;
}

internal.component = {};
internal.componentInherit = {};

$(function(){
	if(TemplatePending.length !== 0)
		window.templates = window.templates;
});

const waitingHTML = {};

Self.registered = {};
Self.roots = {};
// internal.component.tagName = new Set();

function checkWaiting(name, namespace){
	const scope = namespace || Self;

	const upgrade = waitingHTML[name];
	for (let i = upgrade.length - 1; i >= 0; i--) {
		if(upgrade[i].namespace !== namespace)
			continue;

		let { el } = upgrade[i];
		el = Self.new(name, el, upgrade[i].item, namespace, false, true);
		if(el === void 0)
			return;

		el.connectedCallback('init');
		upgrade.pop();
	}

	if(upgrade.length === 0)
		delete waitingHTML[name];
}

Self.for = function(name, options, func, namespace){
	if(options.constructor === Function){
		func = options;

		// It's a class
		if(func.prototype.init !== void 0){
			internal.componentInherit[name] = func;
			func = {class:func};
		}
	}
	else{
		if(options.extend !== void 0)
			internal.componentInherit[name] = options.extend;
		else if(options.constructor === String)
			throw new Error("The second parameter of sf.component can't be a string. Maybe you want to use sf.component.html to define component's HTML template instead.");
	}

	if(func === void 0)
		func = NOOP;

	// internal.component.tagName.add(name.toUpperCase());
	const scope = namespace || Self;

	// 0=Function for scope, 1=DOM Contructor, 2=elements, 3=Template
	let registrar = scope.registered[name];
	if(registrar === void 0){
		registrar = scope.registered[name] = new Array(5);
		registrar[2] = [];
		// index 1 is $ComponentConstructor
	}

	registrar[0] = func;

	const construct = defineComponent(name);
	registrar[1] = construct;

	Object.defineProperty(registrar[2], 'root', {value:construct});
	window[`$${capitalizeLetters(name.split('-'))}`] = construct;

	if(waitingHTML[name] !== void 0)
		checkWaiting(name, namespace);
	else if(SFOptions.hotReload)
		hotComponentRefresh(scope, name, func);

	if(SFOptions.devMode && registrar[2].$devData === void 0){
		Object.defineProperty(registrar[2], '$devData', {
			configurable: true,
			value: {
				func,
				filePath: getCallerFile(namespace ? 3 : 2)
			}
		});
	}

	// Return list of created component
	return registrar[2];
}

Self.html = function(name, outerHTML, namespace){
	const scope = namespace || Self;
	let templatePath = false;

	if(outerHTML.constructor === Object){
		let template;

		if(outerHTML.template){
			templatePath = outerHTML.template;
			if(window.templates){
				if(window.templates[outerHTML.template] !== void 0){
					template = window.templates[outerHTML.template];

					if(SFOptions.devMode && proxyTemplate[outerHTML.template] === void 0)
						proxyTemplate[outerHTML.template] = [scope, name];

					if(!outerHTML.keepTemplate && SFOptions.devMode === false)
						delete window.templates[outerHTML.template];
				}
				else{
					TemplatePending.push(function(){
						Self.html(name, outerHTML, namespace, true);
					});
					return console.warn(`Waiting template path '${outerHTML.template}' to be loaded`);
				}
			}
		}
		else if(outerHTML.html)
			template = outerHTML.html;
		else return;

		if(template === void 0){
			TemplatePending.push(function(){
				Self.html(name, outerHTML, namespace, true);
			});
			return console.warn(`Waiting template for '${name}' to be loaded`);
		}

		outerHTML = template;
	}

	// 0=Function for scope, 1=DOM Contructor, 2=elements, 3=Template, 4=ModelRegex
	let registrar = scope.registered[name];
	if(registrar === void 0){
		registrar = scope.registered[name] = new Array(5);
		registrar[2] = [];
	}

	let temp;
	if(outerHTML.constructor === String)
		temp = $.parseElement(outerHTML);
	else temp = outerHTML;

	if(temp.length === 1)
		registrar[3] = temp[0];
	else{
		const tempDOM = document.createElement('div');
		tempDOM.tempDOM = true;
		for (let i = temp.length - 1; i >= 0; i--) {
			tempDOM.insertBefore(temp[i], tempDOM.firstChild);
		}
		registrar[3] = tempDOM;
	}

	if(templatePath !== false){
		templatePath = templatePath.split('/');
		templatePath.pop();
		templatePath = templatePath.join('/');
		if(templatePath !== '')
			templatePath += '/';

		registrar[3].templatePath = templatePath;
	}

	if(waitingHTML[name] !== void 0)
		checkWaiting(name, namespace);

	if(SFOptions.hotReload){
		if(templatePath === false)
			hotComponentTemplate(scope, name);
		else if(backupCompTempl.has(registrar) === false)
			backupCompTempl.set(registrar, registrar[3]);
	}
}

const tempDOM = document.createElement('div');
Self.new = function(name, element, $item, namespace, asScope, _fromCheck){
	if(internal.component.skip)
		return;

	element.sf$asScope = asScope;

	if(element.sf$componentIgnore === true)
		return;

	if(element.hasAttribute('sf-each')){
		element.sf$componentIgnore = true;
		return;
	}

	const scope = namespace || Self;

	if(namespace !== void 0)
		element.sf$space = namespace;

	const registrar = scope.registered[name];
	if(registrar === void 0 || element.childNodes.length === 0 && registrar[3] === void 0){
		if(_fromCheck === true)
			return;

		if(waitingHTML[name] === void 0)
			waitingHTML[name] = [];

		waitingHTML[name].push({el:element, item:$item, namespace});
		return;
	}

	const avoid = /(^|:)(sf-|class|style)/;
	const attr = element.attributes;
	const inherit = internal.componentInherit[name];

	if(attr.length !== 0 && $item === void 0)
		$item = {};

	if(attr.length !== 0 && ($item.constructor === String || $item.constructor === Number))
		$item = {item:$item};

	for (var i = 0; i < attr.length; i++) {
		if(avoid.test(attr[i].nodeName))
			continue;

		$item[attr[i].nodeName] = attr[i].value;
	}

	let useItem = true;
	if(element.model !== void 0 && !(element.model instanceof Object)){
		$item = element.model;
		element.model = void 0;
		useItem = false;
	}

	let newObj = element.model || (asScope && useItem ? $item : (
		inherit !== void 0 ? new inherit() : {}
	));

	let index = 0;
	if(newObj.$el === void 0)
		newObj.$el = $();
	else index = newObj.$el.length;

	let reusing = void 0;
	if(index === 0 && newObj.destroy !== false){
		const func = registrar[0];
		if(func.constructor === Function){
			if(inherit !== void 0 && asScope)
				Object.setPrototypeOf(newObj, inherit.prototype);

			// Call function that handle scope
			reusing = func(newObj, (namespace || Model), $item);
			if(reusing !== void 0){
				newObj = reusing;

				let els = newObj.$el;
				if(els[0] === void 0)
					els[0] = element;
				else {
					if(els.length === 1){
						if(els[0].isConnected === false)
							els[0].sf$destroyReplace(0, element);
						else
							newObj.$el = newObj.$el.push(element);
					}
					else{
						for (var i = els.length-1; i >= 1; i--) {
							if(els[i].isConnected === false)
								els = newObj.$el = els.splice(i, 1);
						}

						if(i === 0) els[0].sf$destroyReplace(0, element);
						else newObj.$el = newObj.$el.push(element);
					}
				}
			}
		}

		if(newObj.constructor !== Object){
			proxyClass(newObj);
			newObj.constructor.construct && newObj.constructor.construct.call(newObj, (namespace || Model), $item);
		}

		// Save the item for hot reloading
		if(SFOptions.hotReload){
			newObj.$el.$item = $item;
			hotComponentAdd(scope, name, newObj);
		}
	}

	if(registrar[4] === void 0)
		registrar[4] = createModelKeysRegex(element, newObj, null);

	let forceConnectCall = false;
	if(element.childNodes.length === 0){
		let temp = registrar[3];
		let { tempDOM } = temp;

		// Create template here because we have the sample model
		if(temp.constructor !== Object){
			temp = prepareComponentTemplate(temp, tempDOM, name, newObj, registrar);
			({ tempDOM } = temp);
		}

		// Create new object, but using registrar[3] as prototype
		const copy = Object.create(temp);

		if(copy.parse.length !== 0){
			copy.parse = copy.parse.slice(0);
			copy.scopes = {_modelScope:newObj};

			// Deep copy the original properties to new object
			for (var i = 0; i < copy.parse.length; i++) {
				copy.parse[i] = Object.create(copy.parse[i]);
				copy.parse[i].data = copy.scopes;
			}
		}

		if(tempDOM === true)
			var parsed = templateParser(copy, newObj, void 0, void 0, void 0, element, void 0, namespace);
		else{
			var parsed = templateParser(copy, newObj);
			element.appendChild(parsed);
		}

		element.sf$elementReferences = parsed.sf$elementReferences;
		bindElement(element, newObj, copy);

		element.model = newObj;
	}

	// Custom component that written on the DOM
	else{
		// Temporary element
		if(registrar[3] === void 0 && element.hasAttribute('sf-as-template')){
			element.removeAttribute('sf-as-template');
			Self.html(name, element.outerHTML);
		}

		const specialElement = {
			repeat:[],
			input:[]
		};

		templateInjector(element, newObj, false);
		parsePreprocess(queuePreprocess(element, true, specialElement), newObj, registrar[4]);

		if(specialElement.input !== void 0)
			bindInput(specialElement.input, newObj);

		if(specialElement.repeat !== void 0)
			repeatedListBinding(specialElement.repeat, newObj, namespace, registrar[4]);

		if(element.sf$componentIgnore === true){
			element = newObj.$el[0];

			if(namespace !== void 0)
				element.sf$space = namespace;

			// May cause bug?
			delete element.sf$componentIgnore;
			if(element.isConnected)
				forceConnectCall = true;
		}

		element.model = newObj;

		if(specialElement.scope !== void 0)
			internal.initPendingComponentScope(specialElement.scope, element);
	}

	if(reusing === void 0)
		newObj.$el = newObj.$el.push(element);

	if(namespace === void 0){
		registrar[2].push(newObj);
		element.sf$collection = registrar[2];
	}
	else{
		let temp = namespace.components[name];
		if(temp === void 0){
			temp = namespace.components[name] = [];
			temp.$name = name;
			Object.defineProperty(temp, 'root', {value:registrar[2].root});
		}

		temp.push(newObj);
		element.sf$collection = temp;
	}

	element.sf$controlled = name;

	element.sf$firstInit = true;
	if(forceConnectCall)
		element.connectedCallback();

	return element;
}

class SFComponent extends HTMLElement{
	constructor($item, namespace, asScope){
		super();

		// Return if it's being used for sf-each
		if(this.hasAttribute('sf-each') || this.hasAttribute('sf-as-scope'))
			return;

		// Return if the component has sf-scope
		// Because it will be recreated after the parent
		// found it and finish the scope initialization
		if($item === void 0 && this.hasAttribute('sf-scope'))
			return;

		// Looks like the parent was ready to initalize this component
		// Usually when used with sf-scope
		if(this.model !== void 0){
			$item = this.model;
			asScope = true;
		}

		this.sf$constructor($item, namespace, asScope);
	}

	sf$constructor($item, namespace, asScope){
		const tagName = this.tagName.toLowerCase();

		if(namespace && namespace.constructor === Boolean){
			asScope = namespace;
			namespace = null;
		}

		if(internal.space.empty === false){
			let haveSpace = namespace || this.closest('sf-space');
			if(haveSpace !== null){
				if(haveSpace.constructor === Space)
					haveSpace = haveSpace.default;

				internal.space.initComponent(haveSpace, tagName, this, $item, asScope);
				return;
			}
		}

		Self.new(tagName, this, $item, void 0, asScope);
	}

	connectedCallback(which){
		// Maybe it's not the time
		if(internal.virtualScrolling || this.model === void 0 || this.sf$componentIgnore === true)
			return;

		if(this.sf$detaching !== void 0){
			clearTimeout(this.sf$detaching);
			this.sf$detaching = void 0;
			return;
		}

		if(this.sf$firstInit){
			delete this.sf$firstInit;

			if(this.model.init){
				if(this.model.$el.length !== 1){
					this.model.initClone && this.model.initClone(this.model.$el[this.model.$el.length-1]);
					return;
				}

				if(this.model.constructor !== Object)
					this.model.constructor.init && this.model.constructor.init.call(this.model, (this.sf$space || Model));

				this.model.init(this);
			}
			return;
		}

		if(which !== 'init' && this.model.reinit)
			this.model.reinit(this);
	}

	disconnectedCallback(){
		if(internal.virtualScrolling || this.sf$componentIgnore)
			return;

		// Skip if it's not initialized or not destroyable
		if(this.model === void 0 || this.model.destroy === false)
			return;

		if(window.destroying) return this.sf$destroy();

		const that = this;
		this.sf$detaching = setTimeout(function(){
			that.sf$destroy();
		}, 500);
	}

	sf$destroy(){
		if(this.model === void 0) return;
		const model = this.model;

		if(model.$el.length !== 1){
			const i = model.$el.indexOf(this);
			if(i !== -1){
				model.$el = model.$el.splice(i, 1);
				model.destroyClone && model.destroyClone(this);
			}

			removeModelBinding(model);
			return;
		}

		model.destroy && model.destroy(this);

		if(this.sf$collection !== void 0)
			this.sf$collection.splice(this.sf$collection.indexOf(model), 1);

		if(SFOptions.hotReload)
			hotComponentRemove(this);

		const $el = model.$el;
		if($el[0] !== void 0 && $el[0].isConnected === false)
			$el[0] = void 0;

		removeModelBinding(model, void 0, true);
	}

	sf$destroyReplace(i, element){
		if(this.sf$detaching){
			clearTimeout(this.sf$detaching);
			this.sf$destroy();
		}

		const model = this.model;
		model.$el[i] = element;
	}
}

if(window.sf$proxy)
	window.sf$defineComponent = defineComponent;

// name = 'tag-name'
function defineComponent(name){
	const have = customElements.get(name);
	if(have) return have;

	if(name.toLowerCase() !== name)
		return console.error("Please use lower case when defining component name");

	const len = name.length;
	if(name.replace(/[^\w-]+/g, '').length !== len)
		return console.error("Please use '-' and latin character when defining component tags");

	class Copy extends SFComponent{}

	if(window.sf$proxy)
		Copy.constructor = window.opener.Function;

	Self.roots[name] = Copy;
	customElements.define(name, Copy);
	return Copy;
}