// ToDo: extract style attribute and use direct change into the CSS Style instead of modify attribute

// For contributor of this library
// Please be careful when you're passing the eval argument
// .apply() or spread ...array is slower than direct function call
// object[0] is slower than array[0]

import {sfRegex, internal, emptyArray} from "../shared.js";
import {parseElement, getSelector} from "../sf-dom.utils.js";
import {SFPageView} from "../sf-views-page.js";
import {bindElement} from "./element-bind.js";
import {loadSFTemplate} from "../sf-template.js";
import {$} from "../sf-dom.js";
import {ModelInternal, REF_DIRECT, REF_IF, REF_EXEC, templateParser_regex, templateParser_regex_split} from "./a_shared.js";
import {parseIndexAllocate, modelScript, templateErrorInfo, escapeParse, trimIndentation, templateExec, parserForAttribute} from "./a_utils.js";
import {modelKeys as getModelKeys, toArray, stringifyPropertyPath, avoidQuotes, parsePropertyPath, deepProperty} from "../utils.js";

// ToDo: directly create parse_index from here
function dataParser(html, _model_, template, _modelScoped, preParsedReference, justName){
	const preParsed = [];
	const lastParsedIndex = preParsedReference.length;

	const prepared = html.replace(sfRegex.dataParser, function(actual, temp){
		// Unescape HTML
		temp = temp.split('&amp;').join('&').split('&lt;').join('<').split('&gt;').join('>');

		temp = avoidQuotes(temp, function(temp_){
			// Mask item variable
			if(template.modelRef_regex !== void 0)
				temp_ = temp_.replace(template.modelRef_regex, (full, left, right)=> `${left}_model_${right}`);

			// Mask model for variable
			return temp_.replace(template.modelRefRoot_regex.v, (full, before, matched)=> `${before}_modelScope.${matched}`);
		});

		temp = temp.trim();

		// Simplicity similar
		const exist = preParsed.indexOf(temp);

		if(exist === -1){
			preParsed.push(temp);
			if(justName === true)
				preParsedReference.push(temp);
			else
				preParsedReference.push({type:REF_DIRECT, data:_modelScoped, check:temp});
			return `{{%=${preParsed.length + lastParsedIndex - 1}%`;
		}
		return `{{%=${exist + lastParsedIndex}%`;
	});

	return prepared;
}

// Dynamic data parser
function uniqueDataParser(html, template, _modelScoped){
	// Build script preparation
	html = html.replace(sfRegex.allTemplateBracket, function(full, matched){ // {[ ... ]}
		if(sfRegex.anyCurlyBracket.test(matched) === false) // {{ ... }}
			return `_result_ += ${JSON.stringify(matched.trim())};`;

		const vars = [];
		matched = JSON.stringify(dataParser(matched, null, template, _modelScoped, vars, true));

		if(vars.length !== 0)
			return `_result_ += "${escapeParse(matched.slice(1, -1), vars)}";`;

		return `_result_ += ${matched};`;
	}).replace(/;{2,}/g, ';');

	const preParsedReference = [];
	const prepared = html.replace(sfRegex.uniqueDataParser, function(actual, temp){
		// Unescape HTML
		temp = temp.split('&amp;').join('&').split('&lt;').join('<').split('&gt;').join('>');

		temp = avoidQuotes(temp, function(temp_){
			// Mask item variable
			if(template.modelRef_regex !== void 0)
				temp_ = temp_.replace(template.modelRef_regex, (full, left, right)=> `${left}_model_${right}`);

			// Mask model for variable
			return temp_.replace(template.modelRefRoot_regex.v, (full, before, matched)=> `${before}_modelScope.${matched}`);
		});

		let check = false;
		check = temp.split('@if ');
		if(check.length !== 1){
			check = check[1].split(':');

			const condition = check.shift();
			const elseIf = findElse(check);
			elseIf.type = REF_IF;
			elseIf.data = _modelScoped;

			// Trim Data
			elseIf.if = {cond:condition.trim(), val:elseIf.if.trim()};
			if(elseIf.elseValue !== null)
				elseIf.elseValue = elseIf.elseValue.trim();

			for (let i = 0; i < elseIf.elseIf.length; i++) {
				const ref = elseIf.elseIf[i];
				ref.cond = ref.cond.trim();
				ref.val = ref.val.trim();
			}

			// Push data
			preParsedReference.push(elseIf);
			return `{{%%=${preParsedReference.length - 1}`;
		}

		// Warning! Avoid unencoded user inputted content
		// And always check/remove closing ']}' in user content
		check = temp.split('@exec');
		if(check.length !== 1){
			preParsedReference.push({type:REF_EXEC, data:_modelScoped, check:check[1]});
			return `{{%%=${preParsedReference.length - 1}`;
		}
		return '';
	});

	return [prepared, preParsedReference];
}

