[![Software License](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)
[![](https://data.jsdelivr.com/v1/package/npm/scarletsframe/badge)](https://www.jsdelivr.com/package/npm/scarletsframe)
[![Tweet](https://img.shields.io/twitter/url/http/shields.io.svg?style=social)](https://twitter.com/intent/tweet?text=ScarletsFrame%20is%20frontend%20library%20that%20can%20help%20simplify%20your%20code.&url=https://github.com/ScarletsFiction/ScarletsFrame&via=github&hashtags=scarletsframe,browser,framework,library,mvw)

# ScarletsFrame
A frontend framework that can help you write a simple web structure with complex feature. This framework built for performance with balanced memory allocation and allows you to directly write template in the HTML. [Here](https://rawgit.com/krausest/js-framework-benchmark/master/webdriver-ts-results/table.html) you can see the benchmark.

The documentation located on [Github Wiki](https://github.com/ScarletsFiction/ScarletsFrame/wiki).

This framework haven't reach v1.0.0. Every increment of `(v0.*.0)` may have a breaking changes. Please see the **CHANGELOG.md** if you want to check the breaking changes. Make sure to specify the version instead of **latest** when using CDN link or the package like below.

```html
<script src="https://cdn.jsdelivr.net/npm/scarletsframe@0.33.x/dist/scarletsframe.min.js"></script>
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
You can download minified js from this repository or use this CDN link.<br>
For supporting older browser you need to add [core-js and webcomponentsjs](#polyfill-for-older-browser) polyfill.<br>
```html
<script src='https://cdn.jsdelivr.net/npm/scarletsframe@0.33.x/dist/scarletsframe.min.js'></script>
```

But if you develop only for modern browser and focus for performance it's recommended for using below, you may still to polyfill PointerEvent for Safari/Firefox desktop browser.
```html
<script src='https://cdn.jsdelivr.net/npm/scarletsframe@0.33.x/dist/scarletsframe.es6.js'></script>
```

## Install with with NPM
```sh
$ npm i scarletsframe@0.33.x
```

## Using the template
For starting the development environment, let's use the [default template](https://github.com/StefansArya/scarletsframe-default).

```sh
$ npm i -g scarletsframe-cli

# Download template to current directory
$ scarletsframe init default

# Compile the default template
$ npm run compile

# Or use gulp if already installed globally
$ gulp compile
```

## Starting the server
```sh
$ npm start

# Or use gulp
$ gulp
```

And include it on your project with webpack ([example](https://github.com/krausest/js-framework-benchmark/tree/master/frameworks/keyed/scarletsframe)) or browserify.
```js
const sf = require('scarletsframe');
// import sf from "scarletsframe";

sf.model('things', function(self, root) {
  self.something = 123;
});
```

### Polyfill for older browser
If you want to support some old browser, you need to add some polyfill before the framework.<br>
For Safari or iOS browser you may need to polyfill PointerEvent too<br>
Some feature not work on IE11.
<details>
  <summary>Click here to see the polyfills</summary>
  ```html
  <script type="text/javascript">
    // Polyfill for Old Browser
    (function(){function z(a){document.write('<script src="'+a+'"><\/script>')}
      if(!window.PointerEvent) // Chrome < 55, Firefox 42
        z('https://code.jquery.com/pep/0.4.3/pep.js');
      if(!window.MutationObserver) // Chrome 26
        window.MutationObserver = window.WebKitMutationObserver;
      if(!window.Reflect) // Chrome < 49
        z('https://unpkg.com/core-js-bundle@latest/minified.js');
      if(!window.customElements) // Chrome < 54, Firefox 63
        z('https://unpkg.com/@webcomponents/webcomponentsjs@latest/webcomponents-loader.js');
      if(!window.ResizeObserver) // Chrome < 64, Firefox 69
        z('https://polyfill.io/v3/polyfill.min.js?features=ResizeObserver%2CIntersectionObserver%2CIntersectionObserverEntry');
    })();
  </script>
  ```
</details>

## Contribution
If you want to help in ScarletsFrame please fork this project and edit on your repository, then make a pull request to here. Otherwise, you can help with donation via [kofi](https://ko-fi.com/stefansarya).

## License
ScarletsFrame is under the MIT license.