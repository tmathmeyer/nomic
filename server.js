var app = require("isotope").create(8080);
var redis = require("redis");
var btoa = require('btoa');
var atob = require('atob');
var uuid = require('node-uuid');

var client = redis.createClient();

client.on("error", function (err) {
    console.log("Error " + err);
});

deleteH = function(map) {
    client.hkeys(map, function (err, replies) {
        replies.forEach(function (reply, i) {
            client.hdel(map, reply, redis.print);
        });
    });
}

deleteH("auth");
deleteH("cookies");




app.cookies = function parseCookies (request) {
    var list = {},
    rc = request.headers.cookie;

    rc && rc.split(';').forEach(function( cookie ) {
        var parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });

    return list;
}

authcookie = function(resp, expiry, usercookie) {
    var currentTime = (new Date).getTime();
    usercookie.time = currentTime+(expiry*1000*60);
    var cookie = btoa(JSON.stringify(usercookie));
    resp.writeHead(200, {
        "Content-Type": "text/plain",
        "Set-Cookie": "auth="+cookie
    });
    resp.end(cookie);
}

gencookie = function(username, cb) {
    uid = uuid.v4();
    client.hset("cookies", username, uid, function(e, s) {
        cb({
            "user":username,
            "cookie":uid
        });
    });
}

unauthorized = function(res) {
    res.writeHead(401, {"Content-Type": "text/plain"});
    res.end("unauthorized");
}



app.get("", function(res) {
    res.stream.relative("content/index.html");
});

app.get("static/_var/_var", function(res, req, type, file) {
    res.stream.relative("content/"+type+"/"+file);
});

app.post("auth/reg", function(res, req) {
    app.extract_data(req, function(data){
        client.hexists("auth", data.user, function(e, exists) {
            if (exists===0) {
                client.hset("auth", data.user, data.pass, function(e, s) {
                    if (s === 1) {
                        gencookie(data.user, function(d) {
                            authcookie(res, 3, d);
                        });
                    } else {
                        res.writeHead(500, {"Content-Type": "text/plain"});
                        res.end("could not register");
                    }
                });
            } else {
                res.writeHead(409, {"Content-Type": "text/plain"});
                res.end("user already exists");
            }
        });
    });
});

app.post("auth/log", function(res, req) {
    app.extract_data(req, function(data) {
        client.hexists("auth", data.user, function(e, exists) {
            if (exists === 0) {
                unauthorized(res);
            } else {
                client.hget("auth", data.user, function(e, pass) {
                    if (pass === data.pass) {
                        gencookie(data.user, function(d) {
                            authcookie(res, 3, d);
                        });
                    } else {
                        unauthorized(res);
                    }
                });
            }
        });
    });
});

app.get("nomic", function(res, req) {
    var authcookie = app.cookies(req);
    authcookie = authcookie['auth'];

    if (authcookie != null) {
        try {
            var obj = JSON.parse(atob(authcookie));
            if (obj == null) {
                unauthorized(res);
            } else {
                client.hget("cookies", obj.user, function(e, cookie) {
                    var currentTime = (new Date).getTime();
                    if (cookie === obj.cookie && obj.time > currentTime) {
                        res.writeHead(200, {"Content-Type":"text/html"});
                        res.end("YES");
                    } else {
                        unauthorized(res);
                    }
                });
            }
        } catch(err) {
            unauthorized(res)
        }
    } else {
        unauthorized(res);
    }
});
