
// document.write(HELLO)


const d = document;
const qs = d.querySelector;
const qsa = d.querySelectorAll;

const inventoryWidth = 5;
const inventoryHeight = 4;

const flame = d.querySelector('.fire-flame');
let flameSize = 1;

const flameW = flame.offsetWidth;
const flameH = flame.offsetHeight;


d.querySelector('.inventory-table')
    .append(...(new Array(inventoryHeight).fill(1).map(() => {
        const tr = d.createElement('tr');

        tr.append(...new Array(inventoryWidth).fill(1).map(() => {
            const td = d.createElement('td');

            return td;
        }));
        return tr;
    })))
    ;

setInterval(() => {
    const variation = Math.random() * 0.3 + 0.7;
    const ww = flameSize * flameW * variation;
    const hh = flameSize * flameH * variation;

    flame.style.width = ww + 'px';
    flame.style.height = hh + 'px';
}, 100);