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

let state = {
    frameID: 0,
    flameSize: 1,
    heat: 300,
    heatTransferRate: 0.5,
    oxygen: 100,
    remainingOxygen: 0,
    fuels: [
        makeFuelUnit(0, 1, { value: 300 + Math.floor(Math.random() * 100), temp: 500 }),
        makeFuelUnit(0, 1, { value: 300 + Math.floor(Math.random() * 100), temp: 500 }),
        makeFuelUnit(0, 1, { value: 300 + Math.floor(Math.random() * 100), temp: 500 }),
        makeFuelUnit(0, 1, { value: 300 + Math.floor(Math.random() * 100), temp: 25 }),
    ],
    air: {
        heat: -10,
        oxygen: 30,
    },
    wind: {
        //     oxygen: 20,
        //     heat: -40,
    },
    woodSpawnRate: 0.05,
};

dragAndDrop({
    // return false to to skip DropResponse
    onDrop(item, dropTarget) {
        if (dropTarget.classList.contains("fire")) {
            addFuel(makeFuelUnit(state.frameID, 1, { temp: 25 }));
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
const flameScale = 500;
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

function makeFuelUnit(frameID, chunkSize, override = {}) {
    return {
        frameID,
        heatReq: 300,
        heatUpRate: 0.005,
        coolDownRate: 0.02,
        oxygenReq: 2,
        fuelReq: 0.5,
        givesHeatPerTick: 60,
        value: 300,
        temp: 25,
        transferredHeat: 0,
        ...override,
    };
}
const fuelToString = (indent, fuelCount) => (fuel, i) => {
    return [...Array(indent + 1)].join(' ') +
        `${fuelCount - 1 - i}.`.padStart(Math.ceil(Math.log10(fuelCount)) + 1) + ' ' +
        `${fuel.value.toFixed(2)}`.padStart(4) + ' ' +
        `${fuel.temp.toFixed(2)}`.padStart(8) + ' ' +
        `${fuel.transferredHeat.toFixed(2)}`.padStart(8) + ' ' +
        [...Array(4)].join(' ') +
        `${fuel.heatReq}`.padStart(4) + ' ' +
        `${fuel.heatUpRate}`.padStart(4) + ' ' +
        `${fuel.coolDownRate}`.padStart(4) + ' ' +
        `${fuel.oxygenReq}`.padStart(4) + ' ' +
        `${fuel.fuelReq}`.padStart(4) + ' ' +
        `${fuel.givesHeatPerTick}`.padStart(4) + ' ' +
        `${fuel.frameID}`.padStart(4) + ' ' +
        ``;
}
function easeOut(x) {
    return 1 - Math.pow(1 - x, 6);
}

// @ts-ignore
window.save = () => {
    console.log(_save);
}

const init = (state) => {
    return {
        ...state,
    };
}
const tick = (state) => {
    const { frameID, fuels, heat, oxygen, heatTransferRate, air, wind, woodSpawnRate } = state;
    let heatBudget = Math.max(0, heat + air.heat + (wind.heat || 0));

    const totalFuel = fuels.map(f => f.value).reduce((acc, curr) => acc + curr, 0);

    const newState = { ...state };
    newState.frameID += 1;
    newState.heat = 0;
    newState.fuels = [];

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

        if (value <= 0 && temp <= 0.01) continue;
        const newFuel = { ...fuel };

        let transferredHeat = (heatBudget + temp) * heatTransferRate * heatUpRate * value / 100 * Math.sign(heatBudget - temp);
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
            heatBudget += givesHeatPerTick * conversionPercent;
        }

        newState.fuels.push({ ...newFuel, transferredHeat });
    }
    newState.fuels.reverse();
    newState.heat += heatBudget * 0.7 * easeOut(totalFuel / 1600);
    newState.remainingOxygen = newState.oxygen;
    newState.oxygen = air.oxygen + (wind.oxygen || 0);

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

const addFuel = (fuelUnit) => {
    state.fuels.push(fuelUnit);
    _save.push(str1(fuelUnit));
};

const render = (state) => {
    const variation = Math.random() * 0.2 + 0.8;

    const {
        flameSize,
        frameID,
        heat,
        oxygen,
        remainingOxygen,
        fuels,
        air,
        wind,
    } = state;
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

    $debug.innerHTML = `<pre>\n` +
        `frameID: ${frameID} (${frameID * frameSize / 1000}s)\n` +
        `flameSize: ${flameSize}\n` +
        `totalFuel: ${totalFuel}\n` +
        `heat: ${heat}\n` +
        `ashHeat: ${ashStr}\n` +
        `oxygen: ${oxygen}\n` +
        `remainingOxygen: ${remainingOxygen}\n` +
        `fuels: \n${fuelStr}\n` +
        `air: \n${str4(air)}\n` +
        `wind: \n${str4(wind)}\n` +
        `Largest Frame Skip: ${largestFrameSkip}, Total Frame Skipped: ${framesSkipped}\n` +
        `</pre>`
        ;
};
// requestAnimationFrame(renderFlame);
// renderFlame();

const main = () => {
    lastTick = Date.now();
    state = init(state);
    _save.push(str1(state));
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
    }
    a();
}

main();