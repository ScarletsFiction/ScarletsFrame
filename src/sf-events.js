import {internal as Internal} from "./internal.js";

var My = {};
My._listener = {};
My._statusTrigger = {};

export class events{
	static register(name, defaultVal){
		if(name.constructor === Array){
			for (let i = 0; i < name.length; i++)
				events.register(name[i], defaultVal);

			return;
		}

		// events.when (Status Trigger)
		// Status trigger only triggered when true otherwise it will pending the callback
		// After triggered, all events will be cleared
		if(defaultVal !== void 0 && defaultVal.constructor === Boolean){
			if(name in events && events[name] !== defaultVal)
				console.warn("Events", name, "already has value:", events[name]);

			const trigger = function(){
				const ref = My._statusTrigger[name];
				if(ref !== void 0){
					for (let i = 0; i < ref.length; i++) {
						try{
							ref[i]();
						} catch(e) {
							console.error(e);
							Internal.onerror && Internal.onerror(e);
						}
					}

					// Remove all pending callback
					delete My._statusTrigger[name];
				}
			}

			let active = events[name] || defaultVal;
			Object.defineProperty(events, name, {
				enumerable:true,
				configurable:true,
				get:()=> active,
				set:val=> {
					if(active === val)
						return;

					active = val;
					if(active) trigger();
				}
			});

			if(active) trigger();
		}

		// events.on (Listener)
		else if(!(name in events)){
			events[name] = function(){
				for (let i = 0; i < callback.length; i++) {
					try{
						// .apply() is performant here
						callback[i].apply(null, arguments);
						if(callback[i].once === true)
							callback.splice(i--, 1);
					} catch(e) {
						console.error(e);
						Internal.onerror && Internal.onerror(e);
					}
				}
			}

			if(!(name in My._listener))
				My._listener[name] = [];

			const callback = My._listener[name];
		}

		defaultVal = null;
	}

	static when(name, callback){
		if(events[name] === true)
			return callback && callback();

		let promise = !callback && new Promise(v => {
			callback = v
		});

		if(!(name in My._statusTrigger))
			My._statusTrigger[name] = [];

		My._statusTrigger[name].push(callback);
		return promise;
	}

	static once(name, callback){
		callback.once = true;
		My._listener[name].push(callback);
	}

	static on(name, callback){
		if(!(name in My._listener))
			My._listener[name] = [];

		My._listener[name].push(callback);
	}

	static off(name, callback){
		if(!(name in My._listener))
			return My._listener[name].length = 0;

		const i = My._listener[name].indexOf(callback);
		if(i === -1) return;
		My._listener[name].splice(i, 1);
	}
}