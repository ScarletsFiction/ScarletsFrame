export function NOOP(){}
export const isTouchDevice = ()=> navigator.maxTouchPoints !== 0;

export const internal = {
	virtualScrolling: false,
	space: {empty:true},
	windowEv: {},
	WindowList: {},
	WindowClass: {},
	reopenInspector: []
};
export var privateRoot = {};
export var HotReload = {
	proxyTemplate: {},
};
export var forProxying = {};
export var emptyArray = Object.freeze([]);

export var SFOptions = {
	devMode: false,
	hotReload: false,
};

// In case if we need to support Japan/China/Korea character on Object property
// Replace: "\w$_" with another regex that can ignore symbols like [^ ()]
export var sfRegex = {
	getQuotes:/(['"])(?:\1|[\s\S]*?[^\\]\1)/g,
	getAttrQuotes:/=(\\['"])(?:\1|[\s\S]*?[^\\]\1)/g,
	scopeVar:'(^|[^.\\]\\w$])',
	// escapeHTML:/(?!&#.*?;)[\u00A0-\u9999<>\&]/gm,

	uniqueDataParser:/{{((@|#[\w])[\s\S]*?)}}/g,
	dataParser:/{{([^@%][\s\S]*?)}}/g,

	repeatedList:/(.*?) in (.*?)$/,
	itemsObserve:/\b(_model_|_modelScope)\.([\w$_\[\].]+)/g,
	parsePropertyPath:/(?:\[(['"\w$_]+)\]|\.([\w$_]+))/g,
	getSingleMask:['([^\\w$_.]|^)','([^\\w$_:]|$)'], //gm
	getScopeList:['(?:[^\\w$_.]|^)(',')(?:[^\\w$_:]|$)'], //gm

	inputAttributeType:['checkbox','radio','hidden'],
	anyCurlyBracket:/{{.*?}}/,
	allTemplateBracket:/{\[([\s\S]*?)\]}/g,
	anyOperation:/[ =(+-]/,

	jsSymbols: /['"`~!@#%^&*()\-+=\[\]{}\\|:;<>,. /?]/,
};

export var HTMLTemplates = window.templates || {};
export var TemplatePending = [];
Object.defineProperty(Window.prototype, 'templates', {
	set: val=> {
		HTMLTemplates = val;
		SFOptions.hotReload && HotReload.Template(val);

		if(TemplatePending.length !== 0){
			var temp = TemplatePending;
			TemplatePending = [];

			for (var i = 0; i < temp.length; i++)
				temp[i]();
		}
	},
	get:()=> HTMLTemplates
});