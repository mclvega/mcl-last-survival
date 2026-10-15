import './styles/main.css';

import { app } from './app';
import { audio } from './audio';
import { iniciarPantallaCompleta } from './fullscreen';
import { efectos } from './fx/loop';
import { pantallaAcerca } from './ui/acerca';
import { pantallaBienvenida } from './ui/bienvenida';
import { pantallaConfiguracion } from './ui/configuracion';
import { pantallaHeroes } from './ui/heroes';
import { pantallaInicio } from './ui/inicio';
import { pantallaJuego } from './ui/juego';
import { pantallaMapa } from './ui/mapa';
import { pantallaMisiones } from './ui/misiones';
import { pantallaRefugio } from './ui/refugio';

app.registrar('bienvenida', pantallaBienvenida);
app.registrar('inicio', pantallaInicio);
app.registrar('juego', pantallaJuego);
app.registrar('refugio', pantallaRefugio);
app.registrar('heroes', pantallaHeroes);
app.registrar('mapa', pantallaMapa);
app.registrar('misiones', pantallaMisiones);
app.registrar('configuracion', pantallaConfiguracion);
app.registrar('acerca', pantallaAcerca);

efectos.montar();
iniciarPantallaCompleta(() => app.g.config.pantallaCompleta);
app.montar(document.getElementById('app')!);
app.aplicarConfig();
app.ir(app.g.nombre || app.g.invitado ? 'inicio' : 'bienvenida');

// El audio solo puede empezar después de un gesto del usuario. Cada gesto
// vuelve a intentarlo por si el navegador lo dejó suspendido.
const iniciarAudio = () => {
  const primeraVez = !audio.iniciado;
  audio.iniciar();
  if (primeraVez) app.aplicarConfig();
};
window.addEventListener('pointerdown', iniciarAudio);
window.addEventListener('keydown', iniciarAudio);
window.addEventListener('touchend', iniciarAudio);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) audio.suspender();
  else audio.reanudar();
});

// Instalar como app (Chrome / Android): se guarda el aviso para mostrar el botón en el inicio.
window.addEventListener('beforeinstallprompt', (ev) => {
  ev.preventDefault();
  app.instalar = ev as typeof app.instalar;
  if (app.nombrePantalla === 'inicio') app.ir('inicio');
});

// Caché del navegador para cargar rápido y seguir funcionando sin conexión.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
