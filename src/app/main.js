//@ts-check

import { ArcadeAudio } from './audio';
import { dnd, ep } from './drag.js';
import './normalizedRAF.js';

const extractPointers = ep;
const dragAndDrop = dnd;

// shortcuts for easier minify. massively reduces minified identifier size
const d = document;
// const qs = 'querySelector';
// const qsa = 'querySelectorAll';
// const ce = 'createElement';
const str1 = a => JSON.stringify(a);
const str4 = a => JSON.stringify(a, null, 4);
// const par = JSON.parse;
// const mr = Math.random;
// const mMax = Math.max;
// const mMin = Math.min;
// const mPow = Math.pow;
// const mFloor = Math.floor;

let timeScale = 1;
const frameSize = 100; // 10 fps

const _save = [];

const gameOverTemp = 100;

// #IfDev
console.log('Dev');
// #EndIfDev

const inventoryWidth = 5;
const inventoryHeight = 4;
const woodAngleAdvanceMin = 360 / 7;
const woodAngleAdvanceVariation = 360 / 4 - woodAngleAdvanceMin;

let woodAngle = woodAngleAdvanceMin + Math.random() * woodAngleAdvanceVariation;
let lastTick = 0;
let largestFrameSkip = 0;
let framesSkipped = 0;
let debugMode = 0; // 0=off, 1=debug, 2=verbose

/** @type HTMLElement */
const $debug = d.querySelector('.debug');
/** @type HTMLElement */
const $result = d.querySelector('.result');
/** @type HTMLElement */
const $resultTitle = d.querySelector('.result h2.title');
/** @type HTMLElement */
const $resultBody = d.querySelector('.result div.body');
/** @type HTMLElement */
const $wood = d.querySelector('.fire-wood');
/** @type HTMLElement */
const $flame = d.querySelector('.fire-flame');
/** @type HTMLElement */
const $trees = d.querySelector('.trees');
/** @type SVGElement */
const $progressCircle = d.querySelector('circle');
/** @type HTMLElement */
const $radius = d.querySelector('.fire-radius');


const ac = new ArcadeAudio();
// setInterval(() => { ac.play('chop') }, 1000)


// width and height for scaling of graphics
const flameW = $flame.offsetWidth;
const flameH = $flame.offsetHeight;
const flameScale = 700;
// const woodW = $wood.offsetWidth;
// const woodH = $wood.offsetHeight;
// const woodScale = 500;

(d.querySelector('.inventory-table')
    .append(...([...Array(inventoryHeight)].map(() => {
        const tr = d.createElement('tr');

        tr.append(...[...Array(inventoryWidth)].map(() => {
            const td = d.createElement('td');
            td.style.height = `${(100 / inventoryHeight).toFixed(2)}%`; // HACK: fix firefox cannot display correctly

            const move = d.createElement('div');
            move.classList.add('move', 'drop');
            if (Math.random() > 0.5) {
                var wood = collectWood(move, Math.floor(Math.random() * 300) + 300);
                wood.classList.add('drag');
            }
            td.append(move);
            return td;
        }));
        return tr;
    })))
);


let state = {};

