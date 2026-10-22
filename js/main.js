// 上班啟示錄：打卡衝衝衝 —— 小葵自動往右跑，跳、滑壘閃障礙。撞到一次 Kevin 會追上來，追的時候再撞就被抓走
import * as THREE from 'three';
import { scene, render, updateCamera, cam, viewWidth, labelSprite, V } from './world.js?v=0.1.0';
import { loadKind, makeActor, addJog, updateActor } from './assets.js?v=0.1.0';
import * as fx from './fx.js?v=0.1.0';
import { L, resetLevel, updateLevel, animateLevel, zoneAt, floorName, ZONE_LEN, ZONES } from './level.js?v=0.1.0';
import { hoverboard } from './props.js?v=0.1.0';
import { music, musicStart, musicStop, musicTick } from './music.js?v=0.1.0';

const VERSION = '0.1.0';
document.getElementById('ver').textContent = 'v' + VERSION;

// ---------- 數值（調手感只改這裡） ----------
export const CFG = {
  v0: 5.4, vMax: 8.6, ramp: 1400,   // 起跑速度、最高速度、大約跑多遠接近最高速
  scale: 1.2,                       // 小葵身高
  jumpV: 9.0, dblV: 8.0,            // 起跳、二段跳速度
  gUp: 23, gCut: 34, gDown: 32,     // 按住上升、放開上升、下落的重力
  slideMin: 0.5, slideMax: 1.0,     // 滑壘最短、按住最長
  stumble: 0.8, invuln: 1.4,        // 撞到後減速多久、無敵多久
  kevinTime: 9,                     // Kevin 追幾秒才放棄
  dash: 3.2, dashMul: 1.45,         // 咖啡衝刺
};
const BEST_KEY = 'office-sidescroller-best', SOUND_KEY = 'office-sidescroller-sound';
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };

// ---------- 角色 ----------
const K = {};
const NPC_DEFS = { mi: 'mi_walk', jie: 'jie_walk', vivi: 'vivi_walk', m: 'npc_m_walk', f: 'npc_f_walk' };
async function loadAll() {
  const [kw, kj, kev, ...rest] = await Promise.all([
    loadKind('models/kui_walk2.glb'), loadKind('models/kui_jog.glb', 7), loadKind('models/kevin_walk.glb'),
    ...Object.values(NPC_DEFS).map(n => loadKind(`models/${n}.glb`)),
  ]);
  K.kui = kw; K.kuiJog = kj; K.kevin = kev; Object.keys(NPC_DEFS).forEach((k, i) => K[k] = rest[i]);
}

// 小葵：pivot 在身體中間，翻滾、滑壘都繞這裡轉
const P = { x: 0, y: 0, vy: 0, ground: true, jumps: 0, holdJ: false, holdS: false, slide: 0, slideHeld: 0, wantSlide: false, flip: 0,
  stumble: 0, invuln: 0, dash: 0, shield: false, speed: 0, alive: true, tilt: 0 };
let kui, pivot, shieldRing;
const PIV_Y = 0.55;
// Kevin：站在 AI 平衡車上（張開手臂平衡），追的時候在小葵後面
const KV = { on: false, t: 0, gap: 30, actor: null, g: null, bubble: null, leaving: false };
// 背景的同事們（走來走去，名角色經過會說話）
const npcs = [];

