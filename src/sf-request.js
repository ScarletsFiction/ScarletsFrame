$.get = function(url, data, options, callback) {
	return custom('GET', url, data, options, callback);
}
$.post = function(url, data, options, callback) {
	return custom('POST', url, data, options, callback);
}
$.getJSON = function(url, data, options, callback) {
	return custom('getJSON', url, data, options, callback);
}
$.postJSON = function(url, data, options, callback) {
	return custom('postJSON', url, data, options, callback);
}

sf.request = custom;
var statusCode = sf.request.statusCode = {};
sf.request.onerror = null;
sf.request.onsuccess = null;

// $.get('https://reqbin.com/echo/get/json').done(console.log);
function custom(method, url, data, options, callback){
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

function request(method, url, data, options, callback){
	var xhr = new XMLHttpRequest();
	options.beforeOpen && options.beforeOpen(xhr);

	xhr.open(method, url, options.async || true, options.user, options.password);

	if(options.headers)
		for(var name in options.headers)
			xhr.setRequestHeader(name, options.headers[name]);

	if(typeof data === 'object'){
		if(method === 'GET' || method === 'HEAD' || method === 'OPTIONS' || method === 'DELETE'){
			url += (url.indexOf('?') === -1 ? '?' : '')+serializeQuery(data);
			data = null;
		}
		else if(options.sendType === 'JSON'){
			xhr.setRequestHeader('Content-Type', 'application/json');
			data = JSON.stringify(data);
		}
		else{
			var temp = data;

			data = new FormData();
			for(var name in temp){
				var val = temp[name];

				if(val.constructor === Array){
					for (var i = 0; i < val.length; i++)
						data.append(name+'[]', val[i]);
					continue;
				}

				if(val.constructor === Object){
					for(var valKey in val)
						data.append(name+'['+valKey+']', val[valKey]);
					continue;
				}

				data.append(name, val);
			}
		}
	}

	if(!callback || callback.constructor !== Object)
		callback = {done:callback};

	xhr.fail = function(func){
		callback.fail = func;
		return xhr;
	}
	xhr.done = function(func){
		callback.done = func;
		return xhr;
	}
	xhr.always = function(func){
		callback.always = func;
		return xhr;
	}
	xhr.progress = function(func){
		xhr.onprogress = xhr.onloadstart = func;
		return xhr;
	}
	xhr.uploadProgress = function(func){
		xhr.upload.onprogress = xhr.upload.onloadstart = func;
		return xhr;
	}

	xhr.onerror = function(){
		sf.request.onerror && sf.request.onerror(xhr);
		callback.fail && callback.fail(xhr.status);
		callback.always && callback.always('error');
	}

	xhr.onload = function(){
		if((xhr.status >= 200 && xhr.status < 300) || xhr.status === 0){
			if(options.receiveType === 'JSON'){
				try{
					callback.done && callback.done(JSON.parse(xhr.responseText), xhr.status);
					sf.request.onsuccess && sf.request.onsuccess(xhr);
				}catch(e){
					callback.fail && callback.fail('parseerror');
				}
			}
			else{
				callback.done && callback.done(xhr.responseText || xhr.response, xhr.status);
				sf.request.onsuccess && sf.request.onsuccess(xhr);
			}
		}
		else callback.fail && callback.fail(xhr.status);

		statusCode[xhr.status] && statusCode[xhr.status](xhr);
		callback.always && callback.always(xhr.status);
	}

	options.beforeSend && options.beforeSend(xhr);
	xhr.send(data);

	return xhr;
}

function serializeQuery(params) {
	var keys = [];
	for(var key in params){
		var val = params[key];
		if (val.constructor === Array){
			for (var i = 0; i < val.length; i++)
				keys.push(key+"[]="+encodeURIComponent(val[i]));
			continue;
		}

		if(val.constructor === Object){
			for(var valKey in val)
				keys.push(key+"["+valKey+"]="+encodeURIComponent(val[valKey]));
			continue;
		}

		keys.push(key+"="+encodeURIComponent(val));
	}

	return keys.join('&');
}