// {ifCond, elseIf:({ifCond, val}, ...), elseValue}
function findElse(text){
	text = text.join(':');
	var else_ = null;

	// Split elseIf
	text = text.split('@elseif ');

	// Get else value
	var else_ = text[text.length - 1].split('@else');
	if(else_.length === 2){
		text[text.length - 1] = else_[0];
		else_ = else_.pop();
		else_ = else_.substr(else_.indexOf(':') + 1);
	}
	else else_ = null;

	const obj = {
		if:text.shift(),
		elseValue:else_
	};

	// Separate condition script and value
	obj.elseIf = new Array(text.length);
	for (let i = 0; i < text.length; i++) {
		const val = text[i].split(':');
		obj.elseIf[i] = {cond:val.shift(), val:val.join(':')};
	}

	return obj;
}

function addressAttributes(currentNode, template){
	const attrs = currentNode.attributes;
	const keys = [];
	let indexes = 0;

	const construct = (currentNode.constructor._ref || currentNode.constructor);
	const isCheckBox = construct === HTMLInputElement && currentNode.type === 'checkbox';
	const isValueInput = isCheckBox === false && (construct === HTMLTextAreaElement
	    || (construct === HTMLInputElement
	        && sfRegex.inputAttributeType.includes(currentNode.type) === false
	    )
	);

	for (let a = attrs.length - 1; a >= 0; a--) {
		const attr = attrs[a];
		let found = attr.value.includes('{{%=');
		if(attr.name.slice(0, 1) === '@'){
			// No template processing for this
			if(found){
				console.error("To avoid vulnerability, template mustn't being used inside of a eval-able element attributes", currentNode);
				continue;
			}

			if(template.modelRef_regex)
				attr.nodeValue = attr.value.replace(template.modelRef_regex, (full, left, right)=> `${left}_model_${right}`);

			keys.push({
				name:attr.name,
				value:attr.value.trim(),
				event:true
			});

			currentNode.removeAttribute(attr.name);
		}
		else if(attr.name.slice(0, 2) === 'on'){
			console.error("To avoid vulnerability, template mustn't being used inside of a eval-able element attributes", currentNode);
			continue;
		}

		if(found){
			const key = {value: attr.value.trim()};
			const symbol = attr.name.slice(0, 1);

			// To avoid the browser from parsing the attribute
			if(symbol === ':'){
				key.name = attr.name.slice(1);

				currentNode.removeAttribute(attr.name);
				currentNode.setAttribute(key.name, '');
			}
			// Raw element property binding
			else if(symbol === '_'){
				key.name = attr.name;
				key.raw = true;

				currentNode.removeAttribute(attr.name);
				currentNode.typeData = Object;
			}
			else{
				key.name = attr.name;

				if(key.name === 'class' || key.name === 'style')
					currentNode.removeAttribute(attr.name);
				else attr.nodeValue = '';
			}

			if(key.name === 'value'){
				if(isValueInput)
					key.isValueInput = isValueInput;

				if(isCheckBox){
					key.isCheckBox = isCheckBox;
					currentNode.typeData = Object;
				}
			}

			indexes = [];
			found = key.value.replace(templateParser_regex, function(full, match){
				indexes.push(Number(match));
				return '';
			});

			if(found === '' && indexes.length === 1){
				key.direct = indexes[0];
				delete key.value;

				if(key.raw === true)
					template.parse[key.direct].type = REF_EXEC; // Raw data flag
			}
			else{
				key.parse_index = indexes;
				key.value = key.value.replace(/[\t\r\n]/g, '').replace(/ {2,}/g, ' ').split(templateParser_regex_split);
				parseIndexAllocate(key.value);
			}

			keys.push(key);
		}
	}
	return keys;
}

