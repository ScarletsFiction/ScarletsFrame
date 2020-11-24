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
	<div class="sf-side-info {{ sideOpened ? 'opened' : ''}} {{ haveList ? 'have-list' : ''}}">
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

	$('body').on('pointermove', function(e){
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
			My.sideOpened = false;
		}, 3000);
	}
});

// sf-each-> sf-as-scope enabled
SFDevSpace.component('sf-model-info', {
	html:`
	<div>{{ name }}</div>
`
}, function(My, root){
	// My.name = $item.name;
});

// sf-each-> sf-as-scope enabled
SFDevSpace.component('sf-component-info', {
	html:`
	<div>{{ name }}</div>
`
}, function(My, root){
	// My.name = $item.name;
});

// sf-each-> sf-as-scope enabled
SFDevSpace.component('sf-space-info', {
	html:`
	<div>{{ name }}</div>
`
}, function(My, root){
	// My.name = $item.name;
});

// sf-each-> sf-as-scope enabled
SFDevSpace.component('sf-view-info', {
	html:`
	<div>Name: {{ name }}</div>
	<div>URL: {{ path }}</div>
	<div>Data: {{ data }}</div>
`
}, function(My, root){
	// My.path = $item.path;
});

// Add to body when DOM was finished loading
sf.dom(function(){
	$('body').append('<sf-space sf_devmode><sf-dev-mode/></sf-space>');
});

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

			if(frameList.length !== 0){
				component.message = "Frame Inspection Tools";
				component.sideOpenLock = true;
			}

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

				if(nested === 0){
					CF = model;
					El = modelEl;
				}
				else{
					window[`PF${nested}`] = model;
					window[`El${nested}`] = modelEl;
				}
			}

			for (var i = 0; i < frameList.length; i++)
				console.groupEnd();
		}
	}, {capture:true})
	.on('pointerup', preventAltCtrlClick, {capture:true})
	.on('click', preventAltCtrlClick, {capture:true});
});