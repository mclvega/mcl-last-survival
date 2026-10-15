import type { TipoNivel } from '../core/dificultad';
import { MISIONES, type IdMision } from '../content/misiones';
import type { Guardado } from '../storage';

/** Recompensa diaria con racha de 7 días (el día 3 y el 7 dan una ficha de rescate). */
export const DIARIA: Array<{ monedas: number; fichas: number }> = [
  { monedas: 50, fichas: 0 },
  { monedas: 80, fichas: 0 },
  { monedas: 100, fichas: 1 },
  { monedas: 130, fichas: 0 },
  { monedas: 160, fichas: 0 },
  { monedas: 200, fichas: 0 },
  { monedas: 300, fichas: 1 },
];

export function claveDia(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Monedas por completar un nivel (antes de sumar las de los zombis). */
export function premioNivel(n: number, tipo: TipoNivel, estrellas: number): number {
  return Math.round((30 + 3 * n) * (0.6 + 0.2 * estrellas) * (tipo === 'jefe' ? 2 : 1));
}

/** Monedas que dejan los zombis y cajas de la partida, con el bonus del almacén. */
export function monedasPartida(recogidas: number, multiplicador: number): number {
  return Math.round(recogidas * 0.5 * multiplicador);
}

export function costoRevivir(n: number): number {
  return 60 + 5 * n;
}

export function sumarMonedas(g: Guardado, cantidad: number): void {
  g.monedas += Math.max(0, Math.round(cantidad));
}

export function gastarMonedas(g: Guardado, cantidad: number): boolean {
  if (g.monedas < cantidad) return false;
  g.monedas -= cantidad;
  return true;
}

export function puedeReclamarDiaria(g: Guardado, hoy: string): boolean {
  return g.racha.ultima !== hoy;
}

/** Día de la racha (0 a 6) que se cobraría hoy. */
export function diaDeRacha(g: Guardado, ayer: string): number {
  return g.racha.ultima === ayer ? g.racha.dias % DIARIA.length : 0;
}

export function reclamarDiaria(g: Guardado, hoy: string, ayer: string): { monedas: number; fichas: number; dia: number } | null {
  if (!puedeReclamarDiaria(g, hoy)) return null;
  const dia = diaDeRacha(g, ayer);
  const premio = DIARIA[dia];
  g.racha = { dias: dia + 1, ultima: hoy };
  sumarMonedas(g, premio.monedas);
  g.fichasRescate += premio.fichas;
  return { ...premio, dia };
}

export function progresoMision(g: Guardado, id: IdMision): { escalon: number; meta: number; actual: number; premio: number; lista: boolean } {
  const m = MISIONES.find((x) => x.id === id)!;
  const escalon = g.misiones[id];
  const meta = m.meta(escalon);
  const actual = g.totales[id];
  return { escalon, meta, actual, premio: m.premio(escalon), lista: actual >= meta };
}

export function misionesListas(g: Guardado): number {
  return MISIONES.filter((m) => progresoMision(g, m.id).lista).length;
}

export function cobrarMision(g: Guardado, id: IdMision): number {
  const p = progresoMision(g, id);
  if (!p.lista) return 0;
  g.misiones[id]++;
  sumarMonedas(g, p.premio);
  return p.premio;
}
