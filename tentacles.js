const display = document.querySelector('#display');
const ctx = display.getContext('2d');

const MAX_LEG_SIZE = 200;
const LEGS_COUNT = 15;
const MAX_LIFE = 300;
const MIN_LIFE = 100;
const CATCH_DISTANCE = 2;
const MAX_STAND_TIME = 250;

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
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

const chasingMouse = (function (){
    return {
        moveLeg: ({age, life, start, end}, {x, y, speed, direction}) => ({
            life: age > life ? newRandomLifetime() : life,
            age: age <= life ? age + speed : 0,
            start: [x, y],
            end: age > life ? newRandomLegEnd(x, y, direction) : end
        }),
        updateDirection: (x, y, mx, my) => Math.atan2(my - y, mx - x),
        updateSpeed: position => distanceToSpeed(position.distance),
        updatePosition: ({updateDirection, updateSpeed}, {x, y, speed, direction, distance}, {x: mx, y: my}) => ({
            x: x + Math.cos(direction) * speed,
            y: y + Math.sin(direction) * speed,
            speed: updateSpeed({x, y, speed, direction, distance}),
            direction: updateDirection(x, y, mx, my, direction),
            distance: distanceBetween(x, y, mx, my)
        }),
        update: (position) => {
            if (position.distance <= CATCH_DISTANCE) return standingStill;
            return chasingMouse;
        }
    }

    function distanceToSpeed(distance) {
        if (distance <= 1) return 0;
        if (distance <= 50) return 1;
        if (distance <= 100) return 2;
        if (distance <= 300) return 3;
        return 5;
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
    updatePosition: (movement, position, {x: mx, y: my}) => ({
        ...position,
        speed: 0,
        standTime: typeof position.standTime === 'number' ? position.standTime + 1 : 0,
        distance: distanceBetween(position.x, position.y, mx, my)
    }),
    update: (position, mouse) => {
        if (mouse.moved && position.distance > CATCH_DISTANCE) return chasingMouse;
        if (position.standTime > MAX_STAND_TIME) return roaming;
        return standingStill;
    }
}

const roaming = {
    moveLeg: chasingMouse.moveLeg,
    updateDirection: (x, y, mx, my, direction) =>
        Math.random() > 0.99
            ? Math.PI * 2 * Math.random()
            : (direction || 0),
    updateSpeed: ({speed}) => speed < 1 ? speed + 0.001 : speed < 2 ? speed + 0.002 : speed < 3 ? speed + 0.003 : 3,
    updatePosition: (movement, position, mouse) => {
        const base = chasingMouse.updatePosition(movement, position, mouse);
        return {
            ...base,
            x: base.x < 10 ? 10 : base.x > display.width - 10 ? display.width - 10 : base.x,
            y: base.y < 10 ? 10 : base.y > display.height - 10 ? display.height - 10 : base.y,
        }
    },
    update: (position, mouse) => {
        if (mouse.moved) return chasingMouse;
        return roaming;
    }
}

function update(state) {
    return {
        mouse: updateMouse(state.mouse),
        position: state.movement.updatePosition(state.movement, state.position, state.mouse),
        movement: state.movement.update(state.position, state.mouse),
        legs: moveLegs(state.legs, state.position, state.movement)
    }

    function updateMouse({x, y}) {
        return {
            x: mouseX,
            y: mouseY,
            moved: mouseX !== x || mouseY !== y
        }
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
    mouse:{x: 0, y: 0, moved: false},
    movement: roaming,
    position: {x: 0, y: 0, speed: 0, direction: 0, distance: 0},
    legs: new Array(LEGS_COUNT).fill({start:[], end: [], age: 0, life: 0})
});
