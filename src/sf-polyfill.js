if(Element.prototype.remove === undefined || CharacterData.prototype.remove === undefined || DocumentType.prototype.remove === undefined){
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

if(Element.prototype.matches === void 0)
  Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;

if(Element.prototype.closest === void 0){
  Element.prototype.closest = function(selector){
    var elem = this;
    do {
      if(elem === document)
        return null;

      if(elem.matches(selector) === true)
        return elem;

      elem = elem.parentNode;
    } while (elem !== null);

    return null;
  }
}
