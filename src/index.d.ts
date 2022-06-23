// Type definitions for ScarletsFrame, still not perfect yet
// Project: https://github.com/ScarletsFiction/ScarletsFrame
// Definitions by: StefansArya <https://github.com/stefansarya>

declare type ModelScope = (state: SFModel, root:(name: String) => SFModel) => void;
declare type ComponentScope = (state: SFModel, root:(name: String) => SFModel, $item: any) => SFModel | void;

export type sQuery = DOMList;
export class DOMList extends Array<Element> {
	constructor(arrayLength?: number);
	constructor(arrayLength: number);
	constructor(...items: any[]);
	parent(selector: Element): DOMList;
	prev(selector: Element): DOMList;
	prevAll(selector: Element): DOMList;
	next(selector: Element): DOMList;
	nextAll(selector: Element): DOMList;
	children(selector: Element): DOMList;
	remove(): DOMList;
	empty(): DOMList;
	addClass(name: string): DOMList;
	removeClass(name: string): DOMList;
	toggleClass(name: string): DOMList;
	hasClass(name: string): boolean;
	prop(name: string, value?: any): DOMList;
	attr(name: string, value?: string): DOMList;
	removeAttr(name: string): DOMList;
	css(name: string, value?: string): DOMList;
	on(event: string, selector: string, callback: Function, options?: object): DOMList;
	on(event: string, options: object, callback: Function): DOMList;
	on(event: string, callback: Function): DOMList;
	off(event: string, selector: string, callback: Function, options?: object): DOMList;
	off(event: string, options: object, callback: Function): DOMList;
	off(event: string, callback: Function): DOMList;
	once(event: string, selector: string, callback: Function, options?: object): DOMList;
	once(event: string, options: object, callback: Function): DOMList;
	once(event: string, callback: Function): DOMList;
	trigger(event: string, data?: any, direct?: boolean): DOMList;
	animateKey(name: string, callback?: Function, duration?: number): DOMList;
	each(callback: (index?: number, value?: any) => void): DOMList;
	data(key: string, value?: any): DOMList;
	removeData(key: string): DOMList;
	append(element: Element | DOMList): DOMList;
	prepend(element: Element | DOMList): DOMList;
	eq(index: number, count?: number): DOMList;
	inserAfter(element: Element | DOMList): DOMList;
	inserBefore(element: Element | DOMList): DOMList;
	text(text: string): DOMList;
	text(): string;
	html(text: string): DOMList;
	html(): string;
	val(val?: string): DOMList;
	val(): string;
	click(data?: any): DOMList;
	blur(data?: any): DOMList;
	focus(data?: any): DOMList;
	focusin(data?: any): DOMList;
	focusout(data?: any): DOMList;
	keyup(data?: any): DOMList;
	keydown(data?: any): DOMList;
	keypress(data?: any): DOMList;
	submit(data?: any): DOMList;
	change(data?: any): DOMList;
	mousedown(data?: any): DOMList;
	mousemove(data?: any): DOMList;
	mouseup(data?: any): DOMList;
	mouseenter(data?: any): DOMList;
	mouseleave(data?: any): DOMList;
	mouseout(data?: any): DOMList;
	mouseover(data?: any): DOMList;
	touchstart(data?: any): DOMList;
	touchend(data?: any): DOMList;
	touchmove(data?: any): DOMList;
	resize(data?: any): DOMList;
	scroll(data?: any): DOMList;
}

declare class SFModel {
	/** Component or Model's container element list */
    $el: DOMList & ((selector:string) => DOMList);

	[key: string]: any;
}
export type { SFModel as Model };

interface ModelOptions {
	/** Your extendable class */
	extend: Function;
}
/** Constructor that can be used for creating new element */
declare class SFComponent {
	/**
	 * @param $item Object that being passed when contructing new component scope
	 * @param namespace If this was boolean this will be asScope parameter
	 * @param asScope Use $item as component scope
	 */
	constructor($item?: object, namespace?: typeof SpaceScope | boolean, asScope?: boolean);
}
export type { SFComponent as Component };

/** Component scope collection */
declare class ComponentList extends Array<SFModel> {
	constructor(arrayLength?: number);
	constructor(arrayLength: number);
	constructor(...items: SFModel[]);
	element: SFComponent;
}

interface TemplateOptions {
	/** Template path from window.templates */
	template: String;
}
declare enum HTTPMethod {
	GET = 0,
	POST = 1
}
interface SpaceScopes {
	/** Collection of SpaceScope */
	[key: string]: typeof SpaceScope;
}
interface SpaceModels {
	[key: string]: SpaceModel;
}
interface SpaceComponents {
	[key: string]: SpaceComponent;
}
interface SFSpaceOptions {
	/** Template path in window.templates */
	templatePath: string;
}
declare function SpaceScope(name: string): SpaceModels | SpaceComponents;
interface SpaceModel {
	[key: string]: SFModel;
}
interface SpaceComponent {
	[key: string]: SFModel[];
}
declare class URIData {
	path: string;
	data: {};
	routes: {};
	query: {};
}
interface WindowOptions {
	id?: string;
	title?: string;
	width?: number;
	height?: number;
	route?: string;
	templateHTML?: Element;
	templatePath?: string;
	templateURL?: string;
}

