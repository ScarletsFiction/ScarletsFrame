function createScope(value){
	return {configurable:true, enumerable:true,
		get:()=> value,
		set:(val)=> value = val
	};
}

export default function(obj, key, val){
	var candidate = false;

	function check(temp){
		if(temp === void 0)
			return;

		if(temp.set !== void 0){
			// Can we handle it?
			if(candidate !== false && temp.set !== candidate.set)
				throw new Error("There are more than one object that have different set descriptor");

			candidate = temp;
			return;
		}

		if(candidate === false && val === void 0)
			val = temp.value;
	}

	if(obj.constructor === Array)
		for (var i = 0; i < obj.length; i++)
			check(Object.getOwnPropertyDescriptor(obj[i], key));
	else
		for(var key in obj)
			check(Object.getOwnPropertyDescriptor(obj[key], key));

	if(candidate === false)
		candidate = createScope(val);

	if(obj.constructor === Array)
		for (var i = 0; i < obj.length; i++)
			Object.defineProperty(obj[i], key, candidate);
	else
		for(var key in obj)
			Object.defineProperty(obj[key], key, candidate);
}