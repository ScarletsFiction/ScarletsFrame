## Breaking changes since 0.35.0
Maybe you haven't use this feature yet..

```js
// For sf.model and sf.component if you use class
// then it must extends sf.Model
sf.model('stuff', class extends sf.Model {
  // Before breaking changes
  static construct(){
    // ...
  }

  // Now you can use this instead
  constructor(){
    super();
    // this == My
  }

  // ---

  // Before breaking changes if you use this
  static init(){
    // ...
  }

  // Please change it to this
  init(){
    // this == My
  }
});


// For sf.model and sf.component if you use options to extends a class
// with function as a scope, and the class has init function, then you need to call My.super()
class extendMe extends sf.Model {
  init(el){
    return 'ok';
  }

  otherStuff(param){
    return param + 2;
  }
}

sf.model('stuff', {extend: extendMe}, function(My){
  My.init = function(el){
    My.super(el); // === 'ok'
  }

  My.otherStuff = function(){
    My.super(123); // === 125
  }
});
```

## Breaking changes since 0.34.0
From this version, the framework was using ES6 module.<br>
Because of it there are some changes for the API to make it tree shakeable and more easy to understand.

You can just use feature like "Replace All" from your text editor.
```js
// Helper for getting model/component scope from an element
sf(element) -> sf.getScope(element)

// Object renaming
sf.lang -> sf.language
sf.url -> sf.URI
sf.dom -> sf.$

// Changes on dynamic element language initialization
sf.lang(element) -> sf.language.init(element)

// Class will need to be constructed with 'new ...()'
sf.views -> sf.Views    // Class
sf.space -> sf.Space    // Class

---------------------------------------

// Most of you may haven't use this feature yet
// Because some of it haven't been documented
// But this will be written here for reference
sf.events(a, b) -> sf.events.register(a, b)
sf.window -> sf.Window  // Class

// Helper for assigning value to an object reactively for PropertyList
sf.set -> sf.Obj.set
sf.delete -> sf.Obj.delete

// Type Defininition (for TypeScript)
RepeatedProperty -> PropertyList;
RepeatedList -> ReactiveArray;
```

## Breaking changes since 0.33.0
This is just a small changes. If you have used `sf.views` for your router with the template you will need to specify the file extension.

```js
var views = new sf.views('vw-pages', '');

views.addRoute([
// Before
{
    path:'/my-page1',
    template:'vw-pages/page1' // in the previous version .html was appended here
},

// After
{
    path:'/my-page1',
    template:'vw-pages/page1.html'
}, {
    path:'/my-page2',
    template:'vw-pages/path/page2.sf' // You can also use .sf
}]);
```

## Changes since 0.32.0
There are some changes if you're using sf.url. Actually this feature haven't documented before 0.32.0 on the Wiki, so it was already expected to breaking xD. If you see some undocumented feature feel free to make an issue/question to make sure if it was stable for the next version.

```js
// Old
sf.url.paths = ''; // Main URL path
sf.url.hashes = {}; // Hash routes
sf.url.data = []; // Custom URL data

// Changed into
sf.url.path = ''; // Main URL path
sf.url.routes = {}; // Hash routes
sf.url.data = {}; // Custom URL data

// New
sf.url.query = {}; // URL GET query

// Example: https://domain.com/my/path?search=myself#;hello:from,world
path == '/my/path';
query == {search:'myself'};
data == {hello:['from', 'world']}
```

If you're not using sf.views for routing you will need to manually call `sf.url.parse(true)` to parse current URL from the address bar. You can pass it with String parameter instead if you want to parse your URL without affecting sf.url's data. More information please go to the Wiki.

sf-each now support Map and Set data type, you may need to call `.refresh()` if you have some changes on Map's key or Array's index.

## Breaking changes since 0.31.0
```xml
<!-- Old -->
<div sf-repeat-this="..."></div>

<!-- Changed into -->
<div sf-each="..."></div>
```

### Breaking changes since 0.30.0
```js
sf.model('stuff', function(self){
  self.binded = 'still old value';

  // Parameter changes for 'm2v', 'v2m', and 'on'
  self.m2v$binded = function(newValue){
    self.binded === 'still old value';
    return "replace the new value";
  }
})

var space = sf.space(name, options); // Old
var space = new sf.space(name, options); // Now
```