function buildCast() {
  kui = addJog(makeActor(K.kui, CFG.scale), K.kuiJog); kui.forceJog = 1;
  kui.root.rotation.y = Math.PI / 2; kui.root.position.y = -PIV_Y;
  pivot = new THREE.Group(); pivot.add(kui.root); scene.add(pivot);
  shieldRing = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.04, 8, 40), new THREE.MeshBasicMaterial({ color: 0x7fd1ff, transparent: true, opacity: 0.8, toneMapped: false }));
  shieldRing.position.y = 0.05; shieldRing.visible = false; pivot.add(shieldRing);

  KV.g = new THREE.Group(); scene.add(KV.g);
  KV.actor = makeActor(K.kevin, CFG.scale * 1.05); KV.actor.root.rotation.y = Math.PI / 2; KV.actor.root.position.y = 0.24;
  KV.g.add(KV.actor.root); KV.g.add(hoverboard());
  KV.bubble = labelSprite('這個用 AI 就好了！', { bg: '#e0413b', size: 0.34 }); KV.bubble.position.set(0.9, 1.95, 0); KV.g.add(KV.bubble);
  KV.g.visible = false;

  // 同事：每種一個，輪流出場
  for (const k of ['m', 'f', 'm', 'f', 'mi', 'jie', 'vivi']) {
    const a = makeActor(K[k], CFG.scale * (k === 'vivi' ? 1.02 : 0.98)); a.root.visible = false; scene.add(a.root);
    npcs.push({ k, a, x: 0, dir: 1, sp: 1, on: false, bubble: null, said: false });
  }
}

// 名角色的台詞：在自己的區出場
const CAMEO = {
  lobby: { k: 'mi', line: '小葵早安！衝啊☕', dir: 1, at: 70 },
  office: { k: 'jie', line: '我先下班囉～', dir: -1, at: 90 },
  pantry: { k: 'f', line: '咖啡機又壞了…', dir: 1, at: 80 },
  boss: { k: 'vivi', line: '辛苦了！加油！（沒有加薪）', dir: 1, at: 70 },
};
function spawnNpc(kind, x, dir, line) {
  const n = npcs.find(n => !n.on && n.k === kind); if (!n) return;
  n.on = true; n.x = x; n.dir = dir; n.sp = 0.9 + Math.random() * 0.35; n.said = false;
  n.a.root.visible = true; n.a.root.position.set(x, 0, -1.05); n.a.root.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  if (n.bubble) { n.a.root.remove(n.bubble); n.bubble.material.map.dispose(); n.bubble.material.dispose(); n.bubble = null; }
  if (line) {
    n.bubble = labelSprite(line, { bg: kind === 'vivi' ? '#d9a63a' : kind === 'jie' ? '#b46bff' : '#ff7a45', size: 0.28 });
    n.bubble.position.set(0, 1.5, 0); n.bubble.visible = false; n.a.root.add(n.bubble);
    n.bubble.scale.multiplyScalar(1 / n.a.root.scale.x);
  }
}

// ---------- 狀態 ----------
const S = { mode: 'load', t: 0, bills: 0, zone: 0, best: 0, nextNpc: 0, cameo: -1, overT: 0, seed: 1 };
S.best = +(store.get(BEST_KEY) || 0) || 0;
music.on = store.get(SOUND_KEY) !== '0';

function newRun() {
  S.seed = (S.seed * 7919 + Date.now()) % 2147483646 + 1;
  resetLevel(S.seed);
  Object.assign(P, { x: 0, y: 0, vy: 0, ground: true, jumps: 0, holdJ: false, holdS: false, slide: 0, slideHeld: 0, wantSlide: false, flip: 0, stumble: 0, invuln: 0, dash: 0, shield: false, speed: 0, alive: true, tilt: 0 });
  Object.assign(KV, { on: false, t: 0, gap: 30, leaving: false }); KV.g.visible = false;
  S.bills = 0; S.zone = 0; S.t = 0; S.nextNpc = 8; S.cameo = -1;
  npcs.forEach(n => { n.on = false; n.a.root.visible = false; });
  pivot.rotation.z = 0; kui.speed = 0; camShift = 0;
  updateLevel(0, CFG.v0, 0);
  updateCamera(camFocus(), 0, true);
  hud(true);
}

