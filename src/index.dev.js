// This will be compiled by Rollup to build minified and bundled module
// With hotreload and feature for development

import "./shared.js";
export {API} from "./sf-api.js";
export {hotReload} from "./sf-hot-reload.js";
export {model} from "./sf-model.js";
export {getScope} from "./utils.js";
export {component} from "./sf-component.js";
export {Space} from "./sf-space.js";
export {$} from "./sf-dom.js";
export {events} from "./sf-events.js";
export {language} from "./sf-language.js";
export {loader} from "./sf-loader.js";
export {request} from "./sf-request.js";
export {security} from "./sf-security.js";
export {URI} from "./sf-uri.js";
export {Views} from "./sf-views.js";
export {Window} from "./sf-window.js";
export {internal} from "./internal.js";
export {Obj} from "./sf-model/repeated-list.js";

// Auto turn on the inspector assistant
import {Inspector} from "./assistant/inspector.js";
setTimeout(()=> {
	$(function(){
		Inspector();
	});
}, 10);

// import.meta.hot?.accept();