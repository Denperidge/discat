var request = new XMLHttpRequest();
request.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
        document.getElementById("menu").innerHTML = request.responseText;

        /*
        // Set server ID in all the modules (may change later in other menus)
        var modulelinks = document.getElementsByClassName("module");
        for (var i = 0; i < modulelinks.length; i++)
            modulelinks[i].href = modulelinks[i].href.replace("{0}", window.location.href.split("=")[1]);
            */
    }
}

function openMenu() {
    var menu = document.getElementById("menu");
    Focus(menu, 0.5, false, true, function () {
        menu.style.visibility = "hidden";
        menu.style.height = "0%";
        menu.innerHTML = "";
    });
    menu.style.visibility = "visible";
    menu.style.height = "80%";
}

function addModule() {
    openMenu();
    request.open("GET", "/modules", true);
    request.send();
}