import type { Aspecto } from '../content/aspectos';
import { PREMIOS, type Premio } from '../core/elementos';
import { ZOMBIS, type TipoZombi } from '../core/enemigos';

/**
 * Imagen pre-renderizada con su tamaño en unidades del mundo. Se dibuja de
 * pie (como cartel) con el origen en los pies, salvo `centrado`.
 */
export interface Sprite {
  img: HTMLCanvasElement;
  w: number;
  h: number;
  centrado?: boolean;
}

export interface Atlas {
  soldado: Sprite;
  lider: Sprite;
  zombis: Record<TipoZombi, Sprite>;
  zombisFlash: Record<TipoZombi, Sprite>;
  barril: Sprite;
  barrilFlash: Sprite;
  explosivo: Sprite;
  caja: Sprite;
  rueda: Sprite;
  premios: Record<Premio, Sprite>;
}

/** Crea un sprite con el origen en los pies (abajo al centro), unidades del mundo y y hacia abajo. */
function crear(w: number, h: number, escala: number, dibujar: (ctx: CanvasRenderingContext2D) => void, centrado = false): Sprite {
  const img = document.createElement('canvas');
  img.width = Math.max(1, Math.ceil(w * escala));
  img.height = Math.max(1, Math.ceil(h * escala));
  const ctx = img.getContext('2d')!;
  ctx.scale(img.width / w, img.height / h);
  ctx.translate(w / 2, centrado ? h / 2 : h);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  dibujar(ctx);
  return { img, w, h, centrado };
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
  return { ...s, img };
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

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, relleno: string, radio = 0): void {
  ctx.fillStyle = relleno;
  ctx.beginPath();
  if (radio && ctx.roundRect) ctx.roundRect(x, y, w, h, radio);
  else ctx.rect(x, y, w, h);
  ctx.fill();
}

function sombra(ctx: CanvasRenderingContext2D, ancho: number): void {
  ctx.beginPath();
  ctx.ellipse(0, -0.5, ancho, ancho * 0.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fill();
}

/** Soldado visto de espalda (el escuadrón avanza hacia el fondo). */
function soldado(ctx: CanvasRenderingContext2D, a: Aspecto, k: number, distintivo?: string): void {
  ctx.scale(k, k);
  sombra(ctx, 7);
  const oscuro = 'rgba(0,0,0,0.35)';
  // Piernas y botas.
  rect(ctx, -4.6, -10, 3.6, 9, a.casco, 1);
  rect(ctx, 1, -10, 3.6, 9, a.casco, 1);
  rect(ctx, -5, -2.5, 4.4, 2.5, '#1a1a1a', 1);
  rect(ctx, 0.6, -2.5, 4.4, 2.5, '#1a1a1a', 1);
  // Brazos.
  rect(ctx, -8.6, -20, 3.4, 9, a.uniforme, 1.5);
  rect(ctx, 5.2, -20, 3.4, 9, a.uniforme, 1.5);
  // Torso y chaleco con mochila.
  rect(ctx, -6, -21, 12, 12, a.uniforme, 3);
  rect(ctx, -4.6, -20, 9.2, 9, '#5f6670', 2);
  rect(ctx, -3.4, -18.5, 6.8, 5, '#7b838e', 1.5);
  ctx.strokeStyle = oscuro;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-4, -20);
  ctx.lineTo(-3, -11);
  ctx.moveTo(4, -20);
  ctx.lineTo(3, -11);
  ctx.stroke();
  // Arma asomando a la derecha.
  rect(ctx, 6.2, -26, 1.8, 12, '#202020', 0.5);
  // Casco.
  circulo(ctx, 0, -24.5, 4.8, a.casco, oscuro, 0.8);
  rect(ctx, -4.8, -24.5, 9.6, 1.6, 'rgba(0,0,0,0.25)');
  circulo(ctx, -1.6, -26.3, 1.4, 'rgba(255,255,255,0.35)');
  if (distintivo) {
    rect(ctx, -6, -12, 12, 2.2, distintivo);
    circulo(ctx, 0, -31.5, 2, distintivo, '#000', 0.6);
  }
}

