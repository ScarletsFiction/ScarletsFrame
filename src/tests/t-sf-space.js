import {model, component, Space, Window} from "../index.dev.js";
import {adder, minimalTest, windowTest} from "./t-shared.js";

var testSpace = new Space('test-space');

var chars = 'abcdefghijklmnopqrstuvwxyz'.split('');
function testIncrease(){
	this.list.push(chars[this.list.length]);
}

var spaceModel = testSpace.model('obj', function(My, root){
	My.test = 123+adder;
	My.list = [1,2,3+adder];

	My.inc = testIncrease.bind(My);
	My.init = function(){
		if(root('obj').test === 123+adder)
		 	console.log("✔️ Local model namespace OK");
		My.list.push(My.test);
	}
});

var spaceComponent = testSpace.component('my-obj', function(My, root){
	My.test = 123+adder;
	My.list = [1,2,3+adder];

	My.inc = testIncrease.bind(My);
	My.init = function(){
		if(root('obj').test === 123+adder)
		 	console.log("✔️ Local component namespace OK");
		My.list.push(My.test);
	}
});

model('obj', class {
	test = 321+adder;
	list = [3,2,1+adder];

	constructor(){
		this.inc = testIncrease.bind(this);
	}

	init(){
		if(model('obj').test === 321+adder)
		 	console.log("✔️ Global model namespace OK");
		this.list.push(this.test);
	}
});

component('my-obj', function(My, root){
	My.test = 321+adder;
	My.list = [3,2,1+adder];

	My.inc = testIncrease.bind(My);
	My.init = function(){
		if(root('obj').test === 321+adder)
		 	console.log("✔️ Global component namespace OK");
		My.list.push(My.test);
	}
});

setTimeout(function(){
	testSpace.model('obj', function(My, root){
		My.list = ['refreshed',2,3+adder];
	});

	testSpace.component('my-obj', function(My, root){
		My.list = ['refreshed',2,3+adder];
	});

	console.log('testSpace model list', spaceModel);
	console.log('testSpace component list', spaceComponent);

	model('obj', function(My, root){
		My.list = ['refreshedA',2,1+adder];
	});

	component('my-obj', function(My, root){
		My.list = ['refreshedA',2,1+adder];
	});
}, 5000);

setTimeout(function(){
	if(windowTest) new Window({
		title: "Linked Window",
		templatePath: 'space/test.html',
		width: 228,
		height: 236,
	});
}, 2000);

window.templates['space/test.html'] = '\
<sf-m name="image" style="position: fixed;left:30vw;top:30vh">\
  <img src="/tests/img.jpg" :style="transform:{{trans}}" @gesture="gesture(321, event)">\
</sf-m>\
\
<sf-space test-space="asd">\
  Inner namespace testing\
  <sf-m name="obj" id="obj1">\
  	{{ test }} - <span sf-each="num in list" @click="inc">{{num}}.</span>\
  	<input sf-bind="test"></input>\
  </sf-m>\
  <my-obj id="1" @click="inc">{{ test }} - <span sf-each="num in list">{{num}},</span></my-obj>\
</sf-space>\
\
<div id="lang-test">\
   <p sf-lang="hello.other.side" onclick="sf.language.changeDefault(\'id_ID\')">a<b>b</b>c</p>\
   <input type="text" sf-lang="i\'m.here" placeholder="" />\
\
   <p sf-lang="my.test" onclick="sf.language.changeDefault(\'ja_JP\')"></p>\
   <p sf-lang="second" onclick="sf.language.changeDefault(\'en_US\')"></p>\
</div>\
';