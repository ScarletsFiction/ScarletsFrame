import {internal as Internal} from "../internal.js";
import {internal, emptyArray} from "../shared.js";
import {templateErrorInfo, _eP, applyParseIndex, parserForAttribute, templateExec} from "./a_utils.js";
import {parseElement, prevAll, childIndexes} from "../sf-dom.utils.js";
import {repeatedListBinding} from "./repeated-list.js";
import {bindInput} from "./input-bind.js";

export function templateParser(template, item, original, modelRef, rootHandler, copy, repeatListIndex, namespace){
	let html = original === true ? template.html : template.html.cloneNode(true);
	const { addresses } = template;

	try{
		var parsed;
		if(template.parse.length !== 0){
			parsed = new Array(template.parse.length);
			templateExec(template.parse, item, void 0, parsed, repeatListIndex);  //18ms
		}
		else parsed = emptyArray;
	}catch(e){
		templateErrorInfo(e, template.html, item, modelRef, template);
		throw e;
	}

	if(template.uniqPattern !== void 0)
		html.sf$repeatListIndex = repeatListIndex;

	if(copy !== void 0){
        copy.append(...html.childNodes);

		// Assign attributes
		const attr = html.attributes;
		for (var i = 0, n = attr.length; i < n; i++){
			const val = attr[i];
			copy.setAttribute(val.name, val.value);
		}

		html = copy;
	}

	const changesReference = [];
	const pendingInsert = [];

	changesReference.parsed = parsed;
	let registerRootEvent = !(rootHandler && rootHandler.sf$listListenerLock && rootHandler.sf$listListenerLock.has(template));

	// Find element where the data belongs to
	for (var i = 0; i < addresses.length; i++) {
		var ref = addresses[i];
		const current = childIndexes(ref.address, html); //26ms

		// Modify element attributes
		if(ref.nodeType === 1){
			parserForAttribute(current, ref.attributes, item, modelRef, parsed, changesReference, rootHandler, template, registerRootEvent); //26ms
			continue;
		}

		// Replace text node
		if(ref.nodeType === 3){
			changesReference.push({
				textContent:current,
				ref
			});

			if(ref.direct !== void 0){
				current.nodeValue = parsed[ref.direct]; //40ms
				continue;
			}

			// Below is used for multiple/dynamic data
			current.nodeValue = applyParseIndex(ref.value, ref.parse_index, parsed);
			continue;
		}

		// Replace dynamic node
		if(ref.nodeType === -1){
			const cRef = {
				dynamicFlag:current,
				direct:ref.parse_index,
				parentNode:current.parentNode,
				startFlag:ref.startFlag && childIndexes(ref.startFlag, html)
			};
			changesReference.push(cRef);

			// Pending element insert to take other element reference
			pendingInsert.push(cRef);
		}
	}

	// Save model item reference to node
	html.model = item;

	// Save reference to element
	if(changesReference.length !== 0){
		changesReference.template = template;
		html.sf$elementReferences = changesReference;
	}

	// html.sf$modelParsed = parsed;

	if(template.specialElement){
		if(template.specialElement.input){
			// Process element for input bind
			const specialInput = template.specialElement.input;
			const specialInput_ = new Array(specialInput.length);
			for (var i = 0; i < specialInput.length; i++) {
				var ref = specialInput[i];
				specialInput_[i] = {
					el:childIndexes(ref.addr, html),
					rule:ref.rule,
					id:ref.id,
				};
			}

			bindInput(specialInput_, item, template.mask, modelRef);
		}

		if(template.specialElement.repeat){
			// Process element for sf-each
			const specialRepeat = template.specialElement.repeat;
			const specialRepeat_ = new Array(specialRepeat.length);
			for (var i = 0; i < specialRepeat.length; i++) {
				var ref = specialRepeat[i];
				specialRepeat_[i] = {
					el:childIndexes(ref.addr, html),
					rule:ref.rule
				};
			}

			repeatedListBinding(specialRepeat_, item, namespace, template);
		}

		// Process element for sf-scope
		if(template.specialElement.scope)
			initPendingComponentScope(template.specialElement.scope, html);
	}

	// Run the pending element
	for (var i = 0; i < pendingInsert.length; i++) {
		var ref = pendingInsert[i];
		let tDOM = parsed[ref.direct];

		// Check if it's an HTMLElement
		if(tDOM.nodeType === 1){
			ref.parentNode.insertBefore(tDOM, ref.dynamicFlag);
			continue;
		}

		ref.dynamicFlag.currentHTML = tDOM;

		// Parse if it's not HTMLElement
		if(tDOM.length !== 0)
			tDOM = parseElement(tDOM);
		else tDOM = document.createTextNode(tDOM);

		for(var a = 0, n = tDOM.length; a < n; a++)
			ref.parentNode.insertBefore(tDOM[0], ref.dynamicFlag);
	}

	return html;
}

