"use strict";

/* global XXH */
/* exported --
    p3_preload
    p3_setup
    p3_worldKeyChanged
    p3_tileWidth
    p3_tileHeight
    p3_tileClicked
    p3_drawBefore
    p3_drawTile
    p3_drawSelectedTile
    p3_drawAfter
*/

function p3_preload() {}

function p3_setup() {}

let worldSeed;
let TYPE1_COLOR = "#FFFF00";
let TYPE2_COLOR = "#FF00FF";
let TYPE3_COLOR = "#00FFFF";
let VACUOLE_COLOR = "#AA00AA";

let TYPE_COLORS = [TYPE1_COLOR, TYPE2_COLOR, TYPE3_COLOR];
let NUM_TYPES = 3;


function p3_worldKeyChanged(key) {
  worldSeed = XXH.h32(key, 0);
  noiseSeed(worldSeed);
  randomSeed(worldSeed);
}

function p3_tileWidth() {
  return 64;
}
function p3_tileHeight() {
  return 64;
}

let [tw, th] = [p3_tileWidth(), p3_tileHeight()];
let [cw, ch] = [tw, th];

const padding = p3_tileWidth() / 8;
const c_radius = p3_tileWidth() / 8;
const wall_width = padding / 2;
const VACUOLE_SIZE = tw / 2;


let clicks = {};

function p3_tileClicked(i, j) {
  let key = [i, j];
  clicks[key] = 1 + (clicks[key] | 0);
  console.log(i, j);
}

const INT_BITS = 4;

function get_bin(n){
  return (n >>> 0).toString(2).padStart(INT_BITS, '0')
}


// From https://www.geeksforgeeks.org/rotate-bits-of-an-integer/
/*Function to left rotate n by d bits*/
 
function leftRotate( n,  d)
{   
    /* In n<<d, last d bits are 0. To
     put first 3 bits of n at
    last, do bitwise or of n<<d
    with n >>(INT_BITS - d) */
    return ((n << d) | (n >> (INT_BITS - d))) & (2**INT_BITS -1);
}
 
/*Function to right rotate n by d bits*/
function rightRotate( n, d)
{
    /* In n>>d, first d bits are 0.
    To put last 3 bits of at
    first, do bitwise or of n>>d
    with n <<(INT_BITS - d) */
    return ((n >> d) | (n << (INT_BITS - d))) & (2**INT_BITS -1);
}
 


function p3_drawBefore() {}

let n_offset =   [{di: -1, dj:  0}, // West
                  {di:  0, dj: -1}, // North
                  {di:  1, dj:  0}, // East
                  {di:  0, dj:  1}, // South
                 ];

let g_offset =   [{di: -1, dj: -1}, // Northwest 0011
                  {di:  1, dj: -1}, // Northeast 0110
                  {di:  1, dj:  1}, // Southeast 1100
                  {di: -1, dj:  1}, // Southwest 1001
                 ];

// let corners =   [{di:  0,          dj:  0}, // Northwest
//                  {di:  tw-padding, dj:  0}, // Northeast
//                  {di:  tw-padding, dj:  th-padding}, // Southeast
//                  {di:  0,          dj:  th-padding}, // Southwest
//                 ];
let corners =    [{di:  -1,          dj:  -1}, // Northwest
                  {di:  tw, dj:  -1}, // Northeast
                  {di:  tw, dj:  th}, // Southeast
                  {di:  -1,          dj:  th }, // Southwest
                  ];

let cv_border =  [[ 0,  1], // West
                  [ 1,  0], // North
                  [tw,  1], // East
                  [ 1, th] // South
                 ];

let rad = [ [0,0,c_radius,0],
            [0,0,0,c_radius],
            [c_radius,0,0,0],
            [0,c_radius,0,0]
          ];

const HALF_PI = Math.PI/2;
const PI = Math.PI;
const TWO_PI = Math.PI*2;

let ang = [ [0, HALF_PI],
            [HALF_PI, PI],
            [PI, PI+HALF_PI],
            [PI+HALF_PI, TWO_PI]
          ];

// In the following, n = neighbor, d is differential, g is diagonal, and c is self.
let c_type;
let neighbors = Array(4);
let n_code;

function get_type(i, j){
      //return  floor(noise(i, j)*3);
   return  floor(noise(i, j)*100) % 3;
}

