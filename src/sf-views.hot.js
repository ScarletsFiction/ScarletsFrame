// This file will be only loaded from sf-hot-reload.js
import {Views} from "./sf-views.js";
import {prevAll} from "./sf-dom.utils.js";

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

Views._$edit.reuseOldElem = function(now, old){
	let { children } = now;
	root:for (var i = children.length - 1; i >= 0; i--) {
		let temp = children[i];
		let { tagName } = temp;

		if(tagName === 'SF-TEMPLATE'){
			let child = old.childNodes;
			let path = temp.getAttribute('path');
			if(path === null) continue;

			for (var a = child.length - 1; a >= 0; a--) {
				if(child[a].sf$templatePath === path)
					now.insertBefore(child[a], temp);
			}

			temp.remove();
			continue root;
		}

		let firstChild = old.firstElementChild;
		let same = [];

		if(firstChild !== null){
			same = prevAll(firstChild, tagName, true); // true = nextAll

			if(firstChild.tagName === tagName)
				same.unshift(firstChild);
		}

		if(temp.childNodes.length === 0){
			for (var i = same.length - 1; i >= 0; i--) {
				let that = same[i];
				if(that.childNodes.length === 0 || that.model !== void 0){
					now.replaceChild(that, temp);
					break;
				}
			}

			continue root;
		}

		for (var i = same.length - 1; i >= 0; i--) {
			let that = same[i];
			if(temp.isEqualNode(that)){
				now.replaceChild(that, temp);
				continue root;
			}
		}

		let last = same[same.length-1];
		if(last.tagName === 'SF-M') continue;

		Views._$edit.reuseOldElem(temp, last);
	}
}