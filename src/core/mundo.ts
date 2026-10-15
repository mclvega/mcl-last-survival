import { HEROES, type IdHeroe } from '../content/heroes';
import { arma, NIVEL_ARMA_MAX } from './armas';
import { Rejilla } from './colisiones';
import { ANCHO, DIST_ACTIVACION, MAX_SOLDADOS, PASO, VEL_AVANCE } from './constantes';
import { dpsEscuadra } from './dificultad';
import { esBuena, soldadosTrasPuerta, textoPremio, textoPuerta, type DefPuerta, type Premio } from './elementos';
import { DIST_ESCUPIDOR, DIST_JEFE, ZOMBIS, type TipoZombi } from './enemigos';
import { radioEscuadra, type Estadisticas } from './escuadra';
import type { Evento, Nivel } from './generador';
import { compactar, Pool } from './pool';
import { rngFrom, type Rng } from './rng';

export type ModoJefe = 'llega' | 'espera' | 'embiste' | 'vuelve';

export interface Zombi {
  clase: 'z';
  id: number;
  tipo: TipoZombi;
  x: number;
  y: number;
  px: number;
  py: number;
  r: number;
  vida: number;
  vidaMax: number;
  vel: number;
  vivo: boolean;
  marca: number;
  /** Destello blanco al recibir daño. */
  flash: number;
  /** Temporizador de ataque (escupidor y jefe). */
  t: number;
  modo: ModoJefe;
  ataque: number;
}

export interface Barril {
  clase: 'b';
  id: number;
  x: number;
  y: number;
  r: number;
  vida: number;
  vidaMax: number;
  premio: Premio;
  valor: number;
  explosivo: boolean;
  vivo: boolean;
  marca: number;
  flash: number;
}

type Blanco = Zombi | Barril;

export interface Bala {
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  dano: number;
  perfora: number;
  vida: number;
  area: number;
  r: number;
  /** Nivel de arma (0 = torreta), para el color. */
  arma: number;
  vivo: boolean;
  golpeados: number[];
}

export interface Proyectil {
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  r: number;
  vivo: boolean;
}

export interface Puerta extends DefPuerta {
  /** Daño acumulado por los disparos (las puertas de suma suben al dispararles). */
  acum: number;
  umbral: number;
  max: number;
}

export interface ParPuertas {
  y: number;
  puertas: [Puerta, Puerta];
  cruzada: boolean;
  elegida: number;
  vivo: boolean;
}

export interface Obstaculo {
  tipo: 'pinchos' | 'rueda';
  x: number;
  y: number;
  px: number;
  ancho: number;
  r: number;
  vx: number;
  t: number;
  giro: number;
  vivo: boolean;
}

export interface Caja {
  x: number;
  y: number;
  valor: number;
  vivo: boolean;
}

export interface Torreta {
  x: number;
  y: number;
  t: number;
  fuego: number;
}

export type EventoMundo =
  | { t: 'disparo'; arma: number }
  | { t: 'impacto'; x: number; y: number; color: string }
  | { t: 'muerte'; x: number; y: number; z: TipoZombi; monedas: number }
  | { t: 'golpe'; x: number; y: number; k: number }
  | { t: 'escudo'; x: number; y: number }
  | { t: 'barril'; x: number; y: number; explosivo: boolean }
  | { t: 'premio'; x: number; y: number; texto: string; bueno: boolean }
  | { t: 'puerta'; x: number; y: number; texto: string; buena: boolean }
  | { t: 'sube'; x: number; y: number }
  | { t: 'explosion'; x: number; y: number; r: number }
  | { t: 'moneda'; x: number; y: number; valor: number }
  | { t: 'jefe' }
  | { t: 'habilidad'; heroe: IdHeroe; x: number; y: number; x2: number; y2: number };

export type EstadoPartida = 'jugando' | 'victoria' | 'derrota';

export interface Entrada {
  /** Posición horizontal deseada del escuadrón (null = quedarse). */
  x: number | null;
  habilidad: boolean;
}

/** Máximo de balas que salen a la vez de distintos soldados (las demás se agrupan). */
const EMISORES = 10;
const VEL_LATERAL = 900;

interface Explosion {
  x: number;
  y: number;
  r: number;
  dano: number;
  danaEscuadra: boolean;
}

