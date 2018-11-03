<a href="https://www.patreon.com/stefansarya"><img src="http://anisics.stream/assets/img/support-badge.png" height="20"></a>

[![Written by](https://img.shields.io/badge/Written%20by-ScarletsFiction-%231e87ff.svg)](LICENSE)
[![Software License](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)
[![Tweet](https://img.shields.io/twitter/url/http/shields.io.svg?style=social)](https://twitter.com/intent/tweet?text=ScarletsFrame%20is%20frontend%20library%20that%20can%20help%20simplify%20your%20code.&url=https://github.com/ScarletsFiction/ScarletsFrame&via=github&hashtags=scarletsframe,browser,framework,library,mvw)

# ScarletsFrame
A frontend library for Scarlets Framework that support lazy page load and element binding that can help simplify your code.

# Example
- [Todo Application](https://playcode.io/134963?tabs=console&resource-loader.js&output)
- [Simple Element Binding](https://jsbin.com/liluhul/1/edit?js,console,output)

## Install
You can download minified js from this repository or use this CDN link
`<script type="text/javascript" src='https://cdn.jsdelivr.net/gh/ScarletsFiction/ScarletsFrame@latest/dist/scarletsframe.min.js'></script>`

Make sure you put it on html header after jQuery.

## How to use
After this library was initialized, you could access `sf` from global scope.

When you're passing a function to `sf`, it will be executed after all DOM content / Asset Loader was finished loading.

```js
sf(function(){
    console.log("All set!");
});
```

### Asset Loader

If you run this on the html body, you will see style changes when loading. So it would be better if you hide the html content then display it after everything completed.
```js
sf.loader.css([
   'css/animate.min.css'
]);

```

When you load your script, make sure you loaded the controller first then the router or model.
```js
sf.loader.js([
   'app/controller.js', // Load controller first
   'app/router.js',
], 'body');

```

This function can help you track the total and loaded content. But sometime the content are cached by the browser and it couldn't be monitored as loaded content.
```js
sf.loader.onProgress(function(loadedContent, totalContent){
   console.log(loadedContent+ ' of ' +totalContent+ ' was loaded');
});

```

After the loading complete, this function will be triggered before all `sf(function(){})` will be called.
```js
sf.loader.onFinish(function(){
   console.log("All content was loaded from internet or cache");
});

```

### Router
This currently unfinished yet, but you can still use it.

Enable lazy router feature
```js
sf.router.enable(status = true);
```

After enabling the LazyRouter, normally all href attribute will be registered.
But you can also route by calling `sf.router.goto` function from the script.
```js
sf.router.goto('/user/home', data = {}, method = 'get');
```

Define event listener when element with attributes `sf-page="todo/page"` was loaded to current DOM. The defined event will being called after all model and controller was finished.
```js
sf.router.before('todo/page', function(ModelRoot){
    // Data Re-initialization
    var self = ModelRoot['todo.page']; // sf.model.root['todo.page']
});
```

Define event listener when element with attributes `sf-page="todo/page"` is going to be removed from DOM.
```js
sf.router.after('todo/page', function(ModelRoot){
    // Data cleanup
});
```

Here you can listen if any page was loaded, loading, or load error
```js
sf.router.on('loading', function(target) {
    console.log("Loading path to " + target);
});
sf.router.on('loaded', function(current, target) {
    console.log("Navigated from " + current + " to " + target);
});
sf.router.on('error', function(e) {
    console.log("Navigation failed", e);
});
```

### Controller
Controller is used for controling your model, so this would have a list of your static function.

Get controller name for the selected element node
```html
<div sf-controller="something">
  <span id="username"></span>
</div>
```
```js
sf.controller.modelName($('#username')[0]) // return == 'something'
```

Get model scope for the selected element node
```js
sf.controller.modelScope($('#username')[0], function(obj){
    // obj == sf.model.root['something']
})
```

Register controller when initialization.<br>
You should use this for defining static function for your controller only.<br>
This will run on first page load and can't be called twice.
```js
sf.controller.for(name, function(self){
    self.myFunction = function(){
        return true;
    }
});
```

This is where you put your logic to control after the model was loaded and the controller was initialized. This function can be called more than once before the router invoke the `before` event and after the page was contain the matched `sf-controller` attribute. If the attribute was not found, then it will not be executed.
```js
sf.controller.run(name, function(self){
    var time = Date.now();

    if(self.myFunction()){
        alert('Hello world!');
    }
});
```

### Model & Template feature
When you're using template on html, function call will be removed for security reason.

Get data from current controller's model scope
`{{ model.variable }}`

Conditional template
```html
{{@if model.view === true :
    {[ <html_content>]}
}}
```

Replacement for `<script>` tag. You can also output html by wrap it inside '{[ ... ]}'
`{{@exec javascript stuff}}`
For security reason, unrecognized function call will prevent template execution. The recognized function is only from the model scope itself.

Any element with `sf-repeat-this` will be binded with the array condition on the model. If you push or splice the array data, then the element will also being modified.

Open the model scope for the selected controller for modification.
```js
sf.model.for('music.feedback', function(self, root){
    self.reviews = [{
      name:"Aliz Feriana",
      date:"January 17",
      rate:4,
      ...
    }];
    // After reviews was binded and want to redraw the element
    // You can use
    // '.hardRefresh()' redraw all element at once
    // '.softRefresh(index = -1)' redraw some element only

    // If you want to refer other model scope
    self.users = root['user.info']; // sf.model.root['user.info'];

    // Register event when 'reviews' was modified
    self.on$reviews = {
       remove:function(elem, remove){
          $(elem).animateCSS('bounceOutLeft', function(){
             remove(); // Remove the element
          });
       },
       update:function(elem){},
       create:function(elem){}
    };
});
```
```html
<body sf-controller="music.feedback">
  <!-- Model scope for music.feedback -->

  <div sf-repeat-this="x in reviews" class='review' id='review{{x.id}}'>
    <img style='height: 65px;' data-src='{{x.profilePicture}}' alt='picture'>
    <h5>{{x.name}} - {{x.date}}
    {{@if(x.owner)
      <a sf-click='delete("review")' style='cursor:pointer;color:#6b6b6b;'>Delete</a>
    }}
    </h5>
    <ul class='stars'>{{@exec
      for(var i = 1; i <= 5; i++){
        if(i <= x.rate){
          {[<li class='active'><i class='icon-star'></i></li>]}
        }
        else{
          {[<li><i class='icon-star-empty'></i></li>]}
        }
      }
    }}</ul>
    <p class='review-comment'>{{x.content}}</p>
  </div>
</body>
```

Bind the element for html, attr, or all
```js
sf.model.bindElement(elementNode, which = false)
```

You could also automatically bind element by using `sf-bind` attribute
```html
<!-- Bind Attributes only (model.id)-->
<div sf-bind="attr" class='review' id='review{{id}}'></div>

<!-- Bind Inner HTML only (model.content) -->
<div sf-bind="html">{{ content }}</div>

<!-- Bind Attribute and Inner HTML -->
<div sf-bind="" id='review{{id}}'>{{ content }}</div>
```

Find processable template from DOM and mark them for preprocess queue. Followed by calling `parsePreprocess` to process the queued DOM.
```js
sf.model.queuePreprocess(targetNode = false)
```

Process the template queue and bind the element if it's bindable.
```js
sf.model.parsePreprocess(targetNode = false)
```

## Contribution
If you want to help in ScarletsFrame please fork this project and edit on your repository, then make a pull request to here. Otherwise, you can help with donation via [patreon](https://www.patreon.com/stefansarya).

Keep the code simple and clear.

## License
ScarletsFrame is under the MIT license.

But don't forget to put the a link to this repository.
