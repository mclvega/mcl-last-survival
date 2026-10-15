import type { Aspecto } from '../content/aspectos';
import type { Escenario } from '../content/escenarios';
import { ARMAS } from '../core/armas';
import { ANCHO } from '../core/constantes';
import { esBuena, textoPuerta } from '../core/elementos';
import { MAX_VISIBLES, OFFSETS } from '../core/escuadra';
import type { TipoZombi } from '../core/enemigos';
import type { Mundo } from '../core/mundo';
import { mulberry32 } from '../core/rng';
import { MAX_PARTICULAS, type CalidadEfectiva } from '../fx/loop';
import { SistemaParticulas } from '../fx/particles';
import { crearAtlas, type Atlas, type Sprite } from './sprites';

interface Texto {
  x: number;
  y: number;
  texto: string;
  color: string;
  tam: number;
  t: number;
}

interface Rayo {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  t: number;
}

const FACTOR_CALIDAD: Record<CalidadEfectiva, number> = { baja: 0.3, media: 0.6, alta: 1 };
const COLOR_POLVO: Partial<Record<TipoZombi, string>> = { escupidor: '#d4e157', explosivo: '#ff922b', jefe: '#c92a2a' };
const FUENTE = 'system-ui, "Segoe UI", Roboto, sans-serif';
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Dibuja el estado del mundo en el canvas. Solo lee el estado: interpola entre
 * pasos para que se vea suave aunque la pantalla vaya a 90 o 120 Hz.
 */
export class Escena {
  private ctx: CanvasRenderingContext2D;
  private atlas: Atlas | null = null;
  /** Píxeles CSS por unidad del mundo. */
  esc = 1;
  private dpr = 1;
  private cssW = 1;
  private cssH = 1;
  /** Posición CSS de la x = 0 del mundo y altura CSS donde está el escuadrón. */
  private ox = 0;
  private baseY = 0;
  private camY = 0;
  private reloj = 0;
  private temblor = 0;
  private textos: Texto[] = [];
  private rayos: Rayo[] = [];
  private cubetas: number[][] = Array.from({ length: ARMAS.length + 1 }, () => []);
  readonly particulas = new SistemaParticulas();
  calidad: CalidadEfectiva = 'alta';
  sacudidaActiva = true;

  constructor(
    private readonly lienzo: HTMLCanvasElement,
    private readonly escenario: Escenario,
    private readonly noche: boolean,
    private readonly aspecto: Aspecto,
    private readonly colorHeroe: string,
  ) {
    this.ctx = lienzo.getContext('2d', { alpha: false }) ?? lienzo.getContext('2d')!;
  }

  ajustar(cssW: number, cssH: number, calidad: CalidadEfectiva): void {
    const dprReal = window.devicePixelRatio || 1;
    this.calidad = calidad;
    this.dpr = calidad === 'baja' ? 1 : calidad === 'media' ? Math.min(dprReal, 1.5) : Math.min(dprReal, 2);
    this.cssW = Math.max(1, cssW);
    this.cssH = Math.max(1, cssH);
    this.lienzo.width = Math.round(this.cssW * this.dpr);
    this.lienzo.height = Math.round(this.cssH * this.dpr);
    this.esc = Math.min(this.cssW / ANCHO, this.cssH / 600);
    this.ox = (this.cssW - ANCHO * this.esc) / 2;
    this.baseY = this.cssH - Math.max(110, this.cssH * 0.17);
    this.particulas.max = MAX_PARTICULAS[calidad];
    this.atlas = crearAtlas(this.esc * this.dpr, this.aspecto, this.colorHeroe);
  }

  /** Convierte una x de la pantalla (CSS) a unidades del mundo. */
  mundoX(px: number): number {
    return (px - this.ox) / this.esc;
  }

  private sx(x: number): number {
    return this.ox + x * this.esc;
  }

  private sy(y: number): number {
    return this.baseY - (y - this.camY) * this.esc;
  }

  private sprite(s: Sprite, x: number, y: number, k = 1): void {
    const w = s.w * this.esc * k;
    const h = s.h * this.esc * k;
    this.ctx.drawImage(s.img, this.sx(x) - w / 2, this.sy(y) - h / 2, w, h);
  }

  /* ---------- Efectos que pide la pantalla del juego ---------- */

  private cantidad(n: number): number {
    return Math.max(1, Math.round(n * FACTOR_CALIDAD[this.calidad]));
  }

