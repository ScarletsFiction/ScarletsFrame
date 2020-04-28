sf.model.for('virtual-scroll', function(self, root){
	self.handleClick = function(e, which){
		// e.target.model ==> the item{}
		// but let's try get from the index first

		if(which === 2)
			return console.log('list clicked 2', self.list2[self.list2.indexOf(e.target)]);

		console.log('list clicked 1', self.list1[self.list1.indexOf(e.target)]);
	}

	self.vul = "this shouldn't be visible"+vul;
	self.list1 = [];
	self.list1b = [];
	self.one = 'first'+vul;

	for (var i = 1; i <= 50; i++) {
		self.list1b.push({
			id: 'item-' + i+vul,
		});
	}

	self.init = function(el){
		self.list1.unshift({id:'first thing'+vul});
		self.list1.push({id:'second thing'+vul});
		console.warn(el, "Element when init called", self.list1.getElement(0), self.list1.getElement(1));
	}

	self.list2 = [];
	self.list2b = JSON.parse(JSON.stringify(self.list1b));

	var added = false;
	self.on$list2 = self.on$list1 = {
		hitFloor:function(){
			console.log("✔️ Scroll hit floor");

			// Test infinity load for static scroll
			if(added === false){
				added = true;
				self.list1.push({id:"Added on scroll end - 1"+vul}, {id:"Added on scroll end - 2"}, {id:"✔️ Added on scroll end - 3"});
			}
		},
		hitCeiling:function(){
			console.log("✔️ Scroll hit ceiling");
		}
	}

	self.list3 = [[1,2,3], [4,5,6]];
	self.list4 = {a:'a',b:'b',c:'c'};
});

var aList = null;
$(function(){
	if(minimalTest)
		return;

	var list = aList = sf.model('virtual-scroll');

	setTimeout(function(){
		list.list1.splice(0);

		list.list1.splice(1, 0, {id:"I'm at pos 2"+vul});
		list.list1.unshift({id:"I'm inserted on first index"+vul});
		list.list1.push({id:"I'm inserted on last index"+vul});
		list.list1.splice(2, 0, {id:"I'm at pos 3"+vul});
	}, 1000);

	setTimeout(function(){
		list.list1 = list.list1b;

		// Hard Refreshed
		console.log("Item: 11-15");
		list.list2 = list.list2b.slice(10, 15);

		// Add element at the end
		setTimeout(function(){
			console.log("Item: 11-20");
			list.list2 = list.list2.concat(list.list2b.slice(15, 20));
		}, 2000);

		// Clear some element and refresh some element
		setTimeout(function(){
			console.log("Item: 21-25");
			list.list2 = list.list2b.slice(20, 25);
		}, 5000);
		// Reuse element from the middle
		setTimeout(function(){
			console.log("Item: 21-23, 31-35");
			list.list2 = list.list2b.slice(20, 23).concat(list.list2b.slice(30, 35));
		}, 8000);

		// Variable height for list2
		setTimeout(function(){
			list.list2 = list.list2b;

			var elements = list.list2.$virtual.elements();
			for (var i = 0; i < elements.length; i++) {
				elements[i].style.height = (40 + Math.round(Math.random()*3)*40) + 'px';
			}

			setTimeout(function(){
				list.list2.$virtual.scrollTo(10);
			}, 1000);
		}, 12000);

		var posY = list.list1.$virtual.offsetTo(20);
		if(!posY)
			console.error("❌ Can't get element offset for static height virtual scroll");

		list.list1.pop(); // remove item-50
		list.list1.unshift({id:"I'm should be deleted"}, {id:"I'm inserted on first index"});
		list.list1.shift();
		list.list1.splice(3, 1); // remove index 3 (item-3)
		list.list1.splice(5, 0, {id:"The removed item above is 'item-3'"}); // add as index 5
		list.list1.push({id:"I'm inserted on last index (as item-50)"});

		list.list1.unshift({id:"{{self.vul}}{{@exec console.error('something not gud')}}"});
		setTimeout(function(){
			sf.model.init(reinit2);
			setTimeout(function(){
				if(list.list1.getElement(0).textContent.indexOf('{{self.vul}}') === -1)
					return console.error("❌ Vulnerability detected", list.list1.getElement(0));
				list.list1.shift();
			}, 200);
		}, 1000);

		setTimeout(function(){
			list.list1.move(5, 4); // move index 5 after index 4
			list.list1.refresh(1); // Refresh second index
		}, 2000);
		setTimeout(function(){
			list.list1.swap(3, 4); // swap / up one more time
		}, 4000);

		// Save dummy data to element
		list.list1.getElement(7).dummy = true;

		list.list1[7].id = 'Partial refresh x1'+vul;
		list.list1.assign(7, {id:'Partial refresh x2'+vul});

		list.list1.getElement(8).dummy = true;
		list.list1[8] = {id:'Element refresh'+vul};
		list.list1.refresh(8, 1);

		setTimeout(function(){
			if(!list.list1.getElement(7).dummy) console.error("❌ Data on partial refresh was missing", list.list1[7]);
			if(list.list1.getElement(8).dummy) console.error("❌ Data on element refresh was exist", list.list1[8]);
		}, 500);

		console.log("I got the last index", list.list1.getElement(list.list1.length-1) || '❌');
	}, 2000);
});
