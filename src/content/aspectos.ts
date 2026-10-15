/** Aspectos del escuadrón (cosméticos, se compran en el refugio). */
export interface Aspecto {
  id: string;
  nombre: string;
  uniforme: string;
  casco: string;
  precio: number;
}

export const ASPECTOS: Aspecto[] = [
  { id: 'militar', nombre: 'Táctico azul', uniforme: '#2f6fdb', casco: '#1b2a4a', precio: 0 },
  { id: 'selva', nombre: 'Selva', uniforme: '#5b7a3c', casco: '#3a4f27', precio: 200 },
  { id: 'urbano', nombre: 'Urbano', uniforme: '#56606e', casco: '#2f3540', precio: 300 },
  { id: 'desierto', nombre: 'Desierto', uniforme: '#c2a36b', casco: '#8a6d3b', precio: 500 },
  { id: 'artico', nombre: 'Ártico', uniforme: '#e9eef3', casco: '#9aa8b6', precio: 800 },
  { id: 'elite', nombre: 'Élite', uniforme: '#22223b', casco: '#e94560', precio: 1500 },
];

export const ASPECTOS_POR_ID = new Map(ASPECTOS.map((a) => [a.id, a]));
