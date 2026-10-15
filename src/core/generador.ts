import { INICIO, LARGO_TRAMO, VEL_AVANCE } from './constantes';
import { DPS_REFERENCIA_1, MODOS, dpsEscuadra, paramsNivel, type Dificultad, type ParamsNivel } from './dificultad';
import type { DefPuerta, Premio } from './elementos';
import type { TipoZombi } from './enemigos';
import type { Estadisticas } from './escuadra';
import { pick, rngFrom, shuffle, type Rng } from './rng';
import { FACTOR_TRAMO, PLANTILLAS, pasillos, type EstadoEsperado, type TipoTramo } from './tramos';

/** Algo que aparece en el camino a cierta altura `y`. */
export type Evento =
  | { tipo: 'zombi'; y: number; x: number; z: TipoZombi; vida: number }
  | { tipo: 'barril'; y: number; x: number; premio: Premio; valor: number; vida: number; explosivo: boolean }
  | { tipo: 'puertas'; y: number; a: DefPuerta; b: DefPuerta }
  | { tipo: 'pinchos'; y: number; x: number; ancho: number }
  | { tipo: 'rueda'; y: number; x: number; vel: number }
  | { tipo: 'caja'; y: number; x: number; valor: number }
  | { tipo: 'pasillo'; y: number; largo: number; lado: 0 | 1; fichas: Array<{ dy: number; op: 'suma' | 'mult'; valor: number; vida: number }> };

export interface Nivel {
  n: number;
  semilla: string;
  /** Donde termina el camino y aparece el jefe (Infinity en el modo Horda). */
  largo: number;
  eventos: Evento[];
  vidaJefe: number;
  escala: number;
  /** Solo en el modo Horda: genera más camino hasta la altura indicada. */
  extender?: (hasta: number) => void;
}

/** Orden de los tramos del nivel. Los tres primeros niveles son un tutorial fijo. */
export function secuenciaTramos(p: ParamsNivel, rng: Rng): TipoTramo[] {
  if (p.n === 1) return ['calentamiento', 'barriles'];
  if (p.n === 2) return ['calentamiento', 'puertas', 'barriles'];
  if (p.n === 3) return ['calentamiento', 'puertas', 'horda'];
  const opciones: TipoTramo[] = ['puertas', 'barriles', 'horda', 'horda'];
  if (p.obstaculos.length) opciones.push('obstaculos');
  if (p.zombis.includes('gordo')) opciones.push('elite');
  const medios: TipoTramo[] = ['puertas', 'barriles'];
  while (medios.length < p.numTramos - 1) medios.push(pick(rng, opciones));
  shuffle(rng, medios);
  const secuencia: TipoTramo[] = ['calentamiento', ...medios];
  if (p.numTramos >= 4) secuencia.push('descanso');
  return secuencia;
}

interface Base {
  rng: Rng;
  params: ParamsNivel;
  estado: EstadoEsperado;
  dps0: number;
  escala: number;
}

function generarTramo(b: Base, tipo: TipoTramo, y0: number, indice: number, fraccion: number, eventos: Evento[]): void {
  const dps = dpsEscuadra(b.estado);
  const tiempo = LARGO_TRAMO / (VEL_AVANCE + 45);
  const contexto = {
    rng: b.rng,
    y0,
    indice,
    presupuesto: dps * tiempo * fraccion * FACTOR_TRAMO[tipo],
    vidaEscala: b.escala * Math.sqrt(dps / b.dps0),
    dps,
    params: b.params,
    estado: b.estado,
    eventos,
  };
  // Los pasillos laterales (+1, escalera ×k o cofres) acompañan todo el camino.
  pasillos(contexto);
  PLANTILLAS[tipo](contexto);
}

function base(semilla: string, params: ParamsNivel, ref: Estadisticas): Base {
  const estado: EstadoEsperado = { soldados: ref.soldados, arma: ref.arma, dano: ref.dano, cadencia: ref.cadencia };
  const dps0 = dpsEscuadra(estado);
  return { rng: rngFrom(semilla), params, estado, dps0, escala: (dps0 / DPS_REFERENCIA_1) ** 0.85 };
}

/**
 * Genera el nivel con una semilla determinista: el mismo nivel y dificultad dan
 * siempre el mismo camino. La vida de los zombis se reparte con un presupuesto
 * proporcional al poder esperado del escuadrón de referencia.
 */
export function generarNivel(p: ParamsNivel, ref: Estadisticas, intento = 0): Nivel {
  const semilla = `nivel:${p.n}:${p.dificultad}:${p.masFacil ? 1 : 0}:${intento}`;
  const b = base(semilla, p, ref);
  const fraccion = p.fraccion * 0.85 ** intento;
  const eventos: Evento[] = [];
  let y = INICIO;
  for (const [i, tipo] of secuenciaTramos(p, b.rng).entries()) {
    generarTramo(b, tipo, y, i, fraccion, eventos);
    y += LARGO_TRAMO;
  }
  eventos.sort((a, c) => a.y - c.y);
  return {
    n: p.n,
    semilla,
    largo: y,
    eventos,
    // El jefe se calcula con un poder esperado acotado, para que la pelea dure segundos y no minutos.
    vidaJefe: Math.min(dpsEscuadra(b.estado), b.dps0 * 5) * p.tiempoJefe * Math.min(1, fraccion + 0.15),
    escala: b.escala,
  };
}

/** Modo Horda: camino sin fin con dificultad creciente. */
export function generarHorda(dificultad: Dificultad, ref: Estadisticas, semilla = 'horda'): Nivel {
  const p: ParamsNivel = { ...paramsNivel(40, dificultad), zombis: ['caminante', 'corredor', 'perro', 'gordo', 'blindado', 'explosivo', 'escupidor', 'divisor', 'gigante'], obstaculos: ['pinchos', 'rueda'] };
  const b = base(`horda:${semilla}:${dificultad}`, p, ref);
  const nivel: Nivel = { n: 0, semilla, largo: Infinity, eventos: [], vidaJefe: 0, escala: b.escala };
  const tipos: TipoTramo[] = ['puertas', 'barriles', 'horda', 'horda', 'obstaculos', 'elite'];
  let y = INICIO;
  let i = 0;
  nivel.extender = (hasta) => {
    while (y < hasta) {
      const tipo: TipoTramo = i === 0 ? 'calentamiento' : i % 6 === 0 ? 'descanso' : pick(b.rng, tipos);
      const nuevos: Evento[] = [];
      generarTramo(b, tipo, y, i, MODOS[dificultad].fraccion[0] + 0.07 * i, nuevos);
      nuevos.sort((a, c) => a.y - c.y);
      nivel.eventos.push(...nuevos);
      y += LARGO_TRAMO;
      i++;
    }
  };
  nivel.extender(INICIO + LARGO_TRAMO * 2);
  return nivel;
}
