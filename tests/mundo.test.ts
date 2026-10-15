import { describe, expect, test } from 'vitest';
import { estadisticasDe, nivelesVacios } from '../src/content/edificios';
import { ARMAS, dpsSoldado } from '../src/core/armas';
import { Rejilla } from '../src/core/colisiones';
import { ANCHO, PASO } from '../src/core/constantes';
import { esBuena, soldadosTrasPuerta, textoPuerta, valorEquivalente } from '../src/core/elementos';
import { anillos, OFFSETS, radioEscuadra } from '../src/core/escuadra';
import type { Evento, Nivel } from '../src/core/generador';
import { Mundo } from '../src/core/mundo';

const stats = estadisticasDe(nivelesVacios(), 'sargento');

function nivelCon(eventos: Evento[], largo = 5000): Nivel {
  return { n: 1, semilla: 'prueba', largo, eventos: eventos.sort((a, b) => a.y - b.y), vidaJefe: 500, escala: 1 };
}

function avanzar(m: Mundo, segundos: number, x: number | null = null): void {
  for (let i = 0; i < segundos / PASO; i++) m.paso({ x, habilidad: false });
}

describe('puertas', () => {
  test('operaciones y textos', () => {
    expect(soldadosTrasPuerta(10, { op: 'suma', valor: 5 })).toBe(15);
    expect(soldadosTrasPuerta(3, { op: 'suma', valor: -5 })).toBe(0);
    expect(soldadosTrasPuerta(7, { op: 'mult', valor: 2 })).toBe(14);
    expect(soldadosTrasPuerta(7, { op: 'div', valor: 2 })).toBe(3);
    expect(textoPuerta({ op: 'suma', valor: -4 })).toBe('−4');
    expect(esBuena({ op: 'div', valor: 2 })).toBe(false);
    expect(valorEquivalente(10, { op: 'cadencia', valor: 20 })).toBe(2);
  });

  test('cruzar por la izquierda aplica la puerta izquierda', () => {
    const m = new Mundo(nivelCon([{ tipo: 'puertas', y: 100, a: { op: 'suma', valor: 7 }, b: { op: 'suma', valor: -2 } }]), stats);
    avanzar(m, 2.5, 40);
    // Puede ser más de 7: los disparos suben la puerta antes de cruzarla.
    expect(m.soldados).toBeGreaterThanOrEqual(stats.soldados + 7);
  });

  test('las puertas de suma suben al dispararles', () => {
    const m = new Mundo(nivelCon([{ tipo: 'puertas', y: 400, a: { op: 'suma', valor: -3 }, b: { op: 'mult', valor: 2 } }]), stats);
    avanzar(m, 3, 60);
    expect(m.puertas[0].puertas[0].valor).toBeGreaterThan(-3);
  });
});

describe('pasillo lateral', () => {
  const fichasSuma = Array.from({ length: 5 }, (_, i) => ({ dy: 200 + i * 34, op: 'suma' as const, valor: 1, vida: 5 }));

  test('las fichas +1 suman soldados al romperlas', () => {
    const m = new Mundo(nivelCon([{ tipo: 'pasillo', y: 0, largo: 400, lado: 1, fichas: fichasSuma }]), stats);
    avanzar(m, 6, ANCHO);
    expect(m.soldados).toBe(stats.soldados + 5);
  });

  test('el muro no deja entrar al escuadrón en el pasillo', () => {
    const m = new Mundo(nivelCon([{ tipo: 'pasillo', y: 0, largo: 400, lado: 1, fichas: fichasSuma }]), stats);
    avanzar(m, 2, ANCHO);
    expect(m.x).toBeLessThanOrEqual(ANCHO - 90 + 28);
    expect(m.x).toBeGreaterThan(ANCHO - 90);
  });

  test('la escalera del lado derecho se rompe y multiplica al instante', () => {
    const fichas = [{ dy: 200, op: 'mult' as const, valor: 2, vida: 15 }];
    const m = new Mundo(nivelCon([{ tipo: 'pasillo', y: 0, largo: 400, lado: 1, fichas }]), stats);
    avanzar(m, 2.2, ANCHO);
    expect(m.pasillos[0].fichas[0].vivo).toBe(false);
    expect(m.soldados).toBe(stats.soldados * 2);
  });

  test('la escalera deja el total en el mayor multiplicador roto', () => {
    const fichas = [2, 3].map((k, i) => ({ dy: 150 + i * 60, op: 'mult' as const, valor: k, vida: 5 }));
    const m = new Mundo(nivelCon([{ tipo: 'pasillo', y: 0, largo: 300, lado: 0, fichas }]), stats);
    avanzar(m, 6, 0);
    expect(m.soldados).toBe(stats.soldados * 3);
  });
});