  sacudir(fuerza: number): void {
    if (this.sacudidaActiva) this.temblor = Math.max(this.temblor, fuerza);
  }

  muerte(x: number, y: number, tipo: TipoZombi): void {
    const color = COLOR_POLVO[tipo] ?? '#8fbf5a';
    const grande = tipo === 'jefe' ? 4 : tipo === 'gordo' ? 1.8 : 1;
    this.particulas.rafaga('polvo', x, y, this.cantidad(5 * grande), 50 * grande, color, 5 * grande, 0.45);
    this.particulas.rafaga('chispa', x, y, this.cantidad(3), 90, '#dfe8c9', 2, 0.3);
  }

  impacto(x: number, y: number, color: string): void {
    if (this.calidad === 'baja') return;
    this.particulas.rafaga('chispa', x, y, this.cantidad(2), 110, color, 2, 0.18);
  }

  explosion(x: number, y: number, r: number): void {
    this.particulas.onda(x, y, r, '#ffa94d');
    this.particulas.rafaga('chispa', x, y, this.cantidad(14), r * 4, '#ffd43b', 3, 0.4);
    this.particulas.rafaga('humo', x, y, this.cantidad(6), r * 1.2, '#495057', r * 0.25, 0.8, 2);
  }

  barril(x: number, y: number, explosivo: boolean): void {
    this.particulas.rafaga('astilla', x, y, this.cantidad(10), 140, explosivo ? '#c92a2a' : '#a0662b', 5, 0.55);
  }

  golpe(x: number, y: number, k: number): void {
    this.particulas.rafaga('chispa', x, y, this.cantidad(6), 100, '#ff6b6b', 3, 0.35);
    this.texto(x, y + 10, `−${k}`, '#ff6b6b', 13);
  }

  moneda(x: number, y: number): void {
    this.particulas.rafaga('moneda', x, y, this.cantidad(4), 60, '#ffd43b', 3, 0.7);
  }

  texto(x: number, y: number, texto: string, color: string, tam = 16): void {
    if (this.textos.length > 24) this.textos.shift();
    this.textos.push({ x, y, texto, color, tam, t: 0 });
  }

  rayo(x1: number, y1: number, x2: number, y2: number): void {
    this.rayos.push({ x1, y1, x2, y2, t: 0 });
  }

  /* ---------- Dibujo ---------- */

