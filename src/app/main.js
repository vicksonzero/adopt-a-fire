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


const frameSize = 100; // 10 fps
const timeScale = 1;

let lastTick = 0;
let largestFrameSkip = 0;
let framesSkipped = 0;
const _save = [];
let debugMode = 0; // 0=off, 1=debug, 2=verbose

const gameOverTemp = 100;

let state = {};

let isDragging = false;
dragAndDrop({
    // return false to to skip DropResponse
    onDrop(item, dropTarget) {
        isDragging = false;
        if (dropTarget.classList.contains("fire")) {
            addFuel(makeFuelUnit(state.frameID, 1, 0, { temp: 25 }));
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

const bindButtons = () => {
    d.querySelector('button.start').addEventListener('pointerup', () => {
        addSpark(400);
    });
    const $reset = d.querySelector('button.reset')
    if ($reset) $reset.addEventListener('pointerup', () => {
        console.log('reset', state.frameID);
        init(state.frameID);
    });
};
bindButtons();

const inventoryWidth = 5;
const inventoryHeight = 4;

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

            const move = d.createElement('div');
            move.classList.add('move', 'drop');
            if (Math.random() > 0.5) {
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

function easeOut(x) {
    return 1 - Math.pow(1 - x, 6);
}

// @ts-ignore
window.save = () => {
    console.log(_save);
};
// @ts-ignore
window.state = () => {
    console.log(state);
};

function makeFuelUnit(frameID, chunkSize, variation, override = {}) {
    return {
        frameID,
        heatReq: 300 * chunkSize,
        heatUpRate: 0.009 / chunkSize,
        coolDownRate: 0.015 / chunkSize,
        oxygenReq: 2 * chunkSize,
        fuelReq: 0.08,
        givesHeatPerTick: 54 * Math.pow(chunkSize, 1 / 2),
        value: Math.floor(300 * chunkSize * (1 + Math.random() * variation)),
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
        heat: 25,
        heatTransferRate: 0.7,
        oxygen: 100,
        oxygenDepreciation: 0.92, // smaller means less gas remains
        _remainingOxygen: 0,
        _largestFlame: 0,
        fuels: [
            makeFuelUnit(0, 0.2, 0.5, {
                temp: 25,
            }),
            makeFuelUnit(0, 0.2, 0.5, {
                temp: 25,
            }),
            makeFuelUnit(0, 0.2, 0.5, {
                temp: 25,
            }),
            makeFuelUnit(0, 0.2, 0.5, {
                temp: 25,
            }),
            makeFuelUnit(0, 0.2, 0.5, {
                temp: 25,
            }),
            makeFuelUnit(0, 0.2, 0.5, {
                temp: 25,
            }),
            makeFuelUnit(0, 0.2, 0.5, {
                temp: 25,
            }),
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
    _save.push(str1(state));
};
const tick = (state) => {
    const { isRunning, frameID, fuels, heat, oxygen, heatTransferRate, air, wind, woodSpawnRate } = state;
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

        let _transferredHeat = (heatBudget - temp) * heatTransferRate * heatUpRate; // * value / 100
        heatBudget -= _transferredHeat;
        let _oxygenGiven = 0;
        newFuel.temp += _transferredHeat;
        if (newFuel.value <= 50) newFuel.temp *= 1 - coolDownRate;

        if (newFuel.temp >= heatReq) {
            const oxygenTaken = Math.min(newState.oxygen, oxygenReq * Math.pow(newFuel.temp / heatReq, 1 / 20));
            const oxygenTakenPercent = oxygenTaken / oxygenReq;

            const fuelTaken = Math.min(value, fuelReq * oxygenTakenPercent);
            const fuelTakenPercent = fuelTaken / fuelReq;

            const conversionPercent = Math.min(oxygenTakenPercent, fuelTakenPercent);

            _oxygenGiven = oxygenReq * conversionPercent;
            newState.oxygen -= _oxygenGiven;
            newFuel.value -= fuelReq * conversionPercent;
            heatBudget += givesHeatPerTick * conversionPercent;
        }
        newState.oxygen *= state.oxygenDepreciation / Math.pow(newFuel.value, 1 / 10);
        const _oxygenChange = stepOxygen - newState.oxygen;
        const _heatChange = newFuel.temp - temp;

        newState.fuels.push({ ...newFuel, _transferredHeat, _heatChange, _oxygenGiven, _oxygenChange });
    }
    newState.fuels.reverse();
    newState.heat += heatBudget * 0.8 * easeOut(totalFuel / 1600);
    newState._remainingOxygen = newState.oxygen;
    newState.oxygen = air.oxygen + (wind.oxygen || 0);
    newState._largestFlame = Math.max(newState._largestFlame, newState.heat);

    // console.log(`delta-heat: ${newState.heat - heat}`);


    if (!isDragging && Math.random() <= woodSpawnRate) {
        const ii = Math.floor(Math.random() * inventoryHeight);
        const jj = Math.floor(Math.random() * inventoryWidth);

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
    _save.push(str1(fuelUnit));
};

const addSpark = (heat) => {
    state.heat += heat;
    _save.push(str1(state));
};

const render = (state) => {
    const variation = Math.random() * 0.2 + 0.8;

    const {
        frameID,
        heat,
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

    $wood.style.width = (woodW * totalFuel / woodScale) + 'px';
    $wood.style.height = (woodH * totalFuel / woodScale) + 'px';

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
    if (debugMode === 1) {
        $debug.style.display = 'block';
        $debug.innerHTML = `<pre>` +
            `frameID: #${frameID} (${frameID * frameSize / 1000}s), timeScale: ${timeScale}\n` +
            `totalFuel: ${totalFuel.toFixed(2)}\n` +
            `heat: ${heat.toFixed(2)}\n` +
            `oxygen: ${_remainingOxygen.toFixed(2)}/${oxygen.toFixed(2)}\n` +
            `_largestFrameSkip: ${largestFrameSkip}\n_totalFrameSkipped: ${framesSkipped}\n` +
            `</pre>`
            ;
    }

    if (debugMode === 2) {
        $debug.style.display = 'block';
        $debug.innerHTML = [`<pre>`,
            `frameID: #${frameID} (${frameID * frameSize / 1000}s), timeScale: ${timeScale}\n`,
            `totalFuel: ${totalFuel.toFixed(2)}\n`,
            `heat: ${heat.toFixed(2)}\n`,
            `ashHeat: ${ashStr.toFixed(2)}\n`,
            `oxygen: ${_remainingOxygen.toFixed(2)}/${oxygen.toFixed(2)}\n`,
            `fuels:   value     temp   _tHeat  _dHeat     _o2    _dO2\n`,
            `${fuelStr}\n`,
            `air: \n${str4(air)}\n`,
            `wind: \n${str4(wind)}\n`,
            `_largestFrameSkip: ${largestFrameSkip}\n`,
            `_totalFrameSkipped: ${framesSkipped}\n`,
            `_largestFlame: ${_largestFlame}\n`,
            `</pre>`
        ].join('\n');
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
        if (i > 0) render(state);
        if (i > 1) largestFrameSkip = Math.max(largestFrameSkip, i - 1);
        if (i > 1) framesSkipped += i - 1;

        requestAnimationFrame(a);
    };
    a();
};

main();