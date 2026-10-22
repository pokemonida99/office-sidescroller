// 設施：咖啡機、印表機、電話總機、販賣機、員工餐廳三攤。每一級外觀不同、數值不同，咖啡機與印表機 Lv5 是產線
import * as THREE from 'three';
import { scene, rbox, box, cyl, sphere, mat, canvasTex, labelSprite, FONT, V } from './world.js?v=0.1.0';

// ---------- 數值表（調平衡只改這裡） ----------
// brew：幾秒做一個；tray：出貨口最多堆幾個；price：一個賣幾元；cost：升到這一級要多少錢
export const STATIONS = {
  coffee: {
    name: '咖啡機', item: 'coffee', levels: [
      { title: '爛爛的咖啡機', brew: 1.6, tray: 6, price: 10, cost: 0 },
      { title: '家用咖啡機', brew: 1.1, tray: 10, price: 15, cost: 120 },
      { title: '義式咖啡機', brew: 0.8, tray: 14, price: 25, cost: 450 },
      { title: '高級咖啡機', brew: 0.55, tray: 18, price: 40, cost: 1400 },
      { title: '咖啡產線', brew: 0.32, tray: 0, price: 60, cost: 4000, line: true },
    ],
  },
  printer: {
    name: '印表機', item: 'doc', unlock: 350, levels: [
      { title: '舊噴墨印表機', brew: 2.0, tray: 6, price: 20, cost: 0 },
      { title: '雷射印表機', brew: 1.4, tray: 10, price: 30, cost: 700 },
      { title: '大型影印機', brew: 1.0, tray: 14, price: 45, cost: 1800 },
      { title: '彩色影印中心', brew: 0.7, tray: 18, price: 70, cost: 4500 },
      { title: '印刷產線', brew: 0.42, tray: 0, price: 100, cost: 10000, line: true },
    ],
  },
  phone: {
    name: '電話總機', unlock: 1500, levels: [
      { title: '一線電話', lines: 1, ringEvery: 3.4, price: 100, cost: 0 },
      { title: '雙線總機', lines: 2, ringEvery: 3.1, price: 120, cost: 2500 },
      { title: '四線總機', lines: 4, ringEvery: 2.8, price: 150, cost: 6000 },
      { title: '六線總機', lines: 6, ringEvery: 2.5, price: 190, cost: 12000 },
      { title: '八線客服中心', lines: 8, ringEvery: 2.2, price: 240, cost: 22000 },
    ],
  },
  // 補貨類：進貨箱自己會到貨（brew），搬到攤位／販賣機補貨，同事來買。升級改的是攤位的樣子
  vending: {
    name: '販賣機', item: 'drink', unlock: 900, restock: true, levels: [
      { title: '小販賣機', brew: 1.3, tray: 8, price: 20, cost: 0 },
      { title: '雙門販賣機', brew: 0.9, tray: 12, price: 30, cost: 2200 },
      { title: '發光販賣機牆', brew: 0.6, tray: 16, price: 45, cost: 6500 },
    ],
  },
  beef: {
    name: '牛肉飯', item: 'beef', unlock: 2500, restock: true, levels: [
      { title: '牛肉飯小攤', brew: 2.0, tray: 6, price: 60, cost: 0 },
      { title: '牛肉飯攤', brew: 1.4, tray: 10, price: 85, cost: 4500 },
      { title: '豪華牛肉飯', brew: 0.95, tray: 14, price: 120, cost: 11000 },
    ],
  },
  chicken: {
    name: '雞肉飯', item: 'chicken', unlock: 4500, restock: true, levels: [
      { title: '雞肉飯小攤', brew: 2.0, tray: 6, price: 70, cost: 0 },
      { title: '雞肉飯攤', brew: 1.4, tray: 10, price: 100, cost: 7000 },
      { title: '豪華雞肉飯', brew: 0.95, tray: 14, price: 140, cost: 15000 },
    ],
  },
  fish: {
    name: '魚排飯', item: 'fish', unlock: 7000, restock: true, levels: [
      { title: '魚排飯小攤', brew: 2.0, tray: 6, price: 80, cost: 0 },
      { title: '魚排飯攤', brew: 1.4, tray: 10, price: 115, cost: 9500 },
      { title: '豪華魚排飯', brew: 0.95, tray: 14, price: 160, cost: 19000 },
    ],
  },
};