// ---------- 操作 ----------
function jumpDown() {
  if (S.mode !== 'run') return;
  P.holdJ = true;
  if (P.ground || P.coyote > 0) {
    P.vy = CFG.jumpV; P.ground = false; P.jumps = 1; P.coyote = 0; endSlide(true); fx.sfx.jump();
  } else if (P.jumps < 2) {
    P.vy = CFG.dblV; P.jumps = 2; P.flip = 1; P.wantSlide = false; fx.sfx.jump2();
    fx.sparkle(V(P.x, P.y + 0.2, 0.3), 0xffffff, 0.5);
  }
}
function jumpUp() { P.holdJ = false; }
function slideDown() {
  if (S.mode !== 'run') return;
  P.holdS = true;
  if (P.ground) startSlide();
  else { P.vy = Math.min(P.vy, -13); P.wantSlide = true; }   // 空中按：快速落地接滑壘
}
function slideUp() { P.holdS = false; }
function startSlide() { if (P.slide <= 0) fx.sfx.slide(); P.slide = CFG.slideMin; P.slideHeld = 0; P.wantSlide = false; }
function endSlide(force) { if (force) P.slide = 0; }

const keys = { Space: 'j', ArrowUp: 'j', KeyW: 'j', ArrowDown: 's', KeyS: 's' };
addEventListener('keydown', e => {
  document.body.classList.add('kb');
  if (e.code === 'KeyP' || e.code === 'Escape') { togglePause(); return; }
  if ((e.code === 'Space' || e.code === 'Enter') && S.mode !== 'run' && S.mode !== 'pause' && S.mode !== 'load' && S.mode !== 'caught') { e.preventDefault(); startGame(); return; }
  const k = keys[e.code]; if (!k) return; e.preventDefault(); if (e.repeat) return;
  fx.audioInit();
  if (k === 'j') jumpDown(); else slideDown();
});
addEventListener('keyup', e => { const k = keys[e.code]; if (k === 'j') jumpUp(); else if (k === 's') slideUp(); });

// 觸控：左半邊滑壘、右半邊跳；同一根手指放開才算放開
const touches = new Map();
const keyL = document.getElementById('keyL'), keyR = document.getElementById('keyR');
function padDown(side, id) {
  touches.set(id, side); fx.audioInit();
  if (side === 'R') { jumpDown(); keyR.classList.add('on'); } else { slideDown(); keyL.classList.add('on'); }
}
function padUp(id) {
  const side = touches.get(id); if (!side) return; touches.delete(id);
  if (![...touches.values()].includes(side)) {
    if (side === 'R') { jumpUp(); keyR.classList.remove('on'); } else { slideUp(); keyL.classList.remove('on'); }
  }
}
for (const [el, side] of [[document.getElementById('padL'), 'L'], [document.getElementById('padR'), 'R']]) {
  el.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') document.body.classList.remove('kb'); e.preventDefault(); padDown(side, e.pointerId); });
}
addEventListener('pointerup', e => padUp(e.pointerId));
addEventListener('pointercancel', e => padUp(e.pointerId));
// 擋放大、選取、長按選單
for (const ev of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick', 'contextmenu', 'selectstart', 'dragstart']) document.addEventListener(ev, e => e.preventDefault(), { passive: false });
addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && ['=', '+', '-', '0'].includes(e.key)) e.preventDefault(); });
let lastTouchEnd = 0;
document.addEventListener('touchend', e => { const n = Date.now(); if (n - lastTouchEnd < 350) e.preventDefault(); lastTouchEnd = n; }, { passive: false });
document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });

// ---------- 畫面 ----------
const $ = (id) => document.getElementById(id);
const screens = { title: $('sTitle'), pause: $('sPause'), over: $('sOver') };
function show(name) { for (const [k, el] of Object.entries(screens)) el.classList.toggle('on', k === name); }
$('bStart').onclick = () => startGame();
$('bAgain').onclick = () => startGame();
$('bResume').onclick = () => togglePause();
$('bQuit').onclick = () => toTitle();
$('bHome').onclick = () => toTitle();
$('bPause').onclick = () => togglePause();
$('bSound').onclick = () => { music.on = !music.on; store.set(SOUND_KEY, music.on ? '1' : '0'); soundIcon(); fx.audioInit(); if (music.on && S.mode === 'run') musicStart(); };
function soundIcon() { $('bSound').textContent = music.on ? '🔊' : '🔇'; fxMute(); }
function fxMute() { const A = fx.getAC(); if (A) A.master.gain.value = music.on ? 0.16 : 0; }
soundIcon();

