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

	var specialElement = {
		repeat:[],
		input:[]
	};

	sf.model.parsePreprocess(sf.model.queuePreprocess(el, void 0, specialElement), model);

	bindInput(specialElement.input, model);
	repeatedListBinding(specialElement.repeat, model, namespace);

	if(model.constructor !== Object){
		model.constructor.construct && model.constructor.construct.call(model);
		proxyClass(model, model.constructor);
	}

	if(model.init !== void 0)
		model.init(el);
}

// Escape the escaped quote
function escapeEscapedQuote(text){
	return text.split('\\"').join('\\$%*').split("\\'").join('\\%$*');
}

function unescapeEscapedQuote(text){
	return text.split('\\$%*').join('\\"').split('\\%$*').join("\\'");
}

var processingElement = null;
var bindingEnabled = false;
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

// Secured evaluation
var bracketMatch = /([\w\n.]*?[\S\s])\(/g;
var chackValidFunctionCall = sf.regex.validFunctionCall;
var localEval = function(script, _model_, _modelScope, _content_){
	"use strict";

	var _result_ = '';
	try{
		if(/@return /.test(script) === true){
			var _evaled_ = eval('(function(){'+script.split('@return ').join('return ')+'})()');

			if(_evaled_ === void 0)
				return _result_ + 'undefined';

			if(_evaled_ === null)
				return _result_ + 'null';

			// Check if it's an HTMLElement
			if(_evaled_.onclick !== void 0)
				return _evaled_;

			return _result_ + _evaled_;
		}
		else var _evaled_ = eval(script);
	} catch(e){
		console.groupCollapsed("%c<-- Expand the template error", 'color: yellow');
		console.log(trimIndentation(processingElement.outerHTML).trim());
		console.log("%c"+trimIndentation(script).trim(), 'color: yellow');
		console.groupEnd();

		console.error(e);
		return '#TemplateError';
	}

	if(_result_ !== '') return _result_;
	return _evaled_;
}

var modelScript_ = /_result_|return/;
function modelScript(script){
	var which = script.match(modelScript_);

	if(which === null)
		script = 'return '+script;
	else if(which[0] === '_result_'){
		script = 'var _result_="";'+script.split('@return').join('_result_+=')+';return _result_';
	}
	else script = script.split('@return').join('return');

	script = script
		.split('_model_').join('arguments[0]').split('arguments[0]:t').join('_model_:t')
		.split('_modelScope').join('arguments[1]')
		.split('_content_').join('arguments[2]');

	try{
		return new Function(script);
	} catch(e){
		console.error(e, script);
	}
}