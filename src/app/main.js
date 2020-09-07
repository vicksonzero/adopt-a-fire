//@ts-check

import { dragAndDrop } from './drag.js';
import './normalizedRAF.js';

const d = document;
// const qs = 'querySelector';
// const qsa = 'querySelectorAll';
// const ce = 'createElement';
const str1 = a => JSON.stringify(a);
const str4 = a => JSON.stringify(a, null, 4);
const par = JSON.parse;
const mr = Math.random;
const mMax = Math.max;
const mMin = Math.min;
const mPow = Math.pow;
const mFloor = Math.floor;

const frameSize = 100; // 10 fps
let timeScale = 1;

const _save = [];

const gameOverTemp = 100;

// #IfDev
console.log('Dev');
// #EndIfDev

const inventoryWidth = 5;
const inventoryHeight = 4;
const woodAngleAdvanceMin = 360 / 7;
const woodAngleAdvanceVariation = 360 / 4 - woodAngleAdvanceMin;

let woodAngle = woodAngleAdvanceMin + mr() * woodAngleAdvanceVariation;
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

const flameW = $flame.offsetWidth;
const flameH = $flame.offsetHeight;
const flameScale = 700;
const woodW = $wood.offsetWidth;
const woodH = $wood.offsetHeight;
const woodScale = 500;