function startGame() {
  fx.audioInit(); fxMute();
  newRun(); S.mode = 'run'; show(null);
  fx.banner('08:59 快遲到了！', '1F 大廳 → 一路衝上樓打卡', 0, '#ff7a45');
  if (music.on) musicStart();
}
function toTitle() { S.mode = 'title'; show('title'); musicStop(); $('bestTitle').textContent = `最佳紀錄 ${S.best} m`; newRun(); S.mode = 'title'; }
function togglePause() {
  if (S.mode === 'run') { S.mode = 'pause'; show('pause'); musicStop(); }
  else if (S.mode === 'pause') { S.mode = 'run'; show(null); if (music.on) musicStart(); }
}
addEventListener('visibilitychange', () => { if (document.hidden && S.mode === 'run' && !G.hold) togglePause(); });   // 測試時（G.hold）不自動暫停

let lastHud = {};
function hud(force) {
  const d = Math.floor(P.x);
  if (force || lastHud.d !== d) { $('dist').textContent = d; lastHud.d = d; }
  if (force || lastHud.b !== S.bills) { $('billN').textContent = S.bills; if (!force) { $('bills').classList.remove('bump'); void $('bills').offsetWidth; $('bills').classList.add('bump'); } lastHud.b = S.bills; }
  if (force || lastHud.best !== S.best) { $('bestHud').textContent = S.best; lastHud.best = S.best; }
  const pw = (P.dash > 0 ? `<span class="dash">☕ 衝刺 ${P.dash.toFixed(1)}</span>` : '') + (P.shield ? '<span>🪪 員工證</span>' : '');
  if (force || lastHud.pw !== pw) { $('powers').innerHTML = pw; lastHud.pw = pw; }
  const w = KV.on && !KV.leaving && S.mode === 'run';
  $('warn').classList.toggle('on', w);
  if (w) $('warnBar').style.width = (KV.t / CFG.kevinTime * 100) + '%';
}

// ---------- 遊戲邏輯 ----------
function baseSpeed(x) { return CFG.v0 + (CFG.vMax - CFG.v0) * (1 - Math.exp(-x / CFG.ramp)); }
const difficulty = (x) => Math.min(1, x / 1400);
const pH = () => P.slide > 0 ? 0.5 : 1.02;   // 碰撞框高度

// 腳下的地面：地板 0 或辦公桌桌面（要從上面落下來才算）
function groundAt(x, feet) {
  let g = 0;
  for (const o of L.obst) if (o.platform && !o.hit && Math.abs(x - o.x) < o.w / 2 + 0.4 && feet >= o.y0 + o.h - 0.2) g = Math.max(g, o.y0 + o.h);
  return g;
}

function hitObstacle(o) {
  if (P.dash > 0 || P.invuln > 0 && o.platform) {   // 衝刺中直接撞飛
    if (o.platform) return;
    o.hit = true; o.fly = { vx: 7, vy: 6 + Math.random() * 2, r: -8 }; fx.sfx.stomp(); fx.camKick(0.5);
    fx.confetti(V(o.x, 0.6, 0), 20, 0.6); gain(1, V(o.x, 1.2, 0)); return;
  }
  if (P.invuln > 0) return;
  if (P.shield) {
    P.shield = false; P.invuln = 1; o.hit = true; o.fly = { vx: 6, vy: 6, r: -7 };
    fx.sfx.shield(); fx.toast('🪪 員工證擋下來了！'); fx.shockwave(V(P.x, 0, 0), 0x7fd1ff, 3); return;
  }
  // 真的撞到
  o.hit = true;
  if (!o.platform) o.fly = { vx: 3.5, vy: 4, r: -5 };
  else { P.y = o.y0 + o.h; P.vy = 3; P.ground = false; }   // 撞到桌子側面：被彈上桌
  P.stumble = CFG.stumble; P.invuln = CFG.invuln; P.slide = 0;
  fx.sfx.hit(); cam.shake = 0.35; fx.camKick(0.8);
  fx.floatText(V(P.x, P.y + 1.6, 0.3), { spill: '滑倒了！', paper: '絆到紙堆！', boxes: '撞到紙箱！', chair: '被椅子撞！', bot: '被 AI 撞到！', drone: '撞到無人機！', banner: '被布條打臉！', desk: '撞到桌子！' }[o.kind] || '痛！', '#e0413b', 1.1);
  if (KV.on && !KV.leaving) caught();
  else kevinCome();
}

