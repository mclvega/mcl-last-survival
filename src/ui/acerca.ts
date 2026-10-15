import { app, type Pantalla } from '../app';
import { ARMAS } from '../core/armas';
import { ZOMBIS, type TipoZombi } from '../core/enemigos';
import { VERSION } from '../version';
import { boton, h } from './dom';

export function pantallaAcerca(): Pantalla {
  const seccion = (titulo: string, ...parrafos: Array<string | HTMLElement>) =>
    h('section', { class: 'tarjeta pila' }, h('h2', { text: titulo }), ...parrafos.map((p) => (typeof p === 'string' ? h('p', { text: p }) : p)));
  const esIos = /iPad|iPhone|iPod/.test(navigator.userAgent);

  const el = h(
    'main',
    { class: 'pantalla pila' },
    h('header', { class: 'cabecera' }, boton('Volver', () => app.ir('inicio'), { icono: '←' }), h('h1', { text: 'ℹ️ Acerca de Last Survival' })),
    seccion(
      '¿Cómo se juega?',
      '1. Arrastra el dedo a izquierda o derecha (desde cualquier parte de la pantalla) para mover tu escuadrón. Disparan solos.',
      '2. Dispara a los barriles: el ícono indica el premio (soldados, mejor arma, cadencia, daño, escudo o monedas). Si chocas con uno sin romperlo, pierdes un soldado.',
      '3. Cruza las puertas azules y evita las rojas. Las puertas con «+» o «−» suben si les disparas.',
      '4. Cada zombi que te toca elimina soldados. Esquiva los pinchos, las ruedas y los escupitajos verdes.',
      '5. Al final del camino aparece el jefe: derrótalo para ganar. Usa la habilidad de tu héroe con el botón redondo (o la barra espaciadora).',
      'En la computadora también puedes jugar con las flechas o A y D. Esc pausa la partida.',
    ),
    seccion(
      'Un juego que no termina',
      'Los niveles se crean solos a partir de su número: el nivel 25 es igual para todos. Un jugador automático comprueba que cada nivel se puede ganar.',
      'Cada 10 niveles cambia el escenario y hay un jefe especial con premio doble. A partir del nivel 11 se desbloquea el Modo Horda: un camino sin fin para batir tu récord.',
    ),
    seccion(
      'Armas y zombis',
      `Armas: ${ARMAS.map((a) => `${a.icono} ${a.nombre}`).join(' · ')}.`,
      `Zombis: ${(Object.keys(ZOMBIS) as TipoZombi[]).map((z) => ZOMBIS[z].nombre).join(', ')}.`,
    ),
    seccion(
      'Instalar en el celular',
      esIos
        ? 'En iPhone: toca el botón Compartir de Safari y elige «Agregar a pantalla de inicio». Así se juega a pantalla completa y sin conexión.'
        : 'En Android: abre el menú del navegador y elige «Instalar app» o «Agregar a pantalla de inicio». También puedes usar el botón «Instalar» del inicio cuando aparezca.',
    ),
    seccion(
      'Sin compras ni anuncios',
      'Todo se gana jugando: monedas, mejoras del refugio, héroes y aspectos. No hay dinero real, gacha ni publicidad.',
      'Tu nombre y tu progreso se guardan solo en este navegador. No se envían a ningún servidor.',
    ),
    seccion(
      'Créditos',
      'Gráficos dibujados en código y sonido sintetizado en el navegador: no se usan imágenes ni audio de otros juegos.',
      'Inspirado en la mecánica de los shooters de escuadrón vertical para celular. Last Survival no está relacionado con ningún otro juego ni empresa.',
    ),
    h('p', { class: 'texto-suave centrado', text: `Versión ${VERSION}` }),
  );
  return { el };
}
