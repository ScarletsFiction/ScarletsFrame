import {$, component, Space} from "../index.js";

export var minimalTest = 1;
export var windowTest = 1;

// Check vulnerability of this framework
// if any alert displayed or console.error is being outputted
let vull = '';
if(0){
	vull = '\'\"><vuln-elem></vuln-elem><script id="vull">console.error("Vulnerability found!")</script>{{vulnerable}}{{@ console.error("Vulnerablility detected!", _modelScope.$el[0]) }}<a z=\'\"';

	component('vuln-elem', function(self){
		console.error("❌ Vulnerable element found!");
		self.dummy = 'variable';
	});
	component.html('vuln-elem', '<div>❌ This element was vulnerable</div>');

	var ckz = 0;
	var vullGot = 0;
	var checkz = setInterval(function(){
		if(window.vull && vull.length !== vullGot){
			vullGot = vull.length;
			console.error("❌ Vulnerability found!");
		}

		if(ckz++ > 100){
			if(window.vull && window.vull.length !== 0)
				console.log("Unexpected element: ", window.vull);

			console.log("Vulnerability check finished");
			clearInterval(checkz);
		}
	}, 200);
}

export let adder = vull;