// ---------- 貨品：咖啡杯、文件 ----------
const G = {
  cup: new THREE.CylinderGeometry(0.085, 0.068, 0.15, 14), sleeve: new THREE.CylinderGeometry(0.084, 0.076, 0.06, 14), lid: new THREE.CylinderGeometry(0.092, 0.092, 0.028, 14),
  ream: new THREE.BoxGeometry(0.26, 0.075, 0.19), band: new THREE.BoxGeometry(0.265, 0.077, 0.06),
  bill: new THREE.BoxGeometry(0.3, 0.04, 0.17), billBand: new THREE.BoxGeometry(0.08, 0.042, 0.172),
};
export const ITEM_H = { coffee: 0.13, doc: 0.08, drink: 0.15, beef: 0.1, chicken: 0.1, fish: 0.1 };
export const ICON = { coffee: '☕', doc: '📄', drink: '🥤', beef: '🐮', chicken: '🐔', fish: '🐟' };
const BENTO = { beef: [0xe0473a, '🐮'], chicken: [0xffb42e, '🐔'], fish: [0x3f9be0, '🐟'] };
const iconTex = {};
const getIcon = (e) => iconTex[e] ||= canvasTex(64, 64, (g, W) => { g.font = `48px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, W / 2, W / 2 + 3); });
G.can = new THREE.CylinderGeometry(0.07, 0.07, 0.15, 16); G.canTop = new THREE.CylinderGeometry(0.06, 0.07, 0.02, 16);
G.bento = new THREE.BoxGeometry(0.26, 0.07, 0.2); G.lidB = new THREE.BoxGeometry(0.27, 0.03, 0.21); G.icon = new THREE.PlaneGeometry(0.15, 0.15);
const CAN_COLORS = [0xff5d73, 0x36c35d, 0x3fa7ff, 0xffb42e];
let canN = 0;
export function makeItem(type) {
  const g = new THREE.Group();
  if (type === 'coffee') {
    const c = new THREE.Mesh(G.cup, mat(0xfffaf0)), s = new THREE.Mesh(G.sleeve, mat(0xd9773b)), l = new THREE.Mesh(G.lid, mat(0x5a3a2a));
    s.position.y = -0.005; l.position.y = 0.085; g.add(c, s, l);
  } else if (type === 'doc') {
    const r = new THREE.Mesh(G.ream, mat(0xffffff)), b = new THREE.Mesh(G.band, mat(0x3fa7ff));
    g.add(r, b);
  } else if (type === 'drink') {   // 飲料罐：四種顏色輪流
    const c = new THREE.Mesh(G.can, mat(CAN_COLORS[canN++ % 4], { roughness: 0.35 })), t = new THREE.Mesh(G.canTop, mat(0xd8dde3, { metalness: 0.7, roughness: 0.3 }));
    t.position.y = 0.085; g.add(c, t);
  } else {   // 便當：彩色蓋子＋牛／雞／魚圖示
    const [col, e] = BENTO[type];
    const b = new THREE.Mesh(G.bento, mat(0xfff6e6)), l = new THREE.Mesh(G.lidB, mat(col));
    l.position.y = 0.045; g.add(b, l);
    const ic = new THREE.Mesh(G.icon, new THREE.MeshBasicMaterial({ map: getIcon(e), transparent: true })); ic.rotation.x = -Math.PI / 2; ic.position.y = 0.062; g.add(ic);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(g); return g;
}
export function makeBill() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(G.bill, mat(0x36c35d)), d = new THREE.Mesh(G.billBand, mat(0xe3f6c8));
  b.castShadow = true; g.add(b, d); scene.add(g); return g;
}

// ---------- 外觀：每一級一個樣子 ----------
// 回傳 { g（群組）, out（出貨口的相對位置）, tick(dt, t)（冒煙、閃光等小動畫） }
const chrome = { metalness: 0.85, roughness: 0.25 }, gold = { metalness: 0.9, roughness: 0.3 };
const glowMat = (c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });

function coffeeLook(lv, fx) {
  const g = new THREE.Group(); let tick = () => {};
  if (lv === 0) {   // 爛爛的：小小一台、歪一邊、貼膠帶、會冒煙
    const body = rbox(0.75, 0.85, 0.6, 0x8a6a4c, 0, 0.43, 0, g); body.rotation.z = 0.07;
    rbox(0.8, 0.12, 0.65, 0x5b4636, -0.03, 0.9, 0, g).rotation.z = 0.07;
    box(0.5, 0.08, 0.02, 0xc8c3b4, 0.05, 0.6, 0.31, g).rotation.z = -0.5;   // 膠帶
    box(0.5, 0.08, 0.02, 0xc8c3b4, 0.05, 0.6, 0.31, g).rotation.z = 0.5;
    cyl(0.05, 0.05, 0.12, 0x444444, 0.12, 0.52, 0.28, g);
    let pt = 0; tick = (dt, t, pos) => { pt += dt; if (pt > 0.9) { pt = 0; fx.puff(V(pos.x - 0.1, 1.05, pos.z)); } };
    return { g, out: V(0.12, 0.46, 0.38), tick };
  }
  if (lv === 1) {   // 家用：白色圓潤
    rbox(0.85, 1.0, 0.65, 0xfaf6ee, 0, 0.5, 0, g);
    rbox(0.88, 0.14, 0.68, 0x2f3542, 0, 1.03, 0, g);
    cyl(0.07, 0.07, 0.14, 0xcfd5dc, 0.15, 0.62, 0.3, g, chrome);
    rbox(0.28, 0.16, 0.04, 0x2f3542, -0.18, 0.78, 0.33, g);
    sphere(0.035, glowMat(0x5fe07a), -0.18, 0.78, 0.36, g);
    return { g, out: V(0.15, 0.52, 0.4), tick };
  }
  if (lv === 2) {   // 義式：不鏽鋼、兩個沖煮頭、壓力錶、蒸氣管
    rbox(1.25, 1.05, 0.8, 0xdfe5ec, 0, 0.53, 0, g, chrome);
    rbox(1.3, 0.12, 0.84, 0x31353d, 0, 1.1, 0, g);
    for (const x of [-0.28, 0.28]) { cyl(0.09, 0.07, 0.12, 0x9aa3ad, x, 0.68, 0.38, g, chrome); box(0.05, 0.05, 0.3, 0x5a3a2a, x, 0.66, 0.6, g); }
    const gauge = cyl(0.12, 0.12, 0.04, 0xffffff, 0, 0.92, 0.41, g); gauge.rotation.x = Math.PI / 2;
    box(0.01, 0.09, 0.01, 0xe0413b, 0, 0.94, 0.44, g);
    for (const x of [-0.4, -0.15, 0.15, 0.4]) cyl(0.06, 0.05, 0.08, 0xffffff, x, 1.2, 0, g);   // 上面放杯子
    let pt = 0; tick = (dt, t, pos) => { pt += dt; if (pt > 1.4) { pt = 0; fx.puff(V(pos.x + 0.55, 0.9, pos.z + 0.4), 0xffffff); } };
    return { g, out: V(0.28, 0.55, 0.45), tick };
  }
  // lv 3、4：高級（黑金、發光面板、三個沖煮頭、星星）；產線版再大一點加霓虹招牌
  const big = lv === 4 ? 1.15 : 1;
  const inner = new THREE.Group(); inner.scale.setScalar(big); g.add(inner);
  rbox(1.5, 1.15, 0.9, 0x22232a, 0, 0.58, 0, inner, { roughness: 0.35 });
  rbox(1.56, 0.1, 0.94, 0xd9a63a, 0, 1.2, 0, inner, gold);
  rbox(1.56, 0.08, 0.94, 0xd9a63a, 0, 0.04, 0, inner, gold);
  for (const x of [-0.45, 0, 0.45]) { cyl(0.09, 0.07, 0.12, 0xd9a63a, x, 0.72, 0.45, inner, gold); box(0.05, 0.05, 0.3, 0x3a2a20, x, 0.7, 0.67, inner); }
  const panel = rbox(0.9, 0.18, 0.04, glowMat(0xffb347), 0, 0.98, 0.46, inner);
  if (lv === 4) {
    const sign = labelSprite('☕ COFFEE', { bg: '#ff4fa3', size: 0.42, glow: true }); sign.position.set(0, 1.85, 0); g.add(sign);
  }
  let st = 0;
  tick = (dt, t, pos) => {
    panel.material.color.setHSL(0.09 + Math.sin(t * 2) * 0.02, 1, 0.6);
    st += dt; if (st > 0.35) { st = 0; fx.sparkle(V(pos.x + (Math.random() - 0.5) * 1.6, 0.4 + Math.random() * 1.2, pos.z + 0.3 + Math.random() * 0.3)); }
  };
  return { g, out: V(0.45 * big, 0.6 * big, 0.5 * big), tick };
}

function printerLook(lv, fx) {
  const g = new THREE.Group(); let tick = () => {};
  if (lv === 0) {   // 舊噴墨：小、米黃色、卡紙紅燈一直閃
    rbox(0.8, 0.38, 0.55, 0xe9e0c8, 0, 0.45, 0, g);
    box(0.5, 0.02, 0.3, 0xffffff, 0, 0.66, -0.15, g).rotation.x = -0.6;   // 進紙
    box(0.5, 0.02, 0.25, 0xd9cfb5, 0, 0.3, 0.35, g);
    cyl(0.3, 0.35, 0.26, 0x9a8f7a, 0, 0.13, 0, g);   // 小桌子
    const led = sphere(0.035, glowMat(0xff3b30), 0.3, 0.58, 0.28, g);
    tick = (dt, t) => { led.visible = Math.sin(t * 9) > 0; };
    return { g, out: V(0, 0.36, 0.45), tick };
  }
  if (lv === 1) {   // 雷射：灰色、方正
    rbox(0.95, 0.6, 0.7, 0xd5d9df, 0, 0.3, 0, g);
    rbox(0.98, 0.1, 0.72, 0x3a3f48, 0, 0.64, 0, g);
    box(0.6, 0.03, 0.3, 0x3a3f48, 0, 0.45, 0.38, g);
    sphere(0.03, glowMat(0x5fe07a), 0.35, 0.55, 0.36, g);
    return { g, out: V(0, 0.5, 0.48), tick };
  }
  if (lv === 2) {   // 大型影印機：高、有掃描蓋、藍色操作面板、抽屜
    rbox(1.1, 1.0, 0.8, 0xf2f3f5, 0, 0.5, 0, g);
    rbox(1.12, 0.1, 0.82, 0x3a3f48, 0, 1.05, 0, g);
    for (const y of [0.18, 0.4]) box(0.9, 0.02, 0.02, 0xb8bec7, 0, y, 0.41, g);
    rbox(0.35, 0.14, 0.2, glowMat(0x3fa7ff), 0.3, 1.0, 0.36, g);
    box(0.7, 0.03, 0.35, 0xb8bec7, -0.1, 0.72, 0.5, g);
    return { g, out: V(-0.1, 0.76, 0.58), tick };
  }
  // 3：彩色影印中心（CMYK 條紋＋大螢幕）；4：印刷產線（加滾筒＋霓虹）
  const big = lv === 4 ? 1.15 : 1;
  const inner = new THREE.Group(); inner.scale.setScalar(big); g.add(inner);
  rbox(1.45, 1.15, 0.9, 0xffffff, 0, 0.58, 0, inner);
  [0x00b7eb, 0xff2d95, 0xffe600, 0x222222].forEach((c, i) => box(1.46, 0.07, 0.91, c, 0, 0.2 + i * 0.09, 0, inner));
  const screen = rbox(0.6, 0.3, 0.04, glowMat(0x7fd1ff), 0.3, 0.95, 0.46, inner);
  box(0.8, 0.03, 0.4, 0xb8bec7, -0.2, 0.75, 0.55, inner);
  const rollers = [];
  if (lv === 4) {
    for (const x of [-0.5, 0, 0.5]) { const r = cyl(0.11, 0.11, 0.95, 0xd9a63a, x, 1.35, 0, inner, gold); r.rotation.x = Math.PI / 2; rollers.push(r); }
    const sign = labelSprite('🖨 PRINT', { bg: '#3fa7ff', size: 0.42, glow: true }); sign.position.set(0, 2.0, 0); g.add(sign);
  }
  let st = 0;
  tick = (dt, t, pos) => {
    screen.material.color.setHSL((t * 0.15) % 1, 0.8, 0.65);
    rollers.forEach(r => { r.rotation.y += dt * 6; });
    st += dt; if (st > 0.45) { st = 0; fx.sparkle(V(pos.x + (Math.random() - 0.5) * 1.5, 0.4 + Math.random() * 1.2, pos.z + 0.4), [0x00b7eb, 0xff2d95, 0xffe600][Math.floor(Math.random() * 3)]); }
  };
  return { g, out: V(-0.2 * big, 0.8 * big, 0.6 * big), tick };
}

// 電話總機：一張桌子，線數＝電話數。回傳每支電話的位置（響鈴時要跳）
function phoneLook(lv, fx) {
  const g = new THREE.Group(); const L = STATIONS.phone.levels[lv];
  const w = 1.2 + L.lines * 0.22;
  rbox(w, 0.62, 0.8, lv >= 3 ? 0x6b4a8a : 0xc9915b, 0, 0.31, 0, g);
  rbox(w + 0.06, 0.06, 0.86, lv >= 3 ? 0xf2e6ff : 0xf0e2c8, 0, 0.65, 0, g);
  const phones = [];
  for (let i = 0; i < L.lines; i++) {
    const x = (i - (L.lines - 1) / 2) * Math.min(0.32, (w - 0.3) / L.lines);
    const p = new THREE.Group(); p.position.set(x, 0.7, 0.12); g.add(p);
    rbox(0.18, 0.06, 0.2, lv >= 2 ? 0x2f3542 : 0xb04a3a, 0, 0.03, 0, p);
    const hand = rbox(0.2, 0.05, 0.06, lv >= 2 ? 0x3a3f48 : 0x8a3a2e, 0, 0.09, -0.05, p);
    phones.push({ g: p, hand });
  }
  if (lv >= 2) for (let i = 0; i < Math.min(3, Math.ceil(L.lines / 2)); i++) {   // 螢幕
    const x = (i - (Math.min(3, Math.ceil(L.lines / 2)) - 1) / 2) * 0.55;
    rbox(0.45, 0.3, 0.04, 0x222831, x, 0.92, -0.28, g); box(0.4, 0.24, 0.01, glowMat(0x4ecbff), x, 0.92, -0.255, g);
  }
  if (lv === 4) { const sign = labelSprite('☎ 客服中心', { bg: '#7b5cff', size: 0.42, glow: true }); sign.position.set(0, 1.75, 0); g.add(sign); }
  return { g, phones, tick: () => {} };
}

export const LOOKS = { coffee: coffeeLook, printer: printerLook, phone: phoneLook };

// ---------- 產線輸送帶 ----------
// path：[x,z] 的折線（地面座標），貨品會從頭跑到尾
const beltTex = canvasTex(64, 64, (g, W, H) => { g.fillStyle = '#2b2f36'; g.fillRect(0, 0, W, H); g.fillStyle = '#3d434c'; g.fillRect(0, 0, W, H / 4); g.fillStyle = '#ffcf3f'; g.fillRect(0, H / 2 - 2, W, 4); });
beltTex.wrapS = beltTex.wrapT = THREE.RepeatWrapping;
export function buildBelt(path, height = 0.5) {
  const g = new THREE.Group(); scene.add(g);
  const mats = [];
  for (let i = 0; i < path.length - 1; i++) {
    const [x1, z1] = path[i], [x2, z2] = path[i + 1];
    const len = Math.hypot(x2 - x1, z2 - z1), ang = Math.atan2(x2 - x1, z2 - z1);
    const seg = new THREE.Group(); seg.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2); seg.rotation.y = ang; g.add(seg);
    rbox(0.5, height - 0.06, len + 0.4, 0xff8a3d, 0, (height - 0.06) / 2, 0, seg);           // 橘色機身
    const t = beltTex.clone(); t.needsUpdate = true; t.repeat.set(1, len * 3);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(0.4, len + 0.4), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }));
    top.rotation.x = -Math.PI / 2; top.position.y = height + 0.001; seg.add(top); mats.push(t);
    for (const s of [-0.24, 0.24]) box(0.04, 0.08, len + 0.4, 0xffe08a, s, height + 0.03, 0, seg, { metalness: 0.6, roughness: 0.3 });   // 金色護欄
  }
  const lens = []; let total = 0;
  for (let i = 0; i < path.length - 1; i++) { const l = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]); lens.push(l); total += l; }
  // 沿路取點：d＝從起點走了多遠
  function at(d) {
    for (let i = 0; i < lens.length; i++) {
      if (d <= lens[i]) { const k = d / lens[i]; return V(path[i][0] + (path[i + 1][0] - path[i][0]) * k, height + 0.08, path[i][1] + (path[i + 1][1] - path[i][1]) * k); }
      d -= lens[i];
    }
    const e = path[path.length - 1]; return V(e[0], height + 0.08, e[1]);
  }
  return { g, at, total, tick(dt, speed) { mats.forEach(t => { t.offset.y -= dt * speed * 3; }); } };
}

// 設施頭上的名牌：名稱＋星星
export function levelBadge(name, lv, total = 5) {
  const t = canvasTex(512, 160, (g, W, H) => {
    g.fillStyle = '#2c3e57e6'; g.beginPath(); g.roundRect(40, 20, W - 80, 120, 50); g.fill();
    g.fillStyle = '#fff'; g.font = `900 52px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(name, W / 2, 62);
    g.fillStyle = '#ffd34d'; g.font = `900 40px ${FONT}`;
    g.fillText('★'.repeat(lv + 1) + '☆'.repeat(Math.max(0, total - 1 - lv)), W / 2, 112);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(1.6, 0.5, 1); s.renderOrder = 8; return s;
}

// ---------- 可愛攤位（櫃台）：條紋布、波浪邊、招牌 ----------
// 不做遮雨棚和柱子：鏡頭從前上方往下看，屋頂會蓋住小葵和櫃台上的貨，所以裝飾都貼在櫃台本身（前後兩面一樣，背對鏡頭的攤位也好看）
// 本地座標：客人在 +z（前面），員工在 -z（後面）。回傳 { g, slot(i)（櫃台上第 i 個貨的本地位置）, tick }
const stripeTex = {};
function awningTex(a, b) {
  const k = a + '-' + b;
  return stripeTex[k] ||= canvasTex(128, 32, (g, W, H) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i * W / 8, 0, W / 8, H); } });
}
export const STALL_STYLE = {
  coffee: { base: 0xe08a4a, top: 0xfff4e2, a: '#e0663a', b: '#fff4e2', sign: '☕ 咖啡吧', signBg: '#e0663a' },
  printer: { base: 0x5aa7e6, top: 0xf2f8ff, a: '#3f8fe0', b: '#ffffff', sign: '📄 影印區', signBg: '#3f8fe0' },
  beef: { base: 0xd9483b, top: 0xfff4e2, a: '#e0473a', b: '#fff4e2', sign: '🐮 牛肉飯', signBg: '#d9483b' },
  chicken: { base: 0xf2a33a, top: 0xfff8e8, a: '#ffb42e', b: '#fff8e8', sign: '🐔 雞肉飯', signBg: '#e8902a' },
  fish: { base: 0x3f9be0, top: 0xf0f8ff, a: '#3f9be0', b: '#f0f8ff', sign: '🐟 魚排飯', signBg: '#2f7fc4' },
};
export function stallLook(type, lv = 0, fx = {}) {
  const st = STALL_STYLE[type], w = 2.4 + lv * 0.2, g = new THREE.Group();
  rbox(w, 0.78, 0.72, st.base, 0, 0.39, 0, g);
  rbox(w + 0.15, 0.08, 0.86, st.top, 0, 0.82, 0, g);
  const stripe = new THREE.MeshStandardMaterial({ map: awningTex(st.a, st.b) });
  // 桌面鋪條紋桌巾（鏡頭從上面看最明顯的一面）
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.05, 0.78), stripe); cloth.rotation.x = -Math.PI / 2; cloth.position.y = 0.862; cloth.receiveShadow = true; g.add(cloth);
  const signTex = labelSprite(st.sign, { bg: st.signBg }).material.map;
  const signMat = new THREE.MeshBasicMaterial({ map: signTex, transparent: true, toneMapped: lv < 2 });
  const lights = [], n = Math.round(w / 0.2);
  for (const side of [1, -1]) {   // 前面、後面各一套
    const z = side * 0.362, face = new THREE.Group(); face.position.z = z; face.rotation.y = side > 0 ? 0 : Math.PI; g.add(face);
    const skirt = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.94, 0.52), stripe); skirt.position.set(0, 0.4, 0.004); face.add(skirt);
    for (let i = 0; i < n; i++) {   // 上緣一排波浪邊（原本遮雨棚的簾子）
      const b = sphere(0.13, i % 2 ? 0xffffff : st.base, -w / 2 + 0.1 + i * (w - 0.2) / (n - 1), 0.74, 0.07, face);
      b.scale.set(1, 0.65, 0.4);
    }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.34), signMat); sign.position.set(0, 0.4, 0.012); face.add(sign);
    if (lv >= 1) for (let i = 0; i < 11; i++) {   // 小燈泡串掛在櫃台下緣
      const x = -w / 2 + 0.12 + i * (w - 0.24) / 10;
      lights.push(sphere(0.045, new THREE.MeshBasicMaterial({ color: [0xffe08a, 0xff9ad5, 0x9be7ff][i % 3], toneMapped: false }), x, 0.12 + Math.abs(Math.sin(i * 0.9)) * 0.03, 0.05, face));
    }
  }
  if (lv >= 1) for (const x of [-w / 2 - 0.25, w / 2 + 0.25]) {   // 兩盆花
    cyl(0.16, 0.13, 0.28, 0xff8a5c, x, 0.14, 0.3, g);
    for (let k = 0; k < 4; k++) sphere(0.12, [0xff6b8b, 0xffd34d, 0x47b35a, 0xb46bff][k], x + Math.cos(k * 1.6) * 0.07, 0.38 + (k % 2) * 0.08, 0.3 + Math.sin(k * 1.6) * 0.07, g);
  }
  if (lv >= 2) {   // 豪華：金邊、前面兩角金星（矮的，不擋視線）
    for (const z of [-0.44, 0.44]) rbox(w + 0.2, 0.06, 0.06, 0xd9a63a, 0, 0.88, z, g, gold);   // 桌緣金框（中間留給桌巾）
    for (const x of [-(w + 0.14) / 2, (w + 0.14) / 2]) rbox(0.06, 0.06, 0.9, 0xd9a63a, x, 0.88, 0, g, gold);
    rbox(w + 0.2, 0.05, 0.9, 0xd9a63a, 0, 0.03, 0, g, gold);
    for (const x of [-w / 2, w / 2]) { cyl(0.03, 0.03, 0.3, 0xd9a63a, x, 1.03, 0.36, g, gold); sphere(0.11, 0xffd34d, x, 1.24, 0.36, g, gold); }
  }
  let st2 = 0;
  const tick = (dt, t, pos) => {
    lights.forEach((b, i) => { b.visible = Math.sin(t * 4 + i) > -0.3; });
    if (lv >= 2 && fx.sparkle) { st2 += dt; if (st2 > 0.4) { st2 = 0; fx.sparkle(V(pos.x + (Math.random() - 0.5) * w, 1 + Math.random() * 1.3, pos.z + (Math.random() - 0.5))); } }
  };
  return { g, slot: (i, h) => V(-w / 2 + 0.35 + Math.floor(i / 10) * 0.3, 0.86 + h / 2 + (i % 10) * h, 0), tick, w };
}

