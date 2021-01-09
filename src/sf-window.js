// This feature is not designed for remote browser
// For using as remote, developer should build
// their own auth or communication system

import {internal} from "./shared.js";
let {windowEv} = internal;
let headerTags = '';

function winDestroy(win){
	const opt = win.winOptions;
	if(opt.onclose && opt.onclose() === false){
		ev.preventDefault();
		return false;
	}

	win.destroying = true;

	delete sf.window.list[opt.id];
	win.document.body.remove();
	win.close();
	console.log(`%c[${opt.title}]`, "color: #9bff82", "Closed!");
}

const reqAnimFrame = window.requestAnimationFrame;
function firstInitSFWindow(){
	window.addEventListener('focus', function(){
		window.requestAnimationFrame = reqAnimFrame;
	});
}

const SFWindow = {
	list:{},
	destroy(id){
		if(id !== void 0)
			winDestroy(this.list[id]);
		else{
			const { list } = this;
			for(let k in list)
				winDestroy(list[k]);
		}

		window.requestAnimationFrame = reqAnimFrame;
	},
	create(options, onLoaded){
		if(options === void 0)
			options = {};

		if(options.id === void 0)
			options.id = Math.round(Math.random()*1000) + String(Date.now()).slice(3);

		const winID = options.id;
		if(internal.windowDestroyListener === false){
			internal.windowDestroyListener = true;
			window.addEventListener('beforeunload', function(){
				sf.window.destroy();
			});
		}

		let template;
		if(options.templateHTML)
			template = options.templateHTML;
		else if(options.templatePath)
			template = window.templates[options.templatePath];
		else if(options.templateURL)
			console.log("Haven't been implemented");
		else console.error("The options must have a template (templatePath | templateHTML | templateURL)");

		if(template === void 0)
			return console.error("Template not found") && false;

		const windowFeatures = `width=${options.width || 500},height=${options.height || 400}`;
		const linker = window.open(window.location.origin+(options.route || ''), '', windowFeatures);

		if(linker === null)
			return console.error("It seems the popup was blocked by the browser") && false;

		if(headerTags === ''){
			headerTags = $('script[src*="scarletsframe"]')[0].outerHTML;
			const styles = $('link, style');

			for (let i = 0; i < styles.length; i++)
				headerTags += styles[i].outerHTML;
		}

		linker.winOptions = options;

		const windows = this.list;
		linker.loaded = function(){
			windows[winID] = linker;

			if(linker.sf.space === void 0)
				throw new Error("Looks like ScarletsFrame.js can't be loaded from the other window.");

			linker.sf.space.list = sf.space.list;

			// Proxying
			linker.sf.model.root = sf.model.root;
			linker.sf.model.init = sf.model.init;
			linker.sf.component.new = sf.component.new;
			linker.sf.lang.init = sf.lang.init;
			linker.sf.lang.changeDefault = sf.lang.changeDefault;

			// Put original reference for different constructor
			linker.Text._ref = Text;
			linker.Comment._ref = Comment;
			linker.SVGSVGElement._ref = SVGSVGElement;
			linker.HTMLInputElement._ref = HTMLInputElement;
			linker.HTMLTextAreaElement._ref = HTMLTextAreaElement;
			linker.HTMLTemplateElement._ref = HTMLTemplateElement;

			// Component
			portComponentDefinition(linker, sf.component.registered, linker.sf.component.registered);

			const spaces = sf.space.list;
			for(let name in spaces){
				const space = spaces[name];
				const ref = new linker.sf.space(name, {
					templatePath: space.templatePath
				});

				// Model
				for(let id in space.list)
					ref.list[id].root = space[id].root;

				// Component
				portComponentDefinition(linker, space.default.registered, ref.default.registered);
			}

			linker.document.body.textContent = '';
			$(linker.document.body).append(template);
			linker.sf$proxy.sfLoaderTrigger();

			if(firstInitSFWindow){
				firstInitSFWindow();
				firstInitSFWindow = void 0;
			}

			if(document.hasFocus() === false)
				window.requestAnimationFrame = linker.requestAnimationFrame;

			linker.addEventListener('focus', function(){
				window.requestAnimationFrame = linker.requestAnimationFrame;
			});

			onLoaded && onLoaded({
				views: linker.sf.views,
				url: linker.sf.url
			});

			sf.lang.init(linker.document.body);

			for(let ev in windowEv){
				const callbackList = windowEv[ev];
				for (let i = 0; i < callbackList.length; i++) {
					const evCallback = callbackList[i];
					linker.addEventListener(ev, evCallback, evCallback.options);
				}
			}
		}

		if(options.title === void 0)
			options.title = "Untitled Space";

		linker.console.log = function(){
			console.log(`%c[${options.title}]`, "color: #9bff82", ...arguments);
		}

		linker.console.warn = function(){
			console.warn(`%c[${options.title}]`, "color: #9bff82", ...arguments);
		}

		linker.console.error = function(){
			console.error(`%c[${options.title}]`, "color: #9bff82", ...arguments);
		}

		linker.sf$proxy = forProxying;

		linker.onerror = linker.onmessageerror = linker.console.error;
		linker.document.write(`<html><head><title>${
			options.title}</title>${headerTags
		}</head><body><script>setTimeout(loaded,1000)</script></body></html>`);

		linker.addEventListener('beforeunload', function(ev){
			sf.window.destroy(winID);
		});

		return true;
	},
	source(lists, ev){
		if(ev === void 0)
			ev = window.event;

		if(ev === void 0)
			throw new Error("Can't capture event, please add event data on parameter 2 of sf.window.source");

		if(lists === void 0)
			return lists.view;

		const doc = ev.view.document;
		for (let i = 0; i < lists.length; i++) {
			if(lists[i].ownerDocument === doc)
				return lists[i];
		}

		return null;
	}
};

function portComponentDefinition(linker, from, into){
	for(let name in from){
		const ref = into[name] = from[name].slice(0);

		if(ref[3] !== void 0){
			if(ref[3].constructor === Object){
				const template = Object.create(ref[3]);
				ref[3] = template;
				template.html = $.parseElement(template.html.outerHTML)[0];
			}
			else{
				const { tempDOM } = ref[3];
				ref[3] = $.parseElement(ref[3].outerHTML)[0];
				ref[3].tempDOM = tempDOM;
			}
		}

		ref[1] = linker.sf$defineComponent(name);
	}
}

export default SFWindow;