import { ANCHO, MAX_SOLDADOS } from './constantes';
import type { ParamsNivel } from './dificultad';
import { soldadosTrasPuerta, valorEquivalente, type DefPuerta, type Premio } from './elementos';
import { ZOMBIS, type TipoZombi } from './enemigos';
import type { Evento } from './generador';
import { NIVEL_ARMA_MAX } from './armas';
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
  puertas: 0.75,
  barriles: 0.65,
  horda: 1.2,
  obstaculos: 0.55,
  elite: 1,
  descanso: 0.3,
};

const SOLDADOS_ESPERADOS_MAX = MAX_SOLDADOS;
/** Probabilidad de romper un barril (para estimar el poder esperado). */
const PROB_BARRIL = 0.75;

const entre = (rng: Rng, a: number, b: number) => a + rng() * (b - a);
const limitar = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function disponibles(c: Contexto, deseados: TipoZombi[]): TipoZombi[] {
  const lista = deseados.filter((t) => c.params.zombis.includes(t));
  return lista.length ? lista : ['caminante'];
}

/** Grupo de zombis con una vida total cercana al presupuesto. */
function grupo(c: Contexto, y: number, alto: number, presupuesto: number, deseados: TipoZombi[]): void {
  const tipos = disponibles(c, deseados);
  const vidas = tipos.map((t) => ZOMBIS[t].vida * c.vidaEscala);
  const promedio = vidas.reduce((a, b) => a + b, 0) / vidas.length;
  // Tope de cantidad: si harían falta demasiados, cada uno es más fuerte.
  const mult = Math.max(1, presupuesto / promedio / 60);
  const centro = entre(c.rng, 80, ANCHO - 80);
  const ancho = entre(c.rng, 90, 220);
  let gastado = 0;
  let cuenta = 0;
  while (gastado < presupuesto) {
    const i = Math.floor(c.rng() * tipos.length);
    const vida = vidas[i] * mult;
    if (cuenta > 0 && gastado + vida > presupuesto * 1.05) break;
    c.eventos.push({
      tipo: 'zombi',
      z: tipos[i],
      x: limitar(centro + (c.rng() - 0.5) * ancho, 16, ANCHO - 16),
      y: y + c.rng() * alto,
      vida,
    });
    gastado += vida;
    cuenta++;
  }
}

function elegirPremio(c: Contexto): Premio {
  const opciones: Array<[Premio, number]> = [
    ['soldados', 5],
    ['arma', c.estado.arma < NIVEL_ARMA_MAX && c.params.n >= 2 ? 1.6 : 0],
    ['cadencia', 1],
    ['dano', 1],
    ['escudo', c.params.n >= 3 ? 0.6 : 0],
    ['monedas', 0.8],
  ];
  const total = opciones.reduce((a, [, p]) => a + p, 0);
  let r = c.rng() * total;
  for (const [premio, peso] of opciones) {
    r -= peso;
    if (r <= 0) return premio;
  }
  return 'soldados';
}

function barril(c: Contexto, y: number, x = entre(c.rng, 40, ANCHO - 40), forzado?: Premio): void {
  const premio = forzado ?? elegirPremio(c);
  const e = c.estado;
  let valor = 0;
  let segundos = entre(c.rng, 0.45, 0.9);
  switch (premio) {
    case 'soldados':
      valor = Math.max(2, Math.round((2 + e.soldados * 0.15) * entre(c.rng, 0.8, 1.25)));
      e.soldados = Math.min(SOLDADOS_ESPERADOS_MAX, e.soldados + valor * PROB_BARRIL);
      break;
    case 'arma':
      valor = 1;
      segundos = entre(c.rng, 1, 1.4);
      e.arma = Math.min(NIVEL_ARMA_MAX, e.arma + 1);
      break;
    case 'cadencia':
      valor = 15;
      e.cadencia *= 1 + (valor / 100) * PROB_BARRIL;
      break;
    case 'dano':
      valor = 20;
      e.dano *= 1 + (valor / 100) * PROB_BARRIL;
      break;
    case 'escudo':
      valor = 2 + Math.floor(c.rng() * 2);
      break;
    case 'monedas':
      valor = Math.round(10 + c.params.n / 2);
      break;
  }
  c.eventos.push({ tipo: 'barril', x, y, premio, valor, vida: c.dps * segundos, explosivo: false });
}

function barrilExplosivo(c: Contexto, y: number, x: number): void {
  c.eventos.push({ tipo: 'barril', x, y, premio: 'monedas', valor: 0, vida: c.dps * 0.12, explosivo: true });
}

