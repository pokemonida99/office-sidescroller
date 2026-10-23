// 關卡：一路往右生成背景（主樓層＋上下樓層剖面）、障礙物、鈔票。跑過去的就拆掉
import * as THREE from 'three';
import { scene, rbox, box, cyl, sphere, mat, labelSprite, V, geo } from './world.js?v=0.1.1';
import { OBST, THEMES, wallTex, floorTex, storyTex, makeBill, makeCoffee, makeBadge, punchClock } from './props.js?v=0.1.1';
import { LOOKS, vendingLook, deskLook } from './stations.js?v=0.1.1';
import * as fx from './fx.js?v=0.1.1';

export const SEG = 8;              // 背景一段幾公尺
export const ZONE_LEN = 240;       // 一區多長（終點有打卡鐘）
export const ZONES = ['lobby', 'office', 'pantry', 'boss'];
export const STORY_H = 4.6;        // 一層樓高（含樓板）
const ROOM_H = 4.2, WALL_Z = -2.6, FRONT_Z = 2.2;
export const zoneAt = (x) => Math.max(0, Math.floor(x / ZONE_LEN));
export const themeAt = (x) => ZONES[zoneAt(x) % ZONES.length];
// 樓層號：1F 大廳、3F、5F、8F…一路往上
export const floorName = (z) => `${[1, 3, 5, 8][z % 4] + Math.floor(z / 4) * 10}F ${THEMES[ZONES[z % 4]].name}`;

// 會隨機但每次開局一樣的亂數（換一局換種子）
let seed = 1;
export const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const pick = (a) => a[Math.floor(rnd() * a.length)];

export const L = {
  segs: new Map(),       // 背景段
  obst: [],              // { g, kind, x, y0, w, h, vx, hit, platform, low, stomp }
  items: [],             // { g, type:'bill'|'coffee'|'badge', x, y, taken }
  clocks: [],            // 打卡鐘 { x, zone, done, g }
  ticks: [],             // 背景道具的小動畫
  nextX: 0, nextSeg: 0,
};

export function resetLevel(s = 1) {
  for (const sg of L.segs.values()) releaseSeg(sg);
  for (const o of L.obst) scene.remove(o.g);
  for (const it of L.items) scene.remove(it.g);
  for (const c of L.clocks) scene.remove(c.g);
  L.segs.clear(); L.obst.length = 0; L.items.length = 0; L.clocks.length = 0; L.ticks.length = 0;
  L.nextX = 22; L.nextSeg = -3; seed = s;
}

// ---------- 背景段 ----------
const slabMat = mat(0xf2ede4), slabEdge = mat(0x8a7d6c);
const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff6dc, toneMapped: false });
const wallMats = {}, floorMats = {}, storyMats = {};
const wallMat = (k) => wallMats[k] ||= new THREE.MeshStandardMaterial({ map: wallTex(k), roughness: 0.9 });
const floorMat = (k) => floorMats[k] ||= new THREE.MeshStandardMaterial({ map: floorTex(k), roughness: 0.55 });
const storyMat = (k, v) => storyMats[k + v] ||= new THREE.MeshStandardMaterial({ map: storyTex(k, v), roughness: 0.95 });

