<a href='https://patreon.com/stefansarya'><img src='https://img.shields.io/endpoint.svg?url=https%3A%2F%2Fshieldsio-patreon.herokuapp.com%2Fstefansarya%2Fpledges&style=for-the-badge' height='20'></a>
[![Software License](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)
[![](https://data.jsdelivr.com/v1/package/npm/scarletsframe/badge)](https://www.jsdelivr.com/package/npm/scarletsframe)
[![Tweet](https://img.shields.io/twitter/url/http/shields.io.svg?style=social)](https://twitter.com/intent/tweet?text=ScarletsFrame%20is%20frontend%20library%20that%20can%20help%20simplify%20your%20code.&url=https://github.com/ScarletsFiction/ScarletsFrame&via=github&hashtags=scarletsframe,browser,framework,library,mvw)

# ScarletsFrame
A frontend framework that can help you write a simple web structure with complex feature. This framework have small memory allocation and allows you to directly write template in the HTML. [Here](https://rawgit.com/krausest/js-framework-benchmark/master/webdriver-ts-results/table.html) you can see the benchmark.

The documentation located on [Github Wiki](https://github.com/ScarletsFiction/ScarletsFrame/wiki).

## Example
- [Simple Element Binding](https://jsbin.com/liluhul/edit?js,console,output) | [Deep Binding](https://jsbin.com/wesayec/edit?html,js,output)
- [Simple Component](https://jsbin.com/guwevis/edit?html,js,console,output)
- [Input Elements](https://jsbin.com/toripov/edit?js,console,output)
- [State Listener](https://jsbin.com/qohifel/edit?html,js,output)
- [Shared Model](https://jsbin.com/xiyeron/edit?html,js,output)
- [Todo Application](https://playcode.io/134963?tabs=console&model.js&output)
- [Virtual Scroll](https://playcode.io/224164?tabs=model.js&output)
- [Gesture Event](https://jsbin.com/jilivas/edit?html,js,output)
- [Views and Router](https://1vbdh.csb.app/) | [Source](https://codesandbox.io/s/viewsrouter-example-1vbdh)
- [Language](https://jsbin.com/delayeb/edit?html,js,console,output)

## Install from template
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

## Install with CDN link
You can download minified js from this repository or use this CDN link
```html
<script src='https://cdn.jsdelivr.net/npm/scarletsframe@latest'></script>
```

### Polyfill for IE11
If you want to support IE11 and some old browser, you need to add some polyfill before the framework.
```html
<script type="text/javascript">
  // Polyfill for Old Browser
  (function(){function z(a){document.write('<script src="'+a+'"><\/script>')}
    if(window.MutationObserver === void 0)
      window.MutationObserver = window.WebKitMutationObserver;
    if(window.Reflect === void 0)
      z('https://unpkg.com/core-js-bundle@latest/minified.js');
    if(window.customElements === void 0)
      z('https://unpkg.com/@webcomponents/webcomponentsjs@latest/webcomponents-loader.js');
    if(window.PointerEvent === void 0)
      z('https://code.jquery.com/pep/0.4.3/pep.js');
  })();
</script>
```

## Bundle with NPM
```sh
$ npm i scarletsframe
```

And include it on your project with webpack ([example](https://github.com/krausest/js-framework-benchmark/tree/master/frameworks/keyed/scarletsframe)) or browserify.
```js
const sf = require('scarletsframe');

sf.model.for('things', (self, root) => {
  ...
});
```

## Contribution
If you want to help in ScarletsFrame please fork this project and edit on your repository, then make a pull request to here. Otherwise, you can help with donation via [patreon](https://www.patreon.com/stefansarya).

Keep the code simple and clear.

## License
ScarletsFrame is under the MIT license.

But don't forget to put the a link to this repository.
