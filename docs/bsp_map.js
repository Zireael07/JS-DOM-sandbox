import { Rect } from './map_common.js';  
import { Tree } from './bsp.js';

import { State } from './game_vars.js';


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
        mapa[y][x] = ';'
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
    // more complex stuff begins here
    create_doors(bsp_tree, level.mapa);
    var building_size = sort_buildings(level.rooms);
    building_factory(level, building_size);
    //console.log(level.mapa)
    return level;
  };

  //helper
  function remove_list(list, item) {
    const newlist = list.filter(it => it !== item)

    return newlist;
}

  //doors
  function find_rooms(leaf, tree, level) {
    if ((leaf.lchild !== void 0) || (leaf.rchild !== void 0)) {
      // recursively search for children until you hit the end of the branch
      if (leaf.lchild) {
        find_rooms(leaf.lchild, tree, level);
      }
      if (leaf.rchild) {
        return find_rooms(leaf.rchild, tree, level);
      }
    } else {
      // Create rooms in the end branches of the bsp tree
      return room_doors(leaf.leaf, level);
    }
  };
  
  function create_doors(tree, level) {
    //for l in tree.leafs
    return find_rooms(tree.rootLeaf, tree, level);
  };
  
  function room_doors(room, mapa) {
    var checkX, checkY, choice, choices, i, len, sel_choices, wall, wallX, wallY, x, y;
    [x, y] = room.center();
    console.log("Creating door for " + x + " " + y);
    choices = ["north", "south", "east", "west"];
    // copy the list so that we don't modify it while iterating (caused some directions to be missed)
    sel_choices = choices.slice(0);
  // check if the door leads anywhere
    for (i = 0, len = choices.length; i < len; i++) {
      choice = choices[i];
      //print(str(choice)+"...")
      if (choice === "north") {
        checkX = x;
        checkY = room.y1 - 1;
      }
      if (choice === "south") {
        checkX = x;
        checkY = room.y2;
      }
      if (choice === "east") {
        checkX = room.x2;
        checkY = y;
      }
      if (choice === "west") {
        checkX = room.x1 - 1;
        checkY = y;
      }
      // if it leads to a wall, remove it from list of choices
      //print("Checking dir " + str(choice) + ": x:" + str(checkX) + " y:" + str(checkY) + " " + str(self._map[checkX][checkY]))
      // unicodetiles.js uses [y][x] indexing
      if (checkY < 0 || checkX < 0 || mapa[checkY][checkX] === '#') {
        //print("Removing direction from list" + str(choice))
        sel_choices = remove_list(sel_choices, choice);
      }
    }
    //print("Choices: " + str(sel_choices))
    if (sel_choices.length > 0) {
      wall = State.rng.getItem(sel_choices);
      console.log("wall: " + wall)
      if (wall === "north") {
        wallX = x;
        wallY = room.y1 + 1;
      } else if (wall === "south") {
        wallX = x;
        wallY = room.y2 - 1;
      } else if (wall === "east") {
        wallX = room.x2 - 1;
        wallY = y;
      } else if (wall === "west") {
        wallX = room.x1 + 1;
        wallY = y;
      }
      return mapa[wallY][wallX] = '+';
    }
  };


  // implementation of building type and decor based on type
  var building_tag = {
    1: "PUB",
    2: "HOVEL",
    3: "UNASSIGNED"
  };

  // descending order
function sort_fun(a, b) {
  return b[1] - a[1];
};

function make_hovel(sorted, i, max) {
  if (i > 1 && i <= max) {
    sorted[i][2] = 2;
    return console.log(i + " is hovel");
  }
};

function sort_buildings(rooms) {
  var building_size, i, r, s, sorted;
  building_size = [];
  for (i = 0; i < rooms.length; i++) {
    r = rooms[i];
    // 4 means unassigned (see above)
    building_size.push([i, r.w * r.h, 4, r]);
  }
  sorted = building_size.sort(sort_fun);
  // biggest is pub
  sorted[0][2] = 1;
  for (i = 0; i < sorted.length; i++) {
    s = sorted[i];
    // others are hovels
    make_hovel(sorted, i, sorted.length - 1);
  }
  console.log(sorted);
  return sorted;
};

function call_building_fun(i, sized, level) {
  if (sized[i][2] === 1) {
    build_pub(sized[i][3], level);
  }
};

function building_factory(level, building_size) {
  var building, i, j, len, results;
  results = [];
  for (i = j = 0, len = building_size.length; j < len; i = ++j) {
    building = building_size[i];
    results.push(call_building_fun(i, building_size, level));
  }
  return results;
};

function build_pub(room, level) {
  var x, x_max, x_min, y, y_max, y_min;
  var to_place_props = ["table", "chair", "table", "chair"];
  var to_place_npcs = ["barkeep", 'shady', "patron", "patron"];
  // keep the building's outskirts empty
  x_min = room.x1 + 3;
  x_max = room.x2 - 3;
  y_min = room.y1 + 3;
  y_max = room.y2 - 3;
  // this is inclusive
  for (x = x_min; x <= x_max; x++) {
      for (y = y_min; y <= y_max; y++){
        if (to_place_props.length > 0 && State.rng.roller("1d3") === 1) {
          level.spawns.push([[x, y], [to_place_props[0], "prop"]]);
          to_place_props = remove_list(to_place_props, to_place_props[0]);
        }
        if (to_place_npcs.length > 0 && State.rng.roller("1d3") === 2) {
          level.spawns.push([[x, y], [to_place_npcs[0], "npc"]]);
          to_place_npcs = remove_list(to_place_npcs, to_place_npcs[0]);
        }
      }
  }
};


  export { map_create }