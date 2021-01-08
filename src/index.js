console.log('hello');

import "./shared.js";
import "./sf.js";
import "./sf-api.js";
import "./sf-component.js";
import "./sf-dom.js";
import "./sf-events.js";
import "./sf-hot-reload.js";
import "./sf-language.js";
import "./sf-link.js";
import "./sf-loader.js";
import "./sf-model.js";
import "./sf-request.js";
import "./sf-security.js";
import "./sf-space.js";
import "./sf-url.js";
import "./sf-views.js";
import "./sf-window.js";


export var HTMLTemplates = window.templates || {};

var TemplatePending = [];
Object.defineProperty(window, 'templates', {
	set: val=> {
		HTMLTemplates = val;
		hotReload && internal.hotTemplate(val);

		if(TemplatePending.length !== 0){
			var temp = TemplatePending;
			TemplatePending = [];

			for (var i = 0; i < temp.length; i++)
				temp[i]();
		}
	},
	get:()=> HTMLTemplates
});

// import.meta.hot?.accept();