module.exports = {
    // URL path
    path: '/test/page1',
 
    // Response handler
    response:function(req, res, closeConnection){
        res.writeHead(200);
        var data = {title:"Now you're at page 1"};
        closeConnection('<!-- SF-View-Data:'+JSON.stringify(data)+`--><div>This is page 1
    <nested-view>Raw Henlo</nested-view>
</div>`);
    },
 
    // Scope initialization after script loaded
    scope:function(ref, allRef){}
}