function puertas(c: Contexto, y: number): void {
  const s = c.estado.soldados;
  const buena = (): DefPuerta => {
    const r = c.rng();
    if (r < 0.45) return { op: 'suma', valor: Math.max(3, Math.round(s * 0.3 + 2)) };
    if (r < 0.65 && s <= 12) return { op: 'mult', valor: 2 };
    if (r < 0.82) return { op: 'cadencia', valor: 20 };
    return { op: 'dano', valor: 25 };
  };
  const mala = (): DefPuerta =>
    s >= 10 && c.rng() < 0.35 ? { op: 'div', valor: 2 } : { op: 'suma', valor: -Math.max(2, Math.round(s * 0.35 + 1)) };
  const a = buena();
  let b: DefPuerta;
  if (c.params.puertasNegativas && c.rng() < 0.7) b = mala();
  else {
    b = buena();
    for (let i = 0; i < 5 && b.op === a.op; i++) b = buena();
    if (b.op === a.op) b = a.op === 'cadencia' ? { op: 'dano', valor: 25 } : { op: 'cadencia', valor: 20 };
  }
  const [izq, der] = c.rng() < 0.5 ? [a, b] : [b, a];
  c.eventos.push({ tipo: 'puertas', y, a: izq, b: der });
  // Se espera que el jugador elija la mejor.
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
    const ancho = entre(c.rng, 80, 170);
    c.eventos.push({ tipo: 'pinchos', y, x: entre(c.rng, ancho / 2 + 10, ANCHO - ancho / 2 - 10), ancho });
  } else {
    c.eventos.push({ tipo: 'rueda', y, x: entre(c.rng, 40, ANCHO - 40), vel: (c.rng() < 0.5 ? -1 : 1) * entre(c.rng, 70, 130) });
  }
}

function caja(c: Contexto, y: number, x = entre(c.rng, 40, ANCHO - 40)): void {
  c.eventos.push({ tipo: 'caja', y, x, valor: Math.round(8 + c.params.n / 3) });
}

export const PLANTILLAS: Record<TipoTramo, (c: Contexto) => void> = {
  calentamiento: (c) => {
    barril(c, c.y0 + 120, undefined, 'soldados');
    grupo(c, c.y0 + 250, 140, c.presupuesto * 0.5, ['caminante']);
    barril(c, c.y0 + 430, undefined, c.params.n === 1 ? 'soldados' : undefined);
    grupo(c, c.y0 + 540, 160, c.presupuesto * 0.5, ['caminante', 'caminante', 'corredor']);
  },
  puertas: (c) => {
    grupo(c, c.y0 + 40, 140, c.presupuesto * 0.35, ['caminante', 'corredor']);
    puertas(c, c.y0 + 260);
    grupo(c, c.y0 + 380, 160, c.presupuesto * 0.35, ['caminante', 'caminante', 'corredor', 'explosivo']);
    if (c.rng() < 0.5) puertas(c, c.y0 + 640);
    else barril(c, c.y0 + 640);
    grupo(c, c.y0 + 560, 60, c.presupuesto * 0.3, ['caminante']);
  },
  barriles: (c) => {
    const cantidad = 4 + Math.floor(c.rng() * 2);
    for (let i = 0; i < cantidad; i++) {
      const lado = i % 2 === 0 ? entre(c.rng, 50, 160) : entre(c.rng, 200, ANCHO - 50);
      barril(c, c.y0 + 80 + i * 130, lado);
    }
    grupo(c, c.y0 + 200, 140, c.presupuesto * 0.5, ['caminante', 'corredor']);
    if (c.params.n >= 6) barrilExplosivo(c, c.y0 + 470, entre(c.rng, 60, ANCHO - 60));
    grupo(c, c.y0 + 500, 160, c.presupuesto * 0.5, ['caminante', 'caminante', 'gordo']);
  },
  horda: (c) => {
    for (let i = 0; i < 3; i++) grupo(c, c.y0 + 60 + i * 240, 180, c.presupuesto / 3, ['caminante', 'caminante', 'corredor', 'explosivo']);
    barril(c, c.y0 + 700, undefined, 'soldados');
  },
  obstaculos: (c) => {
    obstaculo(c, c.y0 + 160);
    barril(c, c.y0 + 270);
    grupo(c, c.y0 + 300, 140, c.presupuesto * 0.5, ['caminante', 'corredor']);
    obstaculo(c, c.y0 + 470);
    caja(c, c.y0 + 540);
    grupo(c, c.y0 + 600, 140, c.presupuesto * 0.5, ['caminante', 'explosivo']);
  },
  elite: (c) => {
    grupo(c, c.y0 + 120, 160, c.presupuesto * 0.5, ['gordo', 'escupidor', 'caminante', 'caminante']);
    grupo(c, c.y0 + 430, 160, c.presupuesto * 0.5, ['gordo', 'explosivo', 'escupidor', 'corredor']);
    barril(c, c.y0 + 660, undefined, c.rng() < 0.5 ? 'dano' : 'arma');
  },
  descanso: (c) => {
    caja(c, c.y0 + 100, 90);
    caja(c, c.y0 + 100, ANCHO - 90);
    barril(c, c.y0 + 260, undefined, 'soldados');
    grupo(c, c.y0 + 380, 200, c.presupuesto, ['caminante']);
    caja(c, c.y0 + 640);
  },
};