let isDragging = false;
dragAndDrop({
    onDrag() {
        isDragging = true;
    },
    // return false to to skip DropResponse
    onDrop(e, maxDist, item, dragOrigin, dropTarget) {
        isDragging = false;
        if (dropTarget.classList.contains("fire")) {
            const chunkSize = Number(item.getAttribute('data-size'));
            addFuel(makeFuelUnit(state, chunkSize / 300, 0, { temp: 25 }));
            return false;
        }

        if (dropTarget.children.length > 0) {
            if (dropTarget.children[0] !== dragOrigin) {
                console.log('swap');
                const oldTargetItem = dropTarget.children[0];
                const newElement = dropTarget.appendChild(item.cloneNode(true));
                newElement.style.position = "";
                newElement.style.pointerEvents = "";
                newElement.style.left = "";
                newElement.style.top = "";
                dragOrigin.parentNode.appendChild(oldTargetItem);
                dragOrigin.m = true;

                return false;
            } else if (item.classList.contains('wood') && maxDist < 10) {
                console.log('split wood');
                const oldWood = dragOrigin;
                const origSize = Number(oldWood.getAttribute('data-size'));

                const cells = getAvailableCells();

                if (cells.length > 0 && origSize >= 100) {
                    const cell = cells[Math.floor(Math.random() * cells.length)];

                    const oldChunkSize = Math.floor(origSize * (Math.random() * 0.4 + 0.3));
                    const newChunkSize = origSize - oldChunkSize;
                    const newWood = collectWood(
                        cell,
                        newChunkSize,
                    );
                    oldWood.classList.remove('drag');
                    newWood.style.visibility = 'hidden';

                    const circle = addProgressCircle(dragOrigin.parentNode);

                    ac.play('chop');
                    const a = setInterval(() => {
                        ac.play('chop');
                    }, 1000);
                    // progressCircle.classList.add('animate');
                    // progressCircle.style.visibility = 'visible';

                    setTimeout(() => {
                        clearInterval(a);
                        oldWood.classList.add('drag');
                        newWood.classList.add('drag');
                        newWood.style.visibility = 'visible';


                        oldWood.setAttribute('data-size', `` + oldChunkSize);
                        oldWood.style.backgroundSize = (oldChunkSize / 500 * 100) + 'vmin';

                        circle.remove();

                        // progressCircle.style.visibility = 'hidden';
                        // progressCircle.classList.remove('animate');
                    }, 4000);
                }
                dragOrigin.m = false;
                return false;
            } else {
                console.log('drag into same cell');
            }

        }
        return true;
    },
});

d.querySelector('button.btn-debug').addEventListener('pointerup', () => {
    debugMode = debugMode !== 1 ? 1 : 0;
});
// d.querySelector('button.btn-verbose').addEventListener('pointerup', () => {
//     debugMode = debugMode !== 2 ? 2 : 0;
// });

const clickTree = () => {
    if ($progressCircle.parentNode.parentElement.style.visibility === 'visible') return;
    const cells = getAvailableCells();
    // console.log('chop wood', cells);
    if (cells.length <= 0) return;

    const cell = cells[Math.floor(Math.random() * cells.length)];

    const newWood = collectWood(
        cell,
        Math.floor(Math.random() * 500) + 300,
    );
    newWood.style.visibility = 'hidden';
    $progressCircle.classList.add('animate');
    $progressCircle.parentNode.parentElement.style.visibility = 'visible';
    d.querySelector('.tree-tips').style.visibility = 'hidden';

    ac.play('chop');
    const a = setInterval(() => {
        ac.play('chop');
    }, 1000);

    setTimeout(() => {
        clearInterval(a);
        newWood.classList.add('drag');
        newWood.style.visibility = 'visible';
        $progressCircle.parentNode.parentElement.style.visibility = 'hidden';
        $progressCircle.classList.remove('animate');
    }, 4000);
}
d.querySelector('.trees').addEventListener('click', clickTree);
d.querySelector('.trees').addEventListener('touchend', clickTree);



{
    let isDown = false;
    let startX;
    let startY;
    let startRadius;
    d.querySelector('.fire').addEventListener('pointerdown', (e) => {
        [startX, startY] = extractPointers(e);
        isDown = true;
        startRadius = state.radius;
        $radius.style.visibility = 'visible';
        $radius.children[0].style.width = `${state._radius * 100}%`;
    });
    d.querySelector('.fire').addEventListener('pointermove', (/** @type PointerEvent*/e) => {
        if (isDown) {
            const [pointerX, pointerY] = extractPointers(e);
            state._radius = Math.min(1, Math.max(0, startRadius + (pointerX - startX) / window.innerWidth));
            $radius.children[0].style.width = `${state._radius * 100}%`;
            // console.log(state._radius);
        }
    });
    d.querySelector('.fire').addEventListener('pointerup', (e) => {
        if (isDown) {
            isDown = false;
            const [pointerX, pointerY] = extractPointers(e);
            $radius.style.visibility = 'hidden';
            d.querySelector('.fire-tips').style.visibility = 'hidden';

            state._radius = Math.min(1, Math.max(0, startRadius + (pointerX - startX) / window.innerWidth));
            changeRadius(state._radius);
        }
    });
}

