;(function(){
var self = sf.url = function(){
	// Hashes
	var hashes_ = '';
	for(var keys in hashes)
		hashes_ += '#'+keys+hashes[keys];

			// Paths
	return '/'+self.paths.join('/') + hashes_;
}

self.index = 0;

var hashes = self.hashes = {};
self.paths = [];

// Push into latest history
self.push = function(){
	window.history.pushState(self.index, '', self);
}

// Remove next history and change current history
self.replace = function(){
	window.history.replaceState(self.index, '', self);
}

self.parse = function(){
	// Hashes
	var hashes_ = window.location.hash.split('#');

	for (var i = 1; i < hashes_.length; i++) {
		var temp = hashes_[i].split('/');
		hashes[temp.shift()] = '/'+temp.join('/');
	}

	// Paths
	self.paths = window.location.pathname.slice(1).split('/');
}

self.parse();

})();