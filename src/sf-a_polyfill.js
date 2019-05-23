// ==== ES5 Polyfill ====
if(typeof Object.assign != 'function'){
  Object.defineProperty(Object, "assign", {
    value: function assign(target, varArgs) {
      'use strict';
      if (target == null)
        throw new TypeError('Cannot convert void 0 or null to object');
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

if(Element.prototype.remove === void 0 || CharacterData.prototype.remove === void 0 || DocumentType.prototype.remove === void 0){
  (function (arr) {
    arr.forEach(function (item) {
      if (item.hasOwnProperty('remove')) {
        return;
      }
      Object.defineProperty(item, 'remove', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: function remove() {
          if (this.parentNode !== null)
            this.parentNode.removeChild(this);
        }
      });
    });
  })([Element.prototype, CharacterData.prototype, DocumentType.prototype]);
}

if(!Element.prototype.matches){
  Element.prototype.matches = (Element.prototype).matchesSelector ||
    (Element.prototype).mozMatchesSelector || (Element.prototype).msMatchesSelector ||
    (Element.prototype).oMatchesSelector || (Element.prototype).webkitMatchesSelector ||
    function (s) {
      var matches = (this.document || this.ownerDocument).querySelectorAll(s),
      i = matches.length;
      while (--i >= 0 && matches.item(i) !== this){}
      return i > -1;
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

if(!window.location.origin)
  window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');

if(!Object.values)
  Object.values = function(obj){
    var res = [];
    for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
            res.push(obj[i]);
        }
    }
    return res;
  }

if(Object.setPrototypeOf === void 0)
  Object.setPrototypeOf = function(obj, proto) {
    obj.__proto__ = proto;
    return obj; 
  }

var Reflect_Construct = null;
if(typeof Reflect !== 'undefined')
  Reflect_Construct = Reflect.construct;
else 
  Reflect_Construct = function(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) _setPrototypeOf(instance, Class.prototype); return instance; };