const bindButtons = () => {
    let a = true;
    d.querySelector('button.start').addEventListener('pointerup', () => {
        addSpark(400);
        if (a) {
            state.fromFrame = state.frameID;
            setTimeout(() => {
                d.querySelector('.tree-tips').style.visibility = 'visible';
                d.querySelector('.fire-tips').style.visibility = 'visible';
            }, 5000);
            a = false;
        }
    });
    const $reset = d.querySelector('button.reset');
    if ($reset) $reset.addEventListener('pointerup', () => {
        // console.log('reset', state.frameID);
        init(state.frameID);
        addSpark(400);
    });
};
bindButtons();

function easeOut(x) {
    return 1 - Math.pow(1 - x, 6);
}


const createElementFromHTML = (htmlString) => {
    var div = d.createElement('div');
    div.innerHTML = htmlString;
    return div.firstChild;
};

const plankCSS = ({ valueStart, id }) => `<div class="wood-plank" data-wood="${id}" style="width: ${10 / 40 * valueStart}px; height: ${Math.max(1, 2 / 40 * valueStart)}px;"><div class="temp"></div><div class="ash"></div></div>`;
// `transform: scale(1,1) translate(calc(-50%), calc(-50%))  rotateZ(0) translate(${1}, ${1}px);`,

// @ts-ignore
window.save = () => {
    console.log(_save);
};
// @ts-ignore
window.state = () => {
    console.log(state);
};
// @ts-ignore
window.timeScale = (_timeScale) => {
    timeScale = _timeScale;
}

function makeFuelUnit(state, chunkSize, variation, override = {}) {
    state.fuelID++;
    const value = Math.floor(300 * chunkSize * (1 + Math.random() * variation));
    return {
        frameID: state.frameID,
        id: state.fuelID,
        valueStart: value,
        heatReq: 300 * chunkSize,
        heatUpRate: 0.02 / chunkSize,
        coolDownRate: 0.010 / chunkSize,
        oxygenReq: 4 * chunkSize,
        fuelReq: 0.2,
        givesHeatPerTick: 55 * Math.pow(chunkSize, 1.1),
        value,
        temp: 25,
        _transferredHeat: 0,
        _heatChange: 0,
        _oxygenGiven: 0,
        _oxygenChange: 0,
        ...override,
    };
}
const fuelToString = (indent, fuelCount) => (fuel, i) => {
    return [...Array(indent + 1)].join(' ') +
        `${fuelCount - 1 - i}.`.padStart(Math.ceil(Math.log10(fuelCount)) + 1) + ' ' +
        `${fuel.value.toFixed(2)}`.padStart(7) + ' ' +
        `${fuel.temp.toFixed(2)}`.padStart(8) + ' ' +
        `${fuel._transferredHeat.toFixed(2)}`.padStart(8) + ' ' +
        `(${fuel._heatChange.toFixed(2)}`.padStart(7) + ' ' +
        `${fuel._oxygenGiven.toFixed(2)}`.padStart(7) + ' ' +
        `${fuel._oxygenChange.toFixed(2)}`.padStart(7) + ') ' +
        // [...Array(4)].join(' ') +
        // `${fuel.heatReq}`.padStart(4) + ' ' +
        // `${fuel.heatUpRate}`.padStart(4) + ' ' +
        // `${fuel.coolDownRate}`.padStart(4) + ' ' +
        // `${fuel.oxygenReq}`.padStart(4) + ' ' +
        // `${fuel.fuelReq}`.padStart(4) + ' ' +
        // `${fuel.givesHeatPerTick}`.padStart(4) + ' ' +
        // `${fuel.frameID}`.padStart(4) + ' ' +
        ``;
};

