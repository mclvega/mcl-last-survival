import { app } from '../app';
import { h } from './dom';

export function logo(): HTMLElement {
  const el = h('span', { class: 'logo' });
  el.innerHTML = `<svg aria-hidden="true" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1b1f27"/><circle cx="32" cy="32" r="18" fill="none" stroke="#ff8a1f" stroke-width="5"/><path d="M32 6v14M32 44v14M6 32h14M44 32h14" stroke="#ff8a1f" stroke-width="5" stroke-linecap="round"/><circle cx="32" cy="32" r="5" fill="#8fd14f"/></svg>`;
  el.append(h('span', { text: 'Last Survival' }));
  return el;
}

/** Chip con las monedas; devuelve el elemento y una función para refrescarlo. */
export function chipMonedas(): { el: HTMLElement; refrescar: () => void } {
  const el = h('span', { class: 'chip', 'aria-live': 'polite' });
  const refrescar = () => {
    el.replaceChildren(`🪙 ${app.g.monedas}`, h('span', { class: 'chip-palabra', text: ' monedas' }));
  };
  refrescar();
  return { el, refrescar };
}

/** Mensaje grande y breve en el centro de la pantalla. */
export function mostrarAnimo(texto: string, clase = ''): void {
  const el = h('div', { class: `animo ${clase}`, role: 'status', text: texto });
  document.body.append(el);
  setTimeout(() => el.remove(), 1400);
}

/** Barra de progreso con texto. */
export function barra(valor: number, max: number, etiqueta: string): HTMLElement {
  const pct = Math.max(0, Math.min(100, (valor / Math.max(1, max)) * 100));
  return h(
    'div',
    { class: 'barra', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(max), 'aria-valuenow': String(valor), 'aria-label': etiqueta },
    h('span', { class: 'barra-relleno', style: { width: `${pct}%` } }),
  );
}
