// Type definitions for ScarletsFrame
// Project: https://github.com/ScarletsFiction/ScarletsFrame
// Definitions by: StefansArya <https://github.com/stefansarya>

/**
 * If got a function then the function will be called when all resource was ready.
 * If got element then the model object will be returned.
 * @param obj HTMLElement or function callback
 */
export declare function sf(obj: Function | HTMLElement): HTMLElement | object | null | void;
export declare namespace sf {
    /**
     * Define new <sf-m name=""> element handler
     * @param name <sf-m name="name.here"></sf-m>
     * @param options Model configuration, this can be the 3rd parameter
     * @param scope Your extendable class or callable function
     */ export function model(name: String, options?: Function | ModelOptions | ((self: SFModel) => void), scope?: Function | ((self: SFModel) => void)): SFModel;
    export namespace model {
        /**
         * Find the index of RepeatedElement on DOM
         * @param element single RepeatedElement
         */ function index(element: HTMLElement): number;
    }
    /**
     * Define new <component-name> element handler
     * @param name <name-here></name-here>
     * @param options Model configuration, this can be the 3rd parameter
     * @param scope Your extendable class or callable function
     */ export function component(name: String, options?: Function | ModelOptions | ((self: SFModel) => void), scope?: Function | ((self: SFModel) => void)): ComponentList;
    export namespace component {
        /**
         * Define new template for a component, this is optional
         * If the you already write the content of the component
         * in the DOM then you can skip this
         * @param name Component name
         * @param template The template content for the component
         */ function html(name: String, template: String | HTMLElement | TemplateOptions): void;
    }
    export { API };
    export namespace loader {
        /** Called when page is loading some resource */
        function onProgress(callback: (loaded?: number, total?: number) => void): void;
        /** Add some css to resource loading list */
        function css(list: string[]): void;
        /** Add some js to resource loading list */
        function js(list: string[]): void;
    }
    export { Space as space };

