var $ = sf.dom;
var vul = '';

// This framework is vulnerable if any alert displayed
// or console.error is being outputted
if(0){
   vul = '\'\"><script id="vull">alert("Heya")</script>{{@exec console.error("Vulnerablility detected!", _modelScope.$el[0]) }}<a z=\'\"';

   var ckz = 0;
   var checkz = setInterval(function(){
      if($('#vull').length)
         alert("Vulnerability found!");

      if(ckz++ > 100){
         console.log("Vulnerability check finished");
         clearInterval(checkz);
      }
   }, 200);
}

sf.model.for('image', function(self, root){
   self.trans = "translate(0)";

   var x=0, y=0;
   self.dragmove = function(ev){
      // console.log('dragmove called', ev);
      self.trans = 'translate('+(x += ev.movementX)+'px, '+(y += ev.movementY)+'px)';
   }

   var scale = 1;
   var angle = 0;
   self.gesture = function(dummy, ev){
      scale += ev.scale;
      angle += ev.angle;

      // console.log('gesture called');
      self.trans = 'scale('+scale+') rotate('+angle+'deg)';
   }

   self.taphold = function(el, ev){
      console.log('taphold called', el, ev);
   }
});

// ===== Virtual List =====

var test = null;
sf.model.for('virtual-scroll', function(self, root){
   test = self;

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
         console.log("Scroll hit floor");

         // Test infinity load for static scroll
         if(added === false){
            added = true;
            self.list1.push({id:"Added on scroll end - 1"+vul}, {id:"Added on scroll end - 2"}, {id:"Added on scroll end - 3"});
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
               return console.error("Vulnerability detected", list.list1.getElement(0));
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
         if(!list.list1.getElement(7).dummy) console.error("Data on partial refresh was missing", list.list1[7]);
         if(list.list1.getElement(8).dummy) console.error("Data on element refresh was exist", list.list1[8]);
      }, 500);

      console.log("I got the last index", list.list1.getElement(list.list1.length-1));
   }, 2000);
});

// ===== Model Binding =====
var binding = null;
sf.model.for('model-binding', function(self, root){
   binding = self;

   setTimeout(function(){
      var self = root('model-binding');
      self.inputBinding1 = 'Two way binding'+vul;
      self.inputBinding2 = 123.321+vul;
   }, 4000);

   self.onKeyUp = console.warn;

   self.bold = true;
   self.pink = false;
   self.inputBinding1 = ''+vul;
   self.inputBinding2 = ''+vul;
   self.inputBinding3 = vul;
   self.inputBinding4 = ''+vul;
   self.m2v$inputBinding4 = function(old, news){
      console.warn("inputBinding4 (Model -> View)", old, news);
   };
   self.v2m$inputBinding4 = function(old, news){
      console.log("inputBinding4 (View -> Model) will be revert from:", news, 'to', old);
      setTimeout(function(){
         self.inputBinding4 = old+vul;
         console.log("Reverted");
      }, 4000);
   };
   self.inputBinding5 = [];
   self.out$inputBinding2 = function(old, news){
      console.warn("inputBinding2 was modified from:", news, 'to', Math.round(news));
      return Math.round(news);
   };

   self.inputBinding8 = '';
   self.v2m$inputBinding8 = function(old, news){
      sf.lang.changeDefault(news);
   }


   self.text = 'main model';
   self.inputBinding6a = [
      {text:'Select 1'+vul, value:1+vul},
      {text:'Select 2'+vul, value:2+vul},
      {text:'Select 3'+vul, value:3+vul},
   ];
   setTimeout(function(){
      self.inputBinding6a.push({text:'Select 4'+vul, val:4+vul});
   }, 5000);
   self.inputBinding6 = '';
   self.on$inputBinding6 = function(old, news){
      console.warn("inputBinding6 was updated from:", old, 'to', news);
   };
   self.inputBinding7 = ''+vul;
   self.showHTML = false;
   self.prefix = 'i -> '+vul;
   self.stuff = '(text from the model)'+vul;
   self.stuffes = ' and stuff'+vul;
   self.vuln = "{{self.vul}}{{@exec console.error('something not gud')}}"+vul;
   self.vul = "this musn't being visible"+vul;
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
   self.items = [1];
   self.test = 'this must getting changed'+vul;
   self.handleClick = function(e){
      console.log('element click', e.target);
   }
   self.init = function(){
      console.log("Model init called", self.$el);

      setTimeout(function(){
         self.test = 'OK'+vul;
         if(self.$el('#nyam').attr('test') !== 'OK'+vul)
            console.error("Attribute is not changed", self.$el('#nyam')[0]);
      }, 1000);
   }
   self.clickOK = function(){
      console.warn("Click OK!");
      self.items.push(self.items.length+1);
   }
});

sf.controller.for('comp-test', function(self, root, item){
   console.warn('comp-test', item, self.$el[0]);
   self.init = function(){
      console.warn("Component init called", self, self.tries.constructor !== Array && self.tries.getElement(0));
   }
});

sf.component.for('comp-test', function(self, root, item){
   self.item = item;
   self.tries = [1,2,3+vul];
   self.data = 'zxc'+vul;
   self.select = function(zx){
      console.log('selected', zx);

      self.tries[self.tries.indexOf(zx)] += zx;
      self.tries.hardRefresh();
   }
});

sf.component.html('comp-test', '<div sf-lang="translated">1. translated {{ data }}</div>\
   <input type="text" sf-bind="data"/>\
   <div class="sf-virtual-list"><span sf-repeat-this="num in tries"><a @click="select(#num)">{{#num}}</a>,</span></div>\
   <div>item: {{ item }}</div>\
<br>');

sf(function(){
   var elem2 = new $CompTest('from javascript');
   components.appendChild(elem2);
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