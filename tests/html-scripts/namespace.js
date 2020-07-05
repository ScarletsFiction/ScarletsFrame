var testSpace = new sf.space('test-space');

testSpace.model('obj', function(self, root){
	self.test = 123+vul;
	self.list = [1,2,3+vul];
	self.init = function(){
		if(root('obj').test === 123+vul)
		 	console.log("✔️ Local model namespace OK");
		self.list.push(self.test);
	}
});

testSpace.component('my-obj', function(self, root){
	self.test = 123+vul;
	self.list = [1,2,3+vul];
	self.init = function(){
		if(root('obj').test === 123+vul)
		 	console.log("✔️ Local component namespace OK");
		self.list.push(self.test);
	}
});

sf.model('obj', function(self, root){
	self.test = 321+vul;
	self.list = [3,2,1+vul];
	self.init = function(){
		if(root('obj').test === 321+vul)
		 	console.log("✔️ Global model namespace OK");
		self.list.push(self.test);
	}
});

sf.component('my-obj', function(self, root){
	self.test = 321+vul;
	self.list = [3,2,1+vul];
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