function buildSeg(i) {
  const x0 = i * SEG, cx = x0 + SEG / 2, key = themeAt(cx), g = new THREE.Group(); g.position.x = cx; scene.add(g);
  const D = FRONT_Z - WALL_Z, zc = (FRONT_Z + WALL_Z) / 2;
  // 主樓層：地板、牆、天花板燈
  const fl = new THREE.Mesh(geo('floor', () => new THREE.BoxGeometry(SEG, 0.4, D)), [slabEdge, slabEdge, floorMat(key), slabEdge, slabEdge, slabEdge]);
  fl.position.set(0, -0.2, zc); fl.receiveShadow = true; g.add(fl);
  const wall = new THREE.Mesh(geo('wall', () => new THREE.PlaneGeometry(SEG, ROOM_H)), wallMat(key));
  wall.position.set(0, ROOM_H / 2, WALL_Z); wall.receiveShadow = true; g.add(wall);
  for (const x of [-2, 2]) { const l = box(1.4, 0.06, 0.4, lampMat, x, ROOM_H - 0.03, -0.6, g); l.castShadow = false; }
  // 上面兩層、下面一層：樓板＋一張畫好的辦公室
  for (const k of [-2, -1, 1, 2]) {
    const y = k * STORY_H;
    const slab = box(SEG, 0.4, D, slabMat, 0, y - 0.2, zc, g); slab.castShadow = false;
    const p = new THREE.Mesh(geo('story', () => new THREE.PlaneGeometry(SEG, ROOM_H)), storyMat(key, (i + k + 8) % 2));
    p.position.set(0, y + ROOM_H / 2, WALL_Z); g.add(p);
    if (k > 0) for (const x of [-2, 2]) box(1.4, 0.06, 0.4, lampMat, x, y + ROOM_H - 0.03, -0.6, g).castShadow = false;
  }
  box(SEG, 0.4, D, slabMat, 0, -2 * STORY_H - 0.2, zc, g);
  // 柱子（一段一根，看得出在往前跑）
  rbox(0.5, ROOM_H, 0.5, THEMES[key].trim, -SEG / 2 + 0.25, ROOM_H / 2, WALL_Z + 0.25, g);
  // 後排道具：從道具池拿（同一種道具重複用，不一直生新的貼圖）
  const props = PROPS[key], used = [];
  if (i >= 0) {
    const n = 1 + (rnd() < 0.6 ? 1 : 0);
    for (let j = 0; j < n; j++) {
      const k = Math.floor(rnd() * props.length), p = takeProp(key, k), px = -SEG / 2 + 1.6 + j * 3.6 + rnd() * 1.2;
      p.g.position.set(px, 0, -1.75); g.add(p.g); used.push(p);
      if (p.tick) L.ticks.push({ seg: i, tick: p.tick, pos: new THREE.Vector3(cx + px, 0, -1.75) });
    }
  }
  return { g, i, used };
}

// 道具池：拆掉的背景段把道具還回來，下次直接用
const pool = {};
function takeProp(key, k) {
  const list = pool[key + k] ||= [];
  const p = list.pop() || PROPS[key][k]();
  p.key = key + k; return p;
}
function releaseSeg(sg) { for (const p of sg.used) { sg.g.remove(p.g); pool[p.key].push(p); } scene.remove(sg.g); }

