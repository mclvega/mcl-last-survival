/** Tipos de zombi. La vida base se multiplica por la escala del nivel. */
export type TipoZombi = 'caminante' | 'corredor' | 'perro' | 'gordo' | 'blindado' | 'escupidor' | 'explosivo' | 'divisor' | 'gigante' | 'jefe';

export interface InfoZombi {
  nombre: string;
  vida: number;
  velocidad: number;
  radio: number;
  /** Soldados que elimina al tocar al escuadrón. */
  golpe: number;
  monedas: number;
  /** Velocidad lateral máxima al perseguir al escuadrón. */
  lateral: number;
  /** Nivel desde el que aparece. */
  desde: number;
}

export const ZOMBIS: Record<TipoZombi, InfoZombi> = {
  caminante: { nombre: 'Caminante', vida: 20, velocidad: 31, radio: 11, golpe: 1, monedas: 1, lateral: 34, desde: 1 },
  corredor: { nombre: 'Corredor', vida: 12, velocidad: 78, radio: 10, golpe: 1, monedas: 1, lateral: 90, desde: 4 },
  perro: { nombre: 'Perro zombi', vida: 9, velocidad: 106, radio: 8, golpe: 1, monedas: 1, lateral: 120, desde: 6 },
  gordo: { nombre: 'Gordo', vida: 120, velocidad: 20, radio: 19, golpe: 3, monedas: 4, lateral: 18, desde: 8 },
  blindado: { nombre: 'Blindado', vida: 210, velocidad: 26, radio: 13, golpe: 2, monedas: 5, lateral: 22, desde: 10 },
  explosivo: { nombre: 'Explosivo', vida: 18, velocidad: 46, radio: 12, golpe: 3, monedas: 2, lateral: 50, desde: 12 },
  escupidor: { nombre: 'Escupidor', vida: 50, velocidad: 34, radio: 12, golpe: 1, monedas: 3, lateral: 26, desde: 16 },
  divisor: { nombre: 'Divisor', vida: 60, velocidad: 29, radio: 13, golpe: 2, monedas: 3, lateral: 30, desde: 20 },
  gigante: { nombre: 'Gigante', vida: 480, velocidad: 17, radio: 26, golpe: 6, monedas: 12, lateral: 14, desde: 25 },
  jefe: { nombre: 'Jefe', vida: 1000, velocidad: 38, radio: 40, golpe: 6, monedas: 40, lateral: 40, desde: 1 },
};

/** Distancia (por delante del escuadrón) a la que se detienen el escupidor y el jefe. */
export const DIST_ESCUPIDOR = 240;
export const DIST_JEFE = 230;