const init = (fromFrame) => {
    const newState = {
        isRunning: false,
        woodSpawnRate: 0.01,
        maxTemp: 0,
        fromFrame: fromFrame,
        frameID: fromFrame,
        radius: 0.5,
        _radius: 0.5,
        heat: 25,
        heatTransferRate: 0.7,
        oxygen: 100,
        oxygenDepreciation: 0.92, // smaller means less gas remains
        _remainingOxygen: 0,
        _largestFlame: 0,
        fuelID: 0,
        fuels: [
        ],
        air: {
            heat: -5,
            oxygen: 60,
        },
        wind: {
            //     oxygen: 20,
            //     heat: -40,
        },
    };

    state = newState;
    $wood.innerHTML = '';
    addFuel(makeFuelUnit(state, 0.2, 0.5, {
        temp: 25,
        givesHeatPerTick: 60,
    }));
    addFuel(makeFuelUnit(state, 0.2, 0.5, {
        temp: 25,
        givesHeatPerTick: 60,
    }));
    addFuel(makeFuelUnit(state, 0.5, 0.5, {
        temp: 25,
        givesHeatPerTick: 60,
    }));
    addFuel(makeFuelUnit(state, 0.5, 0.5, {
        temp: 25,
    }));
    _save.push(str1(state));
};
const tick = (state) => {
    const { isRunning, frameID, fuels, heat, oxygen, heatTransferRate, air, wind, woodSpawnRate, radius } = state;
    let heatBudget = Math.max(25, heat + air.heat + (wind.heat || 0));

    const totalFuel = fuels.map(f => f.value).reduce((acc, curr) => acc + curr, 0);

    const newState = { ...state };
    newState.frameID += 1;
    newState.heat = 0;
    newState.fuels = [];

    const maxTemp = [...newState.fuels.map(f => f.temp), heat].reduce((a, b) => Math.max(a, b), 0);
    newState.maxTemp = maxTemp;
    newState.isRunning = (maxTemp >= gameOverTemp);
    if (isRunning && !newState.isRunning) {
        doGameOver(state);
    }
    if (!isRunning && newState.isRunning) {
        doResumeGame(state);
    }

    for (let i = fuels.length - 1; i >= 0; i--) {
        const fuel = fuels[i];
        const {
            heatReq,
            heatUpRate,
            coolDownRate,
            oxygenReq,
            fuelReq,
            givesHeatPerTick,
            value,
            temp,
        } = fuel;

        if (value <= 0 && temp < 1) continue;
        const newFuel = { ...fuel };

        const stepOxygen = newState.oxygen;

        let _transferredHeat = (heatBudget - temp) * heatTransferRate * heatUpRate / Math.pow(Math.max(0.5, (value + 0.00001) / 300), 2); // * value / 100
        heatBudget -= _transferredHeat;
        let _oxygenGiven = 0;
        newFuel.temp += _transferredHeat;
        if (newFuel.value <= 50) newFuel.temp *= (1 - coolDownRate * Math.pow(0.95, i));

        if (newFuel.temp >= heatReq) {
            const oxygenTaken = Math.min(newState.oxygen * Math.pow(radius, 0.5), oxygenReq * Math.pow(newFuel.temp / heatReq, 1 / 20));
            const oxygenTakenPercent = oxygenTaken / oxygenReq;

            const fuelTaken = Math.max(1, Math.min(value, fuelReq * oxygenTakenPercent));
            const fuelTakenPercent = fuelTaken / fuelReq;

            const conversionPercent = Math.max(0.0001, Math.min(oxygenTakenPercent, fuelTakenPercent));

            _oxygenGiven = oxygenReq * conversionPercent;
            // newState.oxygen -= _oxygenGiven;
            newFuel.value -= fuelReq * conversionPercent * 2;
            heatBudget += givesHeatPerTick * conversionPercent;
            newFuel.value = Math.max(0.001, newFuel.value);
        }
        newState.oxygen *= 0.98 * Math.pow(radius, 1 / 2);
        // newState.oxygen *= state.oxygenDepreciation / mPow(radius, 1 / 6);
        const _oxygenChange = stepOxygen - newState.oxygen;
        const _heatChange = newFuel.temp - temp;

        newState.fuels.push({ ...newFuel, _transferredHeat, _heatChange, _oxygenGiven, _oxygenChange });
    }
    newState.fuels.reverse();
    newState._heatLoss = Math.pow(1.1 - radius, 1 / 8) * Math.min(1, Math.pow(newState.fuels.length / 4.1, 4));
    newState.heat += heatBudget * newState._heatLoss;
    newState._remainingOxygen = newState.oxygen;
    newState.oxygen = air.oxygen / 30 * Math.pow(radius, 1 / 2) + (wind.oxygen || 0);
    newState._largestFlame = Math.max(newState._largestFlame, newState.heat);

    // console.log(`delta-heat: ${newState.heat - heat}`);


    // if (!isDragging && mr() <= woodSpawnRate) {
    //     const ii = mFloor(mr() * inventoryHeight);
    //     const jj = mFloor(mr() * inventoryWidth);

    //     /** @type HTMLElement */
    //     const $cell = d.querySelector(`.inventory-table>tr:nth-child(${ii + 1})>td:nth-child(${jj + 1})>.move.drop`);

    //     if ($cell.children.length === 0) {
    //         const wood = d.createElement('div');
    //         wood.classList.add('drag', 'wood');
    //         wood.setAttribute('data-size', '300');
    //         $cell.append(wood);
    //     }
    // }

    return newState;
};

