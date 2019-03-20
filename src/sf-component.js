sf.component = new function(){
	var self = this;
	var scope = internal.component = {};
	self.registered = {};
	self.available = {};

	var bases = {};
	var events = {};

	self.for = function(name, func, extend){
		if(!sf.loader.DOMWasLoaded)
			return sf(function(){
				self.for(name, func);
			});

		if(self.registered[name] === undefined)
			self.registered[name] = [func, sf.controller.pending[name], 0, false, extend];
		self.registered[name][0] = func;
		delete sf.controller.pending[name];
	}

	self.event = function(name, func){
		events[name] = func;
	}

	self.base = function(name, func){
		bases[name] = func;
	}

	self.html = function(name, outerHTML){
		if(!sf.loader.DOMWasLoaded)
			return sf(function(){
				self.html(name, outerHTML);
			});

		if(self.registered[name] === undefined)
			self.registered[name] = [false, false, 0, false];
		self.registered[name][3] = $.parseElement(outerHTML)[0];
	}

	scope.triggerEvent = function(name, event, obj){
		if(events[name] === undefined || events[name][event] === undefined)
			return;

		events[name][event](obj, event);
	}

	var tempDOM = document.createElement('div');
	self.new = function(name, element){
		var newElement = element === undefined;
		if(element === undefined){
			if(self.registered[name][3] === false){
				console.error("HTML content for '"+name+"' was not defined");
				return;
			}
			element = self.registered[name][3].cloneNode(true);
		}

		var newID = name+'@'+(self.registered[name][2]++);
		element.setAttribute('sf-controller', newID);
		element.sf$component = true;
		element.sf$componentFrom = name;

		if(self.available[name] === undefined)
			self.available[name] = [];

		self.available[name].push(newID);

		var newObj = sf.model.root[newID] = {};
		self.registered[name][0](newObj, sf.model);

		var extend = self.registered[name][4];
		if(extend !== undefined){
			if(extend.constructor === Array){
				for (var i = 0; i < extend.length; i++) {
					if(bases[extend[i]] === undefined)
						return console.error("'"+extend[i]+"' base is not found");
					bases[extend[i]](newObj, sf.model);
				}
			}
			else{
				if(bases[extend] === undefined)
					return console.error("'"+extend+"' base is not found");
				bases[extend](newObj, sf.model);
			}
		}

		if(self.registered[name][1])
			self.registered[name][1](newObj, sf.model);

		scope.triggerEvent(name, 'created', newObj);

		if(newElement){
			// Wrap to temporary vDOM
			tempDOM.appendChild(element);
			sf.model.init(element);
			element = tempDOM.firstElementChild;
			element.remove();

			element.model = sf.model.root[newID];
			element.destroy = function(){
				if(this.parentElement === null)
					internal.model.DOMNodeRemoved(this);
				else this.remove();
			}
			return element;
		}

		element.model = sf.model.root[newID];
		return newID;
	}
};