})();

// Let's check all pending model
$(function(){
	for(var keys in internal.modelPending){
		var ref = internal.modelPending[keys];
		for (var z = 0; z < ref.length; z++)
			sf.model.init(ref[z], ref[z].getAttribute('name'));

		delete internal.modelPending[keys];
	}
});