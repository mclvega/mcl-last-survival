import type { Aspecto } from '../content/aspectos';
import { PREMIOS, type Premio } from '../core/elementos';
import { ZOMBIS, type TipoZombi } from '../core/enemigos';

/** Imagen pre-renderizada con su tamaño en unidades del mundo. */
export interface Sprite {
  img: HTMLCanvasElement;
  w: number;
  h: number;
}

export interface Atlas {
  soldado: Sprite;
  lider: Sprite;
  zombis: Record<TipoZombi, Sprite>;
  zombisFlash: Record<TipoZombi, Sprite>;
  barril: Sprite;
  barrilFlash: Sprite;
  explosivo: Sprite;
  cofre: Sprite;
  cofreFlash: Sprite;
  caja: Sprite;
  rueda: Sprite;
  premios: Record<Premio, Sprite>;
}

/** Crea un sprite dibujando con el origen en su centro (unidades del mundo, y hacia abajo). */
function crear(w: number, h: number, escala: number, dibujar: (ctx: CanvasRenderingContext2D) => void): Sprite {
  const img = document.createElement('canvas');
  img.width = Math.max(1, Math.ceil(w * escala));
  img.height = Math.max(1, Math.ceil(h * escala));
  const ctx = img.getContext('2d')!;
  ctx.scale(img.width / w, img.height / h);
  ctx.translate(w / 2, h / 2);
  dibujar(ctx);
  return { img, w, h };
}

/** Variante blanca para el destello al recibir daño. */
function blanco(s: Sprite): Sprite {
  const img = document.createElement('canvas');
  img.width = s.img.width;
  img.height = s.img.height;
  const ctx = img.getContext('2d')!;
  ctx.drawImage(s.img, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fillRect(0, 0, img.width, img.height);
  return { img, w: s.w, h: s.h };
}

function circulo(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, relleno: string, borde?: string, grosor = 1): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = relleno;
  ctx.fill();
  if (borde) {
    ctx.strokeStyle = borde;
    ctx.lineWidth = grosor;
    ctx.stroke();
  }
}

