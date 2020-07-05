// Allow direct function replacement to accelerate development
// Note: this feature will allocate more small memory and small slow down
// ToDo: Model, Component, Space, Views
var hotReloadAll = false; // All model property

var proxyModel, proxySpace, proxyComponent, proxyTemplate, internalProp;
var backupTemplate, backupCompTempl;

sf.hotReload = function(mode){
	if(hotReload) return;
	if(mode === 1)
		hotReload = true;
	else if(mode === 2)
		hotReloadAll = hotReload = true;

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

		if(proxier.ref === void 0)
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
	if(proxy === void 0)
		return;

	var list = proxy[el.sf$controlled];
	list.splice(list.indexOf(el.model), 1);
}

// On component scope reregistered
function hotComponentRefresh(space, name, func){
	var list = proxySpace.get(space)[name];

	if(list === void 0)
		return;

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
			var compTemp = forComp[0].registered[forComp[1]];
			if(compTemp !== void 0 && compTemp[3] !== void 0)
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

			// console.error('!!! views need reload', route, vList[name]);
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
	var compTemp = scope.registered[name];
	var newEl = scope.registered[name][3];

	if(backupCompTempl.has(compTemp)){
		if(backupCompTempl.get(compTemp).innerHTML === newEl.innerHTML)
			return;

		console.error('!!! component need reload', newEl.innerHTML);

		console.log(234234, scope.registered[name]);
	}

	backupCompTempl.set(compTemp, newEl);
}