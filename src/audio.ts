export type Efecto =
  | 'disparo'
  | 'escopeta'
  | 'llama'
  | 'cohete'
  | 'muerte'
  | 'golpe'
  | 'barril'
  | 'explosion'
  | 'premio'
  | 'puertaBuena'
  | 'puertaMala'
  | 'sube'
  | 'moneda'
  | 'escudo'
  | 'habilidad'
  | 'jefe'
  | 'victoria'
  | 'derrota'
  | 'boton'
  | 'compra'
  | 'error';

/** Separación mínima (ms) entre dos sonidos iguales, para no saturar con cientos de balas. */
const INTERVALO: Partial<Record<Efecto, number>> = {
  disparo: 70,
  escopeta: 90,
  llama: 110,
  cohete: 120,
  muerte: 45,
  golpe: 90,
  sube: 90,
  moneda: 60,
  barril: 60,
  explosion: 80,
};

const BPM = 118;
const PASOS = 64;
/** Raíz de cada compás (La menor, La menor, Fa, Mi). */
const RAICES = [55, 55, 43.65, 41.2];
const BAJO = [0, 3, 6, 8, 11, 14];

/**
 * Motor de sonido con Web Audio: efectos sintetizados (sin archivos) y una
 * música de tensión en bucle, con atenuación automática en los menús.
 */
class MotorAudio {
  private ctx: AudioContext | null = null;
  private general!: GainNode;
  private musica!: GainNode;
  private atenuador!: GainNode;
  private efectos!: GainNode;
  private ruido!: AudioBuffer;
  private volumenes = { general: 0.8, musica: 0.45, efectos: 0.8 };
  private musicaDeseada = false;
  private temporizador: number | null = null;
  private paso = 0;
  private proximo = 0;
  private ultimo = new Map<Efecto, number>();

  /** Debe llamarse tras un gesto del usuario (política de reproducción automática). */
  iniciar(): void {
    if (this.ctx) {
      this.reanudar();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.general = this.ctx.createGain();
    this.musica = this.ctx.createGain();
    this.atenuador = this.ctx.createGain();
    this.efectos = this.ctx.createGain();
    const compresor = this.ctx.createDynamicsCompressor();
    compresor.threshold.value = -14;
    compresor.ratio.value = 6;
    this.musica.connect(this.atenuador);
    this.atenuador.connect(this.general);
    this.efectos.connect(this.general);
    this.general.connect(compresor);
    compresor.connect(this.ctx.destination);
    this.ruido = this.crearRuido();
    this.aplicarVolumenes();
    this.ctx.addEventListener('statechange', () => this.arrancarSiCorresponde());
    this.reanudar();
    this.arrancarSiCorresponde();
  }

  get iniciado(): boolean {
    return this.ctx !== null;
  }

  private crearRuido(): AudioBuffer {
    const ctx = this.ctx!;
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const datos = buffer.getChannelData(0);
    for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;
    return buffer;
  }

  setVolumenes(general: number, musica: number, efectos: number): void {
    this.volumenes = { general: general / 100, musica: musica / 100, efectos: efectos / 100 };
    this.aplicarVolumenes();
  }

  private aplicarVolumenes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.general.gain.setTargetAtTime(this.volumenes.general, t, 0.05);
    this.musica.gain.setTargetAtTime(this.volumenes.musica * 0.5, t, 0.05);
    this.efectos.gain.setTargetAtTime(this.volumenes.efectos * 0.7, t, 0.05);
  }

  /** Baja la música mientras hay un menú o una celebración. */
  atenuar(activo: boolean): void {
    if (!this.ctx) return;
    this.atenuador.gain.setTargetAtTime(activo ? 0.35 : 1, this.ctx.currentTime, 0.3);
  }

  suspender(): void {
    void this.ctx?.suspend();
  }

  reanudar(): void {
    if (this.ctx && this.ctx.state !== 'running' && this.ctx.state !== 'closed') {
      this.ctx.resume().then(() => this.arrancarSiCorresponde(), () => undefined);
    }
  }

  /* ---------- Música ---------- */

  reproducirMusica(): void {
    this.musicaDeseada = true;
    this.arrancarSiCorresponde();
  }

  detenerMusica(): void {
    this.musicaDeseada = false;
    if (this.temporizador !== null) window.clearInterval(this.temporizador);
    this.temporizador = null;
  }

  private arrancarSiCorresponde(): void {
    if (!this.ctx || this.ctx.state !== 'running' || !this.musicaDeseada || this.temporizador !== null) return;
    this.proximo = this.ctx.currentTime + 0.1;
    this.temporizador = window.setInterval(() => this.programar(), 40);
  }

