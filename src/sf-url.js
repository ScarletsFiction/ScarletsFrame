;(function(){
const self = sf.url = function(){
	// Hash
	let hash_ = '';
	let hash = self.hash;
	for(let keys in hash){
		if(hash[keys] === '/') continue;
		hash_ += `#${keys}${hash[keys]}`;
	}

	// Query
	let query_ = '';
	let query = self.query;
	for(let keys in query){
		if(query_.length === 0)
			query_ += '?';
		else query_ += '&';

		query_ += `${keys}=${encodeURI(query[keys])}`;
	}

	const data_ = `|${self.data.join('|')}`;
	return self.path + query_ + hash_ + (data_.length !== 1 ? data_ : '');
};

self.hash = {};
self.query = {};
self.data = [];
self.path = '/';

// Push into latest history
self.push = function(){
	window.history.pushState((window.history.state || 0) + 1, '', self());
	triggerListener();
}

// Remove next history and change current history
self.replace = function(){
	window.history.replaceState(window.history.state, '', self());
	triggerListener();
}

self.get = function(name, index){
	self.parse();

	if(name.constructor === Number)
		return self.path.split('/')[name+1];

	if(hash[name] === void 0)
		return;

	return hash[name].split('/')[index+1];
}

self.parse = function(url){
	if(url !== void 0){
		const data = {hash:{}, query:{}};
		data.data = url.split('|');

		var hash_ = data.data.shift().split('#');
		for (var i = 1; i < hash_.length; i++) {
			var temp = hash_[i].split('/');
			data.hash[temp.shift()] = `/${temp.join('/')}`;
		}

		var query_ = hash_[0].split('?');
		if(query_.length !== 1){
			query_ = query_[1].split('&');
			for (var i = 0; i < query_.length; i++) {
				var temp = query_[i].split('=');
				data.query[temp[0]] = decodeURI(temp[1]);
			}
		}

		// Path
		data.path = url.split('#')[0].split('?')[0];
		return data;
	}

	self.data = window.location.hash.split('|');

	let hash = self.hash = {};
	var hash_ = self.data.shift().split('#');
	for (var i = 1; i < hash_.length; i++) {
		var temp = hash_[i].split('/');
		hash[temp.shift()] = `/${temp.join('/')}`;
	}

	let query = self.query = {};
	if(window.location.search.length !== 0){
		var query_ = window.location.search.slice(1).split('&');
		for (var i = 0; i < query_.length; i++) {
			var temp = query_[i].split('=');
			query[temp[0]] = decodeURI(temp[1]);
		}
	}

	// Path
	self.path = window.location.pathname;
	return self;
}

let listener = {query:[], hash:[], path:[], data:[]};
self.on = function(name, options, callback){
	if(options.constructor === Function)
		callback = options;
	else callback.path = options.path;

	listener[name].push(callback);
}

self.once = function(name, options, callback){
	(options.constructor === Function ? options : callback).once = true;
	self.on(name, options, callback);
}

self.off = function(name, callback){
	const list = listener[name];
	list.splice(list.indexOf(callback), 1);
}

function triggerListener(){
	for(var key in listener){
		const list = listener[key];
		if(list.length === 0) continue;

		for (var i = 0; i < list.length; i++) {
			const callback = list[i];
			if(callback.path !== void 0){
				if(callback.path !== self.path)
					continue;
			}

			callback(self[key]);
		}
	}
}

self.parse();

})();