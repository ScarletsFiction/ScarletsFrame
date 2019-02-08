// DOM Controller on loaded app
sf.controller = new function(){
	var self = this;
	self.pending = {};
	self.active = {};

	self.for = function(name, func){
		self.pending[name] = func;
	}

	self.modelScope = function(element, func){
		var model = sf.controller.modelName(element);

		if(!model)
			throw 'model or controller was not found';

		var bindedList = element.getAttribute('sf-bind-list');
		if(!bindedList){
			var parentEl = $.parent(element, '[sf-bind-list]');
			if(parentEl !== null)
				bindedList = parentEl.getAttribute('sf-bind-list');
		}
		else var parentEl = element;

		if(!bindedList){
			if(func) return func(sf.model.root[model], -1);
			else return sf.model.root[model];
		}

		// Find index
		var bindedListIndex = 0;
		if(bindedList)
			bindedListIndex = $.prevAll(parentEl, '[sf-bind-list]').length;

		if(func) return func(sf.model.root[model][bindedList], bindedListIndex);
		else return sf.model.root[model][bindedList][bindedListIndex];
	}

	self.modelName = function(element){
		var name = undefined;
		if(element.hasAttribute('sf-controller'))
			name = element.getAttribute('sf-controller');
		else
			name = $.parent(element, '[sf-controller]').getAttribute('sf-controller');

		// Initialize it first
		if(name !== undefined && !self.active[name])
			self.run(name);

		return name;
	}

	var listenSFClick = function(e){
		var element = e.target;
		var script = element.getAttribute('sf-click');

		if(!script){
			element = $.parent(element, '[sf-click]');
			script = element.getAttribute('sf-click');
		}

		var model = $.parent(element, '[sf-controller]').getAttribute('sf-controller');

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
			console.error("Error on sf-click for model: " + model + ' [Cannot find '+method_+']\n', element[0]);
			return;
		}

		// Take the argument list
		script.shift();
		script = script.join('(');
		script = script.split(')');
		script.pop();
		script = script.join('(');

		// Turn argument as array
		if(script.length !== 0){
			// Replace `this` to `element`
			script = eval(('['+script+']').replace(/,this|\[this/g, function(found){
				return found[0] + 'element';
			}));
		}
		if(!script)
			script = [];

		try{
			method.apply(element, script);
		} catch(e) {
			console.error("Error on sf-click for model: " + model + '\n', element[0], '\n', e);
		}
	}

	var root_ = function(scope){
		if(!sf.model.root[scope])
			sf.model.root[scope] = {};

		if(!sf.model.root[scope])
			sf.controller.run(scope);

		return sf.model.root[scope];
	}

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

		var temp = $('[sf-controller]', parent || document.body);
		for (var i = 0; i < temp.length; i++) {
			self.run(temp[i].getAttribute('sf-controller'));
		}
	}

	// Create listener for sf-click
	document.addEventListener('DOMContentLoaded', function(){
		$.on(document.body, 'click', '[sf-click]', listenSFClick);
	}, {capture:true, once:true});
}