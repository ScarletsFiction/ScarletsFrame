import {$, model, component, Views, Space, loader} from "../index.js";
import {adder, minimalTest, windowTest} from "./t-shared.js";

// class InheritComponent{
// 	static construct(root, item){
// 		this.nyam = true;
// 	}
// 	static init(root, item){
// 		this.nyam2 = true;
// 	}
// 	select(item){
// 		return item;
// 	}
// }

window.templates = {
	'test/reserved.html':`
 reserve index
 <sf-reserved name="test"></sf-reserved>
 ?`,
	'test/template.html':`is something
<sf-template path="test/absolute.html"></sf-template> as one
and <sf-template path="./relative.html"></sf-template> as two<br>
from window.templates?`,
	'test/absolute.html':'(1. {{ binds }})',
	'test/relative.html':'(2. {{ binds }})',
};

class InheritComponent{
	static construct(root, item){
		this.nyam = true;
	}
	static init(root, item){
		this.nyam2 = true;
	}

	select(item){
		return item;
	}
}

component('comp-test', {extend: InheritComponent}, function(My, root, item){
	My.item = item;
	My.tries = [1,2,3+adder];
	My.data = 'zxc'+adder;
	My.select = function(zx){
		console.log('My.super returning', My.super(zx));

		My.tries[My.tries.indexOf(zx)] += zx;
		My.tries.refresh();
	}

	My.init = function(){
		console.warn('comp-test', item, My.$el[0], My, My.tries.constructor !== Array && My.tries.getElement(0));

		if(!this.nyam || !this.nyam2)
			console.error("❌ inherited construct or init was not working");

		// document.firstElementChild.scrollTop = document.firstElementChild.scrollHeight;
	}
});

component.html('comp-test', `<div sf-lang="translated">1. translated {{ data }}</div>
	<input type="text" sf-bind="data">
	<div class="sf-virtual-list"><span sf-each="num in tries"><a @click="select(num)">{{num}}</a>,</span></div>
	<div>item: {{ item }}</div>
<br>`);

// Hot reload test
setTimeout(function(){
	component('comp-test', {extend: InheritComponent}, function(My, root, item){
		My.item = item;
		My.tries = [5,6,7+adder];
		My.data = 'zxc refreshed'+adder;
		My.select = function(zx){
			console.log('My.super after refresh returning', My.super(zx));

			My.tries[My.tries.indexOf(zx)] += 10;
			My.tries.refresh();
		}
	});

	model('fultest', function(My){
		My.ful = '2'+adder;

		var hotReloadCalled = false;
		My.hotReloaded = function(){
			hotReloadCalled = true;

			My.ful = '3'+adder;
			if(My.ful !== '3'+adder)
				console.error("Model hot reload data was not match");
			else
				console.log("✔️ It seems model data reload was working");

			My.ful = '1'+adder;
		}

		setTimeout(function(){
			if(!hotReloadCalled)
				console.error("Model My.hotReloaded was not running");
		}, 500);
	});

	component('comp-test', {extend: InheritComponent}, function(My, root, item){
		My.item = item;
		My.tries = [5,6,7+adder];
		My.data = 'zxc refreshed'+adder;
		My.select = function(zx){
			console.log('My.super after refresh returning', My.super(zx));

			My.tries[My.tries.indexOf(zx)] += 10;
			My.tries.refresh();
		}

		var hotReloadCalled = false;
		My.hotReloaded = function(){
			hotReloadCalled = true;

			My.data = 'zxc refreshed'+adder;
			if(My.data !== 'zxc refreshed'+adder)
				console.error("Component hot reload data was not match");
			else
				console.log("✔️ It seems component data reload was working");
		}

		setTimeout(function(){
			if(!hotReloadCalled)
				console.error("Component My.hotReloaded was not running");
		}, 2000);
	});

	component.html('comp-test', `<div sf-lang="translated">1. translated {{ data }}</div>
		<input type="text" sf-bind="data">
		<div class="sf-virtual-list"><span sf-each="num in tries"><a @click="select(num)">{{num}}</a>,</span></div>
		<div>refreshed: {{ item }}</div>
	<br>`);

	templates['test/reserved.html'] = `
	 refreshed: index
	 <sf-reserved name="test"></sf-reserved>
	 ?`;

	templates['test/template.html'] = `is something
	<sf-template path="test/absolute.html"></sf-template> as one
	and <sf-template path="./relative.html"></sf-template> as two<br>
	from refreshed: window.templates?`;

	templates = templates;

	setTimeout(function(){
		var list = $('comp-test');
		var hasError = false;
		for (var i = 0; i < list.length; i++) {
			if(list[i].id === 'henlos' || list[i].id.indexOf('deep') !== -1)
				continue;

			if(list[i].innerHTML.indexOf('refreshed:') === -1){
				console.error("❌ Reloaded component HTML is not working", list[i]);
				hasError = true;
				break;
			}
		}

		list = $('dynamic-reserved');
		for (var i = 0; i < list.length; i++) {
			if(list[i].innerHTML.indexOf('refreshed:') === -1){
				console.error("❌ Reloaded dynamic-reserved is not working", list[i]);
				hasError = true;
				break;
			}
		}

		list = $('dynamic-template');
		for (var i = 0; i < list.length; i++) {
			if(list[i].innerHTML.indexOf('refreshed:') === -1){
				console.error("❌ Reloaded dynamic-template HTML is not working", list[i]);
				hasError = true;
				break;
			}
		}

		if(hasError === false)
			console.log("✔️ It seems component HTML reload was working");
	}, 500);
}, 5000);

$(function(){
	var elem2 = new $CompTest('from javascript');
	nyam.appendChild(elem2);
});

component('dynamic-reserved', {template:'test/reserved.html'}, function(My, root, $item){
	// Add note to developer that they must not load template from untrusted 3rd party
	My.sf$reserved = {test:$item.index === '1' ? '(1. {{ binds }})' : '(2. {{ binds }})'};
	My.binds = 'OK working';

	My.init = function(arg) {
		if(My.$el[0].innerHTML.indexOf('{{') !== -1)
			console.error('❌ Component init called on unparsed element template');

		var find = '('+$item.index+'. '+My.binds+')';
		if(My.$el[0].innerHTML.indexOf(find) === -1)
			console.error("❌ Reserved element was replaced with incorrect data, expected to found", find, My.$el[0]);
	}
});

component('dynamic-template', {template:'test/template.html'}, function(My, root){
	My.binds = 'OK working';
});

model('fultest', function(My){
	My.ful = '1'+adder;
});

component('ful-test', function(My){
	My.ful = '1'+adder;
});

class myself{
	nyam = "Fail";
	constructor(){
		this.nyam = 'OK';
	}
}

model('clastest', class extends myself{
	constructor(){
		super();
		this.ful = '1'+adder;
	}
	init(){
		this.ful = 'a'+this.ful;

		var that = this;
		setTimeout(function(){
			if(!that.$el[0].innerText.includes('OK a1'))
				console.error("Content was incorrect, it should be OK a1", that.$el[0], that);
		}, 1000);
	}
});

component('clas-test', class extends myself{
	constructor(){
		super();
		this.ful = '2'+adder;

		var that = this;
		setTimeout(function(){
			if(!that.$el[0].innerText.includes('OK b2'))
				console.error("Content was incorrect, it should be OK b2", that.$el[0], that);
		}, 1000);
	}
	init(){
		this.ful = 'b'+this.ful;
	}
});