const nuevoZombi = (): Zombi => ({
  clase: 'z',
  id: 0,
  tipo: 'caminante',
  x: 0,
  y: 0,
  px: 0,
  py: 0,
  r: 10,
  vida: 1,
  vidaMax: 1,
  vel: 0,
  vivo: true,
  marca: 0,
  flash: 0,
  t: 0,
  modo: 'llega',
  ataque: 0,
});
const nuevaBala = (): Bala => ({ x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, dano: 0, perfora: 0, vida: 0, area: 0, r: 2, arma: 1, vivo: true, golpeados: [] });
const nuevoProyectil = (): Proyectil => ({ x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, r: 6, vivo: true });

/**
 * Estado completo de una partida. Lógica pura y determinista: avanza con un
 * paso fijo y no toca el DOM, así se prueba en Node y la usa el bot.
 */
export class Mundo {
  readonly nivel: Nivel;
  readonly stats: Estadisticas;
  t = 0;
  estado: EstadoPartida = 'jugando';
  /** Si es false no se registran eventos (simulaciones del bot). */
  registrar = true;

  /* Escuadrón */
  x = ANCHO / 2;
  y = 0;
  px = ANCHO / 2;
  py = 0;
  soldados: number;
  maxSoldados: number;
  perdidos = 0;
  nivelArma: number;
  dano: number;
  cadencia: number;
  escudo: number;
  invulnerable = 0;
  recarga = 0;
  readonly recargaMax: number;
  private fuego = 0;

  zombis: Zombi[] = [];
  barriles: Barril[] = [];
  balas: Bala[] = [];
  proyectiles: Proyectil[] = [];
  puertas: ParPuertas[] = [];
  obstaculos: Obstaculo[] = [];
  cajas: Caja[] = [];
  torreta: Torreta | null = null;
  jefe: Zombi | null = null;
  enJefe = false;

  monedas = 0;
  bajas = 0;
  barrilesRotos = 0;
  jefesDerrotados = 0;
  eventos: EventoMundo[] = [];

  private siguiente = 0;
  private ids = 0;
  private rng: Rng;
  private rejilla = new Rejilla<Blanco>();
  private poolZ = new Pool<Zombi>(nuevoZombi);
  private poolB = new Pool<Bala>(nuevaBala);
  private poolP = new Pool<Proyectil>(nuevoProyectil);
  private explosiones: Explosion[] = [];
  private impactos = 0;
  private golpePinchos = 0;

  constructor(nivel: Nivel, stats: Estadisticas) {
    this.nivel = nivel;
    this.stats = stats;
    this.soldados = stats.soldados;
    this.maxSoldados = stats.soldados;
    this.nivelArma = stats.arma;
    this.dano = stats.dano;
    this.cadencia = stats.cadencia;
    this.escudo = stats.escudo;
    this.recargaMax = HEROES[stats.heroe].recarga;
    this.recarga = this.recargaMax * 0.5;
    this.rng = rngFrom(`mundo:${nivel.semilla}`);
  }

  get radio(): number {
    return radioEscuadra(this.soldados);
  }

  /** Daño por segundo actual del escuadrón. */
  dps(): number {
    return dpsEscuadra({ soldados: this.soldados, arma: this.nivelArma, dano: this.dano, cadencia: this.cadencia });
  }

  /** Avance del nivel de 0 a 1 (1 = llegó el jefe). */
  progreso(): number {
    return this.enJefe || !Number.isFinite(this.nivel.largo) ? 1 : Math.min(1, this.y / this.nivel.largo);
  }

  metros(): number {
    return Math.floor(this.y / 10);
  }

  /** Estrellas según los soldados que sobreviven respecto al máximo alcanzado. */
  estrellas(): number {
    const r = this.soldados / Math.max(1, this.maxSoldados);
    return r >= 0.5 ? 3 : r >= 0.25 ? 2 : 1;
  }

  private evento(e: EventoMundo): void {
    if (this.registrar) this.eventos.push(e);
  }

  /* ---------- Paso de simulación ---------- */