interface ColoresZombi {
  piel: string;
  ropa: string;
  pantalon: string;
  borde: string;
}

const COLORES_ZOMBI: Record<TipoZombi, ColoresZombi> = {
  caminante: { piel: '#8fbf6a', ropa: '#7a6a58', pantalon: '#4b4f5c', borde: '#2f3d24' },
  corredor: { piel: '#a3c98a', ropa: '#4f79a8', pantalon: '#3d3d48', borde: '#2c3b2a' },
  gordo: { piel: '#9cb86a', ropa: '#a8a08a', pantalon: '#55505a', borde: '#38431f' },
  escupidor: { piel: '#c8d65a', ropa: '#6b7d3a', pantalon: '#4a4a3a', borde: '#46501c' },
  explosivo: { piel: '#94a77a', ropa: '#6e5b3e', pantalon: '#3c3a36', borde: '#2c2a20' },
  jefe: { piel: '#c98a5a', ropa: '#3b5bdb', pantalon: '#3b5bdb', borde: '#5a3418' },
  perro: { piel: '#7d6b5a', ropa: '#5c4d3f', pantalon: '#4a3d31', borde: '#2e241b' },
  blindado: { piel: '#8fbf6a', ropa: '#6c757d', pantalon: '#343a40', borde: '#212529' },
  divisor: { piel: '#b197fc', ropa: '#6741d9', pantalon: '#3b2a6e', borde: '#2b1a5e' },
  gigante: { piel: '#5c8a3e', ropa: '#5c4a3a', pantalon: '#3a2f25', borde: '#1f3313' },
};

