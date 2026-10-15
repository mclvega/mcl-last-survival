import type { Aspecto } from '../content/aspectos';
import type { Escenario } from '../content/escenarios';
import { ARMAS } from '../core/armas';
import { ANCHO, ANCHO_PASILLO } from '../core/constantes';
import { esBuena, textoPuerta } from '../core/elementos';
import { MAX_VISIBLES, OFFSETS } from '../core/escuadra';
import type { TipoZombi } from '../core/enemigos';
import type { Barril, Ficha, Mundo, Obstaculo, ParPuertas, Zombi } from '../core/mundo';
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

/** Algo que se dibuja ordenado por profundidad (de lejos a cerca). */
type Dibujable =
  | { y: number; k: 'z'; o: Zombi }
  | { y: number; k: 'b'; o: Barril }
  | { y: number; k: 'f'; o: Ficha }
  | { y: number; k: 'o'; o: Obstaculo }
  | { y: number; k: 'p'; o: ParPuertas }
  | { y: number; k: 'c'; o: { x: number; y: number } };

const FACTOR_CALIDAD: Record<CalidadEfectiva, number> = { baja: 0.3, media: 0.6, alta: 1 };
const COLOR_POLVO: Partial<Record<TipoZombi, string>> = { escupidor: '#d4e157', explosivo: '#ff922b', jefe: '#c98a5a', divisor: '#b197fc' };
const FUENTE = 'system-ui, "Segoe UI", Roboto, sans-serif';
/** Profundidad (unidades) de la cámara detrás del escuadrón. */
const D0 = 270;
const ALTO_MURO = 20;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Orden de dibujo de los soldados: primero los de atrás (más lejos de la cámara). */
const ORDEN_SOLDADOS = OFFSETS.map((_, i) => i)
  .slice(1)
  .sort((a, b) => OFFSETS[a].y - OFFSETS[b].y);

/**
 * Dibuja el mundo con una cámara en perspectiva detrás del escuadrón: lo lejano
 * se ve más chico y cerca del horizonte. Solo lee el estado e interpola entre
 * pasos para que se vea suave a cualquier frecuencia de pantalla.
 */
