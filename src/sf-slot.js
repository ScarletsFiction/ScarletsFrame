export function handleSFSlot(model, element){
	var slotList = element.getElementsByTagName('sf-slot');

	for (var i = 0; i < slotList.length; i++) {
		let Slot = slotList[i];

		let target = Slot.getAttribute('for');
		Slot.removeAttribute('for');

		let parent = Slot.parentNode;
		let usedElement = Slot;

		let ref = model[target];
		Object.defineProperty(model, target, {
			get: ()=> ref,
			set: val => {
				if(val == null){ // Rollback to empty sf-slot element
					if(ref == null) return;
					parent.replaceChild(Slot, usedElement);
					usedElement = Slot;
				}
				else if(val instanceof HTMLElement){ // Replace sf-slot element
					parent.replaceChild(val, usedElement);
					usedElement = val;
				}
				else if(val.$el !== void 0){ // eplace with detached DOM element
					let list = val.$el;
					let found = false;

					for (var a = 0; a < list.length; a++) {
						if(list[a].isConnected === false){
							let got = list[a];
							parent.replaceChild(got, usedElement);
							usedElement = got;
							found = true;
							break;
						}
					}

					 // Replace with first DOM element if no detached element
					if(found === false){
						parent.replaceChild(list[0], usedElement);
						usedElement = list[0];
					}
				}
				else return Object.assign(model, val); // Assign all properties to model

				ref = val;
			}
		});

		// Refresh it
		model[target] = ref;
	}
}