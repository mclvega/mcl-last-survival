import { app, type Pantalla } from '../app';
import { ESCENARIOS, NIVELES_POR_CAPITULO, ubicarNivel } from '../content/escenarios';
import { tipoNivel } from '../core/dificultad';
import { boton, h } from './dom';

/** Mapa de capítulos: permite repetir niveles ya superados. */
export function pantallaMapa(): Pantalla {
  const g = app.g;
  const actual = ubicarNivel(g.nivelActual).capitulo;
  const capitulos: HTMLElement[] = [];
  for (let c = actual; c >= 0; c--) {
    const primero = c * NIVELES_POR_CAPITULO + 1;
    const ub = ubicarNivel(primero);
    const e = ESCENARIOS[ub.escenario];
    const niveles = Array.from({ length: NIVELES_POR_CAPITULO }, (_, i) => {
      const n = primero + i;
      const bloqueado = n > g.nivelActual;
      const estrellas = g.estrellas[n] ?? 0;
      const tipo = tipoNivel(n);
      return h(
        'button',
        {
          type: 'button',
          class: `celda-nivel ${n === g.nivelActual ? 'actual' : ''} ${tipo}`,
          disabled: bloqueado,
          'aria-label': bloqueado ? `Nivel ${n}, bloqueado` : `Nivel ${n}, ${estrellas} estrellas`,
          onclick: () => app.ir('juego', { nivel: n }),
        },
        h('strong', { text: tipo === 'jefe' ? `👹${n}` : String(n) }),
        h('small', { text: bloqueado ? '🔒' : estrellas ? '⭐'.repeat(estrellas) : '·' }),
      );
    });
    capitulos.push(
      h(
        'section',
        { class: 'tarjeta pila' },
        h('h2', { text: `${e.icono} Capítulo ${c + 1}: ${e.nombre}${ub.vuelta > 1 ? ` · vuelta ${ub.vuelta}` : ''}` }),
        h('div', { class: 'rejilla-niveles' }, ...niveles),
      ),
    );
  }
  const el = h(
    'main',
    { class: 'pantalla pila' },
    h('header', { class: 'cabecera' }, boton('Volver', () => app.ir('inicio'), { icono: '←' }), h('h1', { text: '🗺️ Mapa' })),
    ...capitulos,
  );
  return { el };
}
