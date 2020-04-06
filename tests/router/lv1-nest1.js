module.exports = {
    // URL path
    path: '/test/lv1/nest1',
 
    // Response handler
    response:function(req, res, closeConnection){
        res.writeHead(200);
        var data = {title:"You're at nest 1-1"};
        closeConnection('<!-- SF-View-Data:'+JSON.stringify(data)+'--><div>This is nest 1<nested2-view>Default exist</nested2-view></div>');
    },
 
    // Scope initialization after script loaded
    scope:function(ref, allRef){}
}