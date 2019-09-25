var $ = sf.dom;

// ===== Virtual List =====

var test = null;
sf.model.for('virtual-scroll', function(self, root){
   test = self;

   self.vul = "this shouldn't be visible";
   self.list1 = [];
   self.list1b = [];
   self.one = 'first';

   for (var i = 1; i <= 50; i++) {
      self.list1b.push({
         id: 'item-' + i,
      });
   }

   self.list2 = [];
   self.list2b = JSON.parse(JSON.stringify(self.list1b));

   var added = false;
   self.on$list2 = self.on$list1 = {
      hitFloor:function(){
         console.log("Scroll hit floor");

         // Test infinity load for static scroll
         if(added === false){
            added = true;
            self.list1.push({id:"Added on scroll end - 1"}, {id:"Added on scroll end - 2"}, {id:"Added on scroll end - 3"});
         }
      },
      hitCeiling:function(){
         console.log("Scroll hit ceiling");
      }
   }
});

var aList = null;
sf(function(){
   var list = aList = sf.model('virtual-scroll');

   setTimeout(function(){
      list.list1.splice(5, 0, {id:"I'm at pos 2"});
      list.list1.unshift({id:"I'm inserted on first index"});
      list.list1.push({id:"I'm inserted on last index"});
      list.list1.splice(2, 0, {id:"I'm at pos 3"});
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
         console.error("Can't get element offset for static height virtual scroll");

      list.list1.pop(); // remove item-50
      list.list1.unshift({id:"I'm should be deleted"}, {id:"I'm inserted on first index"});
      list.list1.shift();
      list.list1.splice(3, 1); // remove index 3 (item-3)
      list.list1.splice(5, 0, {id:"The removed item above is 'item-3'"}); // add as index 5
      list.list1.push({id:"I'm inserted on last index"});

      list.list1.unshift({id:"{{self.vul}}{{@exec console.error('something not gud')}}"});
      setTimeout(function(){
         sf.model.init(reinit2);
         setTimeout(function(){
            if(list.list1.getElement(0).textContent.indexOf('{{self.vul}}') === -1)
               return console.error("Vulnerability detected");
            list.list1.shift();
         }, 200);
      }, 1000);

      setTimeout(function(){
         list.list1.move(5, 4); // move index 5 after index 4
         list.list1.softRefresh(1); // Refresh second index
      }, 2000);
      setTimeout(function(){
         list.list1.swap(3, 4); // swap / up one more time
      }, 4000);

      // Save dummy data to element
      list.list1.getElement(7).dummy = true;
      list.list1.getElement(8).dummy = true;

      list.list1[7].id = 'Partial refresh';
      list.list1.refresh(7, 'id');

      setTimeout(function(){
         list.list1[8].id = 'Element refresh';
         list.list1.softRefresh(8);

         if(list.list1.getElement(7).sf$cache){ // Non-keyed cache
	         if(list.list1.getElement(7).sf$cache.id !== list.list1[7].id)
	            console.error("Partial refresh not working");
	         if(list.list1.getElement(8).sf$cache.id !== list.list1[8].id)
	            console.error("Element refresh not working");
	        
         	if(!list.list1.getElement(7).dummy) console.error("Data on partial refresh was missing");
         }

         if(list.list1.getElement(8).dummy) console.error("Data on element refresh was exist");
      }, 1000);

      console.log("I got the last index", list.list1.getElement(list.list1.length-1));
   }, 2000);
});

// ===== Model Binding =====
var binding = null;
sf.model.for('model-binding', function(self, root){
   binding = self;

   setTimeout(function(){
      var self = root('model-binding');
      self.inputBinding1 = 'Two way binding';
      self.inputBinding2 = 123.321;
   }, 4000);

   self.onKeyUp = console.warn;

   self.bold = true;
   self.pink = false;
   self.inputBinding1 = '';
   self.inputBinding2 = '';
   self.inputBinding3 = false;
   self.inputBinding4 = '';
   self.m2v$inputBinding4 = function(old, news){
      console.warn("inputBinding4 (Model -> View)", old, news);
   };
   self.v2m$inputBinding4 = function(old, news){
      console.log("inputBinding4 (View -> Model) will be revert from:", news, 'to', old);
      setTimeout(function(){
         self.inputBinding4 = old;
         console.log("Reverted");
      }, 4000);
   };
   self.inputBinding5 = [];
   self.out$inputBinding2 = function(old, news){
      console.warn("inputBinding2 was modified from:", news, 'to', Math.round(news));
      return Math.round(news);
   };
   self.inputBinding6a = [
      {text:'Select 1', val:1},
      {text:'Select 2', val:2},
      {text:'Select 3', val:3},
   ];
   setTimeout(function(){
      self.inputBinding6a.push({text:'Select 4', val:4});
   }, 5000);
   self.inputBinding6 = '';
   self.on$inputBinding6 = function(old, news){
      console.warn("inputBinding6 was updated from:", old, 'to', news);
   };
   self.inputBinding7 = '';
   self.showHTML = false;
   self.prefix = 'i -> ';
   self.stuff = '(text from the model)';
   self.stuffes = ' and stuff';
   self.vuln = "{{self.vul}}{{@exec console.error('something not gud')}}";
   self.vul = "this musn't being visible";
   setTimeout(function(){sf.model.init(reinit)}, 1000);
});
sf.controller.for('model-binding', function(self, root){
   var list = root('virtual-scroll');
   if(list.list1 === undefined)
      console.error("Can't get other model scope variable");

   setTimeout(function(){
      self.inputBinding3 = true;
      self.inputBinding4 = 'radio1';
      self.inputBinding5 = self.inputBinding6 = 1;
      self.bold = false;
      self.pink = true;
   }, 3000);

   setTimeout(function(){
      self.inputBinding3 = 'check1';
      self.inputBinding4 = 'radio2';
      self.inputBinding5 = self.inputBinding6 = 3;
   }, 6000);

   setTimeout(function(){
      self.inputBinding3 = ['check2'];
      self.inputBinding4 = 'radio1';
      self.inputBinding5 = [1, 2];
      self.bold = true;
      self.pink = false;
   }, 8000);

   self.addition = function(a, b){
      return a + b;
   }
});

