/** Armas del escuadrón. Se mejoran durante la partida con los cofres (nivel 1 a 10). */
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
  /** Cómo se dibuja la bala. */
  estilo: 'bala' | 'llama' | 'cohete' | 'laser' | 'plasma';
}

export const ARMAS: readonly Arma[] = [
  { nombre: 'Pistola', icono: '🔫', dano: 10, cadencia: 2.2, balas: 1, dispersion: 0.02, velocidad: 640, alcance: 540, perfora: 0, area: 0, radio: 2.5, color: '#ffe066', eficacia: 1, sonido: 'disparo', estilo: 'bala' },
  { nombre: 'Subfusil', icono: '🔫', dano: 8, cadencia: 4.2, balas: 1, dispersion: 0.05, velocidad: 680, alcance: 540, perfora: 0, area: 0, radio: 2.5, color: '#ffd43b', eficacia: 1, sonido: 'disparo', estilo: 'bala' },
  { nombre: 'Escopeta', icono: '💥', dano: 9, cadencia: 2.3, balas: 3, dispersion: 0.2, velocidad: 600, alcance: 400, perfora: 0, area: 0, radio: 2.5, color: '#ffa94d', eficacia: 1, sonido: 'escopeta', estilo: 'bala' },
  { nombre: 'Rifle', icono: '🎯', dano: 26, cadencia: 2, balas: 1, dispersion: 0.01, velocidad: 900, alcance: 640, perfora: 2, area: 0, radio: 3, color: '#74c0fc', eficacia: 1.3, sonido: 'disparo', estilo: 'bala' },
  { nombre: 'Ametralladora', icono: '⚙️', dano: 8.5, cadencia: 9, balas: 1, dispersion: 0.06, velocidad: 720, alcance: 560, perfora: 0, area: 0, radio: 2.5, color: '#ffec99', eficacia: 1, sonido: 'disparo', estilo: 'bala' },
  { nombre: 'Lanzallamas', icono: '🔥', dano: 6.5, cadencia: 9, balas: 1, dispersion: 0.16, velocidad: 380, alcance: 270, perfora: 6, area: 0, radio: 7, color: '#ff6b1a', eficacia: 1.4, sonido: 'llama', estilo: 'llama' },
  { nombre: 'Lanzacohetes', icono: '🚀', dano: 42, cadencia: 1.4, balas: 1, dispersion: 0.02, velocidad: 480, alcance: 620, perfora: 0, area: 46, radio: 4, color: '#ff8787', eficacia: 1.5, sonido: 'cohete', estilo: 'cohete' },
  { nombre: 'Láser', icono: '🔷', dano: 28, cadencia: 2.6, balas: 1, dispersion: 0, velocidad: 1400, alcance: 700, perfora: 5, area: 0, radio: 3, color: '#66d9e8', eficacia: 1.3, sonido: 'disparo', estilo: 'laser' },
  { nombre: 'Rayo tesla', icono: '⚡', dano: 22, cadencia: 3.5, balas: 1, dispersion: 0.04, velocidad: 900, alcance: 520, perfora: 0, area: 34, radio: 3, color: '#b197fc', eficacia: 1.4, sonido: 'llama', estilo: 'laser' },
  { nombre: 'Cañón de plasma', icono: '🟣', dano: 70, cadencia: 1.3, balas: 1, dispersion: 0.02, velocidad: 520, alcance: 620, perfora: 0, area: 60, radio: 6, color: '#e599f7', eficacia: 1.5, sonido: 'cohete', estilo: 'plasma' },
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