/** Perro zombi visto de frente: cuerpo bajo, orejas y ojos rojos. */
function perro(ctx: CanvasRenderingContext2D, c: ColoresZombi): void {
  sombra(ctx, 9);
  rect(ctx, -7, -6, 3, 6, c.pantalon, 1);
  rect(ctx, 4, -6, 3, 6, c.pantalon, 1);
  ctx.beginPath();
  ctx.ellipse(0, -10, 8, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = c.piel;
  ctx.fill();
  circulo(ctx, 0, -16, 5.5, c.piel, c.borde, 0.8);
  ctx.fillStyle = c.ropa;
  ctx.beginPath();
  ctx.moveTo(-5, -19);
  ctx.lineTo(-7, -25);
  ctx.lineTo(-2, -21);
  ctx.moveTo(5, -19);
  ctx.lineTo(7, -25);
  ctx.lineTo(2, -21);
  ctx.fill();
  circulo(ctx, -2, -17, 1, '#e03131');
  circulo(ctx, 2, -17, 1, '#e03131');
  rect(ctx, -2.5, -13.5, 5, 2, '#f1f3f5', 0.5);
}

/** Zombi visto de frente, con los brazos hacia el escuadrón. */
function zombi(ctx: CanvasRenderingContext2D, tipo: TipoZombi): void {
  const r = ZOMBIS[tipo].radio;
  const u = r / 11;
  const c = COLORES_ZOMBI[tipo];
  ctx.scale(u, u);
  if (tipo === 'perro') {
    perro(ctx, c);
    return;
  }
  const ancho = tipo === 'gordo' ? 1.45 : tipo === 'jefe' || tipo === 'gigante' ? 1.35 : tipo === 'corredor' ? 0.85 : 1;
  sombra(ctx, 9 * ancho);
  // Piernas.
  rect(ctx, -5 * ancho, -12, 4 * ancho, 11.5, c.pantalon, 1.5);
  rect(ctx, 1 * ancho, -12, 4 * ancho, 11.5, c.pantalon, 1.5);
  // Torso.
  rect(ctx, -7.5 * ancho, -26, 15 * ancho, 15, c.ropa, 4);
  if (tipo === 'gordo' || tipo === 'jefe') {
    ctx.beginPath();
    ctx.ellipse(0, -17, 6.5 * ancho, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = c.piel;
    ctx.fill();
  }
  if (tipo === 'jefe') {
    // Pecho musculoso.
    circulo(ctx, -3.5, -22, 3.6, c.piel, c.borde, 0.7);
    circulo(ctx, 3.5, -22, 3.6, c.piel, c.borde, 0.7);
  }
  if (tipo === 'blindado') {
    rect(ctx, -7, -26, 14, 13, '#adb5bd', 3);
    rect(ctx, -5, -23, 10, 2, '#495057');
    rect(ctx, -5, -19, 10, 2, '#495057');
  }
  if (tipo === 'divisor') {
    circulo(ctx, -4, -20, 2.6, '#e5dbff', c.borde, 0.6);
    circulo(ctx, 3, -17, 2.2, '#e5dbff', c.borde, 0.6);
    circulo(ctx, 2, -23, 1.8, '#e5dbff', c.borde, 0.6);
  }
  if (tipo === 'gigante') {
    circulo(ctx, -3.5, -22, 3.4, c.piel, c.borde, 0.7);
    circulo(ctx, 3.5, -22, 3.4, c.piel, c.borde, 0.7);
  }
  if (tipo === 'explosivo') {
    for (const x of [-4.5, -1.5, 1.5]) rect(ctx, x, -24, 2.4, 9, '#c92a2a', 0.8);
    circulo(ctx, 4.5, -19, 2.2, '#ffd43b');
  }
  // Ropa rota.
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-4 * ancho, -13);
  ctx.lineTo(-2 * ancho, -16);
  ctx.lineTo(0, -12.5);
  ctx.stroke();
  // Brazos estirados hacia adelante (se ven cortos, en escorzo).
  const brazo = tipo === 'jefe' ? 5.5 : 3.6;
  rect(ctx, -7.5 * ancho - brazo + 0.6, -25, brazo, 10, c.piel, 1.8);
  rect(ctx, 7.5 * ancho - 0.6, -25, brazo, 10, c.piel, 1.8);
  circulo(ctx, -7.5 * ancho - brazo / 2 + 0.6, -14.5, brazo * 0.55, c.piel, c.borde, 0.6);
  circulo(ctx, 7.5 * ancho + brazo / 2 - 0.6, -14.5, brazo * 0.55, c.piel, c.borde, 0.6);
  if (tipo === 'escupidor') {
    circulo(ctx, -5, -27, 3, '#e8f55a', c.borde, 0.6);
    circulo(ctx, 5, -27, 3, '#e8f55a', c.borde, 0.6);
  }
  // Cabeza.
  const cabeza = tipo === 'jefe' ? 5 : 5.3;
  circulo(ctx, 0, -30.5, cabeza, c.piel, c.borde, 0.9);
  if (tipo === 'blindado') {
    // Casco militar.
    ctx.fillStyle = '#495057';
    ctx.beginPath();
    ctx.arc(0, -31.5, cabeza + 0.8, Math.PI, Math.PI * 2);
    ctx.fill();
  } else if (tipo === 'jefe' || tipo === 'gigante') {
    rect(ctx, -4, -36, 8, 2, '#3b2a1a', 1);
  } else {
    // Pelo despeinado.
    ctx.fillStyle = '#3b2f24';
    ctx.beginPath();
    ctx.arc(0, -31.5, cabeza, Math.PI * 1.1, Math.PI * 1.9);
    ctx.fill();
  }
  const ojo = tipo === 'jefe' || tipo === 'gigante' ? '#ffd43b' : '#e03131';
  circulo(ctx, -2, -30.5, 1.1, ojo);
  circulo(ctx, 2, -30.5, 1.1, ojo);
  rect(ctx, -2, -27.8, 4, 1.2, '#3b1010', 0.5);
}

/** Barril de madera de pie, con aros de metal. */
function barril(ctx: CanvasRenderingContext2D, explosivo: boolean): void {
  sombra(ctx, 15);
  const [base, oscuro, claro] = explosivo ? ['#d6332a', '#7a1a14', '#f06a5f'] : ['#b5793a', '#6b4320', '#d39a5c'];
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.quadraticCurveTo(-16, -18, -12, -36);
  ctx.lineTo(12, -36);
  ctx.quadraticCurveTo(16, -18, 12, 0);
  ctx.closePath();
  ctx.fillStyle = base;
  ctx.fill();
  ctx.strokeStyle = oscuro;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  if (!explosivo) {
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    for (const x of [-7, 0, 7]) {
      ctx.beginPath();
      ctx.moveTo(x * 0.85, -1);
      ctx.quadraticCurveTo(x * 1.15, -18, x * 0.85, -35);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#ffd43b';
    ctx.beginPath();
    ctx.moveTo(0, -27);
    ctx.lineTo(7, -13);
    ctx.lineTo(-7, -13);
    ctx.closePath();
    ctx.fill();
    rect(ctx, -0.8, -24, 1.6, 6, '#212529');
    rect(ctx, -0.8, -16.5, 1.6, 1.6, '#212529');
  }
  for (const y of [-6, -30]) rect(ctx, -14.5, y - 1.5, 29, 3, '#5c5f66', 1);
  ctx.beginPath();
  ctx.ellipse(0, -36, 12, 3.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = claro;
  ctx.fill();
  ctx.strokeStyle = oscuro;
  ctx.stroke();
  rect(ctx, -9, -26, 2.2, 16, 'rgba(255,255,255,0.18)', 1);
}

function caja(ctx: CanvasRenderingContext2D): void {
  sombra(ctx, 12);
  rect(ctx, -11, -20, 22, 20, '#c08a3e', 2);
  ctx.strokeStyle = '#7a5520';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(-11, -20, 22, 20);
  rect(ctx, -11, -23, 22, 4, '#d9a35a', 1);
  circulo(ctx, 0, -10, 5.5, '#ffd43b', '#f08c00', 1.3);
}

/** Rueda vista de frente (gira sobre su centro). */
function rueda(ctx: CanvasRenderingContext2D): void {
  const r = 24;
  circulo(ctx, 0, 0, r, '#1f1f1f', '#000', 1.5);
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 3;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8);
    ctx.lineTo(Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98);
    ctx.stroke();
  }
  circulo(ctx, 0, 0, r * 0.6, '#3a3a3a');
  ctx.strokeStyle = '#adb5bd';
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55);
    ctx.stroke();
  }
  circulo(ctx, 0, 0, r * 0.22, '#dee2e6', '#495057', 1.5);
}

