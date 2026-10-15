/** Misiones sin fin: cada una tiene escalones con metas cada vez más altas. */
export type IdMision = 'zombis' | 'barriles' | 'jefes' | 'niveles';

export interface Totales {
  zombis: number;
  barriles: number;
  jefes: number;
  niveles: number;
}

export interface Mision {
  id: IdMision;
  icono: string;
  texto: (meta: number) => string;
  meta: (escalon: number) => number;
  premio: (escalon: number) => number;
}

export const MISIONES: Mision[] = [
  { id: 'zombis', icono: '🧟', texto: (m) => `Derrota ${m} zombis`, meta: (e) => 100 * (e + 1) ** 2, premio: (e) => 40 * (e + 1) },
  { id: 'barriles', icono: '🛢️', texto: (m) => `Rompe ${m} barriles`, meta: (e) => 15 * (e + 1) ** 2, premio: (e) => 40 * (e + 1) },
  { id: 'jefes', icono: '👹', texto: (m) => `Derrota ${m} jefe${m === 1 ? '' : 's'}`, meta: (e) => (e + 1) ** 2, premio: (e) => 60 * (e + 1) },
  { id: 'niveles', icono: '🏁', texto: (m) => `Completa ${m} niveles`, meta: (e) => 3 * (e + 1) ** 2, premio: (e) => 50 * (e + 1) },
];

export function totalesVacios(): Totales {
  return { zombis: 0, barriles: 0, jefes: 0, niveles: 0 };
}
