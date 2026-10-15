import { ASPECTOS_POR_ID } from '../content/aspectos';
import { EDIFICIOS, costoMejora, estadisticasDe, type IdEdificio } from '../content/edificios';
import { HEROES, ORDEN_HEROES, type IdHeroe } from '../content/heroes';
import type { Estadisticas } from '../core/escuadra';
import type { Guardado } from '../storage';
import { gastarMonedas } from './wallet';

export type ResultadoCompra = 'ok' | 'sinMonedas' | 'maximo' | 'yaComprado' | 'noExiste';

/** Estadísticas del jugador para empezar una partida. */
export function estadisticasJugador(g: Guardado): Estadisticas {
  return estadisticasDe(g.refugio, g.heroe);
}

export function mejorarEdificio(g: Guardado, id: IdEdificio): ResultadoCompra {
  const nivel = g.refugio[id];
  if (nivel >= EDIFICIOS[id].max) return 'maximo';
  if (!gastarMonedas(g, costoMejora(id, nivel))) return 'sinMonedas';
  g.refugio[id] = nivel + 1;
  return 'ok';
}

export function comprarHeroe(g: Guardado, id: IdHeroe): ResultadoCompra {
  if (g.heroes.includes(id)) return 'yaComprado';
  if (!gastarMonedas(g, HEROES[id].costo)) return 'sinMonedas';
  g.heroes.push(id);
  return 'ok';
}

/** Desbloquea gratis los héroes cuyo nivel ya se alcanzó. Devuelve los nuevos. */
export function desbloquearHeroesPorNivel(g: Guardado): IdHeroe[] {
  const nuevos = ORDEN_HEROES.filter((id) => !g.heroes.includes(id) && g.nivelActual > HEROES[id].nivel);
  g.heroes.push(...nuevos);
  return nuevos;
}

export function comprarAspecto(g: Guardado, id: string): ResultadoCompra {
  const a = ASPECTOS_POR_ID.get(id);
  if (!a) return 'noExiste';
  if (g.aspectos.includes(id)) return 'yaComprado';
  if (!gastarMonedas(g, a.precio)) return 'sinMonedas';
  g.aspectos.push(id);
  return 'ok';
}
