// Controller will be initialized once on page load
sf.controller.for('large-list', function(self, root){
	self.itemFinished = function(id){
		var li = $(this).parents('li');
		li.toggleClass("danger");
		sf.dom.animateCSS(li[0], 'flipInX');
	}
});