  paso(entrada: Entrada): void {
    if (this.estado !== 'jugando') return;
    const dt = PASO;
    this.t += dt;
    this.impactos = 0;
    this.guardarPrevias();

    // Avance y movimiento lateral.
    if (!this.enJefe) {
      this.y += VEL_AVANCE * dt;
      if (this.y >= this.nivel.largo) this.llegarAlJefe();
    }
    const r = this.radio;
    if (entrada.x !== null) {
      const objetivo = Math.min(ANCHO - r, Math.max(r, entrada.x));
      const d = objetivo - this.x;
      const max = VEL_LATERAL * dt;
      this.x += Math.abs(d) <= max ? d : Math.sign(d) * max;
    }
    this.x = Math.min(ANCHO - r, Math.max(r, this.x));
    if (this.invulnerable > 0) this.invulnerable -= dt;

    this.nivel.extender?.(this.y + DIST_ACTIVACION + 200);
    this.activarEventos();
    this.cruzarPuertas();

    if (this.recarga > 0) this.recarga = Math.max(0, this.recarga - dt);
    if (entrada.habilidad) this.usarHabilidad();

    this.disparar(dt);
    this.actualizarTorreta(dt);
    this.moverZombis(dt);
    this.armarRejilla();
    this.separarZombis();
    this.moverBalas(dt);
    this.procesarExplosiones();
    this.moverProyectiles(dt);
    this.actualizarObstaculos(dt);
    this.tocarBarrilesYCajas();
    this.procesarExplosiones();
    this.limpiar();

    if (this.soldados <= 0 && this.estado === 'jugando') {
      this.soldados = 0;
      this.estado = 'derrota';
    }
  }

  private guardarPrevias(): void {
    this.px = this.x;
    this.py = this.y;
    for (const z of this.zombis) {
      z.px = z.x;
      z.py = z.y;
    }
    for (const b of this.balas) {
      b.px = b.x;
      b.py = b.y;
    }
    for (const p of this.proyectiles) {
      p.px = p.x;
      p.py = p.y;
    }
    for (const o of this.obstaculos) o.px = o.x;
  }

  private llegarAlJefe(): void {
    this.y = this.nivel.largo;
    this.enJefe = true;
    const z = this.crearZombi('jefe', ANCHO / 2, this.y + DIST_ACTIVACION * 0.75, this.nivel.vidaJefe);
    z.t = 2;
    this.jefe = z;
    this.evento({ t: 'jefe' });
  }

  private activarEventos(): void {
    const eventos = this.nivel.eventos;
    const limite = this.y + DIST_ACTIVACION;
    while (this.siguiente < eventos.length && eventos[this.siguiente].y <= limite) {
      this.activar(eventos[this.siguiente++]);
    }
  }

  private activar(e: Evento): void {
    switch (e.tipo) {
      case 'zombi':
        this.crearZombi(e.z, e.x, e.y, e.vida);
        break;
      case 'barril':
        this.barriles.push({
          clase: 'b',
          id: ++this.ids,
          x: e.x,
          y: e.y,
          r: e.explosivo ? 15 : 17,
          vida: e.vida,
          vidaMax: e.vida,
          premio: e.premio,
          valor: e.valor,
          explosivo: e.explosivo,
          vivo: true,
          marca: 0,
          flash: 0,
        });
        break;
      case 'puertas': {
        const puerta = (d: DefPuerta): Puerta => ({
          ...d,
          acum: 0,
          umbral: Math.max(1, this.dps() * 0.5),
          max: d.op === 'suma' ? Math.max(d.valor, 0) + Math.ceil(this.soldados * 0.5) + 5 : d.valor,
        });
        this.puertas.push({ y: e.y, puertas: [puerta(e.a), puerta(e.b)], cruzada: false, elegida: -1, vivo: true });
        break;
      }
      case 'pinchos':
        this.obstaculos.push({ tipo: 'pinchos', x: e.x, y: e.y, px: e.x, ancho: e.ancho, r: 11, vx: 0, t: 0, giro: 0, vivo: true });
        break;
      case 'rueda':
        this.obstaculos.push({ tipo: 'rueda', x: e.x, y: e.y, px: e.x, ancho: 48, r: 24, vx: e.vel, t: 0, giro: 0, vivo: true });
        break;
      case 'caja':
        this.cajas.push({ x: e.x, y: e.y, valor: e.valor, vivo: true });
        break;
    }
  }

  private crearZombi(tipo: TipoZombi, x: number, y: number, vida: number): Zombi {
    const info = ZOMBIS[tipo];
    const z = this.poolZ.tomar();
    z.id = ++this.ids;
    z.tipo = tipo;
    z.x = z.px = x;
    z.y = z.py = y;
    z.r = info.radio;
    z.vida = z.vidaMax = vida;
    z.vel = info.velocidad * (0.9 + this.rng() * 0.2);
    z.vivo = true;
    z.marca = 0;
    z.flash = 0;
    z.t = 1 + this.rng() * 1.5;
    z.modo = 'llega';
    z.ataque = 0;
    this.zombis.push(z);
    return z;
  }

