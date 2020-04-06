var views = new sf.views('custom-view');
views.maxCache = 2;
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

class TestPage{}

sf.model.for('test-page1', {extend:TestPage}, function(self){
	self.text = "Hello from page 1";
});

sf.model.for('test-page1-nest1', {extend:TestPage}, function(self){
	self.text = "Hello from nest 1";
});

sf.model.for('test-page1-nest2', {extend:TestPage}, function(self){
	self.text = "Hello from nest 2";
});

sf.model.for('test-page2', {extend:TestPage}, function(self){
	self.text = "Hello from page 2";
});

views.on('start', function(from, to){
	console.log("Navigating from", from, "to", to);
});
views.on('loading', function(current, totalDepth){
	console.log("Loading", current, "from", totalDepth);
});
views.on('loaded', function(current, totalDepth) {
	console.log("Loaded", current, "from", totalDepth);
});
views.on('finish', function(current, target) {
	console.log("Navigated from " + current + " to " + (target || '❌'));

	var obj = views.data;
	if(obj.title)
		$('head > title').text(obj.title);

	if(current === target)
		console.error("❌ Current address parameter was similar with last address");
});
views.on('error', function(e) {
	console.error("❌ Navigation failed", e);
});