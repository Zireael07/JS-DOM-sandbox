import { State } from './game_vars.js'

class Rect {
    constructor(x, y, w, h) {
      this.x1 = x;
      this.y1 = y;
      this.x2 = x + w;
      this.y2 = y + h;
      // shortcuts
      this.w = w;
      this.h = h;
    }
  
    center() {
      var cent, centerX, centerY;
      // ensure integer values
      centerX = Math.floor((this.x1 + this.x2) / 2);
      centerY = Math.floor((this.y1 + this.y2) / 2);
      console.log(centerX + " " + centerY);
      cent = [centerX, centerY];
      return cent;
    }
  
    intersect(other) {
      var int;
      //returns true if this rectangle intersects with another one
      int = this.x1 <= this.x2 && this.x2 >= other.x1 && this.y1 <= other.y2 && this.y2 >= other.y1;
      return int;
    }
  
  };
  
  function get_free_tiles(inc_map) {
    var free_tiles, max_x, max_y, x, y;
    free_tiles = [];
    // unicodetiles.js uses [y][x] indexing
    max_y = inc_map.length - 1;
    max_x = inc_map[0].length - 1;
    for (y = 0; y <= max_y; y++){
        for (x = 0; x <= max_x; x++) {
        if (inc_map[y][x] === '.') {
          //if (!TileTypes.data[inc_map[x][y]].block_path) {
          free_tiles.push([x, y]);
        }
      }
    }
    return free_tiles;
  };
  
  function random_free_tile(inc_map) {
    var free_tiles, index, tile, x, y;
    free_tiles = get_free_tiles(inc_map);
    index = State.rng.range(0, free_tiles.length - 1);
    //console.log("Index is " + index)
    x = free_tiles[index][0];
    y = free_tiles[index][1];
    console.log("Coordinates are " + x + " " + y);
    tile = [x, y];
    return tile;
  };

export {Rect, random_free_tile}