  /* ---------- Puertas ---------- */

  private cruzarPuertas(): void {
    for (const par of this.puertas) {
      if (par.cruzada || this.y < par.y) continue;
      par.cruzada = true;
      const lado = this.x < ANCHO / 2 ? 0 : 1;
      par.elegida = lado;
      const p = par.puertas[lado];
      if (p.op === 'cadencia') this.cadencia *= 1 + p.valor / 100;
      else if (p.op === 'dano') this.dano *= 1 + p.valor / 100;
      else this.cambiarSoldados(soldadosTrasPuerta(this.soldados, p) - this.soldados);
      this.evento({ t: 'puerta', x: lado === 0 ? ANCHO / 4 : (ANCHO * 3) / 4, y: par.y, texto: textoPuerta(p), buena: esBuena(p) });
    }
  }

  private cambiarSoldados(delta: number): void {
    if (delta < 0) this.perdidos += -delta;
    this.soldados = Math.max(0, Math.min(MAX_SOLDADOS, this.soldados + delta));
    this.maxSoldados = Math.max(this.maxSoldados, this.soldados);
  }

  /* ---------- Disparos ---------- */

  private disparar(dt: number): void {
    if (this.soldados <= 0) return;
    const a = arma(this.nivelArma);
    this.fuego -= dt;
    if (this.fuego > 0) return;
    this.fuego += 1 / (a.cadencia * this.cadencia);
    if (this.fuego < 0) this.fuego = 0;
    const e = Math.min(this.soldados, EMISORES);
    const danoBala = (a.dano * this.dano * this.soldados) / e;
    const r = this.radio;
    for (let i = 0; i < e; i++) {
      const ex = this.x + (e === 1 ? 0 : (-1 + (2 * i) / (e - 1)) * r * 0.7);
      const ey = this.y + r * 0.4;
      for (let k = 0; k < a.balas; k++) {
        const abanico = a.balas > 1 ? (-0.5 + k / (a.balas - 1)) * a.dispersion * 2 : 0;
        const ang = abanico + (this.rng() - 0.5) * a.dispersion;
        this.crearBala(ex, ey, Math.sin(ang) * a.velocidad, Math.cos(ang) * a.velocidad, danoBala, a.perfora + (a.perfora > 0 || a.area === 0 ? this.stats.perfora : 0), a.alcance / a.velocidad, a.area, a.radio, this.nivelArma);
      }
    }
    this.evento({ t: 'disparo', arma: this.nivelArma });
  }

  private crearBala(x: number, y: number, vx: number, vy: number, dano: number, perfora: number, vida: number, area: number, r: number, nivelArma: number): void {
    const b = this.poolB.tomar();
    b.x = b.px = x;
    b.y = b.py = y;
    b.vx = vx;
    b.vy = vy;
    b.dano = dano;
    b.perfora = perfora;
    b.vida = vida;
    b.area = area;
    b.r = r;
    b.arma = nivelArma;
    b.vivo = true;
    b.golpeados.length = 0;
    this.balas.push(b);
  }

  private moverBalas(dt: number): void {
    for (const b of this.balas) {
      if (!b.vivo) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vida -= dt;
      if (b.vida <= 0 || b.x < -10 || b.x > ANCHO + 10) {
        b.vivo = false;
        continue;
      }
      if (this.golpearPuertas(b)) continue;
      this.rejilla.consultar(b.x, b.y, b.r + 2, (o) => {
        if (!o.vivo || o.vida <= 0) return;
        const dx = o.x - b.x;
        const dy = o.y - b.y;
        const rr = o.r + b.r;
        if (dx * dx + dy * dy > rr * rr) return;
        if (b.golpeados.includes(o.id)) return;
        if (b.area > 0) {
          this.explosiones.push({ x: b.x, y: b.y, r: b.area, dano: b.dano, danaEscuadra: false });
          b.vivo = false;
          return true;
        }
        let dano: number;
        if (b.perfora > 0) {
          dano = b.dano;
          b.perfora--;
          if (b.golpeados.length < 8) b.golpeados.push(o.id);
        } else {
          // El daño que sobra sigue de largo (así un grupo grande no desperdicia balas).
          dano = Math.min(b.dano, o.vida);
          b.dano -= dano;
          if (b.dano <= 0.01) b.vivo = false;
          else if (b.golpeados.length < 8) b.golpeados.push(o.id);
        }
        this.danar(o, dano);
        if (this.impactos < 6) {
          this.impactos++;
          this.evento({ t: 'impacto', x: b.x, y: b.y, color: arma(b.arma || 1).color });
        }
        return !b.vivo;
      });
    }
  }

