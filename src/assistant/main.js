import {SFOptions} from "../shared.js";
import {$} from "../index.js";
import HotReload from "../sf-hot-reload.js";

SFOptions.devMode = true;
export default function(hotReloadLevel){
	if(hotReloadLevel) HotReload(hotReloadLevel);

	$(function(){
		import('./inspector.js');

		setTimeout(()=> {
			if(!SFOptions.hotReload)
				console.log('[ScarletsFrame] %cHot reload was inactive', 'color:yellow');
		}, 5000);

		setTimeout(function(){return;
			if(window.SFDevSpace !== void 0 || window.sf$.hasInspector) return;

			var path = $('script[src*="scarletsframe."]')[0];
			if(path === void 0){
				Loader.js(['https://cdn.jsdelivr.net/npm/scarletsframe@latest/dist/dev-mode.js']);
				Loader.css(['https://cdn.jsdelivr.net/npm/scarletsframe@latest/dist/dev-mode.css']);
				return;
			}

			path = path.src.split('scarletsframe.')[0];
			Loader.js([path+'dev-mode.js']);
			Loader.css([path+'dev-mode.css']);
		}, 1);
	});
}