type RequestHeader = {
	[key: string]: string;
}

type RequestOptions = {
	receiveType?: 'JSON',
	sendType?: 'JSON',
	timeout?: number,
	beforeOpen?: (XMLHttpRequest) => void,
	beforeSend?: (XMLHttpRequest) => void,
	async?: boolean,
	user?: string,
	password?: string,
	responseType?: string,
	mimeType?: string,
	headers?: RequestHeader,
};
declare interface XHRPromise extends XMLHttpRequest, Promise<any> {
    done(func:(data?:any) => void): XHRPromise;
    fail(func:(status?:any, data?:any) => void): XHRPromise;
    always(func:(status?:any) => void): XHRPromise;
    progress(func:(status?:ProgressEvent) => void): XHRPromise;
    uploadProgress(func:(status?:ProgressEvent) => void): XHRPromise;
}
export class API {
	/** @param url API Root url, ex: https://example.com/api/v2 */
	constructor(url: string);
	/** Set X-Authentication: AccessToken bearer on the header */
	accessToken: boolean;
	/** Set any request method into _method with inside of data and send via POST method */
	mask: boolean;
	/**
	 * Send HTTP request to an URL with GET Method
	 * @param url API Path url, ex: /create/post
	 * @param data Data to be send
	 */
	get(url: string, data?: object): XHRPromise;
	post(url: string, data?: object): XHRPromise;
	delete(url: string, data?: object): XHRPromise;
	put(url: string, data?: object): XHRPromise;
	upload(url: string, data: FormData): XHRPromise;
	request(method: HTTPMethod, url: string, data?: object, options?: RequestOptions): XHRPromise;
}

/** Query element inside of <html> */
export function $(selector: string): DOMList;

/** Query element inside of other element */
export function $(selector: string, context: Element | DOMList): DOMList;

/** Run a function when the DOM is ready */
export function $(selector: Function): void;

export namespace $ {
	const fn: DOMList;
	function get(url: string, data?: object, options?: RequestOptions, callback?: Function): XHRPromise;
	function post(url: string, data?: object, options?: RequestOptions, callback?: Function): XHRPromise;
	function getJSON(url: string, data?: object, options?: RequestOptions, callback?: Function): XHRPromise;
	function postJSON(url: string, data?: object, options?: RequestOptions, callback?: Function): XHRPromise;
}

export class Window {
	/** Create new window with options */
	constructor(options: WindowOptions, onLoaded?: Function);

	/** window collection */
	static list: {};

	/** Destroy the window */
	destroy(): void;

	/** Destroy a window */
	static destroy(id: string): void;
	/** Find element that from a window where the event triggered from */
	static source(lists: Element[], ev: EventTarget): Element;
}
export class Space {
	/**
	 * @param namespace name for <sf-space name>
	 * @param options optional if the element was empty on the DOM
	 */
	constructor(namespace: string, options?: SFSpaceOptions);
	/**
	 * Get space's model or components
	 * @param index if not specified then it will return default index
	 */
	getScope(index?: string): typeof SpaceScope;
	/**
	 * Create new space HTML from template
	 * @param index if not specified then it will return default index
	 */
	createHTML(index?: string): Element;
	/** List of SpaceScope */
	list: SpaceScopes;
	/**
	 * Define new <sf-m name=""> element handler in the element space
	 * @param name <sf-m name="name-here"></sf-m>
	 * @param options Model configuration, this can be the 3rd parameter
	 * @param scope Your extendable class or callable function
	 */
	model(name: String, options?: ModelScope | ModelOptions, scope?: ModelScope): SpaceModels;
	/**
	 * Define new <component-name> element handler in the element space
	 * @param name <name-here></name-here>
	 * @param options Model configuration, this can be the 3rd parameter
	 * @param scope Your extendable class or callable function
	 */
	component(name: String, options?: ComponentScope | ModelOptions, scope?: ComponentScope): SpaceComponents;
	/** Destroy sf-space */
	destroy(): void;
}
interface Router {
	/**
	 * Additional unknown property name will be used
	 * as new routes for child view container element
	 * this must be implement Router interface
	 */
	[key: string]: any;
	/** Custom views URL path */
	path?: string;
	/** Views template URL in window.templates */
	template?: string;
	/** Views template URL from an URL */
	templateURL?: string;
	/** Clone an HTML element as default views template */
	html?: Element;
	/** Default data when routing to this views URL path */
	defaultData?: object;
	/** Router event listener */
	on?: {
		leaving?: () => void;
		coming?: (data?: object) => void;
		showed?: (data?: object) => void;
		hidden?: () => void;
	};
	/** Add another router relative with this router views URL path */
	routes?: Router[];
	/** Call a function before routing to this views URL path */
	beforeRoute?: (data?: object) => boolean | void;
}

