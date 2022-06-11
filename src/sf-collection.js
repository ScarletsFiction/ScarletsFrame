export class Collection {
	constructor(obj, options){
		this._obj = obj; // Array, Set, Map, Object

		this._opt = options ??= {};
		options.maxItem ??= Infinity;
		this.onOverflow = options.onOverflow;
		this.onAdd = options.onAdd;
		this.onDelete = options.onDelete;

		this.list = [];
	}

	add(item){
		let list = this.list;
		if(list.includes(item)) return;

		let { onOverflow } = this;
		let maxItem = this._opt.maxItem;

		let replaceFirstIndex = false;
		if(list.length >= maxItem){
			if(onOverflow != null){
				if(maxItem === 1 && onOverflow.constructor === String){
					if(list.$el == null)
						replaceFirstIndex = true;
					else list.pop();
				}
				else if(onOverflow === 'shift') list.shift();
				else if(onOverflow === 'pop') list.pop();
				else onOverflow(item);
			}

			if(replaceFirstIndex === false && list.length >= maxItem){
				throw new Error("Couldn't add more item as the collection already reach it's max capacity, please handle it by using onOverflow");
			}
		}

		if(replaceFirstIndex){
			this.delete(list[0], 0);
			list[0] = item;
		}
		else list.push(item);

		let elements = this._obj.getElements?.(item) || [];
		this.onAdd?.(item, elements);
	}

	delete(item, _i){
		let skipSplice = false;
		if(_i != null) skipSplice = true;
		
		let list = this.list;
		let i = _i ?? list.indexOf(item);
		if(i === -1) return;

		let elements = this._obj.getElements?.(item) || [];
		this.onDelete?.(item, elements);

		if(skipSplice === false)
			list.splice(i, 1);
	}

	clear(){
		let list = this.list;
		if(list.length === 0) return;

		for (let i=0; i < list.length; i++) {
			this.delete(list[i], i);
		}

		list.splice(0);
	}
}