if(Element.prototype.remove === void 0 || CharacterData.prototype.remove === void 0 || DocumentType.prototype.remove === void 0){
	(function(){
		const arr = [Element.prototype, CharacterData.prototype, DocumentType.prototype];
		for (let i = 0; i < arr.length; i++) {
			if(arr[i].hasOwnProperty('remove'))
				return;

			arr[i].remove = function(){
				if(this.parentNode !== null)
					this.parentNode.removeChild(this);
			}
		}
	})();
}

if(Element.prototype.matches === void 0)
	Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;

if(Element.prototype.closest === void 0){
	Element.prototype.closest = function(selector){
		let elem = this;
		do {
			if(elem === document)
				return null;

			if(elem.matches(selector))
				return elem;

			elem = elem.parentNode;
		} while (elem !== null);

		return null;
	}
}