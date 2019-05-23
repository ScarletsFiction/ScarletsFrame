sf.API = function(method, url, data, success, complete, accessToken){
	var req = {
		url:url,
		dataType:'json',
		contentType:"application/json",
		method:'POST',
		success:function(obj){
			if(!sf.API.onSuccess(obj) && success)
				success(obj, url);

			if(complete) complete(true);
		},
		error:function(xhr, status){
			sf.API.onError(xhr, status)
			if(complete) complete(false, status);
		}
	};

	if(typeof data !== 'object')
		data = {};

	data._method = method.toUpperCase();

	if(accessToken)
		data.access_token = accessToken;
	
	req.data = data;
	sf.ajax(req);
}

sf.API.onError = function(xhr, status){};
sf.API.onSuccess = function(obj){};

sf.API.url = 'http://anisics.sandbox/api';
sf.API.accessToken = false;
sf.API.get = function(url, data, success, complete){
	return sf.API('get', this.url+url, data, success, complete, this.accessToken);
}
sf.API.post = function(url, data, success, complete){
	return sf.API('post', this.url+url, data, success, complete, this.accessToken);
}
sf.API.delete = function(url, data, success, complete){
	return sf.API('delete', this.url+url, data, success, complete, this.accessToken);
}
sf.API.put = function(url, data, success, complete){
	return sf.API('put', this.url+url, data, success, complete, this.accessToken);
}