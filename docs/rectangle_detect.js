  import { Rect } from './map_common.js';
  
  import { max_rectangle_histogram } from './max_rectangle_hist.js';
  
  function num_unbroken_floors_columns(inc_map) {
    var add, north, num_floors, x, y;
    //num_floors = [[0 for _ in range(len(inc_map[0]))] for _ in range(len(inc_map))]
    num_floors = [];
    //unicodetiles.js indexes as [y][x]
    for (x = 0; x < inc_map[0].length; x++){
    //for (x = i = 0, ref = inc_map.length; (0 <= ref ? i <= ref : i >= ref); x = 0 <= ref ? ++i : --i) {
      num_floors.push([]);
      //for (y = j = 0, ref1 = inc_map[0].length; (0 <= ref1 ? j <= ref1 : j >= ref1); y = 0 <= ref1 ? ++j : --j) {
      for (y = 0; y < inc_map.length; y++){
        num_floors[x].push(0);
      }
    }
  // width
  //console.log(num_floors)
  
    //console.log("North: " + Directions.NORTH)
    //unicodetiles.js indexes as [y][x]
    for (x = 0; x <= inc_map[0].length-1; x++){
        //height
      for (y=0; y <= inc_map.length-1; y++){
      //for (y = l = 0, ref3 = inc_map[0].length - 1; (0 <= ref3 ? l <= ref3 : l >= ref3); y = 0 <= ref3 ? ++l : --l) {
        // paranoia
        //north = [x + Directions.NORTH[0], y + Directions.NORTH[1]];
        north = [ x + 0, y -1];
        add = y === 0 ? 0 : num_floors[north[0]][north[1]];
        
        //console.log("North: " + north)
        num_floors[x][y] = inc_map[y][x] === '.' ? 1 + add : 0;
      }
    }
    return num_floors;
  };
  
  // parse it nicely
  function unbroken_floors_columns_get(num_floors) {
    var floors, row, x, y;
    floors = [];
    //for (y = i = 0, ref = num_floors.length - 1; (0 <= ref ? i <= ref : i >= ref); y = 0 <= ref ? ++i : --i) {
    for (y = 0; y <= num_floors.length -1; y++){
      row = [];
      for (x = 0; x <= num_floors[0].length-1; x++){
      //for (x = j = 0, ref1 = num_floors[0].length - 1; (0 <= ref1 ? j <= ref1 : j >= ref1); x = 0 <= ref1 ? ++j : --j) {
        row.push(num_floors[x][y]);
      }
      floors.push(row);
    }
    return floors;
  };
  
  function sort_fun(a, b) {
    return b[0] - a[0]; //explicitly sort by area, see max_rectangle_hist.js
  };
  
  // step two of finding rectangle of floor in matrix
  // https://stackoverflow.com/a/12387148
  function largest_area_rects(floors) {
    var rect, sorted, y, y_min;
    var rects = [];
    // reverse order
    y_min = floors.length - 2;
    for (y = y_min; y >=0; y--){
    //for (y = i = ref = y_min; (ref <= 0 ? i <= 0 : i >= 0); y = ref <= 0 ? ++i : --i) {
      //console.log("Index: " + y)
      //console.log(floors[y])
      rect = max_rectangle_histogram(floors[y], y);
      // some rects can turn out null
      if (rect != null) {
        rects.push(rect);
      }
    }
    // this sorts in descending order
    sorted = rects.sort(sort_fun);
    //console.log sorted
    // .. so we need the first entry
    return sorted[0];
  };
  
  function run_rectangle_detection(mapa) {
    var big_rect, floors, h, index, largest, row_floors, w;
    floors = num_unbroken_floors_columns(mapa);
    // get tidy rows from the floors 2d array
    row_floors = unbroken_floors_columns_get(floors);
    //print(row_floors)
    largest = largest_area_rects(row_floors);
    big_rect = largest[1];
    index = largest[2];
    w = big_rect.x2 - big_rect.x1;
    h = big_rect.y2 - big_rect.y1;
    console.log("Largest: " + "index: " + index + " x " + big_rect.x1 + ",y " + big_rect.y1 + " w: " + w + " h: " + h);
    // " to x: " + str(big_rect.x2) + ",y: " + str(big_rect.y2))
    return big_rect;
  };
  
  function debug_rect(rect, mapa) {
    var results, x, y;
  //console.log(rect)
    //results = [];
    // unicodetiles indexes as [y][x]
    for (y = rect.y1; y <= rect.y2; y++){
        for (x = rect.x1; x <= rect.x2; x++){    
          mapa[y][x] = ','
        }
    }
  };
  
  function apply_rectangle_detection(level) {
    var rect = run_rectangle_detection(level.mapa);
    // add to submaps
    level.submaps.push(rect);
    console.log(level.submaps);
    debug_rect(rect, level.mapa);
    //console.log level.mapa
    return level; // for chaining
  };
  
  export { apply_rectangle_detection };