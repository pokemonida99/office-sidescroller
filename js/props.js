// 跑酷道具：障礙物、收集物、各樓層的背景。全部用程式做的圓角方塊，跟上班啟示錄同一個玩具感
import * as THREE from 'three';
import { scene, rbox, box, cyl, sphere, mat, canvasTex, labelSprite, roundRect, FONT, V, geo } from './world.js?v=0.1.1';

const glowMat = (c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
const chrome = { metalness: 0.85, roughness: 0.25 };
const iconTex = {};
export const emojiTex = (e) => iconTex[e] ||= canvasTex(96, 96, (g, W) => { g.font = `72px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, W / 2, W / 2 + 4); });

// ---------- 障礙物 ----------
// 每個回傳 { g, w, h, y0 }：碰撞框寬、高、離地高度（以群組原點為中心、腳底）
export const OBST = {
  paper() {   // 影印紙堆：幾包紙歪歪疊著
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const r = rbox(0.62, 0.13, 0.46, 0xffffff, (Math.random() - 0.5) * 0.06, 0.07 + i * 0.135, 0, g); r.rotation.y = (Math.random() - 0.5) * 0.3;
      box(0.63, 0.135, 0.12, i % 2 ? 0x3fa7ff : 0xff7a45, 0, 0, 0, r);
    }
    return { g, w: 0.56, h: 0.52, y0: 0 };
  },
  boxes() {   // 紙箱兩層，貼膠帶寫「急件」
    const g = new THREE.Group();
    const a = rbox(0.78, 0.5, 0.6, 0xd9a066, 0, 0.25, 0, g), b = rbox(0.62, 0.46, 0.52, 0xe3b07a, 0.04, 0.73, 0, g); b.rotation.y = 0.12;
    box(0.79, 0.07, 0.61, 0xc8b48c, 0, 0.12, 0, a); box(0.63, 0.07, 0.53, 0xc8b48c, 0, 0.12, 0, b);
    const t = new THREE.Mesh(geo('p.4', () => new THREE.PlaneGeometry(0.4, 0.2)), new THREE.MeshBasicMaterial({ map: stampTex(), transparent: true }));
    t.position.set(0, -0.02, 0.305); a.add(t);
    return { g, w: 0.7, h: 0.94, y0: 0 };
  },
  spill() {   // 打翻的咖啡：一灘＋倒下的紙杯＋小心地滑立牌（立牌在後面，不擋路）
    const g = new THREE.Group();
    const p = cyl(0.75, 0.75, 0.02, mat(0x6b3f24, { roughness: 0.15 }), 0, 0.01, 0, g, undefined, 28); p.scale.z = 0.55;
    const c = cyl(0.09, 0.07, 0.24, 0xfffaf0, -0.55, 0.09, 0.15, g); c.rotation.z = Math.PI / 2 - 0.2;
    cyl(0.095, 0.095, 0.08, 0xd9773b, -0.55, 0.09, 0.15, g).rotation.z = Math.PI / 2 - 0.2;
    const sign = new THREE.Group(); sign.position.set(0.35, 0, -0.75); g.add(sign);
    for (const s of [-1, 1]) { const l = box(0.42, 0.62, 0.02, 0xffd400, 0, 0.3, s * 0.08, sign); l.rotation.x = s * 0.25; }
    const f = new THREE.Mesh(geo('p.33', () => new THREE.PlaneGeometry(0.34, 0.34)), new THREE.MeshBasicMaterial({ map: slipTex(), transparent: true })); f.position.set(0, 0.33, 0.17); f.rotation.x = 0.25; sign.add(f);
    return { g, w: 1.2, h: 0.14, y0: 0, low: true };
  },
  chair() {   // 辦公椅自己滑過來（會轉）
    const g = new THREE.Group(), spin = new THREE.Group(); g.add(spin);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2, leg = box(0.32, 0.04, 0.05, 0x2f3542, Math.cos(a) * 0.16, 0.08, Math.sin(a) * 0.16, spin); leg.rotation.y = -a;
      sphere(0.05, 0x1e2229, Math.cos(a) * 0.3, 0.05, Math.sin(a) * 0.3, spin);
    }
    cyl(0.035, 0.035, 0.3, 0x9aa3ad, 0, 0.25, 0, spin, chrome);
    rbox(0.55, 0.1, 0.52, 0xff6b6b, 0, 0.43, 0, spin);
    rbox(0.52, 0.5, 0.09, 0xff6b6b, 0, 0.76, -0.24, spin).rotation.x = -0.12;
    return { g, w: 0.55, h: 0.9, y0: 0, spin, vx: -2.4 };
  },
  bot() {   // Kevin 的 AI 機器人：圓滾滾、螢幕臉、天線紅燈。可以踩扁
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    rbox(0.58, 0.5, 0.5, 0xf2f5f8, 0, 0.36, 0, body);
    rbox(0.44, 0.28, 0.04, 0x1c2433, 0, 0.4, 0.25, body);
    const face = new THREE.Mesh(geo('p.4b', () => new THREE.PlaneGeometry(0.4, 0.24)), new THREE.MeshBasicMaterial({ map: botFaceTex(), transparent: true, toneMapped: false }));
    face.position.set(0, 0.4, 0.275); body.add(face);
    cyl(0.015, 0.015, 0.18, 0x9aa3ad, 0, 0.7, 0, body);
    const led = sphere(0.05, glowMat(0xff3b30), 0, 0.8, 0, body);
    for (const z of [-0.2, 0.2]) { const w = cyl(0.1, 0.1, 0.08, 0x2f3542, 0, 0.1, z, g); w.rotation.x = Math.PI / 2; }
    rbox(0.16, 0.08, 0.08, 0x3fa7ff, 0.32, 0.38, 0, body);
    return { g, w: 0.54, h: 0.72, y0: 0, body, led, vx: -1.5, stomp: true };
  },
  drone() {   // AI 無人機：飄在頭的高度，要滑過去
    const g = new THREE.Group(), body = new THREE.Group(); body.position.y = 1.07; g.add(body);
    rbox(0.5, 0.2, 0.42, 0xf2f5f8, 0, 0, 0, body);
    const face = new THREE.Mesh(geo('p.4b', () => new THREE.PlaneGeometry(0.4, 0.24)), new THREE.MeshBasicMaterial({ map: botFaceTex(), transparent: true, toneMapped: false }));
    face.scale.setScalar(0.7); face.position.set(0, 0, 0.215); body.add(face);
    const rotors = [];
    for (const [x, z] of [[-0.3, -0.22], [0.3, -0.22], [-0.3, 0.22], [0.3, 0.22]]) {
      box(0.18, 0.03, 0.03, 0x9aa3ad, x * 0.7, 0.08, z * 0.7, body).rotation.y = Math.atan2(z, x);
      const r = cyl(0.17, 0.17, 0.01, mat(0x3fa7ff, { transparent: true, opacity: 0.55 }), x, 0.12, z, body); rotors.push(r);
    }
    const l = sphere(0.04, glowMat(0xff3b30), 0, -0.13, 0, body);
    return { g, w: 0.62, h: 0.5, y0: 0.82, body, rotors, led: l };
  },
  banner() {   // 天花板垂下來的紅布條「這個用AI就好了」：要滑過去
    const g = new THREE.Group();
    box(1.2, 0.08, 0.08, 0x8a6a4c, 0, 4.1, 0, g);
    const cloth = new THREE.Mesh(geo('bn', () => new THREE.PlaneGeometry(0.9, 3.15)), new THREE.MeshStandardMaterial({ map: bannerTex(), side: THREE.DoubleSide, roughness: 0.8 }));
    cloth.position.set(0, 2.5, 0); cloth.castShadow = true; g.add(cloth);
    rbox(1.0, 0.07, 0.07, 0xd9a63a, 0, 0.9, 0, g, { metalness: 0.9, roughness: 0.3 });
    return { g, w: 0.8, h: 3.3, y0: 0.88, cloth };
  },
  desk() {   // 辦公桌：可以跳上去跑（碰到側面會撞到）
    const g = new THREE.Group();
    rbox(2.2, 0.08, 0.9, 0xc9915b, 0, 0.76, 0, g);
    for (const x of [-1, 1]) rbox(0.08, 0.72, 0.8, 0xf5f2ea, x, 0.36, 0, g);
    rbox(1.9, 0.5, 0.06, 0xf5f2ea, 0, 0.45, -0.38, g);
    // 桌上東西放後面，不擋跑的地方
    rbox(0.5, 0.34, 0.04, 0x2c3e57, -0.5, 1.0, -0.36, g); box(0.44, 0.27, 0.01, glowMat(0x9be7ff), -0.5, 1.0, -0.335, g);
    cyl(0.07, 0.06, 0.12, 0xff8a5c, 0.7, 0.86, -0.3, g); sphere(0.1, 0x47b35a, 0.7, 0.98, -0.3, g);
    return { g, w: 2.2, h: 0.8, y0: 0, platform: true };
  },
};

function stampTex() {
  return iconTex.stamp ||= canvasTex(128, 64, (g, W, H) => {
    g.fillStyle = '#e8d8b0'; g.fillRect(0, 0, W, H); g.strokeStyle = '#e0413b'; g.lineWidth = 6; g.strokeRect(10, 8, W - 20, H - 16);
    g.fillStyle = '#e0413b'; g.font = `900 34px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('急件', W / 2, H / 2 + 2);
  });
}
function slipTex() {
  return iconTex.slip ||= canvasTex(128, 128, (g, W) => {
    g.fillStyle = '#111'; g.font = `900 30px ${FONT}`; g.textAlign = 'center'; g.fillText('小心', W / 2, 40); g.fillText('地滑', W / 2, 74);
    g.font = `40px ${FONT}`; g.fillText('🚶', W / 2, 116);
  });
}
function botFaceTex() {
  return iconTex.bot ||= canvasTex(160, 96, (g, W, H) => {
    g.fillStyle = '#5ff2ff'; g.shadowColor = '#5ff2ff'; g.shadowBlur = 10;
    g.beginPath(); g.ellipse(48, 38, 13, 16, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(112, 38, 13, 16, 0, 0, 7); g.fill();
    g.font = `900 24px ${FONT}`; g.textAlign = 'center'; g.fillText('AI', W / 2, 84);
  });
}
function bannerTex() {
  return iconTex.banner ||= canvasTex(128, 448, (g, W, H) => {
    g.fillStyle = '#e0413b'; g.fillRect(0, 0, W, H); g.fillStyle = '#ffd34d'; g.fillRect(0, 0, W, 10); g.fillRect(0, H - 10, W, 10);
    g.fillStyle = '#fff'; g.font = `900 46px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const t = ['這', '個', '用', 'AI', '就', '好', '了'];
    t.forEach((c, i) => { g.font = `900 ${c === 'AI' ? 40 : 46}px ${FONT}`; g.fillText(c, W / 2, 46 + i * 57); });
  });
}

// ---------- 收集物 ----------
const billGeo = new THREE.BoxGeometry(0.42, 0.22, 0.02), bandGeo = new THREE.BoxGeometry(0.1, 0.225, 0.025);
export function makeBill() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(billGeo, mat(0x36c35d)), d = new THREE.Mesh(bandGeo, mat(0xe3f6c8));
  b.castShadow = true; g.add(b, d); return g;
}
const haloTex = canvasTex(128, 128, (g, W) => {
  const gr = g.createRadialGradient(W / 2, W / 2, 4, W / 2, W / 2, W / 2); gr.addColorStop(0, '#fff6c8ff'); gr.addColorStop(0.4, '#ffd76a99'); gr.addColorStop(1, '#ffd76a00');
  g.fillStyle = gr; g.fillRect(0, 0, W, W);
});
function halo(g, color, size = 1.1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  s.scale.setScalar(size); g.add(s); return s;
}
export function makeCoffee() {   // 咖啡：衝刺無敵
  const g = new THREE.Group(); halo(g, 0xffc078);
  const cup = new THREE.Group(); cup.scale.setScalar(2.1); cup.position.y = -0.12; g.add(cup);
  cyl(0.09, 0.07, 0.17, 0xfffaf0, 0, 0, 0, cup); cyl(0.093, 0.083, 0.07, 0xd9773b, 0, -0.005, 0, cup); cyl(0.1, 0.1, 0.03, 0x5a3a2a, 0, 0.09, 0, cup);
  return g;
}
export function makeBadge() {   // 員工證：擋一次
  const g = new THREE.Group(); halo(g, 0x7fd1ff);
  rbox(0.34, 0.46, 0.04, 0x3fa7ff, 0, -0.05, 0, g);
  const f = new THREE.Mesh(geo('p.26', () => new THREE.PlaneGeometry(0.26, 0.26)), new THREE.MeshBasicMaterial({ map: badgeFace() })); f.position.set(0, 0.0, 0.025); g.add(f);
  const l = new THREE.Mesh(geo('lanyard', () => new THREE.TorusGeometry(0.16, 0.015, 6, 20, Math.PI)), mat(0xff7a45)); l.position.y = 0.18; g.add(l);
  return g;
}
let badgeTexC;
function badgeFace() {
  if (badgeTexC) return badgeTexC;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128);
  badgeTexC = new THREE.CanvasTexture(c); badgeTexC.colorSpace = THREE.SRGBColorSpace;
  const img = new Image(); img.onload = () => { g.save(); g.beginPath(); g.arc(64, 54, 44, 0, 7); g.clip(); g.drawImage(img, 128 * -0.25, 128 * -0.1, 192, 192); g.restore(); g.fillStyle = '#2c3e57'; g.font = `900 22px ${FONT}`; g.textAlign = 'center'; g.fillText('小葵', 64, 120); badgeTexC.needsUpdate = true; };
  img.src = 'icons/kui-180.png'; return badgeTexC;
}

// ---------- Kevin 的 AI 平衡車 ----------
export function hoverboard() {
  const g = new THREE.Group();
  rbox(0.75, 0.1, 0.36, 0x22232a, 0, 0.17, 0, g);
  box(0.6, 0.02, 0.3, glowMat(0x5ff2ff), 0, 0.225, 0, g);
  for (const x of [-0.42, 0.42]) { const w = cyl(0.15, 0.15, 0.12, 0x2f3542, x, 0.15, 0, g); w.rotation.z = Math.PI / 2; w.rotation.y = Math.PI / 2; }
  const under = halo(g, 0x5ff2ff, 1.3); under.position.y = 0.05;
  return g;
}

// ---------- 打卡鐘（每一區的終點） ----------
export function punchClock() {
  const g = new THREE.Group();
  cyl(0.06, 0.06, 1.3, 0x9aa3ad, 0, 0.65, 0, g, chrome);
  rbox(0.7, 0.8, 0.4, 0xff7a45, 0, 1.6, 0, g);
  const face = new THREE.Mesh(geo('p.5c', () => new THREE.CircleGeometry(0.25, 28)), new THREE.MeshBasicMaterial({ map: clockTex() })); face.position.set(0, 1.68, 0.205); g.add(face);
  rbox(0.4, 0.08, 0.1, 0x2c3e57, 0, 1.3, 0.2, g);
  const s = labelSprite('打卡！', { bg: '#36c35d', size: 0.36 }); s.position.set(0, 2.35, 0); g.add(s);
  return g;
}
function clockTex() {
  return iconTex.clock ||= canvasTex(128, 128, (g, W) => {
    g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill();
    g.strokeStyle = '#2c3e57'; g.lineWidth = 6; g.lineCap = 'round';
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.moveTo(64 + Math.cos(a) * 48, 64 + Math.sin(a) * 48); g.lineTo(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56); g.stroke(); }
    g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 22); g.stroke(); g.beginPath(); g.moveTo(64, 64); g.lineTo(92, 64); g.stroke();
  });
}

// ---------- 背景：各區的牆、地板、上下樓層 ----------
// 主題：wall 牆、trim 腰帶、floor 地板兩色、light 其他樓層的色調
export const THEMES = {
  lobby: { name: '大廳', wall: '#f6e7cf', trim: '#c9915b', floor: ['#efe2cc', '#e2d1b4'], pattern: 'marble', tint: '#fbe9d2' },
  office: { name: '開放辦公區', wall: '#dff1ff', trim: '#3fa7ff', floor: ['#c9d6e3', '#bccbdb'], pattern: 'carpet', tint: '#e3f1ff' },
  pantry: { name: '茶水間', wall: '#dff7e6', trim: '#36c35d', floor: ['#ffffff', '#cfeedd'], pattern: 'check', tint: '#e2f6e8' },
  boss: { name: '老闆樓層', wall: '#ffe3ec', trim: '#d9a63a', floor: ['#c94a5a', '#b83d4d'], pattern: 'carpet', tint: '#ffe6ee' },
};
const wallTexCache = {}, floorTexCache = {}, storyTexCache = {};
// 主樓層的牆：腰帶、踢腳板、兩扇大窗（藍天白雲＋城市剪影）
export function wallTex(key) {
  if (wallTexCache[key]) return wallTexCache[key];
  const th = THEMES[key];
  return wallTexCache[key] = canvasTex(512, 270, (g, W, H) => {
    g.fillStyle = th.wall; g.fillRect(0, 0, W, H);
    if (key === 'boss') { g.fillStyle = '#ffd0de'; for (let x = 0; x < W; x += 32) for (let y = 0; y < H; y += 32) { g.beginPath(); g.arc(x + ((y / 32) % 2) * 16, y, 4, 0, 7); g.fill(); } }
    if (key === 'pantry') { g.fillStyle = '#c7ecd3'; for (let x = 0; x < W; x += 24) for (let y = 150; y < H - 20; y += 24) g.fillRect(x + 1, y + 1, 22, 22); }
    // 窗戶
    for (const wx of [40, 280]) {
      const ww = 190, wy = 34, wh = 104;
      const gr = g.createLinearGradient(0, wy, 0, wy + wh); gr.addColorStop(0, '#7cc8ff'); gr.addColorStop(1, '#d8f0ff');
      g.fillStyle = gr; g.fillRect(wx, wy, ww, wh);
      g.fillStyle = '#ffffffcc'; g.beginPath(); g.ellipse(wx + 50, wy + 30, 24, 10, 0, 0, 7); g.ellipse(wx + 68, wy + 24, 18, 12, 0, 0, 7); g.fill();
      g.fillStyle = '#a9c6de'; for (let i = 0; i < 7; i++) { const bh = 20 + ((i * 37 + wx) % 40); g.fillRect(wx + i * 28, wy + wh - bh, 24, bh); }
      g.fillStyle = '#ffffff'; g.fillRect(wx - 6, wy - 6, ww + 12, 6); g.fillRect(wx - 6, wy + wh, ww + 12, 8); g.fillRect(wx - 6, wy, 6, wh); g.fillRect(wx + ww, wy, 6, wh); g.fillRect(wx + ww / 2 - 3, wy, 6, wh);
    }
    g.fillStyle = th.trim; g.fillRect(0, 148, W, 8);
    g.fillStyle = '#00000018'; g.fillRect(0, H - 18, W, 18); g.fillStyle = th.trim; g.fillRect(0, H - 14, W, 14);
  });
}
export function floorTex(key) {
  if (floorTexCache[key]) return floorTexCache[key];
  const th = THEMES[key];
  const t = floorTexCache[key] = canvasTex(128, 128, (g, W) => {
    const [a, b] = th.floor;
    if (th.pattern === 'check') { g.fillStyle = a; g.fillRect(0, 0, W, W); g.fillStyle = b; g.fillRect(0, 0, W / 2, W / 2); g.fillRect(W / 2, W / 2, W / 2, W / 2); }
    else if (th.pattern === 'marble') { g.fillStyle = a; g.fillRect(0, 0, W, W); g.strokeStyle = b; g.lineWidth = 3; g.strokeRect(0, 0, W, W); g.strokeStyle = '#d8c6a8'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(10, 90); g.bezierCurveTo(40, 60, 70, 100, 118, 40); g.stroke(); }
    else { g.fillStyle = a; g.fillRect(0, 0, W, W); g.fillStyle = b; for (let i = 0; i < 40; i++) g.fillRect((i * 53) % W, (i * 31) % W, 3, 3); g.strokeStyle = b; g.lineWidth = 2; g.strokeRect(0, 0, W, W); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 2.4);
  return t;
}
// 其他樓層（上面兩層、下面一層）：畫成一張圖，便宜又熱鬧
export function storyTex(key, v = 0) {
  const k = key + v; if (storyTexCache[k]) return storyTexCache[k];
  const th = THEMES[key];
  return storyTexCache[k] = canvasTex(512, 270, (g, W, H) => {
    g.fillStyle = th.tint; g.fillRect(0, 0, W, H);
    for (const wx of [30, 290]) {
      const gr = g.createLinearGradient(0, 30, 0, 140); gr.addColorStop(0, '#8fd0ff'); gr.addColorStop(1, '#e2f4ff');
      g.fillStyle = gr; g.fillRect(wx, 30, 190, 110); g.fillStyle = '#fff'; g.fillRect(wx + 92, 30, 6, 110);
    }
    g.fillStyle = th.trim + '55'; g.fillRect(0, 150, W, 6);
    // 桌子、螢幕、盆栽、人影
    const desks = v ? [60, 300] : [150, 380];
    for (const dx of desks) {
      g.fillStyle = '#c9915b'; roundRect(g, dx, 192, 120, 12, 4); g.fill(); g.fillStyle = '#e9e2d4'; g.fillRect(dx + 8, 204, 8, 50); g.fillRect(dx + 104, 204, 8, 50);
      g.fillStyle = '#2c3e57'; roundRect(g, dx + 20, 150, 50, 36, 4); g.fill(); g.fillStyle = '#9be7ff'; g.fillRect(dx + 24, 154, 42, 28);
      // 人（圓頭＋身體，坐著）
      const hue = ['#ff7a45', '#3fa7ff', '#b46bff', '#36c35d'][(dx / 10 + v) % 4 | 0];
      g.fillStyle = hue; roundRect(g, dx + 76, 160, 34, 40, 12); g.fill(); g.fillStyle = '#ffd9b8'; g.beginPath(); g.arc(dx + 93, 146, 15, 0, 7); g.fill();
      g.fillStyle = '#3a2a20'; g.beginPath(); g.arc(dx + 93, 140, 15, Math.PI, 0); g.fill();
    }
    g.fillStyle = '#ff8a5c'; g.fillRect(v ? 470 : 20, 215, 26, 38); g.fillStyle = '#47b35a'; g.beginPath(); g.arc(v ? 483 : 33, 205, 22, 0, 7); g.fill();
    g.fillStyle = '#00000014'; g.fillRect(0, H - 14, W, 14);
  });
}