// 販賣機：等級越高台數越多（1→2→3），庫存藏在機器裡
const vendFront = canvasTex(128, 256, (g, W, H) => {
  g.fillStyle = '#dff3ff'; g.fillRect(8, 8, W - 16, H * 0.62);
  const cols = ['#ff5d73', '#36c35d', '#3fa7ff', '#ffb42e'];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { g.fillStyle = cols[(r + c) % 4]; g.fillRect(16 + c * 26, 20 + r * 36, 18, 28); g.fillStyle = '#ffffffaa'; g.fillRect(19 + c * 26, 22 + r * 36, 4, 22); }
  g.fillStyle = '#2c3e57'; g.fillRect(8, H * 0.7, W - 16, 30); g.fillStyle = '#9aa3ad'; g.fillRect(W - 40, H * 0.72, 22, 24);
});
export function vendingLook(lv, fx = {}) {
  const g = new THREE.Group(), n = lv + 1, colors = [0xff4f5e, 0x3fa7ff, 0x36c35d];
  const glows = [];
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 0.95, m = new THREE.Group(); m.position.x = x; g.add(m);
    rbox(0.85, 1.75, 0.7, colors[i], 0, 0.875, 0, m);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 1.44), new THREE.MeshBasicMaterial({ map: vendFront, toneMapped: false })); f.position.set(0, 1.0, 0.356); m.add(f);
    if (lv >= 2) { const top = rbox(0.86, 0.16, 0.71, new THREE.MeshBasicMaterial({ color: 0xffe08a, toneMapped: false }), 0, 1.82, 0, m); glows.push(top); }
  }
  const sign = labelSprite('🥤 販賣機', { bg: '#ff4f5e', size: 0.3, glow: lv >= 2 }); sign.position.set(0, 2.3, 0); g.add(sign);
  const tick = (dt, t) => { glows.forEach((m, i) => m.material.color.setHSL((t * 0.2 + i * 0.3) % 1, 0.9, 0.65)); };
  return { g, slot: () => V(0, 0.9, 0), hidden: true, tick, w: n * 0.95 };
}