const getAvailableCells = () => {
    const cells = d.querySelectorAll(`.inventory-table .move.drop:empty`);
    return [...cells];
};

function collectWood(cell, chunkSize) {
    const wood = d.createElement('div');
    wood.classList.add('wood');
    wood.setAttribute('data-size', `` + chunkSize);
    wood.style.backgroundSize = (chunkSize / 500 * 100) + 'vmin';
    cell.append(wood);

    return wood;
};

const addProgressCircle = (cell) => {
    const prograssDiv = cell.appendChild($progressCircle.parentNode.parentNode.cloneNode(true));
    prograssDiv.querySelector('circle').classList.add('animate');
    prograssDiv.querySelector('svg').style.visibility = 'visible';
    prograssDiv.style.top = '50%';
    return prograssDiv;
}

const addFuel = (fuelUnit) => {
    state.fuels.push(fuelUnit);
    /** @type any */
    let wood;
    $wood.appendChild(wood = createElementFromHTML(plankCSS(fuelUnit)));
    wood.style.transform = `translate(calc(-50% + 1px), calc(-50% + 1px)) scale(1, 1) rotateZ(${woodAngle}deg) translate(${Math.random() * 5}px, ${state.radius / Math.pow(state.fuels.length, 3)}px)`;
    woodAngle += woodAngleAdvanceMin + Math.random() * woodAngleAdvanceVariation;
    _save.push(str1(fuelUnit));
};

const addSpark = (heat) => {
    state.heat += heat;
    _save.push(str1(state));
};

const changeRadius = (radius) => {
    state.radius = Math.max(0, Math.min(1, radius));
    _save.push(str1(state));
};
// @ts-ignore
window.changeRadius = changeRadius;

