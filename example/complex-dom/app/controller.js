sf.model.for('myList', function(self){
  self.message = "Looks simple or complex?";
  self.list = [{i:0, type:"Timer"}];
  // self.on$list = {};
});

var myList = sf.model('myList');

// ==== Change data after some interval ====

// Run when all resource was loaded
sf(function(){
  setInterval(function(){
    myList.list[0].i++;

    // Refresh the element for the first index
    myList.list.refresh(0);
  }, 1000);

  setInterval(function(){
    var i = myList.list.length;
    myList.list.push({
      i:i,
      type:"Hello"
    });

    // Refresh index 2 until last index - 1
    // And force refresh any element related with 'last' property
    myList.list.refresh(1, -1, 'last'); // (index, length, property)

    if(i > 3)
      myList.list.splice(1, 1);
  }, 3000);
});

// ==== Handle the animation when data changes ====

// Listener when the 'self.list' was changed 
myList.on$list = {
  // On element remove
  remove:function(elem, remove){
    sf.dom.animateCSS(elem, 'bounceOutLeft', function(){
      remove();
    }, 1.3);
  },

  // On update
  update:function(elem, type){
    if(elem.model.type === 'Hello')
      return;

    sf.dom.animateCSS(elem, 'bounce', null, 0.5);
  },

  // On create
  create:function(elem){
    sf.dom.animateCSS(elem, 'flipInX', null, 1);
  }
};

// Skip content loader and run every model and the controller
sf.loader.off();