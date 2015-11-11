create = function() {
    value = $("#joingame").val();
    $("#joingame").val("");
    console.log(value);
    $.post("/game/subscribe", {
        "subscribeid": value
    }, function(res) {
        $("<div class='btn-game btn'>"+res+"</div>").insertAfter($("#greeter"));
    }).fail(function(res) {
        alert("Can't put penis there");
    });
}