const render = (state) => {
    const variation = Math.random() * 0.2 + 0.8;

    const {
        frameID,
        fromFrame,
        heat,
        _heatLoss,
        radius,
        oxygen,
        _remainingOxygen,
        fuels,
        air,
        wind,
        _largestFlame,
    } = state;
    // const availableFuels = (fuels
    //     .filter(f => f._oxygenGiven > 0)
    //     .map(f => f.temp)
    // );
    // const avgFuelTemp = (availableFuels
    //     .reduce((a, b) => (a + b), 0)
    // ) / availableFuels.length;
    const ww = heat / flameScale * flameW * variation;
    const hh = heat / flameScale * flameH * variation;

    $flame.style.width = ww + 'px';
    $flame.style.height = hh + 'px';

    // console.log('heat / flameScale', heat / flameScale * 0.8);
    ac.play('fire', Math.min(1, heat / flameScale * 0.8));

    const totalFuel = fuels.map(f => f.value).reduce((acc, curr) => acc + curr, 0);
    const richFuel = fuels.filter(f => f.value > 10);
    let elevation = 0

    fuels.forEach((fuelUnit, i) => {
        /** @type any */

        const { valueStart, value, temp, id, frameID: fuelUnitFrameID } = fuelUnit;
        const v = value / valueStart;
        const scale = Math.pow(v, 1.6) * 0.3 + 0.7;
        // const scale = 1;

        /** @type HTMLElement */
        const wood = d.querySelector(`.wood-plank[data-wood="${id}"]`);
        if (!wood) return;

        const fireWoodHeight = 1.5;
        const placementOffset = Math.min(1, (frameID - fuelUnitFrameID) / frameSize * 20) * 40 - 40;
        const transformPart = wood.style.transform
            .replace(/scale\([\d\.]+, [\d\.]+\)/, `scale(${scale}, ${scale})`)
            .replace(/translate\(calc\(-50\% \+ [-\d\.]+px\), calc\(-50\% \+ [-\d\.]+px\)\)/, `translate(calc(-50% + ${2}px), calc(-50% + ${richFuel.length * fireWoodHeight + elevation * -3 + placementOffset}px))`)
            .split(/deg\) /)[0];

        elevation += v * fireWoodHeight;

        const renderedRadius = (10
            * state._radius
            * Math.pow(fuels.length, 0.15)
            * ((fuels.length - i) < 10 ? Math.pow(1.3, ((fuels.length - i) / 2))
                : Math.pow(1.2, (10 / 2)) + (6 - 6 / Math.pow(fuels.length - i - 10, 1 / 10))
            )
        );
        // `scale(1,1) translate(calc(-50%), calc(-50%))  rotateZ(${woodAngle}deg) translate(${mr() * 5}px, ${state.radius / mPow(state.fuels.length, 3)}px)`;
        wood.style.transform = `${transformPart}deg) translate(0px, ${renderedRadius}px)`;

        // mPow(mPow(fuels.length, 0.8) * state._radius, 2) * 1.8 / mPow(i, 1 / 2)

        wood.style.backgroundColor = 'hsl(36°, 49%, 39%)';
        wood.style.opacity = `${.7 * Math.pow(Math.max(1, value / 50), 2)}`;
        /** @type HTMLElement */
        const t = wood.querySelector('.temp');
        t.style.opacity = `${.5 * Math.pow(Math.min(1, temp / 800), 2)}`;
        /** @type HTMLElement */
        const a = wood.querySelector('.ash');
        a.style.opacity = `${.9 * Math.pow(1 - v, 1.5)}`;
    });
    // $wood.style.width = (woodW * totalFuel / woodScale) + 'px';
    // $wood.style.height = (woodH * totalFuel / woodScale) + 'px';

    const fuelStr = ([...fuels]
        // .filter(f => f.value > 0)
        .reverse()
        .map(fuelToString(4, fuels.length))
        .join('\n')
    );
    const ashStr = fuels.filter(f => f.value === 0).map(f => f.temp).reduce((acc, curr) => acc + curr, 0);
    if (debugMode === 0) {
        $debug.style.display = 'none';
    }
    const elapsedSecond = (frameID - fromFrame) * frameSize / 1000;
    const timeString = (`` +
        (elapsedSecond < 86400 ? '' : `${('' + Math.floor(elapsedSecond / 86400)).padStart(2, '0')}d`) +
        (elapsedSecond < 3600 ? '' : `${('' + Math.floor((elapsedSecond % 86400) / 3600)).padStart(2, '0')}h`) +
        (elapsedSecond < 60 ? '' : `${('' + Math.floor((elapsedSecond % 3600) / 60)).padStart(2, '0')}m`) +
        `${(elapsedSecond % 60).toFixed(1).padStart(4, '0')}s`
    );
    if (debugMode === 1) {
        $debug.style.display = 'block';
        $debug.innerHTML = `<pre>` +
            `Time: ${timeString}\n` +
            `totalFuel: ${totalFuel.toFixed(2)}\n` +
            `heat: ${heat.toFixed(2)}\n` +
            `oxygen: ${_remainingOxygen.toFixed(2)}/${oxygen.toFixed(2)}\n` +
            `Largest Flame: ${_largestFlame.toFixed(2)}\n` +
            // `LargestFrameSkip: ${largestFrameSkip} TotalFrameSkipped: ${framesSkipped}\n` +
            `</pre>`
            ;
    }

    if (debugMode === 2) {
        $debug.style.display = 'block';
        $debug.innerHTML = `<pre>` +
            `frameID: #${frameID} (${timeString}), timeScale: ${timeScale}\n` +
            `totalFuel: ${totalFuel.toFixed(2)} (${richFuel.length} rich)\n` +
            `heat: ${heat.toFixed(2)} (-${(1 - _heatLoss).toFixed(2)})\n` +
            `ashHeat: ${ashStr.toFixed(2)}\n` +
            `radius: ${radius.toFixed(2)}\n` +
            `oxygen: ${_remainingOxygen.toFixed(2)}/${oxygen.toFixed(2)}\n` +
            `fuels:   value     temp   _tHeat  _dHeat     _o2    _dO2\n` +
            `${fuelStr}\n` +
            `air: \n${str4(air)}\n` +
            `wind: \n${str4(wind)}\n` +
            `_largestFrameSkip: ${largestFrameSkip}\n` +
            `_totalFrameSkipped: ${framesSkipped}\n` +
            `_largestFlame: ${_largestFlame}\n` +
            `</pre>`
            ;
    }
    // $result.innerHTML = `` +
    //     `<h2>Game Over</h2>` +
    //     ``;
};

