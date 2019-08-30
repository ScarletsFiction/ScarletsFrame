sf.events = (function(){
	var callbacks = {};
	var callbacksWhen = {};
	self.warningWhen = 10;

	function Events(name, run){
		if(name.constructor === Array){
			for (var i = 0; i < name.length; i++)
				Events(name[i], run);

			return;
		}

		if(Events[name] === void 0){
			var active = void 0;

			if(run !== void 0 && run.constructor === Boolean)
				active = run;

			if(active !== void 0){
				Object.defineProperty(Events, name, {
					enumerable:false,
					configurable:true,
					get:function(){return active},
					set:function(val){
						if(active === val)
							return;

						var ref = callbacksWhen[name];
						if(ref !== void 0){
							for (var i = 0; i < ref.length; i++) {
								try{
									ref[i].apply(null, arguments);
								} catch(e) {
									console.error(e);
								}
							}

							delete callbacksWhen[name];
						}

						// Reset to default
						Object.defineProperty(Events, name, {
							enumerable:false,
							configurable:true,
							writable:true,
							value:val
						});
					}
				});
			}
			else{
				Events[name] = function(){
					for (var i = 0; i < callback.length; i++) {
						try{
							callback[i].apply(null, arguments);
							if(callback[i].once === true)
								callback[i].splice(i--, 1);
						} catch(e) {
							console.error(e);
						}
					}
				}

				if(callbacks[name] === void 0)
					callbacks[name] = [];

				var callback = callbacks[name];
			}
		}

		if(run && run.constructor === Function){
			run(Events[name]);
			run = null;
		}
	}

	Events.when = function(name, callback){
		if(Events[name] === true)
			return callback();

		if(callbacksWhen[name] === void 0)
			callbacksWhen[name] = [];

		callbacksWhen[name].push(callback);
	}

	Events.once = function(name, callback){
		callback.once = true;
		callbacks[name].push(callback);
	}

	Events.on = function(name, callback){
		if(callbacks[name] === void 0)
			callbacks[name] = [];

		if(callbacks[name].length >= self.warningWhen)
			console.warn("Events", name, "have more than", self.warningWhen, "callback, there may possible memory leak.");

		callbacks[name].push(callback);
	}

	Events.off = function(name, callback){
		if(callbacks[name] === void 0)
			return callbacks[name].length = 0;

		var i = callbacks[name].indexOf(callback);
		if(i === -1) return;
		callbacks[name].splice(i, 1);
	}

	return Events;
})();