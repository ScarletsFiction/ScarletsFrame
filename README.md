[![Software License](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)
[![](https://data.jsdelivr.com/v1/package/npm/scarletsframe/badge)](https://www.jsdelivr.com/package/npm/scarletsframe)
[![Tweet](https://img.shields.io/twitter/url/http/shields.io.svg?style=social)](https://twitter.com/intent/tweet?text=ScarletsFrame%20is%20frontend%20library%20that%20can%20help%20simplify%20your%20code.&url=https://github.com/ScarletsFiction/ScarletsFrame&via=github&hashtags=scarletsframe,browser,framework,library,mvw)
[![Discord](https://img.shields.io/discord/840593315157245972.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://discord.gg/cNrBnCFy7q)

# ScarletsFrame
A frontend framework that can help you write a simple web structure with complex feature. This framework built for performance with balanced memory allocation and allows you to directly write template in the HTML. [Here](https://rawgit.com/krausest/js-framework-benchmark/master/webdriver-ts-results/table.html) you can see the benchmark.

The documentation located on [Github Wiki](https://github.com/ScarletsFiction/ScarletsFrame/wiki).

This framework haven't reach v1.0.0. Every increment of `(v0.*.0)` may have a breaking changes. Please see the **CHANGELOG.md** if you want to check the breaking changes. Make sure to specify the version instead of **latest** when using CDN link or the package like below.

```xml
<!-- Production mode -->
<script src="https://cdn.jsdelivr.net/npm/scarletsframe@0.35.x/dist/scarletsframe.min.js"></script>

<!-- Development mode -->
<script src="https://cdn.jsdelivr.net/npm/scarletsframe@0.35.x/dist/scarletsframe.dev.js"></script>

<!-- sQuery only (sf.$) -->
<script src="https://cdn.jsdelivr.net/npm/scarletsframe@0.35.x/dist/squery.min.js"></script>
```

## Try it online like a project
Example with file and folder structure
 - Simple in [StackBlitz](https://stackblitz.com/edit/scarletsframe-simple?file=index.js) or with languages in [StackBlitz](https://stackblitz.com/edit/scarletsframe-simple-language?file=index.html)
 - With page routes in [Glitch](https://glitch.com/edit/#!/scarletsframe-default?path=src%2Fvw-myview%2Fexample.html%3A4%3A7) and hot reload in [CodeSandbox](https://codesandbox.io/s/scarletsframe-default-5wxo7?file=/src/vw-myview/example.js)

### Advanced Example
- [List Swap](https://jsbin.com/wicunop/edit?js,console,output)
- [Cards](https://jsbin.com/bicijol/edit?js,output)
- [Control Style](https://jsbin.com/venipic/edit?html,js,output)
- [One Array For All](https://jsbin.com/weyecin/edit?html,js,output)
- [ToDo MVC](https://jsfiddle.net/stefansarya/b0z238r7/)

## Simple Example
- [Shared Model](https://jsbin.com/xiyeron/edit?html,js,output)
- [State Listener](https://jsbin.com/qohifel/edit?html,js,output)
- [Input Elements](https://jsbin.com/toripov/edit?js,console,output)
- [Simple Element Binding](https://jsbin.com/liluhul/edit?js,console,output) | [Deep Binding](https://jsbin.com/wesayec/edit?html,js,output)
- [Simple Component](https://jsbin.com/guwevis/edit?html,js,console,output)
- [Gesture Event](https://jsbin.com/jilivas/edit?html,js,output)
- [Views and Router](https://1vbdh.csb.app/) | [Source](https://codesandbox.io/s/viewsrouter-example-1vbdh)
- [Virtual Scroll](https://playcode.io/224164?tabs=model.js&output)
- [Language](https://jsbin.com/delayeb/edit?html,js,output)

## Real World App
 - [Blackprint](https://blackprint.github.io/) | [Source](https://github.com/Blackprint/Blackprint)
 - [NekoNyaan](https://nekonyaan.com)

## Install with CDN link
This is optional if you prefer using CDN link.
But I recommend to use the default template that have Hot Reload enabled.
```html
<script src='https://cdn.jsdelivr.net/npm/scarletsframe@0.35.x/dist/scarletsframe.min.js'></script>
```

### Polyfill for older browser
The `dist` file from the CDN link will only support Chrome >= 55, Firefox >= 68, and iOS >= 10.3.
If you want to support some old browser, you need to add some polyfill before load the framework.<br>
For Safari or iOS browser you may need to polyfill PointerEvent too<br>

<details>
  <summary>Click here to see the polyfills</summary>
  ```html
  <script type="text/javascript">
    // Polyfill for Old Browser
    (function(){function z(a){document.write('<script src="'+a+'"><\/script>')}
      if(!window.PointerEvent) // Chrome < 55, Firefox 42
        z('https://code.jquery.com/pep/0.4.3/pep.js');
      if(!window.Reflect) // Chrome < 49
        z('https://unpkg.com/core-js-bundle@latest/minified.js');
      if(!window.customElements) // Chrome < 54, Firefox 63
        z('https://unpkg.com/@webcomponents/webcomponentsjs@latest/webcomponents-loader.js');

      // From https://polyfill.io/v3/url-builder/
      if(!window.ResizeObserver || !Element.prototype.append || !Element.prototype.matches || !Array.prototype.includes || !Object.assign || !window.MutationObserver)
        z('https://polyfill.io/v3/polyfill.min.js?features=Element.prototype.append%2CElement.prototype.prepend%2CArray.prototype.includes%2CArray.from%2CElement.prototype.matches%2CElement.prototype.closest%2CIntersectionObserver%2CIntersectionObserverEntry%2CObject.assign%2CObject.create%2CResizeObserver%2CPromise%2CWeakMap%2CWeakSet%2CrequestAnimationFrame%2CMutationObserver');
    })();
  </script>
  ```
</details>

## Using the template
For starting the development environment, let's use the [default template](https://github.com/StefansArya/scarletsframe-default).

```sh
$ npm i -g scarletsframe-cli

# Download template to current directory
$ scarletsframe init default

# Install the needed package
$ npm i

# Start the development server
$ npm start
```

## Install with with NPM
This is optional if you prefer for using webpack, parcel, rollup, etc.
```sh
$ npm i scarletsframe@0.35.x
```

And include it on your project with webpack ([example](https://github.com/krausest/js-framework-benchmark/tree/master/frameworks/keyed/scarletsframe)) or browserify.
```js
const sf = require('scarletsframe');
// import { model } from "scarletsframe";

// You can use require to reference another model scope
sf.model('things', function(My, require) {
  My.something = 123;
});
```

## Contribution
If you want to help in ScarletsFrame please fork this project and edit on your repository, then make a pull request to here. Otherwise, you can help with donation via [kofi](https://ko-fi.com/stefansarya).

## License
ScarletsFrame is under the MIT license.