export let rejectUntrusted = false;

export default function(level){
	if(level & 1) rejectUntrusted = true;
}