import $ from "./sf-dom.js";

$.get = (url, data, options, callback) => Self('GET', url, data, options, callback)
$.post = (url, data, options, callback) => Self('POST', url, data, options, callback)
$.getJSON = (url, data, options, callback) => Self('getJSON', url, data, options, callback)
$.postJSON = (url, data, options, callback) => Self('postJSON', url, data, options, callback)

export default function Self(method, url, data, options, callback){
	if(data && data.constructor === Function){
		callback = data;
		data = void 0;
	}

	if(options && options.constructor === Function){
		callback = options;
		options = void 0;
	}

	if(options === void 0)
		options = {};

	if(method === 'getJSON'){
		options.receiveType = 'JSON';
		method = 'GET';
	}

	if(method === 'postJSON'){
		options.sendType = 'JSON';
		method = 'POST';
	}

	return request(method, url, data, options, callback);
}

const statusCode = Self.statusCode = {};
Self.onerror = null;
Self.onsuccess = null;

function request(method, url, data, options, callback){
	const xhr = new XMLHttpRequest();
	options.beforeOpen && options.beforeOpen(xhr);

	if(method === 'GET' || method === 'HEAD' || method === 'OPTIONS' || method === 'DELETE'){
		url += (url.includes('?') === false ? '?' : '')+serializeQuery(data);
		data = null;
	}

	xhr.open(method, url, options.async || true, options.user, options.password);

	if(options.responseType)
		xhr.responseType = options.responseType;

	if(options.mimeType)
		xhr.overrideMimeType(options.mimeType);

	if(options.timeout)
		xhr.timeout = options.timeout;

	if(options.headers)
		for(var name in options.headers)
			xhr.setRequestHeader(name, options.headers[name]);

	if(typeof data === 'object' && data !== null && data.constructor !== FormData){
		if(options.sendType === 'JSON'){
			xhr.setRequestHeader('Content-Type', 'application/json');
			data = JSON.stringify(data);
		}
		else{
			const temp = data;

			data = new FormData();
			for(var name in temp){
				const val = temp[name];

				if(val.constructor === Array){
					for (let i = 0; i < val.length; i++)
						data.append(`${name}[]`, val[i]);
					continue;
				}

				if(val.constructor === Object){
					for(let valKey in val)
						data.append(`${name}[${valKey}]`, val[valKey]);
					continue;
				}

				data.append(name, val);
			}
		}
	}

	if(!callback || callback.constructor !== Object)
		callback = {done:callback};

	xhr._cb = callback;
	xhr._opt = options;

	Object.setPrototypeOf(xhr, ReqEventRegister.prototype);
	xhr.onerror = ReqEventRegister.onerror;
	xhr.ontimeout = ReqEventRegister.ontimeout;
	xhr.onload = ReqEventRegister.onload;

	options.beforeSend && options.beforeSend(xhr);
	xhr.send(data);

	return xhr;
}

class ReqEventRegister extends XMLHttpRequest{
	test(){
		this._cb.done = function(data){
			console.log('%cSuccess:', 'color:#1bd52b', data);
		}
		this._cb.fail = function(status, data){
			console.error(`%cError (${status}):`, 'color:yellow', data);
		}
	}
	fail(func){
		this._cb.fail = func;
		return this;
	}
	always(func){
		this._cb.always = func;
		return this;
	}
	done(func){
		this._cb.done = func;
		return this;
	}
	progress(func){
		this.onprogress = this.onloadstart = func;
		return this;
	}
	uploadProgress(func){
		this.upload.onprogress = this.upload.onloadstart = func;
		return this;
	}
	then(resolved, rejected){
		this._cb.done = resolved;
		this._cb.fail = rejected;
		return this;
	}
	static ontimeout(){
		Self.onerror && Self.onerror(this);
		this._cb.fail && this._cb.fail('timeout');
		this._cb.always && this._cb.always('timeout');
	}
	static onerror(){
		Self.onerror && Self.onerror(this);
		this._cb.fail && this._cb.fail(this.status);
		this._cb.always && this._cb.always('error');
	}
	static onload(){
		const xhr = this;
		const callback = this._cb;
		const options = this._opt;

		if((xhr.status >= 200 && xhr.status < 300) || xhr.status === 0){
			if(options.receiveType === 'JSON'){
				let parsed = void 0;
				try{
					parsed = JSON.parse(xhr.responseText);
				}catch(e){
					callback.fail && callback.fail('parseerror', xhr.responseText);
				}

				if(parsed !== void 0){
					callback.done && callback.done(JSON.parse(xhr.responseText), xhr.status);
					Self.onsuccess && Self.onsuccess(xhr);
				}
			}
			else{
				callback.done && callback.done(xhr.response, xhr.status);
				Self.onsuccess && Self.onsuccess(xhr);
			}
		}
		else if(callback.fail){
			if(options.receiveType === 'JSON'){
				try{
					callback.fail(xhr.status, JSON.parse(xhr.responseText));
				}catch(e){
					callback.fail(xhr.status, xhr.responseText);
				}
			}
			else callback.fail(xhr.status, xhr.response);
		}

		statusCode[xhr.status] && statusCode[xhr.status](xhr);
		callback.always && callback.always(xhr.status);
	}
}

;(function(){
	const proto = ReqEventRegister.prototype;
	proto.finally = proto.always;
	proto.catch = proto.fail;
})();

function serializeQuery(params) {
	const keys = [];
	for(let key in params){
		const val = params[key];
		if (val.constructor === Array){
			for (let i = 0; i < val.length; i++)
				keys.push(`${key}[]=${encodeURIComponent(val[i])}`);
			continue;
		}

		if(val.constructor === Object){
			for(let valKey in val)
				keys.push(`${key}[${valKey}]=${encodeURIComponent(val[valKey])}`);
			continue;
		}

		keys.push(`${key}=${encodeURIComponent(val)}`);
	}

	return keys.join('&');
}