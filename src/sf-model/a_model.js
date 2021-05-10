import {internal, SFOptions, HotReload} from "../shared.js";
import {model as Model, SFModel} from "../sf-model.js";
import {escapeText, childIndexes} from "../sf-dom.utils.js";
import {proxyClass, parsePropertyPath, deepProperty} from "../utils.js";
import {parsePreprocess, queuePreprocess, createModelKeysRegex} from "./parser.js";
import {repeatedListBinding} from "./repeated-list.js";
import {bindInput} from "./input-bind.js";
import {$} from "../sf-dom.js";
import {handleSFSlot} from "../sf-slot.js";

export function ModelInit(el, modelName, namespace){
	if(el.model !== void 0)
		return;

	if(modelName === void 0)
		return console.error("Parameter 2 should be model name");

	el.sf$controlled = modelName;
	if(namespace !== void 0){
		el.sf$space = namespace;
		var model = el.model = namespace.root[modelName] || namespace(modelName);
	}
	else var model = el.model = Model.root[modelName] || Model(modelName);

	var firstInit = false;
	if(model._firstInit === true){
		delete model._firstInit;
		firstInit = true;
	}

	model.$el ??= $.callableList();
	model.$el = model.$el.push(el);

	if(namespace !== void 0)
		model.$space = namespace;

	if(model.sf$internal === void 0){
		Object.defineProperty(model, 'sf$internal', {configurable:true, value:{
			modelKeysRegex:createModelKeysRegex(el, model, null),
			deepBinding:{}
		}});
	}
	else model.sf$internal.modelKeysRegex ??= createModelKeysRegex(el, model, null);

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

	if(model.hotReloadedHTML && HotReload.active && model.$el[0] !== void 0){
		model.hotReloadedHTML && model.hotReloadedHTML(el);
		return;
	}

	handleSFSlot(model, el);
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
		else el = childIndexes(ref.addr, html);

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