function sombra(ctx: CanvasRenderingContext2D, r: number): void {
  ctx.beginPath();
  ctx.ellipse(0, r * 0.35, r, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.fill();
}

function soldado(ctx: CanvasRenderingContext2D, a: Aspecto, k: number, anillo?: string): void {
  ctx.scale(k, k);
  sombra(ctx, 5.5);
  ctx.fillStyle = '#1f1f1f';
  ctx.fillRect(1.4, -9.5, 1.6, 8);
  circulo(ctx, 0, 0, 5, a.uniforme, 'rgba(0,0,0,0.45)', 0.9);
  circulo(ctx, 0, -0.5, 3.6, a.casco, 'rgba(0,0,0,0.35)', 0.6);
  circulo(ctx, -1.1, -1.7, 1, 'rgba(255,255,255,0.35)');
  if (anillo) {
    ctx.beginPath();
    ctx.arc(0, 0, 6.6, 0, Math.PI * 2);
    ctx.strokeStyle = anillo;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
}

const COLORES_ZOMBI: Record<TipoZombi, { cuerpo: string; cabeza: string; borde: string }> = {
  caminante: { cuerpo: '#5e8c3a', cabeza: '#93c35e', borde: '#2f4a1c' },
  corredor: { cuerpo: '#3f7d5c', cabeza: '#8fd19e', borde: '#1f4232' },
  gordo: { cuerpo: '#6d7b2f', cabeza: '#a9bd5a', borde: '#363d14' },
  escupidor: { cuerpo: '#8a7b1f', cabeza: '#d4e157', borde: '#463e0c' },
  explosivo: { cuerpo: '#5a4a2e', cabeza: '#a38f5e', borde: '#2c2416' },
  jefe: { cuerpo: '#4b6b2a', cabeza: '#7fa34a', borde: '#1f2d10' },
};

function zombi(ctx: CanvasRenderingContext2D, tipo: TipoZombi): void {
  const r = ZOMBIS[tipo].radio;
  const c = COLORES_ZOMBI[tipo];
  sombra(ctx, r);
  if (tipo === 'jefe') {
    ctx.fillStyle = '#c92a2a';
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.15) * r * 0.8, Math.sin(a - 0.15) * r * 0.8 - r * 0.1);
      ctx.lineTo(Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.15 - r * 0.1);
      ctx.lineTo(Math.cos(a + 0.15) * r * 0.8, Math.sin(a + 0.15) * r * 0.8 - r * 0.1);
      ctx.fill();
    }
  }
  // Brazos estirados hacia el escuadrón.
  ctx.strokeStyle = c.cuerpo;
  ctx.lineCap = 'round';
  ctx.lineWidth = r * 0.36;
  ctx.beginPath();
  ctx.moveTo(-r * 0.62, 0);
  ctx.lineTo(-r * 0.5, r * 0.95);
  ctx.moveTo(r * 0.62, 0);
  ctx.lineTo(r * 0.58, r * 0.9);
  ctx.stroke();
  circulo(ctx, -r * 0.5, r * 0.98, r * 0.2, c.cabeza);
  circulo(ctx, r * 0.58, r * 0.93, r * 0.2, c.cabeza);
  circulo(ctx, 0, -r * 0.1, r * 0.85, c.cuerpo, c.borde, Math.max(1, r * 0.08));
  if (tipo === 'gordo') circulo(ctx, 0, -r * 0.2, r * 0.5, '#c3d07a');
  if (tipo === 'escupidor') {
    circulo(ctx, -r * 0.6, -r * 0.35, r * 0.32, '#e8f55a', c.borde);
    circulo(ctx, r * 0.6, -r * 0.35, r * 0.32, '#e8f55a', c.borde);
  }
  if (tipo === 'explosivo') {
    circulo(ctx, 0, -r * 0.25, r * 0.45, '#ff922b', '#d9480f', 1.2);
    ctx.fillStyle = '#c92a2a';
    ctx.fillRect(-r * 0.35, -r * 0.55, r * 0.2, r * 0.55);
    ctx.fillRect(r * 0.15, -r * 0.55, r * 0.2, r * 0.55);
  }
  circulo(ctx, 0, r * 0.18, r * 0.55, c.cabeza, c.borde, Math.max(0.8, r * 0.06));
  const ojo = tipo === 'jefe' ? '#ffd43b' : '#ff3b3b';
  circulo(ctx, -r * 0.2, r * 0.3, r * 0.11, ojo);
  circulo(ctx, r * 0.2, r * 0.3, r * 0.11, ojo);
  ctx.strokeStyle = c.borde;
  ctx.lineWidth = Math.max(0.8, r * 0.07);
  ctx.beginPath();
  ctx.moveTo(-r * 0.18, r * 0.5);
  ctx.lineTo(r * 0.18, r * 0.5);
  ctx.stroke();
  if (tipo === 'jefe') {
    ctx.strokeStyle = '#3b1010';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.5);
    ctx.lineTo(-r * 0.1, -r * 0.2);
    ctx.moveTo(r * 0.3, -r * 0.6);
    ctx.lineTo(r * 0.45, -r * 0.25);
    ctx.stroke();
  }
}

function barril(ctx: CanvasRenderingContext2D, explosivo: boolean): void {
  const r = explosivo ? 15 : 17;
  sombra(ctx, r);
  const [base, oscuro, claro] = explosivo ? ['#d6332a', '#7a1a14', '#f06a5f'] : ['#a0662b', '#5c3a17', '#c08447'];
  circulo(ctx, 0, 0, r, base, oscuro, 2);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
  ctx.strokeStyle = oscuro;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  if (explosivo) {
    ctx.fillStyle = '#ffd43b';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.55);
    ctx.lineTo(r * 0.55, r * 0.4);
    ctx.lineTo(-r * 0.55, r * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#212529';
    ctx.fillRect(-1, -r * 0.25, 2, r * 0.38);
    ctx.fillRect(-1, r * 0.2, 2, 2);
  } else {
    ctx.strokeStyle = claro;
    ctx.lineWidth = 1;
    for (const x of [-r * 0.35, 0, r * 0.35]) {
      ctx.beginPath();
      ctx.moveTo(x, -r * 0.6);
      ctx.lineTo(x, r * 0.6);
      ctx.stroke();
    }
  }
  circulo(ctx, -r * 0.4, -r * 0.45, r * 0.15, 'rgba(255,255,255,0.3)');
}

