import {internal} from "./shared.js";
internal.rejectUntrusted = false;

export function security(level){
	if(level & 1) internal.rejectUntrusted = true;
}