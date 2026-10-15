import { NIVEL_ARMA_MAX } from './armas';
import { ANCHO, ANCHO_PASILLO, LARGO_TRAMO, MAX_SOLDADOS } from './constantes';
import type { ParamsNivel } from './dificultad';
import { soldadosTrasPuerta, valorEquivalente, type DefPuerta, type Premio } from './elementos';
import { ZOMBIS, type TipoZombi } from './enemigos';
import type { Evento } from './generador';
import type { Rng } from './rng';

/** Plantillas de tramos (unos 10 segundos cada uno) con las que se arma un nivel. */
export type TipoTramo = 'calentamiento' | 'puertas' | 'barriles' | 'horda' | 'obstaculos' | 'elite' | 'descanso';

/** Lo que se espera que tenga el escuadrón en este punto del nivel. */
export interface EstadoEsperado {
  soldados: number;
  arma: number;
  dano: number;
  cadencia: number;
}

export interface Contexto {
  rng: Rng;
  y0: number;
  /** Índice del tramo dentro del nivel. */
  indice: number;
  /** Vida enemiga total que se puede repartir en el tramo. */
  presupuesto: number;
  vidaEscala: number;
  dps: number;
  params: ParamsNivel;
  estado: EstadoEsperado;
  eventos: Evento[];
}

/** Parte del poder del escuadrón que se convierte en zombis según el tipo de tramo. */
export const FACTOR_TRAMO: Record<TipoTramo, number> = {
  calentamiento: 0.6,
  puertas: 0.8,
  barriles: 0.7,
  horda: 1.25,
  obstaculos: 0.6,
  elite: 1.05,
  descanso: 0.35,
};

/** Carril central (entre los dos pasillos laterales). */
export const CARRIL_MIN = ANCHO_PASILLO + 12;
export const CARRIL_MAX = ANCHO - ANCHO_PASILLO - 12;

const SOLDADOS_ESPERADOS_MAX = MAX_SOLDADOS;
/** Probabilidad de romper un cofre o barril (para estimar el poder esperado). */
const PROB_BARRIL = 0.75;
/** Máximo de zombis por grupo: si hicieran falta más, cada uno es más fuerte. */
const MAX_GRUPO = 110;
/** Los zombis son débiles pero muchos (hordas como en los anuncios). */
const VIDA_HORDA = 0.5;

const entre = (rng: Rng, a: number, b: number) => a + rng() * (b - a);
const limitar = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const enCarril = (rng: Rng) => entre(rng, CARRIL_MIN + 10, CARRIL_MAX - 10);

function disponibles(c: Contexto, deseados: TipoZombi[]): TipoZombi[] {
  const lista = deseados.filter((t) => c.params.zombis.includes(t));
  return lista.length ? lista : ['caminante'];
}

/** Grupo de zombis en el carril central con una vida total cercana al presupuesto. */
function grupo(c: Contexto, y: number, alto: number, presupuesto: number, deseados: TipoZombi[]): void {
  const tipos = disponibles(c, deseados);
  const vidas = tipos.map((t) => ZOMBIS[t].vida * c.vidaEscala * VIDA_HORDA);
  const promedio = vidas.reduce((a, b) => a + b, 0) / vidas.length;
  const mult = Math.max(1, presupuesto / promedio / MAX_GRUPO);
  let gastado = 0;
  let cuenta = 0;
  while (gastado < presupuesto) {
    const i = Math.floor(c.rng() * tipos.length);
    const vida = vidas[i] * mult;
    if (cuenta > 0 && gastado + vida > presupuesto * 1.05) break;
    c.eventos.push({
      tipo: 'zombi',
      z: tipos[i],
      x: limitar(ANCHO / 2 + (c.rng() - 0.5) * (CARRIL_MAX - CARRIL_MIN), CARRIL_MIN, CARRIL_MAX),
      y: y + c.rng() * alto,
      vida,
    });
    gastado += vida;
    cuenta++;
  }
}

function aplicarPremioEsperado(c: Contexto, premio: Premio, valor: number): void {
  const e = c.estado;
  if (premio === 'soldados') e.soldados = Math.min(SOLDADOS_ESPERADOS_MAX, e.soldados + valor * PROB_BARRIL);
  else if (premio === 'arma') e.arma = Math.min(NIVEL_ARMA_MAX, e.arma + 1);
  else if (premio === 'cadencia') e.cadencia *= 1 + (valor / 100) * PROB_BARRIL;
  else if (premio === 'dano') e.dano *= 1 + (valor / 100) * PROB_BARRIL;
}

