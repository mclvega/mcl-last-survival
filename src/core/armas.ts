/** Armas del escuadrón. Se mejoran durante la partida con los barriles (nivel 1 a 6). */
export interface Arma {
  nombre: string;
  icono: string;
  /** Daño de cada bala por soldado. */
  dano: number;
  /** Ráfagas por segundo. */
  cadencia: number;
  /** Balas por ráfaga (abanico). */
  balas: number;
  dispersion: number;
  velocidad: number;
  alcance: number;
  /** Enemigos extra que atraviesa cada bala con daño completo. */
  perfora: number;
  /** Radio de daño en área al impactar (0 = sin área). */
  area: number;
  radio: number;
  color: string;
  /** Factor aproximado de ventaja (perforación, área) para el balance. */
  eficacia: number;
  sonido: 'disparo' | 'escopeta' | 'llama' | 'cohete';
}

export const ARMAS: readonly Arma[] = [
  { nombre: 'Pistola', icono: '🔫', dano: 10, cadencia: 2.2, balas: 1, dispersion: 0.02, velocidad: 640, alcance: 540, perfora: 0, area: 0, radio: 2.5, color: '#ffe066', eficacia: 1, sonido: 'disparo' },
  { nombre: 'Subfusil', icono: '🔫', dano: 8, cadencia: 4.2, balas: 1, dispersion: 0.05, velocidad: 680, alcance: 540, perfora: 0, area: 0, radio: 2.5, color: '#ffd43b', eficacia: 1, sonido: 'disparo' },
  { nombre: 'Escopeta', icono: '💥', dano: 9, cadencia: 2.3, balas: 3, dispersion: 0.2, velocidad: 600, alcance: 400, perfora: 0, area: 0, radio: 2.5, color: '#ffa94d', eficacia: 1, sonido: 'escopeta' },
  { nombre: 'Rifle', icono: '🎯', dano: 26, cadencia: 2, balas: 1, dispersion: 0.01, velocidad: 900, alcance: 640, perfora: 2, area: 0, radio: 3, color: '#74c0fc', eficacia: 1.3, sonido: 'disparo' },
  { nombre: 'Lanzallamas', icono: '🔥', dano: 6.5, cadencia: 9, balas: 1, dispersion: 0.16, velocidad: 380, alcance: 270, perfora: 6, area: 0, radio: 7, color: '#ff6b1a', eficacia: 1.4, sonido: 'llama' },
  { nombre: 'Lanzacohetes', icono: '🚀', dano: 42, cadencia: 1.4, balas: 1, dispersion: 0.02, velocidad: 480, alcance: 620, area: 46, perfora: 0, radio: 4, color: '#ff8787', eficacia: 1.5, sonido: 'cohete' },
];

export const NIVEL_ARMA_MAX = ARMAS.length;

export function arma(nivel: number): Arma {
  return ARMAS[Math.min(NIVEL_ARMA_MAX, Math.max(1, Math.floor(nivel))) - 1];
}

/** Daño por segundo aproximado de un soldado. */
export function dpsSoldado(nivel: number, dano: number, cadencia: number): number {
  const a = arma(nivel);
  return a.dano * a.cadencia * a.balas * a.eficacia * dano * cadencia;
}
