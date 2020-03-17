var binding = null;
sf.model.for('model-binding', function(self, root){
	binding = self;

	setTimeout(function(){
		var self = root('model-binding');
		self.inputBinding1 = 'Two way binding'+vul;
		self.inputBinding2.text = 123.321+vul;
	}, 4000);

	self.onKeyUp = console.warn;

	self.bold = true;
	self.pink = false;
	self.inputBinding1 = ''+vul;
	self.inputBinding2 = {text:''+vul};
	self.inputBinding3 = vul;
	self.inputBinding4 = ''+vul;
	self.m2v$inputBinding4 = function(old, news){
		console.warn("inputBinding4 (Model -> View)", old, news || '❌');
	};
	self.v2m$inputBinding4 = function(old, news){
		console.log("inputBinding4 (View -> Model) will be revert from:", news, 'to', old || '❌');
		setTimeout(function(){
			self.inputBinding4 = old+vul;
			console.log("Reverted");
		}, 4000);
	};
	self.inputBinding5 = [];
	self.inputBinding2.out$text = function(old, news){
		console.warn("inputBinding2 was modified from:", news || '❌', 'to', Math.round(news));
		return Math.round(news);
	};

	self.inputBinding8 = '';
	self.v2m$inputBinding8 = function(old, news){
		sf.lang.changeDefault(news);
	}

	self.text = 'main model';
	self.inputBinding6a = [
		{text:'Select 1'+vul, value:1+vul},
		{text:'Select 2'+vul, value:2+vul},
		{text:'Select 3'+vul, value:3+vul},
	];

	setTimeout(function(){
		self.inputBinding6a.push({text:'Select 4'+vul, val:4+vul});
	}, 5000);
	self.inputBinding6 = '';
	self.on$inputBinding6 = function(old, news){
		console.warn("inputBinding6 was updated from:", old, 'to', news || '❌');
	};
	self.inputBinding7 = ''+vul;
	self.showHTML = true;
	self.prefix = 'i -> '+vul;
	self.stuff = '(text from the model)'+vul;
	self.stuffes = ' and stuff'+vul;
	self.vuln = "{{self.vul}}{{@exec console.error('something not gud')}}"+vul;
	self.vul = "this musn't being visible"+vul;

	setTimeout(function(){
		try{
			sf.model.init(reinit);
		}
		catch(e){
			console.error("✔️ Expected error", e);
		}
	}, 1000);

	self.init = function(){
		setTimeout(function(){
			self.showHTML = false;
		}, 2000);

		var list = root('virtual-scroll');
		if(list.list1 === undefined)
			console.error("Can't get other model scope variable");
	}

	self.addition = function(a, b){
		return a + b;
	}

	if(minimalTest)
		return;

	setTimeout(function(){
		self.inputBinding3 = true;
		self.inputBinding4 = 'radio1';
		self.inputBinding5 = self.inputBinding6 = 1;
		self.bold = false;
		self.pink = true;
	}, 3000);

	setTimeout(function(){
		self.inputBinding3 = 'check1';
		self.inputBinding4 = 'radio2';
		self.inputBinding5 = self.inputBinding6 = 3;
	}, 6000);

	setTimeout(function(){
		self.inputBinding3 = ['check2'];
		self.inputBinding4 = 'radio1';
		self.inputBinding5 = [1, 2];
		self.bold = true;
		self.pink = false;
	}, 8000);
});

sf.model.for('components', function(self){
	self.items = [1];
	self.test = 'this must getting changed'+vul;
	self.handleClick = function(e){
		console.log('element click', e.target || '❌');
	}
	self.init = function(){
		console.log("Model init called", self.$el || '❌');

		setTimeout(function(){
			self.test = 'OK'+vul;
			if(self.$el('#nyam').attr('test') !== 'OK'+vul)
				console.error("✔️ Attribute is not changed", self.$el('#nyam')[0]);
		}, 1000);
	}
	self.clickOK = function(){
		console.warn("✔️ Click OK!");
		self.items.push(self.items.length+1);
	}
});

sf.model('deep-property', function(self){
  test = self;

  self.one = 'One';
  self.today = {two:'Two'};
  self.list = [];

  // Run when this model was initialized
  self.init = function(){
    self.list.push({
      text:{
        three:"Three"
      },
      four:'Four'
    });

    setTimeout(function(){
      self.one += '12';
      if(self.$el('.today').text().trim() !== 'One12 Two')
        console.error('❌', self.$el('.today').text().trim(), ', should be ->', 'One12 Two');
      if(self.$el('label').text().indexOf('One12') === -1)
        console.error('❌ Four Three - Two One, should be changed to -> Four Three - Two One12');

      self.today.two += '12';
      if(self.$el('.today').text().trim() !== 'One12 Two12')
        console.error('❌', self.$el('.today').text().trim(), ', should be ->', 'One12 Two12');
      if(self.$el('label').text().indexOf('Two12') === -1)
        console.error('❌ Four Three - Two One12, should be changed to -> Four Three - Two12 One12');

      self.list[0].text.three += '12';
      if(self.$el('label').text().indexOf('Three12') === -1)
        console.error('❌ Four Three - Two12 One12, should be changed to -> Four Three12 - Two12 One12');

      self.list[0].four += '12';
      if(self.$el('label').text().indexOf('Four12') === -1)
        console.error('❌ Four Three12 - Two12 One12, should be changed to -> Four12 Three12 - Two12 One12');
    });
  }
});
