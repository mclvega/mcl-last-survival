/** Tipos de zombi. La vida base se multiplica por la escala del nivel. */
export type TipoZombi = 'caminante' | 'corredor' | 'gordo' | 'escupidor' | 'explosivo' | 'jefe';

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
}

export const ZOMBIS: Record<TipoZombi, InfoZombi> = {
  caminante: { nombre: 'Caminante', vida: 20, velocidad: 36, radio: 11, golpe: 1, monedas: 1, lateral: 34 },
  corredor: { nombre: 'Corredor', vida: 12, velocidad: 92, radio: 10, golpe: 1, monedas: 1, lateral: 90 },
  gordo: { nombre: 'Gordo', vida: 120, velocidad: 24, radio: 19, golpe: 3, monedas: 4, lateral: 18 },
  escupidor: { nombre: 'Escupidor', vida: 50, velocidad: 40, radio: 12, golpe: 1, monedas: 3, lateral: 26 },
  explosivo: { nombre: 'Explosivo', vida: 18, velocidad: 54, radio: 12, golpe: 3, monedas: 2, lateral: 50 },
  jefe: { nombre: 'Jefe', vida: 1000, velocidad: 45, radio: 40, golpe: 6, monedas: 40, lateral: 40 },
};

/** Distancia (por delante del escuadrón) a la que se detienen el escupidor y el jefe. */
export const DIST_ESCUPIDOR = 240;
export const DIST_JEFE = 230;
