module.exports = {
    // URL path
    path: '/test/page2',
 
    // Response handler
    response:function(req, res, closeConnection){
        res.writeHead(200);
        var data = {title:"Page 2"};
        closeConnection('<!-- SF-View-Data:'+JSON.stringify(data)+`--><div>This is page 2
    <nested-view>Raw Henlo</nested-view>
</div>`);
    },
 
    // Scope initialization after script loaded
    scope:function(ref, allRef){}
}