module.exports = {
    // URL path
    path: '/test/page2',
 
    // Response handler
    response:function(req, res, closeConnection){
        res.writeHead(200);
        var data = {title:"Visited Page 2"};
        closeConnection('<!-- SF-Special:'+JSON.stringify(data)+'--><div sf-page="test/page2">This is page 2</div>');
    },
 
    // Scope initialization after script loaded
    scope:function(ref, allRef){}
}