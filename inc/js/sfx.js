'use strict';
// 효과음: 파일 없이 Web Audio로 합성한다. 첫 클릭 때 소리 장치를 깨운다(브라우저 정책).
// 같은 소리는 gap(ms) 안에 다시 울리지 않고, 동시에 울리는 소리 수도 제한한다 — 자동 전투가 소음이 되지 않게.
G.SFX = (() => {
  let ac = null, out = null, voices = 0, noiseBuf = null;
  const last = {};
  function wake() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    out = ac.createGain();
    const comp = ac.createDynamicsCompressor();
    out.connect(comp); comp.connect(ac.destination);
    out.gain.value = G.OPT.vol;
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (typeof window !== 'undefined') window.addEventListener('pointerdown', wake, { capture: true });

  // 음 하나: f → f2로 미끄러지며 dur초 동안 사라진다
  function tone(f, dur, { type = 'square', vol = 0.2, f2 = f, at = 0, atk = 0.005 } = {}) {
    const t0 = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (f2 !== f) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(out);
    o.start(t0); o.stop(t0 + dur + 0.02);
    voices++; o.onended = () => voices--;
  }
  // 잡음: 필터 주파수 ff → ff2
  function noise(dur, { vol = 0.2, ff = 2000, ff2 = ff, q = 1, kind = 'lowpass', at = 0 } = {}) {
    const t0 = ac.currentTime + at, s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf;
    fl.type = kind; fl.Q.value = q;
    fl.frequency.setValueAtTime(ff, t0);
    if (ff2 !== ff) fl.frequency.exponentialRampToValueAtTime(ff2, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(fl); fl.connect(g); g.connect(out);
    s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.02);
    voices++; s.onended = () => voices--;
  }
  const arp = (notes, step, o) => notes.forEach((f, i) => tone(f, o.dur || step * 2, Object.assign({}, o, { at: i * step })));

  // 이름 → [최소 간격 ms, 합성]
  const LIB = {
    tap: [70, () => { noise(0.05, { vol: 0.08, ff: 1400 }); tone(160, 0.05, { vol: 0.05, f2: 70 }); }],
    hit: [40, () => { noise(0.08, { vol: 0.22, ff: 2200, ff2: 400 }); tone(180, 0.09, { vol: 0.14, f2: 60 }); }],
    crit: [60, () => { noise(0.1, { vol: 0.25, ff: 4000, ff2: 600 }); tone(950, 0.1, { type: 'triangle', vol: 0.12, f2: 380 }); tone(120, 0.12, { vol: 0.14, f2: 45 }); }],
    smite: [80, () => { noise(0.45, { vol: 0.35, ff: 5000, ff2: 300, kind: 'bandpass', q: 0.7 }); tone(90, 0.4, { type: 'sine', vol: 0.4, f2: 35 }); }],
    boom: [80, () => { noise(0.6, { vol: 0.4, ff: 1500, ff2: 80 }); tone(70, 0.55, { type: 'sine', vol: 0.45, f2: 28 }); }],
    sword: [60, () => { noise(0.18, { vol: 0.16, ff: 6000, ff2: 1500, kind: 'highpass' }); tone(1300, 0.14, { type: 'sine', vol: 0.08, f2: 2600 }); }],
    coin: [70, () => { tone(1319, 0.06, { vol: 0.07 }); tone(1760, 0.16, { vol: 0.07, at: 0.055 }); }],
    pop: [60, () => tone(600, 0.06, { type: 'triangle', vol: 0.08, f2: 1100 })],
    zap: [90, () => tone(1800, 0.04, { type: 'sawtooth', vol: 0.025, f2: 700 })],
    hurt: [150, () => { tone(140, 0.12, { type: 'sawtooth', vol: 0.08, f2: 70 }); noise(0.08, { vol: 0.08, ff: 800 }); }],
    dud: [150, () => tone(300, 0.16, { type: 'triangle', vol: 0.06, f2: 190 })],
    lose: [400, () => { tone(330, 0.22, { type: 'sawtooth', vol: 0.09, f2: 220 }); tone(247, 0.4, { type: 'sawtooth', vol: 0.09, f2: 150, at: 0.18 }); }],
    select: [40, () => tone(880, 0.05, { type: 'triangle', vol: 0.1, f2: 1320 })],
    error: [120, () => tone(120, 0.12, { vol: 0.08 })],
    build: [80, () => { tone(196, 0.07, { vol: 0.12 }); tone(294, 0.12, { vol: 0.12, at: 0.07 }); noise(0.06, { vol: 0.1, ff: 900, at: 0.07 }); }],
    buy: [60, () => arp([523, 659, 784, 1047], 0.045, { type: 'triangle', vol: 0.12, dur: 0.14 })],
    unlock: [300, () => { arp([392, 523, 659, 784, 1047, 1319], 0.06, { type: 'triangle', vol: 0.14, dur: 0.3 }); tone(2093, 0.9, { type: 'sine', vol: 0.06, at: 0.36 }); }],
    finish: [400, () => { tone(110, 0.9, { type: 'sine', vol: 0.5, f2: 30 }); noise(0.8, { vol: 0.3, ff: 1200, ff2: 60 }); arp([784, 988, 1175, 1568], 0.08, { type: 'triangle', vol: 0.1, dur: 0.5, at: 0 }); }],
    bell: [80, () => { tone(1047, 0.9, { type: 'sine', vol: 0.12, atk: 0.002 }); tone(2093, 0.5, { type: 'sine', vol: 0.04, atk: 0.002 }); }],
    chime: [150, () => arp([1047, 1319, 1568], 0.07, { type: 'sine', vol: 0.1, dur: 0.6 })],
    thunder: [260, () => noise(0.5, { vol: 0.18, ff: 900, ff2: 70 })],
    wave: [500, () => { tone(440, 0.14, { vol: 0.06 }); tone(587, 0.2, { vol: 0.06, at: 0.15 }); }],
    scratch: [45, () => noise(0.05, { vol: 0.05, ff: 3500, kind: 'bandpass', q: 2 })],
    reveal: [50, () => tone(660, 0.07, { type: 'triangle', vol: 0.08 })],
    banish: [80, () => { tone(300, 0.2, { type: 'sine', vol: 0.15, f2: 1200 }); noise(0.15, { vol: 0.1, ff: 3000, kind: 'highpass' }); }],
    gurgle: [400, () => { tone(70, 0.5, { type: 'sine', vol: 0.15, f2: 45 }); tone(74, 0.5, { type: 'sawtooth', vol: 0.03, f2: 40 }); }],
    mad: [1000, () => { tone(55, 1.4, { type: 'sawtooth', vol: 0.12, f2: 40 }); tone(58, 1.4, { type: 'sawtooth', vol: 0.12, f2: 39 }); }],
    // 당첨: 등급(0~5)이 높을수록 음이 많고 높다
    win: [200, o => { const n = 2 + (o.tier || 0); arp([523, 659, 784, 1047, 1319, 1568, 2093].slice(0, n), 0.06, { type: 'square', vol: 0.07, dur: 0.18 }); }],
    jackpot: [600, () => { arp([523, 659, 784, 1047, 784, 1047, 1319, 1568, 2093], 0.07, { type: 'square', vol: 0.08, dur: 0.2 }); tone(80, 0.8, { type: 'sine', vol: 0.35, f2: 40 }); }],
  };

  return {
    play(name, o = {}) {
      if (!ac || !G.OPT.sfx || ac.state !== 'running') return;
      const L = LIB[name];
      if (!L || voices > 24) return;
      const now = performance.now();
      if (now - (last[name] || 0) < L[0]) return;
      last[name] = now;
      L[1](o);
    },
    setVol(v) { G.OPT.vol = v; if (out) out.gain.value = v; },
  };
})();
