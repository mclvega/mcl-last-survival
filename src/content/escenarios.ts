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
}

export const ESCENARIOS: readonly Escenario[] = [
  { nombre: 'Ciudad', icono: '🏙️', suelo: '#a7abb1', borde: '#c9ced6', linea: '#f1f3f5', detalle: '#979ba1', fuera: '#5f86b8', cielo: '#a5d8ff', pasillo: '#8fa3bd' },
  { nombre: 'Autopista', icono: '🛣️', suelo: '#9b9da2', borde: '#d0d3d8', linea: '#ffd43b', detalle: '#8b8d92', fuera: '#c9b48a', cielo: '#b8dcf5', pasillo: '#b9a988' },
  { nombre: 'Bosque', icono: '🌲', suelo: '#a39b8f', borde: '#9fbf8f', linea: '#efe6d2', detalle: '#938b7f', fuera: '#4f8a43', cielo: '#c3e6cb', pasillo: '#7ea36f' },
  { nombre: 'Puerto', icono: '⚓', suelo: '#a0abb3', borde: '#c4d0d8', linea: '#ffffff', detalle: '#909ba3', fuera: '#3f7fb5', cielo: '#a5d8ff', pasillo: '#86a6bf' },
  { nombre: 'Desierto', icono: '🏜️', suelo: '#aaa49c', borde: '#d8c7a3', linea: '#fff3bf', detalle: '#9a948c', fuera: '#dcc28e', cielo: '#ffe8cc', pasillo: '#cdb88f' },
  { nombre: 'Nieve', icono: '❄️', suelo: '#a9b1ba', borde: '#eef3f7', linea: '#ffffff', detalle: '#99a1aa', fuera: '#e3edf5', cielo: '#d0ebff', pasillo: '#c9d6e2' },
  { nombre: 'Fábrica', icono: '🏭', suelo: '#9a928c', borde: '#c08060', linea: '#ffa94d', detalle: '#8a827c', fuera: '#7a6a5e', cielo: '#ffd8a8', pasillo: '#a08878' },
  { nombre: 'Laboratorio', icono: '🧪', suelo: '#9eaab4', borde: '#8fd9c6', linea: '#63e6be', detalle: '#8e9aa4', fuera: '#3d6470', cielo: '#c3fae8', pasillo: '#7fa8a8' },
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
