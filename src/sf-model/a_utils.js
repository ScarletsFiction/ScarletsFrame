import {avoidQuotes} from "../utils.js";
import {escapeText, childIndexes} from "../sf-dom.utils.js";
import {templateParser_regex, REF_DIRECT, REF_IF, REF_EXEC, ModelInternal} from "./a_shared.js";
import {internal as Internal} from "../internal.js";
import {SFOptions, sfRegex} from "../shared.js";
import {eventHandler} from "./event-handler.js";

// For debugging, normalize indentation
export function trimIndentation(text){
	var indent = text.split("\n", 3);
	if(indent[0][0] !== ' ' || indent[0][0] !== "\t")
		indent = indent[1];
	else indent = indent[0];

	if(indent === void 0) return text;
	indent = indent.length - indent.trim().length;
	if(indent === 0) return text;
	return text.replace(RegExp(`^([\\t ]{${indent}})`, 'gm'), '');
}

export function _eP(val, type){
	if(type === 0) // HTML
		return escapeText(val);

	// Attr
	return val != null ? val.toString().split('"').join('&quot;').split("'").join("&#39;") : val;
}

export function escapeParse(html, vars){
	return avoidQuotes(html, function(noQuot){
		// Escape for value in HTML
		return noQuot.replace(templateParser_regex, function(full, match){
			return `"+_eP(${vars[match]}, 0)+"`;
		});
	}, function(inQuot){
		// Escape for value in attributes
		return inQuot.replace(templateParser_regex, function(full, match){
			return `"+_eP(${vars[match]}, 1)+"`;
		});
	}, true).trim().split('+""').join('');
}

var modelScript_ = /_result_|return/;
export function modelScript(mask, script, repeatedListKey, _list){
	var which = script.match(modelScript_);

	if(repeatedListKey !== void 0 && !repeatedListKey.test(script))
		repeatedListKey = void 0;

	if(which === null)
		script = `return ${script}`;
	else if(which[0] === '_result_')
		script = `var _result_="";${script.split('@return').join('_result_+=')};return _result_`;
	else
		script = script.split('@return').join('return');

	if(mask && script.includes('_model_'))
		script = script.split('_model_').join(mask);

	var args = `${mask ? mask : '_model_'},_modelScope,_eP`;

	if(_list !== void 0){
		let temp = script.matchAll(_list.regex);
		let temp_ = '_d=this.data';

		for (var i = 0; i < _list.length; i++) {
			const item = _list[i];
			temp_ += `,${item}=_d.${item}`;
		}

		script = `var/**/${temp_}\n${script}`;
	}

	try{
		if(repeatedListKey === void 0)
			return new Function(args, script);
		return new Function(args, repeatedListKey.key, script);
	} catch(e){
		console.log(script);
		console.error(e);
		Internal.onerror && Internal.onerror(e);
	}
}

export function applyParseIndex(templateValue, indexes, parsed, templateParse, item, repeatListIndex){
	for (var i = 0; i < indexes.length; i++){
		var a = indexes[i];
		var temp = parsed[a];

		if(temp !== void 0)
			templateValue[2*i+1] = temp;
		else{
			var ref = templateParse[a];
			temp = ref.get(item, ref.data._modelScope, _eP, repeatListIndex);

			templateValue[2*i+1] = temp.constructor === Object ? JSON.stringify(temp) : temp;
		}
	}

	return templateValue.join('');
}

export function parseIndexAllocate(arr){
	for (var i = arr.length-1; i > 0; i--)
		arr.splice(i, 0, void 0);

	if(arr[arr.length-1] === '')
		arr.pop();
}

export function findErrorLocation(text, error, slicedX, msg, slicedY){
	var location = error.stack.match(/mous>:(.*?)\)/);
	if(location === null){
		console.log(msg, 'color:orange', text);
		return;
	}

	location = location[1].split(':').map(Number);

	location[0] -= 2 + slicedY;
	location[1] -= slicedX;
	if(location[1] < 0) location[1] = 0;

	text = text.split('\n');
	if(location[0] === 1 && text[0].slice(0, 1) === '{')
		location[1] += 3;

	var textMsg = " ".repeat(location[1]);
	textMsg += "%c^ Around here%c";

	text.splice(location[0], 0, textMsg);
	text = text.join('\n');

	console.log(msg+'%c'+text, 'color:orange', '', 'color:#ffa666;font-weight:bold', '');
}

export function templateErrorInfo(e, element, item, modelRef, template){
	if(e.sf$throwed){
		var el, isSingle = 'From element:';

		if(item?.$el !== void 0 && modelRef?.$el === void 0){
			modelRef = item;
			item = void 0;
		}

		if(modelRef?.$el !== void 0){
			el = modelRef.$el[0];
			if(el && el.constructor === ModelInternal._ref){
				if(modelRef.$el.length !== 1){
					isSingle = "From one of shared model's element:";
					el = modelRef.$el.slice(0);
				}
			}
		}

		var sfeach;
		if(SFOptions.devMode && template.rootIndex)
			sfeach = childIndexes(template.rootIndex, el) || void 0;

		console.log("%cTemplate's data:%c", 'color:orange', '',
		            "\n - Parent Element:", el,
		            "\n - SF-Each's Parent:", sfeach,
		            "\n - Element Skeleton:", element,
			        "\n - Item value:", item,
		            "\n - Model root:", modelRef,
		            "\n - Internal cache:", {template});

		console.groupEnd();
	}
	else Internal.onerror && Internal.onerror(e);
}