function valorPremio(c: Contexto, premio: Premio): number {
  switch (premio) {
    case 'soldados':
      return Math.max(2, Math.round((2 + c.estado.soldados * 0.15) * entre(c.rng, 0.8, 1.25)));
    case 'arma':
      return 1;
    case 'cadencia':
      return 15;
    case 'dano':
      return 20;
    case 'escudo':
      return 2 + Math.floor(c.rng() * 2);
    case 'monedas':
      return Math.round(10 + c.params.n / 2);
  }
}

/** Barril en el carril (soldados, escudo o monedas). */
function barril(c: Contexto, y: number, forzado?: Premio): void {
  const opciones: Premio[] = ['soldados', 'soldados', 'soldados', 'monedas', ...(c.params.n >= 3 ? (['escudo'] as Premio[]) : [])];
  const premio = forzado ?? opciones[Math.floor(c.rng() * opciones.length)];
  const valor = valorPremio(c, premio);
  c.eventos.push({ tipo: 'barril', x: enCarril(c.rng), y, premio, valor, vida: c.dps * entre(c.rng, 0.45, 0.9), explosivo: false });
  aplicarPremioEsperado(c, premio, valor);
}

/** Cofre de mejora (arma, daño o cadencia). Puede ir en el carril o en el pasillo derecho. */
function cofre(c: Contexto, y: number, x: number, premio: Premio): void {
  const valor = valorPremio(c, premio);
  c.eventos.push({ tipo: 'barril', x, y, premio, valor, vida: c.dps * entre(c.rng, 1.1, 1.6), explosivo: false });
  aplicarPremioEsperado(c, premio, valor);
}

function premioCofre(c: Contexto): Premio {
  const r = c.rng();
  if (c.estado.arma < NIVEL_ARMA_MAX && c.params.n >= 2 && r < 0.45) return 'arma';
  return r < 0.72 ? 'dano' : 'cadencia';
}

function barrilExplosivo(c: Contexto, y: number): void {
  c.eventos.push({ tipo: 'barril', x: enCarril(c.rng), y, premio: 'monedas', valor: 0, vida: c.dps * 0.12, explosivo: true });
}

function puertas(c: Contexto, y: number): void {
  const s = c.estado.soldados;
  const buena = (): DefPuerta => {
    const r = c.rng();
    if (r < 0.45) return { op: 'suma', valor: Math.max(3, Math.round(s * 0.3 + 2)) };
    if (r < 0.62 && s <= 12) return { op: 'mult', valor: 2 };
    if (r < 0.82) return { op: 'cadencia', valor: 20 };
    return { op: 'dano', valor: 25 };
  };
  const mala = (): DefPuerta =>
    s >= 10 && c.rng() < 0.4 ? { op: 'div', valor: 2 } : { op: 'suma', valor: -Math.max(3, Math.round(s * 0.4 + 1)) };
  const a = buena();
  let b: DefPuerta;
  if (c.params.puertasNegativas && c.rng() < 0.75) b = mala();
  else {
    b = buena();
    for (let i = 0; i < 5 && b.op === a.op; i++) b = buena();
    if (b.op === a.op) b = a.op === 'cadencia' ? { op: 'dano', valor: 25 } : { op: 'cadencia', valor: 20 };
  }
  const [izq, der] = c.rng() < 0.5 ? [a, b] : [b, a];
  c.eventos.push({ tipo: 'puertas', y, a: izq, b: der });
  const mejor = valorEquivalente(s, izq) >= valorEquivalente(s, der) ? izq : der;
  if (mejor.op === 'cadencia') c.estado.cadencia *= 1 + mejor.valor / 100;
  else if (mejor.op === 'dano') c.estado.dano *= 1 + mejor.valor / 100;
  else c.estado.soldados = Math.min(SOLDADOS_ESPERADOS_MAX, soldadosTrasPuerta(s, mejor));
}

function obstaculo(c: Contexto, y: number): void {
  const tipos = c.params.obstaculos;
  if (!tipos.length) return;
  const tipo = tipos[Math.floor(c.rng() * tipos.length)];
  if (tipo === 'pinchos') {
    const ancho = entre(c.rng, 60, 110);
    c.eventos.push({ tipo: 'pinchos', y, x: entre(c.rng, CARRIL_MIN + ancho / 2 - 12, CARRIL_MAX - ancho / 2 + 12), ancho });
  } else {
    c.eventos.push({ tipo: 'rueda', y, x: enCarril(c.rng), vel: (c.rng() < 0.5 ? -1 : 1) * entre(c.rng, 70, 120) });
  }
}

function caja(c: Contexto, y: number): void {
  c.eventos.push({ tipo: 'caja', y, x: enCarril(c.rng), valor: Math.round(8 + c.params.n / 3) });
}

/**
 * Pasillos laterales (siempre presentes): a la izquierda una columna de fichas
 * «+1» y a la derecha, según el tramo, una escalera «×2…×9» o cofres de mejora.
 */
