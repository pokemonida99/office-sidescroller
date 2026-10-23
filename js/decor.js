// 外觀：採購部攤位、辦公室裝潢、小葵的推車、VIP 配件、尾牙舞台、生日蛋糕
import * as THREE from 'three';
import { rbox, box, cyl, sphere, mat, canvasTex, labelSprite, FONT, V } from './world.js?v=0.1.1';

const gold = { metalness: 0.9, roughness: 0.3 };
const glow = (c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });

// 採購部：小攤位＋寫字板＋購物車招牌
export function kioskLook() {
  const g = new THREE.Group();
  rbox(1.3, 0.8, 0.6, 0x36c35d, 0, 0.4, 0, g);
  rbox(1.4, 0.07, 0.7, 0xfff4e2, 0, 0.83, 0, g);
  rbox(0.32, 0.42, 0.03, 0x8a6a4c, -0.3, 1.05, 0, g).rotation.x = -0.35;
  box(0.26, 0.32, 0.01, 0xffffff, -0.3, 1.06, 0.03, g).rotation.x = -0.35;
  for (let i = 0; i < 3; i++) box(0.18, 0.02, 0.012, 0x9aa8b8, -0.3, 1.14 - i * 0.07, 0.05 - i * 0.022, g).rotation.x = -0.35;
  [0xff5d73, 0xffb42e, 0x3fa7ff].forEach((c, i) => rbox(0.2, 0.2, 0.2, c, 0.15 + i * 0.22, 0.97, 0, g));
  const s = labelSprite('🛒 採購部', { bg: '#36c35d', size: 0.3 }); s.position.set(0, 1.75, 0); g.add(s);
  return g;
}

