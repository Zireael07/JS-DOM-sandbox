class Entity {
	constructor(x, y, char, color) {
		this.x = x;
		this.y = y;
		this.char = char;
		this.color = color;
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

	draw() {
		term.put(this.x, this.y, this.char, this.color);
	}
}

export {Entity}