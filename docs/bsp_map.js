import { Rect } from './map_common.js';  
import { Tree } from './bsp.js';
  
   function paint_leaf(leaf, tree, level) {
    if ((leaf.lchild !== void 0) || (leaf.rchild !== void 0)) {
      // recursively search for children until you hit the end of the branch
      if (leaf.lchild) {
        paint_leaf(leaf.lchild, tree, level);
      }
      if (leaf.rchild) {
        return paint_leaf(leaf.rchild, tree, level);
      }
    } else {
      // Create rooms in the end branches of the bsp tree
      level.rooms.push(leaf.leaf);
      return room_func(leaf.leaf, level.mapa);
    }
  };
  
  function paint(tree, level) {
    //for l in tree.leafs
    paint_leaf(tree.rootLeaf, tree, level);
  };
  

  function room_func(room, mapa) {
    var x, x_max, x_max2, x_min, x_min2, y, y_max, y_max2, y_min, y_min2;
    //console.log(room)
    //console.log(mapa)
    // set all tiles within a rectangle to wall
    x_min = room.x1 + 1;
    y_min = room.y1 + 1;
    x_max = room.x2 - 1;
    y_max = room.y2 - 1;
    for (x = x_min; x <= x_max; x++){
        for (y = y_min; y <= y_max; y++){
        mapa[y][x] = '#';
      }
    }
    // Build Interior
    x_min2 = room.x1 + 2;
    x_max2 = room.x2 - 2;
    y_min2 = room.y1 + 2;
    y_max2 = room.y2 - 2;
  // this is inclusive
    for (x = x_min2; x <= x_max2; x++){
        for (y = y_min2; y <= y_max2; y++){
        mapa[y][x] = '.'
      }
    }
  };
  
  function map_create(level = null, max_x = 20, max_y = 20) {
    var bsp_tree, end_x, end_y, start_x, start_y, x, y;
    //new_map = [[ get_index(TileTypes.FLOOR) for _ in range(0, constants.MAP_HEIGHT)] for _ in range(0, constants.MAP_WIDTH)]
    if (level === null) {
      level = new Level(new_map);
      start_x = 0;
      start_y = 0;
      end_x = max_x - 1;
      end_y = max_y - 1;
      // those are inclusive
      // unicodetiles.js indexes in [y][x] order
      for (y = start_y; y <= end_y; y++){
        new_map.push([]);
        for (x = start_x; x <= end_x; x++){  
          new_map[y].push('.');
        }
      }
      level.mapa = new_map;
    }
    // if level has submaps, we only act within submaps borders
    if (level !== null && level.submaps.length > 0) {
      start_x = level.submaps[0].x1;
      end_x = level.submaps[0].x2;
      start_y = level.submaps[0].y1;
      end_y = level.submaps[0].y2;
      for (x = start_x; x <= end_x; x++){
          for (y = start_y; y <= end_y; y++){
          level.mapa[y][x] = '.';
        }
      }
    }
    
    // basic bsp
    bsp_tree = new Tree(new Rect(start_x, start_y, end_x - start_x, end_y - start_y));
    //console.log("tree: ")
    console.log(bsp_tree);
    bsp_tree.split_tree();
    paint(bsp_tree, level);
    //console.log(level.mapa)
    return level;
  };

  export { map_create }