  /** Las puertas de suma absorben las balas y suben su valor. */
  private golpearPuertas(b: Bala): boolean {
    for (const par of this.puertas) {
      if (par.cruzada || Math.abs(b.y - par.y) > 13) continue;
      const lado = b.x < ANCHO / 2 ? 0 : 1;
      const p = par.puertas[lado];
      if (p.op !== 'suma' || p.valor >= p.max) return false;
      p.acum += b.dano;
      while (p.acum >= p.umbral && p.valor < p.max) {
        p.acum -= p.umbral;
        p.valor++;
        this.evento({ t: 'sube', x: lado === 0 ? ANCHO / 4 : (ANCHO * 3) / 4, y: par.y });
      }
      b.vivo = false;
      return true;
    }
    return false;
  }

  private danar(o: Blanco, dano: number): void {
    if (!o.vivo || o.vida <= 0) return;
    o.vida -= dano;
    o.flash = 0.08;
    if (o.vida > 0) return;
    if (o.clase === 'z') this.matar(o, true);
    else this.romperBarril(o, true);
  }

  private matar(z: Zombi, conMonedas: boolean): void {
    z.vivo = false;
    z.vida = 0;
    const info = ZOMBIS[z.tipo];
    const monedas = conMonedas ? info.monedas : 0;
    if (conMonedas) {
      this.monedas += monedas;
      this.bajas++;
    }
    this.evento({ t: 'muerte', x: z.x, y: z.y, z: z.tipo, monedas });
    if (z.tipo === 'explosivo') this.explosiones.push({ x: z.x, y: z.y, r: 60, dano: ZOMBIS.caminante.vida * this.nivel.escala * 3, danaEscuadra: true });
    if (z.tipo === 'jefe') {
      this.jefesDerrotados++;
      this.jefe = null;
      this.estado = 'victoria';
      for (const otro of this.zombis) if (otro.vivo) this.matar(otro, false);
      this.proyectiles.forEach((p) => (p.vivo = false));
    }
  }

  private romperBarril(b: Barril, premio: boolean): void {
    b.vivo = false;
    b.vida = 0;
    this.evento({ t: 'barril', x: b.x, y: b.y, explosivo: b.explosivo });
    if (b.explosivo) {
      this.explosiones.push({ x: b.x, y: b.y, r: 80, dano: this.dps() * 1.2 + 50 * this.nivel.escala, danaEscuadra: true });
      return;
    }
    if (!premio) return;
    this.barrilesRotos++;
    switch (b.premio) {
      case 'soldados':
        this.cambiarSoldados(b.valor);
        break;
      case 'arma':
        this.nivelArma = Math.min(NIVEL_ARMA_MAX, this.nivelArma + 1);
        break;
      case 'cadencia':
        this.cadencia *= 1 + b.valor / 100;
        break;
      case 'dano':
        this.dano *= 1 + b.valor / 100;
        break;
      case 'escudo':
        this.escudo += b.valor;
        break;
      case 'monedas':
        this.monedas += b.valor;
        break;
    }
    this.evento({ t: 'premio', x: b.x, y: b.y, texto: b.premio === 'arma' ? arma(this.nivelArma).nombre + '!' : textoPremio(b.premio, b.valor), bueno: true });
  }

  private procesarExplosiones(): void {
    // Puede haber reacciones en cadena (barril explosivo junto a otro): se procesan en orden.
    for (let i = 0; i < this.explosiones.length && i < 64; i++) {
      const e = this.explosiones[i];
      this.evento({ t: 'explosion', x: e.x, y: e.y, r: e.r });
      const afectados: Blanco[] = [];
      this.rejilla.consultar(e.x, e.y, e.r, (o) => {
        if (!o.vivo) return;
        const dx = o.x - e.x;
        const dy = o.y - e.y;
        const rr = e.r + o.r;
        if (dx * dx + dy * dy <= rr * rr) afectados.push(o);
      });
      for (const o of afectados) this.danar(o, e.dano);
      if (e.danaEscuadra) {
        const dx = this.x - e.x;
        const dy = this.y - e.y;
        const rr = e.r + this.radio * 0.6;
        if (dx * dx + dy * dy <= rr * rr) this.perderSoldados(2, this.x, this.y);
      }
    }
    this.explosiones.length = 0;
  }

