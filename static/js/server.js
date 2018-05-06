function loadServerModules(){
    var serverModulesRequest = new XMLHttpRequest();
    serverModulesRequest.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200)
        var selection = document.getElementById("selection");
        selection.innerHTML = serverModulesRequest.responseText + selection.innerHTML;
    }
    serverModulesRequest.open("GET", "/servermodules", true);
    serverModulesRequest.setRequestHeader("Content-Type", "application/json");
    serverModulesRequest.send(JSON.stringify({
        "Discord_Server_Id": document.body.id
    }));
}
loadServerModules();

var menuRequest = new XMLHttpRequest();
menuRequest.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200)
        document.getElementById("menu").innerHTML = menuRequest.responseText;
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

function showAvailableModules() {
    openMenu();
    menuRequest.open("GET", "/allmodules", true);
    menuRequest.send();
}

function addModule(moduleName){
    var addModuleRequest = new XMLHttpRequest();
    addModuleRequest.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200)
            alert("Module added!");
    }
    addModuleRequest.open("POST", "/addmodule", true);
    addModuleRequest.setRequestHeader("Content-Type", "application/json");
    addModuleRequest.send(JSON.stringify({
        "Discord_Server_Id": document.body.id,
        "Discat_Module_Name": moduleName
    }));


}