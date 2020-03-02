var testSpace = new sf.space({namespace:'test-space'});

testSpace.model('obj', function(self, root){
	self.test = 123+vul;
	self.list = [1,2,3+vul];
	self.init = function(){
		self.list.push(self.test);
	}
});

testSpace.component('my-obj', function(self, root){
	self.test = 123+vul;
	self.list = [1,2,3+vul];
	self.init = function(){
		if(root('obj').test === 123+vul)
		 	console.log("Test namespace OK");
		self.list.push(self.test);
	}
});

sf.model('obj', function(self, root){
	self.test = 321+vul;
	self.list = [3,2,1+vul];
	self.init = function(){
		if(root('obj').test === 123+vul)
		 	console.log("Test namespace OK");
		self.list.push(self.test);
	}
});

sf.component('my-obj', function(self, root){
	self.test = 321+vul;
	self.list = [3,2,1+vul];
	self.init = function(){
		if(root('obj').test === 321+vul)
		 	console.log("Global namespace OK");
		self.list.push(self.test);
	}
});