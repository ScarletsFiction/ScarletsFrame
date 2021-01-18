// This will be compiled by Rollup to build minified and bundled module
// With hotreload and feature for development

import "./shared.js";
import API from "./sf-api.js";
import hotReload from "./sf-hot-reload.js";
import model, {getScope} from "./sf-model.js";
import component from "./sf-component.js";
import Space from "./sf-space.js";
import $ from "./sf-dom.js";
import events from "./sf-events.js";
import language from "./sf-language.js";
import loader from "./sf-loader.js";
import request from "./sf-request.js";
import security from "./sf-security.js";
import URI from "./sf-uri.js";
import Views from "./sf-views.js";
import Window from "./sf-window.js";
import internal from "./internal.js";
import {Obj} from "./sf-model/repeated-list.js";
import Inspector from "./assistant/inspector.js";

export {
	API,
	hotReload,
	model,
	component,
	Space,
	$,
	events,
	language,
	loader,
	request,
	security,
	URI,
	Views,
	Window,
	internal,
	getScope,
	Obj,
};

// Auto turn on the inspector assistant
setTimeout(()=> {
	$(function(){
		Inspector();
	});
}, 10);

// import.meta.hot?.accept();