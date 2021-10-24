// This feature is not designed for remote browser
// For using as remote, developer should build
// their own auth or communication system

import {internal, forProxying} from "./shared.js";
import {model} from "./sf-model.js";
import {component} from "./sf-component.js";
import {Space} from "./sf-space.js";
import {language} from "./sf-language.js";
import {ModelInit} from "./sf-model/a_model.js";
import {parseElement} from "./sf-dom.utils.js";
let {windowEv} = internal;
let headerTags = '';

let consoleStyle = "background: yellow;border-radius: 0.5em;color: black;font-weight: bold;padding: 2px 4px;"; // #00BCD4

function winDestroy(win){
	const opt = win.winOptions;
	if(opt.onclose && opt.onclose() === false){
		ev.preventDefault();
		return false;
	}

	win.destroying = true;

	delete Window.list[opt.id];
	win.document.body.remove();
	win.close();
	console.log(`%c${opt.title}`, consoleStyle, "Closed!");
}

const reqAnimFrame = window.requestAnimationFrame;
function firstInitSFWindow(){
	window.addEventListener('focus', function(){
		window.requestAnimationFrame = reqAnimFrame;
		Window.root.focus = window;
	});
}

function restyleConsoleOutput(message, style, args){
	let first = args[0];
	if(first != null && first.constructor === String){
		args[0] = message + `%c ${first}`;
		args.splice(1, 0, style, '');
		return args;
	}

	args.unshift(message, style);
	return args;
}

export class Window{
	static frameworkPath = "";
	// id = ...

