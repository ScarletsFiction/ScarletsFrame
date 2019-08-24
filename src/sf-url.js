;(function(){
var self = sf.url = function(){
	// Hashes
	var hashes_ = '';
	for(var keys in hashes)
		hashes_ += '#'+keys+hashes[keys];

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

self.parse = function(){
	self.data = window.location.hash.split('|');
	var hashes_ = self.data.shift().split('#');

	for (var i = 1; i < hashes_.length; i++) {
		var temp = hashes_[i].split('/');
		hashes[temp.shift()] = '/'+temp.join('/');
	}

	// Paths
	self.paths = window.location.pathname;
}

self.parse();

})();