function icono(ctx: CanvasRenderingContext2D, texto: string, tam: number): void {
  circulo(ctx, 0, 0, tam * 0.62, 'rgba(0,0,0,0.55)', 'rgba(255,255,255,0.8)', 1);
  ctx.font = `${tam * 0.78}px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, 0, tam * 0.05);
}

/** Pre-renderiza todos los dibujos a la escala indicada (px por unidad del mundo). */
export function crearAtlas(escala: number, aspecto: Aspecto, colorHeroe: string): Atlas {
  const zombis = {} as Record<TipoZombi, Sprite>;
  const zombisFlash = {} as Record<TipoZombi, Sprite>;
  for (const tipo of Object.keys(ZOMBIS) as TipoZombi[]) {
    const u = ZOMBIS[tipo].radio / 11;
    zombis[tipo] = crear(26 * u, 38 * u, escala, (ctx) => zombi(ctx, tipo));
    zombisFlash[tipo] = blanco(zombis[tipo]);
  }
  const premios = {} as Record<Premio, Sprite>;
  for (const p of Object.keys(PREMIOS) as Premio[]) premios[p] = crear(16, 16, escala, (ctx) => icono(ctx, PREMIOS[p].icono, 14), true);
  const barrilSprite = crear(34, 42, escala, (ctx) => barril(ctx, false));
  return {
    soldado: crear(20, 34, escala, (ctx) => soldado(ctx, aspecto, 1)),
    lider: crear(28, 50, escala, (ctx) => soldado(ctx, aspecto, 1.3, colorHeroe)),
    zombis,
    zombisFlash,
    barril: barrilSprite,
    barrilFlash: blanco(barrilSprite),
    explosivo: crear(34, 42, escala, (ctx) => barril(ctx, true)),
    caja: crear(28, 28, escala, caja),
    rueda: crear(52, 52, escala, rueda, true),
    premios,
  };
}