	constructor(options, onLoaded){
		options ??= {};
		options.id ??= Math.round(Math.random()*1000) + String(Date.now()).slice(3);

		const winID = this.id = options.id;
		if(!internal.windowDestroyListener){
			internal.windowDestroyListener = true;
			window.addEventListener('beforeunload', function(){
				Window.destroy();
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
			throw new Error("Template not found");

		const windowFeatures = `width=${options.width || 500},height=${options.height || 400}`;
		const linker = this.context = window.open(window.location.origin+(options.route || ''), '', windowFeatures);

		if(linker === null)
			throw new Error("It seems the popup was blocked by the browser");

		linker.document.body.textContent = '';
		linker.document.head.textContent = '';

		if(headerTags === ''){
			headerTags = document.querySelector('script[src*="scarletsframe"]');
			if(headerTags === null){
				if(Window.frameworkPath === '')
					throw new Error("Failed to automatically detect framework URL. Please specify URL in the 'sf.Window.frameworkPath'. (example: 'https://cdn.jsdelivr.net/npm/scarletsframe@latest/dist/scarletsframe.min.js')");

				headerTags = `<script src="${Window.frameworkPath}"></script>`;
			}
			else headerTags = headerTags.outerHTML;

			const styles = document.querySelectorAll('link, style');
			for (let i = 0; i < styles.length; i++)
				headerTags += styles[i].outerHTML;
		}

		linker.winOptions = options;

		linker.loaded = function(){
			Window.list[winID] = linker;

			// Temporary backward compatibility
			if(linker.sf.Space === void 0 && linker.sf.space !== void 0){
				linker.sf.Space = linker.sf.space;
				linker.sf.language = linker.sf.lang;
				linker.sf.URI = linker.sf.url;
				linker.sf.Views = linker.sf.views;
			}

			if(linker.sf.Space === void 0)
				throw new Error("Looks like ScarletsFrame.js can't be loaded from the other window.");

			linker.sf.Space.list = Space.list;
			linker.sf.Window.root = Window.root;

			// Proxying
			linker.sf.model.root = model.root;
			linker.sf.model.init = ModelInit;
			linker.sf.component.new = component.new;
			linker.sf.language.init = language.init;
			linker.sf.language.changeDefault = language.changeDefault;

			// Put original reference for different constructor
			linker.Text._ref = Text;
			linker.Comment._ref = Comment;
			linker.SVGSVGElement._ref = SVGSVGElement;
			linker.HTMLInputElement._ref = HTMLInputElement;
			linker.HTMLTextAreaElement._ref = HTMLTextAreaElement;
			linker.HTMLTemplateElement._ref = HTMLTemplateElement;

			// Component
			portComponentDefinition(linker, component.registered, linker.sf.component.registered);

			const spaces = Space.list;
			for(let name in spaces){
				const space = spaces[name];
				const ref = new linker.sf.Space(name, {
					templatePath: space.templatePath
				});

				// Model
				for(let id in space.list)
					ref.list[id].root = space[id].root;

				// Component
				portComponentDefinition(linker, space.default.registered, ref.default.registered);
			}

			$(linker.document.body).append(template);
			linker.sf$proxy.sfLoaderTrigger();

			if(firstInitSFWindow){
				firstInitSFWindow();
				firstInitSFWindow = void 0;
			}

			if(document.hasFocus() === false){
				window.requestAnimationFrame = linker.requestAnimationFrame;
				Window.root.focus = linker;
			}

			linker.addEventListener('focus', function(){
				window.requestAnimationFrame = linker.requestAnimationFrame;
				Window.root.focus = linker;
			});

			onLoaded && onLoaded({
				Views: linker.sf.Views,
				URI: linker.sf.URI
			});

			language.init(linker.document.body);

			for(let ev in windowEv){
				const callbackList = windowEv[ev];
				for (let i = 0; i < callbackList.length; i++) {
					const evCallback = callbackList[i];
					linker.addEventListener(ev, evCallback, evCallback.options);
				}
			}

			linker.loaded = null;
		}

		options.title ??= "Untitled Space";
		linker.console.log("Console output will be forwarded to main DevTools");

		linker.console.log = function(){
			console.log(...restyleConsoleOutput(`%c${options.title}`, consoleStyle, [...arguments]));
		}

		linker.console.warn = function(){
			console.warn(...restyleConsoleOutput(`%c${options.title}`, consoleStyle, [...arguments]));
		}

		linker.console.error = function(){
			console.error(...restyleConsoleOutput(`%c${options.title}`, consoleStyle, [...arguments]));
		}

		linker.sf$proxy = forProxying;

		linker.onerror = linker.onmessageerror = linker.console.error;
		linker.document.write(`<html><head><title>${
			options.title}</title>${headerTags
		}</head><body><script>setTimeout(loaded,1000)</script></body></html>`);

		linker.addEventListener('beforeunload', function(ev){
			Window.destroy(winID);
		});
	}

	destroy(){
		Window.destroy(this.id);
	}

	// === Static ===
	static list = internal.WindowList;
	static destroy(id){
		if(id !== void 0)
			winDestroy(Window.list[id]);
		else{
			const { list } = Window;
			for(let k in list)
				winDestroy(list[k]);
		}

		window.requestAnimationFrame = reqAnimFrame;
	}
	static source(lists, ev){
		ev ??= Window.root.focus.event || Window.window.event;

		if(ev === void 0)
			throw new Error("Can't capture event, please add event data on parameter 2 of sf.Window.source");

		if(lists === void 0)
			return ev.view;

		const doc = ev.view.document;
		for (let i = 0; i < lists.length; i++) {
			if(lists[i].ownerDocument === doc)
				return lists[i];
		}

		return null;
	}

	static withElement(element, ev){
		ev ??= Window.root.focus.event || Window.window.event;

		if(ev === void 0)
			throw new Error("Can't capture event, please add event data on parameter 2 of sf.Window.source");

		return element.ownerDocument === ev.view.document;
	}
}

internal.WindowClass = Window;
Window.root ??= Window;
Window.window = window;
Window.focus ??= window;

function portComponentDefinition(linker, from, into){
	for(let name in from){
		const ref = into[name] = from[name].slice(0);

		if(ref[3] !== void 0){
			if(ref[3].constructor === Object){
				const template = Object.create(ref[3]);
				ref[3] = template;
				template.html = parseElement(template.html.outerHTML)[0];
			}
			else{
				const { tempDOM } = ref[3];
				ref[3] = parseElement(ref[3].outerHTML)[0];
				ref[3].tempDOM = tempDOM;
			}
		}

		ref[1] = linker.sf$defineComponent(name);
	}
}