function p3_drawTile(i, j) {
  noStroke();
  let vert = [[0, th], [0, 0], [tw, 0], [tw, th]]; // Bottom left, top left, top right, bottom right
  let vex_corn = [0,0,0,0];
  let cave_corn = [0,0,0,0];

  c_type = get_type(i, j);
  //c_type = floor(noise(i, j)*100) % 3;
  
  n_code = 0;
  for (let n = 0; n < 4; n++){
    let n_type = get_type(i+n_offset[n].di, j+n_offset[n].dj);
    neighbors[n] = n_type;
    n_code |= (n_type == c_type)*2**(n);

    if (n_type != c_type && c_type > 0){
      // Couple of things going on here
      // 1. we modify the vertices of the current side (hence n and (n+1) % 4)
      // 2. We alternate modifying x and y (n % 2)
      // 3. We add for modifying left and top, subtract otherwise (n > 1)
      vert[n][n % 2] += (n < 2) ? padding: -padding;
      vert[(n+1) % 4][n % 2] += (n < 2 ) ? padding: -padding; 
    }
  }

  if (c_type > 0){
    for (let n = 0; n < 4; n++){
      let curr_diag = get_type(i+g_offset[n].di, j+g_offset[n].dj);
      if ((n_code & 3) == 3){ //  Check if we have adjacent neighbors of same type
        if (curr_diag != c_type){ // Check the diagonal tile between neighbors
          cave_corn[n] = c_radius;
        }
      } else if ((~n_code & 3) == 3){ // Check if vertex needs to be round
          vex_corn[n] = c_radius;
      }
      n_code = rightRotate(n_code, 1);
    }
  }

  // Calculate the x,y and width
  let [x, y] = vert[1];
  let [w, h] = [vert[2][0]- vert[1][0], vert[0][1]-vert[1][1]];

  push();
  noStroke();
  fill(TYPE1_COLOR);
  rect(0, 0, tw+1, th+1);


  //fill(0);
  //rect(x, y, w, h, ...vex_corn);
  
  

  
  //rect(x*0.7, y+10, w*0.7, h*0.7, ...vex_corn);
  // beginShape();
  // for (let v of vert)
  //   vertex(...v);
  // endShape(CLOSE);
  //stroke('green');

  //text( n_code , tw/2, th/2);
  
  if (c_type != 0){
    fill(TYPE_COLORS[c_type]);
    
    stroke('green');
    rect(x, y, w, h, ...vex_corn);

    stroke(TYPE_COLORS[c_type]);
    for (let n = 0; n < 4; n++){ // Cover the outline!
      if ((n_code & 1) == 1 ){
        rect(x+cv_border[n][0], 
              y+cv_border[n][1], 
              (n % 2) ? w-2 : 5, 
              (n % 2)? 5 : h-2);
      }
      n_code = rightRotate(n_code, 1);
    }
  
    if (cave_corn[0] == 0 && (n_code & 3) == 3){
      noStroke();
      fill(VACUOLE_COLOR);
      beginShape();
      vertex(VACUOLE_SIZE*g_offset[0].di*noise(VACUOLE_SIZE, VACUOLE_SIZE), VACUOLE_SIZE*g_offset[0].dj*noise(i, j));
      vertex(VACUOLE_SIZE*g_offset[1].di*noise(i, VACUOLE_SIZE), VACUOLE_SIZE*g_offset[1].dj*noise(VACUOLE_SIZE, j));
      vertex(VACUOLE_SIZE*g_offset[2].di*noise(VACUOLE_SIZE, j), VACUOLE_SIZE*g_offset[2].dj*noise(i, VACUOLE_SIZE));
      vertex(VACUOLE_SIZE*g_offset[3].di*noise(i, j), VACUOLE_SIZE*g_offset[3].dj*noise(VACUOLE_SIZE, VACUOLE_SIZE));
      endShape(CLOSE);
    }

    fill(TYPE_COLORS[(c_type == 1) + 1]);
    stroke(TYPE_COLORS[c_type]);
    for (let n = 0; n < noise(i, j)*50; n++){
      circle(noise(i+1+n*10, j-1)*(w) + x, noise(j+n*10,i+1)*(h) + y, noise(i+n*10, j)* 10);

    }

    for (let n = 0; n < 4; n++){ 
      if (cave_corn[n] > 0){ // draw the concave corners
        //rect(corners[n].di, corners[n].dj, padding, padding, ...rad[n]);
        
        stroke('green');
        fill(TYPE_COLORS[0]);
        arc(corners[n].di, corners[n].dj, padding*2+1, padding*2+1, ...ang[n]);
      }
    }
  }
    //fill(0);
   // text(get_bin(n_code), tw/2, th/2);


  let n = clicks[[i, j]] | 0;
  if (n % 2 == 1) {
    fill(255, 255, 0, 180);
    ellipse(th/2, tw/2, 10, 10);
  }

  pop();
  noStroke();
}

function p3_drawSelectedTile(i, j) {
  noFill();
  stroke(0, 255, 0, 128);

  beginShape();
  vertex(0, 0);
  vertex(0, tw);
  vertex(th, tw);
  vertex(th, 0);
  endShape(CLOSE);

  noStroke();
  fill(0);
  text("(" + [i, j] + ")", 0, 0);
}

function p3_drawAfter() {}
