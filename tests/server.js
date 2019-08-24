var Serberries = require('serberries');
 
var myserver = new Serberries({
    path:__dirname+'/router' // Required as logic folder
    // (Put all your router on root folder)
});

// Set public folder for serving static assets
myserver.setPublicFolder(__dirname+"/../");
 
myserver.on('error', function(errcode, msg, trace){
    console.error("Error code: "+errcode+' ('+msg+')');
    if(trace){
        console.error(trace.message);
        for (var i = 0; i < trace.stack.length; i++) {
            console.error("   at "+trace.stack[i]);
        }
    }
    console.error("");
});
 
myserver.on('loading', function(filename){
    console.log('Loading '+filename);
});
 
myserver.on('loaded', function(urlpath, type){
    console.log('URL to '+urlpath+' was '+type);
});
 
myserver.on('stop', function(){
    console.log("Server shutdown");
});
 
myserver.on('started', function(){
    console.log("Server was started");
});
 
myserver.on('removed', function(urlpath){
    console.log('URL to '+urlpath+' was removed');
});
 
myserver.on('httpstatus', function(code, callback){
    callback('Returning HTTP status '+code);
});
 
myserver.on('navigation', function(data){
    console.log("Navigation to '"+data.path+"'");
    console.log('  - '+data.headers['user-agent']);
});
 
console.log("Server started http://localhost:2000\n");
myserver.start(2000);