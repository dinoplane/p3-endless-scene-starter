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

function p3_setup() {
  strokeCap(SQUARE);
}

let worldSeed;
let TYPE1_COLOR = "#251F47";
let TYPE2_COLOR = "#FFC2F4";
let TYPE3_COLOR = "#A9C6EF";
let VACUOLE_COLORS = ["#78BC61", "#E9AFA3"];
let SEL_COLORS = ["#3B3271", "#B8003D", "#1F4F6F"]
let SEL_WALL_COLORS = ["#FFB499", "#F8F991"]

let TYPE_COLORS = [TYPE1_COLOR, TYPE2_COLOR, TYPE3_COLOR];
let BUBBLE_COLORS = ["#00E0E0","#AA00AA"];
let WALL_COLORS = ["#069D52", "#924511"];
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
const STROKE_WEIGHT = 10;


let clicks = {};

function p3_tileClicked(i, j) {
  let key = [i, j];
  clicks[key] = 1 + (clicks[key] | 0);
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
let corners =    [{di:  -STROKE_WEIGHT/2, dj:  -STROKE_WEIGHT/2}, // Northwest
                  {di:  tw,               dj:  -STROKE_WEIGHT/2}, // Northeast
                  {di:  tw,               dj:  th}, // Southeast
                  {di:  0, dj: th }, // Southwest
                  ];


let cv_border =  [[ -STROKE_WEIGHT/2,  -STROKE_WEIGHT/2], // West
                  [ -STROKE_WEIGHT/2,  -STROKE_WEIGHT/2], // North
                  [ tw -3*STROKE_WEIGHT/2,  -STROKE_WEIGHT/2], // East
                  [ -STROKE_WEIGHT/2, th-9*STROKE_WEIGHT/2-2] // South
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

let vert, vex_corn, cave_corn;
let x, y, w, h;

function get_type(i, j){
      //return  floor(noise(i, j)*3);
   return  floor(noise(i, j)*100) % 3;
}

function drawOutlineCover(i, j){
  push();
  if (selected) fill(SEL_COLORS[c_type])
  else fill(TYPE_COLORS[c_type]);
  noStroke();
  for (let n = 0; n < 4; n++){ // Cover the outline!
    if ((n_code & 1) == 1 ){
      let tl = [vert[n], vert[(n+1) % 4]][(((n+1) % 4) < 2) +0]
      let m, bw, bh;
      if (n % 2){
        m = 1;
        bw = w-STROKE_WEIGHT;
        bh = STROKE_WEIGHT;
      } else {
        m = -1;
        bw = STROKE_WEIGHT;
        bh = h-STROKE_WEIGHT;
      }

      rect(tl[0] + m*STROKE_WEIGHT/2, 
        tl[1] - m*STROKE_WEIGHT/2, 
        bw, 
        bh);
    } 
    n_code = rightRotate(n_code, 1);
    //console.log(n_code)
  }
  pop();
}

function drawVacuole(i, j){
  push();
  if (cave_corn[0] == 0 && (n_code & 3) == 3){ // Draw Vacuoles
    strokeWeight(1);
    stroke(VACUOLE_COLORS[!(c_type - 1)+0]);
    fill(VACUOLE_COLORS[c_type-1]);
    circle(0,0, 30);

    beginShape();
    curveVertex(VACUOLE_SIZE*g_offset[0].di*noise(VACUOLE_SIZE, VACUOLE_SIZE), VACUOLE_SIZE*g_offset[0].dj*noise(i, j));
    curveVertex(VACUOLE_SIZE*g_offset[1].di*noise(i, VACUOLE_SIZE), VACUOLE_SIZE*g_offset[1].dj*noise(VACUOLE_SIZE, j));
    curveVertex(VACUOLE_SIZE*g_offset[2].di*noise(VACUOLE_SIZE, j), VACUOLE_SIZE*g_offset[2].dj*noise(i, VACUOLE_SIZE));
    curveVertex(VACUOLE_SIZE*g_offset[3].di*noise(i, j), VACUOLE_SIZE*g_offset[3].dj*noise(VACUOLE_SIZE, VACUOLE_SIZE));
    curveVertex(VACUOLE_SIZE*g_offset[0].di*noise(VACUOLE_SIZE, VACUOLE_SIZE), VACUOLE_SIZE*g_offset[0].dj*noise(i, j));
    curveVertex(VACUOLE_SIZE*g_offset[1].di*noise(i, VACUOLE_SIZE), VACUOLE_SIZE*g_offset[1].dj*noise(VACUOLE_SIZE, j));
    curveVertex(VACUOLE_SIZE*g_offset[2].di*noise(VACUOLE_SIZE, j), VACUOLE_SIZE*g_offset[2].dj*noise(i, VACUOLE_SIZE));
    curveVertex(VACUOLE_SIZE*g_offset[3].di*noise(i, j), VACUOLE_SIZE*g_offset[3].dj*noise(VACUOLE_SIZE, VACUOLE_SIZE));
    endShape(CLOSE);
  }
  pop();
}

function drawBubbles(i, j){
  push();
  fill(BUBBLE_COLORS[c_type - 1]);
  strokeWeight(1)
  stroke(BUBBLE_COLORS[!(c_type - 1)+0]);
  let [minX, minY] = [x+ STROKE_WEIGHT/2, y+STROKE_WEIGHT/2];
  let [maxX, maxY] = [x+w-STROKE_WEIGHT/2, y+h-STROKE_WEIGHT/2];

  for (let n = 0; n < noise(i, j)*50; n++){  
    circle(noise(i+1+n*100, j-1)*(w - STROKE_WEIGHT*3/2 + 1) + x + STROKE_WEIGHT*3/4, 
            noise(j+n*100, i+1)*(h - STROKE_WEIGHT*3/2 + 1) + y + STROKE_WEIGHT*3/4,
            noise(i+n*100, j)*10);
  }
  pop();
}

function drawConcaveCorners(){
  push();
  for (let n = 0; n < 4; n++){ 
    if (cave_corn[n] > 0){ // draw the concave corners
      //rect(corners[n].di, corners[n].dj, padding, padding, ...rad[n]);
      if (selected) fill(SEL_WALL_COLORS[c_type-1]);
      else fill(WALL_COLORS[c_type-1]);
      noStroke();
      let arc_v = vert[(n+1) % 4];
      arc_v[0] += g_offset[n].di * (STROKE_WEIGHT/2+1);
      arc_v[1] += g_offset[n].dj * (STROKE_WEIGHT/2+1);

      arc(...arc_v, (padding+STROKE_WEIGHT)*2+1, (padding+STROKE_WEIGHT)*2+1, ...ang[n]);
      //stroke('green');
      noStroke();
      if (selected) fill(SEL_COLORS[0])
      else fill(TYPE_COLORS[0]);
      arc(...arc_v, (padding)*2+2, (padding)*2+2, ...ang[n]);
    }
  }
  pop();
}

const PILUS_WIDTH = 10;

function drawPilus(i, j){
  stroke(0);
  fill(0);
  for (let n = 0; n < 2; n++){
    if (neighbors[n] != 0 && neighbors[n] != c_type && noise(i, j) < 0.5){
      let m = (n < 2) ? -1 : +1;
      
      let start = [vert[(n+1)%4][0], vert[(n+1)%4][1]];
      let end =  [vert[(n+1)%4][0], vert[(n+1)%4][1]];
      //console.log(start);
      start[n % 2] += (n < 2) ? -(padding*2+STROKE_WEIGHT/2) : (padding*2+STROKE_WEIGHT/2);   // translating point out tile
      start[!(n % 2) + 0] = p3_tileWidth()/2;
      end[n % 2] += m*STROKE_WEIGHT/2;
      end[!(n % 2) + 0] = p3_tileWidth()/2;
      //console.log(start, vert[(n+1)%4]);

      stroke("purple");
      strokeWeight(STROKE_WEIGHT)
      line(...start,
          ...end); 

      stroke(TYPE_COLORS[floor(noise(n, n+j+99*i)*99) % 2 + 1]);
      strokeWeight(STROKE_WEIGHT/2)
      line(...start,
          ...end); 
    
      strokeWeight(STROKE_WEIGHT);
    }
  }
 
}

let selected = false;
function p3_drawTile(i, j) {
  noStroke();
  vert = [[STROKE_WEIGHT/2, th-STROKE_WEIGHT/2], 
          [STROKE_WEIGHT/2, STROKE_WEIGHT/2], 
          [tw-STROKE_WEIGHT/2, STROKE_WEIGHT/2], 
          [tw-STROKE_WEIGHT/2, th-STROKE_WEIGHT/2]]; // Bottom left, top left, top right, bottom right
  vex_corn = [0,0,0,0];
  cave_corn = [0,0,0,0];

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
  [x, y] = vert[1];
  [w, h] = [vert[2][0]- vert[1][0], vert[0][1]-vert[1][1]];

  push();
  
  let k = clicks[[i, j]] | 0;
  selected = k % 2 == 1
  if (selected) {
    noStroke();
    fill(SEL_COLORS[0]);
  } else {
    if (c_type == 0) stroke(TYPE1_COLOR);
    fill(TYPE1_COLOR);
  }
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
    if (selected) {
      fill(SEL_COLORS[c_type]);
      stroke(SEL_WALL_COLORS[c_type-1]);
    } else {
      fill(TYPE_COLORS[c_type]);
      stroke(WALL_COLORS[c_type-1]);
    }
    strokeWeight(STROKE_WEIGHT);
    
    rect(x, y, w, h, ...vex_corn);

    drawOutlineCover(i, j);

    drawVacuole(i, j);

    drawBubbles(i, j);

    drawConcaveCorners();

    drawPilus(i, j);

  }
    //fill(0);
    //text(get_bin(n_code), tw/2, th/2);




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
  fill(255);
  text("(" + [i, j] + ")", 0, 0);
}

function p3_drawAfter() {}