// 進貨箱：飲料一箱箱、食材冷藏櫃（不升級）。out＝新貨冒出來的位置
export function sourceLook(type) {
  const g = new THREE.Group();
  if (type === 'drink') {
    rbox(1.1, 0.12, 0.9, 0xc9915b, 0, 0.06, 0, g);
    [0xff5d73, 0x36c35d, 0x3fa7ff, 0xffb42e].forEach((c, i) => rbox(0.48, 0.3, 0.38, c, (i % 2 - 0.5) * 0.5, 0.28 + Math.floor(i / 2) * 0.31, (i % 2) * 0.05, g));
    const s = labelSprite('🥤 飲料進貨', { bg: '#2c3e57', size: 0.24 }); s.position.set(0, 1.25, 0); g.add(s);
    return { g, out: V(0, 0.9, 0.3), tick: () => {} };
  }
  const col = { beef: 0xe0473a, chicken: 0xffb42e, fish: 0x3f9be0 }[type];
  rbox(1.15, 1.25, 0.7, 0xf5f7fa, 0, 0.625, 0, g);
  // 前後都有彩色門板＋圖示（鏡頭看得到背面，不要一整片白）
  for (const z of [0.35, -0.35]) {
    rbox(1.0, 0.5, 0.04, col, 0, 0.88, z, g);
    box(0.08, 0.3, 0.05, 0xd8dde3, 0.4, 0.88, z * 1.12, g, { metalness: 0.7, roughness: 0.3 });
    const ic = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshBasicMaterial({ map: getIcon({ beef: '🐮', chicken: '🐔', fish: '🐟' }[type]), transparent: true }));
    ic.position.set(-0.15, 0.88, z * 1.09); if (z < 0) ic.rotation.y = Math.PI; g.add(ic);
  }
  rbox(1.17, 0.1, 0.72, col, 0, 1.28, 0, g);
  const s = labelSprite({ beef: '🐮 牛肉進貨', chicken: '🐔 雞肉進貨', fish: '🐟 魚肉進貨' }[type], { bg: '#2c3e57', size: 0.24 }); s.position.set(0, 1.6, 0); g.add(s);
  return { g, out: V(0, 0.8, 0.45), tick: () => {} };
}

