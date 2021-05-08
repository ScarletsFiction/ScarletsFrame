import {loader} from "../index.dev.js";
import {adder, minimalTest, windowTest} from "./t-shared.js";

if(minimalTest){
	loader.loadedContent = 1;
	loader.totalContent = 1;
	loader.turnedOff = true;
}
else {
	var loaderWorking = false;
	loader.onProgress(function(loadedContent, totalContent){
		console.log(loadedContent+ ' of ' +totalContent+ ' was loaded');
	});

	loader.onFinish(function(){
		loaderWorking = true;
		if(typeof assetLoader === 'undefined')
			console.error("❌ External script loaded by sf.loader is not executed");
	});

	setTimeout(function(){
		if(loaderWorking === false)
			console.error("❌ 'sf.loader.onFinish' was not being called");
	}, 5000);

	loader.css(['/tests/test_loader.css']);
	loader.js(['/tests/test_loader.js']);
}