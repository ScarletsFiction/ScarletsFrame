import {internal} from "./internal.js";

let whenDOMReady = [];
let whenDOMLoaded = [];
let whenProgress = [];
var pendingOrderedJS = [];
let lastState = '';

export class loader{
	static loadedContent = 0;
	static totalContent = 0;
	static DOMWasLoaded = false;
	static DOMReady = false;
	static turnedOff = true;

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

	    ev.target.removeEventListener('load', loader.f, {once:true});
	    ev.target.removeEventListener('error', loader.f, {once:true});

	    if(pendingOrderedJS.length !== 0){
	    	if(pendingOrderedJS.length + loader.loadedContent === loader.totalContent)
	    		document.head.appendChild(pendingOrderedJS.shift());
	    }

	    if(whenProgress === null) return;

		for (let i = 0; i < whenProgress.length; i++)
			whenProgress[i](loader.loadedContent, loader.totalContent);
	}

	static css(list, priority){
		if(loader.DOMWasLoaded){
			// check if some list was loaded
			for (var i = list.length - 1; i >= 0; i--) {
				if(document.querySelectorAll(`link[href*="${list[i]}"]`).length !== 0)
					list.splice(i, 1);
			}
			if(list.length === 0) return;
		}
		loader.turnedOff = false;

		loader.totalContent = loader.totalContent + list.length;

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
	}

	static js(list, async){
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

		loader.totalContent = loader.totalContent + list.length;
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
	}

	static waitImages(){
		lastState = 'loading';
	}
};

function domLoadEvent(event){
	// Add processing class to queued element
	if(document.body){
		document.removeEventListener('load', domLoadEvent, true);

		if(lastState === 'loading'){ // Find images
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
}

if(window.sf$proxy)
	window.sf$proxy.sfLoaderTrigger = waitResources;