<a href="https://www.patreon.com/stefansarya"><img src="http://anisics.stream/assets/img/support-badge.png" height="20"></a>

[![Written by](https://img.shields.io/badge/Written%20by-ScarletsFiction-%231e87ff.svg)](LICENSE)
[![Software License](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)
[![Tweet](https://img.shields.io/twitter/url/http/shields.io.svg?style=social)](https://twitter.com/intent/tweet?text=ScarletsFrame%20is%20frontend%20library%20that%20can%20help%20simplify%20your%20code.&url=https://github.com/ScarletsFiction/ScarletsFrame&via=github&hashtags=scarletsframe,browser,framework,library,mvw)

# ScarletsFrame
A frontend library for Scarlets Framework that support lazy page load and element binding that can help simplify your code.

# Example
- [Todo Application](https://playcode.io/134963?tabs=console&model.js&output)
- [Simple Element Binding](https://jsbin.com/liluhul/edit?js,console,output)
- [Virtual Scroll](https://playcode.io/224164?tabs=model.js&output)
- [Complex DOM](https://jsbin.com/zunebuj/edit?html,js,output)

## Install with CDN link
You can download minified js from this repository or use this CDN link
`<script type="text/javascript" src='https://unpkg.com/scarletsframe@latest/dist/scarletsframe.min.js'></script>`

## Install with NPM
`npm i scarletsframe`

And include it on your project
```js
let sf = require('scarletsframe');

sf.model.for('things', (self, root) => {
  ...
});
```

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

Model and controller will be start after content loader was finished. But if you don't use this feature, you need to turn it off with
```js
sf.loader.off();
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
sf.router.before('todo/page', function(root){
    // Data Re-initialization
    var self = root('todo.page'); // sf.model.root['todo.page']
});
```

Define event listener when element with attributes `sf-page="todo/page"` is going to be removed from DOM.
```js
sf.router.after('todo/page', function(root){
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

When you're using router, every click on an element with link or `href` will trigger the router feature. And the whole HTML `body` content will be changed. But if you only want to change specific content, you should define the default view point.

```html
<custom-view></custom-view>
<script>
  sf.router.lazyViewPoint["@default"] = 'custom-view';
</script>

<a href="/todo/page">Go to todo page</a>
<a href="/todo/page" sf-router-ignore>Default page load</a>

```

### Controller
Controller is used for controling your model, so this would have a list of your static function.

Get controller name for the selected element node
```html
<div sf-controller="something">
  <span id="username"></span>
</div>
```

Get current controller name for the selected element node
```js
sf.controller.modelName($('#username')[0]) // return == 'something'
```

Get model scope for the selected element node
```js
sf.controller.modelScope($('#username')[0], function(obj){
    // obj == sf.model.root['something']
})
```

#### Initialize controller
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
    {[ <html_content> ]}
}}
```

As a replacement for `<script>` tag. You can also output html by wrap it inside '{[ ... ]}'.
`{{@exec javascript stuff}}`
All model variable or function can be referenced to the execution scope.
For security reason, unrecognized function call will prevent template execution.
This feature is supposed for simple execution, but if you have complex execution it's better to define it as a function on the controller.
Make sure you write in ES5 because 
```html
<div sf-controller="something">
  <span>{{@exec
      for(var i = 0; i < 5; i++){
        {[ <label>i -> {{ i }}</label> ]}
      }

      // alert("Finished"); // Illegal global invocation
      myAlert('Finished');

      {[ <br> ]}

      // Below will displaying the data without escaping the html
      // Don't use this if you don't know how to secure your code
      @return number.join(',');
    }}</span>
</div>
```
```js
sf.model.for('something', function(self, other){
  self.number = [1, 2, 3, 4, 5];
});

sf.controller.for('something', function(self){
  // self.myAlert = window.alert; // Illegal scope invocation
  self.myAlert = function(msg){
    window.alert(msg)
  };
});
```

And the HTML output content will be escaped like below
```html
<div sf-controller="something">
  <span>
    <label>i -&gt; 0</label>
    <label>i -&gt; 1</label>
    <label>i -&gt; 2</label>
    <label>i -&gt; 3</label>
    <label>i -&gt; 4</label>
    <br> 1,2,3,4,5
  </span>
</div>
```

#### Initialize/Define Model
Let's start with this simple element
```html
<div sf-controller="something">
  <span>{{ text }}</span>
</div>
```
```js
sf.model.for('something', function(self, other){
  // `text` on the DOM element will be filled with `My Name`
  self.text = 'My Name';
});

// Controller will be executed after the model was initialized
sf.controller.for('something', function(self, other){
  // If you want to get reference from other model scope
  var greet = other('another-thing').stuff;
  greet === sf.model('another-thing').stuff;
});

sf.model.for('another-thing', function(self, other){
  self.stuff = 'Hello world';
});
```

### Array data to list of DOM element
Any element with `sf-repeat-this` will be binded with the array condition on the model. If you `push` or `splice` the array data, then the element will also being modified.

These addional feature can be used after DOM element was binded.
#### hardRefresh
Redraw all element at once
```js
myArray.hardRefresh();
```

#### softRefresh
Redraw some element only. The length can be passed with negative number to select from the last index.
```js
myArray.softRefresh(index, length);
```

#### swap
Swap 2 array value and the related element without rebuild the element nodes.
```js
myArray.swap(fromIndex, toIndex);
```

#### move
Move some array value and the related element without rebuild the element nodes.
```js
myArray.move(fromIndex, toIndex[, length]);
```

#### getElement
Get the DOM element of the selected index
```js
myArray.getElement(index);
```

Open the model scope for the selected controller for modification.
```js
sf.model.for('music.feedback', function(self, root){
    self.reviews = [{
      name:"Aliz Feriana",
      date:"January 17",
      rate:4,
      ...
    }];

    // If you want to refer other model scope
    self.users = root('user.info'); // sf.model.root['user.info'];

    // Register event when 'reviews' was modified
    self.on$reviews = {
       remove:function(elem, remove){
          sf.dom.animateCSS(elem, 'bounceOutLeft', function(){
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

### Virtual Scroll
To activate virtual scroll mode on your list of element. You need to add `sf-virtual-list` on the parent element. But if you have dynamic/different row height, then you also need to add `sf-list-dynamic`.
When you are using a scroller that located on a parent element, you should define the parent index `scroll-parent-index="1"` on the element attribute.
If you think you need to update the content on the bottom more early, you could reduce the bottom scroll bounding with `scroll-reduce-floor="112"` in pixels.
```html
<ul class='sf-virtual-list'>
  <li sf-repeat-this="x in list">
    <label>{{x.text}</label>
  </li>
</ul>
```
```js
// Example model for data above
sf.model.for('example', function(self){
  self.list = [{
    text:'Hello'
  },{
    text:'world'
  }, ...];
});
```

Because chrome has scroll anchoring feature, you may need to use [scrollbar library](https://github.com/Grsmto/simplebar) to avoid scroll jump when scrolling with chrome scrollbar.

### Available method for virtual scrolling
#### Obtain all DOM elements
Elements on the virtual DOM will be combined with visible DOM element and return array of element that have the same index with the actual data.
```js
// This will return array of elements
var elements = self.list.$virtual.elements();

// You could also wrap it to jQuery
var $elem = $(elements);
```

#### Scroll to or get element offset by the index
```js
// Instantly scroll to 3rd element
self.list.$virtual.scrollTo(8);

// Recalculate scroll bounding
self.list.$virtual.refresh();

// This will be available on static element height
// Get an offset that can be used for `scrollTop`
var offsetTop = self.list.$virtual.offsetTo(8);
```

### Two-way data binding
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

<!-- 'myInput' on the model will be updated if input detected -->
<input sf-bound="myInput" type="text" />
```
```js
// Model for the above example
sf.model.for('example', function(self){
  // Any changes to this variable will change the 1st and 3rd element
  self.id = 2;

  // Any changes to this variable will change the 2nd and 3rd element
  self.content = 'Hello world';

  // Any input on 4th element will update this variable content
  self.myInput = '';
});
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
