var app = require("isotope").create(7088);
var redis = require("redis");
var btoa = require('btoa');
var atob = require('atob');
var uuid = require('node-uuid');
var Mark = require("markup-js");
var fs = require("fs");

var esc = require('escape-html');

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

//deleteH("auth");
//deleteH("cookies");




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
    usercookie.time = currentTime+(expiry*1000*60*60);
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
                if(!(/[^a-zA-Z0-9]/.test(client.user)) || client.user.length < 20) {
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
                    res.writeHead(420, {"Content-Type": "text/plain"});
                    res.end("bad username bro");
                }
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

app.auth = function(res, req, cb) {
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
                        cb(obj.user);
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
}

app.template = function(res, file, context) {
    fs.readFile(process.cwd() + "/" + file, "utf8", function (err, template) {
        result = Mark.up(template, context);
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(result);
    });
}

app.get("nomic", function(res, req) {
    app.auth(res, req, function(user) {
        client.smembers(user+"-games", function(err, members) {
            if (members===null) members=[];
            app.template(res, "content/views/nomic.html", {
                "name" : user,
                "ongoing" : members
            });
        });
    });
});

app.get("nomic/_var", function(res, req, game) {
    app.auth(res, req, function(user) {
        client.smembers(user+"-games", function(err, members) {
            if (members===null) members=[];
            client.hget(game, 'owner', function(err, owner) {
                client.hget(game, 'votes', function(err, votesUUID) {
                    client.hexists(votesUUID, user, function(err, exists) {
                        client.hget(game, 'rule', function(err, rule) {
                            if (owner === null) {
                                res.writeHead(404, {"Content-Type":"text/plain"});
                                res.end();
                            } else {
                                app.template(res, "content/views/nomic.html", {
                                    "name" : user,
                                    "ongoing" : members,
                                    "data": true,
                                    "isOP": user===owner,
                                    "hasNotVoted": exists===0,
                                    "ruleBody": rule,
                                    "ruleTitle": 'generic title for a rule',
                                    "game": game
                                });
                            }
                        });
                    });
                });
            });
        });
    });
});

NOPE = function(a, b){};

app.post("game/subscribe", function(res, req) {
    app.auth(res, req, function(user) {
        app.extract_data(req, function(data) {
            data = data.subscribeid;
            client.hget(data, 'owner', function(e, owner) {
                if (owner === null) {
                    res.writeHead(404, {"Content-Type":"text/plain"});
                    res.end();
                } else {
                    client.hget(data, "users", function(err, usersUUID) {
                        client.sismember(usersUUID, user, function(err, is) {
                            if (is === 1) {
                                res.writeHead(420, {"Content-Type":"text/plain"});
                                res.end(user+"... chill, bro");
                            } else {
                                client.sadd(usersUUID, user, NOPE);
                                client.sadd(user+"-games", data, NOPE);
                                res.writeHead(200, {"Content-Type":"text/plain"});
                                res.end(data);
                            }
                        });
                    });
                }
            });
        });
    });
});

app.post("game/create", function(res, req) {
    app.auth(res, req, function(user) {
        app.extract_data(req, function(data) {
            data = data.subscribeid;
            client.hexists(data, 'owner', function(e, owner) {
                if (owner !== 0) {
                    res.writeHead(409, {"Content-Type":"text/plain"});
                    res.end();
                } else {
                    var votes = uuid.v4();
                    var users = uuid.v4();
                    client.hset(data, 'owner', user , NOPE);
                    client.hset(data, 'rule' , ''   , NOPE);
                    client.hset(data, 'votes', votes, NOPE);
                    client.hset(data, 'users', users, NOPE);

                    client.sadd(users, user, NOPE);
                    client.sadd(user+"-games", data, NOPE);
                    res.writeHead(200, {"Content-Type":"text/plain"});
                    res.end(data);
                }
            });
        });
    });
});

app.post("game/propose/_var", function(res, req, game) {
    app.auth(res, req, function(user) {
        client.hget(game, 'owner', function(err, owner) {
            if (user === owner) {
                app.extract_data(req, function(data) {
                    data = esc(data.content);
                    client.hset(game, 'rule', data, NOPE);
                    client.hget(game, 'votes', function(err, votesUUID) {
                        deleteH(votesUUID);
                    });
                    res.writeHead(200, {"Content-Type":"text/plain"});
                    res.end();
                });
            } else {
                unauthorized(res);
            }
        });
    });
});

app.post("game/vote/_var", function(res, req, game) {
    app.auth(res, req, function(user) {
        client.hget(game, 'users', function(err, usersUUID) {
            client.sismember(usersUUID, user, function(err, is) {
                if (is === 1) {
                    client.hget(game, 'votes', function(err, votesUUID) {
                        app.extract_data(req, function(data) {
                            if (data.vote === 'yea' || data.vote === 'nay' || data.vote === 'abstain') {
                                client.hset(votesUUID, user, data.vote, NOPE);
                                res.writeHead(200, {"Content-Type":"text/plain"});
                                res.end("vote accepted");
                            } else {
                                res.writeHead(420, {"Content-Type":"text/plain"});
                                res.end("fuck you for voting "+data);
                            }
                        });
                    });
                } else {
                    res.writeHead(401, {"Content-Type":"text/plain"});
                    res.end();
                }
            });
        });
    });
});

app.get("game/votestatus/_var", function(res, req, game) {
    client.hget(game, 'users', function(err, usersUUID) {
        client.hget(game, 'votes', function(err, votesUUID) {
            client.scard(usersUUID, function(err, usersCount) {
                client.hlen(votesUUID, function(err, votesCount) {
                    if (usersCount !== votesCount) {
                        res.writeHead(405, {"Content-Type":"text/plain"});
                        res.end("in progress");
                    } else {
                        client.hgetall(votesUUID, function(err, votes) {
                            app.template(res, "content/views/results.html", {
                                "votes": votes===null?[]:Object.keys(votes).map(function(each) {
                                    return {"name":each, "vote":votes[each]};
                                })
                            });
                        });
                    }
                });
            });
        });
    });
});

app.post("game/vote/_var/forceabstain", function(res, req, game) {
    app.auth(res, req, function(user) {
        client.hget(game, 'owner', function(err, owner) {
            if (user === owner) {
                client.hget(game, 'users', function(err, usersUUID) {
                    client.smembers(usersUUID, function(err, users) {
                        client.hget(game, 'votes', function(err, votesUUID) {
                            var countdown = users.length;
                            users.forEach(function(each) {
                                client.hexists(votesUUID, each, function(err, exists) {
                                    if (exists === 0) {
                                        client.hset(votesUUID, each, 'abstain', NOPE);
                                    }
                                    if (--countdown == 0) {
                                        res.writeHead(200, {"Content-Type":"text/plain"});
                                        res.end();
                                    }
                                });
                            });
                        });
                    });
                });
            } else {
                unauthorized(res);
            }
        });
    });
});
