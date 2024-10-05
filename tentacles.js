const display = document.querySelector('#display');
const ctx = display.getContext('2d');

const MAX_LEG_SIZE = 200;
const LEGS_COUNT = 15;
const MAX_LIFE = 300;
const MIN_LIFE = 100;

let mouseX = 0;
let mouseY = 0;
let movementX = 0;
let movementY = 0;

display.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    movementX = e.movementX;
    movementY = e.movementY;
});

function distanceBetween(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2, 2));
}

const chasingMouse = (function (){
    return {
        moveLeg: ({age, life, start, end}, {x, y, speed, direction}) => ({
            life: age > life ? newRandomLifetime() : life,
            age: age <= life ? age + speed : 0,
            start: [x, y],
            end: age > life ? newRandomLegEnd(x, y, direction) : end
        }),
        updatePosition: ({x, y, speed, direction, distance}, {x: mx, y: my}) => ({
            x: x + Math.cos(direction) * speed,
            y: y + Math.sin(direction) * speed,
            speed: 1,
            direction: Math.atan2(my - y, mx - x),
            distance: distanceBetween(x, y, mx, my)
        })
    }

    function newRandomLegEnd(x, y, direction) {
        return [
            x + (randomLegLength() * Math.cos(randomAngleSpread(direction))),
            y + (randomLegLength() * Math.sin(randomAngleSpread(direction))),
        ];
    }

    function randomLegLength() {
        return Math.random() * MAX_LEG_SIZE;
    }

    function randomAngleSpread(direction) {
        return direction + (Math.random() - 0.5) * 1.3;
    }

    function newRandomLifetime() {
        return Math.random() * (MAX_LIFE - MIN_LIFE) + MIN_LIFE;
    }
})();

const standingStill = {
    moveLeg: leg => leg,
    updatePosition: (position, {x: mx, y: my}) => ({
        ...position,
        distance: distanceBetween(position.x, position.y, mx, my)
    })
}

function update(state) {
    return {
        mouse: readMouse(),
        position: state.movement.updatePosition(state.position, state.mouse),
        movement: updateMovement(state.position),
        legs: moveLegs(state.legs, state.position, state.movement)
    }

    function readMouse() {
        return {
            x: mouseX,
            y: mouseY
        }
    }

    function updateMovement({distance}) {
        if (distance >= 1)
            return chasingMouse;
        return standingStill;
    }

    function moveLegs(legs, mouse, movement) {
        return legs.map(leg => movement.moveLeg(leg, mouse));
    }
}

function render(state) {
    requestAnimationFrame(() => {
        resizeCanvas();
        clearCanvas();
        renderLegs(state.legs);
    });

    function renderLegs(legs) {
        ctx.strokeStyle = '#00FF00';
        ctx.beginPath();
        legs.map(renderLeg);
        ctx.stroke();
    }

    function renderLeg({start, end}) {
        ctx.moveTo(start[0], start[1]);
        ctx.lineTo(end[0], end[1]);
    }

    function resizeCanvas() {
        display.width = document.body.clientWidth;
        display.height = document.body.clientHeight;
    }

    function clearCanvas() {
        ctx.fillStyle = '#002000';
        ctx.fillRect(0, 0, display.width, display.height);
    }
}

(function run(state) {
    render(state);
    setTimeout(() => run(update(state)));
})({
    mouse:{x: 0, y: 0, delta: 0},
    movement: chasingMouse,
    position: {x: 0, y: 0, speed: 0, direction: 0, distance: 0},
    legs: new Array(LEGS_COUNT).fill({start:[], end: [], age: 0, life: 0})
});