// 每一區的後排道具（放在牆前面，不擋跑道）
const fxStub = fx;
let vivM; const vivMat = () => { if (!vivM) { const t = new THREE.TextureLoader().load('icons/vivi-512.png'); t.colorSpace = THREE.SRGBColorSpace; vivM = new THREE.MeshBasicMaterial({ map: t }); } return vivM; };
const plant = (g) => { const p = new THREE.Group(); cyl(0.26, 0.2, 0.45, 0xff8a5c, 0, 0.22, 0, p); sphere(0.42, 0x47b35a, 0, 0.75, 0, p); sphere(0.3, 0x5fcf6f, 0.2, 1.05, 0.05, p); return { g: p }; };
const PROPS = {
  lobby: [
    plant,
    () => {   // 電梯：兩扇門＋樓層燈
      const p = new THREE.Group();
      rbox(1.9, 2.6, 0.3, 0xc9915b, 0, 1.3, -0.4, p);
      for (const x of [-0.42, 0.42]) rbox(0.8, 2.2, 0.06, mat(0xdfe5ec, { metalness: 0.85, roughness: 0.25 }), x, 1.12, -0.22, p);
      const s = labelSprite('▲ 電梯', { bg: '#2c3e57', size: 0.24 }); s.position.set(0, 2.85, -0.2); p.add(s);
      return { g: p };
    },
    () => {   // 總機櫃台（借上班啟示錄的總機桌）
      const l = LOOKS.phone(1, fxStub); const s = labelSprite('☎ 總機', { bg: '#ff7a45', size: 0.26 }); s.position.set(0, 1.4, 0); l.g.add(s); return { g: l.g };
    },
    () => {   // 沙發
      const p = new THREE.Group();
      rbox(1.8, 0.45, 0.8, 0xff9f7a, 0, 0.3, 0, p); rbox(1.8, 0.6, 0.25, 0xff8a5c, 0, 0.65, -0.3, p);
      for (const x of [-0.95, 0.95]) rbox(0.22, 0.6, 0.8, 0xff8a5c, x, 0.4, 0, p);
      return { g: p };
    },
  ],
  office: [
    plant,
    () => { const d = deskLook(); d.paint(0.4 + rnd() * 0.6); return { g: d.g }; },
    () => { const l = LOOKS.printer(1 + Math.floor(rnd() * 2), fxStub); return { g: l.g, tick: l.tick }; },
    () => {   // 白板
      const p = new THREE.Group(); rbox(1.6, 1.0, 0.06, 0xffffff, 0, 1.6, 0, p);
      for (const x of [-0.6, 0.6]) cyl(0.03, 0.03, 1.2, 0x9aa3ad, x, 0.6, 0, p);
      const s = labelSprite('KPI ↗↗↗', { bg: '#3fa7ff', size: 0.22 }); s.position.set(0, 1.7, 0.05); p.add(s);
      return { g: p };
    },
  ],
  pantry: [
    plant,
    () => { const l = LOOKS.coffee(1 + Math.floor(rnd() * 3), fxStub); return { g: l.g, tick: l.tick }; },
    () => { const l = vendingLook(Math.floor(rnd() * 2)); return { g: l.g, tick: l.tick }; },
    () => {   // 冰箱
      const p = new THREE.Group(); rbox(0.9, 1.9, 0.7, 0xf5f7fa, 0, 0.95, 0, p);
      box(0.86, 0.02, 0.02, 0xc8ced6, 0, 1.25, 0.36, p); box(0.05, 0.4, 0.05, 0x9aa3ad, 0.33, 1.55, 0.37, p); box(0.05, 0.4, 0.05, 0x9aa3ad, 0.33, 0.8, 0.37, p);
      return { g: p };
    },
  ],
  boss: [
    plant,
    () => {   // 老闆的畫像（Vivi 公仔頭像）＋金框
      const p = new THREE.Group(); rbox(1.2, 1.2, 0.08, mat(0xd9a63a, { metalness: 0.9, roughness: 0.3 }), 0, 2.0, 0, p);
      const f = new THREE.Mesh(geo('p1', () => new THREE.PlaneGeometry(1.0, 1.0)), vivMat()); f.position.set(0, 2.0, 0.05); p.add(f);
      const s = labelSprite('本公司最貴的人', { bg: '#d9a63a', size: 0.2 }); s.position.set(0, 1.25, 0.1); p.add(s);
      return { g: p };
    },
    () => {   // 書櫃＋獎盃
      const p = new THREE.Group(); rbox(1.4, 2.0, 0.45, 0x8a5a3c, 0, 1.0, 0, p);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) box(0.16, 0.42, 0.3, [0xff5d73, 0x3fa7ff, 0xffc93c, 0x36c35d][(r + c) % 4], -0.5 + c * 0.2, 0.35 + r * 0.6, 0.06, p);
      cyl(0.1, 0.06, 0.25, mat(0xffd34d, { metalness: 0.9, roughness: 0.3 }), 0, 2.15, 0, p);
      return { g: p };
    },
    () => { const l = LOOKS.coffee(3, fxStub); return { g: l.g, tick: l.tick }; },
  ],
};

