const self = {};
export default self;

self.loadedContent = 0;
self.totalContent = 0;
self.DOMWasLoaded = false;
self.DOMReady = false;
self.turnedOff = true;

let whenDOMReady = [];
let whenDOMLoaded = [];
let whenProgress = [];

// Make event listener
self.onFinish = function(func){
	if(self.DOMWasLoaded) return func();
	if(whenDOMLoaded.includes(func)) return;
	whenDOMLoaded.push(func);
}
self.domReady = function(func){
	if(self.DOMReady) return func();
	if(whenDOMReady.includes(func)) return;
	whenDOMReady.push(func);
}
self.onProgress = function(func){
	if(self.DOMWasLoaded) return func(self.loadedContent, self.totalContent);
	if(whenProgress.includes(func)) return;
	whenProgress.push(func);
}

self.f = function(ev){
	self.loadedContent++;

    ev.target.removeEventListener('load', self.f, {once:true});
    ev.target.removeEventListener('error', self.f, {once:true});

    if(pendingOrderedJS.length !== 0){
    	if(pendingOrderedJS.length + self.loadedContent === self.totalContent)
    		document.head.appendChild(pendingOrderedJS.shift());
    }

    if(whenProgress === null) return;

	for (let i = 0; i < whenProgress.length; i++)
		whenProgress[i](self.loadedContent, self.totalContent);
}

self.css = function(list){
	if(self.DOMWasLoaded){
		// check if some list was loaded
		for (var i = list.length - 1; i >= 0; i--) {
			if(document.querySelectorAll(`link[href*="${list[i]}"]`).length !== 0)
				list.splice(i, 1);
		}
		if(list.length === 0) return;
	}
	self.turnedOff = false;

	self.totalContent = self.totalContent + list.length;
	for(var i = 0; i < list.length; i++){
		const s = document.createElement('link');
        s.rel = 'stylesheet';
        s.href = list[i];
        s.addEventListener('load', self.f, {once:true});
        s.addEventListener('error', self.f, {once:true});
        document.head.appendChild(s);
	}
}

self.js = function(list, async){
	if(self.DOMWasLoaded){
		// check if some list was loaded
		for (var i = list.length - 1; i >= 0; i--) {
			if(document.querySelectorAll(`script[src*="${list[i]}"]`).length !== 0)
				list.splice(i, 1);
		}
		if(list.length === 0) return;
	}
	self.turnedOff = false;

	var ordered;
	if(async && async.constructor === Object){
		ordered = async.ordered;
		async = async.async;
	}

	self.totalContent = self.totalContent + list.length;
	for(var i = 0; i < list.length; i++){
		const s = document.createElement('script');
        s.type = "text/javascript";
        if(async) s.async = true;
        s.src = list[i];
        s.addEventListener('load', self.f, {once:true});
        s.addEventListener('error', self.f, {once:true});

        if(!ordered)
        	document.head.appendChild(s);
        else pendingOrderedJS.push(s);
	}
}

var pendingOrderedJS = [];

let lastState = '';
self.waitImages = function(){
	lastState = 'loading';
}

function domLoadEvent(event){
	// Add processing class to queued element
	if(document.body){
		document.removeEventListener('load', domLoadEvent, true);

		if(lastState === 'loading'){ // Find images
			const temp = document.body.querySelectorAll('img:not(onload)[src]');
			for (let i = 0; i < temp.length; i++) {
				self.totalContent++;
				temp[i].addEventListener('load', self.f, {once:true});
				temp[i].addEventListener('error', self.f, {once:true});
			}
		}
	}
}

document.addEventListener("load", domLoadEvent, true);

function domStateEvent(){
	if(document.readyState === 'interactive' || document.readyState === 'complete'){
		if(self.DOMReady === false){
			self.DOMReady = true;
			for (let i = 0; i < whenDOMReady.length; i++) {
				try{
					whenDOMReady[i]();
				} catch(e) {
					console.error(e);
					sf.onerror && sf.onerror(e);
				}
			}
		}

		if(self.turnedOff === false)
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
	if(self.turnedOff === false && self.loadedContent < self.totalContent)
		return;

	clearInterval(resourceWaitTimer);

	const listener = document.querySelectorAll('script, link, img');
	for (var i = 0; i < listener.length; i++) {
		listener[i].removeEventListener('error', self.f);
		listener[i].removeEventListener('load', self.f);
	}

	self.DOMWasLoaded = true;
	self.turnedOff = true;

	for (var i = 0; i < whenDOMLoaded.length; i++) {
		try{
			whenDOMLoaded[i]();
		} catch(e){
			console.error(e);
			sf.onerror && sf.onerror(e);
		}
	}

	whenProgress = whenDOMReady = whenDOMLoaded = null;
}

if(window.sf$proxy)
	window.sf$proxy.sfLoaderTrigger = waitResources;