import Request from "./sf-request.js";

export default class API{
	constructor(url){
		this.url = url;
		this.accessToken = false;
		this.mask = true;
	}
	get(url, data){
		return this.request('GET', this.url+url, data);
	}
	post(url, data){
		return this.request('POST', this.url+url, data);
	}
	delete(url, data){
		return this.request('DELETE', this.url+url, data);
	}
	put(url, data){
		return this.request('PUT', this.url+url, data);
	}
	upload(url, formData){
		if(formData.constructor !== FormData)
			return console.error("Parameter 2 must be a FormData");

		return this.request('POST', this.url+url, formData);
	}
	request(method, url, data, beforeSend){
		data ??= {};

		if(this.mask){
			var options = {receiveType:'JSON'};

			if(data.constructor === FormData)
				data.append('_method', method.toUpperCase());
			else{
				options.sendType = 'JSON';
				data._method = method.toUpperCase();
			}
		}
		else var options = {};

		if(this.accessToken){
			const { accessToken } = this;
			options.beforeSend = function(xhr){
			    xhr.setRequestHeader('X-Authorization', `Bearer ${accessToken}`);
			    beforeSend && beforeSend(xhr);
			}
		}
		else if(beforeSend !== void 0)
			options.beforeSend = beforeSend;

		if(this.mask)
			return Request('POST', url, data, options);
		return Request(method, url, data, options);
	}
};