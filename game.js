import { Entity, Creature } from "./entity.js";
import { createFOV } from "./fov.js";
import { findPath } from "./astar.js"

/*global ut */
var term, eng; // Can't be initialized yet because DOM is not ready

var visible = null
var seen = null
var refreshFOV = null
var updateFOV = false;

//death
function death_player(){
    console.log(this.owner.name + " is DEAD!"); //, 'rgb(255,0,0)');
}
function death_monster(){
    console.log(this.owner.name + " is dead!"); //'rgb(127,127,127)');
    //delete from game entities
    var index = entities.indexOf( this.owner );
    if (index !== -1) {
        entities.splice( index, 1 );
    }
}


var player = new Entity(3, 2, "Player");
player.creature = new Creature(player, 20, 40, 30, death_player);
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

function get_creatures_at(entities, x, y){
	//for...in statement iterates over user-defined properties in addition to the array elements
	for (let index = 0; index < entities.length; index++) {
		const entity = entities[index];
		if (entity.creature != null && entity.x == x && entity.y == y){
			return entity;
			}
		}
		return null;
}

function distance_to(sx,sy, tx, ty){
    let dx = tx - sx;
    let dy = ty - sy;
    return (Math.sqrt(dx ** 2 + dy ** 2));
}

function isBlocked(x,y) {
	return eng.tileFunc(x, y).getChar() !== '.'
}

function move_astar(entity, tx, ty){
	console.log("Calling astar...");
	var astar = findPath(map, [entity.x, entity.y], [tx, ty], isBlocked);

	if (!astar.length < 1){
		// get the next point along the path (because #0 is our current position)
		// it was already checked for walkability by astar so we don't need to do it again
		// destructuring assignment to move the entity
		[entity.x, entity.y] = astar[1]
	}
}

function takeDamage(target, amount) {
    target.creature.hp -= amount;
    if (target.creature.hp <= 0) {
        target.creature.dead = true;
		console.log(`${target.name} dies!`);
		// kill!
        target.creature.death_function();
        
    }
}

function attack(attacker, defender) {
    let damage = rng.roller("1d6");
    if (damage > 0) {
		console.log(`${attacker.name} attacks ${defender.name} for ${damage} hit points.`);
		takeDamage(defender, damage);
    } else {
        console.log(`${attacker.name} attacks ${defender.name} but does no damage.`);
    }
}

//this avoids the need for PLAYER/ENEMY_TURN enum
function enemiesMove() {
	var target = player; //cache
    for (let entity of entities) {
        if (entity !== player) {
			//console.log(`The ${entity.name} ponders the meaning of its existence.`);
			// assume if we can see it, it can see us too
			if (isVisible(entity.x, entity.y)) {
				// move
				if (distance_to(entity.x, entity.y, target.x, target.y) >= 2){
					move_astar(entity, target.x, target.y);
				}
				//if we are adjacent, attack
				else if (target.creature.hp > 0) {
					//this uses backticks!!!
					//console.log(`${entity.name} insults you!`);
					attack(entity, player)
				}
			}
        }
    }
}

function moveEntity(dx, dy, entity) {
	//if dead, do nothing
	if (entity.creature.dead) {
        console.log("You are dead.");
        return;
    }


	//do we need to refresh FOV?
	updateFOV = true;

	var tx = entity.x + dx;
	var ty = entity.y + dy;

	//is it a wall?
	if (eng.tileFunc(tx, ty).getChar() !== '.') {
		updateFOV = false;
		return;
	}

	//check for creatures
	var target = get_creatures_at(entities, tx, ty);
	if (target != null){
		//console.log("You kick " + target.name + " in the shins!");
		attack(player, target);
		//no need to refresh FOV
		updateFOV = false;
		return;
	}

	entity.x += dx;
	entity.y += dy;

	//enemy turn
	enemiesMove()
}

function spawnEntities() {
	var x = 26;
	var y = 6;
	let ent = new Entity(x,y, "thug")
	ent.creature = new Creature(ent, 5, 20,30, death_monster);
	entities.push(ent);

	x = 10;
	y = 22;
	ent = new Entity(x,y, "thug")
	ent.creature = new Creature(ent, 5, 20,30, death_monster);
	entities.push(ent);
}

// "Main loop"
function tick() {
	var i, e, len, tilex, tiley; //cache
	//player is always centered (see below); cx is half width
	//so this comes out to top left coordinates
	var cam_x = player.x-term.cx;
	var cam_y = player.y-term.cy;
	//console.log("Cam: x: " + cam_x + " y: " + cam_y);
	if (updateFOV) { refreshVisibility(); }
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


	if (k === ut.KEY_LEFT || k === ut.KEY_H) moveEntity(-1, 0, player);
	else if (k === ut.KEY_RIGHT || k === ut.KEY_L) moveEntity(1,0, player);
	else if (k === ut.KEY_UP || k === ut.KEY_K) moveEntity(0,-1, player);
	else if (k === ut.KEY_DOWN || k === ut.KEY_J) moveEntity(0,1, player);
	//diagonals
	else if (k === ut.KEY_Y) moveEntity(-1,-1, player);
	else if (k === ut.KEY_U) moveEntity(1,-1, player);
	else if (k === ut.KEY_B) moveEntity(-1,1, player);
	else if (k === ut.KEY_N) moveEntity(1,1, player);

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