var disableAsync = false;
Internal.async = function(mode){
	animFrameMode = disableAsync = !mode;
}

export function syntheticReactiveArray(template, property, modelScope){
	const { bindList } = template;
	let elements = bindList.$EM.elements || bindList.$EM.parentChilds;

	if(elements === void 0 && bindList.$EM.list !== void 0){
		const list = bindList.$EM.list;
		for (let j = 0; j < list.length; j++) {
			elements = list[j];
			elements = elements.elements || elements.parentChilds;

			for (var i = 0, n=elements.length; i < n; i++)
				syntheticTemplate(elements[i], template, property, bindList[i]);
		}

		return;
	}

	for (var i = 0, n=elements.length; i < n; i++)
		syntheticTemplate(elements[i], template, property, bindList[i]);
}

var animFrameMode = false;
const animFrameStack = [];

var runFramePending = false;
function runFrameStack(){
	animFrameMode = true;
	for (var i = 0; i < animFrameStack.length; i++) {
		const t = animFrameStack[i];

		// if you want to know what is this
		// try to find "animFrameStack.push({" from your editor
		t.q.async = false;
		syntheticTemplate(t.w, t.e, t.r, t.t, true);
	}

	animFrameStack.length = 0;
	runFramePending = animFrameMode = false;
}

