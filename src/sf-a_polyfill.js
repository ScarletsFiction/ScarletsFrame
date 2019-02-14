// ==== ES5 Polyfill ====
if(typeof Object.assign != 'function'){
  Object.defineProperty(Object, "assign", {
    value: function assign(target, varArgs) {
      'use strict';
      if (target == null)
        throw new TypeError('Cannot convert undefined or null to object');
      var to = Object(target);
      for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];
        if (nextSource != null) {
          for (var nextKey in nextSource) {
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey))
              to[nextKey] = nextSource[nextKey];
          }
        }
      }
      return to;
    },
    writable: true,
    configurable: true
  });
}

if(!Array.prototype.forEach){
  Array.prototype.forEach = function(callback) {
    var T, k;
    if (this == null)
      throw new TypeError('this is null or not defined');
    var O = Object(this);
    var len = O.length >>> 0;
    if (typeof callback !== 'function')
      throw new TypeError(callback + ' is not a function');
    if (arguments.length > 1)
      T = arguments[1];
    k = 0;
    while (k < len) {
      var kValue;
      if (k in O) {
        kValue = O[k];
        callback.call(T, kValue, k, O);
      }
      k++;
    }
  };
}

if(!NodeList.prototype.forEach){
    NodeList.prototype.forEach = function (callback, thisArg) {
        thisArg = thisArg || window;
        for (var i = 0; i < this.length; i++) {
            callback.call(thisArg, this[i], i, this);
        }
    };
}

if(!window.location.origin){
  window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
}