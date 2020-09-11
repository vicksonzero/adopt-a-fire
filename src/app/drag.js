// adapted from https://github.com/xem/miniDragAndDrop



const dist = exports.dist = (dx, dy) => Math.sqrt(dx * dx + dy * dy);

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
    let startX;
    /** @type number */
    let startY;
    /** @type number */
    let maxDist;
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
        if (dragContainer) {
            dragContainer.remove();
            dragContainer = null;
            // isMove
            dragOrigin.style.visibility = "visible";
        }
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
            startX = dragX = e.touches ? e.touches[0].pageX : e.pageX;
            startY = dragY = e.touches ? e.touches[0].pageY : e.pageY;
            maxDist = 0;
            const globalRect = dragOrigin.getBoundingClientRect();
            dragOffsetX = dragX - globalRect.left;
            dragOffsetY = dragY - globalRect.top;
            dragContainer = d.createElement('div');
            dragContainer.appendChild(dragOrigin.cloneNode(true));
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
            s.left = dragX - dragOffsetX + "px";
            s.top = dragY - dragOffsetY + "px";
        }
    }
    const pointermove = e => {
        e.preventDefault();
        if (isDragging && dragContainer) {
            dragX = (e.touches ? e.touches[0].pageX : e.pageX);
            dragY = (e.touches ? e.touches[0].pageY : e.pageY);
            const dd = dist(dragX - startX, dragY - startY);
            // console.log('dd', dd);
            maxDist = Math.max(dd, maxDist);
            if (maxDist > 10) {
                dragContainer.style.left = dragX - dragOffsetX - 8 + "px";
                dragContainer.style.top = dragY - dragOffsetY - 8 + "px";
            }
        }
    }

    const pointerup = e => {
        if (dragContainer) {
            e.preventDefault();
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
                doDropResponse = (a = onDrop(e, maxDist, dragContainer.firstChild, dragOrigin, dropTarget), a == null || !!a);
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
            dragContainer = null;
            // isMove
            dragOrigin.style.visibility = "visible";
        }
    }
    addEventListener("mousedown", pointerdown);
    addEventListener("touchstart", pointerdown, { passive: false });
    addEventListener("mousemove", pointermove);
    addEventListener("touchmove", pointermove, { passive: false });
    window.addEventListener("mouseup", pointerup);
    window.addEventListener("touchend", pointerup, { passive: false });
    window.addEventListener("mouseout", pointerup);
};