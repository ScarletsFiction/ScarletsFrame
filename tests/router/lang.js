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
    },
    id_ID:{
        second:'Kedua!',
        my:{
            test:'Tes saya!'
        },
        stuff:{
            chicken:'Berkokok!',
            game:'Back to nature!',
        },
        another:{
            day:'Minggu!',
            friend:'Nyam!',
        }
    },
    ja_JP:{
        translated:'{data}翻訳済み',
        hello:{
            other:{
                side:"[反対側]からこんにちは"
            }
        },
        "i'm":{
            here:"私はここにいます！"
        },
        second:'第二!',
        my:{
            test:'私のテスト!'
        },
        stuff:{
            chicken:'オンドリ!',
            game:'中秋の名月!',
        },
        another:{
            day:'日曜日!',
            friend:'Aliz!',
        },
        custom:{
          el:{
            iB1:"可変コンテンツ：{inputBinding1}",
            iB2:"上記のコンテンツ：{inputBinding2.text}",
            iB3:"それは{inputBinding2.text}です"
          }
        }
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

        if(json.translated)
            obj.translated = lang.translated;
        
        if(json.second)
            obj.second = lang.second;

        if(json.hello)
            obj.hello = lang.hello;

        if(json["i'm"])
            obj["i'm"] = lang["i'm"];

        if(json.custom)
            obj.custom = lang.custom;

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