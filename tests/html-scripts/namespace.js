var testSpace = new sf.space('test-space');

var chars = 'abcdefghijklmnopqrstuvwxyz'.split('');
function testIncrease(){
	this.list.push(chars[this.list.length]);
}

testSpace.model('obj', function(self, root){
	self.test = 123+vul;
	self.list = [1,2,3+vul];

	self.inc = testIncrease.bind(self);
	self.init = function(){
		if(root('obj').test === 123+vul)
		 	console.log("✔️ Local model namespace OK");
		// self.list.push(self.test);
	}
});

testSpace.component('my-obj', function(self, root){
	self.test = 123+vul;
	self.list = [1,2,3+vul];

	self.inc = testIncrease.bind(self);
	self.init = function(){
		if(root('obj').test === 123+vul)
		 	console.log("✔️ Local component namespace OK");
		self.list.push(self.test);
	}
});

sf.model('obj', function(self, root){
	self.test = 321+vul;
	self.list = [3,2,1+vul];

	self.inc = testIncrease.bind(self);
	self.init = function(){
		if(root('obj').test === 321+vul)
		 	console.log("✔️ Global model namespace OK");
		// self.list.push(self.test);
	}
});

sf.component('my-obj', function(self, root){
	self.test = 321+vul;
	self.list = [3,2,1+vul];

	self.inc = testIncrease.bind(self);
	self.init = function(){
		if(root('obj').test === 321+vul)
		 	console.log("✔️ Global component namespace OK");
		self.list.push(self.test);
	}
});

setTimeout(function(){
	testSpace.model('obj', function(self, root){
		self.list = ['refreshed',2,3+vul];
	});

	testSpace.component('my-obj', function(self, root){
		self.list = ['refreshed',2,3+vul];
	});

	sf.model('obj', function(self, root){
		self.list = ['refreshedA',2,1+vul];
	});

	sf.component('my-obj', function(self, root){
		self.list = ['refreshedA',2,1+vul];
	});
}, 5000);

setTimeout(function(){
	sf.window.create({
		title: "Linked Window",
		templatePath: 'space/test.html',
		width: 228,
		height: 236,
	});
}, 2000);

window.templates['space/test.html'] = `
<sf-m name="image" style="position: fixed;left:30vw;top:30vh">
  <img src="/tests/img.jpg" :style="transform:{{trans}}" @gesture="gesture(321, event)">
</sf-m>

<sf-space test-space="asd">
  Inner namespace testing
  <sf-m name="obj" id="obj1">
  	<span>{{ test }} - <span sf-repeat-this="num in list" @click="inc">{{num}}.</span></span>
  	<input sf-bind="test"></input>
  </sf-m>
  <my-obj id="1" @click="inc">{{ test }} - <span sf-repeat-this="num in list">{{num}},</span></my-obj>
</sf-space>
`;