// 阿傑的設計桌：桌子、繪圖板、旁邊畫架（畫面隨進度慢慢畫出來）
export function deskLook() {
  const g = new THREE.Group();
  rbox(1.5, 0.7, 0.75, 0xffffff, 0, 0.35, 0, g);
  rbox(1.6, 0.06, 0.82, 0x8a6a4c, 0, 0.72, 0, g);
  rbox(0.6, 0.03, 0.42, 0x2c3e57, 0.1, 0.77, 0.05, g);
  rbox(0.55, 0.01, 0.37, new THREE.MeshBasicMaterial({ color: 0x9be7ff, toneMapped: false }), 0.1, 0.79, 0.05, g);
  for (let i = 0; i < 4; i++) box(0.24, 0.02, 0.32, 0xffffff, -0.5, 0.77 + i * 0.022, 0, g).rotation.y = i * 0.15;
  cyl(0.12, 0.1, 0.18, 0xff8a5c, 0.62, 0.84, -0.2, g); sphere(0.14, 0x47b35a, 0.62, 1.02, -0.2, g);
  // 畫架（面向鏡頭）
  const easel = new THREE.Group(); easel.position.set(-1.15, 0, 0.25); g.add(easel);
  for (const x of [-0.3, 0.3]) { const l = cyl(0.025, 0.025, 1.5, 0x8a6a4c, x, 0.75, 0, easel); l.rotation.z = x > 0 ? -0.08 : 0.08; }
  const c = document.createElement('canvas'); c.width = 128; c.height = 100;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.56), new THREE.MeshBasicMaterial({ map: tex })); board.position.set(0, 1.12, 0.04); easel.add(board);
  box(0.78, 0.62, 0.03, 0xfff4e2, 0, 1.12, 0.01, easel);
  let shown = -1;
  // 畫面：天空、太陽、山、房子，依進度從左畫到右
  const paint = (p) => {
    const k = Math.round(p * 20) / 20; if (k === shown) return; shown = k;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 128, 100);
    x.save(); x.beginPath(); x.rect(0, 0, 128 * k, 100); x.clip();
    x.fillStyle = '#9be7ff'; x.fillRect(0, 0, 128, 60); x.fillStyle = '#ffd34d'; x.beginPath(); x.arc(100, 22, 12, 0, 7); x.fill();
    x.fillStyle = '#47b35a'; x.beginPath(); x.moveTo(0, 70); x.lineTo(40, 30); x.lineTo(80, 70); x.lineTo(128, 40); x.lineTo(128, 100); x.lineTo(0, 100); x.fill();
    x.fillStyle = '#ff7a45'; x.fillRect(50, 60, 26, 24); x.fillStyle = '#d9483b'; x.beginPath(); x.moveTo(46, 60); x.lineTo(63, 46); x.lineTo(80, 60); x.fill();
    x.restore(); x.strokeStyle = '#2c3e57'; x.lineWidth = 3; x.beginPath(); x.moveTo(128 * k, 0); x.lineTo(128 * k, 100); if (k > 0 && k < 1) x.stroke();
    tex.needsUpdate = true;
  };
  paint(0);
  const sign = labelSprite('🎨 設計部', { bg: '#b46bff', size: 0.3 }); sign.position.set(-0.3, 2.0, 0); g.add(sign);
  return { g, paint };
}

