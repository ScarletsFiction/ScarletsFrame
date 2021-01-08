export function NOOP(){}
export const isTouchDevice = ()=> navigator.maxTouchPoints !== 0;

export var internal = {};
export var privateRoot = {};
export var forProxying = {};
export var emptyArray = Object.freeze({length:0});

export var SFOptions = {
	devMode: false,
	hotReload: false,
};

export var sfRegex = {
	getQuotes:/(['"])(?:\1|[\s\S]*?[^\\]\1)/g,
	getAttrQuotes:/=(\\['"])(?:\1|[\s\S]*?[^\\]\1)/g,
	scopeVar:'(^|[^.\\]\\w])',
	// escapeHTML:/(?!&#.*?;)[\u00A0-\u9999<>\&]/gm,

	uniqueDataParser:/{{((@|#[\w])[\s\S]*?)}}/g,
	dataParser:/{{([^@%][\s\S]*?)}}/g,

	repeatedList:/(.*?) in (.*?)$/,
	itemsObserve:/\b(_model_|_modelScope)\.([\w\[\].]+)/g,
	parsePropertyPath:/(?:\[([\w]+)\]|\.([\w]+))/g,
	getSingleMask:['([^\\w.]|^)','([^\\w:]|$)'], //gm
	getScopeList:['(?:[^\\w.]|^)(',')(?:[^\\w:]|$)'], //gm

	inputAttributeType:['checkbox','radio','hidden'],
	anyCurlyBracket:/{{.*?}}/,
	allTemplateBracket:/{\[([\s\S]*?)\]}/g,
	anyOperation:/[ =(+-]/,
};