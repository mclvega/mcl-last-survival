import { app, type Pantalla } from '../app';
import { audio } from '../audio';
import { ASPECTOS_POR_ID } from '../content/aspectos';
import { ESCENARIOS, ubicarNivel } from '../content/escenarios';
import { HEROES } from '../content/heroes';
import { arma } from '../core/armas';
import { generarNivelValidado } from '../core/bot';
import { PASO } from '../core/constantes';
import { estadisticasReferencia, paramsNivel, type ParamsNivel } from '../core/dificultad';
import { generarHorda } from '../core/generador';
import { Mundo, type Entrada } from '../core/mundo';
import { estadisticasJugador } from '../economy/refugio';
import { costoRevivir, gastarMonedas } from '../economy/wallet';
import { efectos, type CalidadEfectiva } from '../fx/loop';
import { vibrar } from '../haptica';
import { Escena } from '../render/escena';
import { abrirModal, boton, esperar, h, hayModalAbierto, type Modal } from './dom';
import { mostrarAnimo } from './componentes';
import { panelConfiguracion } from './configuracion';
import { abrirDerrota, abrirFinHorda, celebrarNivel, registrarPartida } from './finNivel';

const BAJAR: Record<CalidadEfectiva, CalidadEfectiva> = { alta: 'media', media: 'baja', baja: 'baja' };

interface Ayuda {
  texto: string;
  cuando: (m: Mundo) => boolean;
  vista: boolean;
}

/** WakeLock (la pantalla no se apaga durante la partida), si el navegador lo tiene. */
type Bloqueo = { release: () => Promise<void> } | null;

