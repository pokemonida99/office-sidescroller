// 程式配樂：輕快的上班跑步小調（WebAudio 合成，音量很小）。每幀呼叫 tick() 往前排 0.3 秒的音
import { getAC } from './fx.js?v=0.1.0';

const BPM = 138, STEP = 60 / BPM / 4;   // 16 分音符
const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
// 四小節和弦 C - Am - F - G，貝斯走根音＋八度，旋律是簡單的上行琶音
const ROOTS = [48, 45, 41, 43];
const CHORDS = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
const MELODY = [   // 每小節 16 格，-1 休息
  [72, -1, 76, -1, 79, -1, 76, 74, 72, -1, 67, -1, 69, -1, 72, -1],
  [72, -1, 69, -1, 76, -1, 74, 72, 69, -1, -1, 67, 69, -1, -1, -1],
  [65, -1, 69, -1, 72, -1, 77, 76, 74, -1, 72, -1, 69, -1, 72, -1],
  [74, -1, 71, -1, 74, -1, 79, -1, 77, 76, 74, -1, 71, -1, 67, -1],
];
export const music = { on: true, playing: false, next: 0, step: 0, gain: null };

function note(ac, out, f, t, dur, type, vol) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02);
}
export function musicStart() {
  const A = getAC(); if (!A || !music.on) return;
  if (!music.gain) { music.gain = A.ac.createGain(); music.gain.gain.value = 0.45; music.gain.connect(A.master); }
  music.playing = true; music.next = A.ac.currentTime + 0.05; music.step = 0;
}
export function musicStop() { music.playing = false; }
export function musicTick(fast = 1) {
  const A = getAC(); if (!A || !music.playing || !music.on) return;
  const { ac } = A, out = music.gain, st = STEP / fast;
  if (music.next < ac.currentTime - 0.2) music.next = ac.currentTime + 0.02;   // 分頁被暫停過就跳過去，不要一次補一堆音
  while (music.next < ac.currentTime + 0.3) {
    const s = music.step % 64, bar = s >> 4, i = s & 15, t = music.next;
    if (i % 4 === 0 || i % 4 === 3 && i === 7) note(ac, out, N(ROOTS[bar] + (i % 8 === 0 ? 0 : 12)), t, st * 2.5, 'triangle', 0.5);
    if (i % 2 === 1) note(ac, out, N(CHORDS[bar][(i >> 1) % 3] + 12), t, st * 0.9, 'square', 0.07);
    const m = MELODY[bar][i]; if (m > 0) note(ac, out, N(m), t, st * 1.8, 'triangle', 0.22);
    if (i % 4 === 2) note(ac, out, 6000, t, 0.025, 'square', 0.03);   // 小鼓點
    music.next += st; music.step++;
  }
}
