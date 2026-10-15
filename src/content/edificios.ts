import type { Estadisticas } from '../core/escuadra';
import type { IdHeroe } from './heroes';

/** Edificios del refugio: mejoras permanentes que se pagan con monedas. */
export type IdEdificio = 'cuartel' | 'armeria' | 'taller' | 'enfermeria' | 'almacen';

export interface Edificio {
  id: IdEdificio;
  nombre: string;
  icono: string;
  descripcion: string;
  max: number;
  costoBase: number;
  /** Texto con el efecto en un nivel dado. */
  efecto: (nivel: number) => string;
}

const pct = (x: number) => `${Math.round(x * 100)} %`;

export const EDIFICIOS: Record<IdEdificio, Edificio> = {
  cuartel: {
    id: 'cuartel',
    nombre: 'Cuartel',
    icono: '🏕️',
    descripcion: 'Más soldados al empezar cada partida.',
    max: 17,
    costoBase: 60,
    efecto: (n) => `${3 + n} soldados iniciales`,
  },
  armeria: {
    id: 'armeria',
    nombre: 'Armería',
    icono: '🛠️',
    descripcion: 'Más daño y, cada 5 niveles, un arma inicial mejor.',
    max: 25,
    costoBase: 80,
    efecto: (n) => `Daño ${pct(1 + 0.06 * n)} · arma inicial nivel ${1 + Math.floor(n / 5)}`,
  },
  taller: {
    id: 'taller',
    nombre: 'Taller',
    icono: '⚙️',
    descripcion: 'Disparas más rápido.',
    max: 20,
    costoBase: 70,
    efecto: (n) => `Cadencia ${pct(1 + 0.05 * n)}`,
  },
  enfermeria: {
    id: 'enfermeria',
    nombre: 'Enfermería',
    icono: '🏥',
    descripcion: 'Escudo inicial que absorbe golpes.',
    max: 12,
    costoBase: 50,
    efecto: (n) => (n ? `Escudo de ${n} golpe${n === 1 ? '' : 's'}` : 'Sin escudo'),
  },
  almacen: {
    id: 'almacen',
    nombre: 'Almacén',
    icono: '📦',
    descripcion: 'Ganas más monedas en cada partida.',
    max: 15,
    costoBase: 60,
    efecto: (n) => `Monedas ${pct(1 + 0.08 * n)}`,
  },
};

export const ORDEN_EDIFICIOS: IdEdificio[] = ['cuartel', 'armeria', 'taller', 'enfermeria', 'almacen'];

/** Costo de subir un edificio desde su nivel actual. */
export function costoMejora(id: IdEdificio, nivel: number): number {
  return Math.round((EDIFICIOS[id].costoBase * 1.28 ** nivel) / 5) * 5;
}

export function nivelesVacios(): Record<IdEdificio, number> {
  return { cuartel: 0, armeria: 0, taller: 0, enfermeria: 0, almacen: 0 };
}

/** Estadísticas iniciales del escuadrón según el refugio y el héroe elegido. */
export function estadisticasDe(niveles: Record<IdEdificio, number>, heroe: IdHeroe): Estadisticas {
  const s: Estadisticas = {
    soldados: 3 + niveles.cuartel,
    arma: 1 + Math.floor(niveles.armeria / 5),
    dano: 1 + 0.06 * niveles.armeria,
    cadencia: 1 + 0.05 * niveles.taller,
    escudo: niveles.enfermeria,
    monedas: 1 + 0.08 * niveles.almacen,
    perfora: 0,
    heroe,
  };
  if (heroe === 'sargento') s.dano *= 1.05;
  if (heroe === 'medica') s.soldados += 2;
  if (heroe === 'ingeniero') s.monedas *= 1.1;
  if (heroe === 'francotiradora') s.perfora += 1;
  return s;
}