declare type RouteEvent = 'start' | 'finish' | 'loading' | 'loaded' | 'error';
declare type RouteEventStart = (currentPath?: string, targetPath?: string) => boolean | void;
declare type RouteEventFinish = (previousPath?: string, currentPath?: string) => boolean | void;
declare type RouteEventLoading = (loaded?: number, total?: number) => boolean | void;
declare type RouteEventLoaded = (loaded?: number, total?: number, element?: Element) => boolean | void;
declare type RouteEventError = (statusCode?: number, data?: object) => boolean | void;

export class Views {
	/**
	 * Page routing for ScarletsFrame
	 * @param selector Specify custom element as views container
	 * @param name if empty then use the main URL path
	 */
	constructor(selector: string, name?: string);
	/** Handle/catch any cross domain href/link, to use this you must replace this with a function */
	static onCrossing(url: string, target: string): void;
	/** Max cached page, default to 4 */
	maxCache: number;
	/** Enable dynamic script evaluation that was loaded from new page */
	dynamicScript: boolean;
	/** Last views path */
	lastPath: string;
	/** Previous page element after routed to new page */
	lastDOM: Element | null;
	/** Current page element after routed to new page */
	currentDOM: Element | null;
	/** Related page element parents after routed to new page */
	relatedDOM: Element[];
	/** Views data from URL or page data */
	data: {};
	/** Listen to an page event */
	on(event: RouteEvent, callback?: RouteEventStart | RouteEventFinish | RouteEventLoading | RouteEventLoaded | RouteEventError): void;
	/**
	 * Stop listen to an page event
	 * @param event if empty then remove all event
	 * @param callback if empty then remove all callback for the specified event
	 */
	off(event?: string, callback?: Function): void;
	/** Add page routes */
	addRoute(routes: Router): void;
	/** Remove path */
	removeRoute(path: string): void;
	/** Route pages to a new path */
	goto(path: string, data?: Function | object, method?: Function | HTTPMethod, callback?: Function): void;
}

declare class VirtualScroll {
	/** Is the element has dynamic size? */
	dynamicSize: boolean;
	/** Number of element that will be prepared on outer container viewport */
	prepareSize: number;
	/** Observe visibility for element on the index */
	observeVisibility(index: any): any;
	/** Unobserve visibility for element on the index */
	unobserveVisibility(index: any): any;
	/** Scroll to element on the index */
	scrollTo(index: any): any;
	/** Get element offset on the index */
	offsetTo(index: any): any;
}

// ==================== Exports ====================

/**
 * If got element then the model object will be returned.
 * @param elem Element
 */
export function getScope(elem:Element): Element | null | void;
/**
 * Define new < sf-m name="" > element handler, the model scope can be shared with every < sf-m name="" >
 * @param name < sf-m name="name.here" >< /sf-m >
 * @param options Model configuration, this can be the 3rd parameter
 * @param scope Your extendable class or callable function
 */
export function model(name: String, options?: ModelScope | ModelOptions, scope?: ModelScope): SFModel;
export namespace model {
	/**
	 * Find the index of RepeatedElement on DOM
	 * @param element single RepeatedElement
	 */
	function index(element: Element): number;
}
/**
 * Define new < component-name > element handler, if the component scope is returning a model scope it would be used as current scope instead
 * @param name < name-here >< /name-here >
 * @param options Model configuration, this can be the 3rd parameter
 * @param scope Your extendable class or callable function
 */
export function component(name: String, options?: ComponentScope | ModelOptions, scope?: ComponentScope): ComponentList;
export namespace component {
	/**
	 * Define new template for a component, this is optional
	 * If the you already write the content of the component
	 * in the DOM then you can skip this
	 * @param name Component name
	 * @param template The template content for the component
	 */
	function html(name: String, template: String | Element | TemplateOptions): void;
}
export namespace loader {
	/** Called when page is loading some resource */
	function onProgress(callback: (loaded?: number, total?: number) => void): void;
	/** Add some css to resource loading list */
	function css(list: string[]): void;
	/** Add some js to resource loading list */
	function js(list: string[]): void;
}
/**
 * Get full URL with sf-views hash
 */
