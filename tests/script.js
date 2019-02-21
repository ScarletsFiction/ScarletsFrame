// ===== Virtual List =====

var test = null;
sf.model.for('virtual-scroll', function(self, root){
   test = self;

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
});

sf(function(){
   var list = sf.model('virtual-scroll');

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
// return;

      // Reuse element from the middle
      setTimeout(function(){
         console.log("Item: 21-23, 31-35");
         list.list2 = list.list2b.slice(20, 23).concat(list.list2b.slice(30, 35));
      }, 8000);

      // Variable height for list2
      setTimeout(function(){
         list.list2 = list.list2b;
// return;

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
      list.list1.unshift({id:"I'm inserted on first index"});
      list.list1.splice(3, 1); // remove index 3 (item-3)
      list.list1.splice(5, 0, {id:"The removed item above is 'item-3'"}); // add as index 5
      list.list1.push({id:"I'm inserted on last index"});

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

sf.model.for('model-binding', function(self, root){
   self.inputBinding = '';
   self.inputBinding2 = '';
   self.showHTML = false;
   self.prefix = 'i -> ';
   self.stuff = '(text from the model)';
});
sf.controller.for('model-binding', function(self, root){
   var list = root('virtual-scroll');
   if(list.list1 === undefined)
      console.error("Can't get other model scope variable");

   self.addition = function(a, b){
      return a + b;
   }
});

sf.controller.run('dummy', function(self, root){
   if(!root('model-binding').addition)
      console.error("Can't get other model scope function");
});

var testElement = document.getElementById('test');
if(sf.controller.modelName(testElement) !== 'model-binding')
   console.error("Can't obtain correct 'modelName'");

sf(function(){
   sf.controller.modelScope(testElement, function(self){
      if(!self.addition)
         console.error("Can't access model scope with 'modelScope' function");
   });
});

// Simulate model binding on dynamic page load
sf.router.before('test/page2', function(root){
   var self = root('model-binding');
   self.inputBinding = 'Two way binding';
   self.inputBinding2 = 'One way binding';
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

var routerOk = false;
sf.router.enable();
sf.router.lazyViewPoint["@default"] = 'custom-view';

sf.model.for('test-page1', function(self){
   self.text = "Hello from page 1";
});

sf.model.for('test-page2', function(self){
   self.text = "Hello from page 2";
});

sf.router.before('test/page1', function(root){
    console.log("Page 1 is being loaded");
    routerOk = routerOk && true;
});

var page2Loaded = false;
sf.router.before('test/page2', function(root){
   console.log("Page 2 was loaded");
   if(page2Loaded === true)
   	console.error("Page 2 loaded 2 times");

   page2Loaded = true;
   setTimeout(function(){
   	sf.router.goto('/test/page1', {}, 'get');
   }, 10);
});

sf.router.after('test/page2', function(root){
    console.log("Page 2 is being removed");
    routerOk = true;
});

setTimeout(function(){
   if(!routerOk)
      console.error("Router 'after' or 'before' was not called");
}, 10000);

setTimeout(function(){
   sf.router.goto('/test/page2', {}, 'get'); // This will be canceled
   sf.router.goto('/test/page2', {}, 'get');
}, 3000);

sf.router.on('loading', function(target) {
    console.log("Loading path to " + target);
});
sf.router.on('loaded', function(current, target) {
    console.log("Navigated from " + current + " to " + target);

    if(target === '/test/page1'){
       history.pushState(null, '', '/');
       console.log('Address bar was restored to initial');
    }
});
sf.router.on('error', function(e) {
    console.error("Navigation failed", e);
});
sf.router.on('special', function(obj){
   if(obj.title) sf.dom.findOne('head > title').innerHTML = obj.title;
});