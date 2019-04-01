<a href="https://www.patreon.com/stefansarya"><img src="http://anisics.stream/assets/img/support-badge.png" height="20"></a>

[![Written by](https://img.shields.io/badge/Written%20by-ScarletsFiction-%231e87ff.svg)](LICENSE)
[![Software License](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)
[![Tweet](https://img.shields.io/twitter/url/http/shields.io.svg?style=social)](https://twitter.com/intent/tweet?text=ScarletsFrame%20is%20frontend%20library%20that%20can%20help%20simplify%20your%20code.&url=https://github.com/ScarletsFiction/ScarletsFrame&via=github&hashtags=scarletsframe,browser,framework,library,mvw)

# ScarletsFrame
A frontend library for Scarlets Framework that support lazy page load and element binding that can help simplify your code.

# Example
- [Todo Application](https://playcode.io/134963?tabs=console&model.js&output)
- [Simple Element Binding](https://jsbin.com/liluhul/edit?js,console,output)
- [Simple Component](https://jsbin.com/guwevis/edit?html,js,console,output)
- [Virtual Scroll](https://playcode.io/224164?tabs=model.js&output)
- [Complex DOM](https://jsbin.com/zunebuj/edit?html,js,output)
- [Input Elements](https://jsbin.com/toripov/edit?js,console,output)
- [State Listener](https://jsbin.com/qohifel/edit?html,js,output)

## Install with CDN link
You can download minified js from this repository or use this CDN link
```html
<script type="text/javascript" src='https://unpkg.com/scarletsframe@latest/dist/scarletsframe.min.js'></script>
```

If you have separated files for the model and controllers, you can use this library's `gulpfile.js` to combine and compile your js files. To obtain fast compilation in development environment, you can deactivate uglify/minify/babel in `gulpfile.js`.

## Install with NPM
```sh
$ npm i scarletsframe
```

And include it on your project with webpack or browserify.
```js
const sf = require('scarletsframe');

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
  @elseif model.view === undefined:
    model.data.splice(0);
  @else:
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

### Safely replace HTML text that already binded.
This will help you to replace text on HTML content depend on the model data. But this will not change the model data.
```html
<div sf-controller="something">
  <span>*One hundred* is &gt; my age</span>
</div>
```
```js
// Inside 'something' model scope
self.$replace('text', /\*(.*?)\*/g, function(full, word){
  return '<b>'+word+'</b>';
});

// If you want to use this feature for array data
// you can also use the above function from the array
// self.list.$replace(index, key, needle, replacement);
```

### Array data to list of DOM element
Any element with `sf-repeat-this` will be binded with the array condition on the model. If you `push` or `splice` the array data, then the element will also being modified.

These addional feature can be used after DOM element was binded.
#### refresh
Redraw small changes to an element. The `length` can be passed with negative number to select from the last index. If `index` or `length` was not defined, it will check any changes of the model.
```js
myArray.refresh(index = 0, length = 1);
```
```html
<li sf-repeat-this="x in list">
  {{ x.cartID }} - {{ x.item + ' (' + list.shopName + ')' }}
</li>
```

When you make changes into `x.cartID`, `x.item`, and call the refresh function it the related element will be updated. But if you make changes to different scope like `list.shopName`, you need to provide which `itemProperty` that related with the key. For the example above `list.shopName` was related with `x.item`, so we can call the refresh like below.
```js
// myArray.refresh('item');
// myArray.refresh(index, 'item');
myArray.refresh(index, length, 'item');
```

#### softRefresh
Rebuild element for the model. If `index` or `length` was not defined, it will rebuild all element.
```js
myArray.softRefresh(index = 0, length = 1);
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

          // Avoid element remove before animation finished
          return true;
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

### Views and Model data binding
Every element that built from a template will have one-way data binding. Even it's defined in attributes or innerHTML. To deactivate the feature you need to specify `sf-bind-ignore` on the parent attributes.
```html
<div sf-bind-ignore>{{ myStatic }}</div>
```

To enable two-way data binding with input element, you need to set model property in `sf-bound` attribute. When you need to obtain multiple value for `checkbox` or `select`, your model property should be an **Array** type. But if you like to check if the checkbox is `checked` or not, you need to set the model property as **Boolean** type. Using **String** data type will only return the last selected data.

```html
<!-- data on the model will be updated if input detected and vice versa -->
<input sf-bound="myInput" type="text" />
<textarea sf-bound="myText" type="text"></textarea>
<input sf-bound="myFiles" type="file" />
<input sf-bound="myRadio" type="radio" value="radio1" />
<input sf-bound="myRadio" type="radio" value="radio2" />

<!-- You can also set property in `name` attribute -->
<input name="myCheckbox" type="checkbox" value="check1" sf-bound />
<input name="myCheckbox" type="checkbox" value="check2" sf-bound />

<select sf-bound="selectInput" typedata="number">
   <option value="1">Select 1</option>
   <option value="2">Select 2</option>
   <option value="3">Select 3</option>
</select>

<select sf-bound="selectInput" multiple>
   <option value="{{ x.val }}" sf-repeat-this="x in selectData">
    {{ x.text }}
   </option>
</select>
```

To enable one-way data binding with input element, you need to define model property in `sf-bind` attribute.
```html
<!-- 'myInput' on the model will be updated if input detected -->
<!-- (View -> Model) -->
<input sf-bind="myInput" type="text" typedata="number"/>

<!-- input will be updated if 'myInput' on the model was changed -->
<!-- (Model -> Input) -->
<input value="{{myInput}}" type="text" />

<!-- You can also add prefixed value -->
<input value="It's {{myInput}}" type="text" />

<!-- When binding to `class` attribute you need to use `:class` -->
<span :class="icon-{{myInput || 'nothing'}}" style="font-size: {{myInput}}" />
```

```js
// Model for the above examples
sf.model.for('example', function(self){
  // Any input on element will update this content and the binded view
  self.myInput = 0;

  // Listen any changes before new value assigned to `myInput`
  // Useful if you want to process any changes
  self.on$myInput = function(oldValue, newValue){}

  // Listen changes (Model -> View)
  // Trigger only when the value is not being set from the View
  self.out$myInput = function(oldValue, newValue){}

  // Listen changes (Model -> View)
  // This can also being triggered when (View -> [Model -> View])
  self.m2v$myInput = function(oldValue, newValue){
    if(newValue > 100)
      return 100; // Force value for myInput
  }

  // Listen changes (View -> Model)
  // This will triggered on input/change event
  self.v2m$myInput = function(oldValue, newValue){
    console.log("Value will be reverted in 3s to oldValue");
    setTimeout(function(){
      self.myInput = oldValue;
    }, 3000);
  }
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

## Components
Components feature is used when you have many element for one model. Each component will have same structure but with different value.

```js
sf.component.for('model-name', function(self, root){
  self.data = "text";
});
```

After it's executed, it will be registered as an model component. And any `controller` will running in different scope on every new component.

If you already inserted the component to the DOM, you can create attach new component model for it.

```js
sf.component.new('model.name', element);
```

When new component are created to the element, it will trigger event that was registered.

```js
sf.component.event('model.name', function(scope, event){
  // scope.data === 'text'
  if(event === 'created');
  if(event === 'removed');
});
```

But if you want to create the element in the vDOM, you need to define the HTML content for the component and call `sf.component.new`.

```js
sf.component.html('model.name', `<div>{{ data }}</div>`);
var myElement = sf.component.new('model.name');
document.body.appendChild(myElement);
// myElement.model.data === 'text'
```

When you called `sf.model('model-name')`, it will return every component model scope as an array. But if you want to count how many component are created on the DOM, you can get the length of `sf.component.available`.

The model will be automatically removed after the element was deleted. Or you could also call `myElement.destroy()`.

## Contribution
If you want to help in ScarletsFrame please fork this project and edit on your repository, then make a pull request to here. Otherwise, you can help with donation via [patreon](https://www.patreon.com/stefansarya).

Keep the code simple and clear.

## License
ScarletsFrame is under the MIT license.

But don't forget to put the a link to this repository.
