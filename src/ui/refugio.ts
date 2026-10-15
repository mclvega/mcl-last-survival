import { app, type Pantalla } from '../app';
import { audio } from '../audio';
import { ASPECTOS } from '../content/aspectos';
import { EDIFICIOS, ORDEN_EDIFICIOS, costoMejora } from '../content/edificios';
import { comprarAspecto, mejorarEdificio } from '../economy/refugio';
import { efectos } from '../fx/loop';
import { avisar, boton, h } from './dom';
import { barra, chipMonedas } from './componentes';

/** Refugio: edificios que mejoran el escuadrón para siempre, y aspectos. */
export function pantallaRefugio(): Pantalla {
  const monedas = chipMonedas();
  const lista = h('div', { class: 'rejilla-tarjetas' });
  const aspectos = h('div', { class: 'segmentado aspectos' });

  const pintar = () => {
    const g = app.g;
    monedas.refrescar();
    lista.replaceChildren(
      ...ORDEN_EDIFICIOS.map((id) => {
        const e = EDIFICIOS[id];
        const nivel = g.refugio[id];
        const max = nivel >= e.max;
        const costo = costoMejora(id, nivel);
        const b = boton(max ? 'Máximo' : `Mejorar · 🪙 ${costo}`, (ev) => {
          const r = mejorarEdificio(app.g, id);
          if (r === 'ok') {
            app.guardar();
            audio.efecto('compra');
            efectos.destellos(ev.clientX, ev.clientY);
            pintar();
          } else {
            audio.efecto('error');
            avisar(r === 'sinMonedas' ? 'Te faltan monedas. ¡Juega un nivel más!' : 'Ya está al máximo.');
          }
        }, { variante: 'primario', deshabilitado: max });
        if (!max && g.monedas < costo) b.classList.add('falta');
        return h(
          'section',
          { class: 'tarjeta tarjeta-mejora' },
          h('div', { class: 'mejora-cabecera' }, h('span', { class: 'mejora-icono', 'aria-hidden': 'true', text: e.icono }), h('h2', { text: e.nombre }), h('span', { class: 'chip', text: `Nv ${nivel}/${e.max}` })),
          h('p', { class: 'texto-suave', text: e.descripcion }),
          barra(nivel, e.max, `${e.nombre}: nivel ${nivel} de ${e.max}`),
          h('p', { class: 'mejora-efecto' }, h('strong', { text: e.efecto(nivel) }), max ? null : h('span', { class: 'texto-suave', text: ` → ${e.efecto(nivel + 1)}` })),
          b,
        );
      }),
    );
    aspectos.replaceChildren(
      ...ASPECTOS.map((a) => {
        const tiene = g.aspectos.includes(a.id);
        const b = boton(tiene ? a.nombre : `${a.nombre} · 🪙 ${a.precio}`, () => {
          if (!tiene) {
            const r = comprarAspecto(app.g, a.id);
            if (r !== 'ok') {
              audio.efecto('error');
              avisar('Te faltan monedas.');
              return;
            }
            audio.efecto('compra');
          }
          app.g.aspecto = a.id;
          app.guardar();
          pintar();
        }, { variante: 'secundario' });
        b.prepend(h('span', { class: 'muestra-aspecto', style: { background: a.uniforme, borderColor: a.casco }, 'aria-hidden': 'true' }));
        b.setAttribute('aria-pressed', String(g.aspecto === a.id));
        return b;
      }),
    );
  };
  pintar();

  const el = h(
    'main',
    { class: 'pantalla pila' },
    h('header', { class: 'cabecera' }, boton('Volver', () => app.ir('inicio'), { icono: '←' }), h('h1', { text: '🏚️ Refugio' }), monedas.el),
    h('p', { class: 'texto-suave', text: 'Las mejoras del refugio son permanentes: tu escuadrón empieza cada partida más fuerte.' }),
    lista,
    h('section', { class: 'tarjeta pila' }, h('h2', { text: '🎨 Aspecto del escuadrón' }), aspectos),
  );
  return { el };
}
