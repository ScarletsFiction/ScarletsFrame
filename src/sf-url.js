function url(){
	// Hashes
	let hashes_ = '';
	for(let keys in hashes){
		if(hashes[keys] === '/') continue;
		hashes_ += `#${keys}${hashes[keys]}`;
	}

	const data_ = `|${url.data.join('|')}`;

	return url.paths + hashes_ + (data_.length !== 1 ? data_ : '');
};

exports.url = url;

let hashes = url.hashes = {};
exports.hashes = hashes;

url.data = [];
exports.data = url.data;

url.paths = '/';
exports.paths = url.paths;

// Push into latest history
function push(){
	window.history.pushState((window.history.state || 0) + 1, '', self());
}

exports.push = push;

// Remove next history and change current history
function replace(){
	window.history.replaceState(window.history.state, '', self());
}

exports.replace = replace;

function get(name, index){
	url.parse();

	if(name.constructor === Number)
		return url.paths.split('/')[name+1];

	if(hashes[name] === void 0)
		return;

	return hashes[name].split('/')[index+1];
}

exports.get = get;

function parse(url){
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

	url.data = window.location.hash.split('|');
	var hashes_ = url.data.shift().split('#');

	hashes = url.hashes = {};
	for (var i = 1; i < hashes_.length; i++) {
		var temp = hashes_[i].split('/');
		hashes[temp.shift()] = `/${temp.join('/')}`;
	}

	// Paths
	url.paths = window.location.pathname;
	return self;
}

exports.parse = parse;
url.parse();
