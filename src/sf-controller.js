// DOM Controller on loaded app
sf.controller = new function(){
	var self = this;
	self.pending = {};
	self.active = {};

	internal.controller = {
		pending:[]
	};

	self.for = function(name, func){
		if(sf.component.registered[name]){
			sf.component.registered[name][1] = func;
			return;
		}
		
		if(self.active[name])
			return func();

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

	self.modelElement = function(element){
		if(element.nodeType === 1 && element.sf$controlled !== void 0)
			return element;

		return $.parentHasProperty(element, 'sf$controlled');
	}

	self.modelName = function(element){
		var name = self.modelElement(element);
		if(name === null){
			console.error("Can't find any controller for", element);
			return;
		}

		name = name.sf$controlled;

		// Initialize it first
		if(name !== void 0 && !self.active[name])
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

		var model = $.parentHasProperty(element, 'sf$controlled');
		var _modelScope = model.model;
		model = model.sf$controlled;

		if(_modelScope === void 0)
			return console.error("Couldn't find model for '"+model+"' that was called from sf-click");

		var modelKeys = sf.model.modelKeys(_modelScope).join('|');
		script = avoidQuotes(script, function(script_){
			return script_.replace(RegExp(sf.regex.strictVar+'('+modelKeys+')\\b', 'g'), function(full, matched){
				return '_modelScope.'+matched;
			});
		});

		script = script.split('(');

		var method = script.shift();
		var method_ = method;

		// Get method reference
		try{
			method = eval(method);
		} catch(err) {
			console.error("Error on sf-click for model: " + model + ' [Cannot call `'+method_+'`]\n', element, err);
			return;
		}

		if(!method || method.constructor !== Function)
			return;

		// Take the argument list
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
		else script = [e];

		try{
			method.apply(element, script);
			e.preventDefault();
		} catch(e) {
			console.error("Error on sf-click for model: " + model + '\n', element, '\n', e);
		}
	}

	self.run = function(name, func){
		if(sf.component.registered[name])
			return console.error("'"+name+"' is registered as a component");

		if(self.pending[name]){
			if(!sf.model.root[name])
				sf.model.root[name] = {};

			self.pending[name](sf.model.root[name], root_);
			self.active[name] = true;
			delete self.pending[name];

			var i = internal.controller.pending.indexOf(name);
			if(i !== -1)
				internal.controller.pending.splice(i, 1);
		}

		if(sf.model.root[name] === void 0)
			sf.model.root[name] = {};

		if(func)
			func(sf.model.root[name], root_);
	}

	self.init = function(parent){
		if(!sf.loader.DOMWasLoaded){
			return sf(function(){
				self.init(parent);
			});}

		var temp = $('[sf-controller]', parent || document.body);
		for (var i = 0; i < temp.length; i++) {
			self.run(temp[i].sf$controlled);
		}
	}

	// Create listener for sf-click
	document.addEventListener('DOMContentLoaded', function(){
		$.on(document.body, 'click', '[sf-click]', listenSFClick);
		// self.init();
	}, {capture:true, once:true});
}

var root_ = function(scope){
	if(sf.component.registered[scope]){
		var available = [];
		var component = sf.component.available[scope];
		if(component !== void 0){
			for (var i = 0; i < component.length; i++) {
				available.push(sf.model.root[component[i]]);
			}
		}
		return available;
	}

	if(!sf.model.root[scope]){
		var scope_ = sf.model.root[scope] = {};

		if(internal.modelPending[scope] !== void 0){
			var ref = internal.modelPending[scope];
			for (var a = 0; a < ref.length; a++) {
				ref[a](scope_, root_);
			}

			delete internal.modelPending[scope];
		}
	}

	return sf.model.root[scope];
}