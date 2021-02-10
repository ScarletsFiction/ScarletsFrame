import {$, watch, unwatch} from "../index.js";

var bValue = 123;
var obj = {
	a:1,
	get b(){
		if(bValue === 'ok')
			test.b_get = true;
		return bValue;
	},
	set b(val){
		bValue = val;
	},
};

const test = {
	a: false,
	b: false,
	b_get: false
};

// Single
watch(obj, 'a', function(){
	if(obj.a === 'ok')
		test.a = true;
});

// Multiple
watch(obj, {
	b(){
		if(obj.b === 'ok')
			test.b = true;
	}
});

$(function(){
	setTimeout(()=> {
		if(test.a === false)
			console.error("❌ Object watch for 'a' property was failed");
		if(test.b === false)
			console.error("❌ Object watch for 'b' property was failed");
		if(test.b_get === false)
			console.error("❌ Object watch for 'b' property doesn't get the value from the old getter");

		console.log("Object watch result:", obj, beforeClear);
	}, 2000);

	obj.a = 'ok';
	obj.b = 'ok';

	const bindedKey = obj.sf$bindedKey;
	var beforeClear = [bindedKey.a.callback.slice(0), bindedKey.b.callback.slice(0)]

	unwatch(obj, 'a');
	unwatch(obj, ['b']);
});