describe('combate', () => {
  test('el escuadrón dispara y mata a un zombi que viene de frente', () => {
    const m = new Mundo(nivelCon([{ tipo: 'zombi', y: 400, x: ANCHO / 2, z: 'caminante', vida: 20 }]), stats);
    avanzar(m, 4);
    expect(m.bajas).toBe(1);
    expect(m.monedas).toBeGreaterThan(0);
  });

  test('un zombi que toca al escuadrón elimina soldados', () => {
    const m = new Mundo(nivelCon([{ tipo: 'zombi', y: 60, x: ANCHO / 2, z: 'gordo', vida: 1e6 }]), stats);
    avanzar(m, 2);
    expect(m.soldados).toBe(stats.soldados - 3);
  });

  test('el escudo absorbe golpes', () => {
    const m = new Mundo(nivelCon([{ tipo: 'zombi', y: 60, x: ANCHO / 2, z: 'caminante', vida: 1e6 }]), { ...stats, escudo: 1 });
    avanzar(m, 2);
    expect(m.soldados).toBe(stats.soldados);
    expect(m.escudo).toBe(0);
  });

  test('romper un barril de soldados los suma; chocarlo sin romper resta', () => {
    const premio = new Mundo(nivelCon([{ tipo: 'barril', y: 300, x: ANCHO / 2, premio: 'soldados', valor: 4, vida: 30, explosivo: false }]), stats);
    avanzar(premio, 5);
    expect(premio.soldados).toBe(stats.soldados + 4);
    const choque = new Mundo(nivelCon([{ tipo: 'barril', y: 40, x: ANCHO / 2, premio: 'soldados', valor: 4, vida: 1e6, explosivo: false }]), stats);
    avanzar(choque, 2);
    expect(choque.soldados).toBe(stats.soldados - 1);
  });

  test('el barril explosivo daña a los zombis cercanos', () => {
    const m = new Mundo(
      nivelCon([
        { tipo: 'barril', y: 450, x: ANCHO / 2, premio: 'monedas', valor: 0, vida: 5, explosivo: true },
        { tipo: 'zombi', y: 470, x: ANCHO / 2 + 50, z: 'caminante', vida: 30 },
      ]),
      stats,
    );
    avanzar(m, 1.5);
    expect(m.zombis.filter((z) => z.tipo === 'caminante').length).toBe(0);
  });

  test('los pinchos quitan soldados mientras se pasa por encima', () => {
    const m = new Mundo(nivelCon([{ tipo: 'pinchos', y: 100, x: ANCHO / 2, ancho: 200 }]), { ...stats, soldados: 20 });
    avanzar(m, 3);
    expect(m.soldados).toBeLessThan(20);
  });

  test('al llegar al final aparece el jefe y al vencerlo se gana', () => {
    const m = new Mundo(nivelCon([], 200), { ...stats, soldados: 40, arma: 6 });
    avanzar(m, 4);
    expect(m.enJefe).toBe(true);
    avanzar(m, 30);
    expect(m.estado).toBe('victoria');
    expect(m.jefesDerrotados).toBe(1);
  });

  test('sin soldados se pierde y revivir sigue la partida', () => {
    const m = new Mundo(nivelCon([{ tipo: 'zombi', y: 40, x: ANCHO / 2, z: 'gordo', vida: 1e6 }]), { ...stats, soldados: 2 });
    avanzar(m, 2);
    expect(m.estado).toBe('derrota');
    m.revivir(6);
    expect(m.estado).toBe('jugando');
    expect(m.soldados).toBe(6);
  });

  test('la granada del sargento daña en área', () => {
    const m = new Mundo(nivelCon([{ tipo: 'zombi', y: 260, x: ANCHO / 2, z: 'gordo', vida: 1e6 }]), stats);
    avanzar(m, 0.5);
    const antes = m.zombis[0].vida;
    m.recarga = 0;
    m.paso({ x: null, habilidad: true });
    expect(m.zombis[0].vida).toBeLessThan(antes - 30);
    expect(m.recarga).toBeGreaterThan(0);
  });

  test('determinismo: la misma entrada da el mismo resultado', () => {
    const correr = () => {
      const m = new Mundo(
        nivelCon([
          { tipo: 'zombi', y: 300, x: 100, z: 'caminante', vida: 50 },
          { tipo: 'zombi', y: 320, x: 260, z: 'corredor', vida: 50 },
        ]),
        stats,
      );
      for (let i = 0; i < 400; i++) m.paso({ x: 100 + (i % 120), habilidad: i === 200 });
      return [m.x, m.y, m.soldados, m.bajas, m.zombis.map((z) => z.x.toFixed(3)).join()];
    };
    expect(correr()).toEqual(correr());
  });
});

describe('piezas', () => {
  test('armas: el poder sube con el nivel', () => {
    for (let i = 2; i <= ARMAS.length; i++) expect(dpsSoldado(i, 1, 1)).toBeGreaterThan(dpsSoldado(i - 1, 1, 1));
  });

  test('formación en panal: posiciones únicas y radio creciente', () => {
    const claves = new Set(OFFSETS.map((o) => `${o.x.toFixed(2)},${o.y.toFixed(2)}`));
    expect(claves.size).toBe(OFFSETS.length);
    expect(anillos(1)).toBe(0);
    expect(anillos(7)).toBe(1);
    expect(anillos(8)).toBe(2);
    expect(radioEscuadra(30)).toBeGreaterThan(radioEscuadra(5));
  });

  test('rejilla espacial: encuentra los cercanos', () => {
    const r = new Rejilla<{ x: number; y: number; r: number; marca: number; id: number }>();
    r.insertar({ x: 100, y: 100, r: 30, marca: 0, id: 1 });
    r.insertar({ x: 300, y: 900, r: 5, marca: 0, id: 2 });
    const vistos: number[] = [];
    r.consultar(110, 110, 10, (o) => void vistos.push(o.id));
    expect(vistos).toEqual([1]);
  });

  test('rendimiento: 60 s simulados con 500 zombis', () => {
    const m = new Mundo(nivelCon([], 1e9), { ...stats, soldados: 60, arma: 2 });
    m.registrar = false;
    m.estres(500);
    const t = performance.now();
    avanzar(m, 60, ANCHO / 2);
    expect(performance.now() - t).toBeLessThan(8000);
  }, 20000);
});
