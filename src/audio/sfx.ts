type Wave = OscillatorType;

/**
 * Procedural sound effects. Every sound is a few oscillators or a filtered
 * noise burst, so there are no files to load and nothing to decode mid-fight.
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private muted = false;
  private lastPlayed = new Map<string, number>();

  /** Browsers only allow audio after a user gesture; call from an input handler. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      this.ctx = new AudioContext();
    } catch {
      return;
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    const comp = this.ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(this.ctx.destination);
    const len = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  /** Skips a sound already played within `gap` seconds (bursts of hits). */
  private throttle(key: string, gap: number): boolean {
    if (!this.ctx) return true;
    const now = this.ctx.currentTime;
    if (now - (this.lastPlayed.get(key) ?? -1) < gap) return true;
    this.lastPlayed.set(key, now);
    return false;
  }

  private tone(freq: number, to: number, dur: number, type: Wave, vol: number, delay = 0): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private hiss(dur: number, filter: BiquadFilterType, from: number, to: number, vol: number, q = 1, delay = 0): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noise) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.Q.value = q;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(30, to), t + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(gain).connect(this.master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  swing(heavy: boolean): void {
    this.hiss(heavy ? 0.24 : 0.16, 'bandpass', heavy ? 600 : 900, heavy ? 2600 : 3800, heavy ? 0.5 : 0.35, 1.4);
  }

  hit(heavy: boolean, crit: boolean): void {
    if (this.throttle('hit', 0.03)) return;
    this.tone(heavy ? 150 : 210, 45, heavy ? 0.2 : 0.13, 'sine', heavy ? 0.9 : 0.7);
    this.hiss(0.09, 'highpass', 2500, 1200, heavy ? 0.5 : 0.35);
    this.tone(heavy ? 520 : 760, 300, 0.07, 'square', 0.08);
    if (crit) this.tone(1500, 900, 0.12, 'triangle', 0.25, 0.01);
  }

  bones(): void {
    for (let i = 0; i < 5; i++) this.tone(900 + Math.random() * 900, 400, 0.04, 'square', 0.07, i * 0.035 + Math.random() * 0.02);
    this.hiss(0.3, 'bandpass', 1800, 600, 0.25, 2);
  }

  playerHurt(): void {
    this.tone(120, 50, 0.25, 'sawtooth', 0.35);
    this.hiss(0.15, 'lowpass', 1600, 300, 0.5);
  }

  dodge(): void {
    this.hiss(0.22, 'bandpass', 1800, 500, 0.35, 0.8);
  }

  evade(): void {
    this.tone(1100, 1700, 0.12, 'triangle', 0.18);
  }

  windup(): void {
    if (this.throttle('windup', 0.08)) return;
    this.tone(220, 330, 0.18, 'triangle', 0.08);
  }

  cast(): void {
    this.tone(300, 900, 0.7, 'sine', 0.12);
    this.tone(450, 1350, 0.7, 'triangle', 0.05);
  }

  bolt(): void {
    this.tone(700, 200, 0.25, 'sawtooth', 0.12);
  }

  arrow(): void {
    this.tone(160, 90, 0.08, 'square', 0.18);
    this.hiss(0.12, 'highpass', 3000, 5000, 0.2);
  }

  impact(): void {
    if (this.throttle('impact', 0.05)) return;
    this.hiss(0.18, 'lowpass', 2000, 200, 0.4);
  }

  awaken(): void {
    this.hiss(0.6, 'bandpass', 300, 900, 0.3, 3);
    this.tone(90, 140, 0.6, 'sawtooth', 0.06);
  }

  open(): void {
    this.hiss(0.35, 'bandpass', 500, 250, 0.35, 4);
    this.tone(140, 90, 0.2, 'triangle', 0.2);
  }

  reveal(rare: boolean): void {
    if (rare) {
      [0, 0.08, 0.16].forEach((d, i) => this.tone(880 * 1.26 ** i, 880 * 1.26 ** i, 0.25, 'triangle', 0.18, d));
    } else {
      this.tone(1300, 1300, 0.05, 'sine', 0.08);
    }
  }

  /** Epic / legendary find: a short rising fanfare over a low swell. */
  treasure(legendary: boolean): void {
    const notes = legendary ? [523, 659, 784, 1046, 1318] : [587, 740, 880, 1175];
    notes.forEach((f, i) => this.tone(f, f, 0.5, 'triangle', 0.2, i * 0.07));
    this.tone(legendary ? 130 : 175, legendary ? 260 : 220, legendary ? 1.4 : 0.9, 'sine', 0.25);
    this.hiss(legendary ? 1.2 : 0.7, 'highpass', 4000, 9000, 0.12);
  }

  kill(): void {
    this.tone(90, 40, 0.35, 'sine', 0.8);
    this.hiss(0.25, 'lowpass', 3000, 300, 0.35);
  }

  pickup(): void {
    this.tone(660, 990, 0.08, 'triangle', 0.15);
  }

  coins(): void {
    this.tone(1800, 1800, 0.08, 'sine', 0.12);
    this.tone(2400, 2400, 0.12, 'sine', 0.1, 0.05);
  }

  heal(): void {
    this.tone(500, 800, 0.35, 'sine', 0.18);
    this.tone(750, 1200, 0.35, 'sine', 0.1, 0.08);
  }

  extractTick(): void {
    this.tone(880, 880, 0.08, 'sine', 0.12);
  }

  extracted(): void {
    [0, 0.12, 0.24, 0.4].forEach((d, i) => this.tone([523, 659, 784, 1046][i], [523, 659, 784, 1046][i], 0.4, 'triangle', 0.22, d));
  }

  death(): void {
    this.tone(300, 60, 1.2, 'sawtooth', 0.25);
    this.hiss(1, 'lowpass', 900, 100, 0.3);
  }

  alert(): void {
    if (this.throttle('alert', 0.3)) return;
    this.tone(500, 700, 0.1, 'square', 0.06);
  }

  denied(): void {
    this.tone(200, 160, 0.12, 'square', 0.1);
  }
}

export const sfx = new Sfx();