export class Escena {
  private ctx: CanvasRenderingContext2D;
  private atlas: Atlas | null = null;
  /** Píxeles CSS por unidad del mundo a la altura del escuadrón (se usa para el arrastre). */
  esc = 1;
  private dpr = 1;
  private cssW = 1;
  private cssH = 1;
  private cx = 0;
  private horizonte = 0;
  private baseY = 0;
  private F = 1;
  private camY = 0;
  private reloj = 0;
  private temblor = 0;
  /** Resultado de la última proyección. */
  private X = 0;
  private Y = 0;
  private K = 0;
  private textos: Texto[] = [];
  private rayos: Rayo[] = [];
  private lista: Dibujable[] = [];
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
    this.esc = Math.min(this.cssW / (ANCHO * 0.98), this.cssH / 560);
    this.cx = this.cssW / 2;
    // Horizonte por encima de la pantalla: el camino llena todo el alto, como en los anuncios.
    this.horizonte = -this.cssH * 0.32;
    this.baseY = this.cssH * 0.8;
    this.F = this.esc * D0;
    this.particulas.max = MAX_PARTICULAS[calidad];
    this.atlas = crearAtlas(this.esc * this.dpr * 1.6, this.aspecto, this.colorHeroe);
  }

  /** Proyecta un punto del mundo (x, y, altura z). Deja el resultado en X, Y y K (escala). */
  private proy(x: number, y: number, z = 0): boolean {
    const d = D0 + (y - this.camY);
    if (d < 25) return false;
    this.K = this.F / d;
    this.X = this.cx + (x - ANCHO / 2) * this.K;
    this.Y = this.horizonte + ((this.baseY - this.horizonte) * D0) / d - z * this.K;
    return true;
  }

  /** Dibuja un sprite de pie (o centrado) en un punto del mundo. */
  private sprite(s: Sprite, x: number, y: number, k = 1, z = 0): void {
    if (!this.proy(x, y, z)) return;
    const w = s.w * this.K * k;
    const h = s.h * this.K * k;
    this.ctx.drawImage(s.img, this.X - w / 2, s.centrado ? this.Y - h / 2 : this.Y - h, w, h);
  }

  /** Cuadrilátero a partir de 4 puntos del mundo [x, y, z]. */
  private cuad(p: number[][], relleno: string, borde?: string): void {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      if (!this.proy(p[i][0], p[i][1], p[i][2])) return;
      if (i === 0) ctx.moveTo(this.X, this.Y);
      else ctx.lineTo(this.X, this.Y);
    }
    ctx.closePath();
    ctx.fillStyle = relleno;
    ctx.fill();
    if (borde) {
      ctx.strokeStyle = borde;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
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
    const grande = tipo === 'jefe' ? 4 : tipo === 'gordo' || tipo === 'gigante' ? 2 : 1;
    this.particulas.rafaga('polvo', x, y, this.cantidad(5 * grande), 50 * grande, color, 6 * grande, 0.45);
    this.particulas.rafaga('chispa', x, y, this.cantidad(3), 90, '#dfe8c9', 2, 0.3);
  }

  impacto(x: number, y: number, color: string): void {
    if (this.calidad === 'baja') return;
    this.particulas.rafaga('chispa', x, y, this.cantidad(2), 110, color, 2.5, 0.18);
  }

  explosion(x: number, y: number, r: number): void {
    this.particulas.onda(x, y, r, '#ffa94d');
    this.particulas.rafaga('chispa', x, y, this.cantidad(14), r * 4, '#ffd43b', 3.5, 0.4);
    this.particulas.rafaga('humo', x, y, this.cantidad(6), r * 1.2, '#868e96', r * 0.25, 0.8, 2);
  }

  barril(x: number, y: number, explosivo: boolean): void {
    this.particulas.rafaga('astilla', x, y, this.cantidad(10), 140, explosivo ? '#c92a2a' : '#b5793a', 6, 0.55);
  }

  golpe(x: number, y: number, k: number): void {
    this.particulas.rafaga('chispa', x, y, this.cantidad(6), 100, '#ff6b6b', 3, 0.35);
    this.texto(x, y + 10, `−${k}`, '#ff6b6b', 14);
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
    if (this.temblor > 0) {
      ctx.translate((Math.random() - 0.5) * this.temblor * 2, (Math.random() - 0.5) * this.temblor * 2);
      this.temblor = Math.max(0, this.temblor - dt * 40);
    }
    const yMin = this.camY - D0 + 40;
    const yMax = this.camY + 950;
    this.fondo(m, yMin, yMax);
    this.dibujarOrdenado(m, alfa, yMin, yMax);
    this.dibujarEscuadra(m, alfa);
    this.dibujarBalas(m, alfa);
    this.dibujarProyectiles(m, alfa);
    this.particulas.actualizar(dt);
    this.particulas.dibujar(ctx, 0, 0, 1, 1, (x, y, s) => {
      if (!this.proy(x, y, 8)) return null;
      return [this.X, this.Y, this.K * s];
    });
    this.dibujarTextos(dt);
    this.dibujarRayos(dt);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private fondo(m: Mundo, yMin: number, yMax: number): void {
    const ctx = this.ctx;
    const e = this.escenario;
    // Cielo y terreno.
    ctx.fillStyle = e.fuera;
    ctx.fillRect(-30, -30, this.cssW + 60, this.cssH + 60);
    const cielo = ctx.createLinearGradient(0, 0, 0, this.cssH * 0.12);
    cielo.addColorStop(0, e.cielo);
    cielo.addColorStop(1, e.fuera);
    ctx.fillStyle = cielo;
    ctx.fillRect(-30, -30, this.cssW + 60, this.cssH * 0.12 + 30);

    const P = ANCHO_PASILLO;
    // Pasillos laterales (elevados, más claros) y camino principal.
    this.cuad([[-30, yMin, 0], [P, yMin, 0], [P, yMax, 0], [-30, yMax, 0]], e.pasillo);
    this.cuad([[ANCHO - P, yMin, 0], [ANCHO + 30, yMin, 0], [ANCHO + 30, yMax, 0], [ANCHO - P, yMax, 0]], e.pasillo);
    this.cuad([[P, yMin, 0], [ANCHO - P, yMin, 0], [ANCHO - P, yMax, 0], [P, yMax, 0]], e.suelo);

    // Marcas del carril.
    const paso = 70;
    for (let y = Math.floor(yMin / paso) * paso; y < yMax; y += paso) {
      this.cuad([[ANCHO / 2 - 1.5, y, 0], [ANCHO / 2 + 1.5, y, 0], [ANCHO / 2 + 1.5, y + 32, 0], [ANCHO / 2 - 1.5, y + 32, 0]], e.linea);
    }
    // Manchas y grietas deterministas por trozos.
    const trozo = 160;
    for (let k = Math.floor(yMin / trozo); k * trozo < yMax; k++) {
      const r = mulberry32(k * 2654435761);
      const x = P + 10 + r() * (ANCHO - 2 * P - 40);
      const y = k * trozo + r() * trozo;
      this.cuad([[x, y, 0], [x + 14 + r() * 16, y, 0], [x + 18, y + 10 + r() * 10, 0], [x + 2, y + 12, 0]], e.detalle);
    }

    // Línea de llegada.
    if (Number.isFinite(m.nivel.largo) && m.nivel.largo > yMin && m.nivel.largo < yMax) {
      const c = 15;
      for (let i = 0; i * c < ANCHO - 2 * P; i++) {
        for (let j = 0; j < 2; j++) {
          const x = P + i * c;
          const y = m.nivel.largo + j * c;
          this.cuad([[x, y, 0], [x + c, y, 0], [x + c, y + c, 0], [x, y + c, 0]], (i + j) % 2 ? '#f1f3f5' : '#212529');
        }
      }
    }

    // Muros metálicos bajos entre los pasillos y el camino (cara interior y borde superior).
    for (const xm of [P, ANCHO - P]) {
      this.cuad([[xm, yMin, 0], [xm, yMax, 0], [xm, yMax, ALTO_MURO], [xm, yMin, ALTO_MURO]], e.borde);
      this.cuad([[xm - 3, yMin, ALTO_MURO], [xm + 3, yMin, ALTO_MURO], [xm + 3, yMax, ALTO_MURO], [xm - 3, yMax, ALTO_MURO]], '#f1f3f5');
      // Postes.
      for (let y = Math.ceil(yMin / 60) * 60; y < yMax; y += 60) {
        if (!this.proy(xm, y, 0)) continue;
        const x0 = this.X;
        const y0 = this.Y;
        this.proy(xm, y, ALTO_MURO);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = Math.max(1, 2 * this.K);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(this.X, this.Y);
        ctx.stroke();
      }
    }
    // Barandas exteriores.
    for (const xm of [0, ANCHO]) {
      this.cuad([[xm, yMin, 0], [xm, yMax, 0], [xm, yMax, ALTO_MURO * 1.4], [xm, yMin, ALTO_MURO * 1.4]], e.borde);
    }

    // Bruma hacia el horizonte.
    const bruma = ctx.createLinearGradient(0, 0, 0, this.cssH * 0.18);
    bruma.addColorStop(0, e.cielo);
    bruma.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = bruma;
    ctx.fillRect(-30, -2, this.cssW + 60, this.cssH * 0.18);
    if (this.noche) {
      ctx.fillStyle = 'rgba(8, 16, 40, 0.3)';
      ctx.fillRect(-30, -30, this.cssW + 60, this.cssH + 60);
    }
  }

  private fuente(tam: number): void {
    this.ctx.font = `900 ${Math.max(6, Math.round(tam))}px ${FUENTE}`;
  }

  private textoContorno(texto: string, x: number, y: number, color: string, tam: number): void {
    const ctx = this.ctx;
    this.fuente(tam);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(2, tam * 0.18);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineJoin = 'round';
    ctx.strokeText(texto, x, y);
    ctx.fillStyle = color;
    ctx.fillText(texto, x, y);
  }

  /** Todo lo que está sobre el camino, de lejos a cerca para que se tape bien. */
  private dibujarOrdenado(m: Mundo, alfa: number, yMin: number, yMax: number): void {
    const l = this.lista;
    l.length = 0;
    const dentro = (y: number) => y > yMin && y < yMax;
    for (const z of m.zombis) if (z.vivo && dentro(z.y)) l.push({ y: lerp(z.py, z.y, alfa), k: 'z', o: z });
    for (const b of m.barriles) if (dentro(b.y)) l.push({ y: b.y, k: 'b', o: b });
    for (const p of m.pasillos) for (const f of p.fichas) if (f.vivo && dentro(f.y)) l.push({ y: f.y, k: 'f', o: f });
    for (const o of m.obstaculos) if (dentro(o.y)) l.push({ y: o.y, k: 'o', o });
    for (const p of m.puertas) if (dentro(p.y)) l.push({ y: p.y, k: 'p', o: p });
    for (const c of m.cajas) if (dentro(c.y)) l.push({ y: c.y, k: 'c', o: c });
    l.sort((a, b) => b.y - a.y);
    for (const d of l) {
      switch (d.k) {
        case 'z':
          this.dibujarZombi(d.o, alfa);
          break;
        case 'b':
          this.dibujarBarril(d.o);
          break;
        case 'f':
          this.dibujarFicha(d.o);
          break;
        case 'o':
          this.dibujarObstaculo(d.o, alfa);
          break;
        case 'p':
          this.dibujarPuertas(d.o);
          break;
        case 'c':
          this.sprite(this.atlas!.caja, d.o.x, d.o.y);
          break;
      }
    }
  }

  private dibujarZombi(z: Zombi, alfa: number): void {
    const atlas = this.atlas!;
    const y = lerp(z.py, z.y, alfa);
    const x = lerp(z.px, z.x, alfa) + Math.sin(this.reloj * 6 + z.id) * 0.8;
    const balanceo = Math.abs(Math.sin(this.reloj * 7 + z.id)) * 1.5;
    this.sprite(z.flash > 0 ? atlas.zombisFlash[z.tipo] : atlas.zombis[z.tipo], x, y, 1.3, balanceo);
    if (z.tipo === 'jefe') {
      // Vida del jefe en grande sobre la cabeza.
      if (!this.proy(x, y, 140)) return;
      const ctx = this.ctx;
      const w = 110 * this.K;
      const h = 18 * this.K;
      ctx.fillStyle = '#c92a2a';
      ctx.fillRect(this.X - w / 2, this.Y - h / 2, w, h);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.X - w / 2, this.Y - h / 2, w, h);
      this.textoContorno(formato(Math.max(0, z.vida)), this.X, this.Y, '#ffffff', 17 * this.K);
    } else if ((z.tipo === 'gordo' || z.tipo === 'gigante' || z.tipo === 'blindado') && z.vida < z.vidaMax) {
      if (!this.proy(x, y, z.r * 3.6)) return;
      const ctx = this.ctx;
      const w = 26 * this.K;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(this.X - w / 2, this.Y, w, 3 * this.K);
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(this.X - w / 2, this.Y, (w * Math.max(0, z.vida)) / z.vidaMax, 3 * this.K);
    }
  }

  private dibujarBarril(b: Barril): void {
    const atlas = this.atlas!;
    if (b.premio === 'arma' || b.premio === 'dano' || b.premio === 'cadencia') {
      if (!b.explosivo) {
        this.dibujarCofre(b);
        return;
      }
    }
    this.sprite(b.explosivo ? atlas.explosivo : b.flash > 0 ? atlas.barrilFlash : atlas.barril, b.x, b.y);
    if (this.proy(b.x, b.y, 22)) this.textoContorno(formato(b.vida), this.X, this.Y, '#ffffff', 13 * this.K);
    if (!b.explosivo) this.sprite(atlas.premios[b.premio], b.x, b.y, 1, 50 + Math.sin(this.reloj * 4 + b.id) * 2);
  }

  /** Cofre de acero en 3D (frente y tapa) con el número de vida grande y el premio encima. */
  private dibujarCofre(b: Barril): void {
    const w = 23;
    const alto = 34;
    const fondo = 26;
    const flash = b.flash > 0;
    this.cuad([[b.x - w, b.y + fondo, alto], [b.x + w, b.y + fondo, alto], [b.x + w, b.y, alto], [b.x - w, b.y, alto]], flash ? '#ffffff' : '#748ffc');
    this.cuad([[b.x - w, b.y, 0], [b.x + w, b.y, 0], [b.x + w, b.y, alto], [b.x - w, b.y, alto]], flash ? '#e7f5ff' : '#3b5bdb', '#1c2f7a');
    // Franja de peligro.
    for (let i = 0; i < 6; i++) {
      const x0 = b.x - w + (i * 2 * w) / 6;
      this.cuad([[x0, b.y, 0], [x0 + (2 * w) / 6, b.y, 0], [x0 + (2 * w) / 6, b.y, 5], [x0, b.y, 5]], i % 2 ? '#212529' : '#fcc419');
    }
    if (this.proy(b.x, b.y, alto * 0.55)) this.textoContorno(formato(b.vida), this.X, this.Y, '#ffffff', 19 * this.K);
    this.sprite(this.atlas!.premios[b.premio], b.x, b.y + fondo / 2, 1.8, alto + 14 + Math.sin(this.reloj * 3 + b.id) * 2);
  }

  /** Ficha del pasillo: panel de pie con volumen («+1» azul o «×k» morado). */
  private dibujarFicha(f: Ficha): void {
    const mult = f.op === 'mult';
    const x0 = f.x - f.w / 2;
    const x1 = f.x + f.w / 2;
    const alto = 26;
    const grosor = 8;
    const flash = f.flash > 0;
    const [cara, tapa, borde] = mult ? ['#9775fa', '#d0bfff', '#5f3dc4'] : ['#4dabf7', '#d0ebff', '#1864ab'];
    this.cuad([[x0, f.y + grosor, alto], [x1, f.y + grosor, alto], [x1, f.y, alto], [x0, f.y, alto]], tapa);
    this.cuad([[x0, f.y, 0], [x1, f.y, 0], [x1, f.y, alto], [x0, f.y, alto]], flash ? '#ffffff' : cara, borde);
    const dano = 1 - f.vida / f.vidaMax;
    if (dano > 0) this.cuad([[x0, f.y, 0], [x1, f.y, 0], [x1, f.y, alto], [x0, f.y, alto]], `rgba(0,0,0,${(dano * 0.45).toFixed(2)})`);
    if (this.proy(f.x, f.y, alto / 2)) this.textoContorno((mult ? '×' : '+') + f.valor, this.X, this.Y, '#ffffff', 21 * this.K);
  }

  private dibujarPuertas(par: ParPuertas): void {
    const P = ANCHO_PASILLO;
    const alto = 40;
    for (let lado = 0; lado < 2; lado++) {
      const p = par.puertas[lado];
      const x0 = lado ? ANCHO / 2 + 3 : P + 4;
      const x1 = lado ? ANCHO - P - 4 : ANCHO / 2 - 3;
      const buena = esBuena(p);
      const a = par.cruzada ? (lado === par.elegida ? 0.25 : 0.1) : 0.62;
      this.cuad(
        [[x0, par.y, 0], [x1, par.y, 0], [x1, par.y, alto], [x0, par.y, alto]],
        buena ? `rgba(34, 139, 230, ${a})` : `rgba(240, 62, 62, ${a})`,
        buena ? '#a5d8ff' : '#ffc9c9',
      );
      if (!par.cruzada && this.proy((x0 + x1) / 2, par.y, alto / 2)) {
        this.textoContorno(textoPuerta(p), this.X, this.Y, '#ffffff', (p.op === 'cadencia' || p.op === 'dano' ? 15 : 22) * this.K);
      }
    }
    for (const x of [P + 2, ANCHO / 2, ANCHO - P - 2]) this.cuad([[x - 2, par.y, 0], [x + 2, par.y, 0], [x + 2, par.y, alto + 4], [x - 2, par.y, alto + 4]], '#343a40');
  }

  private dibujarObstaculo(o: Obstaculo, alfa: number): void {
    if (o.tipo === 'rueda') {
      const s = this.atlas!.rueda;
      if (!this.proy(lerp(o.px, o.x, alfa), o.y, 24)) return;
      const w = s.w * this.K;
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(this.X, this.Y);
      ctx.rotate(o.giro);
      ctx.drawImage(s.img, -w / 2, -w / 2, w, w);
      ctx.restore();
      return;
    }
    // Pinchos: base oscura y una fila de púas metálicas.
    const x0 = o.x - o.ancho / 2;
    this.cuad([[x0, o.y - 6, 0], [x0 + o.ancho, o.y - 6, 0], [x0 + o.ancho, o.y + 6, 4], [x0, o.y + 6, 4]], '#343a40');
    const n = Math.max(3, Math.floor(o.ancho / 12));
    const paso = o.ancho / n;
    const ctx = this.ctx;
    ctx.fillStyle = '#ced4da';
    ctx.strokeStyle = '#495057';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      if (!this.proy(x0 + i * paso, o.y, 2)) return;
      ctx.moveTo(this.X, this.Y);
      this.proy(x0 + (i + 0.5) * paso, o.y, 18);
      ctx.lineTo(this.X, this.Y);
      this.proy(x0 + (i + 1) * paso, o.y, 2);
      ctx.lineTo(this.X, this.Y);
    }
    ctx.fill();
    ctx.stroke();
  }

  private dibujarEscuadra(m: Mundo, alfa: number): void {
    const ctx = this.ctx;
    const atlas = this.atlas!;
    const x = lerp(m.px, m.x, alfa);
    const y = this.camY;
    const r = m.radio;
    if (m.invulnerable > 0 && Math.floor(this.reloj * 12) % 2) ctx.globalAlpha = 0.45;
    if (m.escudo > 0 && this.proy(x, y, 0)) {
      ctx.fillStyle = 'rgba(77, 171, 247, 0.18)';
      ctx.strokeStyle = 'rgba(165, 216, 255, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(this.X, this.Y, (r + 8) * this.K, (r + 8) * this.K * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    const cantidad = Math.min(m.soldados, MAX_VISIBLES);
    for (const i of ORDEN_SOLDADOS) {
      if (i >= cantidad) continue;
      const off = OFFSETS[i];
      const salto = Math.abs(Math.sin(this.reloj * 12 + i * 1.7)) * 1.6;
      this.sprite(atlas.soldado, x + off.x, y - off.y * 0.9, 1.25, salto);
    }
    if (cantidad > 0) this.sprite(atlas.lider, x, y, 1.2, Math.abs(Math.sin(this.reloj * 12)) * 1.6);
    ctx.globalAlpha = 1;
    const t = m.torreta;
    if (t && this.proy(t.x, t.y, 0)) {
      ctx.fillStyle = '#495057';
      ctx.strokeStyle = '#f2c94c';
      ctx.lineWidth = 2;
      ctx.fillRect(this.X - 8 * this.K, this.Y - 16 * this.K, 16 * this.K, 16 * this.K);
      ctx.strokeRect(this.X - 8 * this.K, this.Y - 16 * this.K, 16 * this.K, 16 * this.K);
      ctx.fillStyle = '#212529';
      ctx.fillRect(this.X - 2 * this.K, this.Y - 26 * this.K, 4 * this.K, 12 * this.K);
    }
    // Número de soldados sobre el escuadrón.
    if (m.soldados > 0 && this.proy(x, y + r * 0.4, 66)) this.textoContorno(String(m.soldados), this.X, this.Y, '#ffffff', 24 * this.K);
  }

  private dibujarBalas(m: Mundo, alfa: number): void {
    const ctx = this.ctx;
    for (const c of this.cubetas) c.length = 0;
    m.balas.forEach((b, i) => b.vivo && this.cubetas[b.arma].push(i));
    const brillo = this.calidad !== 'baja';
    for (let nivel = 0; nivel < this.cubetas.length; nivel++) {
      const lista = this.cubetas[nivel];
      if (!lista.length) continue;
      const a = nivel === 0 ? null : ARMAS[nivel - 1];
      const color = a ? a.color : '#63e6be';
      const estilo = a?.estilo ?? 'bala';
      if (estilo === 'llama' || estilo === 'plasma') {
        for (const i of lista) {
          const b = m.balas[i];
          const k = 1 - b.vida / (a!.alcance / a!.velocidad);
          if (!this.proy(lerp(b.px, b.x, alfa), lerp(b.py, b.y, alfa), 10)) continue;
          ctx.globalAlpha = 0.8 * (1 - k * 0.6);
          ctx.fillStyle = estilo === 'llama' ? (k < 0.35 ? '#ffd43b' : '#ff6b1a') : color;
          ctx.beginPath();
          ctx.arc(this.X, this.Y, (b.r + (estilo === 'llama' ? k * 6 : 2)) * this.K, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        continue;
      }
      const largo = estilo === 'laser' ? 0.07 : 0.045;
      const grosor = estilo === 'cohete' ? 5 : estilo === 'laser' ? 2.2 : 2.6;
      // Estela ancha y suave + núcleo brillante (balas doradas como en los anuncios).
      for (const pasada of brillo ? [0, 1] : [1]) {
        // Halo dorado suave y núcleo intenso (gotas de fuego como en los anuncios).
        ctx.strokeStyle = pasada === 0 ? color + '44' : estilo === 'bala' ? '#ffb000' : color;
        ctx.lineCap = 'round';
        ctx.beginPath();
        let kMedio = 0;
        for (const i of lista) {
          const b = m.balas[i];
          const x = lerp(b.px, b.x, alfa);
          const y = lerp(b.py, b.y, alfa);
          if (!this.proy(x - b.vx * largo, y - b.vy * largo, 10)) continue;
          const xa = this.X;
          const ya = this.Y;
          if (!this.proy(x, y, 10)) continue;
          kMedio = this.K;
          ctx.moveTo(xa, ya);
          ctx.lineTo(this.X, this.Y);
        }
        ctx.lineWidth = Math.max(1, grosor * kMedio * (pasada === 0 ? 2 : 0.8));
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  private dibujarProyectiles(m: Mundo, alfa: number): void {
    if (!m.proyectiles.length) return;
    const ctx = this.ctx;
    ctx.fillStyle = '#a9e34b';
    ctx.strokeStyle = '#5c940d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const p of m.proyectiles) {
      if (!this.proy(lerp(p.px, p.x, alfa), lerp(p.py, p.y, alfa), 14)) continue;
      ctx.moveTo(this.X + p.r * this.K, this.Y);
      ctx.arc(this.X, this.Y, p.r * this.K, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
  }

  private dibujarTextos(dt: number): void {
    const ctx = this.ctx;
    let j = 0;
    for (const t of this.textos) {
      t.t += dt;
      if (t.t > 1.1) continue;
      this.textos[j++] = t;
      if (!this.proy(t.x, t.y, 30 + t.t * 40)) continue;
      ctx.globalAlpha = Math.min(1, (1.1 - t.t) * 3);
      this.textoContorno(t.texto, this.X, this.Y, t.color, t.tam * this.K * 1.3 * (t.t < 0.12 ? 0.7 + t.t * 2.5 : 1));
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
      this.rayos[j++] = r;
      if (!this.proy(r.x1, r.y1, 20)) continue;
      const x1 = this.X;
      const y1 = this.Y;
      if (!this.proy(r.x2, r.y2, 20)) continue;
      ctx.globalAlpha = 1 - r.t / 0.35;
      ctx.strokeStyle = '#e5dbff';
      ctx.lineWidth = 6 * this.K * (1 - r.t / 0.35) + 1;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(this.X, this.Y);
      ctx.stroke();
    }
    this.rayos.length = j;
    ctx.globalAlpha = 1;
  }
}

/** Vida en formato corto (1.2k). */
export function formato(v: number): string {
  const n = Math.ceil(v);
  if (n >= 10000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
