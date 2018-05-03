function Focus(parent, opacity, instantFireCallback, callback) {
    // instantFireCallback: should callback be fired after overlay has dissapeared or instantly?
    var overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.left = 0;
    overlay.style.top = 0;
    overlay.style.right = 0;
    overlay.style.bottom = 0;

    overlay.style.backgroundColor = "#000000";

    overlay.style.zIndex = 9;
    parent.style.zIndex = 10;

    overlay.style.opacity = 0;
    var fadeIn = setInterval(function () {
        overlay.style.opacity = parseFloat(overlay.style.opacity) + opacity / 100;
        if (overlay.style.opacity == opacity) {
            clearInterval(fadeIn);
        }
    }, 10);


    overlay.onclick = function (e) {
        // When user clicks overlay (thus closing parent), fire click event as if overlay was never there
        overlay.style.pointerEvents = "none";
        document.elementFromPoint(e.clientX, e.clientY).click();

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
