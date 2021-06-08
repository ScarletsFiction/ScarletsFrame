import {model, component, language} from "../index.dev.js";
import {ModelInit} from "../sf-model/a_model.js";
import {adder, minimalTest, windowTest} from "./t-shared.js";

model('model-binding', (My, root)=>{
	window.model_binding = My;

	setTimeout(function(){
		var My = root('model-binding');
		// My.inputBinding1 = 'Two way binding'+adder;
		My.inputBinding2.text = 123.321+adder;
	}, 4000);

	My.comp = {bind:{text:'comp bind'}};
	My.onKeyUp = console.warn;

	My.s$ymbol = 123;
	My.bold = true;
	My.pink = false;
	My.inputBinding1 = ''+adder;
	My.inputBinding2 = {text:'heia'+adder};
	My.inputBinding3 = adder;
	My.inputBinding4 = ''+adder;
	My.m2v$inputBinding4 = function(now){
		console.warn("inputBinding4 (Model -> View)", My.inputBinding4, now || '❌');
	};
	My.v2m$inputBinding4 = function(now){
		console.log("inputBinding4 (View -> Model) will be revert from:", now, 'to', My.inputBinding4 || '❌');
		var old = My.inputBinding4;
		setTimeout(function(){
			My.inputBinding4 = old+adder;
			console.log("Reverted");
		}, 4000);
	};

	My.inputBinding5 = [];
	My.inputBinding2.v2m$text = function(now, isM2V){
		console.warn('V2M', "inputBinding2 was modified from:", My.inputBinding2 || '❌', 'to', now);
		return Math.round(now);
	};
	My.inputBinding2.on$text = function(now, isM2V){
		if(!isM2V)
			return;

		console.warn('M2V', "inputBinding2 was modified from:", My.inputBinding2 || '❌', 'to', now);
		return Math.round(now);
	};

	My.inputBinding8 = '';
	My.v2m$inputBinding8 = function(news){
		language.changeDefault(news);
	}

	My.text = 'main model';
	My.inputBinding6a = [
		{text:'Select 1'+adder, value:1+adder},
		{text:'Select 2'+adder, value:2+adder},
		{text:'Select 3'+adder, value:3+adder},
	];

	setTimeout(function(){
		My.inputBinding6a.push({text:'Select 4'+adder, val:4+adder});
	}, 5000);
	My.inputBinding6 = '';
	My.on$inputBinding6 = function(now){
		console.warn("inputBinding6 was updated from:", My.inputBinding6, 'to', now || '❌');
	};
	My.inputBinding7 = ''+adder;
	My.showHTML = true;
	My.prefix = 'i -> '+adder;
	My.stuff = '(text from the model)'+adder;
	My.stuffes = ' and stuff'+adder;
	My.vuln = "{{vul}}{{@exec console.error('something not gud')}}"+adder;
	My.vul = adder;

	My.testObj = {
		status:"a❌ this must be refreshed",
		deep:{
			b:{status:"b❌ this must be refreshed"},
			c:{status:"c❌ this must be refreshed"},
		}
	};

	setTimeout(function(){
		try{ModelInit(reinit, 'model-binding');}
		catch(e){
			console.error("✔️ Expected error", e);
		}

		My.testObj.status = "a✔️ this one ok"+adder;
		My.testObj.deep.b.status = "b✔️ this one ok"+adder;
		My.testObj.deep.c.status = "c✔️ this one ok"+adder;
		requestAnimationFrame(function(){
			if(!chk1.className === 'dummy A✔️ this one ok'+adder || chk1.textContent !== 'A✔️ this one ok'+adder){
				console.error('This one not refreshed', chk1);
				console.error('should reflect with ->', My.testObj);
			}
		});
	}, 2000);

	My.init = function(){
		setTimeout(function(){
			My.showHTML = false;
		}, 2000);

		var list = root('virtual-scroll');
		if(list.list1 === undefined)
			console.error("Can't get other model scope variable");
	}

	My.addition = function(a, b){
		return a + b;
	}

	if(minimalTest)
		return;

	setTimeout(function(){
		My.inputBinding3 = true;
		My.inputBinding4 = 'radio1';
		My.inputBinding5 = My.inputBinding6 = 1;
		My.bold = false;
		My.pink = true;
	}, 3000);

	setTimeout(function(){
		My.inputBinding3 = 'check1';
		My.inputBinding4 = 'radio2';
		My.inputBinding5 = My.inputBinding6 = 3;
	}, 6000);

	setTimeout(function(){
		My.inputBinding3 = ['check2'];
		My.inputBinding4 = 'radio1';
		My.inputBinding5 = [1, 2];
		My.bold = true;
		My.pink = false;
	}, 8000);
});