export function pasillos(c: Contexto): void {
  const e = c.estado;
  const fichas: Array<{ dy: number; op: 'suma' | 'mult'; valor: number; vida: number }> = [];
  const cantidad = Math.floor((LARGO_TRAMO - 60) / 36);
  for (let i = 0; i < cantidad; i++) fichas.push({ dy: 40 + i * 36, op: 'suma', valor: 1, vida: c.dps * 0.06 * (1 + i / cantidad) });
  c.eventos.push({ tipo: 'pasillo', y: c.y0, largo: LARGO_TRAMO - 10, lado: 0, fichas });
  e.soldados = Math.min(SOLDADOS_ESPERADOS_MAX, e.soldados + cantidad * 0.25);

  if (c.params.n >= 4 && c.indice % 2 === 1) {
    const escalera: typeof fichas = [];
    for (let k = 2; k <= 9; k++) escalera.push({ dy: 60 + (k - 2) * 88, op: 'mult', valor: k, vida: c.dps * 0.28 * k ** 1.7 });
    c.eventos.push({ tipo: 'pasillo', y: c.y0, largo: LARGO_TRAMO - 10, lado: 1, fichas: escalera });
    e.soldados = Math.min(SOLDADOS_ESPERADOS_MAX, e.soldados * 1.3);
  } else {
    const x = ANCHO - ANCHO_PASILLO / 2;
    for (const dy of [150, 450]) cofre(c, c.y0 + dy, x, premioCofre(c));
  }
}

export const PLANTILLAS: Record<TipoTramo, (c: Contexto) => void> = {
  calentamiento: (c) => {
    barril(c, c.y0 + 120, 'soldados');
    grupo(c, c.y0 + 250, 140, c.presupuesto * 0.5, ['caminante']);
    barril(c, c.y0 + 430, c.params.n === 1 ? 'soldados' : undefined);
    grupo(c, c.y0 + 540, 160, c.presupuesto * 0.5, ['caminante', 'caminante', 'corredor', 'perro']);
  },
  puertas: (c) => {
    grupo(c, c.y0 + 40, 140, c.presupuesto * 0.35, ['caminante', 'corredor', 'perro']);
    puertas(c, c.y0 + 260);
    grupo(c, c.y0 + 380, 160, c.presupuesto * 0.35, ['caminante', 'caminante', 'corredor', 'explosivo', 'divisor']);
    if (c.rng() < 0.5) puertas(c, c.y0 + 640);
    else barril(c, c.y0 + 640);
    grupo(c, c.y0 + 560, 60, c.presupuesto * 0.3, ['caminante', 'blindado']);
  },
  barriles: (c) => {
    for (let i = 0; i < 3; i++) barril(c, c.y0 + 80 + i * 200);
    cofre(c, c.y0 + 600, ANCHO / 2, premioCofre(c));
    grupo(c, c.y0 + 200, 140, c.presupuesto * 0.5, ['caminante', 'corredor', 'perro']);
    if (c.params.n >= 6) barrilExplosivo(c, c.y0 + 470);
    grupo(c, c.y0 + 500, 160, c.presupuesto * 0.5, ['caminante', 'caminante', 'gordo', 'blindado']);
  },
  horda: (c) => {
    for (let i = 0; i < 3; i++) grupo(c, c.y0 + 60 + i * 240, 180, c.presupuesto / 3, ['caminante', 'caminante', 'corredor', 'perro', 'explosivo', 'divisor']);
    barril(c, c.y0 + 700, 'soldados');
  },
  obstaculos: (c) => {
    obstaculo(c, c.y0 + 160);
    barril(c, c.y0 + 270);
    grupo(c, c.y0 + 300, 140, c.presupuesto * 0.5, ['caminante', 'corredor', 'perro']);
    obstaculo(c, c.y0 + 470);
    caja(c, c.y0 + 540);
    grupo(c, c.y0 + 600, 140, c.presupuesto * 0.5, ['caminante', 'explosivo', 'blindado']);
  },
  elite: (c) => {
    grupo(c, c.y0 + 120, 160, c.presupuesto * 0.5, ['gordo', 'escupidor', 'blindado', 'caminante', 'gigante']);
    grupo(c, c.y0 + 430, 160, c.presupuesto * 0.5, ['gordo', 'explosivo', 'escupidor', 'divisor', 'gigante']);
    cofre(c, c.y0 + 660, ANCHO / 2, premioCofre(c));
  },
  descanso: (c) => {
    caja(c, c.y0 + 100);
    caja(c, c.y0 + 160);
    barril(c, c.y0 + 260, 'soldados');
    grupo(c, c.y0 + 380, 200, c.presupuesto, ['caminante', 'perro']);
    caja(c, c.y0 + 640);
  },
};
