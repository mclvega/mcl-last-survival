import { app, type Pantalla } from '../app';
import { audio } from '../audio';
import { ESCENARIOS, ubicarNivel } from '../content/escenarios';
import { HEROES } from '../content/heroes';
import { DIARIA, claveDia, diaDeRacha, misionesListas, puedeReclamarDiaria, reclamarDiaria } from '../economy/wallet';
import { efectos } from '../fx/loop';
import { VERSION } from '../version';
import { abrirModal, avisar, boton, h } from './dom';
import { chipMonedas, logo } from './componentes';

/** Nivel desde el que se desbloquea el modo Horda. */
export const NIVEL_HORDA = 10;

/** Botón redondo con ícono grande y nombre corto. */
function atajo(icono: string, texto: string, alHacerClic: () => void, insignia?: { texto: string; ok?: boolean }): HTMLElement {
  return h(
    'button',
    { type: 'button', class: 'atajo', onclick: alHacerClic, 'aria-label': insignia ? `${texto} (${insignia.texto})` : texto },
    h('span', { class: 'icono', 'aria-hidden': 'true', text: icono }),
    h('span', { class: 'atajo-texto', text: texto }),
    insignia ? h('span', { class: `insignia ${insignia.ok ? 'ok' : ''}`, 'aria-hidden': 'true', text: insignia.texto }) : null,
  );
}

function pantallaCompleta(): HTMLElement | null {
  if (!document.fullscreenEnabled) return null;
  return boton('', () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => undefined);
  }, { icono: '⛶', variante: 'suave', etiqueta: 'Pantalla completa', clase: 'btn-icono-solo' });
}

/** Recompensa diaria con racha de 7 días. */
function abrirDiaria(alCobrar: () => void): void {
  const g = app.g;
  const hoy = claveDia();
  const ayer = claveDia(new Date(Date.now() - 86400000));
  const disponible = puedeReclamarDiaria(g, hoy);
  const dia = disponible ? diaDeRacha(g, ayer) : (g.racha.dias - 1) % DIARIA.length;
  const tira = h(
    'div',
    { class: 'diaria' },
    ...DIARIA.map((p, i) =>
      h(
        'div',
        { class: `dia ${i < dia || (!disponible && i === dia) ? 'cobrado' : ''} ${i === dia && disponible ? 'hoy' : ''}` },
        h('small', { text: `Día ${i + 1}` }),
        h('strong', { text: `🪙${p.monedas}` }),
        p.fichas ? h('span', { text: '+🎟️' }) : null,
      ),
    ),
  );
  const cobrar = boton(disponible ? 'Cobrar' : 'Vuelve mañana', () => {
    const r = reclamarDiaria(app.g, hoy, ayer);
    if (!r) return;
    app.guardar();
    audio.efecto('compra');
    const rect = cobrar.getBoundingClientRect();
    efectos.destellos(rect.left + rect.width / 2, rect.top);
    avisar(`+${r.monedas} monedas${r.fichas ? ' y una ficha de rescate 🎟️' : ''}`);
    modal.cerrar();
    alCobrar();
  }, { icono: '🎁', variante: 'primario', deshabilitado: !disponible });
  const modal = abrirModal({
    titulo: '🎁 Recompensa diaria',
    contenido: h(
      'div',
      { class: 'pila' },
      h('p', { class: 'texto-suave', text: 'Entra cada día para subir la racha. Si faltas un día, vuelve a empezar.' }),
      tira,
      cobrar,
    ),
  });
}

/** Inicio: botón grande para jugar y accesos al refugio, héroes, misiones y recompensa diaria. */
export function pantallaInicio(): Pantalla {
  const g = app.g;
  const n = g.nivelActual;
  const ub = ubicarNivel(n);
  const monedas = chipMonedas();
  const diariaLista = puedeReclamarDiaria(g, claveDia());
  const listas = misionesListas(g);
  const heroe = HEROES[g.heroe];
  const enlace = (texto: string, ir: () => void) => h('button', { type: 'button', class: 'enlace', onclick: ir, text: texto });

  const el = h(
    'main',
    { class: 'pantalla inicio-simple' },
    h('header', { class: 'cabecera' }, logo(), pantallaCompleta(), monedas.el),
    h('h1', { class: 'centrado', text: `¡A sobrevivir, ${app.nombre()}!` }),
    h(
      'button',
      { type: 'button', class: 'btn btn-primario btn-jugar-grande', onclick: () => app.ir('juego', { nivel: n }) },
      h('span', { class: 'jugar-icono', 'aria-hidden': 'true', text: '▶' }),
      h('span', { class: 'btn-texto', text: 'Jugar' }),
      h('small', { text: `Nivel ${n} · ${ESCENARIOS[ub.escenario].icono} ${ub.nombre}${ub.vuelta > 1 ? ` · vuelta ${ub.vuelta}` : ''}` }),
    ),
    h('p', { class: 'texto-suave centrado heroe-actual', text: `Líder: ${heroe.icono} ${heroe.nombre} · ${heroe.habilidad}` }),
    h(
      'nav',
      { class: 'atajos', 'aria-label': 'Menú principal' },
      atajo('🏚️', 'Refugio', () => app.ir('refugio')),
      atajo('🦸', 'Héroes', () => app.ir('heroes')),
      atajo('🎯', 'Misiones', () => app.ir('misiones'), listas ? { texto: String(listas) } : undefined),
      atajo('🎁', 'Diario', () => abrirDiaria(() => app.ir('inicio')), diariaLista ? { texto: '¡Nuevo!' } : { texto: '✔', ok: true }),
    ),
    h(
      'button',
      {
        type: 'button',
        class: 'btn btn-secundario btn-ancho btn-horda',
        disabled: n <= NIVEL_HORDA,
        onclick: () => app.ir('juego', { modo: 'horda' }),
      },
      h('span', { class: 'btn-icono', 'aria-hidden': 'true', text: '🧟' }),
      h('span', { class: 'btn-texto', text: n > NIVEL_HORDA ? `Modo Horda · récord ${g.recordHorda} m` : `Modo Horda (se desbloquea en el nivel ${NIVEL_HORDA + 1})` }),
    ),
    h(
      'p',
      { class: 'enlaces-inicio' },
      enlace('🗺️ Mapa', () => app.ir('mapa')),
      enlace('⚙️ Ajustes', () => app.ir('configuracion')),
      enlace('ℹ️ Acerca', () => app.ir('acerca')),
      app.instalar
        ? enlace('📲 Instalar', async () => {
            await app.instalar?.prompt();
            app.instalar = null;
            app.ir('inicio');
          })
        : null,
    ),
    h('p', { class: 'version', text: `v${VERSION}` }),
  );
  return { el };
}
