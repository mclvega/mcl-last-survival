/** Héroes: líder del escuadrón con una habilidad activa y un pasivo. Sin gacha. */
export type IdHeroe = 'sargento' | 'medica' | 'ingeniero' | 'francotiradora';

export interface Heroe {
  id: IdHeroe;
  nombre: string;
  icono: string;
  color: string;
  habilidad: string;
  descHabilidad: string;
  pasivo: string;
  /** Segundos de recarga de la habilidad. */
  recarga: number;
  /** Monedas para desbloquearlo antes de tiempo (0 = inicial). */
  costo: number;
  /** Nivel en el que se desbloquea gratis. */
  nivel: number;
}

export const HEROES: Record<IdHeroe, Heroe> = {
  sargento: {
    id: 'sargento',
    nombre: 'Sargento Rojas',
    icono: '🎖️',
    color: '#e8590c',
    habilidad: 'Granada',
    descHabilidad: 'Lanza una granada que daña a todos los zombis en un área frente al escuadrón.',
    pasivo: '+5 % de daño',
    recarga: 10,
    costo: 0,
    nivel: 1,
  },
  medica: {
    id: 'medica',
    nombre: 'Doctora Vega',
    icono: '⛑️',
    color: '#e03131',
    habilidad: 'Refuerzo',
    descHabilidad: 'Recupera parte de los soldados perdidos (al menos 3).',
    pasivo: '+2 soldados iniciales',
    recarga: 16,
    costo: 600,
    nivel: 12,
  },
  ingeniero: {
    id: 'ingeniero',
    nombre: 'Ingeniero Paz',
    icono: '🔧',
    color: '#f2c94c',
    habilidad: 'Torreta',
    descHabilidad: 'Coloca una torreta que dispara sola durante 8 segundos.',
    pasivo: '+10 % de monedas',
    recarga: 15,
    costo: 1200,
    nivel: 22,
  },
  francotiradora: {
    id: 'francotiradora',
    nombre: 'Francotiradora Luna',
    icono: '🎯',
    color: '#7048e8',
    habilidad: 'Disparo cargado',
    descHabilidad: 'Un disparo enorme al enemigo más fuerte. Ideal contra jefes.',
    pasivo: 'Las balas atraviesan 1 enemigo más',
    recarga: 12,
    costo: 2000,
    nivel: 32,
  },
};

export const ORDEN_HEROES: IdHeroe[] = ['sargento', 'medica', 'ingeniero', 'francotiradora'];
