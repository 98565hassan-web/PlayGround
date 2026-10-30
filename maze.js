/* Maze layout and shared constants for PAC-MAN: Memory Maze. */

const COLS = 28;
const ROWS = 31;
const TUNNEL_ROW = 14;

const MAZE = [
  "############################",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#o####.#####.##.#####.####o#",
  "#.####.#####.##.#####.####.#",
  "#..........................#",
  "#.####.##.########.##.####.#",
  "#.####.##.########.##.####.#",
  "#......##....##....##......#",
  "######.#####.##.#####.######",
  "######.#####.##.#####.######",
  "######.##....  ....##.######",
  "######.##.###--###.##.######",
  "######.##.#      #.##.######",
  "          #      #          ",
  "######.##.#      #.##.######",
  "######.##.########.##.######",
  "######.##..........##.######",
  "######.##.########.##.######",
  "######.##.########.##.######",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#.####.#####.##.#####.####.#",
  "#o..##.......  .......##..o#",
  "###.##.##.########.##.##.###",
  "###.##.##.########.##.##.###",
  "#......##....##....##......#",
  "#.##########.##.##########.#",
  "#.##########.##.##########.#",
  "#..........................#",
  "############################",
];

const PAC_START = { c: 13, r: 23 };

const GHOST_DEFS = [
  {
    id: "blinky",
    name: "Blinky",
    color: "#ff4d5e",
    start: { c: 13, r: 11 },
    dir: { x: -1, y: 0 },
    release: 0,
    corner: { c: 25, r: 1 },
    memory: 1.15,
    outside: true,
  },
  {
    id: "pinky",
    name: "Pinky",
    color: "#ff8fe0",
    start: { c: 13, r: 14 },
    dir: { x: 0, y: -1 },
    release: 1.4,
    corner: { c: 2, r: 1 },
    memory: 0.9,
  },
  {
    id: "inky",
    name: "Inky",
    color: "#54e6ff",
    start: { c: 11, r: 14 },
    dir: { x: 1, y: 0 },
    release: 4.5,
    corner: { c: 25, r: 29 },
    memory: 1.25,
  },
  {
    id: "clyde",
    name: "Clyde",
    color: "#ffb45c",
    start: { c: 16, r: 14 },
    dir: { x: -1, y: 0 },
    release: 8,
    corner: { c: 2, r: 29 },
    memory: 0.6,
  },
];

const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const GHOST_EXIT = { c: 13, r: 11 };
const GHOST_HOME = { c: 13, r: 13 };

function tileKey(c, r) {
  return r * COLS + c;
}

function wrapCol(c) {
  return (c + COLS) % COLS;
}

if (MAZE.length !== ROWS || MAZE.some((row) => row.length !== COLS)) {
  throw new Error("Maze must be 28 x 31 tiles.");
}
