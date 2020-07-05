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
	},{
		path:'/test/urlTemp',
		template:'route/urlTemp',

		'nested-view':[
			{
				path:'/:nest',
				template:'route/lv1',

				'nested2-view':[
					{
						path:'/:nest',
						template:'route/lv2',
					}
				]
			}
		]
	}
]);

setTimeout(function(){
	views.goto('/test/urlTemp/1/1');
	setTimeout(function(){
		history.replaceState({}, '', '/');
	}, 500);
}, 1000);

window.templates['route/urlTemp.html'] = `<div>This is template page
	<sf-m name="test-page1"><div>{{ text }}</div></sf-m>
    <nested-view>Raw Henlo</nested-view>
</div>`;
window.templates['route/lv1.html'] = `<div>This is nest 1
	<nested2-view>Default exist</nested2-view>
</div>`;
window.templates['route/lv2.html'] = `<div>This is nest 2
	<test-nest2></test-nest2>
</div>`;

setTimeout(function(){
	window.templates['route/urlTemp.html'] = `<div>This is reloaded template page
		<sf-m name="test-page1"><div>{{ text }}</div></sf-m>
	    <nested-view>Raw Henlo</nested-view>
	</div>`;
	window.templates['route/lv1.html'] = `<div>This is reloaded nest 1
		<nested2-view>Default reloaded exist</nested2-view>
	</div>`;
	window.templates['route/lv2.html'] = `<div>This is reloaded nest 2
		<test-nest2></test-nest2>
	</div>`;
	window.templates = window.templates; // trigger hot reload

	setTimeout(function(){
		sf.model('test-page1').text = 'Hello from reloaded template';
		sf.model('test-nest1').text = 'Hello from reloaded template';

		var comp = sf.component('test-nest2')[0];
		if(comp !== void 0)
			sf.component('test-nest2')[0].text = 'Hello from reloaded template';

		setTimeout(function(){
			var len = $('custom-view').html().split('reloaded').length;
			if(len !== 6)
				console.error("❌ Reloaded views is should be 6 but got", len);
			else console.log("✔️ Reloaded views are working");
		}, 500);
	}, 500);
}, 5000);

class TestPage{}

sf.model('test-page1', {extend:TestPage}, function(self){
	self.text = "Hello from template";
});

sf.model('test-nest1', {extend:TestPage}, function(self){
	self.text = "Hello from nest 1";
});

sf.component('test-nest2', {extend:TestPage}, function(self){
	self.text = "Hello from nest 2";
});

sf.component('test-nest2', '<div>{{ text }}</div>');

views.on('start', function(from, to){
	console.log("Navigating from", from, "to", to);
})
.on('loading', function(current, totalDepth){
	console.log("Loading", current, "from", totalDepth);
})
.on('loaded', function(current, totalDepth) {
	console.log("Loaded", current, "from", totalDepth);
})
.on('finish', function(current, target) {
	console.log("Navigated from " + current + " to " + (target || '❌'));

	var obj = views.data;
	if(obj.title)
		$('head > title').text(obj.title);

	if(current === target)
		console.error("❌ Current address parameter was similar with last address");
})
.on('error', function(e) {
	console.error("❌ Navigation failed", e);
});