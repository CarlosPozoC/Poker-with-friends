type SoundName =
  | 'deal'
  | 'chip'
  | 'fold'
  | 'check'
  | 'call'
  | 'raise'
  | 'allin'
  | 'turn-alert'
  | 'win'
  | 'lose'
  | 'bust'
  | 'error'
  | 'showdown';

interface SoundDef {
  file?: string;
  freq?: number;
  duration?: number;
  type?: OscillatorType;
}

const SOUND_MAP: Record<SoundName, SoundDef> = {
  deal:   { file: '/sounds/dealing_one_card.wav', freq: 800, duration: 0.08, type: 'sine' },
  chip:   { file: '/sounds/call_raise_allin.mp3', freq: 1200, duration: 0.05, type: 'square' },
  fold:   { file: '/sounds/fold.wav', freq: 300, duration: 0.2, type: 'sawtooth' },
  check:  { file: '/sounds/check.m4a', freq: 600, duration: 0.06, type: 'sine' },
  call:   { file: '/sounds/call_raise_allin.mp3', freq: 500, duration: 0.1, type: 'triangle' },
  raise:  { file: '/sounds/call_raise_allin.mp3', freq: 700, duration: 0.15, type: 'triangle' },
  allin:  { file: '/sounds/call_raise_allin.mp3', freq: 440, duration: 0.35, type: 'sawtooth' },
  'turn-alert': { freq: 880, duration: 0.15, type: 'sine' },
  win:    { freq: 523, duration: 0.4, type: 'sine' },
  lose:   { freq: 200, duration: 0.3, type: 'sine' },
  bust:   { freq: 150, duration: 0.5, type: 'sawtooth' },
  error:  { freq: 250, duration: 0.2, type: 'square' },
  showdown: { freq: 660, duration: 0.25, type: 'triangle' },
};

const POOL_SIZE = 4;

export class AudioManager {
  private audioPools: Map<SoundName, HTMLAudioElement[]> = new Map();
  private audioIndices: Map<SoundName, number> = new Map();
  private audioContext: AudioContext | null = null;
  private _volume: number = 0.7;
  private _muted: boolean = false;
  private unlocked: boolean = false;
  private preloadPromises: Promise<void>[] = [];

  constructor() {
    this.preloadAll();
  }

  get volume(): number {
    return this._volume;
  }

  set volume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
    this.audioPools.forEach((pool) => {
      pool.forEach((el) => { el.volume = this._muted ? 0 : this._volume; });
    });
  }

  get muted(): boolean {
    return this._muted;
  }

  set muted(v: boolean) {
    this._muted = v;
    this.audioPools.forEach((pool) => {
      pool.forEach((el) => { el.volume = v ? 0 : this._volume; });
    });
  }

  toggleMute(): boolean {
    this.muted = !this._muted;
    return this._muted;
  }

  async unlock(): Promise<void> {
    if (this.unlocked) return;

    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      osc.start();
      osc.stop(this.audioContext.currentTime + 0.001);

      for (const pool of this.audioPools.values()) {
        for (const el of pool) {
          el.muted = true;
          await el.play().catch(() => {});
          el.pause();
          el.currentTime = 0;
          el.muted = false;
        }
      }

      this.unlocked = true;
    } catch {
      console.warn('[AudioManager] Unlock failed, will retry on first play');
    }
  }

  private async preloadAll(): Promise<void> {
    for (const [name, def] of Object.entries(SOUND_MAP) as [SoundName, SoundDef][]) {
      if (!def.file) {
        this.audioPools.set(name, []);
        this.audioIndices.set(name, 0);
        continue;
      }

      const pool: HTMLAudioElement[] = [];
      this.audioIndices.set(name, 0);

      for (let i = 0; i < POOL_SIZE; i++) {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.volume = this._volume;
        audio.src = def.file;

        const p = new Promise<void>((resolve) => {
          audio.addEventListener('canplaythrough', () => resolve(), { once: true });
          audio.addEventListener('error', () => resolve(), { once: true });
        });
        this.preloadPromises.push(p);
        pool.push(audio);
      }

      this.audioPools.set(name, pool);
    }
  }

  async preloadComplete(): Promise<void> {
    await Promise.all(this.preloadPromises);
  }

  private getNextAudio(name: SoundName): HTMLAudioElement | undefined {
    const pool = this.audioPools.get(name);
    if (!pool || pool.length === 0) return undefined;

    const idx = this.audioIndices.get(name) ?? 0;
    this.audioIndices.set(name, (idx + 1) % pool.length);
    return pool[idx];
  }

  play(name: SoundName): void {
    if (this._muted) return;

    const pool = this.audioPools.get(name);
    if (!pool || pool.length === 0) {
      this.playFallback(name);
      return;
    }

    const audio = this.getNextAudio(name);
    if (!audio) return;

    if (audio.readyState >= 2) {
      audio.currentTime = 0;
      audio.volume = this._volume;
      audio.play().catch(() => {
        this.playFallback(name);
      });
    } else {
      this.playFallback(name);
    }
  }

  playRepeated(name: SoundName, count: number, delayMs: number = 130): void {
    if (this._muted) return;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.play(name);
      }, i * delayMs);
    }
  }

  private playFallback(name: SoundName): void {
    if (this._muted) return;

    const def = SOUND_MAP[name];
    if (!def?.freq) return;

    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.audioContext.state === 'suspended') return;

      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = def.type || 'sine';
      osc.frequency.value = def.freq;

      const dur = def.duration || 0.1;
      gain.gain.setValueAtTime(this._volume * 0.3, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + dur);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      osc.start();
      osc.stop(this.audioContext.currentTime + dur);
    } catch {
      // AudioContext not available, silently fail
    }
  }
}

let instance: AudioManager | null = null;

export function getAudioManager(): AudioManager {
  if (!instance) {
    instance = new AudioManager();
  }
  return instance;
}

export type { SoundName };
