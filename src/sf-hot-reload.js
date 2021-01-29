// Allow direct function replacement to accelerate development
// Note: This feature will allocate more small memory and small slow down
// ToDo: Fix memory leak on RepeatedElement when using this feature
import {SFOptions, internal, HotReload} from "./shared.js";
import {loader as Loader} from "./sf-loader.js";
import {component as Component, prepareComponentTemplate} from "./sf-component.js";
import {model as Model} from "./sf-model.js";
import {Views} from "./sf-views.js";
import {Inspector} from "./assistant/inspector.js";
import {parseElement} from "./sf-dom.utils.js";
import {removeModelBinding, bindElement} from "./sf-model/element-bind.js";
import {templateParser} from "./sf-model/template.js";
import {$} from "./sf-dom.js";

let hotReloadAll = false; // All model property
SFOptions.devMode = true;

export let proxyModel, proxySpace, proxyComponent, internalProp;
export let backupTemplate;

setTimeout(function(){
	if(!SFOptions.hotReload){
		SFOptions.devMode = false;
		HotReload.proxyTemplate = void 0;
	}
	else console.log('[ScarletsFrame] %cDevelopment mode', 'color:yellow');
}, 1);

export function hotReload(mode){
	if(mode === 1)
		SFOptions.hotReload = true;
	else if(mode === 2)
		hotReloadAll = SFOptions.hotReload = true;
	if(proxyModel !== void 0) return;

	backupTemplate = Object.assign({}, templates);
	HotReload.backupCompTempl = new WeakMap();
	proxyModel = new WeakMap();
	proxyComponent = new WeakMap();
	proxySpace = new WeakMap(/*
		(Space) => {compName:[scopes]}
	*/);

	internalProp = {
		init:true,
		initClone:true,
		hotReload:true,
		hotReloaded:true,
		reinit:true,
		destroy:true,
		destroyClone:true,
		$el:true,
	};

	$(function(){
		backupTemplate = Object.assign({}, templates);

		// Turn on the inspector assistant
		Inspector();

		// Register event
		setTimeout(function(){
			if(window.___browserSync___ !== void 0){
				const { socket } = window.___browserSync___;

				function runScript(code){
					HotReload.active = true;
					new Function(code)();
					HotReload.active = false;
				}

				socket.on('sf-hot-js', runScript);
				socket.on('sf-hot-html', runScript);
			}
			else console.error("HotReload: Failed to listen to browserSync");
		}, 1000);
	});

	// On model scope reregistered
	HotReload.Model = function(space, name, func){
		const scope = space(name);
		let proxy = proxyModel.get(scope);

		// If new model
		if(proxy === void 0 || !scope){
			proxy = {}; // we will only put function here
			proxyModel.set(scope, proxy);
		}

		reapplyScope(proxy, space, scope, func);
	}

	// On new component created
	HotReload.ComponentAdd = function(space, name, scope){
		let proxy = proxySpace.get(space);

		// If new space
		if(proxy === void 0){
			proxy = {};
			proxySpace.set(space, proxy);
		}

		let list = proxy[name] ??= [];
		list.push(scope);

		proxy = {};
		proxyComponent.set(scope, proxy);

		reapplyScope(proxy, scope, scope);
	}

	HotReload.ComponentRemove = function(el){
		const proxy = proxySpace.get(el.sf$space || Component);
		if(proxy === void 0)
			return;

		const list = proxy[el.sf$controlled];
		list.splice(list.indexOf(el.model), 1);
	}

	// On component scope reregistered
	HotReload.ComponentRefresh = function(space, name, func){
		let list = proxySpace.get(space);
		if(list === void 0 || !(name in list))
			return;

		list = list[name];

		for (let i = 0; i < list.length; i++){
			let proxy = proxyComponent.get(list[i]);
			if(proxy === void 0){
				proxy = {};
				proxyComponent.set(list[i], proxy);
				reapplyScope(proxy, space, list[i], func, true);
			}
			else reapplyScope(proxy, space, list[i], func);
		}
	}

	// For views and component template
	// The element will be destroyed and created a new one
	// The scope will remain same, and hotReloaded will be called

	// Refresh views html and component
	HotReload.Template = function(templates){
		const vList = Views.list;
		const changes = {};

		for(let path in templates){
			if(!(path in backupTemplate) || backupTemplate[path] === templates[path])
				continue;

			const forComp = HotReload.proxyTemplate[path]; // [space, name]
			if(forComp !== void 0){
				const _space = forComp[0];
				const _name = forComp[1];
				const registrar = _space.registered[_name];

				if(registrar !== void 0 && registrar[3] !== void 0){
					const old = registrar[3].outerHTML;
					Component.html(_name, {template:path}, _space);
					const now = registrar[3].outerHTML;

					if(now !== old
					   || (HotReload.backupCompTempl.has(registrar)
					       && now !== HotReload.backupCompTempl.get(registrar).outerHTML)
					   )
						HotReload.ComponentTemplate(_space, _name);
				}

				continue;
			}

			// for views only
			changes[path] = true;
		}

		for(let name in vList){
			const { routes } = vList[name];
			const sfPageViews = vList[name].rootDOM.querySelectorAll('sf-page-view');

			for (let i = 0; i < sfPageViews.length; i++) {
				const page = sfPageViews[i];
				const pageTemplate = page.sf$templatePath;
				if(pageTemplate === void 0 || !(pageTemplate in changes))
					continue;

				page.innerHTML = templates[pageTemplate];

				page.routeCached.html = parseElement(`<template>${templates[pageTemplate]}</template>`, true)[0];

				// Replace with the old nested view
				const nesteds = page.sf$viewSelector;
				for(let nested in nesteds){
					const el = page.querySelector(nested);
					el.parentNode.replaceChild(nesteds[nested], el);
				}
			}
		}

		backupTemplate = Object.assign({}, templates);
	}

	// Refresh component html
	HotReload.ComponentTemplate = function(scope, name){
		const registrar = scope.registered[name];
		const freezed = registrar[2].slice(0); // freeze to avoid infinity loop if have any nest

		for (let z = 0; z < freezed.length; z++) {
			const model = freezed[z];
			const els = model.$el;

			for (let k = 0; k < els.length; k++) {
				const element = els[k];

				// Don't refresh component that not declared with sf.component.html
				if(element.sf$elementReferences === void 0)
					continue;

				const { parentNode } = element;
				const nextNode = element.nextSibling;

				// Detach from DOM tree first
				if(parentNode !== null)
					element.remove();
				element.textContent = '';

				// Clear old DOM linker
				removeModelBinding(model);

				let temp = registrar[3];
				if(registrar[3].constructor !== Object){
					var { tempDOM } = temp;

					temp = prepareComponentTemplate(temp, tempDOM, name, model, registrar);
					({ tempDOM } = temp);
				}

				// Create new object, but using registrar[3] as prototype
				const copy = Object.create(temp);

				if(copy.parse.length !== 0){
					copy.parse = copy.parse.slice(0);
					copy.scopes = {_modelScope:model};

					// Deep copy the original properties to new object
					for (let i = 0; i < copy.parse.length; i++) {
						copy.parse[i] = Object.create(copy.parse[i]);
						copy.parse[i].data = copy.scopes;
					}
				}

				if(tempDOM === true)
					var parsed = templateParser(copy, model, void 0, void 0, void 0, element);
				else{
					var parsed = templateParser(copy, model);
					element.appendChild(parsed);
				}

				element.sf$elementReferences = parsed.sf$elementReferences;
				bindElement(element, model, copy);

				// Put it back after children was ready
				if(parentNode !== null)
					parentNode.insertBefore(element, nextNode);
			}

			model.hotReloadedHTML && model.hotReloadedHTML();
		}

		HotReload.backupCompTempl.set(registrar, registrar[3]);
	}
}

