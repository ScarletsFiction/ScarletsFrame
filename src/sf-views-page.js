import {forProxying} from "./shared.js";
// This file is separated from sf-views.js to improve tree shaking

export class SFPageView extends HTMLElement{}
if(window.sf$proxy)
	SFPageView._ref = window.sf$proxy.SFPageView;
else forProxying.SFPageView = SFPageView._ref = SFPageView;

customElements.define('sf-page-view', SFPageView);