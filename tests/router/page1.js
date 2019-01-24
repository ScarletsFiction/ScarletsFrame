module.exports = {
    // URL path
    path: '/test/page1',
 
    // Response handler
    response:function(req, res, closeConnection){
        res.writeHead(200);
        var data = {title:"Now you're at page 1"};
        closeConnection('<!-- SF-Special:'+JSON.stringify(data)+'--><div sf-page="test/page1">This is page 1</div>');
    },
 
    // Scope initialization after script loaded
    scope:function(ref, allRef){}
}