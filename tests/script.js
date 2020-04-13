var $ = sf.dom;
var vul = '';
var minimalTest = 0;

// This framework is vulnerable if any alert displayed
// or console.error is being outputted
if(0){
	vul = '\'\"><vuln-elem></vuln-elem><script id="vull">console.error("Vulnerability found!")</script>{{vulnerable}}{{@ console.error("Vulnerablility detected!", _modelScope.$el[0]) }}<a z=\'\"';

	sf.component('vuln-elem', function(self){
		console.error("❌ Vulnerable element found!");
		self.dummy = 'variable';
	});
	sf.component.html('vuln-elem', '<div>❌ This element was vulnerable</div>');

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

$(function(){console.log("✔️ Loading finished")});

class ImgModel{
	static construct(){
		console.warn('✔️ ImgModel construct was called', this);
	}

	taphold(el, ev){
		console.log('✔️ taphold called', el, ev);
	}
}

sf.model.for('image', {extend: ImgModel}, function(self, root){
	self.trans = "translate(0)";

	var x=0, y=0;
	self.dragmove = function(ev){
		// console.log('dragmove called', ev);
		self.trans = 'translate('+(x += ev.movementX)+'px, '+(y += ev.movementY)+'px)';
	}

	var scale = 1;
	var angle = 0;
	self.gesture = function(dummy, ev){
		scale += ev.scale;
		angle += ev.angle;

		// console.log('gesture called');
		self.trans = 'scale('+scale+') rotate('+angle+'deg)';
	}
});

setTimeout(function(){
	var a = sf.model.queuePreprocess(document.body);
	console.log(a.length ? '❌' : '✔️', "Trying to reinit", a.length, "element (must be 0)");
	sf.model.parsePreprocess(a);
}, 10000);

var c = new WeakMap();
function destroyer(){
	var a = Object.keys(sf.model.root);
	for (var i = 0; i < a.length; i++) {
		c.set(sf.model.root[a[i]], a[i]);
	}

	$('*').off();
	$ = null;
	sf.model.root = null;
	// sf = null;
	binding = null;
	test = null;
	views = null;
	aList = null;
	document.body.textContent = '';
	return a.length;
}