  dibujar(m: Mundo, alfa: number, dt: number): void {
    if (!this.atlas) return;
    const ctx = this.ctx;
    this.reloj += dt;
    this.camY = lerp(m.py, m.y, alfa);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    let tx = 0;
    let ty = 0;
    if (this.temblor > 0) {
      tx = (Math.random() - 0.5) * this.temblor * 2;
      ty = (Math.random() - 0.5) * this.temblor * 2;
      this.temblor = Math.max(0, this.temblor - dt * 40);
    }
    ctx.translate(tx, ty);
    const yMin = this.camY - (this.cssH - this.baseY) / this.esc - 60;
    const yMax = this.camY + this.baseY / this.esc + 80;
    this.fondo(m, yMin, yMax);
    this.dibujarPuertas(m, yMin, yMax);
    this.dibujarObstaculos(m, alfa, yMin, yMax);
    this.dibujarCajasYBarriles(m, yMin, yMax);
    this.dibujarZombis(m, alfa, yMin, yMax);
    this.dibujarEscuadra(m, alfa);
    this.dibujarBalas(m, alfa);
    this.dibujarProyectiles(m, alfa);
    this.particulas.actualizar(dt);
    this.particulas.dibujar(ctx, this.ox, this.baseY + this.camY * this.esc, this.esc, -1);
    this.dibujarTextos(dt);
    this.dibujarRayos(dt);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private fondo(m: Mundo, yMin: number, yMax: number): void {
    const ctx = this.ctx;
    const e = this.escenario;
    const esc = this.esc;
    ctx.fillStyle = e.fuera;
    ctx.fillRect(-20, -20, this.cssW + 40, this.cssH + 40);
    ctx.fillStyle = e.suelo;
    ctx.fillRect(this.ox, -20, ANCHO * esc, this.cssH + 40);
    ctx.fillStyle = e.borde;
    ctx.fillRect(this.ox, -20, 22 * esc, this.cssH + 40);
    ctx.fillRect(this.ox + (ANCHO - 22) * esc, -20, 22 * esc, this.cssH + 40);

    // Marcas del carril.
    ctx.fillStyle = e.linea;
    ctx.globalAlpha = 0.45;
    const paso = 70;
    for (let y = Math.floor(yMin / paso) * paso; y < yMax; y += paso) {
      for (const x of [120, 240]) ctx.fillRect(this.sx(x) - 1.5 * esc, this.sy(y + 35), 3 * esc, 35 * esc);
    }
    ctx.globalAlpha = 1;

    // Detalles deterministas por trozos de camino: grietas, manchas y escombros.
    const trozo = 180;
    ctx.strokeStyle = e.detalle;
    ctx.lineWidth = 1.5 * esc;
    for (let k = Math.floor(yMin / trozo); k * trozo < yMax; k++) {
      const r = mulberry32(k * 2654435761);
      const gx = 40 + r() * (ANCHO - 80);
      const gy = k * trozo + r() * trozo;
      ctx.beginPath();
      ctx.moveTo(this.sx(gx), this.sy(gy));
      ctx.lineTo(this.sx(gx + 8 + r() * 10), this.sy(gy + 10 + r() * 8));
      ctx.lineTo(this.sx(gx + 2 + r() * 14), this.sy(gy + 24 + r() * 8));
      ctx.stroke();
      ctx.fillStyle = e.detalle;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.ellipse(this.sx(40 + r() * (ANCHO - 80)), this.sy(k * trozo + r() * trozo), (10 + r() * 16) * esc, (6 + r() * 8) * esc, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      const lado = r() < 0.5 ? 11 : ANCHO - 11;
      ctx.fillStyle = e.detalle;
      ctx.fillRect(this.sx(lado) - 6 * esc, this.sy(k * trozo + r() * trozo), 12 * esc, 9 * esc);
    }

    // Línea de llegada (donde aparece el jefe).
    if (Number.isFinite(m.nivel.largo) && m.nivel.largo > yMin && m.nivel.largo < yMax) {
      const y = this.sy(m.nivel.largo);
      const c = 12 * esc;
      for (let i = 0; i * c < ANCHO * esc; i++) {
        for (let j = 0; j < 2; j++) {
          ctx.fillStyle = (i + j) % 2 ? '#f1f3f5' : '#212529';
          ctx.fillRect(this.ox + i * c, y - j * c, c, c);
        }
      }
    }
    if (this.noche) {
      ctx.fillStyle = 'rgba(8, 16, 40, 0.28)';
      ctx.fillRect(-20, -20, this.cssW + 40, this.cssH + 40);
    }
  }

  private fuente(tam: number): void {
    this.ctx.font = `800 ${Math.round(tam * this.esc)}px ${FUENTE}`;
  }

  private textoContorno(texto: string, x: number, y: number, color: string): void {
    const ctx = this.ctx;
    ctx.lineWidth = Math.max(2, 3 * this.esc);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.lineJoin = 'round';
    ctx.strokeText(texto, x, y);
    ctx.fillStyle = color;
    ctx.fillText(texto, x, y);
  }

  private dibujarPuertas(m: Mundo, yMin: number, yMax: number): void {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const par of m.puertas) {
      if (par.y < yMin || par.y > yMax) continue;
      const y = this.sy(par.y + 13);
      const alto = 26 * this.esc;
      for (let lado = 0; lado < 2; lado++) {
        const p = par.puertas[lado];
        const x0 = lado ? ANCHO / 2 + 4 : 24;
        const x1 = lado ? ANCHO - 24 : ANCHO / 2 - 4;
        const buena = esBuena(p);
        const a = par.cruzada ? (lado === par.elegida ? 0.3 : 0.12) : 0.6;
        ctx.fillStyle = buena ? `rgba(34, 139, 230, ${a})` : `rgba(240, 62, 62, ${a})`;
        ctx.fillRect(this.sx(x0), y, (x1 - x0) * this.esc, alto);
        ctx.strokeStyle = buena ? '#a5d8ff' : '#ffc9c9';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.sx(x0), y, (x1 - x0) * this.esc, alto);
        if (!par.cruzada) {
          this.fuente(p.op === 'cadencia' || p.op === 'dano' ? 14 : 18);
          this.textoContorno(textoPuerta(p), this.sx((x0 + x1) / 2), y + alto / 2, '#ffffff');
        }
      }
      ctx.fillStyle = '#343a40';
      for (const x of [22, ANCHO / 2, ANCHO - 22]) ctx.fillRect(this.sx(x) - 3 * this.esc, y - 4 * this.esc, 6 * this.esc, alto + 8 * this.esc);
    }
  }

