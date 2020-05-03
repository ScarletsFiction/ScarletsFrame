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

	model.$el.push(el);
	if(model.sf$internal === void 0){
		Object.defineProperty(model, 'sf$internal', {enumerabe:false, configurable:true, value:{}});
		model.sf$internal.modelKeysRegex = createModelKeysRegex(el, model, null);
	}

	if(model.constructor !== Object){
		if(model.sf$internal.methodProxied !== true){
			proxyClass(model, model.constructor);
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

	if(model.constructor !== Object)
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
	return text.replace(RegExp('^([\\t ]{'+indent+'})', 'gm'), '');
}

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
				? vars[match].split('"').join('&quot;').split("'").join("&quot;")
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

	if(mask && script.indexOf('_model_') !== -1)
		script = 'var _model_='+mask+';'+script;

	try{
		if(repeatedListKey === void 0)
			return new Function(mask || '_model_', '_modelScope', '_escapeParse', script);
		else 
			return new Function(mask || '_model_', '_modelScope', '_escapeParse', repeatedListKey, script);
	} catch(e){
		console.log(script);
		console.error(e);
	}
}