/** Pantalla de juego: canvas, entrada táctil, bucle de paso fijo y HUD. */
export function pantallaJuego(params: Record<string, unknown>): Pantalla {
  const g = app.g;
  const horda = params.modo === 'horda';
  const estres = new URLSearchParams(location.search).has('estres');
  const n = horda ? 0 : Math.max(1, Math.min(g.nivelActual, Math.floor(Number(params.nivel)) || g.nivelActual));
  const p: ParamsNivel | null = horda ? null : paramsNivel(n, g.config.dificultad, g.masFacil.includes(n));
  const stats = estadisticasJugador(g);
  const heroe = HEROES[stats.heroe];
  const ub = ubicarNivel(horda ? Math.max(1, g.nivelActual) : n);
  const escenario = ESCENARIOS[ub.escenario];

  /* ---------- DOM ---------- */

  const lienzo = h('canvas', { class: 'lienzo-juego', role: 'img', 'aria-label': 'Campo de batalla. Arrastra el dedo a los lados para mover el escuadrón.' }) as HTMLCanvasElement;
  const rellenoProgreso = h('span', { class: 'progreso-relleno' });
  const monedasChip = h('span', { class: 'chip chip-juego', 'aria-label': 'Monedas de la partida' });
  const rellenoJefe = h('span', { class: 'barra-relleno' });
  const barraJefe = h('div', { class: 'barra-jefe', hidden: true }, h('span', { text: '👹 Jefe' }), h('div', { class: 'barra' }, rellenoJefe));
  const armaChip = h('div', { class: 'chip chip-arma', 'aria-live': 'polite' });
  const btnHabilidad = h(
    'button',
    { type: 'button', class: 'btn-habilidad', 'aria-label': `Habilidad: ${heroe.habilidad}`, title: `${heroe.habilidad} (Espacio)` },
    h('span', { class: 'hab-icono', 'aria-hidden': 'true', text: heroe.icono }),
    h('small', { text: heroe.habilidad }),
  );
  const ayuda = h('div', { class: 'ayuda-juego', hidden: true, 'aria-live': 'polite' });
  const preparando = h('div', { class: 'preparando' }, h('span', { class: 'giro', 'aria-hidden': 'true' }), h('span', { text: 'Preparando el nivel…' }));
  const zona = h('div', { class: 'zona-juego' }, lienzo, barraJefe, armaChip, btnHabilidad, ayuda, preparando);
  const titulo = horda ? '🧟 Modo Horda' : `Nivel ${n}`;
  const subtitulo = horda
    ? `Récord ${g.recordHorda} m`
    : [`${escenario.icono} ${escenario.nombre}`, p?.tipo === 'jefe' ? '👹 Jefe especial ×2' : p?.tipo === 'descanso' ? '😌 Descanso' : ''].filter(Boolean).join(' · ');
  const el = h(
    'main',
    { class: 'juego' },
    h(
      'header',
      { class: 'barra-juego' },
      boton('', () => abrirPausa(), { icono: '⏸', variante: 'suave', etiqueta: 'Pausa', clase: 'btn-icono-solo' }),
      h('div', { class: 'titulo-nivel' }, h('h1', { text: titulo }), h('span', { text: subtitulo })),
      monedasChip,
    ),
    h('div', { class: 'progreso-nivel', 'aria-hidden': 'true' }, rellenoProgreso),
    zona,
  );

  /* ---------- Estado ---------- */

  let mundo: Mundo | null = null;
  let escena: Escena | null = null;
  const entrada: Entrada = { x: null, habilidad: false };
  let arrastre: { id: number; px: number; x0: number } | null = null;
  const teclas = { izq: false, der: false };
  let raf = 0;
  let acumulado = 0;
  let ultimo = performance.now();
  let ultimoDibujo = 0;
  let terminado = false;
  let revivido = false;
  let activo = true;
  let pausa: Modal | null = null;
  let bloqueo: Bloqueo = null;
  let lentos = 0;
  const hud = { monedas: -1, progreso: -1, arma: -1, jefe: -1, recarga: -1, metros: -1 };

  const ayudas: Ayuda[] = [];
  if (!horda && n <= 3) {
    ayudas.push({ texto: '👆 Arrastra el dedo a los lados para mover tu escuadrón', cuando: () => true, vista: false });
    ayudas.push({ texto: '🛢️ Dispara a los barriles: dan soldados y mejoras', cuando: (m) => m.barriles.some((b) => b.y - m.y < 420), vista: false });
    ayudas.push({ texto: '🚪 Cruza la puerta que más te convenga', cuando: (m) => m.puertas.some((x) => !x.cruzada && x.y - m.y < 450), vista: false });
    ayudas.push({ texto: `${heroe.icono} Toca el botón de abajo para usar: ${heroe.habilidad}`, cuando: (m) => m.recarga <= 0 && m.zombis.length > 6, vista: false });
  }
  let ayudaHasta = 0;

  /* ---------- Arranque (después de pintar el «Preparando…») ---------- */

  const iniciar = () => {
    if (!activo) return;
    const nivel = horda
      ? generarHorda(g.config.dificultad, stats, String(Date.now()))
      : generarNivelValidado(p!, estadisticasReferencia(n));
    mundo = new Mundo(nivel, stats);
    if (estres) mundo.estres(500);
    escena = new Escena(lienzo, escenario, ub.vuelta % 2 === 0, ASPECTOS_POR_ID.get(g.aspecto)!, heroe.color);
    escena.sacudidaActiva = g.config.sacudida;
    ajustarTamano();
    preparando.remove();
    void app.ajustarCalidadAutomatica();
    void pedirBloqueo();
    if (estres) efectos.setMostrarFps(true);
    ultimo = performance.now();
    raf = requestAnimationFrame(cuadro);
  };
  requestAnimationFrame(() => setTimeout(iniciar, 30));

  function ajustarTamano(): void {
    if (!escena) return;
    escena.ajustar(zona.clientWidth, zona.clientHeight, efectos.calidad);
  }
  const observador = typeof ResizeObserver === 'function' ? new ResizeObserver(() => ajustarTamano()) : null;
  observador?.observe(zona);

  /* ---------- Entrada ---------- */

  zona.addEventListener('pointerdown', (ev) => {
    if (!mundo || !escena || ev.target === btnHabilidad || btnHabilidad.contains(ev.target as Node)) return;
    ev.preventDefault();
    zona.setPointerCapture?.(ev.pointerId);
    arrastre = { id: ev.pointerId, px: ev.clientX, x0: mundo.x };
    entrada.x = mundo.x;
    ocultarAyuda();
  });
  zona.addEventListener('pointermove', (ev) => {
    if (!arrastre || ev.pointerId !== arrastre.id || !escena) return;
    entrada.x = arrastre.x0 + ((ev.clientX - arrastre.px) / escena.esc) * g.config.sensibilidad;
  });
  const soltar = (ev: PointerEvent) => {
    if (arrastre && ev.pointerId === arrastre.id) arrastre = null;
  };
  zona.addEventListener('pointerup', soltar);
  zona.addEventListener('pointercancel', soltar);
  zona.addEventListener('contextmenu', (ev) => ev.preventDefault());
  btnHabilidad.addEventListener('pointerdown', (ev) => {
    ev.stopPropagation();
    entrada.habilidad = true;
  });
  btnHabilidad.addEventListener('click', (ev) => {
    // El clic con teclado (Enter) no pasa por pointerdown.
    if (ev.detail === 0) entrada.habilidad = true;
  });

  const alTeclado = (ev: KeyboardEvent) => {
    if (hayModalAbierto()) return;
    const abajo = ev.type === 'keydown';
    switch (ev.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        teclas.izq = abajo;
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        teclas.der = abajo;
        break;
      case ' ':
      case 'e':
      case 'E':
        if (abajo) entrada.habilidad = true;
        break;
      case 'Escape':
      case 'p':
      case 'P':
        if (abajo) abrirPausa();
        break;
      default:
        return;
    }
    ev.preventDefault();
  };
  window.addEventListener('keydown', alTeclado);
  window.addEventListener('keyup', alTeclado);

  const alVisibilidad = () => {
    if (document.hidden) abrirPausa();
    else void pedirBloqueo();
  };
  document.addEventListener('visibilitychange', alVisibilidad);
  window.addEventListener('blur', abrirPausaSiJuega);

  function abrirPausaSiJuega(): void {
    if (mundo?.estado === 'jugando') abrirPausa();
  }

  async function pedirBloqueo(): Promise<void> {
    const wl = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<Bloqueo> } }).wakeLock;
    if (!wl || bloqueo || document.hidden) return;
    try {
      bloqueo = await wl.request('screen');
    } catch {
      bloqueo = null;
    }
  }

  /* ---------- Bucle ---------- */

  function cuadro(ahora: number): void {
    if (!activo || !mundo || !escena) return;
    raf = requestAnimationFrame(cuadro);
    const limite = g.config.fps;
    if (limite > 0 && ahora - ultimoDibujo < 1000 / limite - 1) return;
    ultimoDibujo = ahora;
    let dt = Math.min(0.1, (ahora - ultimo) / 1000);
    ultimo = ahora;
    const enMarcha = !hayModalAbierto() && mundo.estado === 'jugando';
    if (enMarcha) {
      acumulado += dt;
      let pasos = 0;
      while (acumulado >= PASO && pasos < 5) {
        if (teclas.izq || teclas.der) entrada.x = mundo.x + (teclas.der ? 1 : -1) * 300 * PASO;
        mundo.paso(entrada);
        entrada.habilidad = false;
        acumulado -= PASO;
        pasos++;
      }
      if (pasos === 5) acumulado = 0;
      vigilarRendimiento(dt);
    } else if (hayModalAbierto()) dt = 0;
    procesarEventos();
    escena.dibujar(mundo, enMarcha ? acumulado / PASO : 1, dt);
    actualizarHud();
    if (mundo.estado !== 'jugando' && !terminado) {
      terminado = true;
      void terminar();
    }
  }

  /** En calidad automática, si la partida va lenta se baja la calidad sola. */
  function vigilarRendimiento(dt: number): void {
    if (g.config.calidad !== 'auto' || efectos.calidad === 'baja') return;
    lentos = dt > 1 / 40 ? lentos + 1 : Math.max(0, lentos - 1);
    if (lentos > 90) {
      lentos = 0;
      efectos.setCalidad(BAJAR[efectos.calidad]);
      ajustarTamano();
    }
  }

  function procesarEventos(): void {
    const m = mundo!;
    const e = escena!;
    for (const ev of m.eventos) {
      switch (ev.t) {
        case 'disparo':
          audio.efecto(arma(ev.arma).sonido);
          break;
        case 'impacto':
          e.impacto(ev.x, ev.y, ev.color);
          break;
        case 'muerte':
          e.muerte(ev.x, ev.y, ev.z);
          audio.efecto('muerte');
          if (ev.z === 'jefe') {
            e.explosion(ev.x, ev.y, 90);
            e.sacudir(14);
            vibrar([100, 50, 100]);
          }
          break;
        case 'golpe':
          e.golpe(ev.x, ev.y, ev.k);
          e.sacudir(4);
          vibrar(25);
          audio.efecto('golpe');
          break;
        case 'escudo':
          e.texto(ev.x, ev.y, '🛡️', '#a5d8ff', 16);
          audio.efecto('escudo');
          break;
        case 'barril':
          e.barril(ev.x, ev.y, ev.explosivo);
          audio.efecto('barril');
          break;
        case 'premio':
          e.texto(ev.x, ev.y + 20, ev.texto, '#ffd43b', 16);
          audio.efecto('premio');
          vibrar(15);
          break;
        case 'puerta':
          e.texto(ev.x, ev.y + 30, ev.texto, ev.buena ? '#74c0fc' : '#ff8787', 24);
          audio.efecto(ev.buena ? 'puertaBuena' : 'puertaMala');
          vibrar(ev.buena ? 20 : [40, 40, 40]);
          break;
        case 'sube':
          audio.efecto('sube');
          break;
        case 'explosion':
          e.explosion(ev.x, ev.y, ev.r);
          e.sacudir(8);
          vibrar(40);
          audio.efecto('explosion');
          break;
        case 'moneda':
          e.moneda(ev.x, ev.y);
          e.texto(ev.x, ev.y + 16, `+${ev.valor} 🪙`, '#ffd43b', 13);
          audio.efecto('moneda');
          break;
        case 'jefe':
          mostrarAnimo('👹 ¡Llegó el jefe!', 'animo-peligro');
          audio.efecto('jefe');
          e.sacudir(10);
          vibrar([80, 60, 80]);
          break;
        case 'habilidad':
          audio.efecto('habilidad');
          if (ev.heroe === 'francotiradora') e.rayo(ev.x, ev.y, ev.x2, ev.y2);
          vibrar(30);
          break;
      }
    }
    m.eventos.length = 0;
  }

  function actualizarHud(): void {
    const m = mundo!;
    if (m.monedas !== hud.monedas) {
      hud.monedas = m.monedas;
      monedasChip.textContent = `🪙 ${m.monedas}`;
    }
    if (horda) {
      const metros = m.metros();
      if (metros !== hud.metros) {
        hud.metros = metros;
        rellenoProgreso.style.width = `${Math.min(100, (metros / Math.max(1, g.recordHorda)) * 100)}%`;
        monedasChip.textContent = `📏 ${metros} m · 🪙 ${m.monedas}`;
      }
    } else {
      const progreso = Math.round(m.progreso() * 200) / 2;
      if (progreso !== hud.progreso) {
        hud.progreso = progreso;
        rellenoProgreso.style.width = `${progreso}%`;
      }
    }
    if (m.nivelArma !== hud.arma) {
      const subio = hud.arma !== -1 && m.nivelArma > hud.arma;
      hud.arma = m.nivelArma;
      const a = arma(m.nivelArma);
      armaChip.textContent = `${a.icono} ${a.nombre}`;
      if (subio) mostrarAnimo(`${a.icono} ¡${a.nombre}!`);
    }
    const jefe = m.jefe;
    const vidaJefe = jefe ? Math.round((jefe.vida / jefe.vidaMax) * 100) : -1;
    if (vidaJefe !== hud.jefe) {
      hud.jefe = vidaJefe;
      barraJefe.hidden = vidaJefe < 0;
      rellenoJefe.style.width = `${Math.max(0, vidaJefe)}%`;
    }
    const recarga = Math.ceil((m.recarga / m.recargaMax) * 50) * 2;
    if (recarga !== hud.recarga) {
      hud.recarga = recarga;
      btnHabilidad.style.setProperty('--recarga', `${recarga}%`);
      btnHabilidad.classList.toggle('lista', recarga === 0);
    }
    // Ayudas del tutorial (niveles 1 a 3).
    const ahora = m.t;
    if (ayudaHasta && ahora > ayudaHasta) ocultarAyuda();
    if (!ayudaHasta && m.estado === 'jugando') {
      const siguiente = ayudas.find((a) => !a.vista && a.cuando(m));
      if (siguiente) {
        siguiente.vista = true;
        ayuda.textContent = siguiente.texto;
        ayuda.hidden = false;
        ayudaHasta = ahora + 3.5;
      }
    }
  }

  function ocultarAyuda(): void {
    if (ayuda.hidden) return;
    ayuda.hidden = true;
    ayudaHasta = 0;
  }

  /* ---------- Pausa ---------- */

  function abrirPausa(): void {
    if (pausa || terminado || !mundo || hayModalAbierto()) return;
    arrastre = null;
    teclas.izq = teclas.der = false;
    audio.atenuar(true);
    const ajustes = h('div', { class: 'ajustes-pausa', hidden: true }, panelConfiguracion({ enJuego: true }));
    const continuar = boton('Continuar', () => pausa?.cerrar(), { icono: '▶', variante: 'primario' });
    continuar.dataset.focoInicial = '';
    pausa = abrirModal({
      titulo: '⏸ Pausa',
      contenido: h(
        'div',
        { class: 'pila' },
        continuar,
        boton('Reiniciar', () => {
          pausa?.cerrar();
          registrarPartida(mundo!, false);
          app.guardar();
          app.ir('juego', params);
        }, { icono: '↻', variante: 'secundario' }),
        boton('Ajustes', () => {
          ajustes.hidden = !ajustes.hidden;
        }, { icono: '⚙️', variante: 'suave' }),
        ajustes,
        boton('Salir al inicio', () => {
          pausa?.cerrar();
          registrarPartida(mundo!, false);
          app.guardar();
          app.ir('inicio');
        }, { icono: '🏠', variante: 'suave' }),
      ),
      alCerrar: () => {
        pausa = null;
        audio.atenuar(false);
        if (escena) {
          escena.sacudidaActiva = g.config.sacudida;
          ajustarTamano();
        }
        ultimo = performance.now();
      },
    });
  }

  /* ---------- Fin de la partida ---------- */

  async function terminar(): Promise<void> {
    const m = mundo!;
    if (m.estado === 'victoria') {
      await esperar(1200);
      if (activo) celebrarNivel({ n, p: p!, mundo: m });
      return;
    }
    await esperar(900);
    if (!activo) return;
    if (horda) {
      abrirFinHorda(m);
      return;
    }
    g.fallos[n] = (g.fallos[n] ?? 0) + 1;
    app.guardar();
    const opcion = await abrirDerrota({
      n,
      mundo: m,
      puedeRevivir: !revivido,
      ofrecerFacil: (g.fallos[n] ?? 0) >= 3 && !g.masFacil.includes(n),
    });
    if (opcion === 'revivir') {
      if (g.fichasRescate > 0) g.fichasRescate--;
      else if (!gastarMonedas(g, costoRevivir(n))) return;
      app.guardar();
      revivido = true;
      terminado = false;
      m.revivir(6);
      audio.efecto('escudo');
      mostrarAnimo('❤️ ¡De vuelta a la lucha!');
      ultimo = performance.now();
      return;
    }
    registrarPartida(m, false);
    if (opcion === 'facil') g.masFacil.push(n);
    app.guardar();
    if (opcion === 'reintentar' || opcion === 'facil') app.ir('juego', { nivel: n });
    else app.ir(opcion);
  }

  return {
    el,
    limpiar: () => {
      activo = false;
      cancelAnimationFrame(raf);
      observador?.disconnect();
      window.removeEventListener('keydown', alTeclado);
      window.removeEventListener('keyup', alTeclado);
      window.removeEventListener('blur', abrirPausaSiJuega);
      document.removeEventListener('visibilitychange', alVisibilidad);
      void bloqueo?.release().catch(() => undefined);
      bloqueo = null;
      if (estres) efectos.setMostrarFps(g.config.mostrarFps);
    },
  };
}
