//@ts-check

import { dragAndDrop } from './drag.js';
import './normalizedRAF.js';

const d = document;
// const qs = 'querySelector';
// const qsa = 'querySelectorAll';
// const ce = 'createElement';
const str = a => JSON.stringify(a, null, 4);
const par = JSON.parse;

dragAndDrop({
    // return false to to skip DropResponse
    onDrop(item, dropTarget) {
        if (dropTarget.classList.contains("fire")) {
            state.flameSize += 0.3;
            state.fuels.push(makeFuelUnit(1, { temp: 25 }));
            return false;
        }

        return true;
    }
});

const inventoryWidth = 5;
const inventoryHeight = 4;

/** @type HTMLElement */
const $debug = d.querySelector('.debug');
/** @type HTMLElement */
const $wood = d.querySelector('.fire-wood');
/** @type HTMLElement */
const $flame = d.querySelector('.fire-flame');

const flameW = $flame.offsetWidth;
const flameH = $flame.offsetHeight;
const woodW = $wood.offsetWidth;
const woodH = $wood.offsetHeight;

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

const makeFuelUnit = (chunkSize, override = {}) => {
    return {
        heatReq: 300,
        heatUpRate: 0.008,
        coolDownRate: 0.02,
        oxygenReq: 2,
        fuelReq: 1,
        givesHeatPerTick: 60,
        value: 300,
        temp: 25,
        ...override,
    };
}
const fuelStr = (indent) => (fuel, i, arr) => {
    return [...Array(indent + 1)].join(' ') +
        `${arr.length - 1 - i}.`.padStart(Math.ceil(Math.log10(arr.length)) + 1) + ' ' +
        `${fuel.value.toFixed(2)}`.padStart(4) + ' ' +
        `${fuel.temp.toFixed(2)}`.padStart(8) + ' ' +
        [...Array(4)].join(' ') +
        `${fuel.heatReq}`.padStart(4) + ' ' +
        `${fuel.heatUpRate}`.padStart(4) + ' ' +
        `${fuel.coolDownRate}`.padStart(4) + ' ' +
        `${fuel.oxygenReq}`.padStart(4) + ' ' +
        `${fuel.fuelReq}`.padStart(4) + ' ' +
        `${fuel.givesHeatPerTick}`.padStart(4) + ' ' +
        ``;
}
function easeOut(x) {
    return 1 - Math.pow(1 - x, 6);
}

const frameSize = 100; // 10 fps
const timeScale = 0.1;

let lastTick = 0;
let largestFrameSkip = 0;
let framesSkipped = 0;

let state = {
    frameID: 0,
    flameSize: 1,
    heat: 0,
    heatTransferRate: 0.5,
    oxygen: 100,
    fuels: [],
    air: {
        heat: -10,
        oxygen: 10,
    },
    wind: {
        //     oxygen: 20,
        //     heat: -40,
    },
    woodSpawnRate: 0.05,
};

const init = (state) => {
    state.fuels.push(makeFuelUnit(1, { temp: 500 }));
    state.fuels.push(makeFuelUnit(1, { temp: 500 }));
    state.fuels.push(makeFuelUnit(1, { temp: 500 }));
    state.fuels.push(makeFuelUnit(1, { temp: 25 }));
    state.fuels.push(makeFuelUnit(1, { temp: 25 }));
    return {
        ...state,
        heat: 300,
    };
}
const tick = (state) => {
    const { frameID, fuels, heat, oxygen, heatTransferRate, air, wind, woodSpawnRate } = state;
    let heatBudget = Math.max(0, heat + air.heat + (wind.heat || 0));

    const totalFuel = fuels.map(f => f.value).reduce((acc, curr) => acc + curr, 0);

    const newState = { ...state };
    newState.frameID += 1;
    newState.oxygen += air.oxygen + (wind.oxygen || 0);
    newState.heat = 0;
    newState.fuels = [];

    for (let i = 0; i < fuels.length; i++) {
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

        if (value <= 0 && temp <= 0) continue;
        const newFuel = { ...fuel };

        let transferredHeat = (heatBudget + temp) * heatTransferRate * heatUpRate * Math.sign(heatBudget - temp);
        heatBudget -= transferredHeat;

        newFuel.temp += transferredHeat;
        if (newFuel.value <= 50) newFuel.temp *= 1 - coolDownRate;

        if (newFuel.temp >= heatReq) {
            const oxygenTaken = Math.min(newState.oxygen, oxygenReq);
            const oxygenTakenPercent = oxygenTaken / oxygenReq;

            const fuelTaken = Math.min(value, fuelReq * oxygenTakenPercent);
            const fuelTakenPercent = fuelTaken / fuelReq;

            const conversionPercent = Math.min(oxygenTakenPercent, fuelTakenPercent);

            newState.oxygen -= oxygenReq * conversionPercent;
            newFuel.value -= fuelReq * conversionPercent;
            newState.heat += givesHeatPerTick * conversionPercent;
        }

        newState.fuels.push(newFuel);
    }
    newState.heat += heatBudget * 0.7 * easeOut(totalFuel / 2000);

    // console.log(`delta-heat: ${newState.heat - heat}`);


    if (Math.random() <= woodSpawnRate) {
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

const render = (state) => {
    const variation = Math.random() * 0.3 + 0.7;

    const {
        flameSize,
        frameID,
        heat,
        oxygen,
        fuels,
        air,
        wind,
    } = state;
    const ww = heat / 500 * flameW * variation;
    const hh = heat / 500 * flameH * variation;

    $flame.style.width = ww + 'px';
    $flame.style.height = hh + 'px';

    const totalFuel = fuels.map(f => f.value).reduce((acc, curr) => acc + curr, 0);

    $wood.style.width = (woodW * totalFuel / 500) + 'px';
    $wood.style.height = (woodH * totalFuel / 500) + 'px';

    $debug.innerHTML = `<pre>\n` +
        `frameID: ${frameID}\n` +
        `flameSize: ${flameSize}\n` +
        `totalFuel: ${totalFuel}\n` +
        `heat: ${heat}\n` +
        `oxygen: ${oxygen}\n` +
        `fuels: \n${[...fuels].reverse().map(fuelStr(4)).join('\n')}\n` +
        `air: \n${str(air)}\n` +
        `wind: \n${str(wind)}\n` +
        `Largest Frame Skip: ${largestFrameSkip}, Total Frame Skipped: ${framesSkipped}\n` +
        `</pre>`
        ;
};
// requestAnimationFrame(renderFlame);
// renderFlame();

const main = () => {
    lastTick = Date.now();
    state = init(state);
    render(state);

    const a = () => {
        let i = 0;
        while (Date.now() - lastTick > frameSize / timeScale) {
            state = tick({ ...state });
            lastTick += frameSize;
            i++;
        }
        if (i > 0) render(state);
        if (i > 1) largestFrameSkip = Math.max(largestFrameSkip, i - 1);
        if (i > 1) framesSkipped += i - 1;

        requestAnimationFrame(a);
    }
    a();
}

main();