// ---------- 障礙物與鈔票 ----------
function addObst(kind, x, extra = {}) {
  const o = OBST[kind](); o.g.position.set(x, extra.y || 0, 0); scene.add(o.g);
  const rec = { kind, x, y0: o.y0 + (extra.y || 0), w: o.w, h: o.h, vx: o.vx || 0, platform: !!o.platform, low: !!o.low, stomp: !!o.stomp, g: o.g, parts: o, hit: false, active: false };
  L.obst.push(rec); return rec;
}
function addItem(type, x, y) {
  const g = type === 'bill' ? makeBill() : type === 'coffee' ? makeCoffee() : makeBadge();
  g.position.set(x, y, 0); scene.add(g);
  const it = { g, type, x, y, taken: false, ph: x * 0.7 }; L.items.push(it); return it;
}
const billLine = (x, y, n, gap = 0.7) => { for (let i = 0; i < n; i++) addItem('bill', x + i * gap, y); };
const billArc = (x, len, h, n = 5, base = 0.5) => { for (let i = 0; i < n; i++) { const u = i / (n - 1); addItem('bill', x + u * len, base + Math.sin(u * Math.PI) * h); } };

// 關卡片段：回傳長度。d＝難度 0～1，v＝目前速度（決定間距）
const GROUND = ['paper', 'paper', 'boxes', 'spill', 'chair', 'bot'];
const PATTERNS = [
  { w: 3, min: 0, f(x, d, v) { const k = pick(GROUND); const o = addObst(k, x + (OBST_LEAD[k] || 0) * v); billArc(o.x - 1.6, 3.2, k === 'boxes' ? 1.25 : 0.95, 5, 0.6); return 3; } },
  { w: 2, min: 0, f(x) { const k = rnd() < 0.5 ? 'banner' : 'drone'; addObst(k, x + 1); billLine(x - 0.4, 0.3, 4, 0.5); return 3; } },
  { w: 2, min: 0, f(x) {   // 辦公桌：跳上去吃鈔票
    const n = 1 + (rnd() < 0.6 ? 1 : 0);
    // 兩張桌子中間只留一點縫，可以一路踩過去
    for (let i = 0; i < n; i++) { addObst('desk', x + 1.1 + i * 2.9); billLine(x + 0.3 + i * 2.9, 1.25, 3, 0.6); }
    if (n === 2 && rnd() < 0.5) addItem('bill', x + 2.55, 1.9);
    return n * 2.9;
  } },
  { w: 2, min: 0.12, f(x, d, v) { const a = pick(['paper', 'spill', 'paper']), b = pick(['paper', 'boxes']); const gap = v * (0.62 + (1 - d) * 0.25); addObst(a, x); addObst(b, x + gap); billLine(x - 0.2, 1.5, 3, 0.5); return gap + 1; } },
  { w: 2, min: 0.2, f(x, d, v) { const n = 2 + (d > 0.5 ? 1 : 0); for (let i = 0; i < n; i++) addObst('bot', x + i * 1.6 + 1.5 * v); billLine(x + 1.5 * v - 0.3, 1.3, n * 2, 0.8); return n * 1.6 + 1; } },
  { w: 2, min: 0.3, f(x, d, v) { const gap = v * (0.75 + (1 - d) * 0.3); addObst(pick(['paper', 'boxes']), x); addObst(pick(['banner', 'drone']), x + gap); return gap + 1; } },
  { w: 1, min: 0.5, f(x, d, v) { const gap = v * 0.7; addObst('drone', x); addObst('paper', x + gap); addObst('banner', x + gap * 2); return gap * 2 + 1; } },
  { w: 1.2, min: 0, f(x) {   // 喘口氣：一排鈔票，偶爾有咖啡或員工證
    billArc(x, 4.2, 0.6, 7, 0.5);
    if (rnd() < 0.45) addItem(rnd() < 0.55 ? 'coffee' : 'badge', x + 6, 1.0);
    return 7;
  } },
];
// 會自己移動的障礙要放遠一點，碰到的時間才跟靜止的一樣（以每單位速度算的提前量）
const OBST_LEAD = { chair: 2.4 / 6.5 * 1.0, bot: 1.5 / 6.5 * 1.0 };

