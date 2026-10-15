import { SistemaParticulas } from './particles';
import { type Calidad, type LimiteFps } from '../settings/settings';

export type CalidadEfectiva = Exclude<Calidad, 'auto'>;

/** Partículas máximas del juego según la calidad. */
export const MAX_PARTICULAS: Record<CalidadEfectiva, number> = { baja: 90, media: 220, alta: 450 };

/**
 * Lienzo de efectos superpuesto (confeti y destellos de los menús). El bucle
 * respeta el límite de FPS y se detiene solo cuando no hay nada que dibujar.
 * También lleva el medidor de FPS y la medición de rendimiento automática.
 */
class Efectos {
  private lienzo: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private particulas = new SistemaParticulas();
  private animando = false;
  private ultimo = 0;
  private ultimoDibujo = 0;
  private limiteFps: LimiteFps = 60;
  private medidor: HTMLElement | null = null;
  private cuadros = 0;
  private inicioMedicion = 0;
  private escala = 1;
  private habiaParticulas = false;
  calidad: CalidadEfectiva = 'alta';

  montar(): void {
    this.lienzo = document.createElement('canvas');
    this.lienzo.className = 'lienzo-efectos';
    this.lienzo.setAttribute('aria-hidden', 'true');
    document.body.append(this.lienzo);
    this.ctx = this.lienzo.getContext('2d');
    this.medidor = document.createElement('div');
    this.medidor.className = 'medidor-fps';
    this.medidor.hidden = true;
    this.medidor.setAttribute('aria-hidden', 'true');
    document.body.append(this.medidor);
    window.addEventListener('resize', () => this.ajustarTamano());
    this.ajustarTamano();
  }

  private ajustarTamano(): void {
    if (!this.lienzo) return;
    const dpr = window.devicePixelRatio || 1;
    this.escala = this.calidad === 'baja' ? 1 : this.calidad === 'media' ? Math.min(dpr, 1.5) : Math.min(dpr, 2);
    this.lienzo.width = Math.round(window.innerWidth * this.escala);
    this.lienzo.height = Math.round(window.innerHeight * this.escala);
  }

  setCalidad(calidad: CalidadEfectiva): void {
    this.calidad = calidad;
    document.documentElement.dataset.calidad = calidad;
    this.ajustarTamano();
  }

  setLimiteFps(limite: LimiteFps): void {
    this.limiteFps = limite;
  }

  get fps(): LimiteFps {
    return this.limiteFps;
  }

  setMostrarFps(mostrar: boolean): void {
    if (!this.medidor) return;
    this.medidor.hidden = !mostrar;
    if (mostrar) this.arrancar();
  }

  destellos(x: number, y: number, color = '#ffd43b'): void {
    const cantidad = this.calidad === 'alta' ? 16 : this.calidad === 'media' ? 8 : 0;
    if (!cantidad) return;
    this.particulas.rafaga('destello', x, y, cantidad, 200, color, 7, 0.7, 2);
    this.arrancar();
  }

  celebracion(): void {
    if (this.calidad === 'baja') return;
    this.particulas.confeti(window.innerWidth, this.calidad === 'alta' ? 90 : 35);
    this.arrancar();
  }

  limpiar(): void {
    this.particulas.limpiar();
  }

  private arrancar(): void {
    if (this.animando) return;
    this.animando = true;
    this.ultimo = performance.now();
    this.inicioMedicion = this.ultimo;
    this.cuadros = 0;
    requestAnimationFrame((t) => this.cuadro(t));
  }

  private cuadro(ahora: number): void {
    const mostrarFps = this.medidor && !this.medidor.hidden;
    if (!this.particulas.cantidad && !mostrarFps) {
      this.animando = false;
      this.ctx?.clearRect(0, 0, this.lienzo!.width, this.lienzo!.height);
      return;
    }
    requestAnimationFrame((t) => this.cuadro(t));
    if (this.limiteFps > 0) {
      const intervalo = 1000 / this.limiteFps;
      if (ahora - this.ultimoDibujo < intervalo - 1) return;
    }
    this.ultimoDibujo = ahora;
    const dt = Math.min(0.05, (ahora - this.ultimo) / 1000);
    this.ultimo = ahora;
    this.cuadros++;
    if (mostrarFps && ahora - this.inicioMedicion >= 1000) {
      this.medidor!.textContent = `${Math.round((this.cuadros * 1000) / (ahora - this.inicioMedicion))} FPS`;
      this.cuadros = 0;
      this.inicioMedicion = ahora;
    }
    const ctx = this.ctx;
    if (!ctx || !this.lienzo) return;
    if (!this.particulas.cantidad && !this.habiaParticulas) return;
    this.habiaParticulas = this.particulas.cantidad > 0;
    ctx.setTransform(this.escala, 0, 0, this.escala, 0, 0);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    this.particulas.actualizar(dt);
    this.particulas.dibujar(ctx, 0, 0, 1, 1);
  }

  /** Mide los FPS reales durante un momento para elegir la calidad automática. */
  medirRendimiento(duracionMs = 1500): Promise<CalidadEfectiva> {
    return new Promise((resolver) => {
      let cuadros = 0;
      const inicio = performance.now();
      const paso = (t: number) => {
        cuadros++;
        if (t - inicio < duracionMs) requestAnimationFrame(paso);
        else {
          const fps = (cuadros * 1000) / (t - inicio);
          resolver(fps < 30 ? 'baja' : fps < 45 ? 'media' : 'alta');
        }
      };
      requestAnimationFrame(paso);
    });
  }
}

export const efectos = new Efectos();
