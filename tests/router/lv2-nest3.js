module.exports = {
    // URL path
    path: '/test/lv2/nest3',
 
    // Response handler
    response:function(req, res, closeConnection){
        res.writeHead(200);
        var data = {title:"You're at nest 2-3"};
        closeConnection('<!-- SF-View-Data:'+JSON.stringify(data)+'--><div>Deep nest 3</div>');
    },
 
    // Scope initialization after script loaded
    scope:function(ref, allRef){}
}