import "./shared.js";
import API from "./sf-api.js";
import component from "./sf-component.js";
import $ from "./sf-dom.js";
import events from "./sf-events.js";
import hotReload from "./sf-hot-reload.js";
import language from "./sf-language.js";
import link from "./sf-link.js";
import loader from "./sf-loader.js";
import model, {getScope} from "./sf-model.js";
import request from "./sf-request.js";
import security from "./sf-security.js";
import Space from "./sf-space.js";
import URL from "./sf-url.js";
import Views from "./sf-views.js";
import Window from "./sf-window.js";
import internal from "./internal.js";
import {Obj} from "./sf-model/repeated-list.js";

if(window.sf$ === void 0)
	window.sf$ = {};

window.sf = {
	API,
	component,
	$,
	events,
	hotReload,
	language,
	link,
	loader,
	model,
	request,
	security,
	Space,
	URL,
	Views,
	Window,
	internal,
	getScope,
	Obj
};

export {
	API,
	component,
	$,
	events,
	hotReload,
	language,
	link,
	loader,
	model,
	request,
	security,
	Space,
	URL,
	Views,
	Window,
	internal,
	getScope,
	Obj
};

// import.meta.hot?.accept();