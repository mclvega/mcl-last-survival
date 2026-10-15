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
}

export const ESCENARIOS: readonly Escenario[] = [
  { nombre: 'Ciudad', icono: '🏙️', suelo: '#3b3f46', borde: '#6b6f78', linea: '#e9ecef', detalle: '#2b2e33', fuera: '#1c1e22' },
  { nombre: 'Autopista', icono: '🛣️', suelo: '#45403a', borde: '#7a6f5d', linea: '#ffd43b', detalle: '#2f2b27', fuera: '#22201c' },
  { nombre: 'Bosque', icono: '🌲', suelo: '#4d4234', borde: '#2f5d34', linea: '#c9b98f', detalle: '#3a3126', fuera: '#18301b' },
  { nombre: 'Puerto', icono: '⚓', suelo: '#3d4a52', borde: '#56717f', linea: '#f8f9fa', detalle: '#2c363c', fuera: '#13283a' },
  { nombre: 'Desierto', icono: '🏜️', suelo: '#b08a5a', borde: '#d4b483', linea: '#fff3bf', detalle: '#94744a', fuera: '#7a5c36' },
  { nombre: 'Nieve', icono: '❄️', suelo: '#8a96a3', borde: '#e7f0f7', linea: '#ffffff', detalle: '#6f7c89', fuera: '#c9d6e2' },
  { nombre: 'Fábrica', icono: '🏭', suelo: '#4a4440', borde: '#8c5a3c', linea: '#ffa94d', detalle: '#352f2c', fuera: '#241e1a' },
  { nombre: 'Laboratorio', icono: '🧪', suelo: '#38424d', borde: '#3c8f7c', linea: '#63e6be', detalle: '#29313a', fuera: '#0f1f1b' },
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
