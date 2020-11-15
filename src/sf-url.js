;(function(){
const self = sf.url = function(){
	// Hashes
	let hashes_ = '';
	let hashes = self.hashes;
	for(let keys in hashes){
		if(hashes[keys] === '/') continue;
		hashes_ += `#${keys}${hashes[keys]}`;
	}

	// Queries
	let queries_ = '';
	let queries = self.queries;
	for(let keys in queries){
		if(queries_.length === 0)
			queries_ += '?';
		else queries_ += '&';

		queries_ += `${keys}=${encodeURI(queries[keys])}`;
	}

	const data_ = `|${self.data.join('|')}`;
	return self.paths + queries_ + hashes_ + (data_.length !== 1 ? data_ : '');
};

self.hashes = {};
self.queries = {};
self.data = [];
self.paths = '/';

// Push into latest history
self.push = function(){
	window.history.pushState((window.history.state || 0) + 1, '', self());
}

// Remove next history and change current history
self.replace = function(){
	window.history.replaceState(window.history.state, '', self());
}

self.get = function(name, index){
	self.parse();

	if(name.constructor === Number)
		return self.paths.split('/')[name+1];

	if(hashes[name] === void 0)
		return;

	return hashes[name].split('/')[index+1];
}

self.parse = function(url){
	if(url !== void 0){
		const data = {hashes:{}, queries:{}};
		data.data = url.split('|');

		var hashes_ = data.data.shift().split('#');
		for (var i = 1; i < hashes_.length; i++) {
			var temp = hashes_[i].split('/');
			data.hashes[temp.shift()] = `/${temp.join('/')}`;
		}

		var queries_ = hashes_[0].split('?');
		if(queries_.length !== 1){
			queries_ = queries_[1].split('&');
			for (var i = 0; i < queries_.length; i++) {
				var temp = queries_[i].split('=');
				data.queries[temp[0]] = decodeURI(temp[1]);
			}
		}

		// Paths
		data.paths = url.split('#')[0].split('?')[0];
		return data;
	}

	self.data = window.location.hash.split('|');

	let hashes = self.hashes = {};
	var hashes_ = self.data.shift().split('#');
	for (var i = 1; i < hashes_.length; i++) {
		var temp = hashes_[i].split('/');
		hashes[temp.shift()] = `/${temp.join('/')}`;
	}

	let queries = self.queries = {};
	if(window.location.search.length !== 0){
		var queries_ = window.location.search.slice(1).split('&');
		for (var i = 0; i < queries_.length; i++) {
			var temp = queries_[i].split('=');
			queries[temp[0]] = decodeURI(temp[1]);
		}
	}

	// Paths
	self.paths = window.location.pathname;
	return self;
}

self.parse();

})();