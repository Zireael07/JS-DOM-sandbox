import { Entity } from "./entity.js";
import { createFOV } from "./fov.js";

/*global ut */
var term, eng; // Can't be initialized yet because DOM is not ready

var visible = null
var refreshFOV = null
var player = new Entity(3, 2, "@", 255, 255, 255);

var map = [
	" #####             #####      ",
	" #...########      #...####   ",
	" #..........#      #......#   ",
	" #...######.#      #..###.#   ",
	" #####    #.#      ######.####",
	"          #.#          #.....#",
	"          #.#          #.....#",
	"          #.############.....#",
	"          #..................#",
	"          ####.###############",
	"##########   #.#     #....#   ",
	"#........##  #.#     #.#..#   ",
	"#..####...#  #.#     #.#..#   ",
	"#.........#  #.#     #.###### ",
	"#.........#  #.#     #......# ",
	"##.########  #.#     #......# ",
	" #.#         #.#     #####.## ",
	" #.#         #.#         #.#  ",
	" #.#   #######.#         #.#  ",
	" #.#   #.......#         #.#  ",
	" #.#   #.....#.#         #.#  ",
	" #.#   #.....#.#         #.#  ",
	" #.#   #.....#.#         #.#  ",
	" #.#   #.....#.#         #.#  ",
	" #.#   #######.#         #.#  ",
	" #.#         #.###########.#  ",
	" #.#         #.............#  ",
	" #.#############.###########  ",
	" #...............#            ",
	" #################            "
];

// The tile palette is precomputed in order to not have to create
// thousands of Tiles on the fly.
var AT = new ut.Tile("@", 255, 255, 255);
var WALL = new ut.Tile('▒', 100, 100, 100);
var FLOOR = new ut.Tile('.', 255, 255, 255);

// Returns a Tile based on the char array map
function getDungeonTile(x, y) {
	var t = "";
	try { t = map[y][x]; }
	catch(err) { return ut.NULLTILE; }
	if (t === '#') return WALL;
	if (t === '.') return FLOOR;
	return ut.NULLTILE;
}

//shortcut that will make it easier to extend later
function isOpaque(x,y) {
	return eng.tileFunc(x, y).getChar() !== '.'
}

function setupFOV() {
	refreshFOV = createFOV(
		map[0].length, 
		map.length,
		(x, y) => revealTile(x, y),
		(x, y) => isOpaque(x, y)
	  );

	refreshVisibility();
}
function refreshVisibility() {
	visible.clear();
	refreshFOV(player.x, player.y, 4);
}

function isVisible(x, y) {
	return visible.has(`${x},${y}`);
}
function revealTile(x, y) {
	visible.add(`${x},${y}`);
}

function moveEntity(dx, dy, entity) {
	if (eng.tileFunc(entity.x+dx, entity.y+dy).getChar() !== '.') {
		return;
	}
	entity.x += dx;
	entity.y += dy;
}

// "Main loop"
function tick() {
	refreshVisibility();
	eng.update(player.x, player.y); // Update tiles in viewport
	term.put(AT, term.cx, term.cy); // Player character always centered in viewport
	term.render(); // Render
}

// Key press handler - movement & collision handling
function onKeyDown(k) {
	//var movedir = { x: 0, y: 0 }; // Movement vector
	if (k === ut.KEY_LEFT || k === ut.KEY_H) moveEntity(-1, 0, player); //movedir.x = -1;
	else if (k === ut.KEY_RIGHT || k === ut.KEY_L) moveEntity(1,0, player); //movedir.x = 1;
	else if (k === ut.KEY_UP || k === ut.KEY_K) moveEntity(0,-1, player); //movedir.y = -1;
	else if (k === ut.KEY_DOWN || k === ut.KEY_J) moveEntity(0,1, player); //movedir.y = 1;
	//if (movedir.x === 0 && movedir.y === 0) return;
	// var oldx = pl.x, oldy = pl.y;
	// pl.x += movedir.x;
	// pl.y += movedir.y;
	// if (eng.tileFunc(pl.x, pl.y).getChar() !== '.') { pl.x = oldx; pl.y = oldy; }
	tick();
}

function initGame() {
	window.setInterval(tick, 50); // Animation
	// Initialize Viewport, i.e. the place where the characters are displayed
	term = new ut.Viewport(document.getElementById("game"), 80, 60, "dom"); //41, 25);
	// Initialize Engine, i.e. the Tile manager
	eng = new ut.Engine(term, getDungeonTile, map[0].length, map.length); //w,h
	//Initialize FOV
	visible = new Set();
	setupFOV();
	//use fov in engine
	eng.setMaskFunc(isVisible)
	// Initialize input
	ut.initInput(onKeyDown);
}

// Initialize stuff
window.onload = function() {
	initGame()
}