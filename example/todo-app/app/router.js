// Run this function when sf-page for 'todo/index' was found
// And all model or controller was finished running
sf.router.before('todo/index', function(root){
	var self = root('todo-app');
	var weekday = new Array(7);

	// root can be used for accessing other scope
	// when self are 'todo-app' is scope

	self.weekday = weekday;
	// root['todo-app'].weekday = weekday;

	// The weekday on root['todo-app'] will also be changed
	// Because array is passed by reference on a object
	weekday[0] = "Sunday 🍻";
	weekday[1] = "Monday 💪🍻";
	weekday[2] = "Tuesday 😜";
	weekday[3] = "Wednesday 😌☕️";
	weekday[4] = "Thursday 🍻";
	weekday[5] = "Friday 🍻";
	weekday[6] = "Saturday 🍻";

	var d = new Date();
	var n = self.weekday[d.getDay()];
	var randomWordArray = Array(
		"Oh my, it's ",
		"Whoop, it's ",
		"Happy ",
		"Seems it's ",
		"Awesome, it's ",
		"Have a nice ",
		"Happy fabulous ",
		"Enjoy your "
	);

	self.todayMessage = randomWordArray[Math.floor(Math.random() * randomWordArray.length)] + n;

	var isError = self.class_error === 'hidden';

	if (!isError) {
		$(".form-control").blur(function() {
			self.class_error = "hidden";
		});
	}

	$(".form-control").keypress(function(e) {
		if (e.which == 13) {
			var itemVal = $(".form-control").val();
			self.addItem(itemVal);
		}
	});
	
	var state = self.getState();

	if (!state) {
		self.setDefaultState();
		state = self.getState();
	}

	Object.keys(state).forEach(function(todoKey) {
		var todo = state[todoKey];
		self.addItem(todo.title, todo.status, todo.id, true);
	});
});