  /* ---------- Zombis ---------- */

  private moverZombis(dt: number): void {
    const r = this.radio;
    for (const z of this.zombis) {
      if (!z.vivo) continue;
      if (z.flash > 0) z.flash -= dt;
      const info = ZOMBIS[z.tipo];
      const dy = z.y - this.y;
      if (z.tipo === 'jefe') this.moverJefe(z, dt);
      else if (z.tipo === 'escupidor') {
        if (dy > DIST_ESCUPIDOR) z.y -= z.vel * dt;
        else {
          z.y = this.y + DIST_ESCUPIDOR;
          z.t -= dt;
          if (z.t <= 0) {
            this.escupir(z.x, z.y, 0);
            z.t = 2.4;
          }
        }
        z.x += Math.max(-info.lateral, Math.min(info.lateral, (this.x - z.x) * 0.8)) * dt;
      } else {
        z.y -= z.vel * dt;
        if (dy < 560) z.x += Math.max(-info.lateral, Math.min(info.lateral, (this.x - z.x) * 2)) * dt;
      }
      // Contacto con el escuadrón.
      const dx = z.x - this.x;
      const dy2 = z.y - this.y;
      const rr = z.r + r * 0.85;
      if (dx * dx + dy2 * dy2 <= rr * rr) {
        if (z.tipo === 'jefe') {
          this.perderSoldados(info.golpe, z.x, z.y);
          z.modo = 'vuelve';
        } else {
          this.perderSoldados(info.golpe, z.x, z.y);
          if (z.tipo === 'explosivo') this.explosiones.push({ x: z.x, y: z.y, r: 50, dano: ZOMBIS.caminante.vida * this.nivel.escala * 3, danaEscuadra: false });
          z.vivo = false;
          this.evento({ t: 'muerte', x: z.x, y: z.y, z: z.tipo, monedas: 0 });
        }
      } else if (z.y < this.y - 120) z.vivo = false;
    }
  }

  private moverJefe(z: Zombi, dt: number): void {
    const objetivo = this.y + DIST_JEFE;
    const mitad = z.vida < z.vidaMax * 0.5;
    switch (z.modo) {
      case 'llega':
        z.y -= z.vel * dt;
        if (z.y <= objetivo) z.modo = 'espera';
        break;
      case 'espera':
        z.y = objetivo;
        z.x += Math.max(-40, Math.min(40, this.x - z.x)) * dt;
        z.t -= dt;
        if (z.t <= 0) {
          const ciclo = mitad ? ['abanico', 'invocar', 'embestida'] : ['abanico', 'invocar'];
          const ataque = ciclo[z.ataque++ % ciclo.length];
          if (ataque === 'abanico') for (let i = -3; i <= 3; i++) this.escupir(z.x, z.y - z.r * 0.5, i * 0.16);
          else if (ataque === 'invocar') {
            const vida = ZOMBIS.caminante.vida * this.nivel.escala * 1.5;
            for (let i = 0; i < 5; i++) this.crearZombi('caminante', Math.min(ANCHO - 16, Math.max(16, z.x + (i - 2) * 30)), z.y + 20, vida);
          } else z.modo = 'embiste';
          z.t = mitad ? 1.9 : 2.7;
        }
        break;
      case 'embiste':
        z.y -= 280 * dt;
        z.x += Math.max(-120, Math.min(120, this.x - z.x)) * dt;
        if (z.y <= this.y + 10) z.modo = 'vuelve';
        break;
      case 'vuelve':
        z.y += 160 * dt;
        if (z.y >= objetivo) z.modo = 'espera';
        break;
    }
  }

  private escupir(x: number, y: number, desvio: number): void {
    const p = this.poolP.tomar();
    const ang = Math.atan2(this.x - x, this.y - y) + desvio;
    p.x = p.px = x;
    p.y = p.py = y;
    p.vx = Math.sin(ang) * 150;
    p.vy = Math.cos(ang) * 150;
    p.r = 6;
    p.vivo = true;
    this.proyectiles.push(p);
  }

