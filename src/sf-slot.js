import { parsePropertyPath, deepProperty } from "./utils.js";

export function handleSFSlot(model, element){
	var slotList = element.getElementsByTagName('sf-slot');

	for (var i = slotList.length - 1; i >= 0; i--) {
		let Slot = slotList[i];

		let target = Slot.getAttribute('for');
		if(target == null) continue;

		Slot.removeAttribute('for');

		let parent = Slot.parentNode;
		let usedElement = Slot;

		target = parsePropertyPath(target);

		let model_ = deepProperty(model, target.slice(0, -1))
		target = target.pop();

		let ref = model_[target];
		let refCallback = model_[`on$${target}`];

		Object.defineProperty(model_, target, {
			get: ()=> ref,
			set: val => {
				if(val == null){ // Rollback to empty sf-slot element
					if(ref == null) return;
					parent.replaceChild(Slot, usedElement);
					usedElement = Slot;
				}
				else if(val instanceof Node){ // Replace sf-slot element
					parent.replaceChild(val, usedElement);
					usedElement = val;
				}
				else if(val.$el !== void 0){ // Replace with detached DOM element
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
				else return Object.assign(model_[target], val); // Assign all properties to model

				refCallback !== void 0 && refCallback(val);
				ref = val;
			}
		});

		// Refresh it
		model_[target] = ref;
	}
}