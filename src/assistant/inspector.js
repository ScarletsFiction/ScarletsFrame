
// -- Only for ScarletsFiction Members --
// When editing the inspector.css make sure it's hardlinked
// ./inspector.css -> ../../dist/inspector.css

import {$, getScope, Space, loader} from "../index.js";

export default function(){

void function(){
	var path = $('script[src*="scarletsframe."]')[0];
	if(path === void 0){
		loader.css(['https://cdn.jsdelivr.net/npm/scarletsframe@latest/dist/inspector.css']);
		return;
	}

	path = path.src.split('scarletsframe.')[0];
	loader.css([path+'inspector.css']);
}();

// For browser interface
var SFDevSpace = new Space('sf_devmode');
window.SFDevSpace = SFDevSpace;
var SFDevMode = SFDevSpace.component('sf-inspector', {
	html:`
	<div class="sf-shadow-mark" style="
		display: {{ hasShadow ? '' : 'none' }};
		transform: translate({{ x }}px, {{ y }}px);
		width: {{ width }}px;
		height: {{ height }}px;
	"></div>
	<sf-m name="sf.shadows">
		<div sf-each="val in shadows" class="sf-shadow-mark" style="
			transform: translate({{ val.x }}px, {{ val.y }}px);
			width: {{ val.width }}px;
			height: {{ val.height }}px;
		"></div>
	</sf-m>
	<div class="sf-side-info
		{{ sideOpenLock ? 'locked' : ''}}
		{{ sideOpened ? 'opened' : ''}}
		{{ haveList ? 'have-list' : ''}}
	">
		<div class="sf-close" @click="close" style="
			display: {{ haveList ? '' : 'none'}}
		">x</div>
		<div class="title" title="Ctrl + Click on the list to open the source on your editor">{{ message }}</div>
		<div class="list-title {{ spaceList }}" title="Registered model and component in this space will be different from global or other space">Space List 🍱</div>
		<div class="space-list list {{ spaceList }}">
			<sf-space-info sf-each="val in spaces" sf-as-scope></sf-space-info>
		</div>
		<div class="list-title {{ modelList }}" title="Shared model that can be used in multiple template">Model List ☘️🍀🌿</div>
		<div class="model-list list {{ modelList }}">
			<sf-model-info sf-each="val in models" sf-as-scope></sf-model-info>
		</div>
		<div class="list-title {{ componentList }}" title="Similar like model, instead of shared this will create new model scope for each component element. This can act like an empty shell, can be disposed or reused if being saved somewhere.">Component List 🌳💐🎄</div>
		<div class="component-list list {{ componentList }}">
			<sf-component-info sf-each="val in components" sf-as-scope></sf-component-info>
		</div>
		<div class="list-title {{ viewList }}" title="An element that have a router, this can be routed from the URL or script. Can be nested or created on any possible element.">Views Info 🍱⛺️🍂</div>
		<div class="view-list list {{ viewList }}">
			<sf-view-info sf-each="val in views" sf-as-scope></sf-view-info>
		</div>
	</div>`
}, function(My){ // 💠
	My.hasShadow = false;
	My.x = My.y = 0;
	My.width = My.height = 0;
	My.sideOpened = true;
	My.sideOpenLock = false;
	My.haveList = false;
	My.message = "Development Mode Enabled";

	My.spaces = [];
	My.spaceList = false;
	My.models = [];
	My.modelList = false;
	My.components = [];
	My.componentList = false;
	My.views = [];
	My.viewList = false;

	function clearArrays(){
		My.spaces.splice(0);
		My.models.splice(0);
		My.components.splice(0);
		My.views.splice(0);
		My.spaceList = My.modelList = My.componentList = My.viewList = false;
		My.haveList = false;
	}

	My.close = function(){
		My.hasShadow = false;
		My.sideOpened = false;
		clearArrays();
	}

	var locking = false;
	$('body').on('pointermove', function(e){
		if(locking) return;
		if(e.ctrlKey && e.altKey){
			const el = getScope(e.target, true);
			if(!el){
				My.hasShadow = false;
				My.message = "No Frame Detected";

				if(My.haveList){
					My.haveList = false;
					clearArrays();
				}
				return;
			}

			const Rect = el.getBoundingClientRect();
			My.x = Rect.x;
			My.y = Rect.y;
			My.width = Rect.width;
			My.height = Rect.height;
			My.hasShadow = true;
			My.sideOpened = true;
			My.haveList = true;
			My.sideOpenLock = false;
			My.message = "Inspecting Element";
			scanElementFrame(e);
		}
		else{
			if(My.sideOpenLock === false)
				clearArrays();

			if(My.models.length === 0 && My.components.length === 0
			   && My.spaces.length === 0 && My.views.length === 0){
				My.haveList = false;
				My.sideOpened = false;
			}

			My.hasShadow = false;
		}
	});

	function scanElementFrame(e){
		var nested = 0;
		var modelList = [];
		var componentList = [];
		var spaceList = [];
		var viewList = [];

		// Model/Component
		var modelEl = e.target;
		var i = 1;
		while(modelEl = getScope(modelEl, true)){
			(modelEl.sf$collection ? componentList : modelList).push({
				name: (i++)+'. '+(modelEl.sf$controlled || '{embedded template}'),
				nested,
				model: modelEl.model,
				modelEl,
				ref: {
					script: modelEl.model.$el?.$devData || modelEl.sf$collection?.$devData
				},
			});

			modelEl = modelEl.parentNode;
			nested++;
		};

		My.modelList = My.models.length !== 0;
		My.models.assign(modelList);
		My.componentList = My.components.length !== 0;
		My.components.assign(componentList);

		// Space
		var spaces = $(e.target).parents('sf-space');
		spaceList.length = spaces.length;
		for (var i = 0; i < spaces.length; i++) {
			const current = spaces[i];
			spaceList[i] = {
				space:current.sf$space,
				name:current.sf$spaceName,
				id:current.sf$spaceID,
				element: current
			};
		}

		My.spaceList = My.spaces.length !== 0;
		My.spaces.assign(spaceList);

		// Space
		var views = $(e.target).parents('sf-page-view');
		viewList.length = views.length;
		for (var i = 0; i < views.length; i++) {
			const current = views[i];
			const parent = current.parentNode;
			viewList[i] = {
				pages:parent.sf$cachedDOM || parent.children,
				name:parent.tagName.toLowerCase(),
				path:current.routePath,
				ref:current.routeCached,
				data:current.routerData && (Object.assign({}, current.routerData)),
			};
		}

		My.viewList = My.views.length !== 0;
		My.views.assign(viewList);
	}

	My.init = function(){
		setTimeout(()=> {
			if(My.hasShadow) return;
			My.sideOpened = false;
		}, 3000);
	}

	My.locking = function(){
		My.message = "Frame Inspection Tools";
		My.sideOpenLock = true;
		My.hasShadow = false;
		locking = true;
		setTimeout(function(){
			locking = false;
		}, 1000);
	}
});

// Add to body when DOM was finished loading
setTimeout(()=> {
	$(function(){
		// Create sf-inspector component inside of sf_devmode space
		// Then append it in the body
		$('body').append(`
	<sf-space sf_devmode>
		<sf-inspector></sf-inspector>
		<div class="sf-viewer"></div>
	</sf-space>`);
	});
}, 1);

SFDevSpace.modelListHover = function($dom){
	if($dom[0] === void 0) return;
	$dom.addClass('sf-model-list-hover');
}

SFDevSpace.modelListHoverLeave = function($dom){
	if($dom[0] === void 0) return;
	$dom.removeClass('sf-model-list-hover');
}

// For model & component only
SFDevSpace.openEditor_ = {err(){
	console.error("Source path couldn't be found");
}, go(devPath, propName){
	window.___browserSync___.socket.emit('sf-open-source', [devPath, propName]);
}};

SFDevSpace.openEditor = function(model, propName){
	if(model.$el === void 0){
		if(model.sf$filePath === void 0)
			return SFDevSpace.openEditor_.err();

		function propOwnerPath(clas){
			var keys = Object.getOwnPropertyNames(clas.prototype);
			if(keys.includes(propName)) return clas.prototype.sf$filePath;

			var deep = Object.getPrototypeOf(clas);
			if(deep.prototype !== void 0)
				return propOwnerPath(deep);
			return model.sf$filePath;
		}

		return SFDevSpace.openEditor_.go('>'+propOwnerPath(model.constructor), propName);
	}

	var devData = model.$el.$devData;
	if(devData !== void 0)
		return SFDevSpace.openEditor_.go(devData.filePath, propName);

	if(model.$el[0].sf$collection === void 0)
		return SFDevSpace.openEditor_.err();

	var devData = model.$el[0].sf$collection.$devData;
	if(devData !== void 0)
		return SFDevSpace.openEditor_.go(devData.filePath, propName);

	SFDevSpace.openEditor_.err();
}

// sf-each-> sf-as-scope enabled
SFDevSpace.component('sf-model-info', {
	html:`<div @click="clicked" @pointerenter="enter" @pointerleave="leave">{{ name }}</div>`
}, function(My, root){
	// My.name = $item.name;
	My.clicked = function(e){
		My.leave();
		setTimeout(()=> {
			if(e.ctrlKey) return My.openEditor();
			SFDevSpace.addDynamicView(My.name, My.model, e);
		}, 20);
	}

	My.enter = function(){
		SFDevSpace.modelListHover(My.model.$el || $(My.modelEl));
	}

	My.leave = function(){
		SFDevSpace.modelListHoverLeave(My.model.$el || $(My.modelEl));
	}

	My.openEditor = function(){
		SFDevSpace.openEditor(My.model);
	}
});

// sf-each-> sf-as-scope enabled
SFDevSpace.component('sf-component-info', {
	html:`<div @click="clicked" @pointerenter="enter" @pointerleave="leave">{{ name }}</div>`
}, function(My, root){
	// My.name = $item.name;
	My.clicked = function(e){
		My.leave();
		setTimeout(()=> {
			if(e.ctrlKey) return My.openEditor();
			SFDevSpace.addDynamicView(My.name, My.model, e);
		}, 20);
	}

	My.enter = function(){
		SFDevSpace.modelListHover(My.model.$el);
	}

	My.leave = function(){
		SFDevSpace.modelListHoverLeave(My.model.$el);
	}

	My.openEditor = function(){
		SFDevSpace.openEditor(My.model);
	}
});

// sf-each-> sf-as-scope enabled
SFDevSpace.component('sf-space-info', {
	html:`<div @click="clicked" @pointerenter="enter" @pointerleave="leave">{{ name }}</div>`
}, function(My, root){
	// My.name = $item.name;
	My.clicked = function(){
		alert("sf.Space inspector haven't finished yet");
	}

	My.enter = function(){
		SFDevSpace.modelListHover($(My.element));
	}

	My.leave = function(){
		SFDevSpace.modelListHoverLeave($(My.element));
	}
});

// sf-each-> sf-as-scope enabled
SFDevSpace.component('sf-view-info', {
	html:`
	<div @pointerenter="enter" @pointerleave="leave" @click="clicked">
		<div>Name: {{ name }}</div>
		<div>URL: {{ path }}</div>
		<div>Data: {{ data }}</div>
	</div>
`
}, function(My, root){
	// My.path = $item.path;
	My.clicked = function(e){
		My.leave();
		setTimeout(()=> {
			if(e.ctrlKey) return My.openEditor();
			alert("sf.Views inspector haven't finished yet");
		}, 20);
	}

	function findCurrentPage(){
		for (var i = 0; i < My.pages.length; i++)
			if(My.pages[i].matches('.page-current'))
				return $(My.pages[i]);
	}

	My.enter = function(item){
		SFDevSpace.modelListHover(findCurrentPage());
	}

	My.leave = function(item){
		SFDevSpace.modelListHoverLeave(findCurrentPage());
	}

	My.openEditor = function(){
		var devData = My.pages[0].parentElement.scope.$devData;
		if(devData === void 0)
			return console.error("Source path couldn't be found");

		window.___browserSync___.socket.emit('sf-open-source', [devData.path[0], void 0, My.name]);
	}
});

SFDevSpace.model('sf.shadows', function(My){
	My.shadows = []; // x, y, width, height

	My.create = function(elList){
		if(elList.length === 0){
			if(My.shadows.length !== 0)
				My.shadows.splice(0);
			return;
		}

		for (var i = 0; i < elList.length; i++) {
			if(elList[i] === null)
				continue;

			const Rect = elList[i].getBoundingClientRect();
			elList[i] = {
				x:Rect.x,
				y:Rect.y,
				width:Rect.width,
				height:Rect.height,
			}
		}

		My.shadows.assign(elList);
	}
});

SFDevSpace.swallowObject = function(obj){
	if(obj instanceof HTMLElement)
		return '<'+obj.tagName.toLowerCase()+'>';

	var text = '';
	var isArray = obj instanceof Array;

	var temp = [];
	if(isArray){
		text += '[';
		temp = obj.map(val=> {
			if(val instanceof HTMLElement)
				return '<'+val.tagName.toLowerCase()+'>';
			if(typeof val === 'object')
				return '{...}';
			if(typeof val === 'function')
				return 'Function()';
			return val;
		});
	}
	else{
		text += '{';
		for(const key in obj){
			if(obj[key] instanceof HTMLElement)
				temp.push('<'+obj[key].tagName.toLowerCase()+'>');
			else if(typeof obj[key] === 'object')
				temp.push(key+':{...}');
			else if(typeof obj[key] === 'function')
				temp.push('Function()');
			else temp.push(key+':'+obj[key]);
		}
	}

	text += temp.join(', ');
	return text+(isArray ? ']' : '}');
}

SFDevSpace.currentActive = {panel:null};
SFDevSpace.reusableShells = new Map();

// Dynamic HTML Template
SFDevSpace.component('sf-model-viewer', function(My, include){
	// My.titles;
	// My.model;

	if(SFDevSpace.reusableShells.has(My.model))
		return SFDevSpace.reusableShells.get(My.model);

	const Shadows = include('sf.shadows');

	My.state = 'reactive';
	My.isEmpty = {};

	My.currentActive = SFDevSpace.currentActive;

	My.x = 210;
	My.y = 100;

	My.objects = {};
	My.types = {};

	My.dragmove = function(e){
		My.x += e.movementX;
		My.y += e.movementY;
		My.currentActive.panel = My.isEmpty;
	}

	My.init = function(){
		My.currentActive.panel = My.isEmpty; // This will trigger z-index: 1

		setTimeout(function(){
			My.refreshObject();
			My.refreshTypes();
			My.deepRegister();
		}, 1000);
	}

	My.initClone = function(zx){
		My.$el[0].remove();
	}

	My.recreate = function(){
		SFDevSpace.reusableShells.set(My.model, My);
		SFDevSpace.addDynamicView(My.titles, My.model, {x:My.x, y:My.y});
		SFDevSpace.reusableShells.delete(My.model);
	}

	My.registered = false;
	My.deepRegister = function(){
		if(My.registered) return;

		My.registered = true;
		var model = My.model;

		deepRegister(model.constructor);
		function deepRegister(clas){
			if(Object.getOwnPropertyNames(clas.prototype).includes('isPrototypeOf'))
				return;

			if(clas.sf$refresh === void 0)
				Object.defineProperty(clas, 'sf$refresh', {value:[]});

			clas.sf$refresh.push(My.recreate);

			var deep = Object.getPrototypeOf(clas);
			if(deep.prototype !== void 0)
				return deepRegister(deep);
		}

		if(typeof model !== 'object') return;

		if(model.sf$refresh === void 0)
			Object.defineProperty(model, 'sf$refresh', {value:[]});

		model.sf$refresh.push(My.recreate);
	}

	My.destroy = function(arg){
		if(My.$el.length > 1 || (My.$el[0] && My.$el[0].isConnected))
			return;

		My.registered = false;
		var model = My.model;

		deepUnregister(model.constructor);
		function deepUnregister(clas){
			if(Object.getOwnPropertyNames(clas.prototype).includes('isPrototypeOf'))
				return;

			if(clas.sf$refresh !== void 0)
				clas.sf$refresh.splice(clas.sf$refresh.indexOf(My.recreate), 1);

			var deep = Object.getPrototypeOf(clas);
			if(deep.prototype !== void 0)
				return deepUnregister(deep);
		}

		if(model.sf$refresh !== void 0)
			model.sf$refresh.splice(model.sf$refresh.indexOf(My.recreate), 1);
	}

	My.refreshObject = function(){
		const list = My.objects;
		for(const key in list)
			list[key] = SFDevSpace.swallowObject(My.model[key]);
	}

	My.hoverLeaving = function(e){
		Shadows.shadows.length && Shadows.shadows.splice(0);
	}

	My.refreshTypes = function(){
		const list = My.types;
		for(var key in list){
			const val = My.model[key];
			if(val == null){
				list[key] = '';
				continue;
			}

			list[key] = val.constructor.name;
		}
	}

	My.refreshInput = function(ev){
		const el = ev.target;
		if(el.typeData === String || el.typeData === Number) return;

		if(el.value === 'true')
			el.sfModel[el.sfBounded] = true;
		else if(el.value === 'false')
			el.sfModel[el.sfBounded] = false;
		else if(el.value === 'null')
			el.sfModel[el.sfBounded] = null;
		else if(el.value.length !== 0){
			const num = +el.value;
			if(!Number.isNaN(num))
				el.sfModel[el.sfBounded] = num;
		}

		My.refreshTypes();
	}

	My.transferToConsole = function(){
		window.Q = My.model;
		console.log("%cwindow.Q >>", 'color:yellow', My.model);
	}

	My.close = function(e){
		e.target.parentNode.remove();
		window.Q = void 0;
	}

	function isInArray(val, arr){
		for (var i = 0; i < val.length; i++)
			if(arr.includes(val[i]))
				return true;

		return false;
	}

	function getTheElement(elList, ref){
		if(ref.textContent !== void 0){
			const got = ref.textContent.parentNode;
			if(got === null)
				return console.error("Looks like an element was modified with DOM manipulation and framework element reference was detached.", {content: ref.textContent.textContent});

			elList.push(got);
		}
		else if(ref.element !== void 0)
			elList.push(ref.element);
		else if(ref.attribute !== void 0)
			elList.push(ref.attribute.ownerElement);
		else if(ref.parentNode !== void 0)
			elList.push(ref.parentNode);
	}

	My.clickToEditor = function(e){
		var propName = e.target.innerHTML;
		if(e.ctrlKey) return SFDevSpace.openEditor(My.model, propName);
	}

	My.hoverReactive = function(e){
		var propName = e.target.innerHTML;
		var bindedKey = My.model.sf$bindedKey[propName];

		const elList = [];
		for (var i = 0; i < bindedKey.length; i++) {
			var current = bindedKey[i];
			if(current.element === void 0){
				if(current.attribute !== void 0)
					elList.push(current.attribute.ownerElement);
				continue;
			}

			if(current.template.html !== void 0){
				const elRefs = current.element.sf$elementReferences;
				current = (current.template.modelRef && current.template.modelRef[propName]) || current.template.modelRefRoot[propName];

				for (var j = 0; j < elRefs.length; j++) {
					const ref = elRefs[j];
					if(ref.ref !== void 0){
						if(ref.ref.direct !== void 0){
							if(current.includes(ref.ref.direct))
								getTheElement(elList, ref);
						}
						else if(ref.ref.parse_index !== void 0){
							if(isInArray(ref.ref.parse_index, current))
								getTheElement(elList, ref);
						}
						continue;
					}

					if(ref.direct !== void 0){
						if(current.includes(ref.direct))
							getTheElement(elList, ref);
					}
					else if(ref.parse_index !== void 0){
						if(isInArray(ref.parse_index, current))
							getTheElement(elList, ref);
					}
				}
				break;
			}
			elList.push(current.element);
		}

		if(bindedKey.input)
		for (var i = 0; i < bindedKey.input.length; i++) {
			const temp = bindedKey.input[i];
			if(temp.parentNode.classList.contains('reactive'))
				continue;

			elList.push(temp);
		}

		Shadows.create(elList);
	}

	My.hoverStatelist = function(e){
		var propName = e.target.innerHTML;
		const EM = My.model[propName].$EM;
		const elList = [];

		if(EM.parentNode === void 0){
			for (var i = 0; i < EM.list.length; i++)
				elList.push(EM.list[i].parentNode);
		}
		else elList.push(EM.parentNode);

		Shadows.create(elList);
	}

	My.clickStatelist = function(e){
		var propName = $(e.target).prev('span').html();

		if(e.ctrlKey)
			return SFDevSpace.openEditor(My.model, propName);

		window.Q = My.model[propName];
		console.log('%cwindow.Q >>', 'color:yellow', My.model[propName]);
		SFDevSpace.addDynamicView(My.titles.concat(propName), window.Q, e);
	}

	My.clickObject = function(e){
		var propName = $(e.target).prev('span').html();
		var that = My.model[propName];

		if(that instanceof HTMLElement){
			console.log('%cwindow.Q >>', 'color:yellow', that);
			return;
		}

		if(e.ctrlKey)
			return SFDevSpace.openEditor(My.model, propName);

		SFDevSpace.addDynamicView(My.titles.concat(propName), that, e);
	}

	My.preventDefault = function(e){
		e.preventDefault();
	}

	My.clickFunction = function(e){
		var target = e.target.tagName !== 'SPAN' ? e.target : e.target.parentNode;
		var propName = target.firstChild.textContent.slice(0, -1);

		let func = My.model[propName];
		if(func.ref !== void 0)
			func = func.ref;

		if(e.shiftKey)
			return console.log(func());

		if(e.ctrlKey)
			return SFDevSpace.openEditor(My.model, propName);

		window.Q = func;
		console.log('%cwindow.Q >>', 'color:yellow', propName);
	}
});

/* Warning!
	If you just found this technique and want to implement it
	for your production website, always make sure that the template
	can't be created by your user. You must sanitize any user input!
*/
SFDevSpace.addDynamicView = function(titles, model, ev){
	if(model === void 0) return;

	const parent = $('sf-space .sf-viewer');
	var template = `<sf-model-viewer sf-as-scope style="
		transform: translate({{ x }}px, {{ y }}px);
		z-index: {{ isEmpty === currentActive.panel ? 1 : 0 }};
	" @pointerenter="refreshTypes" @pointerleave="refreshTypes" @input="refreshInput">
		<div class="title" @dragmove="dragmove">
			<span sf-each="val in titles">{{ val }}</span>
		</div>
		<div class="transfer" @click="transferToConsole">🧐</div>
		<div class="sf-close" @click="close">x</div>
		<div class="switcher">
			<div class="item {{ state === 'reactive'}} {{ isEmpty.reactive }}" @click="state = 'reactive'">Reactive</div>
			<div class="item {{ state === 'passive'}} {{ isEmpty.passive }}" @click="state = 'passive'">Passive</div>
			<div class="item {{ state === 'statelist'}} {{ isEmpty.statelist }}" @click="state = 'statelist'">List</div>
			<div class="item {{ state === 'object'}} {{ isEmpty.object }}" @click="state = 'object'">Object</div>
			<div class="item {{ state === 'function'}} {{ isEmpty.function }}" @click="state = 'function'">Function</div>
		</div>
		<div class="list-{{ state }}">`; // We will close <sf-model-viewer> later

	var reactive = [];
	var passive = new Set() // use Set to get the prototype too;
	var statelists = []; // ReactiveArray
	var objects = [];
	var functions = new Set(); // use Set to get the prototype too;

	var bindedKey = model.sf$bindedKey || {};
	if(!bindedKey.sf$passive)
		bindedKey.sf$passive = {};

	for(var key in model){
		if(key.includes('sf$')) continue;

		const type = typeof model[key];
		if(bindedKey[key] === true){
			statelists.push(key);
			continue;
		}

		const temp = isNaN(key[0]) ? '.'+key : `['${key.split("'").join("\\'")}']`;

		if(type === 'function')
			functions.add(temp);
		else if(type === 'object')
			objects.push(temp);
		else if(key in bindedKey && !bindedKey.sf$passive[key])
			reactive.push(temp);
		else{
			bindedKey.sf$passive[key] = true;
			passive.add(temp);
		}
	}

	function getDeepPrototype(clas){
		if(clas.prototype === void 0)
			return;

		var keys2 = Object.getOwnPropertyNames(clas.prototype);
		if(keys2.includes('isPrototypeOf')) return;

		for (var i = keys2.length - 1; i >= 0; i--) {
			const key = keys2[i];
			if(key.includes('sf$') || key === 'constructor') continue;

			const temp = isNaN(key[0]) ? '.'+key : `['${key.split("'").join("\\'")}']`;

			if(typeof model[key] === 'function')
				functions.add(temp);
			else
				passive.add(temp);
		}

		var deep = Object.getPrototypeOf(clas);
		if(deep.prototype !== void 0)
			getDeepPrototype(deep);
	}

	getDeepPrototype(model.constructor);

	passive = [...passive];
	functions = [...functions];

	function cleanPropName(key){
		if(key[0] === '.')
			return key.slice(1);
		return key.slice(2, -2);
	}

	template += '<div class="reactive-list list">';

	for (var i = 0; i < reactive.length; i++)
		template += `<div class="reactive" @click="clickToEditor" title="Type: {{ types${reactive[i]} }}"><span @pointerleave="hoverLeaving" @pointerenter="hoverReactive">${cleanPropName(reactive[i])}</span> : <textarea sf-bind="model${reactive[i]}"></textarea><div class="val-type val-{{ types${reactive[i]} }}"></div></div>`;

	template += '</div><div class="passive-list list">';

	for (var i = 0; i < passive.length; i++)
		template += `<div class="passive" @click="clickToEditor" title="Type: {{ types${passive[i]} }}"><span>${cleanPropName(passive[i])}</span> : <div class="value">{{ model${passive[i]} }}</div><div class="val-type val-{{ types${passive[i]} }}"></div></div>`;

	template += '</div><div class="statelist-list list">';

	for (var i = 0; i < statelists.length; i++)
		template += `<div class="statelist" @click="clickStatelist"><span @pointerleave="hoverLeaving" @pointerenter="hoverStatelist">${statelists[i]}</span> : <div class="value">[...{{ model.${statelists[i]}.length }}]</div></div>`;

	template += '</div><div class="object-list list"><div class="info" @click="refreshObject">Click here to refresh</div>';

	for (var i = 0; i < objects.length; i++){
		if(objects[i].includes('(')) continue;
		template += `<div class="object" @click="clickObject"><span>${cleanPropName(objects[i])}</span> : <div class="value">{{ objects${objects[i]} }}</div></div>`;
	}

	template += '</div><div class="function-list list"><div class="info" title="Ctrl + Click to open your editor">Shift+Click to execute</div>';

	for (var i = 0; i < functions.length; i++){
		var args = model[cleanPropName(functions[i])];
		args = args.ref || args;

		if(args.length !== 0){
			const len = args.length;
			args = args.toString().split(')')[0].split('(')[1] || '...'+len;
		}
		else args = '';

		template += `<div class="function ${functions[i].includes('$') && 'gray'}" @pointerdown="preventDefault" @click="clickFunction">${cleanPropName(functions[i])}(<span>${args}</span>)</div>`;
	}

	template += '</div>';

	if(titles.constructor !== Array)
		titles = [titles];

	const el = $(template+"</div></sf-model-viewer>")[0];
	parent.append(el);
	el.sf$constructor({ titles, model }, SFDevSpace, true);
	el.connectedCallback();

	model = el.model;

	if(!model.registered){
		if(reactive.length !== 0) model.state = 'reactive';
		else if(passive.length !== 0) model.state = 'passive';
		else if(statelists.length !== 0) model.state = 'statelist';
		else if(objects.length !== 0) model.state = 'object';
		else if(functions.length !== 0) model.state = 'function';
	}

	if(reactive.length === 0) model.isEmpty.reactive = 'empty';
	if(passive.length === 0) model.isEmpty.passive = 'empty';
	if(statelists.length === 0) model.isEmpty.statelist = 'empty';
	if(objects.length === 0) model.isEmpty.object = 'empty';
	if(functions.length === 0) model.isEmpty.function = 'empty';

	model.x = ev.x;
	model.y = ev.y;
}

// For browser console
$(function(){
	function preventAltCtrlClick(e){
		if(e.ctrlKey && e.altKey){
			e.preventDefault();
			e.stopImmediatePropagation();
			e.stopPropagation();
		}
	}

	$('body')
	.on('pointerdown', function(e){
		if(e.ctrlKey && e.altKey){
			e.preventDefault();
			e.stopImmediatePropagation();
			e.stopPropagation();

			var component = SFDevMode[0];
			const frameList = new Array(component.models.length + component.components.length);

			let temp = component.models;
			for (var i = 0; i < temp.length; i++)
				frameList[temp[i].nested] = temp[i];

			temp = component.components;
			for (var i = 0; i < temp.length; i++)
				frameList[temp[i].nested] = temp[i];

			if(frameList.length !== 0)
				component.locking();

			for (var i = 0; i < frameList.length; i++) {
				const frame = frameList[i];
				const {name, nested, modelEl, model, ref} = frame;
				console.groupCollapsed(
				    (nested !== 0 ? `%c>> Parent frame (${nested})%c > ` : "%c>> Clicked frame%c > ") + name
				    , 'color:yellow', 'color:lightgreen',
					`\n${modelEl.sf$collection ? 'Component' : 'Model'}:`, model,
					"\nElement:", modelEl,
					"\nReferences:", ref
				);
			}

			for (var i = 0; i < frameList.length; i++)
				console.groupEnd();
		}
	}, {capture:true})
	.on('pointerup', preventAltCtrlClick, {capture:true})
	.on('click', preventAltCtrlClick, {capture:true});
});

};