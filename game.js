import { Entity, Creature, Inventory, Item } from "./entity.js";
import { createFOV } from "./fov.js";
import { findPath } from "./astar.js"
import {saveJS, loadJS} from "./save.js"

/*global ut */
var term, eng; // Can't be initialized yet because DOM is not ready

/* our logic */
var visible = null
var seen = null
var refreshFOV = null
var updateFOV = false;

//death
function death_player(){
    gameMessage(this.owner.name + " is DEAD!", 'rgb(255,0,0)');
}
function death_monster(){
    gameMessage(this.owner.name + " is dead!", 'rgb(127,127,127)');
    //delete from game entities
    var index = entities.indexOf( this.owner );
    if (index !== -1) {
        entities.splice( index, 1 );
    }
}


var player = new Entity(3, 2, "Player");
player.creature = new Creature(player, 20, 40, 30, death_player);
player.inventory = new Inventory(26);
var entities = [];

var rng = null
var messages = []

var inventoryOverlay;

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
var MED = new ut.Tile("!", 255, 0, 0);

// Returns a Tile based on the char array map
function getDungeonTile(x, y) {
	var t = "";
	try { t = map[y][x]; }
	catch(err) { return ut.NULLTILE; }
	if (t === '#') return WALL;
	if (t === '.') return FLOOR;
	//paranoia
	if (t === "") return ut.NULLTILE;
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

//HUD
function gameMessage(text, clr){
	//store
	messages.push([text, clr]);
	//this is based on redblobgames
	let messages_div = document.querySelector("#messages");
	// draw
	let line = document.createElement('div');
	//textContent should be faster than innerHTML
	line.textContent = text;
	line.style.color = clr;
	messages_div.appendChild(line);
	//axe the first message if we exceed the limit
	while (messages_div.children.length > 5) {
		messages_div.removeChild(messages_div.children[0]);
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
		gameMessage(`${attacker.name} attacks ${defender.name} for ${damage} hit points.`, 'rgb(255,0,0)');
		takeDamage(defender, damage);
    } else {
        gameMessage(`${attacker.name} attacks ${defender.name} but does no damage.`, 'rgb(255,255,255)');
    }
}

//this avoids the need for PLAYER/ENEMY_TURN enum
function enemiesMove() {
	var target = player; //cache
    for (let entity of entities) {
        if (entity !== player && entity.creature != null) {
			//console.log(`The ${entity.name} ponders the meaning of its existence.`);
			// assume if we can see it, it can see us too
			if (isVisible(entity.x, entity.y)) {
				// move
				if (distance_to(entity.x, entity.y, target.x, target.y) >= 2){
					move_astar(entity, target.x, target.y);
				}
				//if we are adjacent, attack
				else if (target.creature.hp > 0) {
					//this uses backticks!!! JS's format function
					//console.log(`${entity.name} insults you!`);
					attack(entity, player)
				}
			}
        }
    }
}

function add_item(item, inventory){
	if (inventory.items.length > inventory.capacity){
		return;
	}
	inventory.items.push(item);
	//delete from game entities
		var index = entities.indexOf( item );
		if (index !== -1) {
			entities.splice( index, 1 );
		}
	gameMessage(`You pick up ${item.name}`, 'rgb(255,255,255)');
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

function pickupItem() {
	//console.log("Pressed pickup");
	for (let index = 0; index < entities.length; index++) {
		const entity = entities[index];
		if (entity.item != null && entity.x == player.x && entity.y == player.y){
			add_item(entity, player.inventory);
		break; //only pick up one item at once
		}
	}
	//enemy turn
	enemiesMove()
}

function heal(creature, amount){
	if (creature.hp >= creature.max_hp){
	    return;
	}
	//avoid overhealing
	var amt = Math.min(amount, creature.max_hp-creature.hp);
    creature.hp += amt;
	gameMessage("Your wounds start to feel better!", 'rgb(0, 255, 0)');
}

function use_heal(entity){
	heal(entity.creature, 4);
}

function use_item(item, user){
	if (item.item.use_function == null) { return }
	item.item.use_function(user);
    
    //delete from items
    var index = user.inventory.items.indexOf( item );
    if (index !== -1) {
		user.inventory.items.splice( index, 1);
    }
    gameMessage("You have used " + item.name);
}


function clickFunction(button, item) {
	inventoryOverlay.setVisibility(false); //close the inventory
	console.log("Pressed button " + button.innerHTML);
	use_item(item, player);
}

//based on redblobgames
function createInventoryOverlay() {
    const overlay = document.querySelector("#inventory");
    let visible = false;

    function draw() {
        let html = `<ul>`;
        let empty = true;

		let len = player.inventory.items.length;
		for (var i = 0; i < len; ++i) {
			var item = player.inventory.items[i];
            html += `<li><button class="inv_button" }">${String.fromCharCode(65 + i)}</button> ${item.name}</li>`;
			empty = false;
			//not added yet!
			//var button = document.querySelector(".inv_button");
        } //);
        html += `</ul>`;
        if (empty) {
            html = `<div>Your inventory is empty. Press <kbd>I</kbd> again to cancel.</div>${html}`;
        } else {
            html = `<div>Select an item to use it, or <kbd>I</kbd> again to cancel.</div>${html}`;
        }
		overlay.innerHTML = html;
		//TODO: fold into the previous somehow?
		for (var i = 0; i < len; ++i) {
			var buttons = document.querySelectorAll(".inv_button");
			for (var i=0; i < buttons.length; ++i) {
				var button = buttons[i];
				//anonymous function
				button.onclick = function() { clickFunction(button, item); }
			}
		}
    }

    return {
        get visible() { return visible; },
        setVisibility(visibility) {
            visible = visibility;
            overlay.classList.toggle('visible', visibility);
            if (visible) draw();
        },
    };
}


function spawnEntities() {
	var x = 26;
	var y = 6;
	let ent = new Entity(x,y, "thug")
	ent.creature = new Creature(ent, 5, 20,30, death_monster);
	ent.tile = THUG;
	entities.push(ent);

	x = 10;
	y = 22;
	ent = new Entity(x,y, "thug")
	ent.creature = new Creature(ent, 5, 20,30, death_monster);
	ent.tile = THUG;
	entities.push(ent);

	//some items
	x = 22;
	y = 2;
	ent = new Entity(x,y, "medkit");
	ent.item = new Item(ent, use_heal);
	ent.tile = MED;
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
		if (e.tile == null || e.tile == undefined) {
			console.log("Tile for " + e + " is null!");
			continue;
		}
		term.put(e.tile, tilex, tiley);
	}
	term.render(); // Render
}

function showInventory() {
	//var set = inventoryOverlay.visible? false : true;
	if (inventoryOverlay.visible) {
		inventoryOverlay.setVisibility(false);
	}
	else if (!inventoryOverlay.visible) {
		inventoryOverlay.setVisibility(true);
	}
	//return;
}

//stubs that call an actual save/load functions
export function saveGame() {
	const saved = {
		entities: entities,
		player: player,
		visible: visible,
		seen: seen,
		messages: messages,
		map: map
	}; 
    saveJS(saved);
}
export function loadGame() {
	console.log("Loading game...");
    //load data
	var Game_data = loadJS();
	//boon of keeping all entities as data-only - no problems deserializing ;)
	player = Game_data.player;
	player.creature.death_function = death_player;
	
	messages = Game_data.messages;
	//map = Game_data.map;
	//those are sets, so need special handling
    //clear 'em first
    visible.clear();
    seen.clear();
    Game_data.visible.forEach(item => visible.add(item))
    //Game.visible = Game_data.visible
    Game_data.seen.forEach(item => seen.add(item))
	//Game.seen = Game_data.seen
	//set the RNG
	rng = aleaPRNG();

	//work around function loss
    //Game.entities = Game_data.entities
    entities = [];
     for (let index = 0; index < Game_data.entities.length; index++) {
		const e = Game_data.entities[index];
		let ent = new Entity(0,0, "thug");
		Object.assign(ent, e);
		ent.tile = THUG;
		if (e.item != null){
			let i = new Item(ent);
			Object.assign(i, e.item);
			ent.item = i;
			ent.tile = MED;
		}
		if (e.creature != null){
			let c = new Creature(ent, 1, 1,1,death_monster);
			Object.assign(c, e.creature);
			c.owner = ent;
			ent.creature = c;
		}

        entities.push(ent);
    }

	//force refresh
	tick();
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
	else if (k === ut.KEY_G) pickupItem();
	else if (k === ut.KEY_I) showInventory();
	//save/load
	else if (k === ut.KEY_S) saveGame();
	else if (k === ut.KEY_R) loadGame();
	tick();
}

//basic stuff
function initGame() {
	window.setInterval(tick, 50); // Animation
	// Initialize Viewport, i.e. the place where the characters are displayed
	term = new ut.Viewport(document.getElementById("game"), 41, 25, "dom");
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
	inventoryOverlay = createInventoryOverlay();
	// engine: initialize input
	ut.initInput(onKeyDown);
}

// Initialize stuff
window.onload = function() {
	initGame()
}