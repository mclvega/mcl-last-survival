/** Partículas con pool: polvo, chispas, explosiones, astillas, monedas y confeti. */
export type TipoParticula = 'chispa' | 'polvo' | 'explosion' | 'humo' | 'astilla' | 'moneda' | 'confeti' | 'destello';

export interface Particula {
  tipo: TipoParticula;
  x: number;
  y: number;
  vx: number;
  vy: number;
  vida: number;
  vidaMax: number;
  tam: number;
  color: string;
  giro: number;
  vgiro: number;
  gravedad: number;
  roce: number;
}

const COLORES_CONFETI = ['#ffd43b', '#ff6b6b', '#4dabf7', '#69db7c', '#b197fc', '#ff922b'];

/**
 * Sistema de partículas. Las coordenadas son del espacio de quien lo usa:
 * el mundo del juego (y hacia arriba) o la pantalla (y hacia abajo).
 */
export class SistemaParticulas {
  private vivas: Particula[] = [];
  private libres: Particula[] = [];
  max = 400;

  get cantidad(): number {
    return this.vivas.length;
  }

  limpiar(): void {
    this.libres.push(...this.vivas);
    this.vivas.length = 0;
  }

  private nueva(tipo: TipoParticula, x: number, y: number): Particula | null {
    if (this.vivas.length >= this.max) return null;
    const p = this.libres.pop() ?? ({} as Particula);
    p.tipo = tipo;
    p.x = x;
    p.y = y;
    p.vx = 0;
    p.vy = 0;
    p.vida = 0;
    p.vidaMax = 0.5;
    p.tam = 3;
    p.color = '#fff';
    p.giro = 0;
    p.vgiro = 0;
    p.gravedad = 0;
    p.roce = 0;
    this.vivas.push(p);
    return p;
  }

  /** Estallido radial genérico. */
  rafaga(tipo: TipoParticula, x: number, y: number, cantidad: number, rapidez: number, color: string, tam: number, vida: number, roce = 3): void {
    for (let i = 0; i < cantidad; i++) {
      const p = this.nueva(tipo, x, y);
      if (!p) return;
      const ang = Math.random() * Math.PI * 2;
      const v = rapidez * (0.4 + Math.random() * 0.8);
      p.vx = Math.cos(ang) * v;
      p.vy = Math.sin(ang) * v;
      p.vidaMax = vida * (0.7 + Math.random() * 0.6);
      p.tam = tam * (0.7 + Math.random() * 0.6);
      p.color = color;
      p.giro = Math.random() * Math.PI;
      p.vgiro = (Math.random() - 0.5) * 12;
      p.roce = roce;
    }
  }

  /** Onda de una explosión (anillo que crece). */
  onda(x: number, y: number, radio: number, color: string): void {
    const p = this.nueva('explosion', x, y);
    if (!p) return;
    p.tam = radio;
    p.vidaMax = 0.35;
    p.color = color;
  }

  confeti(ancho: number, cantidad: number): void {
    for (let i = 0; i < cantidad; i++) {
      const p = this.nueva('confeti', Math.random() * ancho, -20 - Math.random() * 200);
      if (!p) return;
      p.vx = (Math.random() - 0.5) * 80;
      p.vy = 120 + Math.random() * 160;
      p.vidaMax = 3 + Math.random() * 1.5;
      p.tam = 7 + Math.random() * 7;
      p.color = COLORES_CONFETI[Math.floor(Math.random() * COLORES_CONFETI.length)];
      p.giro = Math.random() * Math.PI;
      p.vgiro = (Math.random() - 0.5) * 10;
    }
  }

  actualizar(dt: number): void {
    let j = 0;
    for (let i = 0; i < this.vivas.length; i++) {
      const p = this.vivas[i];
      p.vida += dt;
      if (p.vida >= p.vidaMax) {
        this.libres.push(p);
        continue;
      }
      if (p.roce) {
        const f = Math.max(0, 1 - p.roce * dt);
        p.vx *= f;
        p.vy *= f;
      }
      p.vy += p.gravedad * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.giro += p.vgiro * dt;
      this.vivas[j++] = p;
    }
    this.vivas.length = j;
  }

  /**
   * Dibuja con la transformación sx = ox + x·esc, sy = oy + signoY·y·esc.
   * Con el mundo del juego signoY es −1 (la y crece hacia arriba).
   */
  dibujar(
    ctx: CanvasRenderingContext2D,
    ox: number,
    oy: number,
    esc: number,
    signoY: number,
    proyectar?: (x: number, y: number, escala: number) => [number, number, number] | null,
  ): void {
    for (const p of this.vivas) {
      let sx = ox + p.x * esc;
      let sy = oy + signoY * p.y * esc;
      let s = p.tam * esc;
      if (proyectar) {
        const r = proyectar(p.x, p.y, 1);
        if (!r) continue;
        [sx, sy] = r;
        s = p.tam * r[2];
      }
      const k = p.vida / p.vidaMax;
      switch (p.tipo) {
        case 'chispa':
        case 'destello':
          ctx.globalAlpha = 1 - k;
          ctx.fillStyle = p.color;
          ctx.fillRect(sx - s / 2, sy - s / 2, s, s);
          break;
        case 'polvo':
        case 'humo': {
          ctx.globalAlpha = (1 - k) * (p.tipo === 'humo' ? 0.45 : 0.75);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(sx, sy, s * (0.6 + k * 0.9), 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'explosion': {
          ctx.globalAlpha = (1 - k) * 0.9;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(1, s * 0.18 * (1 - k));
          ctx.beginPath();
          ctx.arc(sx, sy, s * (0.3 + k * 0.8), 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = (1 - k) * 0.35;
          ctx.fillStyle = p.color;
          ctx.fill();
          break;
        }
        case 'astilla':
        case 'confeti':
          ctx.globalAlpha = p.tipo === 'confeti' ? 1 - Math.max(0, k - 0.8) * 5 : 1 - k;
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(p.giro);
          ctx.fillStyle = p.color;
          ctx.fillRect(-s / 2, -s / 4, s, s / 2);
          ctx.restore();
          break;
        case 'moneda':
          ctx.globalAlpha = 1 - k * k;
          ctx.fillStyle = '#ffd43b';
          ctx.beginPath();
          ctx.arc(sx, sy, s, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#f08c00';
          ctx.fillRect(sx - s * 0.2, sy - s * 0.55, s * 0.4, s * 1.1);
          break;
      }
    }
    ctx.globalAlpha = 1;
  }
}
