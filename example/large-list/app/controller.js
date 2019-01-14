// Controller will be initialized once on page load
sf.controller.for('large-list', function(self, root){
	self.itemFinished = function(id){
		var li = $(this).parents('li');
		li.toggleClass("danger");
		li.animateCSS('flipInX');
	}
});