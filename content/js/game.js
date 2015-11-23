subscribe = function() {
    value = $("#joingame").val();
    $("#joingame").val("");
    console.log(value);
    $.post("/game/subscribe", {
        "subscribeid": value
    }, function(res) {
        $("<div class='btn-game btn'><a href='/nomic/"+res+"'>"+res+"</a></div>").insertAfter($("#greeter"));
    }).fail(function(res) {
        alert("failed joining " + JSON.stringify(res));
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
        alert("failed creating "+ JSON.stringify(res));
    });
}

submitContent = function(game) {
    value = $("#submissionText").val();
    $("#submissionText").val("");
    $.post("/game/propose/"+game, {
        "content": value
    }, function(res) {
        location.reload();
    }).fail(function(res) {
        alert("failed propose " + JSON.stringify(res));
    });
}

vote = function(game, vote) {
    $.post("/game/vote/"+game, {
        "vote": vote
    }, function(res) {
        location.reload();
    }).fail(function(res) {
        alert("failed vote " + JSON.stringify(res));
    });
}

forceAbstain = function(game) {
    $.post("/game/vote/"+game+"/forceabstain", function(success) {
        location.reload();
    }).fail(function(res) {
        alert("failed forced abstain " + JSON.stringify(res));
    });
}
