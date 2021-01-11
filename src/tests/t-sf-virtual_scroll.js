import {model, component, internal, getScope, Obj} from "../index.js";
import {ModelInit} from "../sf-model/a_model.js";
import {adder, minimalTest, windowTest} from "./t-shared.js";
import {$} from "../index.js";

model('virtual-scroll', function(self, root){
	window.test = self;

	self.handleClick = function(e, which){
		// e.target.model ==> the item{}
		// but let's try get from the index first

		if(which === 1)
			self.oneSelect = getScope(e.target).id;
		else
			self.twoSelect = getScope(e.target).id;

		if(which === 2)
			return console.log('list clicked 2', self.list2[self.list2.indexOf(e.target)]);

		console.log('list clicked 1', self.list1[self.list1.indexOf(e.target)]);
	}

	self.withKeyClick = function(key, val, repeatID){
		console.log('Clicked', key, val, repeatID);
	}

	self.vul = "this shouldn't be visible"+adder;
	self.list1 = [];
	self.list1b = [];
	self.one = 'first'+adder;
	self.oneSelect = null;
	self.twoSelect = null;
	self.id = 'test id';

	for (var i = 1; i <= 50; i++) {
		self.list1b.push({
			id: 'item-' + i+adder,
		});
	}

	self.init = function(el){
		if(self.$el.length !== 1)
			return;

		self.list1.unshift({id:'first thing'+adder});
		self.list1.push({id:'second thing'+adder});
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
				self.list1.push({id:"Added on scroll end - 1"+adder}, {id:"Added on scroll end - 2"}, {id:"✔️ Added on scroll end - 3"});
			}
		},
		hitCeiling:function(){
			console.log("✔️ Scroll hit ceiling");
		}
	}

	self.list3 = [[1,2], [3, 4], [5,6]];
	self.list4 = {a:'a',b:'b',c:'c'};
	self.list5 = [{a:1},{a:2},{a:3},{a:4},{a:5}];

	var map = self.list6 = new Map();
	map.set({a:1}, {b:1}).set({a:2}, {b:2}).set({a:3}, {b:3});
	self.list7 = new Set([1,2,3]);

	self.strRange = function*(begin, end, step){
	  begin = begin.charCodeAt(0);
	  end = end.charCodeAt(0);

	  if(step > 0)
	    for(;begin <= end; begin += step)
	      yield String.fromCharCode(begin);
	  else
	    for(;begin >= end; begin += step)
	      yield String.fromCharCode(begin);
	}
});

