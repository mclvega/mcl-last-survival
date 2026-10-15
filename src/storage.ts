import { ASPECTOS_POR_ID } from './content/aspectos';
import { EDIFICIOS, ORDEN_EDIFICIOS, nivelesVacios, type IdEdificio } from './content/edificios';
import { HEROES, ORDEN_HEROES, type IdHeroe } from './content/heroes';
import { MISIONES, totalesVacios, type IdMision, type Totales } from './content/misiones';
import { configPorDefecto, normalizarConfig, type Configuracion } from './settings/settings';

export interface Guardado {
  v: 1;
  nombre: string | null;
  invitado: boolean;
  /** Nivel más alto desbloqueado. */
  nivelActual: number;
  estrellas: Record<string, number>;
  monedas: number;
  /** Fichas para la segunda oportunidad (se ganan en la recompensa diaria). */
  fichasRescate: number;
  refugio: Record<IdEdificio, number>;
  heroes: IdHeroe[];
  heroe: IdHeroe;
  aspectos: string[];
  aspecto: string;
  racha: { dias: number; ultima: string | null };
  totales: Totales;
  /** Escalón de cada misión ya cobrado. */
  misiones: Record<IdMision, number>;
  recordHorda: number;
  fallos: Record<string, number>;
  masFacil: number[];
  config: Configuracion;
}

export const CLAVE_GUARDADO = 'last-survival:v1';
const PREFIJO_CODIGO = 'LS1-';

export function guardadoNuevo(): Guardado {
  return {
    v: 1,
    nombre: null,
    invitado: false,
    nivelActual: 1,
    estrellas: {},
    monedas: 0,
    fichasRescate: 1,
    refugio: nivelesVacios(),
    heroes: ['sargento'],
    heroe: 'sargento',
    aspectos: ['militar'],
    aspecto: 'militar',
    racha: { dias: 0, ultima: null },
    totales: totalesVacios(),
    misiones: { zombis: 0, barriles: 0, jefes: 0, niveles: 0 },
    recordHorda: 0,
    fallos: {},
    masFacil: [],
    config: configPorDefecto(),
  };
}

const entero = (v: unknown, min: number, porDefecto: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.floor(v)) : porDefecto;
const fecha = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const esObjeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function registroNumerico(v: unknown): Record<string, number> {
  const resultado: Record<string, number> = {};
  if (!esObjeto(v)) return resultado;
  for (const [k, n] of Object.entries(v)) if (typeof n === 'number' && Number.isFinite(n)) resultado[k] = n;
  return resultado;
}

/** Valida datos guardados: cualquier campo dañado vuelve a su valor por defecto. */
export function normalizarGuardado(entrada: unknown): Guardado {
  const base = guardadoNuevo();
  if (!esObjeto(entrada)) return base;
  const g = entrada;

  const refugioEntrada = esObjeto(g.refugio) ? g.refugio : {};
  const refugio = nivelesVacios();
  for (const id of ORDEN_EDIFICIOS) refugio[id] = Math.min(EDIFICIOS[id].max, entero(refugioEntrada[id], 0, 0));

  const heroes = Array.isArray(g.heroes)
    ? [...new Set<IdHeroe>(['sargento', ...g.heroes.filter((h): h is IdHeroe => ORDEN_HEROES.includes(h as IdHeroe))])]
    : base.heroes;
  const heroe = typeof g.heroe === 'string' && heroes.includes(g.heroe as IdHeroe) && g.heroe in HEROES ? (g.heroe as IdHeroe) : 'sargento';

  const aspectos = Array.isArray(g.aspectos)
    ? [...new Set(['militar', ...g.aspectos.filter((a): a is string => typeof a === 'string' && ASPECTOS_POR_ID.has(a))])]
    : base.aspectos;
  const aspecto = typeof g.aspecto === 'string' && aspectos.includes(g.aspecto) ? g.aspecto : 'militar';

  const racha = esObjeto(g.racha) ? g.racha : {};
  const totalesEntrada = esObjeto(g.totales) ? g.totales : {};
  const totales = totalesVacios();
  for (const k of Object.keys(totales) as Array<keyof Totales>) totales[k] = entero(totalesEntrada[k], 0, 0);
  const misionesEntrada = esObjeto(g.misiones) ? g.misiones : {};
  const misiones = { ...base.misiones };
  for (const m of MISIONES) misiones[m.id] = entero(misionesEntrada[m.id], 0, 0);

  return {
    v: 1,
    nombre: typeof g.nombre === 'string' ? limpiarNombre(g.nombre) : null,
    invitado: g.invitado === true,
    nivelActual: entero(g.nivelActual, 1, 1),
    estrellas: registroNumerico(g.estrellas),
    monedas: entero(g.monedas, 0, base.monedas),
    fichasRescate: entero(g.fichasRescate, 0, base.fichasRescate),
    refugio,
    heroes,
    heroe,
    aspectos,
    aspecto,
    racha: { dias: entero(racha.dias, 0, 0), ultima: fecha(racha.ultima) },
    totales,
    misiones,
    recordHorda: entero(g.recordHorda, 0, 0),
    fallos: registroNumerico(g.fallos),
    masFacil: Array.isArray(g.masFacil) ? g.masFacil.filter((n): n is number => typeof n === 'number') : [],
    config: normalizarConfig(g.config),
  };
}

/** Nombre del jugador: 1 a 16 caracteres; letras, números, espacios, punto, apóstrofo y guion. */
export function limpiarNombre(texto: string): string | null {
  const limpio = texto.replace(/\s+/g, ' ').trim().slice(0, 16);
  return /^[\p{L}\p{M}\p{N} .'_-]{1,16}$/u.test(limpio) ? limpio : null;
}

function almacenSeguro(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function cargar(almacen: Pick<Storage, 'getItem'> | null = almacenSeguro()): Guardado {
  try {
    const texto = almacen?.getItem(CLAVE_GUARDADO);
    return texto ? normalizarGuardado(JSON.parse(texto)) : guardadoNuevo();
  } catch {
    return guardadoNuevo();
  }
}

export function guardar(g: Guardado, almacen: Pick<Storage, 'setItem'> | null = almacenSeguro()): void {
  try {
    almacen?.setItem(CLAVE_GUARDADO, JSON.stringify(g));
  } catch {
    // Sin almacenamiento (ventana privada o bloqueado): el juego sigue en memoria.
  }
}

/** Código para llevar el progreso a otro navegador. */
export function exportarCodigo(g: Guardado): string {
  const bytes = new TextEncoder().encode(JSON.stringify(g));
  let binario = '';
  bytes.forEach((b) => (binario += String.fromCharCode(b)));
  return PREFIJO_CODIGO + btoa(binario);
}

export function importarCodigo(codigo: string): Guardado | null {
  try {
    const limpio = codigo.trim().replace(new RegExp(`^${PREFIJO_CODIGO}`), '').replace(/\s+/g, '');
    const binario = atob(limpio);
    const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
    const datos = JSON.parse(new TextDecoder().decode(bytes));
    if (!esObjeto(datos) || datos.v !== 1) return null;
    return normalizarGuardado(datos);
  } catch {
    return null;
  }
}
