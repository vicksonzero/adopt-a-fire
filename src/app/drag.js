// adapted from https://github.com/xem/miniDragAndDrop



const dist = exports.dist = (dx, dy) => Math.sqrt(dx * dx + dy * dy);


const extractPointers = exports.ep = (e) => [
    e.touches ? e.touches[0].pageX : e.pageX,
    e.touches ? e.touches[0].pageY : e.pageY
];

// D = drag and drop persistent thing
exports.dnd = delegates => {
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
        // console.log('e', e);

        if (!dragOrigin || !dragOrigin.classList.contains("noDrag")) {
            e.preventDefault();
        }
        isDragging = 1;
        if (dragContainer) {
            // if somehow the window did not catch the mouseup event
            dragContainer.remove();
            dragOrigin.style.visibility = "visible";
        }
        // clear dragging holders
        dragOrigin = null;
        dragContainer = null;

        // record the drag origin according to MouseEvent vs TOuchEvent
        if (e.touches) {
            dragOrigin = d.elementFromPoint(
                e.touches[0].pageX,
                e.touches[0].pageY
            );
        } else {
            if (e.button !== 0) return;
            dragOrigin = e.target;
        }

        // recursively get a parent of the element that may have a "drag" class
        console.log('dragOrigin.classList', dragOrigin.classList);
        while (dragOrigin != d && !dragOrigin.classList.contains("drag")) {
            dragOrigin = dragOrigin.parentNode;
        }

        // will arrive at document if no one has the drag class.
        if (dragOrigin == d) {
            // end the drag events immediately
            dragOrigin = null;
        } else if (["move", "copy"].some(a => dragOrigin.parentNode.classList.contains(a))) {
            // if this drag container supports moving or copying

            // call the onDrag hook to alter this function's flow, or simply do its thing
            onDrag();

            // record start x,y for drag distance calculations
            [dragX, dragY] = extractPointers(e);
            startX = dragX;
            startY = dragY;

            // init max drag distance
            maxDist = 0;

            // get item global position
            const globalRect = dragOrigin.getBoundingClientRect();
            dragOffsetX = dragX - globalRect.left;
            dragOffsetY = dragY - globalRect.top;

            // create holder for dragging. it stores a visual clone
            dragContainer = d.createElement('div');
            dragContainer.appendChild(dragOrigin.cloneNode(true));
            d.body.appendChild(dragContainer);

            // hide origin if we want to move it
            if (dragOrigin.parentNode.classList.contains("move")) {
                dragOrigin.style.visibility = "hidden";
                dragOrigin.m = 1; // isMove
            }

            // set style for drag container
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
            [dragX, dragY] = extractPointers(e);
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
        if (!dragOrigin || !dragOrigin.classList.contains("noDrag")) {
            e.preventDefault();
        }
        if (dragContainer) {
            isDragging = 0;
            if (e.touches) {
                dropTarget = d.elementFromPoint(
                    dragX,
                    dragY
                );
            } else {
                if (e.button !== 0) return;
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
    window.addEventListener("mouseup", pointerup);
    window.addEventListener("touchend", pointerup, { passive: false });
    // window.addEventListener("mouseout", pointerup);

    addEventListener("mousedown", pointerdown);
    addEventListener("touchstart", pointerdown, { passive: false });
    addEventListener("mousemove", pointermove);
    addEventListener("touchmove", pointermove, { passive: false });
};