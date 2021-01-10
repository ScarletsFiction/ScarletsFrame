import internal from "./internal.js";

const Self = {};
export default Self;

Self.loadedContent = 0;
Self.totalContent = 0;
Self.DOMWasLoaded = false;
Self.DOMReady = false;
Self.turnedOff = true;

let whenDOMReady = [];
let whenDOMLoaded = [];
let whenProgress = [];

// Make event listener
Self.onFinish = function(func){
	if(Self.DOMWasLoaded) return func();
	if(whenDOMLoaded.includes(func)) return;
	whenDOMLoaded.push(func);
}
Self.domReady = function(func){
	if(Self.DOMReady) return func();
	if(whenDOMReady.includes(func)) return;
	whenDOMReady.push(func);
}
Self.onProgress = function(func){
	if(Self.DOMWasLoaded) return func(Self.loadedContent, Self.totalContent);
	if(whenProgress.includes(func)) return;
	whenProgress.push(func);
}

Self.f = function(ev){
	Self.loadedContent++;

    ev.target.removeEventListener('load', Self.f, {once:true});
    ev.target.removeEventListener('error', Self.f, {once:true});

    if(pendingOrderedJS.length !== 0){
    	if(pendingOrderedJS.length + Self.loadedContent === Self.totalContent)
    		document.head.appendChild(pendingOrderedJS.shift());
    }

    if(whenProgress === null) return;

	for (let i = 0; i < whenProgress.length; i++)
		whenProgress[i](Self.loadedContent, Self.totalContent);
}

Self.css = function(list){
	if(Self.DOMWasLoaded){
		// check if some list was loaded
		for (var i = list.length - 1; i >= 0; i--) {
			if(document.querySelectorAll(`link[href*="${list[i]}"]`).length !== 0)
				list.splice(i, 1);
		}
		if(list.length === 0) return;
	}
	Self.turnedOff = false;

	Self.totalContent = Self.totalContent + list.length;
	for(var i = 0; i < list.length; i++){
		const s = document.createElement('link');
        s.rel = 'stylesheet';
        s.href = list[i];
        s.addEventListener('load', Self.f, {once:true});
        s.addEventListener('error', Self.f, {once:true});
        document.head.appendChild(s);
	}
}

Self.js = function(list, async){
	if(Self.DOMWasLoaded){
		// check if some list was loaded
		for (var i = list.length - 1; i >= 0; i--) {
			if(document.querySelectorAll(`script[src*="${list[i]}"]`).length !== 0)
				list.splice(i, 1);
		}
		if(list.length === 0) return;
	}
	Self.turnedOff = false;

	var ordered;
	if(async && async.constructor === Object){
		ordered = async.ordered;
		async = async.async;
	}

	Self.totalContent = Self.totalContent + list.length;
	for(var i = 0; i < list.length; i++){
		const s = document.createElement('script');
        s.type = "text/javascript";
        if(async) s.async = true;
        s.src = list[i];
        s.addEventListener('load', Self.f, {once:true});
        s.addEventListener('error', Self.f, {once:true});

        if(!ordered)
        	document.head.appendChild(s);
        else pendingOrderedJS.push(s);
	}
}

var pendingOrderedJS = [];

let lastState = '';
Self.waitImages = function(){
	lastState = 'loading';
}

function domLoadEvent(event){
	// Add processing class to queued element
	if(document.body){
		document.removeEventListener('load', domLoadEvent, true);

		if(lastState === 'loading'){ // Find images
			const temp = document.body.querySelectorAll('img:not(onload)[src]');
			for (let i = 0; i < temp.length; i++) {
				Self.totalContent++;
				temp[i].addEventListener('load', Self.f, {once:true});
				temp[i].addEventListener('error', Self.f, {once:true});
			}
		}
	}
}

document.addEventListener("load", domLoadEvent, true);

function domStateEvent(){
	if(document.readyState === 'interactive' || document.readyState === 'complete'){
		if(Self.DOMReady === false){
			Self.DOMReady = true;
			for (let i = 0; i < whenDOMReady.length; i++) {
				try{
					whenDOMReady[i]();
				} catch(e) {
					console.error(e);
					internal.onerror && internal.onerror(e);
				}
			}
		}

		if(Self.turnedOff === false)
			resourceWaitTimer = setInterval(waitResources, 100);
		else waitResources();

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
	if(Self.turnedOff === false && Self.loadedContent < Self.totalContent)
		return;

	clearInterval(resourceWaitTimer);

	const listener = document.querySelectorAll('script, link, img');
	for (var i = 0; i < listener.length; i++) {
		listener[i].removeEventListener('error', Self.f);
		listener[i].removeEventListener('load', Self.f);
	}

	Self.DOMWasLoaded = true;
	Self.turnedOff = true;

	for (var i = 0; i < whenDOMLoaded.length; i++) {
		try{
			whenDOMLoaded[i]();
		} catch(e){
			console.error({func: whenDOMLoaded[i]}, e);
			internal.onerror && internal.onerror(e);
		}
	}

	whenProgress = whenDOMReady = whenDOMLoaded = null;
}

if(window.sf$proxy)
	window.sf$proxy.sfLoaderTrigger = waitResources;