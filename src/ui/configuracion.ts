import { app, type Pantalla } from '../app';
import { audio } from '../audio';
import { MODOS, type Dificultad } from '../core/dificultad';
import { entrarPantallaCompleta, salirPantallaCompleta } from '../fullscreen';
import { vibrar } from '../haptica';
import { configPorDefecto, type Configuracion } from '../settings/settings';
import { VERSION } from '../version';
import { exportarCodigo, guardadoNuevo, importarCodigo, limpiarNombre } from '../storage';
import { avisar, boton, confirmar, copiarTexto, h } from './dom';

type Clave = keyof Configuracion;

function cambiar<K extends Clave>(clave: K, valor: Configuracion[K]): void {
  app.g.config[clave] = valor;
  if (clave === 'pantallaCompleta') (valor ? entrarPantallaCompleta : salirPantallaCompleta)();
  app.guardar();
  app.aplicarConfig();
}

function opcion(etiqueta: string, control: HTMLElement, ayuda?: string): HTMLElement {
  return h(
    'div',
    { class: 'opcion-config' },
    h('span', { class: 'etiqueta', text: etiqueta }),
    control,
    ayuda ? h('p', { class: 'ayuda-texto', text: ayuda }) : null,
  );
}

/** Grupo de botones donde solo uno está elegido. */
function segmentado<K extends Clave>(clave: K, valores: Array<[Configuracion[K], string]>, etiqueta: string): HTMLElement {
  const grupo = h('div', { class: 'segmentado', role: 'group', 'aria-label': etiqueta });
  const pintar = () =>
    grupo.querySelectorAll<HTMLButtonElement>('button').forEach((b, i) => b.setAttribute('aria-pressed', String(app.g.config[clave] === valores[i][0])));
  for (const [valor, texto] of valores) {
    grupo.append(
      boton(texto, () => {
        cambiar(clave, valor);
        audio.efecto('boton');
        pintar();
      }, { variante: 'secundario' }),
    );
  }
  pintar();
  return grupo;
}

type ClaveSiNo = { [K in Clave]: Configuracion[K] extends boolean ? K : never }[Clave];

function siNo(clave: ClaveSiNo, etiqueta: string): HTMLElement {
  return segmentado<ClaveSiNo>(clave, [[true, 'Sí'], [false, 'No']], etiqueta);
}

function deslizador(
  clave: 'volumenGeneral' | 'volumenMusica' | 'volumenEfectos' | 'sensibilidad',
  etiqueta: string,
  rango: { min: number; max: number; paso: number; formato: (v: number) => string },
): HTMLElement {
  const salida = h('output', { text: rango.formato(app.g.config[clave]) });
  const entrada = h('input', {
    type: 'range',
    min: String(rango.min),
    max: String(rango.max),
    step: String(rango.paso),
    value: String(app.g.config[clave]),
    'aria-label': etiqueta,
    oninput: (ev: Event) => {
      const v = Number((ev.target as HTMLInputElement).value);
      salida.textContent = rango.formato(v);
      cambiar(clave, v);
    },
    onchange: () => audio.efecto('boton'),
  });
  return h('div', { class: 'deslizador' }, entrada, salida);
}

const VOLUMEN = { min: 0, max: 100, paso: 5, formato: (v: number) => `${v} %` };

function seccion(titulo: string, ...hijos: HTMLElement[]): HTMLElement {
  return h('section', { class: 'tarjeta seccion-config' }, h('h2', { text: titulo }), ...hijos);
}

