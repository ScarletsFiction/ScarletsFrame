import {toArray, parsePropertyPath, deepProperty} from "./utils.js";
import {$} from "./sf-dom.js";
import {parseElement} from "./sf-dom.utils.js";
import {SFOptions} from "./shared.js";

let SFTemplatePending = [];
let isWebLoaded = false;

$(function(){
	isWebLoaded = true;

	for(var i = 0; i < SFTemplatePending.length; i++)
		loadSFTemplate(SFTemplatePending[i]);

	SFTemplatePending = void 0;
});

export function loadSFTemplate(ref, targetNode){
	let path = ref.getAttribute('path')
	if(path === null){
		path = ref.getAttribute('get-path');

		if(path !== null) // below got undefined if not found
			path = deepProperty(window, parsePropertyPath(path));
	}

	var serve;
	if(path !== null){
		if(path !== void 0) {
			if(path.slice(0, 1) === '.' && targetNode.templatePath !== void 0)
				path = path.replace('./', targetNode.templatePath);

			serve = window.templates[path];
		}
	}
	else {
		path = ref.getAttribute('get-html');
		serve = deepProperty(window, parsePropertyPath(path));
	}

	if(serve === void 0){
		console.log(ref, 'Template path was not found', path);
		console.log("Please check on 'window.templates'");
		ref.remove();
		return;
	}

	// Need a copy with Array.from
	serve = toArray(parseElement(serve));

	if(SFOptions.hotReload){
		for (var i = 0; i < serve.length; i++)
			serve[i].sf$templatePath = path;

		ref.parentNode.classList.add('sf-h-tmplt');
	}

	$(serve).insertBefore(ref.nextSibling || ref);
	ref.remove();
}

// Define sf-template element
class SFTemplate extends HTMLElement {
	constructor(){
		super();

		if(isWebLoaded === false){
			SFTemplatePending.push(this);
			return;
		}

		loadSFTemplate(this);
	}
}

customElements.define('sf-template', SFTemplate);