export class Collection {
	constructor(obj, options){
		this._obj = obj; // Array, Set, Map, Object
		this._opt = options || {};

		if(obj.$collection == null){
			Object.defineProperty(obj, '$collection', {
				enumerable: false,
				value: [],
			});
		}

		obj.$collection.push(this);

		this._opt.maxItem ??= 0;
		this.onOverflow = obj.onOverflow;
		this.onAdd = obj.onAdd;
		this.onDelete = obj.onDelete;

		this.list = [];
	}

	add(item){
		if(this.list.includes(item)) return;

		let len = this.list.length;
		let _maxItem = this._opt._maxItem;

		if(len > _maxItem){
			this.onOverflow?.();

			if(len > _maxItem){
				throw new Error("Couldn't add more item as the collection already reach it's max capacity, please handle it by using onOverflow");
			}
		}

		this.list.push(item);

		let elements = this._obj.getElements?.(item) || [];
		this.onAdd?.(item, elements);
	}

	delete(item, _i){
		let i = _i || this.list.indexOf(item);
		if(i === -1) return;

		let elements = this._obj.getElements?.(item) || [];
		this.onDelete?.(item, elements);

		this.list.splice(i, 1);
	}

	clear(){
		let list = this.list;
		for (let i=0; i < list.length; i++)
			this.delete(list[i], i);
	}
}