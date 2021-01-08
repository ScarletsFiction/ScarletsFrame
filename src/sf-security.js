import {internal} from "./shared.js";
internal.rejectUntrusted = false;

export default function(level){
	if(level & 1) internal.rejectUntrusted = true;
}