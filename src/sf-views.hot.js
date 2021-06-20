// This file will be only loaded from sf-hot-reload.js
import {Views} from "./sf-views.js";

Views._$edit =  function(selector, routes) {
	(Views.listSelector[selector] || new Views(selector)).addRoute(routes, true);
}