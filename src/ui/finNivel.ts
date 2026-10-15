import { app } from '../app';
import { audio } from '../audio';
import { ESCENARIOS, NIVELES_POR_CAPITULO, ubicarNivel } from '../content/escenarios';
import { HEROES } from '../content/heroes';
import type { ParamsNivel } from '../core/dificultad';
import type { Mundo } from '../core/mundo';
import { desbloquearHeroesPorNivel } from '../economy/refugio';
import { costoRevivir, monedasPartida, premioNivel, sumarMonedas } from '../economy/wallet';
import { efectos } from '../fx/loop';
import { abrirModal, boton, h } from './dom';

/** Suma a los totales (misiones) y a la billetera lo ganado en la partida. Devuelve las monedas. */
export function registrarPartida(m: Mundo, victoria: boolean): number {
  const g = app.g;
  g.totales.zombis += m.bajas;
  g.totales.barriles += m.barrilesRotos;
  g.totales.jefes += m.jefesDerrotados;
  if (victoria) g.totales.niveles++;
  // Si se pierde, se conserva la mitad de lo recogido.
  const monedas = Math.round(monedasPartida(m.monedas, m.stats.monedas) * (victoria ? 1 : 0.5));
  sumarMonedas(g, monedas);
  return monedas;
}

function resumen(m: Mundo): HTMLElement {
  return h(
    'p',
    { class: 'resumen-partida' },
    h('span', { text: `🧟 ${m.bajas}` }),
    h('span', { text: `🛢️ ${m.barrilesRotos}` }),
    h('span', { text: `🪖 ${m.soldados}` }),
  );
}

/** Nivel completado: guarda el progreso, celebra y muestra estrellas y monedas. */
export function celebrarNivel(opciones: { n: number; p: ParamsNivel; mundo: Mundo }): void {
  const { n, p, mundo } = opciones;
  const g = app.g;
  const estrellas = mundo.estrellas();
  const nuevo = n === g.nivelActual;
  g.estrellas[n] = Math.max(g.estrellas[n] ?? 0, estrellas);
  if (nuevo) g.nivelActual = n + 1;
  const premio = premioNivel(n, p.tipo, estrellas);
  sumarMonedas(g, premio);
  const total = premio + registrarPartida(mundo, true);
  delete g.fallos[n];
  const nuevosHeroes = desbloquearHeroesPorNivel(g);
  app.guardar();

  audio.efecto('victoria');
  efectos.celebracion();

  let finCapitulo: string | null = null;
  if (nuevo && n % NIVELES_POR_CAPITULO === 0) {
    const sig = ubicarNivel(n + 1);
    finCapitulo = `🎉 ¡Capítulo superado! Sigue: ${ESCENARIOS[sig.escenario].icono} ${sig.nombre}${sig.vuelta > 1 ? ` (vuelta ${sig.vuelta})` : ''}.`;
  }

  const siguiente = boton('Siguiente nivel', () => {
    modal.cerrar();
    app.ir('juego', { nivel: n + 1 });
  }, { icono: '▶', variante: 'primario' });
  siguiente.dataset.focoInicial = '';
  const contenido = h(
    'div',
    { class: 'pila victoria' },
    h(
      'p',
      { class: 'estrellas', 'aria-label': `${estrellas} de 3 estrellas` },
      ...[1, 2, 3].map((i) => h('span', { class: i <= estrellas ? '' : 'apagada', 'aria-hidden': 'true', text: '⭐' })),
    ),
    h('p', { class: 'texto-grande centrado', text: `¡Bien hecho, ${app.nombre()}!` }),
    h(
      'p',
      { class: 'premio-monedas' },
      h('span', { class: 'moneda', 'aria-hidden': 'true', text: '🪙' }),
      h('strong', { text: `+${total}` }),
      h('span', { text: ' monedas' }),
      p.tipo === 'jefe' ? h('span', { class: 'doble', text: '×2' }) : null,
    ),
    resumen(mundo),
    finCapitulo ? h('p', { class: 'mensaje-ok centrado', text: finCapitulo }) : null,
    ...nuevosHeroes.map((id) => h('p', { class: 'mensaje-ok centrado', text: `${HEROES[id].icono} ¡Nuevo héroe: ${HEROES[id].nombre}!` })),
    h(
      'div',
      { class: 'fila-botones' },
      siguiente,
      boton('Refugio', () => {
        modal.cerrar();
        app.ir('refugio');
      }, { icono: '🏚️' }),
      boton('Inicio', () => {
        modal.cerrar();
        app.ir('inicio');
      }, { icono: '🏠' }),
    ),
  );
  const modal = abrirModal({ titulo: `¡Nivel ${n} superado!`, contenido, cerrable: false, clase: 'modal-victoria' });
}