function toObserve(full, model, properties){
	if(properties === 'constructor') return full;
	
	const place = model === '_model_' ? toObserve.template.modelRef : toObserve.template.modelRefRoot;

	// Simplify: model['stuff'] => model.stuff
	if(properties.includes('['))
		properties = stringifyPropertyPath(parsePropertyPath(properties));

	// Get property name
	if(!(properties in place)){
		place[properties] = [toObserve.template.i];

		if(place === toObserve.template.modelRef)
			toObserve.template.modelRef_path.push(parsePropertyPath(properties));
		else
			toObserve.template.modelRefRoot_path.push(parsePropertyPath(properties));
	}
	else if(place[properties].includes(toObserve.template.i) === false)
		place[properties].push(toObserve.template.i);

	return full;
}

// Return element or
export function templateInjector(targetNode, modelScope, cloneDynamic){
	const reservedTemplate = targetNode.getElementsByTagName('sf-reserved');
	const injectTemplate = targetNode.getElementsByTagName('sf-template');

	if(injectTemplate.length !== 0){
		if(window.templates === void 0)
			throw new Error("<sf-template> inside of model/component need `window.templates` to be loaded first");

		for (var i = injectTemplate.length - 1; i >= 0; i--)
			loadSFTemplate(injectTemplate[i], targetNode);
	}

	let isDynamic = reservedTemplate.length !== 0;
	if(cloneDynamic === true && isDynamic === true){
		targetNode.sf$hasReserved = true;
		targetNode.sf$componentIgnore = true;

		var temp = internal.component.skip;
		internal.component.skip = true;
		isDynamic = targetNode.cloneNode(true);
		internal.component.skip = temp;
	}

	if(reservedTemplate.length !== 0){
		if(modelScope.sf$reserved === void 0){
			for (var i = reservedTemplate.length - 1; i >= 0; i--) {
				reservedTemplate[i].remove();
			}
		}
		else{
			var temp = modelScope.sf$reserved;
			for (var i = reservedTemplate.length - 1; i >= 0; i--) {
				var ref = reservedTemplate[i];
				var serve = temp[ref.getAttribute('name')];
				if(serve === void 0){
					ref.remove();
					continue;
				}

				serve = parseElement(serve);
				$(serve).insertBefore(ref.nextSibling || ref);
				ref.remove();
			}
		}
	}

	return isDynamic;
}

export function createModelKeysRegex(targetNode, modelScope, mask){
	let modelKeys = getModelKeys(modelScope, true);
	if(modelKeys.length === 0){
		console.error(modelScope, $(targetNode.outerHTML)[0]);
		throw new Error("Model has no property instead of '$el', maybe some script haven't been loaded");
	}

	if(modelKeys.includes('$'))
		modelKeys = modelKeys.split('$').join('\\$');

	const obj = {};

	// Don't match text inside quote, or object keys
	obj.modelRefRoot_regex = {v: RegExp(sfRegex.scopeVar.join(modelKeys), 'g')};

	if(mask !== null)
		obj.modelRef_regex = RegExp(sfRegex.getSingleMask.join(mask), 'gm');

	obj.modelRef_regex_mask = mask;
	return obj;
}

