sf.API = function(method, url, data, success, complete, accessToken, getXHR){
	if(typeof data !== 'object')
		data = {};

	var req = {
		url:url,
		dataType:'json',
		method:'POST',
		success:function(obj){
			if(!sf.API.onSuccess(obj) && success)
				success(obj, url);

			if(complete) complete(true);
		},
		error:function(xhr, status){
			sf.API.onError(xhr, status)
			if(complete) complete(false, status);
		},
	};

	if(data.constructor !== FormData)
		req.contentType = "application/json";

	data._method = method.toUpperCase();

	if(accessToken){
		req.beforeSend = function(xhr){
		    xhr.setRequestHeader('X-Authorization', 'Bearer '+accessToken);
		    getXHR && getXHR(xhr);
		}
	}
	else if(getXHR !== void 0)
		req.beforeSend = getXHR;
	
	req.data = data;
	return sf.ajax(req);
}

sf.API.onError = function(xhr, status){};
sf.API.onSuccess = function(obj){};

var extendsAPI = {
	get:function(url, data, success, complete){
		return sf.API('get', this.url+url, data, success, complete, this.accessToken);
	},
	post:function(url, data, success, complete){
		return sf.API('post', this.url+url, data, success, complete, this.accessToken);
	},
	delete:function(url, data, success, complete){
		return sf.API('delete', this.url+url, data, success, complete, this.accessToken);
	},
	put:function(url, data, success, complete){
		return sf.API('put', this.url+url, data, success, complete, this.accessToken);
	},
	upload:function(url, formData, success, complete, progress){
		if(formData.constructor !== FormData)
			return console.error("Parameter 2 must be a FormData");

		var getXHR = void 0;
		if(progress !== void 0){
			getXHR = function(xhr){
				xhr.upload.onprogress = function(ev){
	            	if(ev.lengthComputable)
	            	    progress(ev.loaded, ev.total);
	            }
			}
		}

		return sf.API('post', this.url+url, formData, success, complete, this.accessToken, getXHR);
	},
};

sf.API.instance = function(url){
	var self = this;
	self.url = url;
	self.accessToken = false;

	Object.assign(this, extendsAPI);
}