module.exports = {
    // URL path
    path: '/test/lv2/nest1',
 
    // Response handler
    response:function(req, res, closeConnection){
        res.writeHead(200);
        var data = {title:"Now you're at nest 1"};
        closeConnection('<!-- SF-View-Data:'+JSON.stringify(data)+'--><div>Deep nest 1</div>');
    },
 
    // Scope initialization after script loaded
    scope:function(ref, allRef){}
}