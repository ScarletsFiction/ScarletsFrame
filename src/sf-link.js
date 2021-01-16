const createScope = value=> ({
	configurable:true, enumerable:true,
	get:()=> value,
	set:(val)=> {value = val}
});

// obj = Array of object that will be linked
export default function(obj, key, val){
	if(obj.push === void 0)
		throw new Error("Parameter one of sf.link should be an array of object that would be linked.");

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

	if(candidate === false)
		candidate = createScope(val);

	if(obj.constructor === Array)
		for (var i = 0; i < obj.length; i++)
			Object.defineProperty(obj[i], key, candidate);
}