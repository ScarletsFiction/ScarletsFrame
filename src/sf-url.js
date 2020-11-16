;(function(){
const self = sf.url = function(){
	// Hash
	let _hash = '';
	let hash = self.routes;
	for(let key in hash){
		if(hash[key] === '/') continue;
		_hash += `#${key}${hash[key]}`;
	}

	// Query
	let _query = '';
	let query = self.query;
	for(let key in query)
		_query += `${(_query.length === 0 ? '?' : '&')}${key}=${encodeURI(query[key])}`;

	// Data
	let _data = '';
	let data = self.data;
	for(let key in data){
		var dat = data[key];

		if(dat !== null){
			if(dat.constructor === Array || dat.constructor === String)
				validateURLData(dat);

			if(dat.constructor === Array)
				dat = dat.join(',');
			_data += `;${key}:${dat}`;
		}
		else _data += `;${key}`;
	}

	return `${self.path}${_query}${_hash}${
		(_data.length === 0 ? '' : `#${encodeURI(_data)}`)
	}`;
};

self.path = '/'; // Main URL path without hash/query/data
self.routes = {}; // Used for sf-views for multiple hash routes
self.query = {}; // GET query parameter on the URL
self.data = {}; // {UniqID: [String, ...], UniqID: String}

// Shortcut
const history = window.history;
const location = window.location;

// Push into latest history
self.push = function(){
	history.pushState((history.state || 0) + 1, '', self());
	self.trigger();
}

// Remove next history and change current history
self.replace = function(){
	history.replaceState(history.state, '', self());
	self.trigger();
}

// If url === true, it will parse current URL save the data into sf.url
// If url is String, it will parse the String and create new object to save the data
self.parse = function(url){
	let obj, URLQuery, URLHash, URLData;

	if(url === true){
		obj = self;
		obj.path = location.pathname;

		obj.query = {};
		obj.routes = {};
		obj.data = {};

		[URLHash, URLData] = location.hash.split('#;');
		if(location.search.length !== 0)
			URLQuery = location.search.slice(1);

		if(URLHash.length !== 0)
			URLHash = URLHash.slice(1).split('#');
		else URLHash = void 0;
	}
	else{
		obj = {routes:{}, query:{}, data:{}};
		URLQuery = url.split('?');

		// /URLPath#URLHash#;URLData
		if(URLQuery.length === 1){
			[URLHash, URLData] = URLQuery[0].split('#;');
		    URLQuery = void 0;

		    if(URLHash.includes('#')){
		      URLHash = URLHash.split('#');
		      obj.path = URLHash.shift();
		    }
		    else{
		        obj.path = URLHash;
		        URLHash = void 0;
		    }
		}
		// /URLPath?URLQuery#URLHash#;URLData
		else{
			obj.path = URLQuery[0];
			[URLHash, URLData] = URLQuery[1].split('#;');

		    if(URLHash.includes('#')){
		        URLHash = URLHash.split('#');
		        URLQuery = URLHash.shift();
		    }
		    else{
		        URLQuery = URLHash;
		        URLHash = void 0;
		    }
		}
	}

	let query = obj.query;
	let routes = obj.routes;
	let data = obj.data;

	if(URLQuery !== void 0){
		URLQuery = URLQuery.split('&');
		for (var i = 0; i < URLQuery.length; i++) {
			var temp = URLQuery[i].split('=');
			query[temp[0]] = decodeURI(temp[1]);
		}
	}

	if(URLHash !== void 0){
		for (var i = 0; i < URLHash.length; i++) {
			const temp = URLHash[i].split('/');
			routes[temp.shift()] = `/${temp.join('/')}`;
		}
	}

	if(URLData !== void 0){
		URLData = decodeURI(URLData).split(';');
		for (var i = 0; i < URLData.length; i++) {
			const temp = URLData[i].split(':');
			data[temp[0]] = temp.length === 1 ? null : temp[1].split(',');
		}
	}

	return obj;
}

const URLDataValidator = /[,:;]/;
function validateURLData(dat){
	if(dat.constructor === Array){
		for (var i = 0; i < dat.length; i++) {
			const data = dat[i];
			if(data.constructor === Number) continue;

			if(URLDataValidator.test(data)){
				console.log('URLData got:', dat);
				throw new Error("URL data must not contain , : or ; symbol");
			}
		}
		return;
	}

	if(URLDataValidator.test(dat)){
		console.log('URLData got:', dat);
		throw new Error("URL data must not contain , : or ; symbol");
	}
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

self.trigger = function(){
	for(var key in listener){
		const list = listener[key];
		if(list.length === 0) continue;

		for (var i = 0; i < list.length; i++) {
			const callback = list[i];
			if(callback.path !== void 0 && callback.path !== self.path)
				continue;

			callback(self[key]);

			if(callback.once)
				list.splice(i--, 1);
		}
	}
}

self.parse(true);
})();