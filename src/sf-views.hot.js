// This file will be only loaded from sf-hot-reload.js
import {Views} from "./sf-views.js";
import {prevAll} from "./sf-dom.utils.js";

Views._$edit.refresh =  function(selector, routes, view) {
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

	Views._$edit.checkDetached();
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
		if(last !== void 0 && last.tagName === 'SF-M') continue;

		Views._$edit.reuseOldElem(temp, last);
	}
}

Views._$edit.checkDetached = function(){
	let { list } = Views;

	for(let key in list){
		let val = list[key];
		if(val.rootDOM != null && val.rootDOM.isConnected === false){
			let el = document.body.getElementsByTagName(val.rootDOM.tagName)[0];
			if(el === void 0)
				continue;

			el.parentNode.replaceChild(val.rootDOM, el);
			if(_sf_internal !== void 0 && _sf_internal.body_map !== void 0){
				let map = _sf_internal.body_map;
				for(let key2 in map){
					let val2 = map[key2];
					let i = val2.indexOf(el);

					if(i !== 0){
						val2[i] = val.rootDOM;
						break;
					}
				}
			}
		}
	}
}