  private armarRejilla(): void {
    this.rejilla.limpiar();
    for (const z of this.zombis) if (z.vivo) this.rejilla.insertar(z);
    for (const b of this.barriles) if (b.vivo) this.rejilla.insertar(b);
  }

  /** Empuje suave entre zombis para que no se apilen en un solo punto. */
  private separarZombis(): void {
    for (const z of this.zombis) {
      if (!z.vivo || z.tipo === 'jefe') continue;
      this.rejilla.consultar(z.x, z.y, z.r * 1.6, (o) => {
        if (o === z || o.clase !== 'z' || !o.vivo || o.tipo === 'jefe') return;
        const dx = z.x - o.x;
        const dy = z.y - o.y;
        const d2 = dx * dx + dy * dy;
        const min = (z.r + o.r) * 0.85;
        if (d2 >= min * min || d2 === 0) return;
        const d = Math.sqrt(d2);
        const empuje = ((min - d) / d) * 0.25;
        z.x += dx * empuje;
        z.y += dy * empuje;
        o.x -= dx * empuje;
        o.y -= dy * empuje;
      });
    }
  }

  private moverProyectiles(dt: number): void {
    const r = this.radio;
    for (const p of this.proyectiles) {
      if (!p.vivo) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      const rr = p.r + r * 0.8;
      if (dx * dx + dy * dy <= rr * rr) {
        p.vivo = false;
        this.perderSoldados(1, p.x, p.y);
      } else if (p.y < this.y - 150 || p.x < -20 || p.x > ANCHO + 20) p.vivo = false;
    }
  }

  /* ---------- Obstáculos, barriles y cajas ---------- */

  private actualizarObstaculos(dt: number): void {
    const r = this.radio;
    if (this.golpePinchos > 0) this.golpePinchos -= dt;
    for (const o of this.obstaculos) {
      if (o.tipo === 'rueda') {
        o.x += o.vx * dt;
        o.giro += (o.vx / o.r) * dt;
        if (o.x < o.r || o.x > ANCHO - o.r) {
          o.vx = -o.vx;
          o.x = Math.min(ANCHO - o.r, Math.max(o.r, o.x));
        }
        if (o.t > 0) o.t -= dt;
        const dx = o.x - this.x;
        const dy = o.y - this.y;
        const rr = o.r + r * 0.8;
        if (o.t <= 0 && dx * dx + dy * dy <= rr * rr) {
          o.t = 0.6;
          this.perderSoldados(2, o.x, o.y);
        }
      } else if (Math.abs(o.y - this.y) < o.r + r * 0.8 && Math.abs(o.x - this.x) < o.ancho / 2 + r * 0.8) {
        if (this.golpePinchos <= 0) {
          this.golpePinchos = 0.12;
          this.perderSoldados(1, this.x, o.y);
        }
      }
      if (o.y < this.y - 200) o.vivo = false;
    }
  }

  private tocarBarrilesYCajas(): void {
    const r = this.radio;
    for (const b of this.barriles) {
      if (!b.vivo) continue;
      if (b.flash > 0) b.flash -= PASO;
      const dx = b.x - this.x;
      const dy = b.y - this.y;
      const rr = b.r + r * 0.85;
      if (dx * dx + dy * dy <= rr * rr) {
        // Chocar con un barril sin romperlo cuesta un soldado y no da premio.
        this.romperBarril(b, false);
        if (!b.explosivo) this.perderSoldados(1, b.x, b.y);
      } else if (b.y < this.y - 150) b.vivo = false;
    }
    for (const c of this.cajas) {
      const dx = c.x - this.x;
      const dy = c.y - this.y;
      const rr = 14 + r;
      if (dx * dx + dy * dy <= rr * rr) {
        c.vivo = false;
        this.monedas += c.valor;
        this.evento({ t: 'moneda', x: c.x, y: c.y, valor: c.valor });
      } else if (c.y < this.y - 150) c.vivo = false;
    }
  }

  perderSoldados(k: number, x: number, y: number): void {
    if (this.invulnerable > 0 || this.estado !== 'jugando') return;
    if (this.escudo > 0) {
      this.escudo--;
      this.evento({ t: 'escudo', x, y });
      return;
    }
    const antes = this.soldados;
    this.cambiarSoldados(-k);
    this.evento({ t: 'golpe', x, y, k: antes - this.soldados });
  }

  /* ---------- Habilidad del héroe y torreta ---------- */

