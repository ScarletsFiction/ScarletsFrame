import {internal} from "./internal.js";

let whenDOMReady = [];
let whenDOMLoaded = [];
let whenProgress = [];
var pendingOrderedJS = [];
let ES6URLCache = {};

let promiseResolver = false;
function resolvePromise(){
	promiseResolver && promiseResolver();
	promiseResolver = false;
}

export class loader{
	static loadedContent = 0;
	static totalContent = 0;
	static DOMWasLoaded = false;
	static DOMReady = false;
	static turnedOff = true;
	static loadPended = false;
	static task = new Promise(function(resolve){
    	promiseResolver = resolve;
    });

	// Make event listener
	static onFinish(func){
		if(loader.DOMWasLoaded) return func();
		if(whenDOMLoaded.includes(func)) return;
		whenDOMLoaded.push(func);
	}
	static domReady(func){
		if(loader.DOMReady) return func();
		if(whenDOMReady.includes(func)) return;
		whenDOMReady.push(func);
	}
	static onProgress(func){
		if(loader.DOMWasLoaded) return func(loader.loadedContent, loader.totalContent);
		if(whenProgress.includes(func)) return;
		whenProgress.push(func);
	}

	static f(ev){
		loader.loadedContent++;

		if(ev){
			ev.target.removeEventListener('load', loader.f, {once:true});
			ev.target.removeEventListener('error', loader.f, {once:true});
		}

	    if(pendingOrderedJS.length !== 0){
	    	if(pendingOrderedJS.length + loader.loadedContent === loader.totalContent)
	    		document.head.appendChild(pendingOrderedJS.shift());
	    }
		else if(loader.loadedContent === loader.totalContent)
			resolvePromise();

	    if(whenProgress === null) return;

		for (let i = 0; i < whenProgress.length; i++)
			whenProgress[i](loader.loadedContent, loader.totalContent);
	}

	static pendingLoad(callback){
		if(callback === void 0)
			throw new Error("First parameter must be filled with a callback or false");

		if(callback === false){
			if(loader.loadPended)
				loader.loadPended.resolve();

			loader.loadPended = false;
			return;
		}

		let pending;
		loader.loadPended = new Promise(function(resolve, reject){
			pending = [resolve, reject];
		});

		loader.loadPended.resolve = pending[0];
		loader.loadPended.reject = pending[1];
		loader.loadPended.callback = callback;

		return loader.loadPended;
	}

	static async css(list, priority){
		if(loader.DOMWasLoaded){
			// check if some list was loaded
			for (var i = list.length - 1; i >= 0; i--) {
				if(document.querySelectorAll(`link[href*="${list[i]}"]`).length !== 0)
					list.splice(i, 1);
			}
			if(list.length === 0) return;
		}

		loader.turnedOff = false;
		loader.totalContent += list.length;

        if(promiseResolver === false){
        	loader.task = new Promise(function(resolve){
        		promiseResolver = resolve;
        	});
        }

		if(loader.loadPended !== false){
			if(loader.loadPended.callback(list) !== true)
				await loader.loadPended;
		}

		let temp = new Array(list.length);
		for(var i = 0; i < list.length; i++){
			const s = temp[i] = document.createElement('link');
	        s.rel = 'stylesheet';
	        s.href = list[i];
	        s.addEventListener('load', loader.f, {once:true});
	        s.addEventListener('error', loader.f, {once:true});
		}

		if(priority === 'low')
        	document.head.prepend(...temp);
        else document.head.append(...temp);

        return loader.task;
	}