export type OpcionDerrota = 'revivir' | 'reintentar' | 'facil' | 'refugio' | 'inicio';

/** Derrota: segunda oportunidad (ficha o monedas, nunca anuncios), reintentar o mejorar el refugio. */
export function abrirDerrota(opciones: { n: number; mundo: Mundo; puedeRevivir: boolean; ofrecerFacil: boolean }): Promise<OpcionDerrota> {
  const { n, mundo } = opciones;
  const g = app.g;
  audio.efecto('derrota');
  return new Promise((resolver) => {
    let eleccion: OpcionDerrota = 'inicio';
    const elegir = (o: OpcionDerrota) => () => {
      eleccion = o;
      modal.cerrar();
    };
    const costo = costoRevivir(n);
    const conFicha = g.fichasRescate > 0;
    const revivir = opciones.puedeRevivir
      ? boton(conFicha ? `Revivir (🎟️ ${g.fichasRescate})` : `Revivir (🪙 ${costo})`, elegir('revivir'), {
          icono: '❤️',
          variante: 'primario',
          deshabilitado: !conFicha && g.monedas < costo,
        })
      : null;
    const reintentar = boton('Reintentar', elegir('reintentar'), { icono: '↻', variante: revivir ? 'secundario' : 'primario' });
    (revivir && !revivir.disabled ? revivir : reintentar).dataset.focoInicial = '';
    const texto = mundo.enJefe ? 'El jefe te venció. ¡Estuviste muy cerca!' : `Llegaste al ${Math.round(mundo.progreso() * 100)} % del nivel.`;
    const modal = abrirModal({
      titulo: `💀 ¡Caíste, ${app.nombre()}!`,
      contenido: h(
        'div',
        { class: 'pila' },
        h('p', { class: 'texto-grande centrado', text: texto }),
        resumen(mundo),
        h('div', { class: 'fila-botones' }, revivir, reintentar),
        opciones.ofrecerFacil ? boton('Hacer este nivel más fácil', elegir('facil'), { icono: '🙂', variante: 'suave', clase: 'btn-ancho' }) : null,
        h('p', { class: 'texto-suave centrado', text: 'Consejo: mejora el Cuartel y la Armería en el refugio.' }),
        h(
          'div',
          { class: 'fila-botones' },
          boton('Refugio', elegir('refugio'), { icono: '🏚️', variante: 'suave' }),
          boton('Inicio', elegir('inicio'), { icono: '🏠', variante: 'suave' }),
        ),
      ),
      cerrable: false,
      clase: 'modal-derrota',
      alCerrar: () => resolver(eleccion),
    });
  });
}

/** Fin del modo Horda: metros alcanzados, récord y monedas. */
export function abrirFinHorda(mundo: Mundo): void {
  const g = app.g;
  const metros = mundo.metros();
  const record = metros > g.recordHorda;
  if (record) g.recordHorda = metros;
  const monedas = registrarPartida(mundo, false) + Math.floor(metros / 10);
  sumarMonedas(g, Math.floor(metros / 10));
  app.guardar();
  audio.efecto(record ? 'victoria' : 'derrota');
  if (record) efectos.celebracion();
  const otra = boton('Otra vez', () => {
    modal.cerrar();
    app.ir('juego', { modo: 'horda' });
  }, { icono: '↻', variante: 'primario' });
  otra.dataset.focoInicial = '';
  const modal = abrirModal({
    titulo: record ? '🏆 ¡Nuevo récord!' : '🧟 La horda ganó esta vez',
    contenido: h(
      'div',
      { class: 'pila victoria' },
      h('p', { class: 'record-metros', text: `${metros} m` }),
      h('p', { class: 'texto-suave centrado', text: `Récord: ${g.recordHorda} m` }),
      h('p', { class: 'premio-monedas' }, h('span', { class: 'moneda', 'aria-hidden': 'true', text: '🪙' }), h('strong', { text: `+${monedas}` }), h('span', { text: ' monedas' })),
      resumen(mundo),
      h('div', { class: 'fila-botones' }, otra, boton('Inicio', () => {
        modal.cerrar();
        app.ir('inicio');
      }, { icono: '🏠' })),
    ),
    cerrable: false,
    clase: 'modal-victoria',
  });
}
