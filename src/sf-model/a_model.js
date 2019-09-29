;(function(){
var self = sf.model;

self.init = function(el, modelName){
	if(el.sf$controlled !== void 0)
		return;

	el.sf$controlled = modelName;

	var model = el.model = sf.model.root[modelName] || sf.model(modelName);
	if(model.$el === void 0)
		model.$el = $();

	model.$el.push(el);

	if(sf.controller.pending[modelName] !== void 0)
		sf.controller.run(modelName);

	var specialElement = {
		repeat:[],
		input:[]
	};

	sf.model.parsePreprocess(sf.model.queuePreprocess(el, void 0, specialElement), modelName);

	bindInput(specialElement.input, model);
	repeatedListBinding(specialElement.repeat, model);

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