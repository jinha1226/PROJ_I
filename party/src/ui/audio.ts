// 효과음: 파일 없이 WebAudio 로 합성한다. 시뮬레이션은 World.sfx 에 이름만 쌓고, 화면 쪽이 꺼내 재생한다.
// 브라우저 정책상 첫 터치/클릭 뒤에야 소리가 난다.
export type Sfx = 'hit' | 'heavy' | 'hurt' | 'magic' | 'heal' | 'death' | 'break' | 'level' | 'chest' | 'swing';

export class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private last = new Map<Sfx, number>();
  enabled = true;

  /** 사용자 입력 안에서 한 번 불러야 한다 */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  play(s: Sfx) {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.enabled) return;
    const now = ctx.currentTime;
    // 같은 소리가 한꺼번에 겹치지 않게
    if (now - (this.last.get(s) ?? -1) < 0.05) return;
    this.last.set(s, now);
    switch (s) {
      case 'hit': return this.noise(now, 0.06, 1400, 0.22);
      case 'swing': return this.noise(now, 0.05, 2600, 0.1);
      case 'heavy':
        this.noise(now, 0.12, 500, 0.35);
        return this.tone(now, 'sine', 110, 50, 0.16, 0.4);
      case 'hurt': return this.tone(now, 'square', 190, 110, 0.09, 0.08);
      case 'magic': return this.tone(now, 'sine', 520, 1100, 0.16, 0.12);
      case 'heal':
        this.tone(now, 'sine', 660, 660, 0.12, 0.1);
        return this.tone(now + 0.08, 'sine', 990, 990, 0.16, 0.1);
      case 'death': return this.tone(now, 'triangle', 220, 55, 0.3, 0.2);
      case 'break':
        this.tone(now, 'sawtooth', 220, 180, 0.7, 0.08);
        return this.tone(now, 'sawtooth', 233, 190, 0.7, 0.08);
      case 'level':
        [523, 659, 784].forEach((f, i) => this.tone(now + i * 0.07, 'triangle', f, f, 0.14, 0.12));
        return;
      case 'chest':
        this.tone(now, 'triangle', 880, 880, 0.08, 0.12);
        return this.tone(now + 0.07, 'triangle', 1320, 1320, 0.16, 0.12);
    }
  }

  private tone(t: number, type: OscillatorType, f0: number, f1: number, dur: number, vol: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(t: number, dur: number, freq: number, vol: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master!);
    src.start(t);
  }
}
