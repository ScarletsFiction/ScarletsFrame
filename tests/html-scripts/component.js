class InheritComponent{
	ahoy(){}
}

sf.component.for('comp-test', {extend: InheritComponent}, function(self, root, item){
	self.item = item;
	self.tries = [1,2,3+vul];
	self.data = 'zxc'+vul;
	self.select = function(zx){
		console.log('selected', zx);

		self.tries[self.tries.indexOf(zx)] += zx;
		self.tries.refresh();
	}

	self.init = function(){
		console.warn('comp-test', item, self.$el[0], self);
		console.warn("Component init called", self, self.tries.constructor !== Array && self.tries.getElement(0));
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