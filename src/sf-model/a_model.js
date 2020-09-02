;(function(){
var self = sf.model;

self.init = function(el, modelName, namespace){
	if(el.model !== void 0)
		return;

	el.sf$controlled = modelName;
	if(namespace !== void 0){
		el.sf$namespace = namespace;
		var model = el.model = namespace.root[modelName] || namespace(modelName);
	}
	else var model = el.model = sf.model.root[modelName] || sf.model(modelName);

	var firstInit = false;
	if(model.$el === void 0){
		model.$el = $();
		firstInit = true;
	}

	model.$el = model.$el.push(el);
	if(model.sf$internal === void 0){
		Object.defineProperty(model, 'sf$internal', {enumerabe:false, configurable:true, value:{
			modelKeysRegex:createModelKeysRegex(el, model, null),
			deepBinding:{}
		}});
	}

	if(model.constructor !== Object){
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

	model.init && model.init(el, firstInit);

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
		script = script.split('_model_').join(mask);

	var args = mask ? mask : '_model_';
	if(script.includes('_escapeParse') === false)
		args += ',_modelScope,_eP';
	else args += ',_modelScope,_escapeParse';

	try{
		if(repeatedListKey === void 0)
			return new Function(args, script);
		return new Function(args, repeatedListKey, script);
	} catch(e){
		console.log(script);
		console.error(e);
		sf.onerror && sf.onerror(e);
	}
}

var applyParseIndex = internal.model.applyParseIndex = function(templateValue, indexes, parsed, templateParse, item, repeatListIndex){
	for (var i = 0; i < indexes.length; i++){
		var a = indexes[i];
		var temp = parsed[a];

		if(temp !== void 0)
			templateValue[2*i+1] = temp;
		else{
			var ref = templateParse[a];
			temp = ref.data;

			if(item !== temp[1]){
				temp[0] = item;
				temp = ref.get(item, temp[1], _escapeParse, repeatListIndex);
			}
			else temp = ref.get(void 0, temp[1], _escapeParse, repeatListIndex);

			templateValue[2*i+1] = temp.constructor === Object ? JSON.stringify(temp) : temp;
		}
	}

	return templateValue.join('');
}

var parseIndexAllocate = internal.model.parseIndexAllocate = function(arr){
	for (var i = arr.length-1; i > 0; i--)
		arr.splice(i, 0, void 0);

	if(arr[arr.length-1] === '')
		arr.pop();
}