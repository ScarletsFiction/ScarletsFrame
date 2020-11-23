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
		<div class="list">
			<sf-model-info sf-each="val in models" sf-as-scope/>
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
	My.models = [];

	$('body').on('pointermove', function(e){
		if(e.ctrlKey && e.altKey){
			const el = sf(e.target, true);
			if(!el){
				My.hasShadow = false;
				My.message = "No Frame Detected";

				if(My.haveList){
					My.haveList = false;
					My.models.splice(0);
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
			My.message = "Inspecting Element";
			scanElementFrame(e);
		}
		else{
			if(My.sideOpenLock === false)
				My.models.splice(0);

			if(My.models.length === 0){
				My.haveList = false;
				My.sideOpened = false;
			}

			My.hasShadow = false;
		}
	});

	function scanElementFrame(e){
		var nested = 0;
		var frameList = [];

		var modelEl = e.target;
		while(modelEl = sf(modelEl, true)){
			frameList.push({
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

		My.models.assign(frameList);
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

// Add to body when DOM was finished loading
sf.dom(function(){
	$('body').append('<sf-space sf_devmode><sf-dev-mode/></sf-space>');
	console.log(SFDevMode[0]);
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
			const frameList = component.models;

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