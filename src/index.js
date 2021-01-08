console.log('hello');

import "./shared.js";
import API from "./sf-api.js";
import Component from "./sf-component.js";
import $ from "./sf-dom.js";
import Events from "./sf-events.js";
import HotReload from "./sf-hot-reload.js";
import Language from "./sf-language.js";
import Link from "./sf-link.js";
import Loader from "./sf-loader.js";
import Model from "./sf-model.js";
import Request from "./sf-request.js";
import Security from "./sf-security.js";
import Space from "./sf-space.js";
import URL from "./sf-url.js";
import Views from "./sf-views.js";
import Window from "./sf-window.js";

if(window.sf$ === void 0)
	window.sf$ = {};

window.sf = {
	API,
	Component,
	$,
	Events,
	HotReload,
	Language,
	Link,
	Loader,
	Model,
	Request,
	Security,
	Space,
	URL,
	Views,
	Window,
};

export {
	API,
	Component,
	$,
	Events,
	HotReload,
	Language,
	Link,
	Loader,
	Model,
	Request,
	Security,
	Space,
	URL,
	Views,
	Window,
};

// import.meta.hot?.accept();