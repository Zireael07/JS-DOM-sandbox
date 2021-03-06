//based on https://eskerda.com/bsp-dungeon-generation/ and https://github.com/AtTheMatinee/dungeon-generation

import { State } from './game_vars.js';

import { Rect } from './map_common.js';

class Tree {
  constructor(rootRect, m_leaf = 15) {
    this.rootRect = rootRect;
    this.MAX_LEAF_SIZE = m_leaf;
    this.MIN_LEAF_SIZE = 8;
    this.rootLeaf = new Leaf(this.rootRect);
  }

  split_tree() {
    var i, l, len, ref, splitSuccessfully;
    this.leafs = [];
    this.leafs.push(this.rootLeaf);
    splitSuccessfully = true;
    // loop through all leaves until they can no longer split successfully
    while (splitSuccessfully) {
      splitSuccessfully = false;
      ref = this.leafs;
      for (i = 0, len = ref.length; i < len; i++) {
        l = ref[i];
        console.log(l.leaf);
        if ((l.lchild === void 0) && (l.rchild === void 0)) {
          //console.log("No children of the leaf")
          if ((l.leaf.w > this.MAX_LEAF_SIZE) || (l.leaf.h > this.MAX_LEAF_SIZE) || (State.rng.range(0, 10) > 8)) {
            //console.log("Try to split the leaf")
            if (l.split_leaf(this.MIN_LEAF_SIZE)) { //try to split the leaf
              console.log("Split leaf...");
              this.leafs.push(l.lchild);
              this.leafs.push(l.rchild);
              splitSuccessfully = true; // axe default return
            }
          }
        }
      }
    }
  }

};

class Leaf {
  // "leaf" is just a rect    
  constructor(leaf) {
    this.leaf = leaf;
    this.lchild = void 0;
    this.rchild = void 0;
  }

  // pass down the min size
  split_leaf(m_leaf) {
    var max, split, splitHorizontally;
    // begin
    if (this.lchild !== void 0 && this.rchild !== void 0) {
      return false; // this leaf has already been split
    }
    
    // determine split
    if (State.rng.range(0, 1) === 0) {
      // Split vertically
      splitHorizontally = false;
    } else {
      splitHorizontally = true;
    }
    // if width of the leaf is 25% bigger than height, split vertically
    // and the converse for horizontal split
    if ((this.leaf.w / this.leaf.h) >= 1.25) {
      splitHorizontally = false;
    } else if ((this.leaf.h / this.leaf.w) >= 1.25) {
      splitHorizontally = true;
    }
    console.log("Splitting horizontally: " + splitHorizontally);
    // respect min sizes
    if (splitHorizontally) {
      max = this.leaf.h - m_leaf;
    } else {
      max = this.leaf.w - m_leaf;
    }
    if (max <= m_leaf) {
      console.log("Leaf too small to split, " + m_leaf);
      return false; // the leaf is too small to split further
    }
    split = State.rng.range(m_leaf, max); //determine where to split
    if (splitHorizontally) {
      this.lchild = new Leaf(new Rect(this.leaf.x1, this.leaf.y1, this.leaf.w, split));
      this.rchild = new Leaf(new Rect(this.leaf.x1, this.leaf.y1 + this.lchild.leaf.h, this.leaf.w, this.leaf.h - this.lchild.leaf.h));
      console.log(this.lchild);
      console.log(this.rchild);
    } else {
      this.lchild = new Leaf(new Rect(this.leaf.x1, this.leaf.y1, split, this.leaf.h));
      this.rchild = new Leaf(new Rect(this.leaf.x1 + this.lchild.leaf.w, this.leaf.y1, this.leaf.w - this.lchild.leaf.w, this.leaf.h));
      console.log(this.lchild);
      console.log(this.rchild);
    }
    return true;
  }

  get_leafs() {
    if (this.lchild === void 0 && this.rchild === void 0) {
      return this.leaf;
    } else {
      return [].concat(this.lchild.get_leafs(), this.rchild.get_leafs());
    }
  }

  get_level(level, queue) {
    if (queue === void 0) {
      queue = [];
    }
    if (level === 1) {
      queue.push(this);
    } else {
      if (this.lchild !== void 0) {
        this.lchild.get_level(level - 1, queue);
      }
      if (this.rchild !== void 0) {
        this.rchild.get_level(level - 1, queue);
      }
    }
    return queue;
  }

};

function random_split(rect, discard = false, w_ratio = 0.45, h_ratio = 0.45) {
  var r1, r1_h_ratio, r1_w_ratio, r2, r2_h_ratio, r2_w_ratio;
  //console.log("Splitting: ")
  //console.log(rect)
  r1 = null;
  r2 = null;
  if (rng.range(0, 1) === 0) {
    //console.log("Split vertical")
    // Vertical
    r1 = new Rect(rect.x1, rect.y1, State.rng.range(1, rect.w), rect.h); // r1.x, r1.y // r1.w, r1.h # ensure a margin
    r2 = new Rect(rect.x1 + r1.w, rect.y1, rect.w - r1.w, rect.h); // r2.x, r2.y // r2.w, r2.h
    //console.log(r1)
    //console.log(r2)
    if (discard) {
      r1_w_ratio = r1.w / r1.h;
      r2_w_ratio = r2.w / r2.h;
      if (r1_w_ratio < w_ratio || r2_w_ratio < w_ratio) {
        return random_split(rect, discard);
      }
    }
  } else {
    // Horizontal
    //console.log("Split horizontal")
    r1 = new Rect(rect.x1, rect.y1, rect.w, State.rng.range(1, rect.h)); // r1.x, r1.y // r1.w, r1.h # ensure a margin
    r2 = new Rect(rect.x1, rect.y1 + r1.h, rect.w, rect.h - r1.h); // r2.x, r2.y // r2.w, r2.h
    if (discard) {
      r1_h_ratio = r1.h / r1.w;
      r2_h_ratio = r2.h / r2.w;
      if (r1_h_ratio < h_ratio || r2_h_ratio < h_ratio) {
        return random_split(rect, discard);
      }
    }
  }
  //console.log("Split 1: ")
  //console.log(r1)
  //console.log("Split 2: ")
  //console.log(r2)
  return [r1, r2];
};

function split_container(container, iter, discard) {
  var root, sr;
  root = new Tree(container);
  if (iter !== 0) {
    sr = random_split(container, discard);
    root.lchild = split_container(sr[0], iter - 1, discard);
    root.rchild = split_container(sr[1], iter - 1, discard);
  }
  return root;
};

export { Tree };