const doGameOver = (state) => {
    const { isRunning, fromFrame, frameID, fuels, heat, oxygen, heatTransferRate, air, wind, woodSpawnRate, _largestFlame } = state;

    $result.style.display = 'flex';
    $resultTitle.innerHTML = 'It went out';
    $resultBody.innerHTML = `
    <ul>
        <li>Play time: ${((frameID - fromFrame) * frameSize / 1000).toFixed(1)} seconds</li>
        <li>Largest flame made: ${_largestFlame}</li>
    </ul>
    <button class="start">Add more spark!</button><br />
    <button class="reset">Reset</button>
    `;
    bindButtons();
};
const doResumeGame = (state) => {
    $result.style.display = 'none';
};

const main = () => {
    init(0);
    lastTick = Date.now();
    render(state);

    const a = () => {
        let i = 0;
        while (Date.now() - lastTick > frameSize / timeScale) {
            state = tick({ ...state });
            lastTick += frameSize / timeScale;
            i++;
        }
        // if (i > 0) console.log([...state.fuels]
        //     // .filter(f => f.value > 0)
        //     .reverse()
        //     .map(fuelToString(4, state.fuels.length))
        //     .join('\n')
        // );
        if (i > 0) render(state);
        if (i > 1) largestFrameSkip = Math.max(largestFrameSkip, i - 1);
        if (i > 1) framesSkipped += i - 1;

        requestAnimationFrame(a);
    };
    a();
};

main();