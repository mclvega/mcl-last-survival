/** Barriles y puertas del camino: premios y operaciones sobre el escuadrón. */
export type Premio = 'soldados' | 'arma' | 'cadencia' | 'dano' | 'escudo' | 'monedas';

export const PREMIOS: Record<Premio, { icono: string; nombre: string }> = {
  soldados: { icono: '🪖', nombre: 'Soldados' },
  arma: { icono: '🔫', nombre: 'Mejor arma' },
  cadencia: { icono: '⚡', nombre: 'Cadencia' },
  dano: { icono: '💥', nombre: 'Daño' },
  escudo: { icono: '🛡️', nombre: 'Escudo' },
  monedas: { icono: '🪙', nombre: 'Monedas' },
};

export function textoPremio(premio: Premio, valor: number): string {
  switch (premio) {
    case 'soldados':
      return `+${valor} 🪖`;
    case 'arma':
      return '¡Mejor arma!';
    case 'cadencia':
      return `+${valor}% ⚡`;
    case 'dano':
      return `+${valor}% 💥`;
    case 'escudo':
      return `+${valor} 🛡️`;
    case 'monedas':
      return `+${valor} 🪙`;
  }
}

export type OpPuerta = 'suma' | 'mult' | 'div' | 'cadencia' | 'dano';

export interface DefPuerta {
  op: OpPuerta;
  valor: number;
}

export function textoPuerta(p: DefPuerta): string {
  switch (p.op) {
    case 'suma':
      return p.valor >= 0 ? `+${p.valor}` : `−${-p.valor}`;
    case 'mult':
      return `×${p.valor}`;
    case 'div':
      return `÷${p.valor}`;
    case 'cadencia':
      return `⚡+${p.valor}%`;
    case 'dano':
      return `💥+${p.valor}%`;
  }
}

export function esBuena(p: DefPuerta): boolean {
  if (p.op === 'suma') return p.valor > 0;
  return p.op !== 'div';
}

/** Soldados que quedan al cruzar la puerta. */
export function soldadosTrasPuerta(n: number, p: DefPuerta): number {
  switch (p.op) {
    case 'suma':
      return Math.max(0, n + p.valor);
    case 'mult':
      return n * p.valor;
    case 'div':
      return Math.floor(n / p.valor);
    default:
      return n;
  }
}

/** Cambio de poder de la puerta medido en "soldados equivalentes" (para el generador y el bot). */
export function valorEquivalente(n: number, p: DefPuerta): number {
  if (p.op === 'cadencia' || p.op === 'dano') return (n * p.valor) / 100;
  return soldadosTrasPuerta(n, p) - n;
}
