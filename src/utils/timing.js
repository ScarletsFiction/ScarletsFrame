// If you copy the code from here to your project
// Please put reference link to this repository

let before = false;
let after = false;

export function beforeRepaint(){
	if(before === false) generate();
	return before;
}

export function afterRepaint(){
	if(before === false || after === false)
		generate();
	return after;
}

let afterResolve = false;
function generate(){
	if(after === false) after = new Promise(resolved => {
		afterResolve = resolved;
	});

	if(before === false) before = new Promise(resolved => {
		requestAnimationFrame(() => {
			resolved();
			before = false;

			if(after !== false){
				Promise.resolve().then(() => {
					afterResolve();
					after = false;
				});
			}
		});
	});
}