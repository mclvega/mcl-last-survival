import { describe, expect, test } from 'vitest';
import { generarNivelValidado, simular } from '../src/core/bot';
import { ANCHO } from '../src/core/constantes';
import { estadisticasReferencia, MODOS, paramsNivel, tipoNivel, type Dificultad } from '../src/core/dificultad';
import { generarHorda, generarNivel, secuenciaTramos } from '../src/core/generador';
import { rngFrom } from '../src/core/rng';

const DIFICULTADES = Object.keys(MODOS) as Dificultad[];

describe('generador de niveles', () => {
  test('el mismo nivel y dificultad dan siempre el mismo camino', () => {
    for (const n of [1, 7, 42, 333]) {
      const a = generarNivel(paramsNivel(n, 'normal'), estadisticasReferencia(n));
      const b = generarNivel(paramsNivel(n, 'normal'), estadisticasReferencia(n));
      expect(JSON.stringify(a.eventos)).toBe(JSON.stringify(b.eventos));
      expect(a.vidaJefe).toBe(b.vidaJefe);
    }
  });

  test('niveles distintos son distintos', () => {
    const a = generarNivel(paramsNivel(20, 'normal'), estadisticasReferencia(20));
    const b = generarNivel(paramsNivel(21, 'normal'), estadisticasReferencia(21));
    expect(JSON.stringify(a.eventos)).not.toBe(JSON.stringify(b.eventos));
  });

  test('los eventos están ordenados, dentro del camino y del ancho', () => {
    for (const n of [1, 5, 30, 120]) {
      const nivel = generarNivel(paramsNivel(n, 'dificil'), estadisticasReferencia(n));
      for (let i = 1; i < nivel.eventos.length; i++) expect(nivel.eventos[i].y).toBeGreaterThanOrEqual(nivel.eventos[i - 1].y);
      for (const e of nivel.eventos) {
        expect(e.y).toBeLessThanOrEqual(nivel.largo);
        if ('x' in e) {
          expect(e.x).toBeGreaterThanOrEqual(0);
          expect(e.x).toBeLessThanOrEqual(ANCHO);
        }
      }
      expect(nivel.vidaJefe).toBeGreaterThan(0);
    }
  });

  test('los niveles del 1 al 1000 se generan en menos de 20 ms', () => {
    let peor = 0;
    for (let n = 1; n <= 1000; n++) {
      const t = performance.now();
      generarNivel(paramsNivel(n, DIFICULTADES[n % 3]), estadisticasReferencia(n));
      peor = Math.max(peor, performance.now() - t);
    }
    expect(peor).toBeLessThan(20);
  });

  test('tutorial fijo y tipos de nivel', () => {
    expect(secuenciaTramos(paramsNivel(1, 'normal'), rngFrom('x'))).toEqual(['calentamiento', 'barriles']);
    expect(tipoNivel(10)).toBe('jefe');
    expect(tipoNivel(15)).toBe('descanso');
    expect(tipoNivel(17)).toBe('normal');
    expect(paramsNivel(1, 'normal').zombis).toEqual(['caminante']);
    expect(paramsNivel(30, 'normal').zombis).toContain('escupidor');
  });

  test('Fácil y «más fácil» reducen la cantidad de zombis', () => {
    expect(paramsNivel(30, 'facil').fraccion).toBeLessThan(paramsNivel(30, 'normal').fraccion);
    expect(paramsNivel(30, 'normal', true).fraccion).toBeLessThan(paramsNivel(30, 'normal').fraccion);
  });

  test('el modo Horda genera camino a medida que se avanza', () => {
    const nivel = generarHorda('normal', estadisticasReferencia(20), 'prueba');
    const antes = nivel.eventos.length;
    nivel.extender!(20000);
    expect(nivel.eventos.length).toBeGreaterThan(antes);
    expect(nivel.largo).toBe(Infinity);
  });
});

describe('niveles ganables (bot)', () => {
  // El juego valida cada nivel con el bot y, si lo pierde, lo regenera con menos
  // zombis. Los niveles que se juegan deben poder ganarse casi siempre.
  test.each(['facil', 'normal', 'dificil'] as Dificultad[])('dificultad %s', (dif) => {
    const niveles = [1, 2, 3, 4, 6, 9, 10, 12, 15, 19, 20, 24, 28, 33, 40, 47, 55, 64, 75, 90];
    let ganados = 0;
    for (const n of niveles) {
      const ref = estadisticasReferencia(n);
      if (simular(generarNivelValidado(paramsNivel(n, dif), ref), ref).estado === 'victoria') ganados++;
    }
    expect(ganados / niveles.length).toBeGreaterThanOrEqual(0.9);
  }, 120000);

  test('la dificultad es real: sin validar, el bot pierde algunos niveles en Difícil', () => {
    let perdidos = 0;
    for (const n of [20, 30, 40, 50, 60, 70, 80, 90]) {
      const ref = estadisticasReferencia(n);
      if (simular(generarNivel(paramsNivel(n, 'dificil'), ref), ref).estado !== 'victoria') perdidos++;
    }
    expect(perdidos).toBeGreaterThan(0);
  }, 60000);

  test('los niveles del tutorial siempre se ganan', () => {
    for (const dif of ['facil', 'normal', 'dificil'] as Dificultad[]) {
      for (const n of [1, 2, 3]) {
        const ref = estadisticasReferencia(n);
        expect(simular(generarNivelValidado(paramsNivel(n, dif), ref), ref).estado).toBe('victoria');
      }
    }
  });
});
