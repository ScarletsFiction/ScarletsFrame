;(function(){
const self = sf.url = function(){
	// Hashes
	let hashes_ = '';
	for(let keys in hashes){
		if(hashes[keys] === '/') continue;
		hashes_ += `#${keys}${hashes[keys]}`;
	}

	const data_ = `|${self.data.join('|')}`;

	return self.paths + hashes_ + (data_.length !== 1 ? data_ : '');
};

let hashes = self.hashes = {};
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
		const data = {hashes:{}};

		data.data = url.split('|');
		var hashes_ = data.data.shift().split('#');

		for (var i = 1; i < hashes_.length; i++) {
			var temp = hashes_[i].split('/');
			data.hashes[temp.shift()] = `/${temp.join('/')}`;
		}

		// Paths
		data.paths = url.split('#')[0];
		return data;
	}

	self.data = window.location.hash.split('|');
	var hashes_ = self.data.shift().split('#');

	hashes = self.hashes = {};
	for (var i = 1; i < hashes_.length; i++) {
		var temp = hashes_[i].split('/');
		hashes[temp.shift()] = `/${temp.join('/')}`;
	}

	// Paths
	self.paths = window.location.pathname;
	return self;
}

self.parse();

})();