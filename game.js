import { Entity } from "./entity.js";
import { createFOV } from "./fov.js";

/*global ut */
var term, eng; // Can't be initialized yet because DOM is not ready

var visible = null
var seen = null
var refreshFOV = null

var player = new Entity(3, 2, "@", 255, 255, 255);
var entities = [];

var rng = null

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
// tiles
var WALL = new ut.Tile('▒', 200, 200, 200);
var FLOOR = new ut.Tile('.', 255, 255, 255);
//entities
var AT = new ut.Tile("@", 255, 255, 255);
var THUG = new ut.Tile("t", 255, 0, 0);

// Returns a Tile based on the char array map
function getDungeonTile(x, y) {
	var t = "";
	try { t = map[y][x]; }
	catch(err) { return ut.NULLTILE; }
	if (t === '#') return WALL;
	if (t === '.') return FLOOR;
	return ut.NULLTILE;
}

function getRenderTile(x,y) {
	if (isVisible(x,y)) {
		return getDungeonTile(x,y)
	}
	else if (isSeen(x,y)) {
		var tile = getDungeonTile(x,y);
		if (tile == ut.NULLTILE) { 
			return ut.NULLTILE //those don't have anything to tint xDDD
		} 
		else {
			return new ut.Tile(tile.getChar(), tile.r*0.5, tile.g*0.5, tile.b*0.5)
		}
	}
	//paranoia
	else {
		return ut.NULLTILE;
	}
}

//FOV functions here
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
function isSeen(x, y) {
	return seen.has(`${x},${y}`);
}
function revealTile(x, y) {
	const id = `${x},${y}`;
    visible.add(id);
    seen.add(id);
}

function shouldDraw(x,y) {
	return isVisible(x,y) || isSeen(x,y);
}

function moveEntity(dx, dy, entity) {
	if (eng.tileFunc(entity.x+dx, entity.y+dy).getChar() !== '.') {
		return;
	}
	entity.x += dx;
	entity.y += dy;
}

function spawnEntities() {
	var x = 26;
	var y = 6;
	entities.push(new Entity(x,y, "t", 255,0,0));

	x = 10;
	y = 22;
	entities.push(new Entity(x,y, "t", 255,0,0));
}

// "Main loop"
function tick() {
	var i, e, len, tilex, tiley; //cache
	//player is always centered (see below); cx is half width
	//so this comes out to top left coordinates
	var cam_x = player.x-term.cx;
	var cam_y = player.y-term.cy;
	//console.log("Cam: x: " + cam_x + " y: " + cam_y);
	refreshVisibility();
	eng.update(player.x, player.y); // Update tiles in viewport
	term.put(AT, term.cx, term.cy); // Player character always centered in viewport
	//draw entities
	len = entities.length;
	for (i = 0; i < len; ++i) {
		e = entities[i];
		//only if visible
		if (!isVisible(e.x, e.y)) {
			// skip
			continue;
		}
		//draw in screen space
		tilex = e.x - cam_x;
		tiley = e.y - cam_y;
		term.put(THUG, tilex, tiley);
	}
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

//basic stuff
function initGame() {
	window.setInterval(tick, 50); // Animation
	// Initialize Viewport, i.e. the place where the characters are displayed
	term = new ut.Viewport(document.getElementById("game"), 80, 60, "dom"); //41, 25);
	// Initialize Engine, i.e. the Tile manager
	eng = new ut.Engine(term, getRenderTile, map[0].length, map.length); //w,h
	//Initialize FOV
	visible = new Set();
	seen = new Set();
	setupFOV();
	//use fov in engine
	eng.setMaskFunc(shouldDraw);
	//RNG
	rng = aleaPRNG();
	// more game init
	spawnEntities();
	// engine: initialize input
	ut.initInput(onKeyDown);
}

// Initialize stuff
window.onload = function() {
	initGame()
}