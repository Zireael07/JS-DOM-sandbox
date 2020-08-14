import { Entity, Creature, Inventory, Item, Equipment } from "./entity.js";
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
var mouse = null

var map = []
// var map = [
// 	" #####             #####      ",
// 	" #...########      #...####   ",
// 	" #..........#      #......#   ",
// 	" #...######.#      #..###.#   ",
// 	" #####    #.#      ######.####",
// 	"          #.#          #.....#",
// 	"          #.#          #.....#",
// 	"          #.############.....#",
// 	"          #..................#",
// 	"          ####.###############",
// 	"##########   #.#     #....#   ",
// 	"#........##  #.#     #.#..#   ",
// 	"#..####...#  #.#     #.#..#   ",
// 	"#.........#  #.#     #.###### ",
// 	"#.........#  #.#     #......# ",
// 	"##.########  #.#     #......# ",
// 	" #.#         #.#     #####.## ",
// 	" #.#         #.#         #.#  ",
// 	" #.#   #######.#         #.#  ",
// 	" #.#   #.......#         #.#  ",
// 	" #.#   #.....#.#         #.#  ",
// 	" #.#   #.....#.#         #.#  ",
// 	" #.#   #.....#.#         #.#  ",
// 	" #.#   #.....#.#         #.#  ",
// 	" #.#   #######.#         #.#  ",
// 	" #.#         #.###########.#  ",
// 	" #.#         #.............#  ",
// 	" #.#############.###########  ",
// 	" #...............#            ",
// 	" #################            "
// ];

// The tile palette is precomputed in order to not have to create
// thousands of Tiles on the fly.
// tiles
var WALL = new ut.Tile('▒', 200, 200, 200);
var FLOOR = new ut.Tile('.', 255, 255, 255);
//entities
var AT = new ut.Tile("@", 255, 255, 255);
var THUG = new ut.Tile("t", 255, 0, 0);
var MED = new ut.Tile("!", 255, 0, 0);
var KNIFE = new ut.Tile("/", 0, 255, 255);

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

//math
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
	var bonuses = 0;
	if (attacker.inventory != null){
		var array = equipped_items(attacker.inventory);
		for (let index = 0; index < array.length; index++) {
			const element = array[index];
			bonuses += element.equipment.attack;
		}
	}

	damage += bonuses;


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

function use_heal(item, user){
	heal(user.creature, 4);
	return true;
}

function use_equip(item, user){
	toggle_equip(user, item.equipment);
	return false;
}

function use_item(item, user){
	if (item.item.use_function == null) { return }
	var destroy_on_use = item.item.use_function(item, user);
	
	if (destroy_on_use) {
		//delete from items
		var index = user.inventory.items.indexOf( item );
		if (index !== -1) {
			user.inventory.items.splice( index, 1);
		}
		gameMessage("You have used " + item.name);
	}
}


function clickFunction(button, item) {
	inventoryOverlay.setVisibility(false); //close the inventory
	console.log("Pressed button " + button.innerHTML);
	use_item(item, player);
}

// returns the equipment in a slot, or null if it's empty
function get_equipped_in_slot(user, slot){
	for (let index = 0; index < user.inventory.items.length; index++){
		const obj = user.inventory.items[index];
		if (obj.equipment != null && obj.equipment.slot == slot && obj.equipment.equipped){
			return obj.equipment;
		}
	}
	return null;
}

function equipped_items(inventory){
	let list_equipped = [];
	for (let index = 0; index < inventory.items.length; index++) {
		const item = inventory.items[index];
		if (item.equipment != null && item.equipment.equipped){
			list_equipped.push(item);
		}
	}
	return list_equipped;
}

function toggle_equip(actor, eq){
    if (eq.equipped){
        unequip(actor, eq);
    }
    else{
        equip(actor, eq);
    }
}
function equip(actor, eq){
	var old_equipment = get_equipped_in_slot(actor, eq.slot);
	if (old_equipment != null){
		unequip(actor, old_equipment);
	}
	eq.equipped = true;
	gameMessage("Item equipped", 'rgb(255,255,255)');

};
function unequip(actor, eq){
	eq.equipped = false;
	gameMessage("Took off item", 'rgb(255,255,255');
};

