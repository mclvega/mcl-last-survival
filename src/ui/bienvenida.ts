import { app, type Pantalla } from '../app';
import { audio } from '../audio';
import { limpiarNombre } from '../storage';
import { boton, h } from './dom';
import { logo } from './componentes';

/** Primer inicio: pide el nombre del jugador (o permite jugar como invitado). */
export function pantallaBienvenida(): Pantalla {
  const entrada = h('input', {
    id: 'nombre',
    type: 'text',
    maxlength: '16',
    autocomplete: 'nickname',
    enterkeyhint: 'go',
    'aria-describedby': 'nombre-ayuda nombre-error',
    'data-foco-inicial': true,
  }) as HTMLInputElement;
  const error = h('p', { id: 'nombre-error', class: 'error-campo', 'aria-live': 'polite' });

  const comenzar = (nombre: string | null, invitado: boolean) => {
    app.g.nombre = nombre;
    app.g.invitado = invitado;
    app.guardar();
    audio.efecto('premio');
    app.ir('inicio');
  };

  const enviar = (ev: Event) => {
    ev.preventDefault();
    const nombre = limpiarNombre(entrada.value);
    if (!nombre) {
      error.textContent = 'Escribe un nombre de 1 a 16 letras o números.';
      entrada.focus();
      return;
    }
    comenzar(nombre, false);
  };

  const formulario = h(
    'form',
    { class: 'pila', onsubmit: enviar, novalidate: true },
    h(
      'div',
      { class: 'campo' },
      h('label', { for: 'nombre', text: '¿Cómo te llamas, superviviente?' }),
      entrada,
      h('p', { id: 'nombre-ayuda', class: 'texto-suave', text: 'Solo se guarda en este navegador.' }),
      error,
    ),
    h(
      'button',
      { type: 'submit', class: 'btn btn-primario btn-grande' },
      h('span', { class: 'btn-icono', 'aria-hidden': 'true', text: '▶' }),
      h('span', { class: 'btn-texto', text: 'Comenzar' }),
    ),
    boton('Jugar como invitado', () => comenzar(null, true), { variante: 'secundario', clase: 'btn-ancho' }),
  );

  const el = h(
    'main',
    { class: 'pantalla bienvenida' },
    h(
      'div',
      { class: 'tarjeta pila' },
      logo(),
      h('h1', { text: 'La horda se acerca' }),
      h('p', { class: 'texto-grande' }, 'Arrastra el dedo para mover tu escuadrón. Disparan solos: rompe barriles, elige bien las puertas y sobrevive hasta el jefe.'),
      formulario,
    ),
  );
  return { el };
}
