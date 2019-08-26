var languages = {en:{second:'Second!', my:{test:'My Test!'}}};
// These implementation could be more better

module.exports = {
    // URL path
    path: '/test/lang',
 
    // Response handler
    response:function(req, res, closeConnection){
        var lang = languages[req.post.lang];
        if(!lang){
        	res.writeHead(404);
        	closeConnection("Language was not found for: "+req.post.lang);
        }

        var json = JSON.parse(req.post.paths);
        res.writeHead(200);
        var obj = {};

        if(json.my && json.my.test)
        	obj.my = {test:lang.my.test};
        
        if(json.second)
        	obj.second = lang.second;

        closeConnection(JSON.stringify(obj));
    },
 
    // Scope initialization after script loaded
    scope:function(ref, allRef){}
}