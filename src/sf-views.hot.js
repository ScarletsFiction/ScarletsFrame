// This file will be only loaded from sf-hot-reload.js
import {Views} from "./sf-views.js";

Views._$edit =  function(selector, routes) {
	let view = (Views.listSelector[selector] || new Views(selector));
	view.addRoute(routes, true);

	let {children} = view.rootDOM;
	let {relatedDOM} = view;

	for (var i = 0, len = children.length; i < len; i++) {
		let temp = children[i];

		if(view.currentDOM && temp.routePath === view.currentDOM.routePath)
			view.currentDOM = temp;
		if(view.lastDOM && temp.routePath === view.lastDOM.routePath)
			view.lastDOM = temp;
		if(view.lastSibling && temp.routePath === view.lastSibling.routePath)
			view.lastSibling = temp;
		if(view.showedSibling && temp.routePath === view.showedSibling.routePath)
			view.showedSibling = temp;

		for (let n = 0; n < relatedDOM.length; n++) {
			let related = relatedDOM[n];

			if(related.isConnected)
				continue;

			if(temp.routePath === related.routePath){
				relatedDOM[n] = temp;
				relatedDOM.splice(n+1);
				break;
			}

			relatedDOM.splice(n);
			break;
		}
	}
}