const haveLoaded = new WeakSet();
function reapplyScope(proxy, space, scope, func, forceHaveLoaded){
	function refunction(prop, replacement){
		let proxier = proxy[prop];
		if(proxier === void 0){
			if(scope[prop] && scope[prop].ref !== void 0)
				proxier = proxy[prop] = scope[prop];
			else{
				proxier = proxy[prop] = function(){
					return proxier.ref.apply(this, arguments);
				}
			}
		}

		if(proxier.protoFunc !== void 0)
			proxier.ref = replacement || proxier.ref;
		else{
			const ref = (replacement || scope[prop]);

			if(proxier !== ref)
				proxier.ref = ref;
		}

		scope[prop] = proxier;
	}

	// Keep component's original scope for first time only
	if(func === void 0){
		for(let prop in scope){
			if(internalProp[prop] === true) // Skip function that related with framework
				continue;

			const temp = scope[prop];
			if(temp != null && temp.constructor === Function)
				refunction(prop);
		}
		return;
	}

	scope.$el ??= $();

	var firstTime = scope.sf$bindedKey === void 0;
	!firstTime && scope.hotReload && scope.hotReload(scope);

	if(func.constructor === Function){
		if(scope.sf$internalData === void 0)
			Object.defineProperty(scope, 'sf$internalData', {value:{}});

		const internal = scope.sf$internalData;
		if(internal.proxy === void 0){
			internal.proxy = new Proxy(scope, {set(obj, prop, val){
				// Skip function that related with framework
				// And skip if proxy is not enabled
				if(obj.hotReloading === false || internalProp[prop] === true){
					obj[prop] = val;
					return true;
				}

				if(val && val.constructor === Function)
					refunction(prop, val);
				else if(!(prop in obj) || hotReloadAll === true)
					obj[prop] = val; // Reassign non-function value

				return true;
			}});
		}

		scope.hotReloading = true;
		func(internal.proxy, space, (scope.$el && scope.$el.$item) || {});
		scope.hotReloading = false;
	}
	else Object.setPrototypeOf(scope, func.class.prototype);

	if(!firstTime || forceHaveLoaded){
		scope.sf$refresh && scope.sf$refresh.forEach(v=>v());
		scope.hotReloaded && scope.hotReloaded();
	}

	haveLoaded.add(scope);
}