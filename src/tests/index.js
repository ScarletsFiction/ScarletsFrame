import {$, component, model, hotReload, Window, language, internal} from "../index.js";
import {parsePreprocess, queuePreprocess} from "../sf-model/parser.js";
import "./t-sf-model.js";
import "./t-sf-component.js";
import "./t-sf-lang.js";
import "./t-sf-loader.js";
import "./t-sf-space.js";
import "./t-sf-views.js";
import "./t-sf-virtual_scroll.js";
import {adder, minimalTest, windowTest} from "./t-shared.js";

// Enable Development Mode, Development Assistant, and Hot Reload Level 1
export let hotReloadLevel = 1;
hotReload(hotReloadLevel);
Window.frameworkPath = 'https://cdn.jsdelivr.net/npm/scarletsframe@latest/dist/scarletsframe.min.js';
// internal.async(false);

window.$ = $;
window.ssf = {component, model, language, Window};

$(function(){console.log("✔️ Loading finished")});

class ImgModel{
	static construct(){
		console.warn('✔️ ImgModel construct was called', this);
	}

	taphold(el, ev){
		console.log('✔️ taphold called', el, ev);
	}
}

model('image', {extend: ImgModel}, function(My, root){
	My.trans = "translate(0)";

	var x=0, y=0;
	My.dragmove = function(ev){
		// console.log('dragmove called', ev);
		My.trans = 'translate('+(x += ev.movementX)+'px, '+(y += ev.movementY)+'px)';
	}

	var scale = 1;
	var angle = 0;
	My.gesture = function(dummy, ev){
		scale += ev.scale;
		angle += ev.angle;

		// console.log('gesture called');
		My.trans = 'scale('+scale+') rotate('+angle+'deg)';
	}
});

setTimeout(function(){
	var a = queuePreprocess(document.body, void 0, {
		repeat:[],
		input:[]
	});
	if(a.size !== 0)
		console.log(Array.from(a));
	console.log(a.size ? '❌' : '✔️', "Trying to reinit", a.size, "element (must be 0)");
	parsePreprocess(a);
}, 10000);