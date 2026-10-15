import { MODOS, type Dificultad } from '../core/dificultad';

export type Calidad = 'baja' | 'media' | 'alta' | 'auto';
export type LimiteFps = 30 | 60 | 0;

export interface Configuracion {
  dificultad: Dificultad;
  calidad: Calidad;
  /** 0 = máximo del dispositivo. */
  fps: LimiteFps;
  mostrarFps: boolean;
  volumenGeneral: number;
  volumenMusica: number;
  volumenEfectos: number;
  vibracion: boolean;
  /** Multiplicador del arrastre del dedo. */
  sensibilidad: number;
  /** Sacudida de cámara en golpes y explosiones. */
  sacudida: boolean;
}

function prefiereMenosMovimiento(): boolean {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function configPorDefecto(): Configuracion {
  return {
    dificultad: 'normal',
    calidad: 'auto',
    fps: 60,
    mostrarFps: false,
    volumenGeneral: 80,
    volumenMusica: 45,
    volumenEfectos: 80,
    vibracion: true,
    sensibilidad: 1.2,
    sacudida: !prefiereMenosMovimiento(),
  };
}

const uno = <T>(valor: unknown, opciones: readonly T[], porDefecto: T): T =>
  opciones.includes(valor as T) ? (valor as T) : porDefecto;
const bool = (valor: unknown, porDefecto: boolean) => (typeof valor === 'boolean' ? valor : porDefecto);
const num = (valor: unknown, min: number, max: number, porDefecto: number) =>
  typeof valor === 'number' && Number.isFinite(valor) ? Math.min(max, Math.max(min, valor)) : porDefecto;

/** Valida una configuración guardada (posiblemente incompleta o de otra versión). */
export function normalizarConfig(entrada: unknown): Configuracion {
  const d = configPorDefecto();
  const c = (entrada && typeof entrada === 'object' ? entrada : {}) as Record<string, unknown>;
  return {
    dificultad: uno(c.dificultad, Object.keys(MODOS) as Dificultad[], d.dificultad),
    calidad: uno(c.calidad, ['baja', 'media', 'alta', 'auto'] as const, d.calidad),
    fps: uno(c.fps, [30, 60, 0] as const, d.fps),
    mostrarFps: bool(c.mostrarFps, d.mostrarFps),
    volumenGeneral: num(c.volumenGeneral, 0, 100, d.volumenGeneral),
    volumenMusica: num(c.volumenMusica, 0, 100, d.volumenMusica),
    volumenEfectos: num(c.volumenEfectos, 0, 100, d.volumenEfectos),
    vibracion: bool(c.vibracion, d.vibracion),
    sensibilidad: num(c.sensibilidad, 0.6, 2, d.sensibilidad),
    sacudida: bool(c.sacudida, d.sacudida),
  };
}

/** Aplica al documento las opciones visuales. */
export function aplicarConfigVisual(c: Configuracion): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.animaciones = c.sacudida ? 'completas' : 'reducidas';
}
