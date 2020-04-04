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

function InheritComponent(){}
InheritComponent.construct = function(root, item){
	this.nyam = true;
}
InheritComponent.init = function(root, item){
	this.nyam2 = true;
}
InheritComponent.prototype.select = function(item){
	return item;
}


sf.component.for('comp-test', {extend: InheritComponent}, function(self, root, item){
	self.item = item;
	self.tries = [1,2,3+vul];
	self.data = 'zxc'+vul;
	self.select = function(zx){
		console.log('self.super returning', self.super(zx));

		self.tries[self.tries.indexOf(zx)] += zx;
		self.tries.refresh();
	}

	self.init = function(){
		console.warn('comp-test', item, self.$el[0], self, self.tries.constructor !== Array && self.tries.getElement(0));

		if(!this.nyam || !this.nyam2)
			console.error("❌ inherited construct or init was not working");

		document.firstElementChild.scrollTop = document.firstElementChild.scrollHeight;
	}
});

sf.component.html('comp-test', '<div sf-lang="translated">1. translated {{ data }}</div>\
	<input type="text" sf-bind="data">\
	<div class="sf-virtual-list"><span sf-repeat-this="num in tries"><a @click="select(num)">{{num}}</a>,</span></div>\
	<div>item: {{ item }}</div>\
<br>');

$(function(){
	var elem2 = new $CompTest('from javascript');
	nyam.appendChild(elem2);
});

sf.component('dynamic-reserved', {template:'test/reserved.html'}, function(self, root, $item){
	// Add note to developer that they must not load template from untrusted 3rd party
	self.sf$reserved = {test:$item.index === '1' ? '(1. {{ binds }})' : '(2. {{ binds }})'};
	self.binds = 'OK working';

	self.init = function(arg) {
		if(self.$el[0].innerHTML.indexOf('{{') !== -1)
			console.error('❌ Component init called on unparsed element template');

		var find = '('+$item.index+'. '+self.binds+')';
		if(self.$el[0].innerHTML.indexOf(find) === -1)
			console.error("❌ Reserved element was replaced with incorrect data, expected to found", find, self.$el[0]);
	}
});

sf.component('dynamic-template', {template:'test/template.html'}, function(self, root){
	self.binds = 'OK working';
});

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