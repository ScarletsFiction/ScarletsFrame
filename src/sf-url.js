;(function(){
var self = sf.url = function(){
	// Hashes
	var hashes_ = '';
	for(var keys in hashes){
		if(hashes[keys] === '/') continue;
		hashes_ += '#'+keys+hashes[keys];
	}

	var data_ = '|'+self.data.join('|');

	return self.paths + hashes_ + (data_.length !== 1 ? data_ : '');
}

var hashes = self.hashes = {};
self.data = {};
self.paths = '/';

// Push into latest history
self.push = function(){
	window.history.pushState((window.history.state || 0) + 1, '', self());
}

// Remove next history and change current history
self.replace = function(){
	window.history.replaceState(window.history.state, '', self());
}

self.parse = function(url){
	if(url !== void 0){
		var data = {hashes:{}};

		data.data = url.split('|');
		var hashes_ = data.data.shift().split('#');

		for (var i = 1; i < hashes_.length; i++) {
			var temp = hashes_[i].split('/');
			data.hashes[temp.shift()] = '/'+temp.join('/');
		}

		// Paths
		data.paths = url.split('#')[0];
		return data;
	}

	self.data = window.location.hash.split('|');
	var hashes_ = self.data.shift().split('#');

	for (var i = 1; i < hashes_.length; i++) {
		var temp = hashes_[i].split('/');
		hashes[temp.shift()] = '/'+temp.join('/');
	}

	// Paths
	self.paths = window.location.pathname;
	return self;
}

self.parse();

})();