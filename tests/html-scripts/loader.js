if(minimalTest){
	sf.loader.loadedContent = 1;
	sf.loader.totalContent = 1;
	self.turnedOff = true;
}
else {
	var loaderWorking = false;
	sf.loader.onProgress(function(loadedContent, totalContent){
		console.log(loadedContent+ ' of ' +totalContent+ ' was loaded');
	});

	sf.loader.onFinish(function(){
		loaderWorking = true;
		if(typeof assetloader === 'undefined')
			console.error("❌ External script loaded by sf.loader is not executed");
	});

	setTimeout(function(){
		if(loaderWorking === false)
			console.error("❌ 'sf.loader.onFinish' was not being called");
	}, 5000);

	sf.loader.css(['/tests/test_loader.css']);
	sf.loader.js(['/tests/test_loader.js']);
}