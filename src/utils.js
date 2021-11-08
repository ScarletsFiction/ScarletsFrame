import {sfRegex} from "./shared.js";
let unsupportedDynamic = "Dynamic input binding haven't been supported. Maybe you was trying to bind with 'function.call()' or 'obj[dynamicVal]' on your template. Please create new issue if you need this feature.\n\n";

export function parsePropertyPath(str){
	var temp = [];

	if(str.includes('(')){
		console.error(unsupportedDynamic, str);
		return temp;
	}

	temp.unshift(str.replace(sfRegex.parsePropertyPath, function(full, g1, g2){
		if(g1 !== void 0){
			if(isNaN(g1) === false)
				g1 = Number(g1);
			else if(g1.slice(0, 1) === '"' || g1.slice(0, 1) === "'")
				g1 = g1.slice(1, -1);
			else{
				console.error(unsupportedDynamic, str);
				// temp.hasDynamic = true;
				// g1 = `@${g1}`;
			}

			temp.push(g1);
			return '';
		}

		temp.push(g2);
		return '';
	}).trim());

	return temp;
}

export function stringifyPropertyPath(properties){
	var remake = properties[0];
	for (var i = 1; i < properties.length; i++) {
		if(properties[i].constructor === Number)
			remake += `[${properties[i]}]`;
		else
			remake += `.${properties[i]}`;
	}

	return remake;
}

var _es = '%@~';
var _esRegexp = /%@~(\d+)%@~/g;
export function avoidQuotes(str, func, onQuotes, isAttr){
	str = str.split(_es).join('-');

	var temp = [];
	str = str.replace(isAttr ? sfRegex.getAttrQuotes : sfRegex.getQuotes, function(full){
		temp.push(full);
		return _es+(temp.length-1)+_es;
	});

	if(temp.length === 0)
		return func(str);

	str = func(str);

	if(onQuotes !== void 0){
		str = str.replace(_esRegexp, function(full, i){
			return onQuotes(temp[+i]);
		});
	}
	else{
		str = str.replace(_esRegexp, function(full, i){
			return temp[+i];
		});
	}

	return str;
}

export function isEmptyObject(obj){
	for(var key in obj){
		return false;
	}
	return true
}

export function compareObject(obj1, obj2){
	if(obj1 === obj2)
		return true;

	if(!obj1 || !obj2)
		return false;

	if(obj1.constructor === Array){
		if(obj1.length !== obj2.length)
			return false;

		for (var i = 0; i < obj1.length; i++) {
			if(obj1[i] !== obj2[i])
				return false;
		}

		return true;
	}

	var o1 = Object.keys(obj1);
	var o2 = Object.keys(obj2);

	if(o1.length !== o2.length)
		return false;

	var n = o1.length < o2.length ? o2 : o1;
	for (var i = 0; i < n.length; i++) {
		if(obj1[n[i]] !== obj2[n[i]])
			return false;
	}

	return true;
}

export function hiddenProperty(obj, property, value, isWritable){
	Object.defineProperty(obj, property, {
		enumerable: false,
		configurable: true,
		writable: isWritable,
		value: value
	});
}

export function deepProperty(obj, path){
	// obj.hasDynamic => has data[dynamic_prop].stuff
	// ['data', '@dynamic_prop', 'stuff']

	for(var i = 0; i < path.length; i++){
		obj = obj[path[i]];
		if(obj === void 0) return;
	}
	return obj;
}

export function capitalizeLetters(name){
	for (var i = 0; i < name.length; i++)
		name[i] = name[i].slice(0, 1).toUpperCase() + name[i].slice(1);

	return name.join('');
}

export function getStaticMethods(keys, clas){
	var keys2 = Object.getOwnPropertyNames(clas);

	for(var i = 0; i < keys2.length; i++){
		if(typeof clas[keys2[i]] === 'function')
			keys.add(keys2[i]);
	}
}

