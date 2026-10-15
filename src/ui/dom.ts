/** Utilidades de DOM compartidas por todas las pantallas. */
type Hijo = Node | string | number | null | undefined | false;
type Atributos = Record<string, unknown>;

/**
 * Crea un elemento. Claves especiales: `class`, `text`, `html` (solo para SVG
 * propio, nunca para texto del usuario), `dataset`, `style` y `on<evento>`.
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  atributos: Atributos | null = null,
  ...hijos: Hijo[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (atributos) {
    for (const [clave, valor] of Object.entries(atributos)) {
      if (valor === undefined || valor === null || valor === false) continue;
      if (clave === 'class') el.className = String(valor);
      else if (clave === 'text') el.textContent = String(valor);
      else if (clave === 'html') el.innerHTML = String(valor);
      else if (clave === 'dataset') Object.assign(el.dataset, valor);
      else if (clave === 'style' && typeof valor === 'object') Object.assign(el.style, valor);
      else if (clave.startsWith('on') && typeof valor === 'function') {
        el.addEventListener(clave.slice(2).toLowerCase(), valor as EventListener);
      } else if (valor === true) el.setAttribute(clave, '');
      else el.setAttribute(clave, String(valor));
    }
  }
  agregar(el, hijos);
  return el;
}

export function agregar(el: HTMLElement, hijos: Hijo[]): void {
  for (const hijo of hijos) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    el.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
}

export type Variante = 'primario' | 'secundario' | 'suave' | 'peligro';

export function boton(
  texto: string,
  alHacerClic: (ev: MouseEvent) => void,
  opciones: { icono?: string; variante?: Variante; clase?: string; etiqueta?: string; deshabilitado?: boolean } = {},
): HTMLButtonElement {
  return h(
    'button',
    {
      type: 'button',
      class: ['btn', `btn-${opciones.variante ?? 'secundario'}`, opciones.clase].filter(Boolean).join(' '),
      'aria-label': opciones.etiqueta,
      disabled: opciones.deshabilitado,
      onclick: alHacerClic,
    },
    opciones.icono ? h('span', { class: 'btn-icono', 'aria-hidden': 'true', text: opciones.icono }) : null,
    h('span', { class: 'btn-texto', text: texto }),
  );
}

/* ---------- Ventanas modales ---------- */

export interface Modal {
  el: HTMLElement;
  caja: HTMLElement;
  cerrar: () => void;
}

const pila: Modal[] = [];
let contadorTitulos = 0;

export function hayModalAbierto(): boolean {
  return pila.length > 0;
}

export function abrirModal(opciones: {
  titulo: string;
  contenido: Node;
  cerrable?: boolean;
  clase?: string;
  /** Texto para lectores de pantalla (no se muestra). */
  descripcion?: string;
  alCerrar?: () => void;
}): Modal {
  const idTitulo = `modal-titulo-${++contadorTitulos}`;
  const anterior = document.activeElement as HTMLElement | null;
  const caja = h(
    'div',
    { class: `modal ${opciones.clase ?? ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': idTitulo },
    h('h2', { class: 'modal-titulo', id: idTitulo, text: opciones.titulo }),
    opciones.descripcion ? h('p', { class: 'oculto-visual', text: opciones.descripcion }) : null,
    opciones.contenido,
  );
  const fondo = h('div', { class: 'modal-fondo' }, caja);
  let cerrado = false;
  const modal: Modal = {
    el: fondo,
    caja,
    cerrar: () => {
      if (cerrado) return;
      cerrado = true;
      pila.splice(pila.indexOf(modal), 1);
      fondo.remove();
      opciones.alCerrar?.();
      if (anterior && document.contains(anterior)) anterior.focus();
    },
  };
  if (opciones.cerrable !== false) {
    const x = h('button', {
      type: 'button',
      class: 'modal-cerrar',
      'aria-label': 'Cerrar',
      text: '✕',
      onclick: () => modal.cerrar(),
    });
    caja.prepend(x);
    fondo.addEventListener('click', (ev) => {
      if (ev.target === fondo) modal.cerrar();
    });
  }
  fondo.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && opciones.cerrable !== false) {
      ev.stopPropagation();
      modal.cerrar();
    } else if (ev.key === 'Tab') {
      atraparFoco(caja, ev);
    }
  });
  document.body.append(fondo);
  pila.push(modal);
  requestAnimationFrame(() => {
    const primero = caja.querySelector<HTMLElement>('[data-foco-inicial]') ?? enfocables(caja)[0];
    primero?.focus();
  });
  return modal;
}

function enfocables(raiz: HTMLElement): HTMLElement[] {
  return [
    ...raiz.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((el) => el.offsetParent !== null || el === document.activeElement);
}

function atraparFoco(caja: HTMLElement, ev: KeyboardEvent): void {
  const lista = enfocables(caja);
  if (!lista.length) return;
  const primero = lista[0];
  const ultimo = lista[lista.length - 1];
  if (ev.shiftKey && document.activeElement === primero) {
    ev.preventDefault();
    ultimo.focus();
  } else if (!ev.shiftKey && document.activeElement === ultimo) {
    ev.preventDefault();
    primero.focus();
  }
}

/** Pregunta de confirmación con dos botones grandes. */
export function confirmar(titulo: string, texto: string, aceptar: string, cancelar = 'No, volver'): Promise<boolean> {
  return new Promise((resolver) => {
    let respuesta = false;
    const modal = abrirModal({
      titulo,
      contenido: h(
        'div',
        { class: 'pila' },
        h('p', { class: 'texto-grande', text: texto }),
        h(
          'div',
          { class: 'fila-botones' },
          boton(aceptar, () => {
            respuesta = true;
            modal.cerrar();
          }, { variante: 'primario' }),
          boton(cancelar, () => modal.cerrar(), { variante: 'secundario' }),
        ),
      ),
      alCerrar: () => resolver(respuesta),
    });
  });
}

/* ---------- Mensajes breves ---------- */

let zonaAvisos: HTMLElement | null = null;

/** Aviso breve y amable (se anuncia también a lectores de pantalla). */
export function avisar(texto: string, duracionMs = 2600): void {
  if (!zonaAvisos) {
    zonaAvisos = h('div', { class: 'avisos', role: 'status', 'aria-live': 'polite' });
    document.body.append(zonaAvisos);
  }
  const aviso = h('div', { class: 'aviso', text: texto });
  zonaAvisos.append(aviso);
  setTimeout(() => {
    aviso.classList.add('saliendo');
    setTimeout(() => aviso.remove(), 400);
  }, duracionMs);
}

export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const area = h('textarea', { style: { position: 'fixed', opacity: '0' } }) as HTMLTextAreaElement;
    area.value = texto;
    document.body.append(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

export const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
