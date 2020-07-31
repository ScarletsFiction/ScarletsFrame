;(function(){
var self = sf.model;

self.init = function(el, modelName, namespace){
	if(el.sf$controlled !== void 0)
		return;

	el.sf$controlled = modelName;
	if(namespace !== void 0){
		el.sf$namespace = namespace;
		var model = el.model = namespace.root[modelName] || namespace(modelName);
	}
	else var model = el.model = sf.model.root[modelName] || sf.model(modelName);

	if(model.$el === void 0)
		model.$el = $();

	model.$el = model.$el.push(el) || model.$el;
	if(model.sf$internal === void 0){
		Object.defineProperty(model, 'sf$internal', {enumerabe:false, configurable:true, value:{
			modelKeysRegex:createModelKeysRegex(el, model, null),
			deepBinding:{}
		}});
	}

	if(model.constructor !== Obj){
		if(model.sf$internal.proxied === void 0){
			proxyClass(model);
			model.sf$internal.proxied = true;
		}

		model.constructor.construct && model.constructor.construct.call(model, (namespace || sf.model), el);
	}

	var specialElement = {
		repeat:[],
		input:[]
	};

	sf.model.parsePreprocess(sf.model.queuePreprocess(el, void 0, specialElement), model, model.sf$internal.modelKeysRegex);

	bindInput(specialElement.input, model);
	repeatedListBinding(specialElement.repeat, model, namespace, model.sf$internal.modelKeysRegex);

	if(model.init !== void 0)
		model.init(el);

	if(model.constructor !== Obj)
		model.constructor.init && model.constructor.init.call(model, (namespace || sf.model), el);
}

var processingElement = null;
var scope = internal.model = {};

// For debugging, normalize indentation
function trimIndentation(text){
	var indent = text.split("\n", 3);
	if(indent[0][0] !== ' ' || indent[0][0] !== "\t")
		indent = indent[1];
	else indent = indent[0];

	if(indent === void 0) return text;
	indent = indent.length - indent.trim().length;
	if(indent === 0) return text;
	return text.replace(new RegExp('^([\\t ]{'+indent+'})', 'gm'), '');
}

// ToDo: Perf
function _escapeParse(html, vars){
	return avoidQuotes(html, function(noQuot){
		// Escape for value in HTML
		return noQuot.replace(templateParser_regex, function(full, match){
			return sf.dom.escapeText(vars[match]);
		});
	}, function(inQuot){
		// Escape for value in attributes
		return inQuot.replace(templateParser_regex, function(full, match){
			return vars[match] && vars[match].constructor === String
				? vars[match].split('"').join('&quot;').split("'").join("&#39;")
				: vars[match];
		});
	});
}

var modelScript_ = /_result_|return/;
function modelScript(mask, script, repeatedListKey){
	var which = script.match(modelScript_);

	if(which === null)
		script = 'return '+script;
	else if(which[0] === '_result_')
		script = 'var _result_="";'+script.split('@return').join('_result_+=')+';return _result_';
	else
		script = script.split('@return').join('return');

	if(mask && script.includes('_model_'))
		script = 'var _model_='+mask+';'+script;

	try{
		if(repeatedListKey === void 0)
			return new Function(mask || '_model_', '_modelScope', '_escapeParse', script);
		else
			return new Function(mask || '_model_', '_modelScope', '_escapeParse', repeatedListKey, script);
	} catch(e){
		console.log(script);
		console.error(e);
		sf.onerror && sf.onerror(e);
	}
}

function applyParseIndex(templateValue, indexes, parsed, templateParse, item){
	for (var i = 0; i < indexes.length; i++){
		var a = indexes[i];
		if(parsed[a] === void 0 && templateParse !== void 0)
			templateExec(templateParse, item, a, parsed);

		templateValue[2*i+1] = parsed[a].data;
	}

	return templateValue.join('');
}

var parseIndexAllocate = internal.model.parseIndexAllocate = function(arr){
	for (var i = arr.length-1; i > 0; i--)
		arr.splice(i, 0, void 0);

	if(arr[arr.length-1] === '')
		arr.pop();
}