export function getPrototypeMethods(keys, clas){
	if(clas.prototype === void 0 || clas === Function || clas === Object)
		return;

	var keys2 = Object.getOwnPropertyNames(clas.prototype);
	for (var i = keys2.length - 1; i >= 0; i--) {
		if(keys2[i] !== 'constructor')
			keys.add(keys2[i]);
	}

	var deep = Object.getPrototypeOf(clas);
	if(deep.prototype !== void 0)
		getPrototypeMethods(keys, deep);
}

export function proxyClass(scope){
	var parent = scope.constructor;
	var proto = parent.prototype;

	var list = new Set();
	getPrototypeMethods(list, parent);

	for(var key of list){
		let tempProto = proto[key];
		if(tempProto == null || tempProto.constructor !== Function)
			continue;

		let tempScope = scope[key];

		// Proxy only when child method has similar name with the parent
		if(tempScope !== tempProto && tempScope.ref === void 0){
			let tempProxy = function(){
				scope.super = tempProxy.protoFunc;
				return tempProxy.ref.apply(scope, arguments);
			}

			tempProxy.ref = tempScope;
			tempProxy.protoFunc = tempProto;

			scope[key] = tempProxy;
		}
	}
}

// Faster than Array.from on some condition
export function toArray(b){
	var c = new Array(b.length);
	for(var i=0; i<c.length; i++)
		c[i] = b[i];

	return c;
}

export function getCallerFile(step){
	try{throw new Error()}catch(e){
		var temp = e.stack.split('\n')[step+2];
		if(!temp) return '';
		return temp.split('://').pop();
	}
}

// Get property of the model
export function modelKeys(modelRef, toString){
	// it maybe custom class
	if(modelRef.constructor !== Object && modelRef.constructor !== Array){
		var keys = new Set();
		for(var key in modelRef)
			keys.add(key);

		getStaticMethods(keys, modelRef.constructor);
		getPrototypeMethods(keys, modelRef.constructor);

		if(toString){
			let temp = '';
			for(var key of keys){
				if(temp.length === 0){
					temp += key;
					continue;
				}

				temp += `|${key}`;
			}

			return temp;
		}

		return [...keys];
	}

	var keys = [];
	for(var key in modelRef)
		keys.push(key);

	if(toString)
		return keys.join('|');

	return keys;
}

export function findBindListElement(el, includeComponent){
	el = el.parentNode;
	while(el !== null){
		if((el.sf$elementReferences && el.sf$elementReferences.template.bindList) || (includeComponent && el.sf$controlled !== void 0))
			return el;

		el = el.parentNode;
	}
	return null;
}

export function getScope(el, returnNode){
	el ??= $0;

	// If it's Node type
	if(el.tagName !== void 0){
		if(el.sf$controlled === void 0 && !(el.sf$elementReferences && el.sf$elementReferences.template.bindList))
			el = findBindListElement(el, true);

		if(el === null)
			return el;

		return returnNode ? el : el.model;
	}
};

// Improvement from my answer https://stackoverflow.com/a/66120819/6563200
export const isClass = (function(){
  const classDefaultProp = {name:true, length:true, prototype:true, arguments:true, caller:true};

  return function(func){
    // Class constructor is also a function
    if(!(func && func.constructor === Function) || func.prototype === undefined)
      return false;

    // This is a class that extends other class
    if(Function.prototype !== Object.getPrototypeOf(func))
      return true;

    // Usually a function will only have 'constructor' in the prototype
    if(Object.getOwnPropertyNames(func.prototype).length > 1)
      return true;

    // Check if at least have one static property
    let props = Object.getOwnPropertyNames(func);
    for(let i=0; i<props.length; i++){
      let prop = props[i];
      if(!(prop in classDefaultProp) && prop.slice(0, 1) !== '_')
        return true;
    }

    // Not recognized as a class object
    return false;
  }
})();