  private usarHabilidad(): void {
    if (this.recarga > 0 || this.soldados <= 0) return;
    this.recarga = this.recargaMax;
    const heroe = this.stats.heroe;
    const dps = this.dps();
    let x2 = this.x;
    let y2 = this.y + 190;
    switch (heroe) {
      case 'sargento':
        this.explosiones.push({ x: x2, y: y2, r: 95, dano: dps * 1.8 + 40 * this.nivel.escala, danaEscuadra: false });
        this.procesarExplosiones();
        break;
      case 'medica': {
        const k = Math.max(3, Math.ceil(this.perdidos * 0.35));
        this.cambiarSoldados(k);
        this.perdidos = Math.max(0, this.perdidos - k);
        this.evento({ t: 'premio', x: this.x, y: this.y + 30, texto: `+${k} 🪖`, bueno: true });
        break;
      }
      case 'ingeniero':
        this.torreta = { x: this.x, y: this.y, t: 8, fuego: 0 };
        break;
      case 'francotiradora': {
        let objetivo: Zombi | null = this.jefe;
        if (!objetivo) {
          for (const z of this.zombis) {
            if (!z.vivo || z.y < this.y || z.y > this.y + 700) continue;
            if (!objetivo || z.vida > objetivo.vida) objetivo = z;
          }
        }
        if (objetivo) {
          x2 = objetivo.x;
          y2 = objetivo.y;
          this.danar(objetivo, dps * 4.5 + 60 * this.nivel.escala);
        }
        break;
      }
    }
    this.evento({ t: 'habilidad', heroe, x: this.x, y: this.y, x2, y2 });
  }

  private actualizarTorreta(dt: number): void {
    const t = this.torreta;
    if (!t) return;
    t.t -= dt;
    if (t.t <= 0) {
      this.torreta = null;
      return;
    }
    const lado = this.x > ANCHO / 2 ? -1 : 1;
    t.x = this.x + lado * (this.radio + 20);
    t.y = this.y + 4;
    t.fuego -= dt;
    if (t.fuego > 0) return;
    t.fuego = 0.2;
    let objetivo: Zombi | null = null;
    let mejor = Infinity;
    for (const z of this.zombis) {
      if (!z.vivo) continue;
      const dy = z.y - t.y;
      if (dy < 0 || dy > 520) continue;
      const d = dy * dy + (z.x - t.x) ** 2;
      if (d < mejor) {
        mejor = d;
        objetivo = z;
      }
    }
    if (!objetivo) return;
    const d = Math.sqrt(mejor) || 1;
    this.crearBala(t.x, t.y, ((objetivo.x - t.x) / d) * 700, ((objetivo.y - t.y) / d) * 700, this.dps() * 0.3 * 0.2 + 5, 0, 0.8, 0, 3, 0);
  }

  /* ---------- Limpieza ---------- */

  private limpiar(): void {
    compactar(this.zombis, this.poolZ);
    compactar(this.balas, this.poolB);
    compactar(this.proyectiles, this.poolP);
    compactar(this.barriles);
    compactar(this.obstaculos);
    compactar(this.cajas);
    if (this.puertas.length && this.puertas[0].y < this.y - 200) {
      this.puertas.forEach((p) => (p.vivo = p.y >= this.y - 200));
      compactar(this.puertas);
    }
  }

  /** Segunda oportunidad: revive con algunos soldados y despeja el frente. */
  revivir(soldados: number): void {
    this.estado = 'jugando';
    this.soldados = soldados;
    this.maxSoldados = Math.max(this.maxSoldados, soldados);
    this.invulnerable = 2.5;
    for (const z of this.zombis) {
      if (z.vivo && z.tipo !== 'jefe' && z.y - this.y < 320) this.matar(z, false);
    }
    for (const p of this.proyectiles) p.vivo = false;
    if (this.jefe && (this.jefe.modo === 'embiste' || this.jefe.modo === 'espera')) this.jefe.modo = 'vuelve';
    this.limpiar();
  }

  /** Prueba de rendimiento: llena la pantalla de zombis y balas. */
  estres(cantidad: number): void {
    this.soldados = this.maxSoldados = 60;
    this.nivelArma = 2;
    for (let i = 0; i < cantidad; i++) {
      this.crearZombi('caminante', 16 + this.rng() * (ANCHO - 32), this.y + 200 + this.rng() * 600, 1e9);
    }
  }
}
