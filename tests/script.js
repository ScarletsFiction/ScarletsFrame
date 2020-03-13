var $ = sf.dom;
var vul = '';
var minimalTest = 1;

// This framework is vulnerable if any alert displayed
// or console.error is being outputted
if(0){
	vul = '\'\"><script id="vull">alert("Heya")</script>{{@exec console.error("Vulnerablility detected!", _modelScope.$el[0]) }}<a z=\'\"';

	var ckz = 0;
	var checkz = setInterval(function(){
		if($('#vull').length)
			alert("❌ Vulnerability found!");

		if(ckz++ > 100){
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