function kevinCome() {
  KV.on = true; KV.leaving = false; KV.t = CFG.kevinTime; KV.gap = Math.max(KV.gap, viewWidth() * 0.3 + 2);
  KV.g.visible = true; KV.bubble.visible = true; fx.sfx.alarm(); fx.toast('🛹 Kevin 追來了！');
}

function caught() {
  S.mode = 'caught'; S.overT = 1.6; P.alive = false; fx.sfx.caught(); musicStop();
  KV.bubble.visible = true; kui.speed = 0;
}

function gain(n, pos) { S.bills += n; if (pos && n > 1) fx.floatText(pos, '+' + n, '#36c35d', 0.9); }

function gameOver() {
  S.mode = 'over';
  const d = Math.floor(P.x), isNew = d > S.best;
  if (isNew) { S.best = d; store.set(BEST_KEY, String(d)); }
  $('oDist').textContent = d; $('oBills').textContent = S.bills;
  $('oFloor').textContent = floorName(zoneAt(P.x)).split(' ')[0];
  $('oNew').classList.toggle('on', isNew);
  $('oBest').textContent = isNew ? '' : `最佳紀錄 ${S.best} m`;
  show('over'); hud(true);
}

function step(dt) {
  S.t += dt;
  const t = S.t;
  if (S.mode === 'run') runStep(dt);
  else if (S.mode === 'caught') {
    S.overT -= dt;
    KV.gap = Math.max(0.75, KV.gap - dt * 6);
    pivot.rotation.z += (0.35 - pivot.rotation.z) * Math.min(1, dt * 6);   // 小葵被抓：往後仰
    if (S.overT <= 0) gameOver();
  } else if (S.mode === 'title') {
    // 封面：小葵原地慢跑當背景
    kui.speed = 0;
  }
  // Kevin 跟在後面
  if (KV.g.visible) {
    KV.y = (KV.y || 0) + (groundAt(P.x - KV.gap, 9) - (KV.y || 0)) * Math.min(1, dt * 10);   // 平衡車會飛上桌面，不穿過桌子
    KV.g.position.set(P.x - KV.gap, KV.y + Math.sin(t * 5) * 0.04, 0.15);
    KV.g.rotation.z = -0.12 + Math.sin(t * 3) * 0.04;
    KV.bubble.material.rotation = Math.sin(t * 6) * 0.04;
    updateActor(KV.actor, dt, t);
  }
  // 小葵
  pivot.position.set(P.x, P.y + PIV_Y - (P.slide > 0 ? 0.25 : 0), 0);
  kui.animMul = P.slide > 0 ? 0.04 : !P.ground && S.mode === 'run' ? 0.45 : 1;   // 空中腳慢慢划、滑壘時幾乎停住
  updateActor(kui, dt, t);
  // 同事
  for (const n of npcs) if (n.on) {
    n.x += n.dir * n.sp * dt; n.a.root.position.x = n.x; n.a.speed = n.sp; updateActor(n.a, dt, t);
    if (n.bubble) { const near = Math.abs(n.x - P.x - 1.5) < 4.5; n.bubble.visible = near; if (near && !n.said) { n.said = true; fx.sfx.ring(); } }
    if (n.x < P.x - 16 || n.x > P.x + 40) { n.on = false; n.a.root.visible = false; }
  }
  animateLevel(dt, t, P.x);
  fx.updateFx(dt);
  updateCamera(camFocus(dt), dt);
  shieldRing.visible = P.shield; if (P.shield) { shieldRing.rotation.y += dt * 3; shieldRing.rotation.x = Math.sin(t * 2) * 0.4; }
  kui.root.visible = !(P.invuln > 0 && S.mode === 'run' && Math.sin(t * 40) > 0.3);
  if (S.mode === 'run') hud();
  musicTick(1 + (P.dash > 0 ? 0.12 : 0));
}

