module.exports = {
    // URL path
    path: '/test/page1/nest2',
 
    // Response handler
    response:function(req, res, closeConnection){
        res.writeHead(200);
        var data = {title:"Now you're at nest 2"};
        closeConnection('<!-- SF-View-Data:'+JSON.stringify(data)+'--><div>This is nest 2</div>');
    },
 
    // Scope initialization after script loaded
    scope:function(ref, allRef){}
}