// ToDo: need performance optimization
export function extractPreprocess(targetNode, mask, modelScope, container, modelRegex, preserveRegex, repeatedListKey){
	if(targetNode.model !== void 0)
		return console.error('Element already has a model, template extraction was aborted', targetNode, targetNode.model, mask, modelScope);

	// Remove repeated list from further process
	// To avoid data parser
	const backup = targetNode.querySelectorAll('[sf-each]');
	for (var i = 0; i < backup.length; i++) {
		var current = backup[i];
		let reserve = document.createElement('template');
		reserve.className = 't_sf_each';
		current.parentNode.replaceChild(reserve, current);
	}

	let template;

	// modelRefRoot_regex should be placed on template prototype
	if(modelRegex.parse === void 0)
		template = Object.create(modelRegex);
	else{
		template = {
			modelRefRoot_regex:modelRegex.modelRefRoot_regex,
			modelRef_regex:modelRegex.modelRef_regex,
			modelRef_regex_mask:modelRegex.modelRef_regex_mask,
		};
	}

	// For preparing the next model too
	if(template.modelRef_regex_mask !== mask){
		template.modelRef_regex = RegExp(sfRegex.getSingleMask.join(mask), 'gm');
		template.modelRef_regex_mask = mask;
	}

	template.modelRefRoot = {};
	template.modelRefRoot_path = [];

	// Mask the referenced item
	if(mask !== null){
		template.modelRef = {};
		template.modelRef_path = [];
	}

	let copy = targetNode.outerHTML.replace(/[ \t]{2,}/g, ' ');

	if(repeatedListKey !== void 0){
		const temp = RegExp(sfRegex.getSingleMask.join(repeatedListKey), 'm');
		temp.key = repeatedListKey;
		repeatedListKey = temp;
	}

	// Extract data to be parsed
	template.scopes = modelRegex.bindList !== void 0 ? modelRegex.scopes : {_modelScope:modelScope};
	copy = uniqueDataParser(copy, template, template.scopes);
	const preParsed = copy[1];
	copy = dataParser(copy[0], null, template, template.scopes, preParsed);
	template.parse = preParsed;

	function findModelProperty(){
		const _list = template.scopes._list;

		for (let i = 0; i < preParsed.length; i++) {
			const current = preParsed[i];

			// Text or attribute
			if(current.type === REF_DIRECT){
				toObserve.template.i = i;
				var check = current.check.replace(sfRegex.itemsObserve, toObserve, template, true);
				delete current.check;

				// Convert to function
				current.get = modelScript(mask, check, repeatedListKey, _list);
				continue;
			}

			// Dynamic data
			if(current.type === REF_IF){
				var checkList = `${current.if.cond};${current.if.val}`;
				current.if.cond = modelScript(mask, current.if.cond, repeatedListKey, _list);
				current.if.val = modelScript(mask, current.if.val, repeatedListKey, _list);

				if(current.elseValue !== null){
					checkList += `;${current.elseValue}`;
					current.elseValue = modelScript(mask, current.elseValue, repeatedListKey, _list);
				}

				for (let a = 0; a < current.elseIf.length; a++) {
					const refElif = current.elseIf[a];

					checkList += `${refElif.cond};${refElif.val}`;
					refElif.cond = modelScript(mask, refElif.cond, repeatedListKey, _list);
					refElif.val = modelScript(mask, refElif.val, repeatedListKey, _list);
				}
			}
			else if(current.type === REF_EXEC){
				var checkList = current.check;
				delete current.check;

				// Convert to function
				current.get = modelScript(mask, checkList, repeatedListKey, _list);
			}

			toObserve.template.i = i;
			checkList.split('"').join("'").replace(sfRegex.itemsObserve, toObserve);
		}
	}

	// Rebuild element
	const tempSkip = internal.component.skip;
	internal.component.skip = true;
	if(container !== void 0)
		copy = `<${container}>${copy}</${container}>`;

	copy = parseElement(copy, true)[0];
	if(container !== void 0){
		copy = copy.firstElementChild;
		copy.remove();
	}

	internal.component.skip = tempSkip;

	// Restore element repeated list
	const restore = copy.getElementsByClassName('t_sf_each');
	for (var i = 0; i < backup.length; i++) {
		const current = restore[0];
		current.parentNode.replaceChild(backup[i], current);
	}

	template.specialElement = {};

	// It seems we can't use for.. of because need to do from backward
	// Start addressing
	const nodes = [...queuePreprocess(copy, true, template.specialElement)];
	const addressed = [];

	for (var i = nodes.length - 1; i >= 0; i--) {
		var ref = nodes[i];
		const temp = {nodeType: ref.nodeType};

		if(temp.nodeType === 1){ // Element
			temp.attributes = addressAttributes(ref, template);
			temp.address = getSelector(ref, true);
		}

		else if(temp.nodeType === 3){ // Text node
			let innerHTML = ref.nodeValue;
			var indexes = [];

			innerHTML.replace(/{{%%=([0-9]+)/gm, function(full, match){
				indexes.push(Number(match));
			});

			// Check for dynamic mode
			if(indexes.length !== 0){
				innerHTML = innerHTML.split(/{{%%=[0-9]+/gm);
				for(var a = 0; a < innerHTML.length; a++)
					innerHTML[a] = trimIndentation(innerHTML[a]).trim();

				const content = innerHTML.shift();

				const parent = ref.parentNode;
				const { nextSibling } = ref;

				// Find boundary ends
				const commentFlag = addressed.length;
				for(var a = 0; a < indexes.length; a++){
					var flag = document.createComment('');
					parent.insertBefore(flag, nextSibling);

					// Add comment element as a flag
					addressed.push({
						nodeType:-1,
						parse_index:indexes[a],
						startFlag:flag,
						address:getSelector(flag, true)
					});
				}

				if(content.length === 0)
					ref.remove();
				else ref.nodeValue = content;

				// Process the comment flag only
				for (var a = commentFlag; a < addressed.length; a++) {
					const addr = addressed[a];
					if(addr.nodeType !== -1) continue;

					const prev = addr.startFlag.previousSibling;
					if(prev === null){
						addr.startFlag = null;
						continue;
					}

					addr.startFlag = getSelector(prev, true);
				}

				// Merge boundary address
				if(content.length === 0){
					// Process the comment flag only
					for (var a = commentFlag; a < addressed.length; a++) {
						const addr = addressed[a];
						if(addr.nodeType !== -1) continue;

						var ref = addr.address;
						ref[ref.length - 1]--;
					}
					continue;
				}
				else if(ref.nodeValue.search(/{{%=[0-9]+%/) === -1)
					continue;
			}

			// Check if it's only model value
			indexes = [];
			innerHTML = ref.nodeValue.replace(templateParser_regex, function(full, match){
				indexes.push(Number(match));
				return '';
			});

			if(innerHTML === '' && indexes.length === 1)
				temp.direct = indexes[0];
			else{
				temp.value = ref.nodeValue.replace(/[ \t]{2,}/g, ' ').split(templateParser_regex_split);
				parseIndexAllocate(temp.value);
				temp.parse_index = indexes;
			}

			temp.address = getSelector(ref, true);
			ref.nodeValue = '-';
		}

		addressed.push(temp);
	}

	toObserve.template = template;
	findModelProperty();

	delete toObserve.template.i;
	toObserve.template = void 0;

	// Find keyed function
	if(repeatedListKey !== void 0){
		const keyed = [];
		for (var i = 0; i < preParsed.length; i++) {
			const current = preParsed[i];

			// ToDo: Support for @if/else
			if(current.get === void 0) continue;
			if(current.get.length === 4)
				keyed.push(i);
		}

		if(keyed.length !== 0)
			template.modelRef._sfkey_ = keyed;
	}

	revalidateTemplateRef(template, modelScope);

	// Get the indexes for input bind
	if(template.specialElement.input !== void 0){
		const specialInput = template.specialElement.input;
		for (var i = 0; i < specialInput.length; i++) {
			var el = specialInput[i];
			var id, rule;

			if(el.hasAttribute('sf-into')){ // One way
				id = 1;
				rule = el.getAttribute('sf-into');
				el.removeAttribute('sf-into');
			}
			else{
				id = 2;
				rule = el.getAttribute('sf-bind');
				el.removeAttribute('sf-bind');
			}

			specialInput[i] = {
				addr:getSelector(el, true),
				rule,
				id
			};
		}
	}

	// Get the indexes for sf-each
	if(template.specialElement.repeat !== void 0){
		const specialRepeat = template.specialElement.repeat;
		var isDeep = template.modelRef_regex_mask !== void 0;
		var temp = isDeep && ` in ${template.modelRef_regex_mask}.`;

		for (var i = 0; i < specialRepeat.length; i++) {
			var el = specialRepeat[i];
			var rule = el.getAttribute('sf-each');

			let deepItem = false;
			if(isDeep && rule.includes(temp)){
				rule = rule.replace(temp, ' in ');
				deepItem = true;
			}

			specialRepeat[i] = {
				addr:getSelector(el, true),
				rule,
				isDeep: deepItem
			};

			el.removeAttribute('sf-each');
		}
	}

	if(template.specialElement.scope !== void 0){
		const specialScope = template.specialElement.scope;
		for (var i = 0; i < specialScope.length; i++) {
			var el = specialScope[i];
			var rule = parsePropertyPath(el.getAttribute('sf-scope'));

			if(template.modelRef_regex_mask !== void 0 && rule[0] === template.modelRef_regex_mask)
				rule.shift();

			specialScope[i] = {
				addr:getSelector(el, true),
				rule
			};

			el.removeAttribute('sf-scope');
		}
	}
	else if(!template.specialElement.input && !template.specialElement.repeat)
		delete template.specialElement;

	// internal.language.refreshLang(copy);
	template.html = copy;
	template.addresses = addressed;

	if(preserveRegex === void 0 && modelRegex.parse !== void 0){
		delete template.modelRefRoot_regex;
		delete template.modelRef_regex;
		delete template.modelRef_regex_mask;
	}

	return template;
}

let enclosedHTMLParse = false;
const excludes = {HTML:1,HEAD:1,STYLE:1,LINK:1,META:1,SCRIPT:1,OBJECT:1,IFRAME:1};
export function queuePreprocess(targetNode, extracting, collectOther, temp){
	const { childNodes } = targetNode;

	/* Modify `queuePreprocess` to use TreeWalker if possible
		let node, walk = document.createTreeWalker(targetNode, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT | NodeFilter.SHOW_COMMENT, null, false);
		while((node = walk.nextNode()) != null) {...};
	 */

	if(temp === void 0){
		temp = new Set();

		var attrs = targetNode.attributes;
		for (var a = 0; a < attrs.length; a++) {
			const ref = attrs[a];
			if(ref.name.slice(0, 1) === '@' || ref.value.includes('{{')){
				temp.add(targetNode);
				targetNode.sf$onlyAttribute = true;
				break;
			}
		}
	}

	// Scan from last into first element
	for (let i = childNodes.length - 1; i >= 0; i--) {
		const currentNode = childNodes.item(i);

		if(currentNode.nodeName in excludes)
			continue;

		if(currentNode.nodeType === 1){ // Tag
			// Skip {[ ..enclosed template.. ]}
			if(enclosedHTMLParse === true)
				continue;

			// Skip nested sf-model or sf-space
			// Skip element and it's childs that already bound to prevent vulnerability
			if(currentNode.constructor._ref === ModelInternal._ref || currentNode.model !== void 0)
				continue;

			var attrs = currentNode.attributes;
			if(attrs['sf-each'] !== void 0){
				(collectOther.repeat ??= []).push(currentNode);
				continue;
			}

			if(attrs['sf-into'] !== void 0 || attrs['sf-bind'] !== void 0){
				(collectOther.input ??= []).push(currentNode);
			}

			if(attrs['sf-scope'] !== void 0){
				(collectOther.scope ??= []).push(currentNode);
				continue;
			}

			// Skip any custom element
			if(currentNode.hasAttribute('sf-parse') === false && currentNode.tagName.includes('-')){
				if(currentNode.constructor._ref !== SFPageView._ref || currentNode.parentNode.hasAttribute('sf-parse') === false)
					continue;
			}

			for (var a = 0; a < attrs.length; a++) {
				const ref = attrs[a];
				if(ref.name.slice(0, 1) === '@' || ref.value.includes('{{')){
					temp.add(currentNode);
					currentNode.sf$onlyAttribute = true;
					break;
				}
			}

			if(currentNode.childNodes.length !== 0)
				queuePreprocess(currentNode, extracting, collectOther, temp);
		}

		else if((currentNode.constructor._ref || currentNode.constructor) === Text){ // Text
			if(currentNode.length === 0){
				currentNode.remove();
				continue;
			}

			if(currentNode.nodeValue.trim().length === 0){
				currentNode.nodeValue = currentNode.nodeValue.slice(0, 2);
				continue;
			}

			// The scan is from bottom to first index
			const enclosing = currentNode.nodeValue.indexOf('{[');
			if(enclosing !== -1)
				enclosedHTMLParse = false;
			else if(enclosedHTMLParse === true)
				continue;

			// Start enclosed if closing pattern was found
			const enclosed = currentNode.nodeValue.indexOf(']}');
			if(enclosed !== -1 && (enclosing === -1 || enclosing > enclosed)){ // avoid {[ ... ]}
				enclosedHTMLParse = true; // when ]} ...
				continue;
			}

			// Continue here when enclosed template {[...]} was skipped

			if(currentNode.nodeValue.includes('{{')){
				if(extracting === void 0){
					const theParent = currentNode.parentNode;

					// If it's not single/regular template
					if(currentNode.nodeValue.includes('{{@') || enclosing !== -1)
						temp.add(theParent); // get the element (from current text node)
					else temp.add(currentNode);

					if(theParent.sf$onlyAttribute !== void 0)
						delete theParent.sf$onlyAttribute;

					continue;
				}

				if(!temp.has(currentNode)){
					temp.add(currentNode);

					if(currentNode.parentNode.sf$onlyAttribute !== void 0)
						delete currentNode.parentNode.sf$onlyAttribute;
				}
			}
		}
	}

	return temp;
}

export function parsePreprocess(nodes, modelRef, modelKeysRegex, temporaryTemplate){
	const binded = new Set();
	var _modelScoped = modelKeysRegex && modelKeysRegex.bindList !== void 0 ? modelKeysRegex.scopes : void 0;

	var template, current, wrapText = false;
	try{
		for(current of nodes){
			if(current.nodeType === 3 && binded.has(current.parentNode) === false){
				if(temporaryTemplate != null && wrapText === false && current.parentNode !== temporaryTemplate)
					wrapText = true;

				if(current.parentNode.constructor._ref === ModelInternal._ref || (current.parentNode === temporaryTemplate && wrapText)){
					// Auto wrap element if parent is 'SF-M'
					const replace = document.createElement('span');
					current.parentNode.insertBefore(replace, current);
					replace.appendChild(current);
				}

				bindElement(current.parentNode, modelRef, void 0, void 0, modelKeysRegex);
				binded.add(current.parentNode);
				continue;
			}

			// Create attribute template only because we're not going to process HTML content
			if(current.sf$onlyAttribute !== void 0){
				const preParsedRef = [];

				template = Object.create(modelKeysRegex);
				template.parse = preParsedRef;
				template.modelRefRoot = {};
				template.modelRefRoot_path = [];

				const attrs = current.attributes;
				for (var i = 0; i < attrs.length; i++) {
					const attr = attrs[i];

					if(attr.value.includes('{{')){
						if(_modelScoped === void 0)
							template.scopes = _modelScoped = {_modelScope:modelRef};

						attr.nodeValue = dataParser(attr.value, null, template, _modelScoped, preParsedRef);
					}
				}

				template.addresses = addressAttributes(current, template);
				toObserve.template = template;

				// Create as function
				for (var i = 0; i < preParsedRef.length; i++) {
					const ref = preParsedRef[i];

					if(ref.type === REF_DIRECT){
						toObserve.template.i = i;
						var check = ref.check.replace(sfRegex.itemsObserve, toObserve);
						delete ref.check;

						// Convert to function
						ref.get = modelScript(void 0, check);
						continue;
					}
				}

				delete toObserve.template.i;
				toObserve.template = void 0;

				revalidateTemplateRef(template, modelRef);

				let parsed;
				if(preParsedRef.length !== 0){
					parsed = new Array(preParsedRef.length);
					templateExec(preParsedRef, modelRef, void 0, parsed);
				}
				else parsed = emptyArray;

				const currentRef = [];
				parserForAttribute(current, template.addresses, null, modelRef, parsed, currentRef, void 0, template, true);

				// Save reference to element
				if(currentRef.length !== 0){
					currentRef.template = template;
					current.sf$elementReferences = currentRef;
				}

				bindElement(current, modelRef, template);

				delete current.sf$onlyAttribute;
				continue;
			}

			if(current.nodeType !== 3)
				bindElement(current, modelRef, void 0, void 0, modelKeysRegex);
		}
	} catch(e) {
		templateErrorInfo(e, current, "(Not from sf-each)", modelRef, template);
		throw e;
	}
}

function revalidateTemplateRef(template, modelRef){
	revalidateBindingPath(template.modelRefRoot, template.modelRefRoot_path, modelRef);

	// for repeated list if exist
	if(template.modelRef_path !== void 0 && template.modelRef_path.length !== 0){
		template.modelRef_path.revalidate = true;
		revalidateBindingPath(template.modelRef, template.modelRef_path, modelRef);
	}
}

// This will affect syntheticTemplate validation on property observer
export function revalidateBindingPath(refRoot, paths, modelRef){
	for (let i = 0; i < paths.length; i++) {
		const path = paths[i];
		const deep = deepProperty(modelRef, path.slice(0, -1));

		// We're not bind the native stuff
		if(path.includes('constructor')){
			for(var keys in refRoot){
				if(keys.includes('.constructor'))
					delete refRoot[keys];
			}

			for (var a = i+1; a < paths.length; a++) {
				if(paths[a].includes('constructor'))
					paths.splice(a--, 1);
			}

			paths.splice(i, 1);
			return;
		}

		// We can't verify it if not exist '-'
		if(deep === void 0)
			continue;

		// Decrease one level, maybe because from calling string/number manipulation function like .slice or .toFixed
		if(deep.constructor === String || deep.constructor === Number){
			// if it's taking index of string, then decrease two level
			if(path.length > 3 && path[path.length-2].constructor === Number)
				path.splice(path.length-2);
			else
				path.splice(path.length-1);

			// Remove other similar paths
			that:for (var a = i+1; a < paths.length; a++) {
				const check = paths[a];
				for (let z = 0; z < path.length; z++) {
					if(check[z] !== path[z])
						continue that;
				}

				paths.splice(a--, 1);
			}

			// Replace the property, we need to search it and collect the index
			var str = stringifyPropertyPath(path);
			const collect = [];

			for(var keys in refRoot){
				if(keys.indexOf(str) === 0){
					const rootIndex = refRoot[keys];
					delete refRoot[keys];

					for (var a = 0; a < rootIndex.length; a++) {
						if(collect.includes(rootIndex[a]) === false)
							collect.push(rootIndex[a]);
					}
				}
			}

			refRoot[str] = collect;
		}
		// We're not binding the native stuff
		else if(deep instanceof Function){
			// Delete the property
			var str = stringifyPropertyPath(path);
			for(var keys in refRoot){
				if(keys.indexOf(str) === 0)
					delete refRoot[keys];
			}
		}
	}
}