(d.querySelector('.inventory-table')
    .append(...([...Array(inventoryHeight)].map(() => {
        const tr = d.createElement('tr');

        tr.append(...[...Array(inventoryWidth)].map(() => {
            const td = d.createElement('td');
            td.style.height = `${(100 / inventoryHeight).toFixed(2)}%`; // HACK: fix firefox cannot display correctly

            const move = d.createElement('div');
            move.classList.add('move', 'drop');
            if (mr() > 0.5) {
                const wood = d.createElement('div');
                wood.classList.add('drag', 'wood');
                move.append(wood);
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
    // return false to to skip DropResponse
    onDrop(item, dropTarget) {
        isDragging = false;
        if (dropTarget.classList.contains("fire")) {
            addFuel(makeFuelUnit(state, 1, 0, { temp: 25 }));
            return false;
        }

        return true;
    },
    onDrag() {
        isDragging = true;
    }
});

d.querySelector('button.btn-debug').addEventListener('pointerup', () => {
    debugMode = debugMode !== 1 ? 1 : 0;
});
d.querySelector('button.btn-verbose').addEventListener('pointerup', () => {
    debugMode = debugMode !== 2 ? 2 : 0;
});

{
    let isDown = false;
    let startX;
    let startY;
    let startRadius;
    d.querySelector('.fire').addEventListener('pointerdown', (e) => {
        [startX, startY] = extractPointers(e);
        isDown = true;
        startRadius = state.radius;
    });
    d.querySelector('.fire').addEventListener('pointermove', (/** @type PointerEvent*/e) => {
        if (isDown) {
            const [pointerX, pointerY] = extractPointers(e);
            state._radius = mMin(1, mMax(0, startRadius + (pointerX - startX) / window.innerWidth));
            console.log(state._radius);
        }
    });
    d.querySelector('.fire').addEventListener('pointerup', (e) => {
        if (isDown) {
            isDown = false;
            const [pointerX, pointerY] = extractPointers(e);

            state._radius = mMin(1, mMax(0, startRadius + (pointerX - startX) / window.innerWidth));
            changeRadius(state._radius);
        }
    });
}

const bindButtons = () => {
    d.querySelector('button.start').addEventListener('pointerup', () => {
        addSpark(400);
    });
    const $reset = d.querySelector('button.reset');
    if ($reset) $reset.addEventListener('pointerup', () => {
        console.log('reset', state.frameID);
        init(state.frameID);
    });
};
bindButtons();

function easeOut(x) {
    return 1 - mPow(1 - x, 6);
}

const extractPointers = (e) => [
    e.touches ? e.touches[0].pageX : e.pageX,
    e.touches ? e.touches[0].pageY : e.pageY
];

const dist = (dx, dy) => Math.sqrt(dx * dx + dy * dy);

const createElementFromHTML = (htmlString) => {
    var div = d.createElement('div');
    div.innerHTML = htmlString;
    return div.firstChild;
};

const plankCSS = ({ valueStart, id }) => `<div class="wood-plank" data-wood="${id}" style="width: ${10 / 40 * valueStart}px; height: ${mMax(1, 2 / 40 * valueStart)}px;"><div class="temp"></div><div class="ash"></div></div>`;
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
    const value = mFloor(300 * chunkSize * (1 + mr() * variation));
    return {
        frameID: state.frameID,
        id: state.fuelID,
        valueStart: value,
        heatReq: 300 * chunkSize,
        heatUpRate: 0.02 / chunkSize,
        coolDownRate: 0.010 / chunkSize,
        oxygenReq: 4 * chunkSize,
        fuelReq: 0.2,
        givesHeatPerTick: 55 * mPow(chunkSize, 1.1),
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
    const { isRunning, frameID, fuels, heat, oxygen, heatTransferRate, air, wind, woodSpawnRate } = state;
    let heatBudget = mMax(25, heat + air.heat + (wind.heat || 0));

    const totalFuel = fuels.map(f => f.value).reduce((acc, curr) => acc + curr, 0);

    const newState = { ...state };
    newState.frameID += 1;
    newState.heat = 0;
    newState.fuels = [];

    const maxTemp = [...newState.fuels.map(f => f.temp), heat].reduce((a, b) => mMax(a, b), 0);
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

        let _transferredHeat = (heatBudget - temp) * heatTransferRate * heatUpRate; // * value / 100
        heatBudget -= _transferredHeat;
        let _oxygenGiven = 0;
        newFuel.temp += _transferredHeat;
        if (newFuel.value <= 50) newFuel.temp *= (1 - coolDownRate * mPow(0.95, i));

        if (newFuel.temp >= heatReq) {
            const oxygenTaken = mMin(newState.oxygen * mPow(state.radius, 0.5), oxygenReq * mPow(newFuel.temp / heatReq, 1 / 20));
            const oxygenTakenPercent = oxygenTaken / oxygenReq;

            const fuelTaken = mMax(1, mMin(value, fuelReq * oxygenTakenPercent));
            const fuelTakenPercent = fuelTaken / fuelReq;

            const conversionPercent = mMax(0.0001, mMin(oxygenTakenPercent, fuelTakenPercent));

            _oxygenGiven = oxygenReq * conversionPercent;
            // newState.oxygen -= _oxygenGiven;
            newFuel.value -= fuelReq * conversionPercent * 2;
            heatBudget += givesHeatPerTick * conversionPercent;
            newFuel.value = mMax(0.001, newFuel.value);
        }
        newState.oxygen *= 0.98 * mPow(state.radius, 1 / 2);
        // newState.oxygen *= state.oxygenDepreciation / mPow(state.radius, 1 / 6);
        const _oxygenChange = stepOxygen - newState.oxygen;
        const _heatChange = newFuel.temp - temp;

        newState.fuels.push({ ...newFuel, _transferredHeat, _heatChange, _oxygenGiven, _oxygenChange });
    }
    newState.fuels.reverse();
    newState._heatLoss = mPow(1.1 - state.radius, 1 / 8) * mMin(1, mPow(newState.fuels.length / 4.1, 4));
    newState.heat += heatBudget * newState._heatLoss;
    newState._remainingOxygen = newState.oxygen;
    newState.oxygen = air.oxygen / 30 * mPow(state.radius, 1 / 2) + (wind.oxygen || 0);
    newState._largestFlame = mMax(newState._largestFlame, newState.heat);

    // console.log(`delta-heat: ${newState.heat - heat}`);


    if (!isDragging && mr() <= woodSpawnRate) {
        const ii = mFloor(mr() * inventoryHeight);
        const jj = mFloor(mr() * inventoryWidth);

        /** @type HTMLElement */
        const $cell = d.querySelector(`.inventory-table>tr:nth-child(${ii + 1})>td:nth-child(${jj + 1})>.move.drop`);

        if ($cell.children.length === 0) {
            const wood = d.createElement('div');
            wood.classList.add('drag', 'wood');
            $cell.append(wood);
        }
    }

    return newState;
};

const addFuel = (fuelUnit) => {
    state.fuels.push(fuelUnit);
    /** @type any */
    let wood;
    $wood.appendChild(wood = createElementFromHTML(plankCSS(fuelUnit)));
    wood.style.transform = `translate(calc(-50% + 1px), calc(-50% + 1px)) scale(1, 1) rotateZ(${woodAngle}deg) translate(${mr() * 5}px, ${state.radius / mPow(state.fuels.length, 3)}px)`;
    woodAngle += woodAngleAdvanceMin + mr() * woodAngleAdvanceVariation;
    _save.push(str1(fuelUnit));
};

const addSpark = (heat) => {
    state.heat += heat;
    _save.push(str1(state));
};

const changeRadius = (radius) => {
    state.radius = mMax(0, mMin(1, radius));
    _save.push(str1(state));
};
// @ts-ignore
window.changeRadius = changeRadius;

const render = (state) => {
    const variation = mr() * 0.2 + 0.8;

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

    const totalFuel = fuels.map(f => f.value).reduce((acc, curr) => acc + curr, 0);
    const richFuel = fuels.filter(f => f.value > 10);
    let elevation = 0

    fuels.forEach((fuelUnit, i) => {
        /** @type any */

        const { valueStart, value, temp, id, frameID: fuelUnitFrameID } = fuelUnit;
        const v = value / valueStart;
        const scale = mPow(v, 1.6) * 0.3 + 0.7;
        // const scale = 1;

        /** @type HTMLElement */
        const wood = d.querySelector(`.wood-plank[data-wood="${id}"]`);
        if (!wood) return;

        const fireWoodHeight = 1.5;
        const placementOffset = mMin(1, (frameID - fuelUnitFrameID) / frameSize * 20) * 40 - 40;
        const transformPart = wood.style.transform
            .replace(/scale\([\d\.]+, [\d\.]+\)/, `scale(${scale}, ${scale})`)
            .replace(/translate\(calc\(-50\% \+ [-\d\.]+px\), calc\(-50\% \+ [-\d\.]+px\)\)/, `translate(calc(-50% + ${2}px), calc(-50% + ${richFuel.length * fireWoodHeight + elevation * -3 + placementOffset}px))`)
            .split(/deg\) /)[0];

        elevation += v * fireWoodHeight;

        const renderedRadius = (10
            * state._radius
            * mPow(fuels.length, 0.15)
            * ((fuels.length - i) < 10 ? mPow(1.3, ((fuels.length - i) / 2))
                : mPow(1.2, (10 / 2)) + (6 - 6 / mPow(fuels.length - i - 10, 1 / 10))
            )
        );
        // `scale(1,1) translate(calc(-50%), calc(-50%))  rotateZ(${woodAngle}deg) translate(${mr() * 5}px, ${state.radius / mPow(state.fuels.length, 3)}px)`;
        wood.style.transform = `${transformPart}deg) translate(0px, ${renderedRadius}px)`;

        // mPow(mPow(fuels.length, 0.8) * state._radius, 2) * 1.8 / mPow(i, 1 / 2)

        wood.style.backgroundColor = 'hsl(36°, 49%, 39%)';
        wood.style.opacity = `${.7 * mPow(mMax(1, value / 50), 2)}`;
        /** @type HTMLElement */
        const t = wood.querySelector('.temp');
        t.style.opacity = `${.5 * mPow(mMin(1, temp / 800), 2)}`;
        /** @type HTMLElement */
        const a = wood.querySelector('.ash');
        a.style.opacity = `${.9 * mPow(1 - v, 1.5)}`;
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
        (elapsedSecond < 86400 ? '' : `${('' + mFloor(elapsedSecond / 86400)).padStart(2, '0')}d`) +
        (elapsedSecond < 3600 ? '' : `${('' + mFloor((elapsedSecond % 86400) / 3600)).padStart(2, '0')}h`) +
        (elapsedSecond < 60 ? '' : `${('' + mFloor((elapsedSecond % 3600) / 60)).padStart(2, '0')}m`) +
        `${(elapsedSecond % 60).toFixed(1).padStart(4, '0')}s`
    );
    if (debugMode === 1) {
        $debug.style.display = 'block';
        $debug.innerHTML = `<pre>` +
            `frameID: #${frameID} (${timeString}), timeScale: ${timeScale}\n` +
            `totalFuel: ${totalFuel.toFixed(2)}\n` +
            `heat: ${heat.toFixed(2)} (-${(1 - _heatLoss).toFixed(2)})\n` +
            `oxygen: ${_remainingOxygen.toFixed(2)}/${oxygen.toFixed(2)}\n` +
            `_largestFrameSkip: ${largestFrameSkip}\n_totalFrameSkipped: ${framesSkipped}\n` +
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
        if (i > 1) largestFrameSkip = mMax(largestFrameSkip, i - 1);
        if (i > 1) framesSkipped += i - 1;

        requestAnimationFrame(a);
    };
    a();
};

main();