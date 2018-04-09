function logout(){
    sessionStorage.removeItem("accesscode");
    window.location = "/";
}

function authenticate(){
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4) {
            if (this.status == 200){
                console.log(xhttp.responseText);
            }
            else if (this.status == 401){
                logout();
            }
        }
    };
    xhttp.open("GET", "https://discordapp.com/api/users/@me/guilds", true);
    xhttp.setRequestHeader('Authorization', "Bearer " + sessionStorage.getItem("accesscode"));
    xhttp.send();
}
authenticate();