  private programar(): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const dur = 60 / BPM / 4;
    while (this.proximo < ctx.currentTime + 0.2) {
      this.nota(this.paso % PASOS, this.proximo, dur);
      this.paso++;
      this.proximo += dur;
    }
  }

  private nota(paso: number, t: number, dur: number): void {
    const enCompas = paso % 16;
    const raiz = RAICES[Math.floor(paso / 16)];
    if (enCompas % 4 === 0) this.bombo(t);
    if (enCompas % 2 === 1) this.ruidoEn(t, 0.03, 0.05, 'highpass', 7000, this.musica);
    if (enCompas === 4 || enCompas === 12) this.ruidoEn(t, 0.12, 0.12, 'bandpass', 1800, this.musica);
    if (BAJO.includes(enCompas)) this.tonoEn(t, raiz * (enCompas === 14 ? 2 : 1), dur * 1.6, 'sawtooth', 0.16, this.musica, 400);
    if (enCompas === 0) {
      for (const [i, f] of [1, 1.2, 1.5].entries()) this.tonoEn(t + i * 0.002, raiz * 4 * f, dur * 14, 'triangle', 0.035, this.musica);
    }
  }

  private bombo(t: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g);
    g.connect(this.musica);
    o.start(t);
    o.stop(t + 0.2);
  }

  /* ---------- Bloques de sonido ---------- */

  private tonoEn(t: number, frec: number, dur: number, tipo: OscillatorType, vol: number, destino: AudioNode, corte?: number, frecFinal?: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(frec, t);
    if (frecFinal) o.frequency.exponentialRampToValueAtTime(frecFinal, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let salida: AudioNode = o;
    if (corte) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = corte;
      o.connect(f);
      salida = f;
    }
    salida.connect(g);
    g.connect(destino);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private ruidoEn(t: number, dur: number, vol: number, filtro: BiquadFilterType, frec: number, destino: AudioNode, frecFinal?: number): void {
    const ctx = this.ctx!;
    const fuente = ctx.createBufferSource();
    fuente.buffer = this.ruido;
    const f = ctx.createBiquadFilter();
    f.type = filtro;
    f.frequency.setValueAtTime(frec, t);
    if (frecFinal) f.frequency.exponentialRampToValueAtTime(frecFinal, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    fuente.connect(f);
    f.connect(g);
    g.connect(destino);
    fuente.start(t, Math.random() * 0.5);
    fuente.stop(t + dur + 0.02);
  }

  /* ---------- Efectos ---------- */

  efecto(tipo: Efecto): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || this.volumenes.efectos <= 0) return;
    const ahora = performance.now();
    const min = INTERVALO[tipo];
    if (min && ahora - (this.ultimo.get(tipo) ?? 0) < min) return;
    this.ultimo.set(tipo, ahora);
    const t = ctx.currentTime;
    const d = this.efectos;
    switch (tipo) {
      case 'disparo':
        this.ruidoEn(t, 0.06, 0.25, 'bandpass', 2400, d, 900);
        this.tonoEn(t, 220, 0.05, 'square', 0.06, d, 1200, 90);
        break;
      case 'escopeta':
        this.ruidoEn(t, 0.14, 0.4, 'lowpass', 3000, d, 400);
        break;
      case 'llama':
        this.ruidoEn(t, 0.16, 0.12, 'bandpass', 900, d, 600);
        break;
      case 'cohete':
        this.ruidoEn(t, 0.25, 0.2, 'bandpass', 600, d, 2000);
        break;
      case 'muerte':
        this.tonoEn(t, 180 + Math.random() * 60, 0.12, 'sawtooth', 0.07, d, 800, 70);
        break;
      case 'golpe':
        this.tonoEn(t, 140, 0.16, 'square', 0.18, d, 600, 50);
        this.ruidoEn(t, 0.08, 0.2, 'lowpass', 900, d);
        break;
      case 'barril':
        this.ruidoEn(t, 0.12, 0.35, 'bandpass', 700, d, 300);
        this.tonoEn(t, 300, 0.08, 'triangle', 0.1, d, undefined, 150);
        break;
      case 'explosion':
        this.ruidoEn(t, 0.5, 0.6, 'lowpass', 1200, d, 80);
        this.tonoEn(t, 90, 0.35, 'sine', 0.4, d, undefined, 30);
        break;
      case 'premio':
        [523, 659, 784].forEach((f, i) => this.tonoEn(t + i * 0.06, f, 0.14, 'triangle', 0.16, d));
        break;
      case 'puertaBuena':
        [392, 523, 659, 1046].forEach((f, i) => this.tonoEn(t + i * 0.05, f, 0.16, 'square', 0.07, d, 3000));
        break;
      case 'puertaMala':
        [392, 330, 262, 196].forEach((f, i) => this.tonoEn(t + i * 0.07, f, 0.18, 'sawtooth', 0.08, d, 1500));
        break;
      case 'sube':
        this.tonoEn(t, 880, 0.06, 'square', 0.05, d, 3000, 1320);
        break;
      case 'moneda':
        this.tonoEn(t, 988, 0.06, 'square', 0.06, d, 4000);
        this.tonoEn(t + 0.06, 1319, 0.12, 'square', 0.06, d, 4000);
        break;
      case 'escudo':
        this.tonoEn(t, 600, 0.2, 'sine', 0.2, d, undefined, 1200);
        break;
      case 'habilidad':
        this.ruidoEn(t, 0.3, 0.2, 'highpass', 1500, d, 6000);
        this.tonoEn(t, 330, 0.3, 'sawtooth', 0.1, d, 2500, 990);
        break;
      case 'jefe':
        this.tonoEn(t, 55, 1.2, 'sawtooth', 0.3, d, 300);
        this.tonoEn(t + 0.4, 52, 1.2, 'sawtooth', 0.3, d, 300);
        break;
      case 'victoria':
        [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tonoEn(t + i * 0.11, f, 0.3, 'square', 0.08, d, 3500));
        break;
      case 'derrota':
        [392, 349, 311, 262].forEach((f, i) => this.tonoEn(t + i * 0.22, f, 0.4, 'triangle', 0.2, d));
        break;
      case 'boton':
        this.tonoEn(t, 660, 0.05, 'square', 0.05, d, 3000);
        break;
      case 'compra':
        [659, 880, 1175].forEach((f, i) => this.tonoEn(t + i * 0.07, f, 0.12, 'square', 0.07, d, 4000));
        break;
      case 'error':
        this.tonoEn(t, 200, 0.18, 'square', 0.08, d, 1000, 150);
        break;
    }
  }
}

export const audio = new MotorAudio();