  private dibujarObstaculos(m: Mundo, alfa: number, yMin: number, yMax: number): void {
    const ctx = this.ctx;
    for (const o of m.obstaculos) {
      if (o.y < yMin || o.y > yMax) continue;
      if (o.tipo === 'pinchos') {
        const x0 = this.sx(o.x - o.ancho / 2);
        const w = o.ancho * this.esc;
        const y = this.sy(o.y + o.r);
        const h = o.r * 2 * this.esc;
        ctx.fillStyle = '#2b2b2b';
        ctx.fillRect(x0, y + h * 0.55, w, h * 0.45);
        const n = Math.max(3, Math.floor(o.ancho / 11));
        const paso = w / n;
        ctx.fillStyle = '#ced4da';
        ctx.strokeStyle = '#495057';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          ctx.moveTo(x0 + i * paso, y + h * 0.6);
          ctx.lineTo(x0 + (i + 0.5) * paso, y);
          ctx.lineTo(x0 + (i + 1) * paso, y + h * 0.6);
        }
        ctx.fill();
        ctx.stroke();
      } else {
        const x = lerp(o.px, o.x, alfa);
        const s = this.atlas!.rueda;
        const w = s.w * this.esc;
        ctx.save();
        ctx.translate(this.sx(x), this.sy(o.y));
        ctx.rotate(o.giro);
        ctx.drawImage(s.img, -w / 2, -w / 2, w, w);
        ctx.restore();
      }
    }
  }

  private dibujarCajasYBarriles(m: Mundo, yMin: number, yMax: number): void {
    const ctx = this.ctx;
    const atlas = this.atlas!;
    for (const c of m.cajas) if (c.y > yMin && c.y < yMax) this.sprite(atlas.caja, c.x, c.y);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const b of m.barriles) {
      if (b.y < yMin || b.y > yMax) continue;
      this.sprite(b.explosivo ? atlas.explosivo : b.flash > 0 ? atlas.barrilFlash : atlas.barril, b.x, b.y);
      this.fuente(11);
      this.textoContorno(formato(b.vida), this.sx(b.x), this.sy(b.y), '#ffffff');
      if (!b.explosivo) this.sprite(atlas.premios[b.premio], b.x, b.y + b.r + 9 + Math.sin(this.reloj * 4 + b.id) * 1.5);
    }
  }

  private dibujarZombis(m: Mundo, alfa: number, yMin: number, yMax: number): void {
    const ctx = this.ctx;
    const atlas = this.atlas!;
    for (const z of m.zombis) {
      if (!z.vivo) continue;
      const y = lerp(z.py, z.y, alfa);
      if (y < yMin || y > yMax) continue;
      const x = lerp(z.px, z.x, alfa) + Math.sin(this.reloj * 6 + z.id) * 0.8;
      this.sprite(z.flash > 0 ? atlas.zombisFlash[z.tipo] : atlas.zombis[z.tipo], x, y);
      if (z.tipo === 'gordo' && z.vida < z.vidaMax) {
        const w = 28 * this.esc;
        const sx = this.sx(x) - w / 2;
        const sy = this.sy(y + z.r + 6);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(sx, sy, w, 3 * this.esc);
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(sx, sy, (w * Math.max(0, z.vida)) / z.vidaMax, 3 * this.esc);
      }
    }
  }

  private dibujarEscuadra(m: Mundo, alfa: number): void {
    const ctx = this.ctx;
    const atlas = this.atlas!;
    const x = lerp(m.px, m.x, alfa);
    const y = this.camY;
    const r = m.radio;
    if (m.invulnerable > 0 && Math.floor(this.reloj * 12) % 2) ctx.globalAlpha = 0.45;
    if (m.escudo > 0) {
      ctx.fillStyle = 'rgba(77, 171, 247, 0.18)';
      ctx.strokeStyle = 'rgba(165, 216, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.sx(x), this.sy(y), (r + 7) * this.esc, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    const cantidad = Math.min(m.soldados, MAX_VISIBLES);
    for (let i = cantidad - 1; i >= 1; i--) {
      const off = OFFSETS[i];
      const paso = Math.sin(this.reloj * 12 + i * 1.7) * 0.9;
      this.sprite(atlas.soldado, x + off.x, y - off.y + paso);
    }
    if (cantidad > 0) this.sprite(atlas.lider, x, y);
    ctx.globalAlpha = 1;
    const t = m.torreta;
    if (t) {
      ctx.fillStyle = '#495057';
      ctx.strokeStyle = '#f2c94c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.sx(t.x), this.sy(t.y), 8 * this.esc, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#212529';
      ctx.fillRect(this.sx(t.x) - 2 * this.esc, this.sy(t.y + 16), 4 * this.esc, 10 * this.esc);
    }
    // Número de soldados sobre el escuadrón.
    if (m.soldados > 0) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      this.fuente(16);
      this.textoContorno(String(m.soldados), this.sx(x), this.sy(y + r + 16), '#ffffff');
    }
  }

  private dibujarBalas(m: Mundo, alfa: number): void {
    const ctx = this.ctx;
    for (const c of this.cubetas) c.length = 0;
    m.balas.forEach((b, i) => b.vivo && this.cubetas[b.arma].push(i));
    for (let nivel = 0; nivel < this.cubetas.length; nivel++) {
      const lista = this.cubetas[nivel];
      if (!lista.length) continue;
      const a = nivel === 0 ? null : ARMAS[nivel - 1];
      const color = a ? a.color : '#63e6be';
      if (nivel === 5) {
        // Lanzallamas: bolas de fuego que crecen.
        ctx.globalCompositeOperation = this.calidad === 'baja' ? 'source-over' : 'lighter';
        for (const i of lista) {
          const b = m.balas[i];
          const k = 1 - b.vida / (a!.alcance / a!.velocidad);
          ctx.globalAlpha = 0.75 * (1 - k * 0.7);
          ctx.fillStyle = k < 0.35 ? '#ffd43b' : '#ff6b1a';
          ctx.beginPath();
          ctx.arc(this.sx(lerp(b.px, b.x, alfa)), this.sy(lerp(b.py, b.y, alfa)), (b.r + k * 6) * this.esc, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        continue;
      }
      ctx.strokeStyle = color;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(1.5, (nivel === 6 ? 5 : 2.4) * this.esc);
      ctx.beginPath();
      const largo = nivel === 6 ? 0.03 : 0.022;
      for (const i of lista) {
        const b = m.balas[i];
        const x = lerp(b.px, b.x, alfa);
        const y = lerp(b.py, b.y, alfa);
        ctx.moveTo(this.sx(x), this.sy(y));
        ctx.lineTo(this.sx(x - b.vx * largo), this.sy(y - b.vy * largo));
      }
      ctx.stroke();
    }
  }

  private dibujarProyectiles(m: Mundo, alfa: number): void {
    if (!m.proyectiles.length) return;
    const ctx = this.ctx;
    ctx.fillStyle = '#a9e34b';
    ctx.strokeStyle = '#5c940d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const p of m.proyectiles) {
      const x = this.sx(lerp(p.px, p.x, alfa));
      const y = this.sy(lerp(p.py, p.y, alfa));
      ctx.moveTo(x + p.r * this.esc, y);
      ctx.arc(x, y, p.r * this.esc, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
  }

  private dibujarTextos(dt: number): void {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let j = 0;
    for (const t of this.textos) {
      t.t += dt;
      if (t.t > 1.1) continue;
      t.y += 34 * dt;
      ctx.globalAlpha = Math.min(1, (1.1 - t.t) * 3);
      this.fuente(t.tam * (t.t < 0.12 ? 0.7 + t.t * 2.5 : 1));
      this.textoContorno(t.texto, this.sx(t.x), this.sy(t.y), t.color);
      this.textos[j++] = t;
    }
    this.textos.length = j;
    ctx.globalAlpha = 1;
  }

  private dibujarRayos(dt: number): void {
    const ctx = this.ctx;
    let j = 0;
    for (const r of this.rayos) {
      r.t += dt;
      if (r.t > 0.35) continue;
      ctx.globalAlpha = 1 - r.t / 0.35;
      ctx.strokeStyle = '#e5dbff';
      ctx.lineWidth = 5 * this.esc * (1 - r.t / 0.35) + 1;
      ctx.beginPath();
      ctx.moveTo(this.sx(r.x1), this.sy(r.y1));
      ctx.lineTo(this.sx(r.x2), this.sy(r.y2));
      ctx.stroke();
      this.rayos[j++] = r;
    }
    this.rayos.length = j;
    ctx.globalAlpha = 1;
  }
}

/** Vida de los barriles en formato corto (1.2k). */
export function formato(v: number): string {
  const n = Math.ceil(v);
  if (n >= 10000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