/** Cofre de acero para el premio de arma (más grande que un barril). */
function cofre(ctx: CanvasRenderingContext2D): void {
  sombra(ctx, 22);
  ctx.fillStyle = '#3b5bdb';
  ctx.strokeStyle = '#1c2f7a';
  ctx.lineWidth = 2;
  ctx.fillRect(-21, -19, 42, 38);
  ctx.strokeRect(-21, -19, 42, 38);
  ctx.fillStyle = '#5c7cfa';
  ctx.fillRect(-21, -19, 42, 9);
  // Franja de peligro abajo.
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? '#212529' : '#fcc419';
    ctx.fillRect(-21 + i * 7, 13, 7, 6);
  }
}

function caja(ctx: CanvasRenderingContext2D): void {
  sombra(ctx, 12);
  ctx.fillStyle = '#c08a3e';
  ctx.strokeStyle = '#7a5520';
  ctx.lineWidth = 1.6;
  ctx.fillRect(-11, -11, 22, 22);
  ctx.strokeRect(-11, -11, 22, 22);
  ctx.beginPath();
  ctx.moveTo(-11, -11);
  ctx.lineTo(11, 11);
  ctx.stroke();
  circulo(ctx, 0, 0, 6, '#ffd43b', '#f08c00', 1.4);
}

function rueda(ctx: CanvasRenderingContext2D): void {
  const r = 24;
  circulo(ctx, 0, 0, r, '#1f1f1f', '#000', 1.5);
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8);
    ctx.lineTo(Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98);
    ctx.stroke();
  }
  circulo(ctx, 0, 0, r * 0.6, '#3a3a3a');
  ctx.strokeStyle = '#8a8a8a';
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55);
    ctx.stroke();
  }
  circulo(ctx, 0, 0, r * 0.22, '#adb5bd', '#495057', 1.5);
}

function icono(ctx: CanvasRenderingContext2D, texto: string, tam: number): void {
  circulo(ctx, 0, 0, tam * 0.62, 'rgba(0,0,0,0.55)', 'rgba(255,255,255,0.7)', 1);
  ctx.font = `${tam * 0.78}px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, 0, tam * 0.05);
}

/** Pre-renderiza todos los dibujos a la escala de la pantalla (px por unidad del mundo). */
export function crearAtlas(escala: number, aspecto: Aspecto, colorHeroe: string): Atlas {
  const zombis = {} as Record<TipoZombi, Sprite>;
  const zombisFlash = {} as Record<TipoZombi, Sprite>;
  for (const tipo of Object.keys(ZOMBIS) as TipoZombi[]) {
    const lado = ZOMBIS[tipo].radio * 2.6 + 4;
    zombis[tipo] = crear(lado, lado, escala, (ctx) => zombi(ctx, tipo));
    zombisFlash[tipo] = blanco(zombis[tipo]);
  }
  const premios = {} as Record<Premio, Sprite>;
  for (const p of Object.keys(PREMIOS) as Premio[]) premios[p] = crear(16, 16, escala, (ctx) => icono(ctx, PREMIOS[p].icono, 14));
  const barrilSprite = crear(40, 44, escala, (ctx) => barril(ctx, false));
  const cofreSprite = crear(48, 50, escala, cofre);
  return {
    soldado: crear(14, 22, escala, (ctx) => soldado(ctx, aspecto, 1)),
    lider: crear(20, 30, escala, (ctx) => soldado(ctx, aspecto, 1.35, colorHeroe)),
    zombis,
    zombisFlash,
    barril: barrilSprite,
    barrilFlash: blanco(barrilSprite),
    explosivo: crear(36, 40, escala, (ctx) => barril(ctx, true)),
    cofre: cofreSprite,
    cofreFlash: blanco(cofreSprite),
    caja: crear(28, 30, escala, caja),
    rueda: crear(52, 52, escala, rueda),
    premios,
  };
}
