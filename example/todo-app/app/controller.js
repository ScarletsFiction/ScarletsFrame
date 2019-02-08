// Controller will be initialized once on page load
sf.controller.for('todo-app', function(self, root){
	self.setDefaultState = function() {
		var id = generateID();
		var baseState = {};
		baseState[id] = {
			status: "new",
			id: id,
			title: "This site uses to keep track of your tasks"
		};
		syncState(baseState);
	}

	function generateID() {
		var randLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
		return randLetter + Date.now();
	}

	function pushToState(title, status, id) {
		var baseState = self.getState();
		baseState[id] = { id: id, title: title, status: status };
		syncState(baseState);
	}

	function setToDone(id) {
		var baseState = self.getState();
		if (baseState[id].status === 'new') {
			baseState[id].status = 'done'
		} else {
			baseState[id].status =  'new';
		}

		syncState(baseState);
	}

	function syncState(state) {
		localStorage.setItem("state", JSON.stringify(state));
	}

	self.deleteTodo = function(id) {
		console.log(id)

		for (var i = 0; i < self.list.length; i++) {
			if(self.list[i].id == id)
				self.list.splice(i, 1);
		}

		var baseState = self.getState();
		delete baseState[id]
		syncState(baseState)
	}

	self.resetState = function() {
		localStorage.setItem("state", null);
	}

	self.getState = function() {
		return JSON.parse(localStorage.getItem("state"));
	}

	self.addItem = function(text, status, id, noUpdate) {
		var id = id ? id : generateID();
		var item = {
			id:id,
			text:text,
			status:status == 'done' ? 'danger':''
		};

		if (text === "") {
			self.class_error = 'animated bounceIn';
		} else {
			self.class_error = 'hidden';
			self.itemInput = '';
			self.class_no_item = 'hidden';
			self.list.push(item);
		}

		if (!noUpdate) {
			pushToState(text, "new", id);
		}
	}

	self.itemFinished = function(id){
		var li = $(this).parents('li');
		li.toggleClass("danger");
		sf.dom.animateCSS(li[0], 'flipInX');

		setToDone(id);
	}
});