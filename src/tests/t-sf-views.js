import {$, model, component, Views} from "../index.dev.js";
import {adder, minimalTest, windowTest} from "./t-shared.js";
import {hotReloadLevel} from "./index.dev.js";

Views.onCrossing = function(url){
  console.log("Cross domain catched:", url);
}

var views = new Views('custom-view');
views.maxCache = 2;
views.addRoute([
	{
		path:'/test/page1',
		url:'/router/page1',

		'nested-view':[
			{
				path:'/:nest',
				beforeRoute(data){
					this.url = '/router/lv1/'+data.nest
				},

				'nested2-view':[
					{
						path:'/:nest',
						beforeRoute(data){
							this.url = '/router/lv2/'+data.nest
						}
					}
				]
			}
		]
	},{
		path:'/test/page2',
		url:'/router/page2',

		'nested-view':[
			{
				path:'/:nest',
				beforeRoute(data){
					this.url = '/router/lv1/'+data.nest
				},

				'nested2-view':[
					{
						path:'/:nest',
						beforeRoute(data){
							this.url = '/router/lv2/'+data.nest
						}
					}
				]
			}
		]
	},{
		path:'/test/urlTemp',
		template:'route/urlTemp.html',

		'nested-view':[
			{
				path:'/:nest',
				template:'route/lv1.html',

				'nested2-view':[
					{
						path:'/:nest',
						template:'route/lv2.html',
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

window.templates['route/urlTemp.html'] = '<div>This is template page\
	<sf-m name="test-page1"><div>{{ text }}</div></sf-m>\
    <nested-view>Raw Henlo</nested-view>\
</div>';
window.templates['route/lv1.html'] = '<div>This is nest 1\
	<nested2-view>Default exist</nested2-view>\
</div>';
window.templates['route/lv2.html'] = '<div>This is nest 2\
	<test-nest2></test-nest2>\
</div>';

$(function(){
	setTimeout(function(){
		window.templates['route/urlTemp.html'] = '<div>This is reloaded template page\
			<sf-m name="test-page1"><div>html reloaded: {{ text }}</div></sf-m>\
		    <nested-view>Raw Henlo</nested-view>\
		</div>';
		window.templates['route/lv1.html'] = '<div>This is reloaded nest 1\
			<nested2-view>Default reloaded exist</nested2-view>\
		</div>';
		window.templates['route/lv2.html'] = '<div>This is reloaded nest 2\
			<test-nest2></test-nest2>\
		</div>';
		window.templates = window.templates; // trigger hot reload

		setTimeout(function(){
			model('test-page1', function(self){
				self.text = 'scope reloaded page 1';
			})
			model('test-nest1', function(self){
				self.text = 'scope reloaded nest 1';
			})
			component('test-nest2', {extend:TestPage}, function(self){
				self.text = "scope reloaded nest 2";
			});

			component.html('test-nest2', '<div>html reloaded: {{ text }}</div>');

			setTimeout(function(){
				var len = $('custom-view').html().split('reloaded').length;
				var count = hotReloadLevel === 1 ? 6 : 8;
				if(len !== count)
					console.error("❌ Reloaded views is should be 8 but got", len);
				else console.log("✔️ Reloaded views are working");
			}, 500);
		}, 500);
	}, 5000);
})

class TestPage{}

model('test-page1', {extend:TestPage}, function(self){
	self.text = "Hello from template";
});

model('test-nest1', {extend:TestPage}, function(self){
	self.text = "Hello from nest 1";
});

component('test-nest2', {extend:TestPage}, function(self){
	self.text = "Hello from nest 2";
});

component.html('test-nest2', '<div>{{ text }}</div>');

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