// 小葵在畫面左邊 26%；Kevin 追來時往右挪，讓後面的 Kevin 看得到
let camShift = 0;
function camFocus(dt = 0) {
  const w = viewWidth(), want = KV.g && KV.g.visible && !KV.leaving ? Math.max(0, (2.8 - 0.24 * w) / w) : 0;
  camShift += (want - camShift) * Math.min(1, dt * 2);
  return V(P.x + w * (0.24 - camShift), 1.9 + Math.max(0, P.y - 0.9) * 0.35, 0);
}

function runStep(dt) {
  // 速度
  P.stumble = Math.max(0, P.stumble - dt); P.invuln = Math.max(0, P.invuln - dt);
  if (P.dash > 0) { P.dash -= dt; if (P.dash <= 0) { P.dash = 0; P.invuln = Math.max(P.invuln, 0.6); } }
  const target = baseSpeed(P.x) * (P.dash > 0 ? CFG.dashMul : 1) * (P.stumble > 0 ? 0.5 + 0.5 * (1 - P.stumble / CFG.stumble) : 1);
  P.speed += (target - P.speed) * Math.min(1, dt * (P.speed < 1 ? 20 : 4));
  P.x += P.speed * dt;
  kui.speed = P.speed;

  // 上下
  const g = P.vy > 0 ? (P.holdJ ? CFG.gUp : CFG.gCut) : CFG.gDown;
  P.vy -= g * dt; P.y += P.vy * dt;
  const ground = groundAt(P.x, P.y - P.vy * dt);
  if (P.y <= ground && P.vy <= 0) {
    if (!P.ground) { // 落地
      P.ground = true; P.jumps = 0; P.flip = 0;
      if (P.wantSlide || P.holdS) startSlide();
      fx.puff(V(P.x - 0.2, ground + 0.05, 0.2), 0xffffff);
    }
    P.y = ground; P.vy = 0; P.coyote = 0.1;
  } else if (P.y > ground + 0.02) {
    if (P.ground) { P.ground = false; P.jumps = 1; P.coyote = 0.1; }   // 走出桌子邊
    P.coyote = Math.max(0, (P.coyote || 0) - dt);
  }

  // 滑壘：按住可以久一點；頭上有東西就繼續滑
  if (P.slide > 0) {
    P.slideHeld += dt;
    const keep = P.holdS && P.slideHeld < CFG.slideMax;
    if (!keep) P.slide -= dt;
    if (P.slide <= 0 && overhead()) P.slide = 0.05;
    if (Math.random() < dt * 14) fx.puff(V(P.x + 0.3, 0.05, 0.25), 0xf2e6d8);
  }

  // 姿勢：起跳前傾、二段跳翻一圈、滑壘往後躺
  let tz = 0;
  if (P.slide > 0) tz = 1.25;
  else if (!P.ground) tz = P.vy > 0 ? -0.18 : 0.08;
  else if (P.stumble > 0) tz = -0.45 * (P.stumble / CFG.stumble);
  if (P.flip > 0) { P.flip = Math.max(0, P.flip - dt * 2.4); pivot.rotation.z = -Math.PI * 2 * (1 - P.flip) + tz * (1 - P.flip); if (P.flip === 0) pivot.rotation.z = tz; }
  else pivot.rotation.z += (tz - pivot.rotation.z) * Math.min(1, dt * 14);
  P.tilt = pivot.rotation.z;

  // 碰撞
  const x0 = P.x - 0.22, x1 = P.x + 0.22, y0 = P.y, y1 = P.y + pH();
  for (const o of L.obst) {
    if (o.hit || o.x + o.w / 2 < x0 - 0.5 || o.x - o.w / 2 > x1 + 0.5) continue;
    const ox0 = o.x - o.w / 2 + 0.05, ox1 = o.x + o.w / 2 - 0.05, oy0 = o.y0, oy1 = o.y0 + o.h - 0.04;
    if (x1 < ox0 || x0 > ox1 || y1 < oy0 || y0 > oy1) continue;
    if (o.platform) {   // 桌子：腳已經快到桌面就順勢踩上去，只有貼地撞到側面才算撞
      if (y0 >= oy1 - 0.5) { if (P.vy <= 0) { P.y = o.y0 + o.h; P.vy = 0; } }
      else hitObstacle(o);
      continue;
    }
    if (o.low && y0 > 0.1) continue;
    if (o.stomp && P.vy < 0 && y0 > o.y0 + o.h * 0.45) {   // 踩扁 AI 機器人
      o.hit = true; o.squash = true; o.g.scale.set(1.3, 0.25, 1.3); P.vy = 8; P.jumps = 1;
      fx.sfx.stomp(); fx.confetti(V(o.x, 0.4, 0), 16, 0.5); gain(3, V(o.x, 1.2, 0.3)); fx.floatText(V(o.x, 1.6, 0.3), '踩扁 AI！', '#3fa7ff', 1);
      continue;
    }
    hitObstacle(o);
    if (S.mode !== 'run') return;
  }

  // 撿東西（衝刺時有磁鐵）
  const cx = P.x, cy = P.y + (P.slide > 0 ? 0.25 : 0.55);
  for (const it of L.items) {
    if (it.taken) continue;
    let dx = it.x - cx, dy = it.y - cy;
    if (P.dash > 0 && Math.abs(dx) < 3 && Math.abs(dy) < 2.5 && it.type === 'bill') { it.x -= dx * Math.min(1, dt * 10); it.y -= dy * Math.min(1, dt * 10); it.g.position.x = it.x; dx = it.x - cx; dy = it.y - cy; }
    if (Math.abs(dx) < 0.45 && Math.abs(dy) < (P.slide > 0 ? 0.45 : 0.75)) {
      it.taken = true;
      if (it.type === 'bill') { gain(1); fx.sfx.pick(); }
      else if (it.type === 'coffee') { P.dash = CFG.dash; P.invuln = 0; fx.sfx.power(); fx.banner('☕ 咖啡衝刺！', '無敵 3 秒，撞飛一切', 0, '#d9773b'); fx.pillar(V(P.x, 0, 0), 0xffc078, 0.8, 4); }
      else { P.shield = true; fx.sfx.shield(); fx.toast('🪪 拿到員工證：可以擋一次'); }
    }
  }
  if (P.dash > 0 && Math.random() < dt * 20) fx.sparkle(V(P.x - 0.3 + Math.random() * 0.3, P.y + 0.3 + Math.random() * 0.8, 0.3), 0xffc078, 0.3);

  // Kevin
  if (KV.on) {
    if (!KV.leaving) {
      KV.t -= dt;
      const want = 1.5 + (P.stumble > 0 ? -0.3 : 0.4);
      KV.gap += (want - KV.gap) * Math.min(1, dt * 1.5);
      if (KV.t <= 0) { KV.leaving = true; fx.toast('Kevin：「可惡…我先去開會」'); KV.bubble.visible = false; }
    } else {
      KV.gap += dt * 7;
      if (KV.gap > viewWidth()) { KV.on = false; KV.g.visible = false; }
    }
  }

  // 打卡鐘、換區
  for (const c of L.clocks) if (!c.done && P.x > c.x) {
    c.done = true; fx.sfx.promote(); fx.confetti(V(c.x, 2, -1), 80, 1); gain(20, V(c.x, 2.6, 0));
    fx.banner('打卡成功！', '打卡獎金 +20', 3, '#36c35d');
  }
  const z = zoneAt(P.x);
  if (z !== S.zone) { S.zone = z; fx.banner(floorName(z), z >= 4 ? '越跑越快了！' : '', 0, ['#ff7a45', '#3fa7ff', '#36c35d', '#d9a63a'][z % 4]); }

  // 同事出場
  if (P.x > S.nextNpc) {
    S.nextNpc = P.x + 9 + Math.random() * 10;
    const dir = Math.random() < 0.5 ? 1 : -1;
    spawnNpc(Math.random() < 0.5 ? 'm' : 'f', P.x + viewWidth() * 0.8 + 2 + Math.random() * 4, dir);
  }
  const zKey = ZONES[z % 4], cm = CAMEO[zKey];
  if (S.cameo !== z && P.x > z * ZONE_LEN + cm.at - 14) {
    S.cameo = z; spawnNpc(cm.k, z * ZONE_LEN + cm.at, cm.dir, cm.line);
  }

  updateLevel(P.x, P.speed, difficulty(P.x));
}