// 裝潢：每一樣一個小模型。回傳 { g, tick? }
export const DECOR_LOOKS = {
  sofa() {
    const g = new THREE.Group();
    rbox(1.5, 0.35, 0.65, 0xff7a6b, 0, 0.2, 0, g); rbox(1.5, 0.5, 0.18, 0xff7a6b, 0, 0.45, -0.25, g);
    for (const x of [-0.72, 0.72]) rbox(0.16, 0.4, 0.65, 0xe0665a, x, 0.32, 0, g);
    for (const [x, c] of [[-0.35, 0xfff4e2], [0.35, 0xffd34d]]) rbox(0.34, 0.3, 0.12, c, x, 0.55, -0.12, g);
    return { g };
  },
  massage() {
    const g = new THREE.Group();
    rbox(0.75, 0.45, 0.8, 0x5a3a2a, 0, 0.3, 0, g); rbox(0.75, 0.95, 0.25, 0x5a3a2a, 0, 0.75, -0.32, g);
    for (const x of [-0.42, 0.42]) rbox(0.18, 0.5, 0.75, 0x3a2a20, x, 0.45, 0, g);
    const pad = rbox(0.55, 0.55, 0.08, 0xd9a63a, 0, 0.85, -0.18, g, gold);
    return { g, tick: (dt, t) => { pad.position.y = 0.85 + Math.sin(t * 12) * 0.015; } };   // 按摩中一直抖
  },
  aquarium() {
    const g = new THREE.Group();
    rbox(1.3, 0.5, 0.5, 0x2c3e57, 0, 0.25, 0, g);
    const tank = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.75, 0.46), new THREE.MeshStandardMaterial({ color: 0x7fd1ff, transparent: true, opacity: 0.45, roughness: 0.05 }));
    tank.position.y = 0.88; g.add(tank);
    box(1.2, 0.08, 0.42, 0xf2d7a0, 0, 0.55, 0, g);
    const fish = [];
    for (let i = 0; i < 4; i++) { const f = sphere(0.06, [0xff8a3d, 0xffd34d, 0xff5d73, 0x9be7ff][i], 0, 0.75 + i * 0.1, 0, g); f.scale.set(1.6, 1, 0.6); fish.push(f); }
    return { g, tick: (dt, t) => fish.forEach((f, i) => { f.position.x = Math.sin(t * (0.6 + i * 0.2) + i) * 0.5; f.rotation.y = Math.cos(t * (0.6 + i * 0.2) + i) > 0 ? 0 : Math.PI; }) };
  },
  claw() {
    const g = new THREE.Group();
    rbox(0.8, 0.7, 0.8, 0xff4fa3, 0, 0.35, 0, g);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.75, 0.74), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, roughness: 0.05 }));
    glass.position.y = 1.08; g.add(glass);
    rbox(0.82, 0.18, 0.82, glow(0xffe08a), 0, 1.53, 0, g);
    for (let i = 0; i < 6; i++) sphere(0.1, [0xffd34d, 0x9be7ff, 0xff9ad5, 0x7dff9a][i % 4], (i % 3 - 1) * 0.2, 0.8, ((i / 3) | 0) * 0.2 - 0.1, g);
    const claw = cyl(0.03, 0.03, 0.3, 0xd8dde3, 0, 1.3, 0, g, { metalness: 0.7, roughness: 0.3 });
    return { g, tick: (dt, t) => { claw.position.x = Math.sin(t * 0.8) * 0.2; claw.position.z = Math.cos(t * 0.6) * 0.2; } };
  },
  trophy() {
    const g = new THREE.Group();
    rbox(1.2, 1.4, 0.4, 0x8a6a4c, 0, 0.7, 0, g);
    for (const y of [0.5, 1.0]) box(1.05, 0.04, 0.35, 0x5a3a2a, 0, y, 0.02, g);
    for (const [x, y] of [[-0.3, 0.58], [0.3, 0.58], [0, 1.08]]) { cyl(0.06, 0.04, 0.08, 0xd9a63a, x, y + 0.04, 0.05, g, gold); const c = cyl(0.1, 0.05, 0.14, 0xd9a63a, x, y + 0.15, 0.05, g, gold); c.castShadow = true; }
    return { g };
  },
  piano() {
    const g = new THREE.Group();
    rbox(1.3, 0.75, 0.6, 0x1c1c22, 0, 0.55, 0, g, { roughness: 0.2 });
    box(1.2, 0.04, 0.2, 0xffffff, 0, 0.82, 0.32, g);
    for (let i = 0; i < 8; i++) box(0.05, 0.05, 0.11, 0x111111, -0.5 + i * 0.14, 0.85, 0.28, g);
    for (const x of [-0.55, 0.55]) cyl(0.04, 0.04, 0.3, 0x1c1c22, x, 0.15, 0.2, g);
    return { g };
  },
  catLucky() {   // 招財貓
    const g = new THREE.Group();
    rbox(0.5, 0.2, 0.5, 0xd9483b, 0, 0.1, 0, g);
    sphere(0.22, 0xffffff, 0, 0.42, 0, g).scale.set(1, 1.15, 0.9);
    sphere(0.17, 0xffffff, 0, 0.75, 0, g);
    for (const x of [-0.1, 0.1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 4), mat(0xffffff)); e.position.set(x, 0.92, 0); g.add(e); }
    const paw = sphere(0.06, 0xffffff, 0.2, 0.75, 0.05, g);
    sphere(0.06, 0xd9a63a, 0, 0.55, 0.19, g, gold);
    return { g, tick: (dt, t) => { paw.position.y = 0.75 + Math.sin(t * 5) * 0.06; } };
  },
  plants() {   // 植栽牆
    const g = new THREE.Group();
    rbox(1.4, 1.6, 0.15, 0x8a6a4c, 0, 0.8, 0, g);
    for (let i = 0; i < 14; i++) { const l = sphere(0.16, [0x47b35a, 0x5fc96d, 0x3a9a4a][i % 3], -0.55 + (i % 5) * 0.27, 0.3 + ((i / 5) | 0) * 0.45, 0.1, g, { roughness: 0.9 }); l.scale.set(1.2, 1, 0.6); }
    for (let i = 0; i < 5; i++) sphere(0.05, [0xff6b8b, 0xffd34d, 0xffffff][i % 3], -0.5 + i * 0.25, 0.55 + (i % 2) * 0.5, 0.18, g);
    return { g };
  },
};