export function initBindingInformation(modelRef){
	if(modelRef.sf$bindedKey !== void 0)
		return;

	// Element binding data
	Object.defineProperty(modelRef, 'sf$bindedKey', {
		configurable: true,
		writable:true,
		value:{}
	});
}

function elseIfHandle(else_, item, modelScope){
	const { elseIf } = else_;

	// Else if
	for (let i = 0; i < elseIf.length; i++) {
		// Check the condition
		if(!elseIf[i].cond(item, modelScope, _eP))
			continue;

		// Get the value
		return elseIf[i].val(item, modelScope, _eP);
	}

	// Else
	if(else_.elseValue === null)
		return '';

	return else_.elseValue(item, modelScope, _eP);
}

export function templateExec(parse, item, atIndex, parsed, repeatListIndex){
	var temp, changed = false;

	// Get or evaluate static or dynamic data
	var n = atIndex !== void 0 ? atIndex.length : parse.length;
	var a;
	for (let i = 0; i < n; i++) {
		a = atIndex !== void 0 ? atIndex[i] : i;
		const ref = parse[a];

		try{
			// Direct evaluation type
			if(ref.type === REF_DIRECT){
				temp = ref.get(item, ref.data._modelScope, _eP, repeatListIndex);
				if(temp != null){
					if(temp.constructor === Object)
						temp = JSON.stringify(temp);
					else if(temp.constructor !== String)
						temp = String(temp);
				}
				else if(temp === void 0)
					temp = 'undefined';

				if(changed === false){
					if(parsed[a] === temp) continue;
					changed = true;
				}

				parsed[a] = temp;
				continue;
			}

			if(ref.type === REF_EXEC){
				temp = ref.get(item, ref.data._modelScope, _eP, repeatListIndex);

				if(changed === false){
					if(parsed[a] === temp) continue;
					changed = true;
				}

				parsed[a] = temp;
				continue;
			}

			// Conditional type
			if(ref.type === REF_IF){
				// If condition was not meet
				if(!ref.if.cond(item, ref.data._modelScope, _eP, repeatListIndex)){
					temp = elseIfHandle(ref, item, ref.data._modelScope, repeatListIndex);

					if(changed === false){
						if(parsed[a] === temp) continue;
						changed = true;
					}

					parsed[a] = temp;
					continue;
				}

				temp = ref.if.val(item, ref.data._modelScope, _eP, repeatListIndex);

				if(changed === false){
					if(parsed[a] === temp) continue;
					changed = true;
				}

				parsed[a] = temp;
			}
		} catch(e) {
			if(ref.get !== void 0){
				temp = ref.get.toString();
				temp = temp.split('\n) {\n', 2)[1].slice(0, -2);
			}
			else{
				var temp2 = ref.if.cond.toString();
				temp2 = 'if('+temp2.split('\n) {\nreturn ', 2)[1].slice(0, -2)+'){\n';

				temp = temp2 + ref.if.val.toString().split('\n) {\n', 2)[1];
			}

			temp = temp.replace(/(_model_|_modelScope)\./g, '');
			temp = temp.replace(/var _model_=.*?;/, '');

			var slicedX = 0, slicedY = 0;
			if(temp.includes('var/**/_d')){
				temp = temp.slice(temp.indexOf('\n')+1);
				slicedY = 1;
			}

			if(temp.indexOf('return ') === 0){
				temp = temp.slice(7);
				slicedX = 7;
			}

			if(temp.includes('\n') === false)
				temp = `{{ ${temp} }}`;

			if(e.sf$throwed){
				console.groupCollapsed("Click here to open more information..");
				findErrorLocation(temp, e, slicedX, "%cError in template's script:\n", slicedY);
			}
			else{
				console.groupCollapsed("%cError message:", 'color:orange', e.message, "\nClick here to open more information..");
				findErrorLocation(temp, e, slicedX, "%cWhen processing template's script:\n", slicedY);
			}

			e.sf$throwed = true;
			throw e;
		}
	}

	return changed;
}

export function parserForAttribute(current, ref, item, modelRef, parsed, changesReference, rootHandler, template, registerRootEvent){
	for(let a = 0; a < ref.length; a++){
		const refB = ref[a];

		// Pass to event handler
		if(refB.event){
			if(registerRootEvent)
				eventHandler(current, refB, modelRef || item, rootHandler, template);

			continue;
		}

		const { isValueInput } = refB;
		var temp = {ref:refB};

		if(SFOptions.devMode)
			temp.element = current;

		if(refB.name === 'style')
			temp.style = current.style;
		else if(refB.name === 'class')
			temp.class = current.classList;
		else{
			temp.attributes = current.attributes;
			temp.attribute = isValueInput
				? current : current.attributes[refB.name];
		}

		if(current.hasAttribute('sf-lang'))
			temp.sf_lang = current;

		changesReference.push(temp);

		if(refB.direct !== void 0){
			const val = parsed[refB.direct];
			if(refB.name === 'value' && isValueInput){
				current.removeAttribute('value');
				current.value = val;
				continue;
			}

			if(val !== ''){
				if(val === null && temp.attribute !== void 0){
					temp.attribute.nodeValue = '';
					current.removeAttribute(refB.name);
					continue;
				}

				current.setAttribute(refB.name, val);
			}

			continue;
		}

		// Below is used for multiple data
		const val = applyParseIndex(refB.value, refB.parse_index, parsed);
		if(refB.name === 'value' && isValueInput){
			var temp = current.value;
			current.removeAttribute('value');
			current.value = val;
		}
		else if(val !== ''){
			if(temp.attribute === void 0)
				current.setAttribute(refB.name, val);
			else temp.attribute.nodeValue = val;
		}
	}
}