// 小米的客服中心辦公室（總機第 4、5 階）：矮玻璃牆圍起來，前面留門。牆只到腰，鏡頭看得到裡面
export const MI_OFFICE = { x0: 3.15, x1: 7.2, z0: -6.5, z1: -3.6, door: [4.75, 6.05] };
export function miOfficeLook(lv) {
  const O = MI_OFFICE, g = new THREE.Group(), lux = lv >= 4;
  const rail = lux ? 0xd9a63a : 0x7b5cff, opt = lux ? { metalness: 0.9, roughness: 0.3 } : undefined;
  const cw = O.x1 - O.x0, cd = O.z1 - O.z0, cx = (O.x0 + O.x1) / 2, cz = (O.z0 + O.z1) / 2;
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(cw, cd), new THREE.MeshStandardMaterial({ map: canvasTex(256, 192, (c, W, H) => {
    c.fillStyle = lux ? '#e4ccff' : '#cdbdff'; c.fillRect(0, 0, W, H);
    c.fillStyle = lux ? '#f6ebff' : '#e2d8ff'; for (let y = 12; y < H; y += 24) for (let x = (y / 24 % 2) * 16 + 8; x < W; x += 32) { c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); }
  }) }));
  carpet.rotation.x = -Math.PI / 2; carpet.position.set(cx, 0.006, cz); carpet.receiveShadow = true; g.add(carpet);
  const glass = new THREE.MeshStandardMaterial({ color: 0xcdeeff, transparent: true, opacity: 0.32, roughness: 0.1, depthWrite: false });
  const wall = (ax, az, bx, bz) => {   // 一段牆：底板＋玻璃＋上框
    const len = Math.hypot(bx - ax, bz - az), w = new THREE.Group();
    w.position.set((ax + bx) / 2, 0, (az + bz) / 2); w.rotation.y = -Math.atan2(bz - az, bx - ax); g.add(w);
    rbox(len, 0.14, 0.08, 0x7b5cff, 0, 0.07, 0, w);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(len, 0.72, 0.03), glass); gl.position.y = 0.5; w.add(gl);
    rbox(len + 0.04, 0.06, 0.09, rail, 0, 0.88, 0, w, opt);
  };
  wall(O.x0, O.z0, O.x0, O.z1);
  wall(O.x0, O.z1, O.door[0], O.z1);
  wall(O.door[1], O.z1, O.x1, O.z1);
  for (const x of O.door) {   // 門柱＋燈
    cyl(0.06, 0.06, 1.1, rail, x, 0.55, O.z1, g, opt);
    sphere(0.12, new THREE.MeshBasicMaterial({ color: lux ? 0xffe08a : 0xd9c8ff, toneMapped: false }), x, 1.18, O.z1, g);
  }
  // 門牌貼在左邊玻璃上（平的，不擋視線）
  const tex = labelSprite(lux ? '👑 小米客服中心' : '📞 小米辦公室', { bg: lux ? '#b8862a' : '#7b5cff' }).material.map;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.33), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: !lux }));
  sign.position.set((O.x0 + O.door[0]) / 2, 0.55, O.z1 + 0.05); g.add(sign);
  return g;
}