const C_zero = [0];
export function syntheticTemplate(element, template, property, item, asyncing){
	const changesReference = element.sf$elementReferences;

	var changes;
	if(property !== void 0){
		// Don't use abc?.def?.[prop] because it's not performant
		changes = (template.modelRef && template.modelRef[property]) || template.modelRefRoot[property];

		if(!changes || changes.length === 0){
			if(template.modelRefRoot_path.length === 1 && template.modelRefRoot_path[0].includes(property)){
				changes = C_zero;
			}
			else{
				console.log(element, template, property, item);
				console.error(`Failed to run syntheticTemplate because property '${property}' is not observed`);
				return false;
			}
		}
	}
	else if(template.parse.length === 0)
		return false;
	// else: Update all binding

	if(changesReference.parsed === void 0){
		if(template.parse.length !== 0)
			changesReference.parsed = new Array(template.parse.length);
		else changesReference.parsed = emptyArray;
	}

	const { parsed } = changesReference;
	const repeatListIndex = element.sf$repeatListIndex;

	if(!asyncing
	   && template.parse.length !== 0
	   && templateExec(template.parse, item, changes, parsed, repeatListIndex) === false)
		return;

	if(!asyncing && animFrameMode === false && disableAsync === false){
		if(changesReference.async === true)
			return;

		changesReference.async = true;

		// if you want to know what is this for
		// try to find "runFrameStack(" from your editor
		animFrameStack.push({q:changesReference, w:element, e:template, r:property, t:item});

		if(!runFramePending){
			runFramePending = true;
			requestAnimationFrame(runFrameStack);
		}
		return;
	}

	let haveChanges = false, temp;
	for (let i = 0; i < changesReference.length; i++) {
		const cRef = changesReference[i];

		if(cRef.dynamicFlag !== void 0){ // Dynamic data
			if(parsed[cRef.direct] !== void 0){
				let temp2 = parsed[cRef.direct];
				if(cRef.dynamicFlag.currentHTML === temp2)
					continue;

				const tDOM = parseElement(cRef.dynamicFlag.currentHTML = temp2);
				const tDOMLength = tDOM.length;
				const currentDOM = prevAll(cRef.dynamicFlag, cRef.startFlag);

				let z = tDOMLength;

				// Remove if over index
				if(tDOMLength < currentDOM.length) {
					for (var a = currentDOM.length-1; a >= tDOMLength; a--)
						currentDOM[a].remove();
				}

				// Replace if exist, skip if similar
				for (var a = 0; a < tDOMLength; a++) {
					if(!(a in currentDOM))
						break;

					z--;
					if(currentDOM[a].isEqualNode(tDOM[z]) === false)
						cRef.parentNode.replaceChild(tDOM[z], currentDOM[a]);
				}

				// Add if not exist
				for (; a < tDOMLength; a++)
					cRef.parentNode.insertBefore(tDOM[0], cRef.dynamicFlag);

				haveChanges = true;
			}
			continue;
		}

		if(cRef.ref.parse_index !== void 0) // Multiple
			temp = applyParseIndex(cRef.ref.value, cRef.ref.parse_index, parsed, template.parse, item, repeatListIndex);

		if(cRef.textContent !== void 0){ // Text only
			if(cRef.ref.parse_index !== void 0){ // Multiple
				if(cRef.textContent.nodeValue === temp) continue;
				cRef.textContent.nodeValue = temp;

				haveChanges = true;
				continue;
			}

			// Direct value
			temp = parsed[cRef.ref.direct];
			if(temp !== void 0){
				if(cRef.textContent.nodeValue === temp) continue;

				const ref_ = cRef.textContent;
				// Remove old element if exist
				if(ref_.sf$haveChilds === true){
					while(ref_.previousSibling && ref_.previousSibling.sf$childRoot === ref_)
						ref_.previousSibling.remove();
				}

				ref_.nodeValue = temp;
				haveChanges = true;
			}
			continue;
		}

		if(cRef.style !== void 0){ // Styles
			if(cRef.ref.parse_index === void 0)
				temp = parsed[cRef.ref.direct];

			// ToDo: Performance improvement with style[name] = value
			// instead of .cssText
			if(cRef.style.cssText === temp) continue;
			cRef.style.cssText = temp;
			haveChanges = true;
			continue;
		}

		if(cRef.class !== void 0){ // Class
			if(cRef.ref.parse_index === void 0)
				temp = parsed[cRef.ref.direct];

			if(cRef.class.value === temp) continue;
			cRef.class.value = temp;
			haveChanges = true;
			continue;
		}

		if(cRef.attribute !== void 0){ // Attributes
			const elem = cRef.attribute; // <- Can be Element/Attribute
			const refB = cRef.ref;

			if(refB.parse_index !== void 0 && elem.value === temp) // Multiple
				continue;

			// Direct value
			else if(refB.direct in parsed){
				temp = parsed[refB.direct];
				if(refB.raw){
					if(elem[refB.name] === temp) continue;
				}
				else if(elem.value == temp) continue; // non-strict compare
			}

			if(refB.raw)
				elem[refB.name] = temp;
			else if(refB.isValueInput)
				elem.value = temp;
			else if(refB.isCheckBox){
				if(elem.hasRL !== void 0) // ReactiveList
					elem.checked = elem.hasRL.includes(temp);
				else if(elem.hasRS !== void 0) // ReactiveSet
					elem.checked = elem.hasRS.has(temp);
				else elem.checked = elem.value === temp;

				elem.value = temp;
			}
			else{
				if(temp === null){
					if(cRef.exist){
						cRef.attributes.removeNamedItem(elem.name);
						cRef.exist = false;
						elem.nodeValue = '';
					}
				}
				else{
					if(!cRef.exist){
						cRef.attributes.setNamedItem(elem);
						cRef.exist = true;
					}

					elem.nodeValue = temp;
				}
			}

			haveChanges = true;
			continue;
		}
	}

	return haveChanges;
};