// DOM Controller on loaded app
sf.controller = new function(){
	var self = this;
	self.pending = {};
	self.active = {};

	self.for = function(name, func){
		self.pending[name] = func;
	}

	self.modelScope = function(element, func){
		var elem = $(element);
		var model = sf.controller.modelName(element);

		if(!model)
			throw 'model or controller was not found';

		var bindedList = elem.attr('[sf-bind-list]');
		if(!bindedList)
			bindedList = elem.parents('[sf-bind-list]').attr('sf-bind-list');

		if(!bindedList){
			if(func) return func(sf.model.root[model], -1);
			else return sf.model.root[model];
		}

		// Find index
		var bindedListIndex = 0;
		if(bindedList)
			bindedListIndex = elem.parents('[sf-bind-list]').prevAll('[sf-bind-list]').length;

		if(func) return func(sf.model.root[model][bindedList], bindedListIndex);
		else return sf.model.root[model][bindedList][bindedListIndex];
	}

	self.modelName = function(element){
		var name = undefined;
		if(element.attributes['sf-controller'])
			name = element.attributes['sf-controller'].value;
		else
			name = $(element).parents('[sf-controller]').attr('sf-controller');

		// Initialize it first
		if(name !== undefined && !self.active[name])
			self.run(name);

		return name;
	}

	var listenSFClick = function(e){
		var element = $(e.target);
		var script = element.attr('sf-click');

		if(!script){
			element = element.parents('[sf-click]').eq(0);
			script = element.attr('sf-click');
		}

		var model = element.parents('[sf-controller]').attr('sf-controller');

		if(!sf.model.root[model])
			throw "Couldn't find model for "+model+" that was called from sf-click";

		var _modelScope = sf.model.root[model];

		var modelKeys = sf.model.modelKeys(_modelScope);
		var scopeMask = RegExp(sf.regex.strictVar+'('+modelKeys+')'+sf.regex.avoidQuotes+'\\b', 'g');

		script = script.replace(scopeMask, function(full, matched){
			return '_modelScope.'+matched;
		});

		script = script.split('(');

		var method = script[0];
		var method_ = method;

		// Get method reference
		try{
			method = eval(method);
		} catch(e) {
			method = false;
		}

		if(!method){
			console.error("Error on sf-click for model: " + model + ' [Cannot find '+method_+']\n', e.target);
			return;
		}

		// Take the argument list
		script.shift();
		script = script.join('(');
		script = script.split(')');
		script.pop();
		script = script.join('(');

		// Turn argument as array
		if(script.length !== 0)
			script = eval('['+script+']');
		if(!script)
			script = [];

		try{
			method.apply(element[0], script);
		} catch(e) {
			console.error("Error on sf-click for model: " + model + '\n', e.target, '\n', e);
		}
	}

	var root_ = function(scope){
		if(!sf.model.root[scope])
			sf.model.root[scope] = {};

		if(!sf.model.root[scope])
			sf.controller.run(scope);
		
		return sf.model.root[scope];
	}
	// Deprecated
	self.run = function(name, func){
		if(!sf.loader.DOMWasLoaded)
			return sf(function(){
				self.run(name, func);
			});

		if(self.pending[name]){
			if(!sf.model.root[name])
				sf.model.root[name] = {};
		
			self.pending[name](sf.model.root[name], root_);
			self.active[name] = true;
			delete self.pending[name];
		}

		if(func)
			func(sf.model.root[name], root_);
	}

	self.init = function(parent){
		if(!sf.loader.DOMWasLoaded)
			return sf(function(){
				self.init(name);
			});

		$('[sf-controller]', parent ? $(parent)[0] : document.body).each(function(){
			self.run(this.attributes['sf-controller'].value);
		});
	}

	// Create listener for sf-click
	$(document).one('DOMContentLoaded', function(){
		$(document.body).on('click', '[sf-click]', listenSFClick);
	});
}