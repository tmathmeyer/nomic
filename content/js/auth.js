String.prototype.hashCode = function() {
    var hash = 0, i, chr, len;
    if (this.length == 0) return hash;
    for (i = 0, len = this.length; i < len; i++) {
        chr   = this.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

auth = function(url, cb) {
    var pass = $("#password").val();
    var user = $("#username").val();
        pass = (pass.hashCode() ^ user.hashCode()) + "" + (user+pass).hashCode();
    pass = pass.hashCode() + pass;
    pass = window.btoa(unescape(encodeURIComponent(pass)));

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
