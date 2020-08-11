class Entity {
	constructor(x, y, name) {
		this.x = x;
		this.y = y;
		this.name = name;
		//optional components
		this.creature = null;
		this.item = null;
		this.inventory = null;
		this.equipment = null;
	}

	// move(dx, dy) {
        //doesn't work due to use of eng here
	// 	if (eng.tileFunc(this.x+dx, this.y+dy).getChar() !== '.') {
	// 	//if (map.grid[this.y + dy][this.x + dx].blocked) {
	// 		return;
	// 	}
	// 	this.x += dx;
	// 	this.y += dy;
	// }

	// draw() {
	// 	term.put(this.x, this.y, this.char, this.color);
	// }
}

class Creature{
    constructor(owner, hp, def, att, die_f){
        this.owner = owner;
        this.hp = hp;
        this.max_hp = hp;
        this.defense = def;
		this.att = att;
		this.death_function = die_f;
    }
}

class Item{
    constructor(owner, use_f=null){
		this.owner = owner;
		this.use_function = use_f;
    }
}

class Inventory{
    constructor(capacity){
		this.capacity = capacity;
		this.items = [];
    }
}

class Equipment{
    constructor(owner, slot, att){
        this.owner = owner;
        this.slot = slot;
        this.equipped = false;
        this.attack = att;
    }
}

export {Entity, Creature, Item, Inventory, Equipment}