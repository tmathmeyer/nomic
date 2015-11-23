auth = function(url, cb) {
    var pass = $("#password").val();
    var user = $("#username").val();
    if (/\s/.test(user)) {
        alert("no spaces in username!");
        return;
    }
    pass = hex_sha512(pass);
    var postData = {"user":user,"pass":pass};
    $.post(url, postData, cb).fail(cb);
}

onStatusChangeWho = function(url, Mstat, elem) {
    auth(url, function(res, stat, xhr) {
        if (stat === "error") {
            if (res.status === Mstat) {
                elem.toggleClass("shadowOK").toggleClass("shadowBAD");
            }
        } else {
            console.log(stat.status);
            console.log(Mstat);
            document.cookie = "auth="+res;
            window.location.href = "/nomic";
        }
    });

}

login = function() {
    onStatusChangeWho("auth/log", 401, $("#password"));
}

register = function() {
    onStatusChangeWho("auth/reg", 409, $("#username"));
}
