import {findBindListElement} from "./sf-model.js";

export function sf(el, returnNode){
	if(el === void 0)
		el = $0;

	// If it's Node type
	if(el.tagName !== void 0){
		if(el.sf$controlled === void 0 && !(el.sf$elementReferences && el.sf$elementReferences.template.bindList))
			el = findBindListElement(el, true);

		if(el === null)
			return el;

		if(returnNode)
			return el;
		return el.model;
	}
};