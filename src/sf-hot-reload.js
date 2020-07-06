// Allow direct function replacement to accelerate development
// Note: this feature will allocate more small memory and small slow down
var hotReloadAll = false; // All model property

var proxyModel, proxySpace, proxyComponent, proxyTemplate, internalProp;
var backupTemplate, backupCompTempl;

sf.hotReload = function(mode){
	if(mode === 1)
		hotReload = true;
	else if(mode === 2)
		hotReloadAll = hotReload = true;

	if(proxyModel !== void 0) return;

	backupTemplate = {};
	backupCompTempl = new WeakMap();
	proxyModel = new WeakMap();
	proxyComponent = new WeakMap();
	proxyTemplate = {};
	proxySpace = new WeakMap(/*
		(Space) => {compName:[scopes]}
	*/);

	internalProp = {};
	['init', 'reinit', 'destroy', '$el'].forEach(function(val){
		internalProp[val] = true;
	});

	var templates = window.templates || {};
	Object.defineProperty(window, 'templates', {
		set: function(val){
			templates = val;
			hotTemplate(val);
		},
		get: function(){
			return templates;
		}
	});
}

function reapplyScope(proxy, space, scope, func){
	function refunction(prop, replacement){
		var proxier = proxy[prop];
		if(proxier === void 0){
			if(scope[prop] && scope[prop].ref !== void 0)
				proxier = proxy[prop] = scope[prop];
			else{
				proxier = proxy[prop] = function(){
					proxier.ref.apply(this, arguments);
				}
			}
		}

		if(proxier.protoFunc !== void 0)
			proxier.ref = replacement || proxier.ref;
		else
			proxier.ref = replacement || scope[prop];

		scope[prop] = proxier;
	}

	// Keep component's original scope for first time only
	if(func === void 0){
		for(var prop in scope){
			if(internalProp[prop] === true) // Skip function that related with framework
				continue;

			if(scope[prop].constructor === Function)
				refunction(prop);
		}
		return;
	}

	var enabled = true;
	func(new Proxy(scope, {set:function(obj, prop, val){
		// Skip function that related with framework
		// And skip if proxy is not enabled
		if(enabled === false || internalProp[prop] === true){
			obj[prop] = val;
			return true;
		}

		if(val.constructor === Function)
			refunction(prop, val);
		else if(obj[prop] === void 0 || hotReloadAll === true)
			obj[prop] = val; // Reassign non-function value

		return true;
	}}), space, (scope.$el && scope.$el.$item) || {});

	scope.hotReloaded && scope.hotReloaded(scope);
	enabled = false;
}

// On model scope reregistered
function hotModel(space, name, func){
	var scope = space(name);
	var proxy = proxyModel.get(scope);

	// If new model
	if(proxy === void 0 || !scope){
		proxy = {}; // we will only put function here
		proxyModel.set(scope, proxy);
	}

	reapplyScope(proxy, space, scope, func);
}

// On new component created
function hotComponentAdd(space, name, scope){
	var proxy = proxySpace.get(space);

	// If new space
	if(proxy === void 0){
		proxy = {};
		proxySpace.set(space, proxy);
	}

	var list = proxy[name];
	if(list === void 0)
		list = proxy[name] = [];

	list.push(scope);

	proxy = {};
	proxyComponent.set(scope, proxy);

	reapplyScope(proxy, scope, scope);
}

function hotComponentRemove(el){
	var proxy = proxySpace.get(el.sf$space);
	if(proxy === void 0)
		return;

	var list = proxy[el.sf$controlled];
	list.splice(list.indexOf(el.model), 1);
}

// On component scope reregistered
function hotComponentRefresh(space, name, func){
	var list = proxySpace.get(space);
	if(list === void 0 || list[name] === void 0)
		return;

	list = list[name];

	for (var i = 0; i < list.length; i++){
		var proxy = proxyComponent.get(list[i]);
		if(proxy === void 0){
			proxy = {};
			proxyComponent.set(list[i], proxy);
		}

		reapplyScope(proxy, space, list[i], func);
	}
}

// For views and component template
// The element will be destroyed and created a new one
// The scope will remain same, but init will be recalled

// Refresh views html and component
function hotTemplate(templates){
	var vList = sf.views.list;
	var changes = {};

	for(var path in templates){
		if(backupTemplate[path] === void 0 || backupTemplate[path] === templates[path])
			continue;

		var forComp = proxyTemplate[path]; // [space, name]
		if(forComp !== void 0){
			var registrar = forComp[0].registered[forComp[1]];
			if(registrar !== void 0 && registrar[3] !== void 0)
				sf.component.html(forComp[1], {template:path}, forComp[0]);

			continue;
		}

		// for views only
		changes[path] = true;
	}

	for(var name in vList){
		var routes = vList[name].routes;
		var sfPageViews = $('sf-page-view', vList[name].rootDOM);

		for (var i = 0; i < sfPageViews.length; i++) {
			var page = sfPageViews[i];
			var pageTemplate = page.sf$templatePath;
			if(pageTemplate === void 0 || changes[pageTemplate] === void 0)
				continue;

			page.innerHTML = templates[pageTemplate];

			page.routeCached.html = sf.dom.parseElement('<template>'+templates[pageTemplate]+'</template>', true)[0];

			// Replace with the old nested view
			var nesteds = page.sf$viewSelector;
			for(var nested in nesteds){
				var el = page.querySelector(nested);
				el.parentNode.replaceChild(nesteds[nested], el);
			}
		}
	}

	backupTemplate = Object.assign({}, templates);
}

// Refresh component html
function hotComponentTemplate(scope, name){
	var registrar = scope.registered[name];
	var newEl = scope.registered[name][3];

	if(backupCompTempl.has(registrar)){
		if(backupCompTempl.get(registrar).innerHTML === newEl.innerHTML)
			return;

		var freezed = registrar[2].slice(0); // freeze to avoid infinity loop if have any nest
		for (var z = 0; z < freezed.length; z++) {
			var model = freezed[z];
			var element = model.$el[0];

			var parentNode = element.parentNode;
			var nextNode = element.nextSibling;

			// Detach from DOM tree first
			if(parentNode !== null)
				element.remove();
			element.textContent = '';

			// Clear old DOM linker
			internal.model.removeModelBinding(model);

			if(registrar[3].constructor !== Object){
				var temp = registrar[3];
				var tempDOM = temp.tempDOM;

				temp = prepareComponentTemplate(temp, tempDOM, name, model, registrar);
				tempDOM = temp.tempDOM;
			}

			// Create new object, but using registrar[3] as prototype
			var copy = Object.create(temp);

			if(copy.parse.length !== 0){
				copy.parse = copy.parse.slice(0);

				// Deep copy the original properties to new object
				for (var i = 0; i < copy.parse.length; i++) {
					copy.parse[i] = Object.create(copy.parse[i]);
					copy.parse[i].data = [null, model];
				}
			}

			if(tempDOM === true)
				var parsed = internal.model.templateParser(copy, model, void 0, void 0, void 0, element);
			else{
				var parsed = internal.model.templateParser(copy, model);
				element.appendChild(parsed);
			}

			element.sf$elementReferences = parsed.sf$elementReferences;
			sf.model.bindElement(element, model, copy);

			// Put it back after children was ready
			if(parentNode !== null)
				parentNode.insertBefore(element, nextNode);
		}
	}

	backupCompTempl.set(registrar, newEl);
}