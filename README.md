<a href='https://patreon.com/stefansarya'><img src='https://img.shields.io/endpoint.svg?url=https%3A%2F%2Fshieldsio-patreon.herokuapp.com%2Fstefansarya%2Fpledges&style=for-the-badge' height='20'></a>
[![Software License](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)
[![](https://data.jsdelivr.com/v1/package/npm/scarletsframe/badge)](https://www.jsdelivr.com/package/npm/scarletsframe)
[![Tweet](https://img.shields.io/twitter/url/http/shields.io.svg?style=social)](https://twitter.com/intent/tweet?text=ScarletsFrame%20is%20frontend%20library%20that%20can%20help%20simplify%20your%20code.&url=https://github.com/ScarletsFiction/ScarletsFrame&via=github&hashtags=scarletsframe,browser,framework,library,mvw)

# ScarletsFrame
A frontend framework that can help you write a simple web structure with complex feature. This framework have small memory allocation and allows you to directly write template in the HTML. [Here](https://rawgit.com/krausest/js-framework-benchmark/master/webdriver-ts-results/table.html) you can see the benchmark.

## Table of contents
 - [Example](#example)
 - [Install](#install-with-cdn-link)
 - [Hints](#hints)
 - [Asset Loader](#asset-loader)
 - [Router / Views](#router--views)
   - [Specify routes](#specify-routes)
   - [Views event](#views-event)
   - [Page cache](#set-page-view-cache)
   - [Page transition](#page-transition)
 - [Define Model](#initialize-define-model)
   - [Model & Template](#model--template-feature)
   - [Views and Model data binding](#views-and-model-data-binding)
 - [Controller](#controller)
 - [Virtual Scroll](#virtual-scroll)
 - [Components](#components)
 - [Language / Locale](#language--locale)
 - [Contribution](#contribution)
 - [License](#license)

## Example
- [Simple Element Binding](https://jsbin.com/liluhul/edit?js,console,output)
- [Simple Component](https://jsbin.com/guwevis/edit?html,js,console,output)
- [Input Elements](https://jsbin.com/toripov/edit?js,console,output)
- [State Listener](https://jsbin.com/qohifel/edit?html,js,output)
- [Shared Model](https://jsbin.com/xiyeron/edit?html,js,output)
- [Todo Application](https://playcode.io/134963?tabs=console&model.js&output)
- [Virtual Scroll](https://playcode.io/224164?tabs=model.js&output)
- [Complex DOM](https://jsbin.com/zunebuj/edit?html,js,output)
- [Views and Router](https://codesandbox.io/s/viewsrouter-example-1vbdh)
- [Language](https://jsbin.com/delayeb/edit?html,js,console,output)

## Install with CDN link
You can download minified js from this repository or use this CDN link
```html
<script src='https://cdn.jsdelivr.net/npm/scarletsframe@latest'></script>
```

This framework still being developed and may have breaking changes before the release, make sure you specify the version instead using `latest`. Please help the development of this framework >.<

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

These documentation may need to be redesigned. If you're developer that interested to help this framework, please visit some open issue to improve this or help by donate so this framework can have it's own website.

## Hints
After this library was initialized, you could access `sf` from global scope.

When you're passing a function to `sf`, it will be executed after all DOM content / Asset Loader was finished loading.

```js
sf(function(){
    console.log("All set!");
});
```

This framework also have `sf.dom` as jQuery's alternative that was optimized for [performance](https://jsbench.me/r6k09d2avk/1), memory friendly, and easily find your event listener from devtools.

```js
window.$ = sf.dom;
$('head title').html("Henlo");

// $.fn.extend = something;
```

`sf.dom` also has `animateKey` for trigger your CSS animation keyframe.

```js
$('.element').animateKey(name, duration, callback);
```

The `duration` is in seconds (numeric) and also can be the `callback` if you passed a function. `duration` can also being passed with object of:

| key | description |
|---|---|
| duration | The overall animation duration (seconds) |
| delay | Delay before starting the animation (seconds) |
| ease | [Animation playing speed variation](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timing-function) |
| fill | [Set initial style before animating](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-fill-mode) |
| visible | Does the element should be visible before animation start? |
| iteration | [Number of times for the animation cycles](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-iteration-count) |
| direction | [Set the animation to play backward or forward](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-direction) |

## Asset Loader
This feature is useful if you want to display progress bar and loading percentage before your page was fully loaded.

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

## Router / Views
Views is used when you want to load different template/page in current browser's tab. To initialize it you need to prepare the view element on the DOM, it also support lazy element that dynamically being loaded.

The view name is optional, if you doesn't give name it will be your real URL path. Instead if you give it the view name, you will get hashtag with the view path.

> This feature need some optimization

```js
// sf.views(selector, name);

// Path as main URL
var myMain = new sf.views('.my-selector');

// Path in hashtag
var myView = new sf.views('.my-selector', 'first');

// Hidden path
var viewOnly = new sf.views('.my-selector', false);
```

### Specify routes
Before the view can being used, you must specify the available routes.

```js
myView.addRoute([
  {
    path:'/',
    url:'/',
    cache:true, // Keep current page
    on:{
      coming:function(){
        console.log('henlo from / route');
      },
      leaving:function(){
        console.log('leaving from / route');
      },
    },
  },{
    path:'/login',
    url:'/login'
  },{
    // Dynamic path depend on the pattern
    path:'/about/:page',
    beforeRoute:function(data){
      this.url = '/about/static/'+data.page+'.html';
    },

    // Nested route
    routes:[
      {
        path:'/:id', //=> /about/:page/:id
        ...
      }
    ]
  },{
    // You can obtain username from routeFinish's event or myView.data
    path:'/:username',
    url:'/home',

    // Selector for the view, inside of .my-selector
    '.user-page-view':[{
      path:'/gallery',
      url:'/user/gallery'
    }]
  }
]);
```

These route will valid for your current tab, and can also being called like
```html
<a href="#first/about/profile">First view route</a>
<a href="/realpath#first/alex">First view with real path route</a>
<a href="@/browser/route">Native browser's route</a>
<a href="//www.google.com/">Change domain</a>
```

Multiple view path also supported by adding more hashtag and the view name, or adding the real URL. But you can also call the route by calling `myView.goto(path)`.

```js
myView.goto('/user/home', {/* 'GET' Data Field */}, method = 'GET');
```

### Views event
Here you can listen if any page was loaded, loading, or load error. 
```js
myView.on('routeStart', function(current, target) {
    console.log("Loading path to " + target);
});
myView.on('routeFinish', function(current, target) {
    console.log("Navigated from " + current + " to " + target);
});
myView.on('routeCached', function(current, target) {
    console.log("Using cached route to " + target);
});
myView.on('routeError', function(statusCode) {
    console.log("Navigation failed", statusCode);
});
```

After/when these event you can obtain the route data by using:
```js
// path:'/:username'
myView.data; // {username:'myself'}
```

### Set page view cache
This feature will cache the page view on the DOM and let it invisible.<br>
The default limit is set to 2 page view.
```js
myView.maxCache = 10;
```

### Model element collection
After any element with `<sf-model>` tag was inserted into DOM, the related model will have `$el` property that contains collection of `<sf-model>` elements. This also applies when using component (But only contain one element).

```js
sf.model.for('something', function(self){
  self.$el('#element').html("Route was finished");
  // self.$el.find('#element').html("Route was finished");
});
```

### Page transition
Because there are many design that can be implemented, this framework doesn't come with CSS styles. If you want to animate the page (like hiding/showing) within the script, you can use `routeStart` and `routeFinish/routeCached` above.

```css
/* Default style for all page */
sf-page-view{
  display: block;
  visibility: hidden;
  position: absolute;
  overflow: hidden;
  z-index: -1;
  width: 100%;
  height: 100%;
}

/* When page was displayed from cache/new page */
sf-page-view.page-current{
  visibility: visible;
  z-index: 1;
}

/* When page is being prepared but already inserted into DOM */
sf-page-view.page-prepare{
  display: none;
}
```

### Initialize/Define Model
Let's start with this simple element
```html
<sf-model name="something">
  <span>{{ text }}</span>
</sf-model>
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

Make sure you write in ES5 because browser doesn't use transpiler.
```html
<sf-model name="something">
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
</sf-model>
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
<sf-model name="something">
  <span>
    <label>i -&gt; 0</label>
    <label>i -&gt; 1</label>
    <label>i -&gt; 2</label>
    <label>i -&gt; 3</label>
    <label>i -&gt; 4</label>
    <br> 1,2,3,4,5
  </span>
</sf-model>
```

## Views and Model data binding
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
  // Returned value will assigned as new value
  self.on$myInput = function(oldValue, newValue){}

  // Listen changes (Model -> View)
  // Useful to avoid execution when new value was assigned from the view
  // Returned value will assigned as new value
  self.out$myInput = function(oldValue, newValue){}

  // Listen changes (Model -> View)
  // This can also being triggered when (View -> [Model -> View])
  // Returned value will only change element content
  self.m2v$myInput = function(oldValue, newValue){
      return formatCurrency(newValue);
  }

  // Listen changes (View -> Model)
  // This will triggered on input/change event
  // Returned value will assigned as new value
  self.v2m$myInput = function(oldValue, newValue){
    console.log("Value will be reverted in 3s to oldValue");
    setTimeout(function(){
      self.myInput = oldValue;
    }, 3000);
  }
});
```

You can also initialize your DOM with `sf.model.init` if you added the DOM dynamically.
```js
sf.model.init(targetNode = false)
```

## Controller
Controller is used for controling your model, so this would have a list of your static function.

Get controller name for the selected element node
```html
<sf-model name="something">
  <span id="username"></span>
</sf-model>
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

### Initialize controller
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

This is where you put your logic to control after the model was loaded and the controller was initialized. This function can be called more than once before the router invoke the `before` event and after the page was contain the matched `<sf-model name="">`. If the name was not found, then it will not be executed.
```js
sf.controller.run(name, function(self){
    var time = Date.now();

    if(self.myFunction()){
        alert('Hello world!');
    }
});
```

## Array data to list of DOM element
Any element with `sf-repeat-this` will be binded with the array condition on the model. If you `push` or `splice` the array data, then the element will also being modified.

These addional feature can be used after DOM element was binded.
### refresh
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

### softRefresh
Rebuild element for the model. If `index` or `length` was not defined, it will rebuild all element.
```js
myArray.softRefresh(index = 0, length = 1);
```

### swap
Swap 2 array value and the related element without rebuild the element nodes.
```js
myArray.swap(fromIndex, toIndex);
```

### move
Move some array value and the related element without rebuild the element nodes.
```js
myArray.move(fromIndex, toIndex[, length]);
```

### getElement
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
          $(elem).animateKey('bounceOutLeft', function(){
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
<sf-model name="music.feedback">
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
</sf-model>
```

## Virtual Scroll
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

## Available method for virtual scrolling
### Obtain all DOM elements
Elements on the virtual DOM will be combined with visible DOM element and return array of element that have the same index with the actual data.
```js
// This will return array of elements
var elements = self.list.$virtual.elements();

var $elem = $(elements);
$elem.find('.something');
```

### Scroll to or get element offset by the index
```js
// Instantly scroll to 3rd element
self.list.$virtual.scrollTo(8);

// Recalculate scroll bounding
self.list.$virtual.refresh();

// This will be available on static element height
// Get an offset that can be used for `scrollTop`
var offsetTop = self.list.$virtual.offsetTo(8);
```

## Components
Components feature is used when you have many element for one model. Each component will have same structure but with different value. When defining component name you must use `-` and word character.

```js
sf.component.for('model-name', function(self, root, $item){
  self.data = "text";

  // self.$el[0] <-- Contain the current element
  // self.$el('selector') <-- Shortcut to self.$el.find()
  // $('model-name') <-- Get another element from DOM include this

  // If you're using sf-repeat-this for this component
  // `$item` will have your item value instead of undefined

  self.beforeInit = function(){
    // When element is being initialized
  }

  self.init = function(){
    // When element was appended into DOM
  }

  self.destroy = function(){
    // When element was removed from DOM
  }
});
```

After it's executed, it will be registered as an model component. And any `controller` will running in different scope on every new component.

If you already inserted the component to the DOM, you can create attach new component model for it.

```js
sf.component.new('model-name', element = undefined);
```

If you want to create the component in the DOM, you need to define the HTML content for the component.

```js
sf.component.html('model-name', `<div>{{ data }}</div>`);
```

Then you can create new component from javascript like below.
```js
var myElement = new $ModelName($item = undefined);
document.body.appendChild(myElement);
// myElement.model.data === 'text'
```

Or you can do it directly from DOM like below.
```html
<model-name></model-name>
```

To obtain the model scope of an component, you can do the following:

> sf.component.available['model-name'][0]
> $('model-name')[0].model

The model will be automatically removed after the element was deleted. Or you could also call `theElement.destroy()`. Just make sure you're **not saving these element/model reference** anywhere so it could be garbage collected.

## Language / Locale
There are 2 ways on how to add your language pack:
 - Server side: Using server for serving the unknown language
 - Client side: Import language from the script

### Server side
You will need to set the serving URL before getting started. If you're confused, you can sneak peek from the test case.

```js
sf.lang.serverURL = 'http://localhost/language';
```

The library will request any missing language by using POST method to above URL. The example request data that will be received by your server is below:

```js
lang  = en
paths = '{"second":1,"my":{"test":1}}'
```
The `lang` is the language identifier (`sf.lang.default`) that can be used to select the language pack on your server. And the `paths` is the missing language path (ex: `second` and `my.test`). The server side response is up to you. The response from the server must be a JSON format because it will being merged with the current language pack on client side. After the language was loaded, the library will not requesting again untul you clear the language `sf.lang.list['en']`.

### Client side
Sometime the language pack will getting bigger if you have many languages for your app. But, the setup is pretty simple. All you need is just add the language and set the default language.

```js
var myLang = {
  timestamp:"Current timestamp is {timestamp}",
  my:{
    name:"Your name is {name}"
  }
};

sf.lang.add('en', myLang);
sf.lang.default = 'en';
```

If the language was missing, the library will not doing anything if you was not setup the server side URL.

### Using on DOM
When using this library for every element, you should manually initialize it for your `document.body` or specific dynamic element.

```html
<body>
  <!-- Put the text on the HTML content -->
  <p sf-lang="my.test"></p>

  <!-- Put the text on the placeholder (for input element) -->
  <input type="text" sf-lang="for.placeholder"></input>
</body>

<script>
  sf.lang(document.body);
</script>
```

### Translate from script
The library also support string's static/dynamic interpolation.
```js
// Define interpolation globally
sf.lang.interpolate = {
  timestamp:Date.now,
  name:"Lusia"
};
sf.lang.get('my.name'); // My Name is Lusia

// Use interpolation for current translation
sf.lang.get('my.name', {name:"Alex"}); // My Name is Alex

// Use callback for waiting request to the server side
sf.lang.get('date', /* {...}, */function(text){
  // Parameter 2 can also be used as callback/interpolation data
});

// Multiple path at once
sf.lang.get(['date', 'my.name'], /* {...}, */, function(values){
  // Parameter 2 can also be used as callback/interpolation data
  /* values = {
    'server.name':Date.now(),
    'my.name':'My Name is Lusia'
  }*/
});

// Directly assign to object
var myObject = sf.model('name');
sf.lang.assign(myObject, {
  modelKey:'my.name'
}, /* {interpolation data}*/);
```

## Contribution
If you want to help in ScarletsFrame please fork this project and edit on your repository, then make a pull request to here. Otherwise, you can help with donation via [patreon](https://www.patreon.com/stefansarya).

Keep the code simple and clear.

## License
ScarletsFrame is under the MIT license.

But don't forget to put the a link to this repository.
