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
			console.error("inherited construct or init was not working");

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
	components.appendChild(elem2);
});

sf.component('dynamic-reserved', function(self, root){
	self.sf$reserved = {test:'<div> {{ binds }} </div>'};
	self.binds = 'OK working';
});

sf.component('dynamic-template', {template:'test/index.html'}, function(self, root){
	self.binds = 'OK working';
	self.init = function(argument) {
		console.log('asdjhaksjd');
	}
});

window.templates = {
	'test/index.html':`is something
<sf-template path="test/absolute.html"></sf-template>
and
<sf-template path="./relative.html"></sf-template>
in the middle?`,
	'test/absolute.html':'<div> 1. {{ binds }} </div>',
	'test/relative.html':'<div> 2. {{ binds }} </div>',
};