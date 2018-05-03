function openMenu() {
    var menu = document.getElementById("menu");
    Focus(menu, 0.5, false, true, function () {
        menu.style.visibility = "hidden";
        menu.style.height = "0%";
    });
    menu.style.visibility = "visible";
    menu.style.height = "80%";
}

function addModule() {
    openMenu();
}