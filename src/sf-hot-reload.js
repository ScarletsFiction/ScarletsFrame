// Allow direct function replacement to accelerate development
// Note: this feature will allocate more small memory and small slow down
// ToDo: Model, Component, Events, Space, Views
var hotReload = false;
var hotReloadAll = false; // All model property

var proxyModel, proxySpace, proxyComponent, internalProp = {};

sf.hotReload = function(mode){
	if(hotReload) return;
	if(mode === 1)
		hotReload = true;
	else if(mode === 2)
		hotReloadAll = hotReload = true;

	proxyModel = new WeakMap();
	proxyComponent = new WeakMap();
	proxySpace = new WeakMap(/*
		(Space) => {compName:[scopes]}
	*/);

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

	func(new Proxy(scope, {set:function(obj, prop, val){
		if(internalProp[prop] === true){ // Skip function that related with framework
			obj[prop] = val;
			return true;
		}

		if(val.constructor === Function)
			refunction(prop, val);
		else if(hotReloadAll === true)
			obj[prop] = val; // Assign non-function value

		return true;
	}}), space, (scope.$el && scope.$el.$item) || {});
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
	var list = proxy[el.sf$componentFrom];

	list.splice(list.indexOf(el.model), 1);
}

// On component scope reregistered
// ToDo: the third arguments need to be saved on model (currently using empty obj)
function hotComponentRefresh(space, name, func){
	var list = proxySpace.get(space)[name];

	for (var i = 0; i < list.length; i++){
		var proxy = proxyComponent.get(list[i]);
		if(proxy === void 0){
			proxy = {};
			proxyComponent.set(list[i], proxy);
		}

		reapplyScope(proxy, space, list[i], func);
	}
}

// Refresh views
function hotTemplate(templates){

}

// Refresh component html
function hotComponentTemplate(scope, name, newElement){

}