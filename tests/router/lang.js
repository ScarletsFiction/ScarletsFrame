var languages = {
    en_US:{
        second:'Second!',
        my:{
            test:'My Test!'
        },
        stuff:{
            chicken:'Rooster!',
            game:'Harvestmoon!',
        },
        another:{
            day:'Sunday!',
            friend:'Aliz!',
        },
    }
};

module.exports = {
    // URL path
    path: '/test/lang',
 
    // Response handler
    response:function(req, res, closeConnection){
        var lang = languages[req.post.lang];
        if(!lang){
        	res.writeHead(404);
        	closeConnection("Language was not found for: "+req.post.lang);
        }

        var json = JSON.parse(req.post.paths);
        res.writeHead(200);
        var obj = {};

        // These implementation could be more better
        if(json.my && json.my.test)
        	obj.my = {test:lang.my.test};

        if(json.second)
            obj.second = lang.second;

        if(json.stuff){
            obj.stuff = {};

            if(json.stuff.chicken)
                obj.stuff.chicken = lang.stuff.chicken;
            if(json.stuff.game)
                obj.stuff.game = lang.stuff.game;
        }

        if(json.another){
            obj.another = {};

            if(json.another.day)
                obj.another.day = lang.another.day;
            if(json.another.friend)
                obj.another.friend = lang.another.friend;
        }

        closeConnection(JSON.stringify(obj));
    },
 
    // Scope initialization after script loaded
    scope:function(ref, allRef){}
}