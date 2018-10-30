// DOM Controller on loaded app
sf.controller = new function(){
	var self = this;
	var controller = {};
	self.active = {};

	self.for = function(name, func){
		if(!sf.model.root[name])
			sf.model.root[name] = {};

		controller[name] = func;
	}

	self.modelScope = function(element, func = false){
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
		if(element.attributes['sf-controller'])
			return element.attributes['sf-controller'].value;
		else
			return $(element).parents('[sf-controller]').attr('sf-controller');
	}

	var listenSFClick = function(e){
		var element = $(e.target);
		var script = element.attr('sf-click');

		if(!script){
			element = element.parents('[sf-click]').eq(0);
			script = element.attr('sf-click');
		}

		var model = element.parents('[sf-model]').attr('sf-model');

		if(!sf.model.root[model])
			model = element.parents('[sf-controller]').attr('sf-controller');

		if(!sf.model.root[model])
			throw "Couldn't find model for "+model+" that was called from sf-click";

		var _modelScope = sf.model.root[model];

		var modelKeys = sf.model.modelKeys(_modelScope);
		var scopeMask = RegExp('(?<=\\b[^.]|^|\\n| +|\\t|\\W )('+modelKeys+')(?=(?:[^"\']*(?:\'|")[^"\']*(?:\'|"))*[^"\']*$)\\b', 'g');

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

	self.run = function(name, func){
		if(!sf.loader.DOMWasLoaded)
			return sf(function(){
				self.run(name, func);
			});

		if(controller[name]){
			if(!self.active[name]){
				if(controller[name])
					controller[name](sf.model.root[name], sf.model.root);

				self.active[name] = true;
			}
		}

		if(func)
			func(sf.model.root[name], sf.model.root);

		// Mark as loaded
		if(controller[name])
			delete controller[name];
	}

	self.init = function(){
		if(!sf.loader.DOMWasLoaded)
			return sf(function(){
				self.init(name);
			});

		$('[sf-controller]').each(function(){
			self.run(this.attributes['sf-controller'].value);
		});
	}

	$(function(){
		// Listen to sf-click
		$('body').on('click', '[sf-controller] [sf-click]', listenSFClick);
	});
}