function display_name(entity){
	if (entity.item){
		if (entity.equipment && entity.equipment.equipped){
			return entity.name + " (equipped)";
		}
		else{
			return entity.name;
		}
	}
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
            html += `<li><button class="inv_button" }">${String.fromCharCode(65 + i)}</button> ${display_name(item)}</li>`;
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

	ent = new Entity(3,3, "combat knife");
	ent.item = new Item(ent, use_equip);
	ent.tile = KNIFE;
    ent.equipment = new Equipment(ent, "MAIN_HAND", 5);
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
	
	//render here
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

	// draw highlight under clicked tile
	if (mouse) {
		var t = term.get(mouse.x, mouse.y);
		//dark highlight (one of the default colors offered by CSS picker)
		term.put(new ut.Tile(t.ch, t.r, t.g, t.b, 63, 81, 181), mouse.x, mouse.y);
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
		if (e.equipment != null) {
			//let i = new Equipment()
			ent.tile = KNIFE;
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

//mouse/touch
function getMousePos(e) {
    return {x:e.clientX,y:e.clientY};
}

function relPos(e, gm) {
	return {x: e.clientX-gm.offsetLeft, y: e.clientY-gm.offsetTop};
}


function termPos(e, gm) {
	var rel = relPos(e, gm);
	//hack
	var gm_s = gm.getBoundingClientRect();
	var tile_w = (gm_s.width)/term.w;
	var tile_h = (gm_s.height)/term.h;
	//console.log(tile_w + " " + tile_h);
	var tx = Math.floor(rel.x/tile_w);
	var ty = Math.floor(rel.y/tile_h);

	//term.tw and term.th should be set by DOMRenderer's updateStyle() but it's not :(
	return {x: tx, y: ty}
}

function worldPos(t_pos){
	//console.log("Term pos: x" + t_pos.x + "y: " + t_pos.y);
	// term.cx and term.cy always == player position
	// this comes out to top left coordinates
	var cam_x = player.x-term.cx;
	var cam_y = player.y-term.cy;
	//console.log("Cam pos: x: " + cam_x + "y: " + cam_y);
	return {x: t_pos.x+cam_x, y: t_pos.y+cam_y}
}

function onClickH(w_pos) {
	//ignore clicks outside of map
	if (w_pos.x < 0 || w_pos.y < 0 || w_pos.x > map[0].length || w_pos.y > map.length) {
		return;
	} 

	//move player
	//if (distance_to(player.x, player.y, w_pos.x, w_pos.y < 2)) {
	var dir_x = w_pos.x-player.x
	var dir_y = w_pos.y-player.y
	//console.log(dir_x + " " + dir_y);
	if (dir_x < 2 && dir_x > -2 && dir_y < 2 && dir_y > -2){
		moveEntity(dir_x, dir_y, player);
	}
	tick();
}

// all modern browsers support vw/wh units
// taken from: https://stackoverflow.com/a/16389226
function getBrowserViewportDimensions() {
	var objNode = document.createElement("div");
	objNode.style.width  = "100vw";
	objNode.style.height = "100vh";
	document.body.appendChild(objNode);
	var intViewportWidth  = objNode.offsetWidth;
	var intViewportHeight = objNode.offsetHeight;
	document.body.removeChild(objNode);
	return {w: intViewportWidth, h: intViewportHeight}
}

function fitTerm(view) {
	var gm = document.getElementById("game");
	var font_s = window.getComputedStyle(gm).fontSize
	console.log("Font s: " + font_s);
	font_s = parseFloat(font_s)*1.2 //take into account the 1.2ch style
	//ratio for DejaVuSans is 9.6:16 or 12:20
	//calculate instead of hardcoding
	var tile_w = (font_s*12)/20;
	var tile_h = font_s;

	//deduct margins
	var num_w = Math.floor((view.w-16)/tile_w);
	//reasonable upper limits for very big screens
	if (num_w > 60) {
		num_w = 60
	}
	return num_w
}

//basic stuff
function initGame() {
	window.setInterval(tick, 50); // Animation

	var term_size = {w:41, h:25};
	//fit to screen width
	var b_viewport = getBrowserViewportDimensions();
	//debug
	gameMessage("vw: " + b_viewport.w + " wh: " + b_viewport.h)
	var calcTermSize = fitTerm(b_viewport);
	term_size.w = calcTermSize

	//debug
	gameMessage("Term: w" + term_size.w + " h " + term_size.h);

	//RNG
	rng = aleaPRNG();

	//generate map
	var simplex_map = new SimplexNoise(rng);
	var block, i,j;
	map = []
	// unicodetiles.js uses [y][x] indexing, so needs must...
	for (j = 0; j < 31; ++j) {
		map.push([]);
		for (i = 0; i < 31; ++i) {
			//var bg = convertNoise(simplex_neb.noise(i*0.05,j*0.05));
			var bg = simplex_map.noise(i*0.05, j*0.05);
			block = bg > 0.85 ? '#' : '.' //JS ternary
			map[j][i] = block
		}
	}

	// Initialize Viewport, i.e. the place where the characters are displayed
	term = new ut.Viewport(document.getElementById("game"), term_size.w, term_size.h, "dom"); //w, h
	console.log("Term: " + term.w, term.h);
	// Initialize Engine, i.e. the Tile manager
	eng = new ut.Engine(term, getRenderTile, map[0].length, map.length); //w,h
	//Initialize FOV
	visible = new Set();
	seen = new Set();
	setupFOV();
	//use fov in engine
	eng.setMaskFunc(shouldDraw);

	// more game init
	spawnEntities();
	inventoryOverlay = createInventoryOverlay();
	// engine: initialize input
	ut.initInput(onKeyDown);
	// mouse and touch input
	var gm = document.getElementById("game");
	gm.addEventListener('mousedown', e => { 
		e.preventDefault();
		//var m_pos = getMousePos(e);
		//console.log("Pressed mouse @ x: " + m_pos.x + " y: " + m_pos.y);
		//var r_pos = relPos(e, gm);
		//console.log("Position relative to gm: x: " + r_pos.x + " y:" + r_pos.y);
		mouse = termPos(e, gm);
		//console.log("Term pos: x: " + t_pos.x + " y: " + t_pos.y);
		var w_pos = worldPos(mouse);
		//console.log("World pos: x " + w_pos.x + " y: " + w_pos.y);
		onClickH(w_pos);
	});
	gm.addEventListener('mouseup', e => { e.preventDefault() } );
	gm.addEventListener('mousemove', e => { 
		e.preventDefault();
		mouse = termPos(e, gm);
		//console.log(mouse);
		tick();
	});
	//debug
	//gameMessage("Window width: " + window.outerWidth +  window.outerHeight+ " height" + )
}

// Initialize stuff
window.onload = function() {
	initGame();
}