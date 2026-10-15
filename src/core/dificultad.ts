import { estadisticasDe, EDIFICIOS, ORDEN_EDIFICIOS, nivelesVacios } from '../content/edificios';
import { dpsSoldado } from './armas';
import { ZOMBIS, type TipoZombi } from './enemigos';
import type { Estadisticas } from './escuadra';
import { rngFrom } from './rng';

export type Dificultad = 'facil' | 'normal' | 'dificil' | 'experto' | 'pesadilla';

export const MODOS: Record<Dificultad, { nombre: string; icono: string; fraccion: [number, number] }> = {
  facil: { nombre: 'Fácil', icono: '🙂', fraccion: [0.75, 1] },
  normal: { nombre: 'Normal', icono: '😐', fraccion: [1, 1.35] },
  dificil: { nombre: 'Difícil', icono: '😈', fraccion: [1.3, 1.75] },
  experto: { nombre: 'Experto', icono: '🔥', fraccion: [1.6, 2.1] },
  pesadilla: { nombre: 'Pesadilla', icono: '💀', fraccion: [2, 2.6] },
};

/** Cada 10 niveles hay un jefe especial (premio doble) y cada 5 un nivel de descanso. */
export type TipoNivel = 'normal' | 'descanso' | 'jefe';

export type TipoObstaculo = 'pinchos' | 'rueda';

export interface ParamsNivel {
  n: number;
  dificultad: Dificultad;
  tipo: TipoNivel;
  tutorial: boolean;
  masFacil: boolean;
  numTramos: number;
  zombis: TipoZombi[];
  obstaculos: TipoObstaculo[];
  puertasNegativas: boolean;
  /** Fracción del poder esperado del escuadrón que se convierte en vida enemiga. */
  fraccion: number;
  /** Segundos de fuego completo que aguanta el jefe. */
  tiempoJefe: number;
}

export function tipoNivel(n: number): TipoNivel {
  if (n % 10 === 0) return 'jefe';
  if (n % 5 === 0) return 'descanso';
  return 'normal';
}

/** Parámetros del nivel n: suben despacio hasta un techo y después varían un poco. */
export function paramsNivel(n: number, dificultad: Dificultad, masFacil = false): ParamsNivel {
  const tipo = tipoNivel(n);
  const tutorial = n <= 3;
  const t = Math.min(1, (n - 1) / 60);
  const [a, b] = MODOS[dificultad].fraccion;
  let fraccion = a + (b - a) * t;
  if (n > 60) fraccion += (rngFrom(`variacion:${n}`)() - 0.5) * 0.08;
  if (tipo === 'descanso') fraccion *= 0.8;
  if (tutorial) fraccion *= 0.7;
  if (masFacil) fraccion *= 0.75;

  const zombis = (Object.keys(ZOMBIS) as TipoZombi[]).filter((z) => z !== 'jefe' && ZOMBIS[z].desde <= n);
  const obstaculos: TipoObstaculo[] = [];
  if (n >= 6) obstaculos.push('pinchos');
  if (n >= 14) obstaculos.push('rueda');

  return {
    n,
    dificultad,
    tipo,
    tutorial,
    masFacil,
    numTramos: tutorial ? Math.min(3, n + 1) : 3 + Math.floor(t * 3),
    zombis,
    obstaculos,
    puertasNegativas: n >= 5,
    fraccion,
    tiempoJefe: (10 + 8 * t) * (tipo === 'jefe' ? 1.4 : 1),
  };
}

/**
 * Jugador de referencia para el nivel n: el refugio que se espera tener a esa
 * altura del juego. El generador ajusta la vida de los zombis a este jugador,
 * así el nivel n es igual para todos y mejorar el refugio sí se nota.
 */
export function estadisticasReferencia(n: number): Estadisticas {
  const niveles = nivelesVacios();
  const l = Math.floor((n - 1) / 7);
  for (const id of ORDEN_EDIFICIOS) niveles[id] = Math.min(EDIFICIOS[id].max, l);
  return estadisticasDe(niveles, 'sargento');
}

/** Daño por segundo de un escuadrón. */
export function dpsEscuadra(s: { soldados: number; arma: number; dano: number; cadencia: number }): number {
  return s.soldados * dpsSoldado(s.arma, s.dano, s.cadencia);
}

export const DPS_REFERENCIA_1 = dpsEscuadra(estadisticasReferencia(1));
