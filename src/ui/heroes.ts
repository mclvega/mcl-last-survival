import { app, type Pantalla } from '../app';
import { audio } from '../audio';
import { HEROES, ORDEN_HEROES } from '../content/heroes';
import { comprarHeroe } from '../economy/refugio';
import { efectos } from '../fx/loop';
import { avisar, boton, h } from './dom';
import { chipMonedas } from './componentes';

/** Héroes: el líder del escuadrón. Se desbloquean jugando o con monedas (sin gacha). */
export function pantallaHeroes(): Pantalla {
  const monedas = chipMonedas();
  const lista = h('div', { class: 'rejilla-tarjetas' });

  const pintar = () => {
    const g = app.g;
    monedas.refrescar();
    lista.replaceChildren(
      ...ORDEN_HEROES.map((id) => {
        const hr = HEROES[id];
        const tiene = g.heroes.includes(id);
        const elegido = g.heroe === id;
        let accion: HTMLElement;
        if (elegido) accion = h('p', { class: 'mensaje-ok centrado', text: '✔ Líder actual' });
        else if (tiene)
          accion = boton('Elegir como líder', () => {
            app.g.heroe = id;
            app.guardar();
            audio.efecto('boton');
            pintar();
          }, { variante: 'primario' });
        else
          accion = boton(`Desbloquear · 🪙 ${hr.costo}`, (ev) => {
            if (comprarHeroe(app.g, id) !== 'ok') {
              audio.efecto('error');
              avisar(`Te faltan monedas. También se desbloquea gratis al superar el nivel ${hr.nivel}.`);
              return;
            }
            app.g.heroe = id;
            app.guardar();
            audio.efecto('compra');
            efectos.destellos(ev.clientX, ev.clientY);
            pintar();
          }, { variante: 'secundario' });
        return h(
          'section',
          { class: `tarjeta tarjeta-heroe ${elegido ? 'elegido' : ''} ${tiene ? '' : 'bloqueado'}`, style: { borderColor: elegido ? hr.color : '' } },
          h('div', { class: 'mejora-cabecera' }, h('span', { class: 'mejora-icono', 'aria-hidden': 'true', text: hr.icono }), h('h2', { text: hr.nombre })),
          h('p', {}, h('strong', { text: `${hr.habilidad} ` }), h('span', { class: 'chip', text: `⏱ ${hr.recarga} s` })),
          h('p', { class: 'texto-suave', text: hr.descHabilidad }),
          h('p', { text: `Pasivo: ${hr.pasivo}` }),
          !tiene ? h('p', { class: 'texto-suave', text: `Gratis al superar el nivel ${hr.nivel}.` }) : null,
          accion,
        );
      }),
    );
  };
  pintar();

  const el = h(
    'main',
    { class: 'pantalla pila' },
    h('header', { class: 'cabecera' }, boton('Volver', () => app.ir('inicio'), { icono: '←' }), h('h1', { text: '🦸 Héroes' }), monedas.el),
    lista,
  );
  return { el };
}
