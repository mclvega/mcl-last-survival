import { ANCHO } from './constantes';
import type { ParamsNivel } from './dificultad';
import { valorEquivalente } from './elementos';
import type { Estadisticas } from './escuadra';
import { generarNivel, type Nivel } from './generador';
import { Mundo, type Entrada, type EstadoPartida } from './mundo';

const CANDIDATOS = 13;

/**
 * Jugador automático sencillo: elige la mejor posición horizontal mirando lo
 * que viene (puertas, barriles, obstáculos, zombis y proyectiles).
 * Se usa para comprobar que los niveles se pueden ganar.
 */
export class Bot {
  private objetivo = ANCHO / 2;
  private espera = 0;

  decidir(m: Mundo): Entrada {
    if (--this.espera <= 0) {
      this.espera = 6;
      this.objetivo = this.mejorX(m);
    }
    const cerca = m.zombis.filter((z) => z.y - m.y < 320).length;
    const habilidad = m.recarga <= 0 && (m.jefe !== null || cerca > 8 || (m.stats.heroe === 'medica' && m.perdidos > 4));
    return { x: this.objetivo, habilidad };
  }

  private mejorX(m: Mundo): number {
    const r = m.radio;
    let mejor = m.x;
    let mejorPuntaje = -Infinity;
    for (let i = 0; i < CANDIDATOS; i++) {
      const x = r + ((ANCHO - 2 * r) * i) / (CANDIDATOS - 1);
      let p = -Math.abs(x - m.x) * 0.05;
      for (const par of m.puertas) {
        const d = par.y - m.y;
        if (par.cruzada || d < 0 || d > 500) continue;
        const lado = x < ANCHO / 2 ? 0 : 1;
        p += valorEquivalente(m.soldados, par.puertas[lado]) * 50;
      }
      for (const o of m.obstaculos) {
        const d = o.y - m.y;
        if (d < -20 || d > 260) continue;
        if (o.tipo === 'pinchos' && Math.abs(x - o.x) < o.ancho / 2 + r) p -= 400;
        if (o.tipo === 'rueda' && Math.abs(x - o.x) < r + 40) p -= 150;
      }
      for (const b of m.barriles) {
        const d = b.y - m.y;
        if (d < 0 || d > 450) continue;
        const alineado = Math.abs(x - b.x) < 22;
        if (b.explosivo) {
          if (d < 140 && Math.abs(x - b.x) < r + 60) p -= 80;
        } else {
          if (alineado) p += b.premio === 'soldados' ? 30 + b.valor * 6 : 60;
          if (d < 120 && Math.abs(x - b.x) < r + b.r) p -= 60;
        }
      }
      for (const pas of m.pasillos) {
        const viva = pas.fichas.find((f) => f.vivo && f.y > m.y && f.y - m.y < 450);
        if (!viva) continue;
        const borde = pas.lado === 0 ? 0 : ANCHO;
        p += Math.max(0, 120 - Math.abs(x - borde)) * (pas.fichas[0]?.op === 'mult' ? 1.2 : 0.8);
      }
      for (const z of m.zombis) {
        const d = z.y - m.y;
        if (d < 0 || d > 450) continue;
        if (Math.abs(x - z.x) < 30) p += Math.min(30, z.vida * 0.002);
      }
      for (const pr of m.proyectiles) {
        const d = pr.y - m.y;
        if (d < 0 || d > 140) continue;
        if (Math.abs(x - pr.x) < r + 10) p -= 100;
      }
      if (p > mejorPuntaje + 5) {
        mejorPuntaje = p;
        mejor = x;
      }
    }
    return mejor;
  }
}

export interface ResultadoSimulacion {
  estado: EstadoPartida;
  soldados: number;
  maxSoldados: number;
  segundos: number;
}

/** Juega un nivel completo con el bot (sin dibujar). */
export function simular(nivel: Nivel, stats: Estadisticas, maxSegundos = 400): ResultadoSimulacion {
  const m = new Mundo(nivel, stats);
  m.registrar = false;
  const bot = new Bot();
  const pasos = maxSegundos * 60;
  for (let i = 0; i < pasos && m.estado === 'jugando'; i++) m.paso(bot.decidir(m));
  return { estado: m.estado, soldados: m.soldados, maxSoldados: m.maxSoldados, segundos: m.t };
}

/**
 * Genera el nivel y comprueba con el bot que se puede ganar. Si el bot pierde,
 * se vuelve a generar con menos zombis (hasta 6 intentos).
 */
export function generarNivelValidado(p: ParamsNivel, ref: Estadisticas): Nivel {
  let nivel = generarNivel(p, ref, 0);
  for (let intento = 0; intento < 6; intento++) {
    nivel = generarNivel(p, ref, intento);
    // El bot debe ganar en un tiempo razonable (el camino más un minuto de jefe).
    if (simular(nivel, ref, nivel.largo / 75 + 60).estado === 'victoria') return nivel;
  }
  return nivel;
}