    /**
     * Get full URL with sf-views hash
     */
    export function url(): string;
    export namespace url {
        /** URL Data */
        const data: string[];
        /** Hashes route path from URL */
        const hashes: {};
        /** URL Pathname */
        const paths: string;
        /**
         * Parse URL data from a string
         */
        function parse(url: string): URLData;
    }
    export function lang(): void;
    export namespace lang {
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
        export function init(el: HTMLElement): void;
    }
    export namespace window {
        /** window collection */
        const list_1: {};
        export { list_1 as list };
        /** Destroy a window */
        export function destroy(id: string): void;
        /** Create new window with options */
        export function create(options: WindowOptions, onLoaded?: Function): void;
        /** Find element that from a window where the event triggered from */
        export function source(lists: HTMLElement[], ev: EventTarget): HTMLElement;
    }
    /**
     * Enable Hot Reload
     * @param mode 1=Reload scope function only, 2=Reload all
     */
    export function hotReload(mode: number): void;
    export { View as views };
    export function dom(selector: string | Function | HTMLElement | HTMLElement[], context: HTMLElement | DOMList): void | DOMList;
    export namespace dom {
        const fn: DOMList;
    }
}
declare class DOMList extends Array<HTMLElement> {
    constructor(arrayLength?: number);
    constructor(arrayLength: number);
    constructor(...items: any[]);
    parent(selector: HTMLElement): DOMList;
    prev(selector: HTMLElement): DOMList;
    prevAll(selector: HTMLElement): DOMList;
    next(selector: HTMLElement): DOMList;
    nextAll(selector: HTMLElement): DOMList;
    children(selector: HTMLElement): DOMList;
    remove(): DOMList;
    empty(): DOMList;
    addClass(name: string): DOMList;
    removeClass(name: string): DOMList;
    toggleClass(name: string): DOMList;
    hasClass(name: string): boolean;
    prop(name: string, value: any): DOMList;
    attr(name: string, value: string): DOMList;
    removeAttr(name: string, value: string): DOMList;
    css(name: string, value: string): DOMList;
    on(event: string, selector?: Function | string, callback?: Function, options?: object): DOMList;
    off(event: string, selector?: Function | string, callback?: Function, options?: object): DOMList;
    once(event: string, selector?: Function | string, callback?: Function): DOMList;
    trigger(event: string, data: any, direct: boolean): DOMList;
    animateKey(name: string, callback: Function, duration: number): DOMList;
    each(callback: (index?: number, value?: any) => void): DOMList;
    data(key: string, value: any): DOMList;
    removeData(key: string): DOMList;
    append(element: HTMLElement | DOMList): DOMList;
    prepend(element: HTMLElement | DOMList): DOMList;
    eq(index: number, count: number): DOMList;
    inserAfter(element: HTMLElement | DOMList): DOMList;
    inserBefore(element: HTMLElement | DOMList): DOMList;
    text(text?: string): DOMList | string;
    html(text?: string): DOMList | string;
    val(val?: string): DOMList | string;
    click(data: any): DOMList;
    blur(data: any): DOMList;
    focus(data: any): DOMList;
    focusin(data: any): DOMList;
    focusout(data: any): DOMList;
    keyup(data: any): DOMList;
    keydown(data: any): DOMList;
    keypress(data: any): DOMList;
    submit(data: any): DOMList;
    change(data: any): DOMList;
    mousedown(data: any): DOMList;
    mousemove(data: any): DOMList;
    mouseup(data: any): DOMList;
    mouseenter(data: any): DOMList;
    mouseleave(data: any): DOMList;
    mouseout(data: any): DOMList;
    mouseover(data: any): DOMList;
    touchstart(data: any): DOMList;
    touchend(data: any): DOMList;
    touchmove(data: any): DOMList;
    resize(data: any): DOMList;
    scroll(data: any): DOMList;
}
declare class SFModel {
    /** Component or Model's container element list */
    $el: DOMList[];
}
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
declare class SFSpace {
    /** Similar like sf.model */
    model: {
        (name: String, options?: Function | ModelOptions | ((self: SFModel) => void), scope?: Function | ((self: SFModel) => void)): SFModel;
        index(element: HTMLElement): number;
    };
    /** Similar like sf.component */
    component: {
        (name: String, options?: Function | ModelOptions | ((self: SFModel) => void), scope?: Function | ((self: SFModel) => void)): ComponentList;
        html(name: String, template: HTMLElement | String | TemplateOptions): void;
    };
    /** Destroy sf-space */
    destroy(): void;
}
declare class URLData {
    data: string[];
    hashes: {};
    paths: string;
}
interface WindowOptions {
    id?: string;
    title?: string;
    width?: number;
    height?: number;
    route?: string;
    templateHTML?: HTMLElement;
    templatePath?: string;
    templateURL?: string;
}
declare class API {
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
    get(url: string, data?: object): void;
    post(url: string, data?: object): void;
    delete(url: string, data?: object): void;
    put(url: string, data?: object): void;
    upload(url: string, data: FormData): void;
    request(method: HTTPMethod, url: string, data?: object, beforeSend?: Function): void;
}
declare class Space {
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
    createHTML(index?: string): HTMLElement;
    /** List of SpaceScope */
    list: SpaceScopes;
    /**
     * Define new <sf-m name=""> element handler in the element space
     * @param name <sf-m name="name-here"></sf-m>
     * @param options Model configuration, this can be the 3rd parameter
     * @param scope Your extendable class or callable function
     */ model(name: String, options?: Function | ModelOptions | ((self: SFModel) => void), scope?: Function | ((self: SFModel) => void)): SpaceModels;
    /**
     * Define new <component-name> element handler in the element space
     * @param name <name-here></name-here>
     * @param options Model configuration, this can be the 3rd parameter
     * @param scope Your extendable class or callable function
     */ component(name: String, options?: Function | ModelOptions | ((self: SFModel) => void), scope?: Function | ((self: SFModel) => void)): SpaceComponents;
    /** Destroy sf-space */
    destroy(): void;
}
declare class View {
    /**
     * Page routing for ScarletsFrame
     * @param selector Specify custom element as views container
     * @param name if empty then use the main URL path
     */
    constructor(selector: string, name?: string);
    /** Enable dynamic script evaluation that was loaded from new page */
    dynamicScript: boolean;
    /** Last views path */
    lastPath: string;
    /** Previous page element after routed to new page */
    lastDOM: HTMLElement | null;
    /** Current page element after routed to new page */
    currentDOM: HTMLElement | null;
    /** Related page element parents after routed to new page */
    relatedDOM: HTMLElement[];
    /** Views data from URL or page data */
    data: {};
    /** Listen to an page event */
    on(event: string, callback?: Function): void;
    /**
     * Stop listen to an page event
     * @param event if empty then remove all event
     * @param callback if empty then remove all callback for the specified event
     */
    off(event?: string, callback?: Function): void;
    /** Add page routes */
    addRoute(routes: object): void;
    /** Remove path */
    removeRoute(path: string): void;
    /** Route pages to a new path */
    goto(path: string, data?: Function | object, method?: Function | HTTPMethod, callback?: Function): void;
}

export default sf;