// 往前生成到 ahead；拆掉 behind 之前的
export function updateLevel(px, v, d) {
  const segAhead = Math.floor((px + 40) / SEG);
  while (L.nextSeg <= segAhead) { const i = L.nextSeg++; L.segs.set(i, buildSeg(i)); }
  for (const [i, sg] of L.segs) if ((i + 1) * SEG < px - 26) { releaseSeg(sg); L.segs.delete(i); }
  for (let i = L.ticks.length - 1; i >= 0; i--) if ((L.ticks[i].seg + 1) * SEG < px - 26) L.ticks.splice(i, 1);
  while (L.nextX < px + 34) {
    const zEnd = (zoneAt(L.nextX) + 1) * ZONE_LEN;
    // 每一區終點放打卡鐘，前後留空
    if (L.nextX > zEnd - 10) {
      const c = punchClock(); c.position.set(zEnd - 4, 0, -1.2); scene.add(c);
      L.clocks.push({ x: zEnd - 4, zone: zoneAt(L.nextX), done: false, g: c });
      billArc(zEnd - 7, 6, 1.4, 9, 0.6);
      L.nextX = zEnd + 8; continue;
    }
    const ok = PATTERNS.filter(p => d >= p.min), tot = ok.reduce((s, p) => s + p.w, 0);
    let r = rnd() * tot, P = ok[0]; for (const p of ok) { r -= p.w; if (r <= 0) { P = p; break; } }
    const len = P.f(L.nextX, d, v);
    L.nextX += len + v * (0.95 - d * 0.35) + 1.2;
  }
  for (let i = L.obst.length - 1; i >= 0; i--) if (L.obst[i].x < px - 18) { scene.remove(L.obst[i].g); L.obst.splice(i, 1); }
  for (let i = L.items.length - 1; i >= 0; i--) if (L.items[i].x < px - 18 || L.items[i].gone) { scene.remove(L.items[i].g); L.items.splice(i, 1); }
  for (let i = L.clocks.length - 1; i >= 0; i--) if (L.clocks[i].x < px - 26) { scene.remove(L.clocks[i].g); L.clocks.splice(i, 1); }
}

// 道具小動畫：機器人晃、無人機螺旋槳轉、椅子轉、鈔票轉
export function animateLevel(dt, t, px) {
  for (const o of L.obst) {
    const p = o.parts;
    if (o.vx && o.active && !o.hit) { o.x += o.vx * dt; o.g.position.x = o.x; }
    if (!o.active && o.x < px + 13) o.active = true;
    if (p.spin) p.spin.rotation.y += dt * 3;
    if (p.rotors) p.rotors.forEach((r, i) => r.rotation.y += dt * (30 + i));
    if (p.body && o.kind === 'drone') p.body.position.y = 1.07 + Math.sin(t * 4 + o.x) * 0.05;
    if (p.body && o.kind === 'bot' && !o.hit) p.body.rotation.z = Math.sin(t * 10 + o.x) * 0.06;
    if (p.led) p.led.visible = Math.sin(t * 8 + o.x) > -0.3;
    if (p.cloth) p.cloth.rotation.y = Math.sin(t * 1.5 + o.x) * 0.08;
    if (o.fly) {   // 被撞飛（咖啡衝刺時）
      o.fly.vy -= 20 * dt; o.g.position.x += o.fly.vx * dt; o.g.position.y += o.fly.vy * dt; o.g.rotation.z += o.fly.r * dt;
    }
  }
  for (const it of L.items) {
    if (it.taken) {   // 被吃掉：往上飄、縮小
      it.k = (it.k || 0) + dt * 5; it.g.position.y += dt * 3; it.g.scale.setScalar(Math.max(0.01, 1 - it.k)); if (it.k >= 1) it.gone = true;
      continue;
    }
    it.g.rotation.y = t * 3 + it.ph; it.g.position.y = it.y + Math.sin(t * 3 + it.ph) * 0.06;
  }
  for (const k of L.ticks) k.tick(dt, t, k.pos);
}
