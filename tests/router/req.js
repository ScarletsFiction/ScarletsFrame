var fs = require('fs');
module.exports = {
    // URL path
    path: '/req',
 
    // Response handler
    response:function(req, res, closeConnection){
        res.writeHead(200);
        closeConnection(JSON.stringify({get:req.get, post:req.post}));
    },
 
    // Scope initialization after script loaded
    scope:function(ref, allRef){}
}