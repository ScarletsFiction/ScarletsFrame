// For browser interface
var SFDevSpace = new sf.space('sf_devmode');
var SFDevMode = SFDevSpace.component('sf-dev-mode', {
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
		<div class="title">{{ message }}</div>
		<div class="list-title {{ spaceList }}">Space List</div>
		<div class="space-list list {{ spaceList }}">
			<sf-space-info sf-each="val in spaces" sf-as-scope/>
		</div>
		<div class="list-title {{ modelList }}">Model List</div>
		<div class="model-list list {{ modelList }}">
			<sf-model-info sf-each="val in models" sf-as-scope/>
		</div>
		<div class="list-title {{ componentList }}">Component List</div>
		<div class="component-list list {{ componentList }}">
			<sf-component-info sf-each="val in components" sf-as-scope/>
		</div>
		<div class="list-title {{ viewList }}">Views Info</div>
		<div class="view-list list {{ viewList }}">
			<sf-view-info sf-each="val in views" sf-as-scope/>
		</div>
	</div>`
}, function(My){
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

	var locking = false;
	$('body').on('pointermove', function(e){
		if(locking) return;
		if(e.ctrlKey && e.altKey){
			const el = sf(e.target, true);
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
		while(modelEl = sf(modelEl, true)){
			(modelEl.sf$collection ? componentList : modelList).push({
				name: modelEl.sf$controlled || '{embedded template}',
				nested,
				model: modelEl.model,
				modelEl,
				ref: {
					script: modelEl.model.$el?.$scopeFunc || modelEl.sf$collection?.$scopeFunc
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
				pages:parent.sf$cachedDOM,
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
sf.dom(function(){
	// Create sf-dev-mode component inside of sf_devmode space
	// Then append it in the body
	sf.dom('body').append(`
<sf-space sf_devmode>
	<sf-dev-mode></sf-dev-mode>
	<div class="sf-viewer"></div>
</sf-space>`);
});

// sf-each-> sf-as-scope enabled
SFDevSpace.component('sf-model-info', {
	html:`
	<div @click="clicked">{{ name }}</div>
`
}, function(My, root){
	// My.name = $item.name;
	My.clicked = function(){
		SFDevSpace.addDynamicView(My.name, My.model, My);
	}
});

// sf-each-> sf-as-scope enabled
SFDevSpace.component('sf-component-info', {
	html:`
	<div @click="clicked">{{ name }}</div>
`
}, function(My, root){
	// My.name = $item.name;
	My.clicked = function(){
		SFDevSpace.addDynamicView(My.name, My.model, My);
	}
});

// sf-each-> sf-as-scope enabled
SFDevSpace.component('sf-space-info', {
	html:`
	<div @click="clicked">{{ name }}</div>
`
}, function(My, root){
	// My.name = $item.name;
	My.clicked = function(){
		alert("SF.Space inspector haven't finished yet");
	}
});

// sf-each-> sf-as-scope enabled
SFDevSpace.component('sf-view-info', {
	html:`
	<div @click="clicked">Name: {{ name }}</div>
	<div>URL: {{ path }}</div>
	<div>Data: {{ data }}</div>
`
}, function(My, root){
	// My.path = $item.path;
	My.clicked = function(){
		alert("SF.Views inspector haven't finished yet");
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

// Dynamic HTML Template
SFDevSpace.component('sf-model-viewer', function(My, include){
	// My.titles;
	// My.model;

	const Shadows = include('sf.shadows');

	My.state = 'reactive';

	My.x = 210;
	My.y = 100;

	My.dragmove = function(e){
		My.x += e.movementX;
		My.y += e.movementY;
	}

	My.hoverLeaving = function(e){
		Shadows.shadows.length && Shadows.shadows.splice(0);
	}

	My.transferToConsole = function(){
		window.Q = My.model;
		console.log("%cwindow.Q >>", 'color:yellow', My.model);
	}

	My.close = function(e){
		e.target.parentNode.remove();
		window.Q = void 0;
	}

	My.hoverReactive = function(e){
		var propName = e.target.innerHTML;
		var bindedKey = My.model.sf$bindedKey[propName];

		const elList = [];
		for (var i = 0; i < bindedKey.length; i++) {
			var current = bindedKey[i];
			if(current.element === void 0
			   || current.prop && current.prop.indexOf('model.') === 0)
				continue;

			elList.push(current.element);
		}

		if(bindedKey.input)
			elList.push.apply(elList, bindedKey.input);

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
		window.Q = My.model[propName];
		console.log('%cwindow.Q >>', 'color:yellow', My.model[propName]);
		SFDevSpace.addDynamicView(My.titles.concat(propName), window.Q);
	}

	My.clickObject = function(e){
		var propName = $(e.target).prev('span').html();
		SFDevSpace.addDynamicView(My.titles.concat(propName), My.model[propName]);
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

		if(e.shiftKey){
			console.log(func());
			return;
		}

		window.Q = func;
		console.log('%cwindow.Q >>', 'color:yellow', propName);
	}
});

/* Warning!
	If you just found this technique and want to implement it
	for your production website, always make sure that the template
	can't be created by your user. (You must sanitize any user input!)
	Be careful when creating the template dynamically.
*/
SFDevSpace.addDynamicView = function(titles, model){
	const parent = sf.dom('sf-space .sf-viewer');
	var template = `<sf-model-viewer sf-as-scope style="
		transform: translate({{ x }}px, {{ y }}px);
	">
		<div class="title" @dragmove="dragmove">
			<span sf-each="val in titles">{{ val }}</span>
		</div>
		<div class="transfer" @click="transferToConsole">🧐</div>
		<div class="close" @click="close">x</div>
		<div class="switcher">
			<div class="item {{ state === 'reactive'}}" @click="state = 'reactive'">Reactive</div>
			<div class="item {{ state === 'passive'}}" @click="state = 'passive'">Passive</div>
			<div class="item {{ state === 'statelist'}}" @click="state = 'statelist'">List</div>
			<div class="item {{ state === 'object'}}" @click="state = 'object'">Object</div>
			<div class="item {{ state === 'function'}}" @click="state = 'function'">Function</div>
		</div>
		<div class="list-{{ state }}">`;

	var reactive = [];
	var passive = [];
	var statelists = []; // RepeatedList
	var objects = [];
	var functions = [];

	var bindedKey = model.sf$bindedKey || {};
	if(!bindedKey.sf$passive)
		bindedKey.sf$passive = {};

	for(var key in model){
		const type = typeof model[key];
		if(bindedKey[key] === true){
			statelists.push(key);
			continue;
		}

		const temp = isNaN(key) ? '.'+key+' ' : `[${key}]`;

		if(type === 'function')
			functions.push(temp);
		else if(type === 'object')
			objects.push(temp);
		else if(bindedKey[key] !== void 0 && !bindedKey.sf$passive[key])
			reactive.push(temp);
		else{
			bindedKey.sf$passive[key] = true;
			passive.push(temp);
		}
	}

	template += '<div class="reactive-list list">';

	for (var i = 0; i < reactive.length; i++)
		template += `<div class="reactive"><span @pointerleave="hoverLeaving" @pointerenter="hoverReactive">${reactive[i].slice(1, -1)}</span> : <textarea sf-bind="model${reactive[i]}"></textarea></div>`;

	template += '</div><div class="passive-list list">';

	for (var i = 0; i < passive.length; i++)
		template += `<div class="passive"><span>${passive[i].slice(1, -1)}</span> : <div class="value">{{ model${passive[i]} }}</div></div>`;

	template += '</div><div class="statelist-list list">';

	for (var i = 0; i < statelists.length; i++)
		template += `<div class="statelist"><span @pointerleave="hoverLeaving" @pointerenter="hoverStatelist">${statelists[i]}</span> : <div class="value" @click="clickStatelist">{ ... }</div></div>`;

	template += '</div><div class="object-list list">';

	for (var i = 0; i < objects.length; i++)
		template += `<div class="object"><span>${objects[i].slice(1, -1)}</span> : <div class="value" @click="clickObject">{{ model${objects[i]} }}</div></div>`;

	template += '</div><div class="function-list list"><div class="info">Shift+Click to execute</div>';

	for (var i = 0; i < functions.length; i++){
		var args = model[functions[i].slice(1, -1)];
		args = args.ref || args;

		if(args.length !== 0){
			const len = args;
			args = args.toString().split(')')[0].split('(')[1];
			if(args === void 0)
				args = '...'+len;
		}
		else args = '';

		template += `<div class="function ${functions[i].includes('$') && 'gray'}" @pointerdown="preventDefault" @click="clickFunction">${functions[i].slice(1, -1)}(<span>${args}</span>)</div>`;
	}

	template += '</div>';

	if(titles.constructor !== Array)
		titles = [titles];

	const el = $(template+"</div></sf-model-viewer>")[0];
	parent.append(el);
	el.sf$constructor({ titles, model }, SFDevSpace, true);

	if(reactive.length !== 0) el.model.state = 'reactive';
	else if(passive.length !== 0) el.model.state = 'passive';
	else if(statelists.length !== 0) el.model.state = 'statelist';
	else if(objects.length !== 0) el.model.state = 'object';
	else if(functions.length !== 0) el.model.state = 'function';
}

// For browser console
sf.dom(function(){
	var $ = sf.dom;
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