import { describe, expect, test } from 'vitest';
import { costoMejora, EDIFICIOS, estadisticasDe, nivelesVacios } from '../src/content/edificios';
import { comprarAspecto, comprarHeroe, desbloquearHeroesPorNivel, estadisticasJugador, mejorarEdificio } from '../src/economy/refugio';
import { cobrarMision, DIARIA, premioNivel, progresoMision, reclamarDiaria } from '../src/economy/wallet';
import { exportarCodigo, guardadoNuevo, importarCodigo, limpiarNombre, normalizarGuardado } from '../src/storage';

describe('refugio y héroes', () => {
  test('mejorar cuesta monedas y sube el nivel', () => {
    const g = guardadoNuevo();
    expect(mejorarEdificio(g, 'cuartel')).toBe('sinMonedas');
    g.monedas = 1000;
    expect(mejorarEdificio(g, 'cuartel')).toBe('ok');
    expect(g.refugio.cuartel).toBe(1);
    expect(g.monedas).toBe(1000 - costoMejora('cuartel', 0));
    expect(estadisticasJugador(g).soldados).toBe(4);
  });

  test('los costos suben y hay un máximo', () => {
    expect(costoMejora('armeria', 5)).toBeGreaterThan(costoMejora('armeria', 4));
    const g = guardadoNuevo();
    g.monedas = 1e9;
    for (let i = 0; i < 100; i++) mejorarEdificio(g, 'enfermeria');
    expect(g.refugio.enfermeria).toBe(EDIFICIOS.enfermeria.max);
    expect(mejorarEdificio(g, 'enfermeria')).toBe('maximo');
  });

  test('la armería mejora el arma inicial cada 5 niveles', () => {
    const niveles = nivelesVacios();
    niveles.armeria = 10;
    expect(estadisticasDe(niveles, 'sargento').arma).toBe(3);
  });

  test('héroes: se compran o se desbloquean por nivel', () => {
    const g = guardadoNuevo();
    expect(comprarHeroe(g, 'medica')).toBe('sinMonedas');
    g.nivelActual = 13;
    expect(desbloquearHeroesPorNivel(g)).toEqual(['medica']);
    expect(comprarHeroe(g, 'medica')).toBe('yaComprado');
    g.monedas = 5000;
    expect(comprarHeroe(g, 'francotiradora')).toBe('ok');
    expect(comprarAspecto(g, 'urbano')).toBe('ok');
    expect(comprarAspecto(g, 'noexiste')).toBe('noExiste');
  });
});

describe('billetera', () => {
  test('premio del nivel: más estrellas y jefe dan más', () => {
    expect(premioNivel(10, 'normal', 3)).toBeGreaterThan(premioNivel(10, 'normal', 1));
    expect(premioNivel(10, 'jefe', 3)).toBe(premioNivel(10, 'normal', 3) * 2);
  });

  test('recompensa diaria con racha', () => {
    const g = guardadoNuevo();
    const fichas = g.fichasRescate;
    expect(reclamarDiaria(g, '2026-10-01', '2026-09-30')?.monedas).toBe(DIARIA[0].monedas);
    expect(reclamarDiaria(g, '2026-10-01', '2026-09-30')).toBeNull();
    reclamarDiaria(g, '2026-10-02', '2026-10-01');
    const tercero = reclamarDiaria(g, '2026-10-03', '2026-10-02');
    expect(tercero?.dia).toBe(2);
    expect(g.fichasRescate).toBe(fichas + 1);
    // Faltar un día reinicia la racha.
    expect(reclamarDiaria(g, '2026-10-05', '2026-10-04')?.dia).toBe(0);
  });

  test('misiones por escalones', () => {
    const g = guardadoNuevo();
    g.totales.zombis = 150;
    expect(progresoMision(g, 'zombis').lista).toBe(true);
    const premio = cobrarMision(g, 'zombis');
    expect(premio).toBeGreaterThan(0);
    expect(g.monedas).toBe(premio);
    expect(progresoMision(g, 'zombis').meta).toBe(400);
    expect(cobrarMision(g, 'zombis')).toBe(0);
  });
});

describe('guardado', () => {
  test('repara datos dañados', () => {
    const g = normalizarGuardado({ v: 1, nombre: '<b>', monedas: -5, refugio: { cuartel: 999 }, heroe: 'medica', heroes: ['x'], aspecto: 'elite', config: { fps: 7 } });
    expect(g.nombre).toBeNull();
    expect(g.monedas).toBe(0);
    expect(g.refugio.cuartel).toBe(EDIFICIOS.cuartel.max);
    expect(g.heroe).toBe('sargento');
    expect(g.aspecto).toBe('militar');
    expect(g.config.fps).toBe(60);
    expect(normalizarGuardado('basura').nivelActual).toBe(1);
  });

  test('exportar e importar dan el mismo estado', () => {
    const g = guardadoNuevo();
    g.nombre = 'Ana';
    g.monedas = 321;
    g.nivelActual = 17;
    g.refugio.taller = 4;
    expect(importarCodigo(exportarCodigo(g))).toEqual(g);
    expect(importarCodigo('LS1-esto-no-sirve')).toBeNull();
  });

  test('nombres válidos', () => {
    expect(limpiarNombre('  Ana   María ')).toBe('Ana María');
    expect(limpiarNombre('Player_1')).toBe('Player_1');
    expect(limpiarNombre('<script>')).toBeNull();
  });
});
