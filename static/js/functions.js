function Focus(parent, opacity, clickthrough, instantFireCallback, callback) {
    // instantFireCallback: should callback be fired after overlay has dissapeared or instantly?
    var overlay = document.createElement("div");
    overlay.id = "overlay";

    overlay.style.position = "fixed";
    overlay.style.left = 0;
    overlay.style.top = 0;
    overlay.style.right = 0;
    overlay.style.bottom = 0;

    overlay.style.backgroundColor = "#000000";

    overlay.style.zIndex = 9;
    parent.style.zIndex = 10;
    parent.style.position = "relative";

    overlay.style.opacity = 0;
    var fadeIn = setInterval(function () {
        overlay.style.opacity = parseFloat(overlay.style.opacity) + opacity / 100;
        if (overlay.style.opacity == opacity) {
            clearInterval(fadeIn);
        }
    }, 10);


    overlay.onclick = function (e) {
        if (clickthrough){
            // When user clicks overlay (thus closing parent), fire click event as if overlay was never there if desired
            overlay.style.pointerEvents = "none";
            document.elementFromPoint(e.clientX, e.clientY).click();
        }
        
        clearInterval(fadeIn);  // If fadein couldn't finish, make sure it doesn't try to
        if (instantFireCallback) callback();

        var fadeOut = setInterval(function () {
            overlay.style.opacity = parseFloat(overlay.style.opacity) - opacity / 100;
            if (overlay.style.opacity == 0) {
                clearInterval(fadeOut);
                document.body.removeChild(overlay);
                if (!instantFireCallback) callback();
            }
        }, 10);
    }

    document.body.appendChild(overlay);
}

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