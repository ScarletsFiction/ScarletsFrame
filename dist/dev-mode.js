sf.dom(function(){
	var $ = sf.dom;
	$('body').on('click', function(e){
		if(e.ctrlKey && e.altKey){
			e.preventDefault();
			e.stopImmediatePropagation();
			e.stopPropagation();

			var nested = 0;

			var modelEl = e.target;
			while(modelEl = sf(modelEl, true)){
				const model = modelEl.model;
				const name = modelEl.sf$controlled;
				const ref = {
					script: modelEl.model.$el?.$scopeFunc || modelEl.sf$collection?.$scopeFunc
				};

				console.groupCollapsed(
				    (nested !== 0 ? `%c>> Parent frame (${nested})%c > ` : "%c>> Clicked frame%c > ") + (modelEl.sf$controlled || '{embedded template}')
				    , 'color:yellow', 'color:lightgreen',
					`\n${modelEl.sf$collection ? 'Component' : 'Model'}:`, modelEl.model,
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

				modelEl = modelEl.parentNode;
				nested++;
			};

			while(nested-- !== 0)
				console.groupEnd();
		}
	}, {capture:true});

	const shadowEl = $('<div style="top:0;left:0;background: #47a2ff54;pointer-events:none;position:fixed"></div>');
	$('body').append(shadowEl);

	let hasShadow = false;
	$('body').on('pointermove', function(e){
		if(e.ctrlKey && e.altKey){
			const el = sf(e.target, true);
			if(!el){
				if(hasShadow) shadowEl.css('display', 'none');
				return;
			}

			shadowEl.css('display', '');
			const Rect = el.getBoundingClientRect();
			shadowEl.css('transform', `translate(${Rect.x}px, ${Rect.y}px)`);
			shadowEl.css('width', `${Rect.width}px`);
			shadowEl.css('height', `${Rect.height}px`);
			hasShadow = true;
		}
		else if(hasShadow){
			shadowEl.css('display', 'none');
			hasShadow = false;
		}
	});
});