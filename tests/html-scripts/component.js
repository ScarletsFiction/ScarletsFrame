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