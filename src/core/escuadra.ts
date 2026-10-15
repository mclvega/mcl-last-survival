import type { IdHeroe } from '../content/heroes';

/** Estadísticas con las que el escuadrón empieza una partida (refugio + héroe). */
export interface Estadisticas {
  soldados: number;
  /** Nivel de arma inicial (1 a 6). */
  arma: number;
  /** Multiplicadores. */
  dano: number;
  cadencia: number;
  /** Golpes que absorbe el escudo inicial. */
  escudo: number;
  monedas: number;
  /** Enemigos extra que atraviesa cada bala. */
  perfora: number;
  heroe: IdHeroe;
}

/** Distancia entre soldados en la formación. */
export const ESPACIADO = 12;
const ANILLOS_MAX = 4;

/** Posiciones de la formación en panal (anillo a anillo, el líder en el centro). */
export const OFFSETS: ReadonlyArray<{ x: number; y: number }> = (() => {
  const dirs = [
    [1, 0],
    [1, -1],
    [0, -1],
    [-1, 0],
    [-1, 1],
    [0, 1],
  ];
  const puntos = [{ x: 0, y: 0 }];
  for (let k = 1; k <= ANILLOS_MAX; k++) {
    let q = -k;
    let r = k;
    for (let lado = 0; lado < 6; lado++) {
      for (let paso = 0; paso < k; paso++) {
        puntos.push({ x: ESPACIADO * (q + r / 2), y: ESPACIADO * ((r * Math.sqrt(3)) / 2) });
        q += dirs[lado][0];
        r += dirs[lado][1];
      }
    }
  }
  return puntos;
})();

export const MAX_VISIBLES = OFFSETS.length;

/** Anillos que ocupa una formación de n soldados. */
export function anillos(n: number): number {
  let k = 0;
  while (1 + 3 * k * (k + 1) < n && k < ANILLOS_MAX) k++;
  return k;
}

/** Radio del escuadrón (colisiones y dibujo). */
export function radioEscuadra(n: number): number {
  if (n <= 1) return 9;
  const base = anillos(n) * ESPACIADO + 8;
  // Más allá de los visibles crece poco y con tope, para que el escuadrón quepa en el carril.
  return n > MAX_VISIBLES ? Math.min(base + 14, base + (Math.sqrt(n) - Math.sqrt(MAX_VISIBLES)) * 4) : base;
}