/** Panel completo de configuración. Se usa como pantalla y dentro de la pausa del juego. */
export function panelConfiguracion(opciones: { enJuego?: boolean } = {}): HTMLElement {
  const g = app.g;
  const raiz = h('div', { class: 'pila' });

  if (!opciones.enJuego) {
    const entradaNombre = h('input', { id: 'cfg-nombre', type: 'text', maxlength: '16', value: g.nombre ?? '' }) as HTMLInputElement;
    const errorNombre = h('p', { class: 'error-campo', 'aria-live': 'polite' });
    raiz.append(
      seccion(
        '🙂 Jugador',
        h(
          'div',
          { class: 'campo' },
          h('label', { for: 'cfg-nombre', text: 'Tu nombre' }),
          entradaNombre,
          errorNombre,
          boton('Guardar nombre', () => {
            const nombre = limpiarNombre(entradaNombre.value);
            if (!nombre) {
              errorNombre.textContent = 'Escribe un nombre de 1 a 16 letras o números.';
              return;
            }
            errorNombre.textContent = '';
            app.g.nombre = nombre;
            app.g.invitado = false;
            app.guardar();
            avisar(`¡Listo, ${nombre}!`);
          }, { variante: 'primario', icono: '💾' }),
        ),
      ),
    );
  }

  raiz.append(
    seccion(
      '🎮 Juego',
      opcion(
        'Dificultad',
        segmentado('dificultad', (Object.keys(MODOS) as Dificultad[]).map((d) => [d, `${MODOS[d].icono} ${MODOS[d].nombre}`]), 'Dificultad'),
        opciones.enJuego ? 'El cambio se aplica en la próxima partida.' : 'Cambia cuántos zombis aparecen. Las recompensas son las mismas.',
      ),
      opcion(
        'Sensibilidad del dedo',
        deslizador('sensibilidad', 'Sensibilidad del arrastre', { min: 0.6, max: 2, paso: 0.1, formato: (v) => `×${v.toFixed(1)}` }),
        'Cuánto se mueve el escuadrón por cada centímetro que arrastras.',
      ),
      opcion('Vibración', segmentado('vibracion', [[true, 'Sí'], [false, 'No']], 'Vibración'), 'No disponible en iPhone.'),
      opcion('Sacudida de cámara', siNo('sacudida', 'Sacudida de cámara')),
    ),
  );

  raiz.append(
    seccion(
      '🔊 Sonido',
      opcion('Volumen', deslizador('volumenGeneral', 'Volumen general', VOLUMEN)),
      opcion('Música', deslizador('volumenMusica', 'Volumen de la música', VOLUMEN)),
      opcion('Efectos', deslizador('volumenEfectos', 'Volumen de los efectos', VOLUMEN)),
    ),
  );

  raiz.append(
    seccion(
      '📱 Gráficos',
      opcion(
        'Calidad',
        segmentado('calidad', [['auto', 'Auto'], ['baja', 'Baja'], ['media', 'Media'], ['alta', 'Alta']], 'Calidad'),
        'En «Auto» se mide tu celular y se baja la calidad sola si la partida va lenta.',
      ),
      opcion('Pantalla completa', siNo('pantallaCompleta', 'Pantalla completa'), 'Se activa al tocar la pantalla.'),
      opcion('Límite de FPS', segmentado('fps', [[30, '30'], [60, '60'], [0, 'Máximo']], 'Límite de FPS'), '30 FPS ahorra batería.'),
      opcion('Mostrar FPS', siNo('mostrarFps', 'Mostrar FPS')),
    ),
  );

  // La vibración se prueba al activarla.
  raiz.querySelector('[aria-label="Vibración"]')?.addEventListener('click', () => vibrar(40));

  if (!opciones.enJuego) {
    const codigo = h('textarea', { id: 'cfg-exportar', readonly: true, rows: '3' }) as HTMLTextAreaElement;
    codigo.value = exportarCodigo(g);
    const importar = h('textarea', { id: 'cfg-importar', rows: '3', placeholder: 'Pega aquí el código LS1-…' }) as HTMLTextAreaElement;
    raiz.append(
      seccion(
        '💾 Mis datos',
        h('p', { class: 'texto-suave', text: 'Tu progreso se guarda solo en este navegador. Para seguir en otro equipo, copia este código y pégalo allá.' }),
        h('div', { class: 'campo' }, h('label', { for: 'cfg-exportar', text: 'Código de mi progreso' }), codigo),
        boton('Copiar código', async () => {
          codigo.value = exportarCodigo(app.g);
          if (await copiarTexto(codigo.value)) avisar('Código copiado');
        }, { icono: '📋', variante: 'suave' }),
        h('div', { class: 'campo' }, h('label', { for: 'cfg-importar', text: 'Cargar progreso desde un código' }), importar),
        boton('Cargar progreso', async () => {
          const datos = importarCodigo(importar.value);
          if (!datos) {
            avisar('Ese código no es válido. Revisa que esté completo.');
            return;
          }
          if (await confirmar('Cargar progreso', 'Se reemplazará el progreso de este navegador. ¿Continuar?', 'Sí, cargar')) {
            app.g = datos;
            app.guardar();
            app.aplicarConfig();
            avisar('Progreso cargado');
            app.ir('inicio');
          }
        }, { icono: '📥', variante: 'secundario' }),
        boton('Restaurar ajustes recomendados', () => {
          app.g.config = configPorDefecto();
          app.guardar();
          app.aplicarConfig();
          avisar('Ajustes restaurados');
          app.ir('configuracion');
        }, { icono: '↺', variante: 'suave' }),
        boton('Reiniciar todo el progreso', async () => {
          const ok = await confirmar(
            'Reiniciar progreso',
            'Se borrarán tus niveles, monedas, refugio y héroes. Esta acción no se puede deshacer. ¿Seguro?',
            'Sí, borrar todo',
          );
          if (!ok) return;
          app.g = guardadoNuevo();
          app.guardar();
          app.aplicarConfig();
          app.ir('bienvenida');
        }, { icono: '🗑️', variante: 'peligro' }),
      ),
    );
  }
  raiz.append(h('p', { class: 'texto-suave centrado', text: `Last Survival · versión ${VERSION}` }));
  return raiz;
}

export function pantallaConfiguracion(): Pantalla {
  const el = h(
    'main',
    { class: 'pantalla pila' },
    h('header', { class: 'cabecera' }, boton('Volver', () => app.ir('inicio'), { icono: '←' }), h('h1', { text: '⚙️ Ajustes' })),
    panelConfiguracion(),
  );
  return { el };
}