export namespace URI {
	/** URI Data */
	const data: {};
	/** Hash path from URI */
	const routes: {};
	/** URI Pathname */
	const path: string;
	/** GET Query in the URI */
	const query: string;
	/** Parse URI data from a string */
	function parse(uri: string): URIData;
	/** Push into latest history */
	function push(): void;
	/** Remove next history and change current history */
	function replace(): void;
}
export namespace language {
	/** List of loaded language */
	export const list: {};
	/** Default interpolation data */
	export const interpolate: {};
	/** Current language for initialization */
	const _default: string;
	export { _default as default };
	/** Language server */
	export const serverURL: string;
	/** Add language data */
	export function add(lang: string, obj: object): void;
	/** Get language from path */
	export function get(path: string, obj?: object | Function, callback?: Function): void;
	/** Init SF Language for selected element */
	export function init(el: Element): void;
	/** Change language */
	export function changeDefault(el: string): void;
	/** Assign language data */
	export function assign(model: object, keyPath: string): void;
	export function assign(model: object, keyPath: string, callback: Function): void;
	export function assign(model: object, keyPath: string, obj: object, callback: Function): void;
}
/**
 * Enable Hot Reload
 * @param mode 1=Reload scope function only, 2=Reload all
 */
export function hotReload(mode: number): void;
export function request(method:HTTPMethod, url:string, data?:object, options?:RequestOptions): XHRPromise;

// ==================== Type Definitions ====================

export type PropertyList = _PropertyList;
declare class _PropertyList {
	/**
	 * Select related elements from this list with query selector
	 * @param selector Query selector
	 */
	$el(selector: string, key: string | number): DOMList;
	/**
	 * Get an element from this list
	 * @param  index This can be an index/property name, or object value from this list
	 */
	getElement(index: object | number | string): Element;
	/**
	 * Get related elements from this list
	 * @param  index This can be an index/property name, or object value from this list
	 */
	getElements(index: object | number | string): Array<Element>;
	/** Refresh whole list if something was dynamically added no by calling a function */
	refresh(): any;
}

export type ReactiveArray = _ReactiveArray;
declare class _ReactiveArray extends Array {
	/** Only exist if the container was flagged as virtual list */
	$virtual: VirtualScroll;
	/** Almost like usual array replacement, but this will reuse available elements to improve performance */
	assign(fromIndex: number | object[], withArray?: object[] | object, removes?: object | Boolean, putLast?: Boolean): ReactiveArray;
	/**
	 * Swap an item with another item with index
	 * @param from index
	 * @param to Another index
	 */
	swap(from: number, to: number): void;
	/**
	 * Move some item into after item on an index
	 * @param from index
	 * @param to Insert after an index
	 * @param count Total item to be moved
	 */
	move(from: number, to: number, count?: number): void;
	/** Get the index of an item */
	indexOf(index: any): number;
	/**
	 * Select related elements from this list with query selector
	 * @param selector Query selector
	 */
	$el(selector: string, key: string | number): DOMList;
	/**
	 * Get an element from this list
	 * @param  index This can be an index/property name, or object value from this list
	 */
	getElement(index: object | number | string): Element;
	/**
	 * Get related elements from this list
	 * @param  index This can be an index/property name, or object value from this list
	 */
	getElements(index: object | number | string): Array<Element>;
	/** Refresh whole list if something was dynamically added no by calling a function */
	refresh(): any;
}

export type ReactiveSet = _ReactiveSet;
declare class _ReactiveSet extends Set {
	/** Only exist if the container was flagged as virtual list */
	$virtual: VirtualScroll;
	/**
	 * Select related elements from this list with query selector
	 * @param selector Query selector
	 */
	$el(selector: string, key: string | number): DOMList;
}

export type ReactiveMap = _ReactiveMap;
declare class _ReactiveMap extends Map {
	/** Only exist if the container was flagged as virtual list */
	$virtual: VirtualScroll;
	/**
	 * Select related elements from this list with query selector
	 * @param selector Query selector
	 */
	$el(selector: string, key: string | number): DOMList;
}

/** Create a separate collection that linked with Array/Set/Object/Map object */
export class Collection {
	constructor(obj: Object, options?: {
		/** default to Infinity */
		maxItem?: Number,
		onOverflow?: 'shift' | 'pop' | ((item: any) => void),
		onAdd?: (item: any, elements: Array<Node>) => void,
		onDelete?: (item: any, elements: Array<Node>) => void,
	});

	list: Array<any>;
	add(item: any): void;
	delete(item: any): void;
	clear(): void;
}

export namespace Obj {
	/** Used to assign and refresh reactive object property */
	export function set(obj: object, prop: string, val: any): void;

	/** Delete and refresh reactive object property */
	function _delete(obj: object, prop: string): void;
	export { _delete as delete };
}

/** Watch changes of a object */
export function watch(model: object, prop: string, callback: Function): void;

/** Unwatch changes of a object */
export function unwatch(model: object, prop: string, callback: Function): void;