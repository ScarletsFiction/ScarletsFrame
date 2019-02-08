var scope = null;
// Type on the console:
// scope.list.push({text:'Hello world'});
// scope.todayMessage = "What's up 😜";

sf.model.for('todo-app', function(self){
  self.todayMessage = 'Greetings 😜';
  self.list = [];
  
  // Copy reference to global
  scope = self;
  
  // Listener when 'list' was changed 
  self.on$list = {
    remove:function(elem, remove){
      sf.dom.animateCSS(elem, 'bounceOutLeft', function(){
         remove();
      });
    },
    create:function(elem){
       sf.dom.animateCSS(elem, 'flipInX');
    }
  };
});

// When controller found on DOM
sf.controller.run('todo-app', function(self){
  self.list.push({text:"Heya all"});
});

// Skip content loader and run every model and the controller
sf.loader.off();