var aList = null;
$(function(){
	var list = aList = model('virtual-scroll');

	setTimeout(function(){
		// Property/Object
		list.list4 = {z:'fail', b:'fail', c:'fail'};
		setTimeout(()=> {
			Obj.set(list.list4, 'z', 'is b deleted?');
			Obj.delete(list.list4, 'b');

			list.list4.c = 'refresh on c ok';
			list.list4.z = 'refresh on z ok';
		}, 1000);

		// Array
		list.list3[1] = ['a','b'];
		list.list3[2] = ['c', 'd'];
		list.list3.refresh();

		list.list5.unshift({a:0});
		list.list5.splice(-2, 1, {a:'4a'});
		list.list5[3].a = '3a';
		list.list5.push({a:6});

		// Map
		list.list6.clear();
		if(list.list6.size !== 0)
			console.error("Map clear doesn't make the size 0");
		list.list6.set({a:'❌fail'}, {b:'this should be cleared'});

		setTimeout(()=> {
			var temp = new Map();
			temp.set({a:'replaced'}, {b:'ok'});
			list.list6 = temp;

			var fail = {a:'delete fail'};
			var fail_ = {b:'❌1'};
			var OK = {a:'❌ update key fail'};
			list.list6.set(fail, fail_).set(fail, fail_)
				.set(OK, {b:'❌replace fail'})
				.set(OK, {b:'❌replace value fail'});

			list.list6.delete(fail).delete(fail);
			OK.a = 'OK';
			list.list6.get(OK).b = 'OK';
		}, 1000);

		// Set
		list.list7.clear();
		if(list.list7.size !== 0)
			console.error("Set clear doesn't make the size 0");
		list.list7.add('❌ this should be cleared');

		setTimeout(()=> {
			list.list7 = new Set(['replaced']);

			list.list7.add('❌ fail').add('❌ fail').add('OK');
			list.list7.delete('❌ fail').delete('❌ fail');
		}, 1000);

		// Test remove & re-add
		setTimeout(function(){
			$('[name="virtual-scroll"]').eq(-2)[0].outerHTML = '<sf-m name="virtual-scroll" style="display:inline-block;width: 30%;">\
	           <div sf-each="key,nyan in list3" @click="withKeyClick(key, nyan, 2)">{{@exec\
	             for (var i = 0; i < nyan.length; i++) {\
	               {[ <b>2-></b> {{key}}. test[{{i}}] = {{ nyan[i] }}<br> ]}\
	             }\
	           }}</div>\
	           <div sf-each="key,val in list4" @click="withKeyClick(key, val, 2)">\
	             <span><b>2-></b> obj[{{ key }}] = {{ val }}</span><br>\
	           </div>\
	           <div sf-each="key,val in list6" @click="withKeyClick(key, val, 2)">\
	             <span><b>2-></b> map[{{ key.a }}] = {{ val.b }}</span><br>\
	           </div>\
	           <div sf-each="val in list7" @click="withKeyClick(val, 2)">\
	             <span><b>2-></b> set -> {{ val }}</span><br>\
	           </div>\
	           bottom-boundary\
	        </sf-m>';

	        list.list6.refresh();
	        list.list5.refresh();
			list.list4.z = 'refresh on z ok (2)';
		}, 2000);
	}, 3000);

	if(minimalTest)
		return;

	setTimeout(function(){
		list.list1.splice(0);

		list.list1.splice(1, 0, {id:"I'm at pos 2"+adder});
		list.list1.unshift({id:"I'm inserted on first index"+adder});
		list.list1.push({id:"I'm inserted on last index"+adder});
		list.list1.splice(2, 0, {id:"I'm at pos 3"+adder});
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

			var elements = list.list2.$EM.elements;
			for (var i = 0; i < elements.length; i++)
				elements[i].style.height = (40 + Math.round(Math.random()*3)*40) + 'px';

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
			ModelInit(reinit2);
			setTimeout(function(){
				if(list.list1.getElement(0).textContent.indexOf('{{self.vul}}') === -1)
					return console.error("❌ Vulnerability detected", list.list1.getElement(0));
				list.list1.shift();
			}, 200);
		}, 1000);

		setTimeout(function(){
			if(!list.list1.getElement(7).dummy) console.error("❌ Data on partial refresh was missing", list.list1[7]);
			if(list.list1.getElement(8).dummy) console.error("❌ Data on element refresh was exist", list.list1[8]);
		}, 500);

		setTimeout(function(){
			list.list1.move(5, 4); // move index 5 after index 4
			list.list1.refresh(1); // Refresh second index
		}, 2000);
		setTimeout(function(){
			list.list1.swap(3, 4); // swap / up one more time
		}, 4000);

		setTimeout(function(){
			var lastLen = list.sf$bindedKey.one.length;
			var backup = list.list1.splice(0);

			setTimeout(function(){
				list.list1 = backup;
				var nowLen = list.sf$bindedKey.one.length;

				if(nowLen !== lastLen)
					console.error("❌ BindedKey length was different (old:"+lastLen+', now:'+nowLen+')', list.sf$bindedKey.one);
			}, 1000);
		}, 6000);

		// Save dummy data to element
		list.list1.getElement(7).dummy = true;

		list.list1[7].id = 'Partial refresh x1'+adder;
		list.list1.assign(7, {id:'Partial refresh x2'+adder});

		list.list1.getElement(8).dummy = true;
		list.list1[8] = {id:'Element refresh'+adder};
		list.list1.refresh(8, 1);

		console.log("I got the last index", list.list1.getElement(list.list1.length-1) || '❌');
	}, 2000);
});
