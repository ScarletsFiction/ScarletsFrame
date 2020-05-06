sf.events = (function(){
	self._listener = {};
	self._statusTrigger = {};

	function Events(name, defaultVal){
		if(name.constructor === Array){
			for (var i = 0; i < name.length; i++)
				Events(name[i], defaultVal);

			return;
		}

		// Events.when (Status Trigger)
		// Status trigger only triggered when true otherwise it will pending the callback
		// After triggered, all events will be cleared
		if(defaultVal !== void 0 && defaultVal.constructor === Boolean){
			if(Events[name] !== void 0 && Events[name] !== defaultVal)
				console.warn("Events", name, "already has value:", Events[name]);

			var trigger = function(){
				var ref = self._statusTrigger[name];
				if(ref !== void 0){
					for (var i = 0; i < ref.length; i++) {
						try{
							ref[i]();
						} catch(e) {
							console.error(e);
						}
					}

					// Remove all pending callback
					delete self._statusTrigger[name];
				}
			}

			var active = Events[name] || defaultVal;
			Object.defineProperty(Events, name, {
				enumerable:true,
				configurable:true,
				get:function(){return active},
				set:function(val){
					if(active === val)
						return;

					active = val;
					if(active) trigger();
				}
			});

			if(active) trigger();
		}

		// Events.on (Listener)
		else if(Events[name] === void 0){
			Events[name] = function(){
				for (var i = 0; i < callback.length; i++) {
					try{
						// .apply() is performant here
						callback[i].apply(null, arguments);
						if(callback[i].once === true)
							callback.splice(i--, 1);
					} catch(e) {
						console.error(e);
					}
				}
			}

			if(self._listener[name] === void 0)
				self._listener[name] = [];

			var callback = self._listener[name];
		}

		defaultVal = null;
	}

	Events.when = function(name, callback){
		if(Events[name] === true)
			return callback();

		if(self._statusTrigger[name] === void 0)
			self._statusTrigger[name] = [];

		self._statusTrigger[name].push(callback);
	}

	Events.once = function(name, callback){
		callback.once = true;
		self._listener[name].push(callback);
	}

	Events.on = function(name, callback){
		if(self._listener[name] === void 0)
			self._listener[name] = [];

		self._listener[name].push(callback);
	}

	Events.off = function(name, callback){
		if(self._listener[name] === void 0)
			return self._listener[name].length = 0;

		var i = self._listener[name].indexOf(callback);
		if(i === -1) return;
		self._listener[name].splice(i, 1);
	}

	return Events;
})();

if(!window.TouchEvent)
	window.TouchEvent = void 0;