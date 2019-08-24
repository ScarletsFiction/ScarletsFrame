var fs = require('fs');
module.exports = {
    // URL path
    path: '/',
 
    // Response handler
    response:function(req, res, closeConnection){
        res.writeHead(200);
        closeConnection(fs.readFileSync(__dirname+"/../index.html", 'utf8'));
    },
 
    // Scope initialization after script loaded
    scope:function(ref, allRef){}
}