	static async js(list, async){
		if(loader.DOMWasLoaded){
			// check if some list was loaded
			for (var i = list.length - 1; i >= 0; i--) {
				if(document.querySelectorAll(`script[src*="${list[i]}"]`).length !== 0)
					list.splice(i, 1);
			}
			if(list.length === 0) return;
		}
		loader.turnedOff = false;

		var ordered;
		if(async && async.constructor === Object){
			ordered = async.ordered;
			async = async.async;
		}

		loader.totalContent += list.length;

        if(promiseResolver === false){
        	loader.task = new Promise(function(resolve){
        		promiseResolver = resolve;
        	});
        }

		if(loader.loadPended !== false){
			if(loader.loadPended.callback(list) !== true)
				await loader.loadPended;
		}

		for(var i = 0; i < list.length; i++){
			const s = document.createElement('script');
	        s.type = "text/javascript";
	        if(async) s.async = true;
	        s.src = list[i];
	        s.addEventListener('load', loader.f, {once:true});
	        s.addEventListener('error', loader.f, {once:true});

	        if(!ordered)
	        	document.head.appendChild(s);
	        else pendingOrderedJS.push(s);
		}

        return loader.task;
	}

	static async mjs(list){
		loader.turnedOff = false;
		let reduce = 0;

		let modules = new Array(list);
		for(var i = list.length; i >= 0; i--){
			let exist = ES6URLCache[list[i]];
			if(exist === void 0) continue;

			modules[i] = exist;
			list[i] = null;
			reduce++;
		}

		loader.totalContent += list.length - reduce;

        if(promiseResolver === false){
        	loader.task = new Promise(function(resolve){
        		promiseResolver = resolve;
        	});
        }

		if(loader.loadPended !== false){
			if(loader.loadPended.callback(list) !== true)
				await loader.loadPended;
		}

		for(var i = 0; i < list.length; i++){
			let url = list[i];
			if(url === null) continue;

			let module = await import(url);
			modules[i] = ES6URLCache[url] = module;

			loader.f(); // Call when finished
		}

        return modules;
	}
};

function domLoadEvent(event){
	// Add processing class to queued element
	if(document.body){
		document.removeEventListener('load', domLoadEvent, true);

		if(loader.turnedOff === false){ // Find images
			const temp = document.body.querySelectorAll('img:not(onload)[src]');
			for (let i = 0; i < temp.length; i++) {
				loader.totalContent++;

				const ref = temp[i];
				ref.addEventListener('load', loader.f, {once:true});
				ref.addEventListener('error', loader.f, {once:true});
			}
		}
	}
}

document.addEventListener("load", domLoadEvent, true);

function domStateEvent(){
	if(document.readyState === 'interactive' || document.readyState === 'complete'){
		if(loader.DOMReady === false){
			loader.DOMReady = true;
			for (let i = 0; i < whenDOMReady.length; i++) {
				try{
					whenDOMReady[i]();
				} catch(e) {
					console.error(e);
					internal.onerror && internal.onerror(e);
				}
			}
		}

		if(loader.turnedOff === false)
			resourceWaitTimer = setInterval(waitResources, 100);
		else setTimeout(waitResources, 10);

		document.removeEventListener('readystatechange', domStateEvent, true);
	}
}

if(document.readyState === 'interactive' || document.readyState === 'complete'){
	document.removeEventListener('load', domLoadEvent, true);

	// Wait until all module has been loaded
	setTimeout(domStateEvent, 1);
}
else document.addEventListener('readystatechange', domStateEvent, true);

var resourceWaitTimer = -1;
function waitResources(){
	if(loader.turnedOff === false && loader.loadedContent < loader.totalContent)
		return;

	clearInterval(resourceWaitTimer);

	const listener = document.querySelectorAll('script, link, img');
	for (var i = 0; i < listener.length; i++) {
		const ref = listener[i];
		ref.removeEventListener('error', loader.f);
		ref.removeEventListener('load', loader.f);
	}

	loader.DOMWasLoaded = true;
	loader.turnedOff = true;

	for (var i = 0; i < whenDOMLoaded.length; i++) {
		try{
			whenDOMLoaded[i]();
		} catch(e){
			console.error(e.model || {func: whenDOMLoaded[i]}, e);
			internal.onerror && internal.onerror(e);
		}
	}

	whenProgress = whenDOMReady = whenDOMLoaded = null;
	resolvePromise();
}

if(window.sf$proxy)
	window.sf$proxy.sfLoaderTrigger = waitResources;