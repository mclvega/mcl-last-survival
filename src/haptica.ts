/** Vibración del celular. En iPhone (Safari) no existe y se ignora sin errores. */
let activa = true;

export function setVibracion(valor: boolean): void {
  activa = valor;
}

export function vibrar(patron: number | number[]): void {
  if (!activa || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(patron);
  } catch {
    // Algunos navegadores lo bloquean sin interacción previa.
  }
}
