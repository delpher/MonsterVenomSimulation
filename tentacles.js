const display = document.querySelector('#display');
const ctx = display.getContext('2d');

const MAX_LEG_SIZE = 200;
const MIN_LEG_SIZE = 50;
const LEGS_COUNT = 15;
const MAX_LIFE = 300;
const MIN_LIFE = 100;
const CATCH_DISTANCE = 2;
const MAX_STAND_TIME = 250;
const MAX_ROAM_TIME = 6000;
const MAX_SLEEP_TIME = 1500;
const TIME_TILL_TIRED = 1500;

let mouseX = display.width / 2;
let mouseY = display.height / 2;
let movementX = 0;
let movementY = 0;

display.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    movementX = e.movementX;
    movementY = e.movementY;
});

function lineAngle(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
}

function contractX(start, end) {
    const angle = lineAngle(start[0], start[1], end[0], end[1]);
    return start[0] + 20 * Math.cos(angle);
}

function contractY(start, end) {
    const angle = lineAngle(start[0], start[1], end[0], end[1]);
    return start[1] + 20 * Math.sin(angle);
}

function distanceBetween(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function newRandomLifetime() {
    return Math.random() * (MAX_LIFE - MIN_LIFE) + MIN_LIFE;
}

const chasingMouse = (function (){
    return {
        moveLeg: ({age, life, start, end}, {x, y, speed, direction}, maxLegSize, minLegSize) => ({
            life: age > life ? newRandomLifetime() : life,
            age: age <= life ? age + speed : 0,
            start: [x, y],
            end: age > life ? newRandomLegEnd(x, y, direction, maxLegSize, minLegSize) : end,
            length: distanceBetween(start[0], start[1], end[0], end[1])
        }),
        updateDirection: (x, y, mx, my) => lineAngle(x, y,  mx,  my),
        updateSpeed: position => distanceToSpeed(position.distance),
        updatePosition: ({updateDirection, updateSpeed}, {x, y, speed, direction, distance, time}, {x: mx, y: my}) => ({
            emotion: time.chase > TIME_TILL_TIRED ? '🥵' : '😃',
            x: x + Math.cos(direction) * speed,
            y: y + Math.sin(direction) * speed,
            speed: updateSpeed({x, y, speed, direction, distance}),
            time: { chase: typeof time.chase === 'number' ? time.chase + 1 : 0 },
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

    function newRandomLegEnd(x, y, direction, maxLegSize, minLegSize) {
        return [
            x + (randomLegLength(maxLegSize, minLegSize) * Math.cos(randomAngleSpread(direction))),
            y + (randomLegLength(maxLegSize, minLegSize) * Math.sin(randomAngleSpread(direction))),
        ];
    }

    function randomLegLength(maxSize, minSize) {
        const min = minSize || MIN_LEG_SIZE;
        const max = maxSize || MAX_LEG_SIZE;
        return Math.random() * (max - min) + min;
    }

    function randomAngleSpread(direction) {
        return direction + (Math.random() - 0.5) * 1.3;
    }
})();

const standingStill = {
    moveLeg: leg => leg,
    updatePosition: (movement, position, {x: mx, y: my}) => ({
        ...position,
        emotion: '😊',
        speed: 0,
        time: { stand: typeof position.time.stand === 'number' ? position.time.stand + 1 : 0 },
        distance: distanceBetween(position.x, position.y, mx, my)
    }),
    update: (position, mouse) => {
        if (mouse.moved && position.distance > CATCH_DISTANCE) return chasingMouse;
        if (position.time.stand > MAX_STAND_TIME) return roaming;
        return standingStill;
    }
}

const roaming = {
    moveLeg: chasingMouse.moveLeg,
    updateDirection: (x, y, mx, my, direction) =>
        Math.random() > 0.99
            ? Math.PI * 2 * Math.random()
            : (direction || 0),
    updateSpeed: ({speed}) => speed < 0.2 ? speed + 0.001 : speed < 0.5 ? speed + 0.001 : speed < 1 ? speed + 0.001 : 1,
    updatePosition: (movement, position, mouse) => {
        const base = chasingMouse.updatePosition(movement, position, mouse);
        return {
            ...base,
            emotion: position.speed === 1 ? '😟' : '😏',
            time: { roam: typeof position.time.roam === 'number' ? position.time.roam + 1 : 0 },
            x: base.x < 10 ? 10 : base.x > display.width - 10 ? display.width - 10 : base.x,
            y: base.y < 10 ? 10 : base.y > display.height - 10 ? display.height - 10 : base.y,
        }
    },
    update: (position, mouse) => {
        if (mouse.moved && position.distance > CATCH_DISTANCE) return chasingMouse;
        if (position.time.roam > MAX_ROAM_TIME) return fallingAsleep;
        return roaming;
    }
}

const fallingAsleep = {
    moveLeg: roaming.moveLeg,
    updateDirection: roaming.updateDirection,
    updateSpeed: ({speed}) => speed > 0.5 ? speed - 0.002 : speed > 0.25 ? speed - 0.002 : 0,
    updatePosition: (movement, position, mouse) => ({
        ...roaming.updatePosition(movement, position, mouse),
        emotion: '🥱'
    }),
    update: (position, mouse) => {
        if (mouse.moved && position.distance > CATCH_DISTANCE) return chasingMouse;
        if (position.speed === 0) return sleeping;
        return fallingAsleep;
    }
}

const sleeping = {
    moveLeg: ({start, end, length, life, age, ...leg}) => ({
        ...leg,
        start,
        length,
        life: age > life ? newRandomLifetime() : life,
        age: age <= life ? age + 0.5 : 0,
        end: [
            length > 20 && age > life ? contractX(start, end) : end[0],
            length > 20 && age > life ? contractY(start, end) : end[1]
        ]
    }),
    updateDirection: standingStill.updateDirection,
    updateSpeed: standingStill.updateSpeed,
    updatePosition: (movement, position, mouse) => {
        return {
            ...standingStill.updatePosition(movement, position, mouse),
            emotion: '😴',
            time: { sleep: typeof position.time.sleep === 'number' ? position.time.sleep + 1 : 0 },
        }
    },
    update: (position, mouse) => {
        if (mouse.moved && position.distance > CATCH_DISTANCE) return chasingMouse;
        if (position.time.sleep > MAX_SLEEP_TIME) return roaming;
        return sleeping;
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
        renderEmotion(state.position);
    });

    function renderLegs(legs) {
        ctx.strokeStyle = '#00FF00';
        ctx.beginPath();
        legs.map(renderLeg);
        ctx.stroke();
    }

    function renderEmotion({emotion, x, y}) {
        ctx.font = '30px Arial';
        ctx.strokeText(emotion, x - 20, y - 20);
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
    mouse:{x: mouseX, y: mouseY, moved: false},
    movement: roaming,
    position: {x: mouseX, y: mouseY, speed: 0, direction: 0, distance: 0, time: {}},
    legs: new Array(LEGS_COUNT).fill({start:[], end: [], age: 0, life: 0})
});