// 小葵的推車：跟在後面，貨疊在推車上
export function cartLook(lv) {
  const g = new THREE.Group();
  const col = [0x3fa7ff, 0xff7a45, 0xd9a63a][lv - 1] ?? 0x3fa7ff;
  rbox(0.46, 0.08, 0.38, col, 0, 0.3, 0, g, lv >= 3 ? gold : undefined);
  for (const x of [-0.24, 0.24]) box(0.03, 0.14, 0.38, col, x, 0.38, 0, g);
  box(0.46, 0.14, 0.03, col, 0, 0.38, -0.19, g);
  for (const [x, z] of [[-0.18, -0.12], [0.18, -0.12], [-0.18, 0.12], [0.18, 0.12]]) { const w = cyl(0.07, 0.07, 0.04, 0x2c3e57, x, 0.1, z, g); w.rotation.z = Math.PI / 2; }
  for (const x of [-0.18, 0.18]) cyl(0.015, 0.015, 0.36, 0x9aa3ad, x, 0.36, 0.2, g, { metalness: 0.6, roughness: 0.3 }).rotation.x = 0.9;
  return g;
}

// VIP：墨鏡＋金色名牌
export function vipGear(root) {
  const glasses = rbox(0.34, 0.07, 0.04, 0x111111, 0, 0.74, 0.2, root, { roughness: 0.2 });
  const tag = labelSprite('👑 VIP', { bg: '#d9a63a', size: 0.36, glow: true }); tag.position.y = 1.7; root.add(tag);
  return [glasses, tag];
}

// 尾牙舞台：紅地毯舞台、布條、燈
export function stageLook(year) {
  const g = new THREE.Group();
  rbox(4.2, 0.25, 1.6, 0xd9483b, 0, 0.125, 0, g);
  rbox(4.3, 0.06, 1.7, 0xd9a63a, 0, 0.26, 0, g, gold);
  for (const x of [-2.0, 2.0]) cyl(0.06, 0.06, 2.6, 0xd9a63a, x, 1.3, -0.7, g, gold);
  const t = canvasTex(1024, 160, (c, W, H) => {
    c.fillStyle = '#d9483b'; c.fillRect(0, 0, W, H); c.strokeStyle = '#ffd34d'; c.lineWidth = 10; c.strokeRect(8, 8, W - 16, H - 16);
    c.fillStyle = '#ffd34d'; c.font = `900 92px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(`🎉 第 ${year} 年度 尾牙 🎉`, W / 2, H / 2 + 4);
  });
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 0.62), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, toneMapped: false }));
  banner.position.set(0, 2.35, -0.7); g.add(banner);
  const lights = [];
  for (let i = 0; i < 12; i++) lights.push(sphere(0.06, glow([0xffe08a, 0xff9ad5, 0x9be7ff][i % 3]), -1.9 + i * 0.345, 2.72, -0.7, g));
  const podium = rbox(0.6, 0.9, 0.45, 0x8a6a4c, 1.2, 0.7, -0.2, g);
  return { g, tick: (dt, tt) => lights.forEach((l, i) => { l.visible = Math.sin(tt * 6 + i) > -0.2; }) };
}

// 老闆生日蛋糕
export function cakeLook() {
  const g = new THREE.Group();
  rbox(0.9, 0.5, 0.6, 0xffffff, 0, 0.25, 0, g);
  cyl(0.28, 0.3, 0.2, 0xffb3d9, 0, 0.6, 0, g); cyl(0.2, 0.22, 0.16, 0xfff4e2, 0, 0.78, 0, g);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; sphere(0.04, 0xff3b5c, Math.cos(a) * 0.22, 0.72, Math.sin(a) * 0.22, g); }
  const flames = [];
  for (const x of [-0.08, 0, 0.08]) { cyl(0.012, 0.012, 0.12, 0x9be7ff, x, 0.92, 0, g); flames.push(sphere(0.025, glow(0xffb347), x, 1.0, 0, g)); }
  return { g, tick: (dt, t) => flames.forEach((f, i) => f.scale.setScalar(1 + Math.sin(t * 20 + i) * 0.25)) };
}
