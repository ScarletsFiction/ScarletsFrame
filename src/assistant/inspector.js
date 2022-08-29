import {getScope, deepProperty} from "../utils.js";
import {Space} from "../sf-space.js";
import {loader} from "../sf-loader.js";
import {$} from "../sf-dom.js";
import {internal} from "../shared.js";
import {model as Model} from "../sf-model.js";
import {component as Component} from "../sf-component.js";
import {watch, unwatch} from "../sf-model/element-bind.js";

export function Inspector(){

// Return if there are another installed inspector
if(window.SFDevSpace) return;

let openedInspector = [];
let pendingOpenInspector = [];
let _saveInspector = 0;
var SFDevMode, SFDevSpace;

// Return if has root window
if(window.sf && window.sf.Window && window.sf.Window.root){
	SFDevSpace = window.SFDevSpace = window.sf.Window.root.window.SFDevSpace;

	if(SFDevSpace !== void 0){
		SFDevMode = SFDevSpace.component('sf-inspector');
		return initElement();
	}
}

internal.reopenInspector = JSON.parse(localStorage.sf$inspectStore || '[]');

internal.openInspector = function(saved){
	internal.reopenInspector.splice(internal.reopenInspector.indexOf(saved), 1);
	if(pendingOpenInspector !== false)
		return pendingOpenInspector.push(saved);

	if(saved.type === 'model'){
		let model = deepProperty(Model.root, saved.source);
		if(model === void 0)
			return console.log("Failed to reopen inspector for", saved.source);

		let ref = SFDevSpace.addModelView(saved.source, model, {
			x: saved.x,
			y: saved.y,
		}, saved.type, true);

		Object.assign(ref, saved.props)
	}
	else if(saved.type === 'component'){
		let model = Component(saved.source[0]);
		saved.source[0] = model[saved.index] === void 0 ? 0 : saved.index;
		model = deepProperty(model, saved.source);

		if(model === void 0)
			return console.log("Failed to reopen inspector for", saved.source);

		let ref = SFDevSpace.addModelView(saved.source, model, {
			x: saved.x,
			y: saved.y,
		}, saved.type, true);

		Object.assign(ref, saved.props)
	}
}

void function(){
	var path = $('script[src*="scarletsframe."]')[0];

	if(path === void 0 || path.src.includes('/scarletsframe@')){
		loader.css(['https://cdn.jsdelivr.net/npm/scarletsframe@latest/src/assistant/inspector.css'], 'low');
		return;
	}

	path = path.src.split('scarletsframe.')[0];
	loader.css([path+'inspector.css'], 'low');
}();

function sanitizeQuotes(text){
	return JSON.stringify(text).slice(1, -1);
}

// For browser interface
SFDevSpace = window.SFDevSpace = new Space('sf_devmode');
SFDevMode = SFDevSpace.component('sf-inspector', {
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
		<div class="list-title {{ !!spaces.length }}" title="Registered model and component in this space will be different from global or other space">Space List <span>🍱</span></div>
		<div class="space-list list {{ !!spaces.length }}">
			<sf-space-info sf-each="val in spaces" sf-as-scope></sf-space-info>
		</div>
		<div class="list-title {{ !!models.length }}" title="Shared model that can be used in multiple template">Model List <span>☘️🍀🌿</span></div>
		<div class="model-list list {{ !!models.length }}">
			<sf-model-info sf-each="val in models" sf-as-scope></sf-model-info>
		</div>
		<div class="list-title {{ !!components.length }}" title="Similar like model, instead of shared this will create new model scope for each component element. This can act like an empty shell, can be disposed or reused if being saved somewhere.">Component List <span>🌳💐🎄</span></div>
		<div class="component-list list {{ !!components.length }}">
			<sf-component-info sf-each="val in components" sf-as-scope></sf-component-info>
		</div>
		<div class="list-title {{ !!views.length }}" title="An element that have a router, this can be routed from the URL or script. Can be nested or created on any possible element.">Views Info <span>🍱⛺️🍂</span></div>
		<div class="view-list list {{ !!views.length }}">
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
	My.models = [];
	My.components = [];
	My.views = [];

	function clearArrays(){
		My.spaces.splice(0);
		My.models.splice(0);
		My.components.splice(0);
		My.views.splice(0);
		My.haveList = false;
	}

	My.close = function(){
		My.hasShadow = false;
		My.sideOpened = false;
		clearArrays();
	}

	var locking = false;
	var hasFocused = false;
	My.onBodyPointerMove = function(e){
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

			hasFocused = true;
		}
		else if(hasFocused){
			if(My.sideOpenLock === false)
				clearArrays();

			if(My.models.length === 0 && My.components.length === 0
			   && My.spaces.length === 0 && My.views.length === 0){
				My.haveList = false;
				My.sideOpened = false;
			}

			My.hasShadow = false;
		}
	}

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

		My.models.assign(modelList);
		My.components.assign(componentList);

		let _list = My.models;
		for (let i=0, n=_list.length; i < n; i++) {
			_list[i].inspectorInit();
		}

		_list = My.components;
		for (let i=0, n=_list.length; i < n; i++) {
			_list[i].inspectorInit();
		}

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
				data:current.routerData && {...current.routerData},
			};
		}

		try { My.views.assign(viewList); } catch {throw "Failed to inspect element"};
	}

	My.init = function(){
		setTimeout(()=> {
			if(My.hasShadow || My.haveList) return;
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
}, go(devPath, propName, rawText){
	window.___browserSync___.socket.emit('sf-open-source', [devPath, propName, rawText]);
}};

SFDevSpace.openEditor = function(model, propName){
	if(model.sf$resolveSrc !== void 0){
		let temp = model.sf$resolveSrc;
		if(temp.url == null || (temp.propName == null && temp.rawText == null))
			throw new Error("sf$resolveSrc have incorrect format");

		return SFDevSpace.openEditor_.go(temp.url, temp.propName, temp.rawText);
	}

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
	html:`<div @click="clicked" @pointerenter="enter" @pointerleave="leave">{{ name }} <span style="display: {{ !canInspect && 'none' }}" title="CTRL + Click to open into your text editor">📂</span></div>`
}, function(My, root){
	// My.name = $item.name;
	My.canInspect = false;
	My._lastModel = null;

	My.inspectorInit = function(){
		let model = My.model;
		if(My._lastModel === model || window.___browserSync___ == null) return;

		My.canInspect = model.sf$resolveSrc != null || model.sf$filePath != null;

		if(My.canInspect === false && model.$el != null){
			My.canInspect = model.$el.$devData != null || model.$el[0]?.sf$collection?.$devData != null;
		}

		My._lastModel = model;
	}

	My.clicked = function(e){
		My.leave();
		setTimeout(()=> {
			if(e.ctrlKey) return My.openEditor();
			SFDevSpace.addModelView(My.name, My.model, e, 'model');
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
	html:`<div @click="clicked" @pointerenter="enter" @pointerleave="leave">{{ name }} <span style="display: {{ !canInspect && 'none' }}" title="CTRL + Click to open into your text editor">📂</span></div>`
}, function(My, root){
	// My.name = $item.name;
	My.canInspect = false;
	My._lastModel = null;

	My.inspectorInit = function(){
		let model = My.model;
		if(My._lastModel === model || window.___browserSync___ == null) return;

		My.canInspect = model.sf$resolveSrc != null || model.sf$filePath != null;

		if(My.canInspect === false && model.$el != null){
			My.canInspect = model.$el.$devData != null || model.$el[0]?.sf$collection?.$devData != null;
		}

		My._lastModel = model;
	}

	My.clicked = function(e){
		My.leave();
		setTimeout(()=> {
			if(e.ctrlKey) return My.openEditor();
			SFDevSpace.addModelView(My.name, My.model, e, 'component');
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
	html:`<div @click="clicked" @pointerenter="enter" @pointerleave="leave">{{ name }} <span>({{ id }})</span></div>`
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

	if(obj === null) return 'null';
	if(obj === void 0) return 'undefined';

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
				return 'Fn()';
			return val;
		});
	}
	else if(obj instanceof Set){
		text += 'Set [';
		isArray = true;
		for(let val of obj){
			if(val instanceof HTMLElement)
				temp.push('<'+val.tagName.toLowerCase()+'>');
			if(typeof val === 'object')
				temp.push('{...}');
			if(typeof val === 'function')
				temp.push('Fn()');
			temp.push(val);
		}
	}
	else if(obj instanceof Map){
		text += 'Map {';
		for(let [key, val] of obj){
			if(val instanceof HTMLElement)
				temp.push(key+':<'+val.tagName.toLowerCase()+'>');
			if(typeof val === 'object')
				temp.push(key+':{...}');
			if(typeof val === 'function')
				temp.push(key+':Fn()');
			temp.push(val);
		}
	}
	else{
		text += '{';
		for(const key in obj){
			if(key.includes('$')) continue;
			if(obj[key] instanceof HTMLElement)
				temp.push(key+':<'+obj[key].tagName.toLowerCase()+'>');
			else if(typeof obj[key] === 'object')
				temp.push(key+':{...}');
			else if(typeof obj[key] === 'function')
				temp.push(key+':Fn()');
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

		if(e.type === 'pointerup') saveInspector();
	}

	My.on$state = saveInspector;

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
		SFDevSpace.addModelView(My.titles, My.model, {x:My.x, y:My.y}, My.viewerType);
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
		let list = My.types;
		let names = Object.getOwnPropertyNames(list);

		for (let i = 0; i < names.length; i++) {
			let key = names[i];
			if(key === 'sf$bindedKey') continue;

			let val = My.model[key];
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
		openedInspector.splice(openedInspector.indexOf(My), 1);
		saveInspector();
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

	let tracked = new Map();
	My.traceChanges = function(e){
		let el = $(e.target);
		if(el.hasClass('val-type'))
			el = el.parent();

		var propName = el.prev('.key').text();

		// Unwatch
		if(tracked.has(propName)){
			unwatch(My.model, propName, tracked.get(propName));
			tracked.delete(propName);
			el.removeClass('tracked').attr('title', '');
		}
		else{ // watch
			let oldVal = My.model[propName];
			let modelName = My.titles[My.titles.length-1];
			let handle = function(name, value){
				onTracedChanges(modelName, propName, oldVal, value);
				oldVal = value;
			}

			tracked.set(propName, handle);
			watch(My.model, propName, handle);
			el.addClass('tracked').attr('title', 'This property is tracked, you can view the data changes from the browser console.');
		}
	}

	My.hoverReactive = function(e){
		var propName = e.target.innerHTML;
		var bindedKey = My.model.sf$bindedKey[propName];

		const elList = [];

		if(bindedKey.elements){
			const ref = bindedKey.elements;
			for (var i = 0; i < ref.length; i++) {
				var current = ref[i];
				if(current.element === void 0){
					if(current.attribute !== void 0)
						elList.push(current.attribute.ownerElement);
					continue;
				}

				if(current.template.html !== void 0){
					const elRefs = current.element.sf$elementReferences;
					let temp = (current.template.modelRef && current.template.modelRef[propName]) || current.template.modelRefRoot[propName];

					if(temp != null)
						current = temp;
					else {
						['modelRef', 'modelRefRoot'].forEach(v => {
							if(temp != null) return;

							let path = v+'_path';
							if(current.template[path] != null){
								let list = current.template[path];
	
								for (let i = 0; i < list.length; i++) {
									let item = list[i];
									if(item[item.length-1] === propName){
										current = current.template[v][item.join('.')];
										break;
									}
								}
							}
						});
					}

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
		}

		if(bindedKey.input){
			const ref = bindedKey.input;
			for (var i = 0; i < ref.length; i++) {
				const temp = ref[i];
				if(temp.parentNode.classList.contains('reactive'))
					continue;

				elList.push(temp);
			}
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
		var propName = $(e.target).prev('.key').text();

		if(e.ctrlKey)
			return SFDevSpace.openEditor(My.model, propName);

		window.Q = My.model[propName];
		console.log('%cwindow.Q >>', 'color:yellow', My.model[propName]);
		SFDevSpace.addModelView(My.titles.concat(propName), window.Q, e, My.viewerType);
	}

	My.clickObject = function(e, obj){
		if(obj){
			if(typeof obj !== 'object' || obj === null) return;
			var propName = '{temporary object}';
			var that = obj;
		}
		else {
			var propName = $(e.target).prev('.key').text();
			var that = My.model[propName];
		}

		if(that instanceof HTMLElement){
			console.log('%cwindow.Q >>', 'color:yellow', that);
			return;
		}

		if(e.ctrlKey)
			return SFDevSpace.openEditor(My.model, propName);

		SFDevSpace.addModelView(My.titles.concat(propName), that, e, My.viewerType);
	}

	My.getAnyField = function(val){
		let data = '';
		if(My.model.$debugField !== void 0)
			data = My.model.$debugField + ':' + val[My.model.$debugField];
		else if(val.name !== void 0)
			data = 'name:' + val.name;
		else if(val.id !== void 0)
			data = 'id:' + val.id;
		else if(val._id !== void 0)
			data = '_id:' + val._id;
		return data.slice(0, 20) + '...';
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
			return console.log(func.call(My.model));

		if(e.ctrlKey)
			return SFDevSpace.openEditor(My.model, propName);

		if(e.altKey){
			if(func._traceRef != null){
				My.model[propName] = func._traceRef; // Reset
				target.style.color = '';
				return;
			}

			let tracer = My.model[propName] = function(){
				onTracedChanges(My.titles[My.titles.length-1], propName, 'call', arguments, true);
				func.apply(this, arguments);
			}

			tracer._traceRef = func;
			target.style.color = 'yellow';
			return;
		}

		window.Q = func;
		console.log('%cwindow.Q >>', 'color:yellow', propName+':', func);
	}
});

/* Warning!
	If you just found this technique and want to implement it
	for your production website, always make sure that the template
	can't be created by your user. You must sanitize any user input!
*/
SFDevSpace.addModelView = function(titles, model, ev, viewerType, dontSave=false){
	if(model === void 0) return;

	let isInsideData = model instanceof Set || model instanceof Array || model instanceof Map;

	const parent = $('sf-space .sf-viewer', ev.view?.document?.body || document.body);
	var template = `<sf-model-viewer sf-as-scope style="
		transform: translate({{ x }}px, {{ y }}px);
		z-index: {{ isEmpty === currentActive.panel ? 1 : 0 }};
	" @pointerenter="refreshTypes" @pointerleave="refreshTypes" @input="refreshInput">
		<div class="title" @dragmove="dragmove">
			<span sf-each="val in titles">{{ val }}</span>
		</div>
		<div class="transfer" @click="transferToConsole" title="Transfer to console, bring this object to browser console to let you inspect">🧐</div>
		<div class="sf-close" @click="close">x</div>
		<div class="switcher">
			<div class="item {{ state === 'reactive'}} {{ isEmpty.reactive }}" @click="state = 'reactive'">Reactive</div>
			<div class="item {{ state === 'passive'}} {{ isEmpty.passive }}" @click="state = 'passive'">Passive</div>
			<div class="item {{ state === 'statelist'}} {{ ${!isInsideData} && isEmpty.statelist }}" @click="state = 'statelist'">${isInsideData ? 'Content' : 'List'}</div>
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

	let deepBinding = bindedKey.sf$internal && bindedKey.sf$internal.deepBinding;
	for(var key in model){
		if(key.includes('sf$')) continue;

		let temp = model[key];
		if((key in bindedKey && bindedKey[key]._RL === true)
		   || (deepBinding && key in deepBinding)){
			if(temp instanceof Map)
				statelists.push({name:key, type:'Map'});
			else if(temp instanceof Set)
				statelists.push({name:key, type:'Set'});
			else if(temp instanceof Array)
				statelists.push({name:key, type:'Array'});
			else
				statelists.push({name:key, type:'Object'});
			continue;
		}

		const type = typeof temp;

		let firstChar = key.slice(0, 1);
		if(isNaN(firstChar)){
			if(/[^\p{L}\p{N}]/u.test(key))
				temp = `['${key}']`;
			else temp = '.'+key;
		}
		else temp = `['${key.split("'").join("\\'")}']`;

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

	// Sanitize it, to avoid being attacked if someone use
	// the development inspector on production environment
	passive = [...passive].map($.escapeText);
	functions = [...functions].map($.escapeText);
	reactive = reactive.map($.escapeText);
	objects = objects.map($.escapeText);

	for (var i = 0; i < statelists.length; i++)
		statelists[i][0] = $.escapeText(statelists[i][0]);

	function cleanPropName(key){
		if(key[0] === '.')
			return key.slice(1);
		return key.slice(2, -2);
	}

	template += '<div class="reactive-list list">';

	for (var i = 0; i < reactive.length; i++){
		let sanitized = sanitizeQuotes(reactive[i]);
		template += `<div class="reactive" @click="clickToEditor" title="Type: {{ types${sanitized} }}"><span class="key" @pointerleave="hoverLeaving" @pointerenter="hoverReactive">${cleanPropName(reactive[i])}</span><span>:</span><textarea sf-bind="model${sanitized}"></textarea><div class="val-type-c" @click.stop="traceChanges"><div class="val-type val-{{ types${sanitized} }}"></div></div></div>`;
	}

	template += '</div><div class="passive-list list">';

	for (var i = 0; i < passive.length; i++){
		let sanitized = sanitizeQuotes(passive[i]);
		template += `<div class="passive" @click="clickToEditor" title="Type: {{ types${sanitized} }}"><span class="key">${cleanPropName(passive[i])}</span><span>:</span><div class="value">{{ model${sanitized} }}</div><div class="val-type-c" @click.stop="traceChanges"><div class="val-type val-{{ types${sanitized} }}"></div></div></div>`;
	}

	template += '</div><div class="statelist-list list">';

	if(isInsideData){
		template += `<div style="text-align:center;display: {{ model.${model instanceof Array ? 'length':'size'} === 0 ? 'block' : 'none'}}">Empty content...</div><div>`;
		template += `<div sf-each="key, val in model" class="statelist"><span class="key">{{ key == null ? '#' : key }}</span><span>:</span><div class="value" @click="clickObject(event, val)">{{ typeof val === "object" && val != null ? (
			'{'+ getAnyField(val) + '}'
		) : val }}</div></div>`;
		template += '</div>';
	}
	else if(model){
		var val;
		for (var i = 0; i < statelists.length; i++){
			let {name, type} = statelists[i];

			if(type === 'Array')
				val = `[...{{ model.${name}.length }}]`;
			else if(type === 'Set')
				val = `Set {...{{ model.${name}.size }}}`;
			else if(type === 'Map')
				val = `Map {...{{ model.${name}.size }}}`;
			else
				val = '{...}';

			template += `<div class="statelist" @click="clickStatelist"><span class="key" @pointerleave="hoverLeaving" @pointerenter="hoverStatelist">${name}</span><span>:</span><div class="value">${val}</div></div>`;
		}
	}

	template += '</div><div class="object-list list"><div class="info" @click="refreshObject">Click here to refresh</div>';

	for (var i = 0; i < objects.length; i++){
		if(objects[i].includes('(')) continue;
		let sanitized = sanitizeQuotes(objects[i]);
		template += `<div class="object" @click="clickObject"><span class="key">${cleanPropName(objects[i])}</span><span>:</span><div class="value">{{ objects${sanitized} || '{}' }}</div></div>`;
	}

	template += '</div><div class="function-list list"><div class="info" title="Ctrl + Click to open your editor, Alt + Click to log the call stack">Shift+Click to execute</div>';

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
	el.sf$constructor({ titles, model, viewerType }, SFDevSpace, true);
	el.connectedCallback();

	model = el.model;

	if(!model.registered){
		if(isInsideData) model.state = 'statelist';
		else if(reactive.length !== 0) model.state = 'reactive';
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

	if(!dontSave){
		openedInspector.push(model);
		saveInspector();
	}

	return model;
}

function saveInspector(){
	clearTimeout(_saveInspector);
	setTimeout(()=> {
		let list = [];
		that:for (var i = 0; i < openedInspector.length; i++) {
			let temp = openedInspector[i];
			let title = temp.titles.slice(0);

			if(temp.viewerType === 'model' || temp.viewerType === 'component'){
				if(title[0].includes('. '))
					title[0] = title[0].slice(title[0].indexOf('. ')+2);

				for (var a = 0; a < title.length; a++)
					if(title[a].slice(0, 1) === '{')
						continue that; // Don't save dynamic template/object

				let obj = {
					type: temp.viewerType,
					source: title,
					x: temp.x,
					y: temp.y,
					props: {
						state: temp.state
					}
				};

				if(temp.viewerType === 'component')
					obj.index = Component(title[0]).indexOf(temp.model);

				list.push(obj);
			}
		}

		localStorage.sf$inspectStore = JSON.stringify(list);
	}, 1000);
}

function onTracedChanges(name, property, old, now, isFunc){
	console.groupCollapsed(`%c${name} %c> ${property}:`, 'color:yellow', 'color:lightgreen',  old, '->', now);

	let stack = (new Error(1)).stack.split('\n');
	stack.splice(0, 2);

	if(isFunc){
		for (var i = 0; i < stack.length; i++) {
			if(stack[0].includes('.model.<computed> [as ')){
				stack.splice(0, 1);
				i--;
				break;
			}

			stack.splice(0, 1);
			i--;
		}
	}
	else {
		for (var i = 0; i < stack.length; i++) {
			stack.splice(0, 1);
			i--;

			if(stack[0].includes('.set ')){
				stack.splice(0, 1);
				i--;
				break;
			}
		}
	}

	console.log(`Error: stack trace obtained\n${stack.join('\n')}`);
	console.groupEnd();

	if(window.sf._debugTrace) debugger;
}

if(window.sf != null)
	window.sf._debugTrace = false;

initElement();
function initElement(){
	// Add to body when DOM was finished loading
	setTimeout(()=> {
		$(function(){
			// Create sf-inspector component inside of sf_devmode space
			// Then append it in the body
			$('body').append(`
		<sf-space sf_devmode style="display: none">
			<sf-inspector></sf-inspector>
			<div class="sf-viewer"></div>
		</sf-space>`);

			setTimeout(()=> {
				let that = pendingOpenInspector;
				pendingOpenInspector = false;

				if(!internal.openInspector) return;
				that.forEach(internal.openInspector);
			}, 100);

			function preventAltCtrlClick(e){
				if(e.ctrlKey && e.altKey){
					e.preventDefault();
					e.stopImmediatePropagation();
					e.stopPropagation();
				}
			}

			var component;
			for (var i = 0; i < SFDevMode.length; i++) {
				if(SFDevMode[i].$el[0].querySelector === Element.prototype.querySelector){
					component = SFDevMode[i];
					break;
				}
			}

			$('body').on('pointermove', e => component.onBodyPointerMove(e))
			.on('pointerdown', function(e){
				if(e.ctrlKey && e.altKey){
					e.preventDefault();
					e.stopImmediatePropagation();
					e.stopPropagation();

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
	}, 1);
}

SFDevSpace._listenAllEvent = listenAllEvent;
function listenAllEvent(el, callback){
	let list = [];
	for (let key in el) {
	    if(key.startsWith('on')) {
	        let name = key.slice(2);
	        el.addEventListener(name, callback);
	        list.push(name);
	    }
	}

	// Unlistener
	return function(){
		for (var i = 0; i < list.length; i++) {
			el.removeEventListener(list[i], callback);
		}
	}
}

};