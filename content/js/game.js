subscribe = function() {
    value = $("#joingame").val();
    $("#joingame").val("");
    console.log(value);
    $.post("/game/subscribe", {
        "subscribeid": value
    }, function(res) {
        $("<div class='btn-game btn'><a href='/nomic/"+res+"'>"+res+"</a></div>").insertAfter($("#greeter"));
    }).fail(function(res) {
        alert("Can't put penis there" + JSON.stringify(res));
    });
}

create = function() {
    value = $("#newgame").val();
    $("#newgame").val("");
    $.post("/game/create", {
        "subscribeid": value
    }, function(res) {
        $("<div class='btn-game btn'><a href='/nomic/"+res+"'>"+res+"</a></div>").insertAfter($("#greeter"));
    }).fail(function(res) {
        alert("Can't put penis in: "+ JSON.stringify(res));
    });
}

submitContent = function(game) {
    value = $("#submissionText").val();
    $("#submissionText").val("");
    $.post("/game/propose/"+game, {
        "content": value
    }, function(res) {
        alert("success");
        location.reload();
    }).fail(function(res) {
        alert("you've got a tiny dick because " + JSON.stringify(res));
    });
}

vote = function(game, vote) {
    $.post("/game/vote/"+game, {
        "vote": vote
    }, function(res) {
        alert('ya voted');
        location.reload();
    }).fail(function(res) {
        alert("try sticking it in the other hole " + JSON.stringify(res));
    });
}

forceAbstain = function(game) {
    $.post("/game/vote/"+game+"/forceabstain", function(success) {
        alert('votes forced');
        location.reload();
    }).fail(function(res) {
        alert("you need a viagra for that " + JSON.stringify(res));
    });
}
