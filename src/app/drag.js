// adapted from https://github.com/xem/miniDragAndDrop

// D = drag and drop persistent thing
exports.dragAndDrop = delegates => {
    // declare all variables at the front to help minify
    /** @type HTMLElement */
    let dragOrigin;
    /** @type HTMLElement */
    let dropTarget;
    /** @type HTMLElement */
    let dragContainer;
    /** @type HTMLElement */
    let newElement;
    /** @type boolean */
    let isDragging;
    /** @type number */
    let dragX;
    /** @type number */
    let dragY;
    /** @type number */
    let dragOffsetX;
    /** @type number */
    let dragOffsetY;
    /** @type boolean */
    let doDropResponse;
    const d = document;
    const onDrop = delegates.onDrop || (() => { });
    const onDrag = delegates.onDrag || (() => { });


    const pointerdown = e => {
        e.preventDefault();
        isDragging = 1;
        dragOrigin = null;
        dragContainer = null;
        if (e.touches) {
            dragOrigin = d.elementFromPoint(
                e.touches[0].pageX,
                e.touches[0].pageY
            );
        } else {
            dragOrigin = e.target;
        }
        while (dragOrigin != d && !dragOrigin.classList.contains("drag")) {
            dragOrigin = dragOrigin.parentNode;
        }
        if (dragOrigin == d) {
            dragOrigin = null;
        } else if (dragOrigin.parentNode.classList.contains("move") || dragOrigin.parentNode.classList.contains("copy")) {
            onDrag();
            dragX = e.touches ? e.touches[0].pageX : e.pageX;
            dragY = e.touches ? e.touches[0].pageY : e.pageY;
            const globalRect = dragOrigin.getBoundingClientRect();
            dragOffsetX = dragX - globalRect.left;
            dragOffsetY = dragY - globalRect.top;
            dragContainer = d.createElement('div');
            dragContainer.appendChild(dragOrigin.cloneNode(true))
            d.body.appendChild(dragContainer);
            if (dragOrigin.parentNode.classList.contains("move")) {
                dragOrigin.style.visibility = "hidden";
                dragOrigin.m = 1; // isMove
            }
            const s = dragContainer.style;
            s.position = "fixed";
            s.pointerEvents = "none";
            s.width = dragOrigin.clientWidth + 'px';
            s.height = dragOrigin.clientHeight + 'px';
            s.left = dragX - dragOffsetX - 8 + "px";
            s.top = dragY - dragOffsetY - 8 + "px";
        }
    }
    const pointermove = e => {
        e.preventDefault();
        if (isDragging && dragContainer) {
            dragX = (e.touches ? e.touches[0].pageX : e.pageX);
            dragY = (e.touches ? e.touches[0].pageY : e.pageY);
            dragContainer.style.left = dragX - dragOffsetX - 8 + "px";
            dragContainer.style.top = dragY - dragOffsetY - 8 + "px";
        }
    }

    const pointerup = e => {
        e.preventDefault();
        if (dragContainer) {
            isDragging = 0;
            if (e.touches) {
                dropTarget = d.elementFromPoint(
                    dragX,
                    dragY
                );
            } else {
                dropTarget = e.target;
            }

            // loop find a drop target until hits `document`
            while (dropTarget != d && !dropTarget.classList.contains("drop")) {
                dropTarget = dropTarget.parentNode;
            }
            if (dropTarget != d) { // if have a dropTarget
                let a;
                doDropResponse = (a = onDrop(dragContainer.firstChild, dropTarget), a == null || !!a);
                if (doDropResponse) {
                    newElement = dropTarget.appendChild(dragContainer.firstChild.cloneNode(true));
                    newElement.style.position = "";
                    newElement.style.pointerEvents = "";
                    newElement.style.left = "";
                    newElement.style.top = "";
                }
                if (dragOrigin.m) {
                    dragOrigin.remove();
                }
            }
            dragContainer.remove();
            // isMove
            dragOrigin.style.visibility = "visible";
        }
    }
    addEventListener("mousedown", pointerdown);
    addEventListener("touchstart", pointerdown, { passive: false });
    addEventListener("mousemove", pointermove);
    addEventListener("touchmove", pointermove, { passive: false });
    addEventListener("mouseup", pointerup);
    addEventListener("touchend", pointerup, { passive: false });
};