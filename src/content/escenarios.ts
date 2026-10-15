/** Capítulos de 10 niveles, cada uno con su escenario. Al terminar la lista empieza otra vuelta. */
export const NIVELES_POR_CAPITULO = 10;

export interface Escenario {
  nombre: string;
  icono: string;
  /** Colores del camino. */
  suelo: string;
  borde: string;
  linea: string;
  detalle: string;
  fuera: string;
  cielo: string;
  /** Piso de los pasillos laterales. */
  pasillo: string;
  /** Objetos que adornan los costados del camino (varían en cada nivel). */
  props: Prop[];
}

export type Prop = 'casa' | 'arbol' | 'palmera' | 'poste' | 'auto' | 'roca' | 'moai';

/** Hora del día: cada nivel elige una y cambia la luz del mapa. */
export type Hora = 'manana' | 'tarde' | 'atardecer' | 'noche';

/** Variante del mapa de un nivel: se regenera con el número de nivel (igual al repetirlo). */
export interface VarianteMapa {
  semilla: number;
  hora: Hora;
}

export function varianteMapa(n: number): VarianteMapa {
  // Hash entero sencillo y determinista del número de nivel.
  let h = (n * 2654435761) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519) >>> 0;
  const horas: Hora[] = ['manana', 'tarde', 'manana', 'atardecer', 'tarde', 'noche'];
  return { semilla: h, hora: horas[h % horas.length] };
}

export const ESCENARIOS: readonly Escenario[] = [
  { nombre: 'Calle Kuyen', icono: '🏘️', suelo: '#a7abb1', borde: '#c9ced6', linea: '#f1f3f5', detalle: '#979ba1', fuera: '#5f86b8', cielo: '#a5d8ff', pasillo: '#8fa3bd', props: ['casa', 'poste', 'arbol', 'auto'] },
  { nombre: 'Calle Amuyen', icono: '🏠', suelo: '#a3a6ac', borde: '#d6d0c4', linea: '#ffffff', detalle: '#93969c', fuera: '#8a9fb5', cielo: '#cfe8ff', pasillo: '#a7b4c4', props: ['casa', 'arbol', 'poste', 'casa'] },
  { nombre: 'Población La Conquista', icono: '🏚️', suelo: '#9b9da2', borde: '#d0d3d8', linea: '#ffd43b', detalle: '#8b8d92', fuera: '#b5876a', cielo: '#b8dcf5', pasillo: '#c49a7e', props: ['casa', 'auto', 'poste', 'roca'] },
  { nombre: 'Colonia Kennedy', icono: '🏡', suelo: '#a39b8f', borde: '#c9d2c0', linea: '#efe6d2', detalle: '#938b7f', fuera: '#6a9a5a', cielo: '#c3e6cb', pasillo: '#8fb07e', props: ['casa', 'arbol', 'arbol', 'poste'] },
  { nombre: 'Isla de Pascua', icono: '🗿', suelo: '#a8a29a', borde: '#e9e2d0', linea: '#ffffff', detalle: '#98928a', fuera: '#5fa55a', cielo: '#9ad0ff', pasillo: '#7fb36f', props: ['moai', 'palmera', 'roca', 'moai'] },
  { nombre: 'Puerto', icono: '⚓', suelo: '#a0abb3', borde: '#c4d0d8', linea: '#ffffff', detalle: '#909ba3', fuera: '#3f7fb5', cielo: '#a5d8ff', pasillo: '#86a6bf', props: ['poste', 'roca', 'casa'] },
  { nombre: 'Desierto', icono: '🏜️', suelo: '#aaa49c', borde: '#d8c7a3', linea: '#fff3bf', detalle: '#9a948c', fuera: '#dcc28e', cielo: '#ffe8cc', pasillo: '#cdb88f', props: ['roca', 'palmera', 'roca'] },
  { nombre: 'Nieve', icono: '❄️', suelo: '#a9b1ba', borde: '#eef3f7', linea: '#ffffff', detalle: '#99a1aa', fuera: '#e3edf5', cielo: '#d0ebff', pasillo: '#c9d6e2', props: ['arbol', 'roca', 'casa'] },
  { nombre: 'Fábrica', icono: '🏭', suelo: '#9a928c', borde: '#c08060', linea: '#ffa94d', detalle: '#8a827c', fuera: '#7a6a5e', cielo: '#ffd8a8', pasillo: '#a08878', props: ['casa', 'poste', 'auto'] },
  { nombre: 'Laboratorio', icono: '🧪', suelo: '#9eaab4', borde: '#8fd9c6', linea: '#63e6be', detalle: '#8e9aa4', fuera: '#3d6470', cielo: '#c3fae8', pasillo: '#7fa8a8', props: ['poste', 'casa', 'roca'] },
];

export interface Ubicacion {
  /** Capítulo global (0, 1, 2…). */
  capitulo: number;
  escenario: number;
  vuelta: number;
  nivelEnCapitulo: number;
  nombre: string;
}

export function ubicarNivel(n: number): Ubicacion {
  const capitulo = Math.floor((n - 1) / NIVELES_POR_CAPITULO);
  const escenario = capitulo % ESCENARIOS.length;
  return {
    capitulo,
    escenario,
    vuelta: Math.floor(capitulo / ESCENARIOS.length) + 1,
    nivelEnCapitulo: ((n - 1) % NIVELES_POR_CAPITULO) + 1,
    nombre: ESCENARIOS[escenario].nombre,
  };
}