component.html('comp-bind-test', '<div>{{ text }}</div>');
component('comp-bind-test', function(My){
	My.init = function(){
		My.text += ' - init called';
	}
});

model('components', function(My){
	My.items = [1];
	My.test = 'this must getting changed'+adder;
	My.handleClick = function(e){
		console.log('element click', e.target || '❌');
	}
	My.init = function(){
		console.log("Model init called", My.$el || '❌');

		setTimeout(function(){
			My.test = 'OK'+adder;
			requestAnimationFrame(function(){
				if(My.$el('#nyam').attr('test') !== 'OK'+adder)
					console.error("❌ Attribute is not changed", My.$el('#nyam')[0]);
			});
		}, 1000);
	}
	My.clickOK = function(){
		console.warn("✔️ Click OK!");
		My.items.push(My.items.length+1);
	}
});

model('deep-property', function(My){
  window.deep = My;
  My.one = 'One';
  My.today = {deep:{two:'Two'}};
  My.list = [];

  // Run when this model was initialized
  My.init = function(){
    My.list.push({
      text:{
        three:"Three"
      },
      four:'Four'
    }, {
      text:{
        three:"Five"
      },
      four:'Six'
    });

    setTimeout(function(){
      My.one += '12';
      My.today.deep.two += '12';
      My.list[0].text.three += '12';
      My.list[0].four += '12';

      requestAnimationFrame(function(){
      	if(My.$el('.today').text().trim() !== 'One12 Two12\n One12 Two12')
      	  console.error('❌', My.$el('.today').text().trim(), ', should be ->', 'One12 Two12\n One12 Two12');
      	if(!My.$el('label [testval]').attr('testval').includes('Two12 One12'))
      	  console.error('❌ ', My.$el('label [testval]').attr('testval'), ', should be changed to -> Two12 One12');
      });
    });
  }
});

model('repeattest', function(My){
	window.repeattest = My;

	My.hi = 'ok';
	My.stars = 3;
	My.vul = adder;
	My.lv1 = [{
		lv2:[{
			lv3:["nice1a","nice1b"]
		}]
	},{
		lv2:[{
			lv3:["nice2a","nice2b"]
		},{
			lv3:["nice3a","nice3b"]
		}]
	}];

	My.other = {aa:11, bb:22};
	My.dynamic = {aa:33, bb:44};

	My.begin = 1;
	My.end = 10;
	My.step = 1;

	My.init = function(){
		setTimeout(()=> {
			My.step = 3;
		}, 3000);
		setTimeout(()=> {
			My.step = 1;
			My.begin = -5;
		}, 4000);
		setTimeout(()=> {
			My.begin = -2;
			My.end = 7;
		}, 5000);
		setTimeout(()=> {
			My.begin = 1;
			My.end = 10;
		}, 5000);
	}

	function delay(time){
		return new Promise(resolve=> setTimeout(resolve, time));
	}

	My.asyncRangeTest = async function(step){
		await delay(3000);
		return ['asyncRangeTest', 1,2,3];
	}
	My.generatorTest = function*(step){
		yield 'generatorTest';
		yield 1;
		yield 2;
		yield 3;
	}
	My.asyncGeneratorTest = async function*(step){
		yield 'asyncGeneratorTest';
		await delay(1000);
		yield 1;
		await delay(1000);
		yield 2;
		await delay(1000);
		yield 3;
	}
});

component('repeat-test', function(My){
	My.foo = 'lv1-component';
});