// 頭上有沒有東西（滑壘中不能站起來）
function overhead() {
  for (const o of L.obst) if (!o.hit && !o.platform && o.y0 > 0.3 && Math.abs(o.x - P.x) < o.w / 2 + 0.3 && o.y0 < 1.05) return true;
  return false;
}

// ---------- 主迴圈 ----------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (S.mode === 'load') return;
  if (S.mode !== 'pause' && !G.hold) step(dt);
  if (G.bot && S.mode === 'run') bot();
  render();
}

// ---------- 測試用 ----------
// 自動玩：看前面最近的障礙，該跳就跳、該滑就滑
function bot() {
  let near = null, nd = 99;
  for (const o of L.obst) {
    if (o.hit) continue;
    const d = o.x - o.w / 2 - (P.x + 0.22) + (o.vx ? o.vx * 0.25 : 0);
    if (d > -0.2 && d < nd) { nd = d; near = o; }
  }
  if (!near) { if (P.holdJ) jumpUp(); return; }
  const over = !near.platform && near.y0 > 0.3;
  const lead = P.speed * (over ? 0.16 : 0.14) + 0.15;
  if (over) {
    if (nd < lead && P.ground && P.slide <= 0) { slideDown(); }
    if (P.holdS && nd < -0.1) slideUp();
  } else {
    if (P.holdS) slideUp();
    if (nd < lead && (P.ground || P.jumps < 2 && P.y < near.y0 + near.h && P.vy < 0)) jumpDown();
    if (P.holdJ && (P.vy < 0 || P.y > near.y0 + near.h + 0.6)) jumpUp();
  }
}
const G = window.G = {
  S, P, L, KV, CFG, bot: /[?&]bot/.test(location.search), hold: false,
  step(dt = 1 / 60, n = 1) { for (let i = 0; i < n; i++) { step(dt); if (G.bot && S.mode === 'run') bot(); } render(); return { x: P.x | 0, mode: S.mode, bills: S.bills }; },
  start: startGame, jump: jumpDown, jumpUp, slide: slideDown, slideUp, kevinCome, caught, newRun,
};

// ---------- 開始 ----------
(async () => {
  try { await loadAll(); }
  catch (e) { $('loading').textContent = '載入失敗，請重新整理'; console.error(e); return; }
  buildCast();
  newRun();
  $('loading').remove();
  $('bestTitle').textContent = `最佳紀錄 ${S.best} m`;
  if (!matchMedia('(pointer: coarse)').matches) document.body.classList.add('kb');
  if (/[?&#]play/.test(location.href)) startGame(); else { S.mode = 'title'; show('title'); }
  requestAnimationFrame(frame);
})();
