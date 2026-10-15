import { app, type Pantalla } from '../app';
import { audio } from '../audio';
import { MISIONES } from '../content/misiones';
import { cobrarMision, progresoMision } from '../economy/wallet';
import { efectos } from '../fx/loop';
import { boton, h } from './dom';
import { barra, chipMonedas } from './componentes';

/** Misiones sin fin con escalones de metas crecientes. */
export function pantallaMisiones(): Pantalla {
  const monedas = chipMonedas();
  const lista = h('div', { class: 'rejilla-tarjetas' });
  const pintar = () => {
    monedas.refrescar();
    lista.replaceChildren(
      ...MISIONES.map((m) => {
        const pr = progresoMision(app.g, m.id);
        return h(
          'section',
          { class: `tarjeta tarjeta-mejora ${pr.lista ? 'lista' : ''}` },
          h('div', { class: 'mejora-cabecera' }, h('span', { class: 'mejora-icono', 'aria-hidden': 'true', text: m.icono }), h('h2', { text: m.texto(pr.meta) })),
          barra(pr.actual, pr.meta, `${Math.min(pr.actual, pr.meta)} de ${pr.meta}`),
          h('p', { class: 'texto-suave', text: `${Math.min(pr.actual, pr.meta)} / ${pr.meta} · premio 🪙 ${pr.premio}` }),
          boton(pr.lista ? `Cobrar 🪙 ${pr.premio}` : 'En progreso', (ev) => {
            if (!cobrarMision(app.g, m.id)) return;
            app.guardar();
            audio.efecto('compra');
            efectos.destellos(ev.clientX, ev.clientY);
            pintar();
          }, { variante: pr.lista ? 'primario' : 'suave', deshabilitado: !pr.lista }),
        );
      }),
    );
  };
  pintar();
  const el = h(
    'main',
    { class: 'pantalla pila' },
    h('header', { class: 'cabecera' }, boton('Volver', () => app.ir('inicio'), { icono: '←' }), h('h1', { text: '🎯 Misiones' }), monedas.el),
    lista,
  );
  return { el };
}
