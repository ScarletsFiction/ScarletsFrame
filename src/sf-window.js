// This feature is not designed for remote browser
// For using as remote, developer should build
// their own auth or communication system

var headerTags = '';
var windowDestroyListener = false;

sf.window = {
	list:[],
	destroy:function(){
		var list = sf.window.list;
		for (var i = 0; i < list.length; i++)
			list[i].close();
	},
	create:function(options, onLoaded){
		if(options === void 0)
			options = {};

		if(windowDestroyListener === false){
			windowDestroyListener = true;
			window.addEventListener('beforeunload', this.destroy);
		}

		var template = options.templateHTML;
		if(template){
			if(template.constructor !== String){
				console.warn('templateHTML.outerHTML will be used instead');
				console.warn('Please make sure to escape HTML if this was generated with any user input');
				template = template.outerHTML;
			}
		}
		else if(options.templatePath)
			template = window.templates[options.templatePath];
		else if(options.templateURL)
			console.log("Haven't been implemented");
		else console.error("The options must have a template (templatePath | templateHTML | templateURL)");

		if(template === void 0)
			return console.error("Template not found") && false;

		var windowFeatures = `width=${options.width || 500},height=${options.height || 400}`;
		var linker = window.open(window.location.origin+(options.route || ''), '', windowFeatures);

		if(linker === null)
			return console.error("It seems the popup was blocked by the browser") && false;

		if(headerTags === ''){
			headerTags = $('script[src*="scarletsframe"]')[0].outerHTML;
			var styles = $('link, style');

			for (var i = 0; i < styles.length; i++)
				headerTags += styles[i].outerHTML;
		}

		var windows = this.list;
		linker.addEventListener('beforeunload', function(){
			linker.document.body.remove(); // Trigger ScarletsFrame element destructor
			windows.splice(windows.indexOf(linker), 1);

			setTimeout(function(){
				// We must do memory management here about the detached element
				// from detached window
				console.log(`%c[${options.title}]`, "color: #9bff82", "Closed!");
			}, 1000);
		});

		linker.loaded = function(){
			windows.push(linker);

			linker.sf.lang.list = sf.lang.list;
			linker.sf.lang.default = sf.lang.default;
			linker.sf.lang.serverURL = true;
			linker.sf.lang.interpolate = sf.lang.interpolate;

			linker.templates = window.templates;
			linker.sf.space.list = sf.space.list;

			// Model
			linker.sf.model.root = sf.model.root;

			// Component
			portComponentDefinition(linker, sf.component.registered, linker.sf.component.registered);

			var spaces = sf.space.list;
			for(var name in spaces){
				var space = spaces[name];
				var ref = new linker.sf.space(name, {
					templatePath: space.templatePath
				});

				// Model
				for(var id in space.list)
					ref.list[id].root = space[id].root;

				// Component
				portComponentDefinition(linker, space.default.registered, ref.default.registered);
			}

			for(var prop in window){
				if(linker[prop] === void 0)
					linker[prop] = window[prop];
			}

			linker.document.body.innerHTML = template;
			linker.sf$proxy.sfLoaderTrigger();

			onLoaded && onLoaded({
				views: linker.sf.views,
				language: linker.sf.lang,
				url: linker.sf.url
			});

			linker.sf.lang.init(linker.document.body);
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

		return true;
	}
};

function portComponentDefinition(linker, from, into){
	for(var name in from){
		var ref = into[name] = from[name].slice(0);

		if(ref[3] !== void 0){
			if(ref[3].constructor === Object){
				var template = Object.create(ref[3]);
				ref[3] = template;
				template.html = $.parseElement(template.html.outerHTML)[0];
			}
			else{
				var tempDOM = ref[3].tempDOM;
				ref[3] = $.parseElement(ref[3].outerHTML)[0];
				ref[3].tempDOM = tempDOM;
			}
		}

		ref[1] = linker.sf$defineComponent(name);
	}
}