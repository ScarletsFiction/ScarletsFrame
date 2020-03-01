var views = new sf.views('custom-view');
views.maxCache = 100;
views.addRoute([
	{
		path:'/test/page1',
		url:'/test/page1',

		'nested-view':[
			{
				path:'/:nest',
				beforeRoute:function(data){
					this.url = '/test/lv1/'+data.nest
				},

				'nested2-view':[
					{
						path:'/:nest',
						beforeRoute:function(data){
							this.url = '/test/lv2/'+data.nest
						}
					}
				]
			}
		]
	},{
		path:'/test/page2',
		url:'/test/page2',

		'nested-view':[
			{
				path:'/:nest',
				beforeRoute:function(data){
					this.url = '/test/lv1/'+data.nest
				},

				'nested2-view':[
					{
						path:'/:nest',
						beforeRoute:function(data){
							this.url = '/test/lv2/'+data.nest
						}
					}
				]
			}
		]
	}
]);

sf.model.for('test-page1', function(self){
	self.text = "Hello from page 1";
});

sf.model.for('test-page1-nest1', function(self){
	self.text = "Hello from nest 1";
});

sf.model.for('test-page1-nest2', function(self){
	self.text = "Hello from nest 2";
});

sf.model.for('test-page2', function(self){
	self.text = "Hello from page 2";
});

views.on('routeStart', function(current, target) {
	 console.log("Loading path to " + target);
});
views.on('routeFinish', function(current, target) {
	 console.log("Navigated from " + current + " to " + target);
});
views.on('routeError', function(e) {
	 console.error("Navigation failed", e);
});
// views.on('routeData', function(obj){
//	 if(obj.title) sf.dom.findOne('head > title').innerHTML = obj.title;
// });
