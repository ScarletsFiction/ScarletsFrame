sf.API = function API(url){
	this.url = url;
	this.accessToken = false;
	this.mask = true;
}

sf.API.prototype = {
	get:function(url, data){
		return this.request('GET', this.url+url, data);
	},
	post:function(url, data){
		return this.request('POST', this.url+url, data);
	},
	delete:function(url, data){
		return this.request('DELETE', this.url+url, data);
	},
	put:function(url, data){
		return this.request('PUT', this.url+url, data);
	},
	upload:function(url, formData){
		if(formData.constructor !== FormData)
			return console.error("Parameter 2 must be a FormData");

		return this.request('POST', this.url+url, formData);
	},
	request:function(method, url, data, accessToken, beforeSend){
		var type = typeof data;
		if(type !== 'object' && type !== 'function')
			data = {};

		if(this.mask){
			var options = {sendType:'JSON', receiveType:'JSON'};

			if(data.constructor !== FormData){
				options.contentType = "application/json";
				data._method = method.toUpperCase();
			}
			else data.append('_method', method.toUpperCase());
		}
		else var options = {};

		if(this.accessToken){
			options.beforeSend = function(xhr){
			    xhr.setRequestHeader('X-Authorization', 'Bearer '+this.accessToken);
			    beforeSend && beforeSend(xhr);
			}
		}
		else if(beforeSend !== void 0)
			options.beforeSend = beforeSend;

		if(this.mask)
			return sf.request('POST', url, data, options);
		return sf.request(method, url, data, options);
	}
};