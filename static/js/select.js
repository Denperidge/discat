var request = new XMLHttpRequest();
request.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
        document.getElementById("menu").style.visibility = "hidden";
        console.log(request.responseText);
        console.log(request);
    }
}
function requestOwnedServers() {
    request.open("GET", "/server", true);
    request.send();
}