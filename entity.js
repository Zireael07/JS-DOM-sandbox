class Entity {
	constructor(x, y, name) {
		this.x = x;
		this.y = y;
		this.name = name;
		//optional components
		this.creature = null;
		this.item = null;
		this.inventory = null;
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
    constructor(owner){
		this.owner = owner;
    }
}

class Inventory{
    constructor(capacity){
		this.capacity = capacity;
		this.items = [];
    }
}

export {Entity, Creature, Item, Inventory}