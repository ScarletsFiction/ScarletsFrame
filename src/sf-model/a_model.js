import {internal, SFOptions} from "../shared.js";
import Internal from "../internal.js";
import Model from "../sf-model.js";
import $ from "../sf-dom.js";
import {avoidQuotes, proxyClass, parsePropertyPath, deepProperty} from "../utils.js";
import {parsePreprocess, queuePreprocess, createModelKeysRegex} from "./parser.js";
import {repeatedListBinding} from "./repeated-list.js";
import {bindInput} from "./input-bind.js";
import {templateParser_regex} from "./template.js";

export function ModelInit(el, modelName, namespace){
	if(el.model !== void 0)
		return;

	if(modelName === void 0)
		return console.error("Parameter 2 should be model name");

	el.sf$controlled = modelName;
	if(namespace !== void 0){
		el.sf$namespace = namespace;
		var model = el.model = namespace.root[modelName] || namespace(modelName);
	}
	else var model = el.model = Model.root[modelName] || Model(modelName);

	var firstInit = false;
	if(model._firstInit === true){
		delete model._firstInit;
		firstInit = true;
	}

	if(model.$el === void 0)
		model.$el = $();

	model.$el = model.$el.push(el);
	if(model.sf$internal === void 0){
		Object.defineProperty(model, 'sf$internal', {configurable:true, value:{
			modelKeysRegex:createModelKeysRegex(el, model, null),
			deepBinding:{}
		}});
	}

	if(model.constructor !== Object){
		if(model.sf$internal.proxied === void 0){
			proxyClass(model);
			model.sf$internal.proxied = true;
		}

		model.constructor.construct && model.constructor.construct.call(model, (namespace || Model), el);
	}

	var specialElement = {};

	parsePreprocess(queuePreprocess(el, void 0, specialElement), model, model.sf$internal.modelKeysRegex);

	if(specialElement.input !== void 0)
		bindInput(specialElement.input, model);

	if(specialElement.repeat !== void 0)
		repeatedListBinding(specialElement.repeat, model, namespace, model.sf$internal.modelKeysRegex);

	if(specialElement.scope !== void 0)
		initPendingComponentScope(specialElement.scope, el);

	model.init && model.init(el, firstInit);

	if(model.constructor !== Object)
		model.constructor.init && model.constructor.init.call(model, (namespace || Model), el);
}

internal.initPendingComponentScope = initPendingComponentScope;
export function initPendingComponentScope(list, html){
	for (var i = 0; i < list.length; i++) {
		var el, ref = list[i];

		if(ref.constructor !== Object){
			ref.rule = parsePropertyPath(ref.getAttribute('sf-scope'));
			ref.removeAttribute('sf-scope');
			el = ref;
			el.sf$asScope = true;
		}
		else el = $.childIndexes(ref.addr, html);

		const obj = deepProperty(html.model, ref.rule);
		const temp = ref.rule.slice(0);
		const key = temp.pop();

		Object.defineProperty(deepProperty(html.model, temp) || html.model, key, {
			enumerabe:true,
			configurable:true,
			get:()=> obj,
			set:(val)=>{
				Object.assign(obj, val)
				obj.reinit !== void 0 && obj.reinit();
			}
		});

		// Put a flag that it was ready to be initialized when component was loaded
		if(el.sf$constructor === void 0){
			el.model = obj;
			continue;
		}

		el.sf$constructor(obj, null, true);
		el.connectedCallback();
	}
}

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
		return $.escapeText(val);

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
			if(el && el.constructor === SFModel){
				if(modelRef.$el.length !== 1){
					isSingle = "From one of shared model's element:";
					parentElement = modelRef.$el.slice(0);
				}
			}
		}

		var sfeach;
		if(SFOptions.devMode && template.rootIndex)
			sfeach = $.childIndexes(template.rootIndex, el) || void 0;

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