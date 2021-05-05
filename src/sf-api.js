import {request as Request} from "./sf-request.js";

export class API{
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

		var options = {receiveType:'JSON'};
		if(this.mask){
			if(data.constructor === FormData)
				data.append('_method', method.toUpperCase());
			else
				data._method = method.toUpperCase();
		}

		if(data.constructor !== FormData)
			options.sendType = 'JSON';

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