var menuRequest = new XMLHttpRequest();
menuRequest.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200)
        document.getElementById("menu").innerHTML += menuRequest.responseText;
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

function saveServerSettings(){
    var saveServerSettingsRequest = new XMLHttpRequest();
    saveServerSettingsRequest.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200)
            location.reload();
    }
    saveServerSettingsRequest.open("PATCH", "/saveserversettings", true);
    saveServerSettingsRequest.setRequestHeader("Content-Type", "application/json");
    saveServerSettingsRequest.send(JSON.stringify({
        "Discord_Server_Id": document.body.id,
        "Discat_Prefix": document.getElementById("prefix").value
    }));
}

function addModule(moduleName) {
    var addModuleRequest = new XMLHttpRequest();
    addModuleRequest.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200)
            location.reload();
    }
    addModuleRequest.open("POST", "/addmodule", true);
    addModuleRequest.setRequestHeader("Content-Type", "application/json");
    addModuleRequest.send(JSON.stringify({
        "Discord_Server_Id": document.body.id,
        "Discat_Module_Name": moduleName
    }));
}

function removeModule(moduleName){
    var removeModuleRequest = new XMLHttpRequest();
    removeModuleRequest.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200)
            location.reload();
    }
    removeModuleRequest.open("DELETE", "/removemodule", true);
    removeModuleRequest.setRequestHeader("Content-Type", "application/json");
    removeModuleRequest.send(JSON.stringify({
        "Discord_Server_Id": document.body.id,
        "Discat_Module_Name": moduleName
    }));
}

function openModuleSettings(moduleName){
    openMenu();
    menuRequest.open("GET", "/moduleserversettings?serverId=" + document.body.id + "&" + "modulename=" + moduleName, true);
    menuRequest.send();

    var buttons = document.createElement("div");
    buttons.id = "buttons";

    var btnSave = document.createElement("button");
    btnSave.id = "btnSave";
    btnSave.innerHTML = "Save";
    btnSave.onclick = function(){
        
    };
    

    var btnCancel = document.createElement("button");
    btnCancel.id = "btnCancel";
    btnCancel.innerHTML = "Cancel";
    btnCancel.onclick = function(){
        document.getElementById("overlay").click();
    };

    buttons.appendChild(btnCancel);
    buttons.appendChild(btnSave);

    document.getElementById("menu").appendChild(buttons);
}