sf.model.for('components', function(self){
   self.items = [1,2,3];
   self.init = function(){
      console.log("Model init called", self.$el);
   }
   self.clickOK = function(){
      console.warn("Click OK!");
      self.items.push(self.items.length+1);
   }
});

sf.controller.for('comp-test', function(self, root, item){
   console.warn('comp-test', item, self.$el);
   self.init = function(){
      console.warn("Component init called");
   }
});

sf.component.for('comp-test', function(self, root, item){
   self.item = item;
   self.tries = [1,2,3];
   self.data = 'zxc';
});

sf.component.html('comp-test', `<div>1. {{ data }}</div>
   <input type="text" sf-bind="data"/>
   <div><span sf-repeat-this="num in tries">{{#num}},</span></div>
   <div>item: {{ item }}</div>
<br>`);

sf(function(){
   var elem2 = new $CompTest('from javascript');
   components.appendChild(elem2);
});

sf(function(){return;
   var testElement = document.getElementById('test');
   if(sf.controller.modelName(testElement) !== 'model-binding')
      console.error("Can't obtain correct 'modelName'");

   sf.controller.modelScope(testElement, function(self){
      if(!self.addition)
         console.error("Can't access model scope with 'modelScope' function");
   });
});

// ===== Dynamic Loader =====

var loaderWorking = false;
sf.loader.onProgress(function(loadedContent, totalContent){
   console.log(loadedContent+ ' of ' +totalContent+ ' was loaded');
});

sf.loader.onFinish(function(){
   loaderWorking = true;
   if(typeof assetloader === 'undefined')
      console.error("External script loaded by sf.loader is not executed");
});

setTimeout(function(){
   if(loaderWorking === false)
      console.error("'sf.loader.onFinish' was not being called");
}, 5000);

sf.loader.css(['/tests/test_loader.css']);
sf.loader.js(['/tests/test_loader.js']);

// ===== Router =====

var views = new sf.views('custom-view');
views.maxCache = 100;
views.addRoute([
   {
      path:'/test/page1',
      url:'/test/page1',

      'nested-view':[
         {
            path:'/:nest',
            beforeRoute:function(data){
               this.url = '/test/lv1/'+data.nest
            },

            'nested2-view':[
               {
                  path:'/:nest',
                  beforeRoute:function(data){
                     this.url = '/test/lv2/'+data.nest
                  }
               }
            ]
         }
      ]
   },{
      path:'/test/page2',
      url:'/test/page2',

      'nested-view':[
         {
            path:'/:nest',
            beforeRoute:function(data){
               this.url = '/test/lv1/'+data.nest
            },

            'nested2-view':[
               {
                  path:'/:nest',
                  beforeRoute:function(data){
                     this.url = '/test/lv2/'+data.nest
                  }
               }
            ]
         }
      ]
   }
]);

sf.model.for('test-page1', function(self){
   self.text = "Hello from page 1";
});

sf.model.for('test-page1-nest1', function(self){
   self.text = "Hello from nest 1";
});

sf.model.for('test-page1-nest2', function(self){
   self.text = "Hello from nest 2";
});

sf.model.for('test-page2', function(self){
   self.text = "Hello from page 2";
});

views.on('routeStart', function(current, target) {
    console.log("Loading path to " + target);
});
views.on('routeFinish', function(current, target) {
    console.log("Navigated from " + current + " to " + target);
});
views.on('routeError', function(e) {
    console.error("Navigation failed", e);
});
// views.on('routeData', function(obj){
//    if(obj.title) sf.dom.findOne('head > title').innerHTML = obj.title;
// });

setTimeout(function(){
   var a = sf.model.queuePreprocess(document.body)
   console.log("Trying to reinit", a.length, "element (must be 0)");
   sf.model.parsePreprocess(a);
}, 10000);