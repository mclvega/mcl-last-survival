/** Rejilla espacial: evita comparar cada bala con cada zombi. */
export interface Cuerpo {
  x: number;
  y: number;
  r: number;
  /** Marca de la última consulta que lo visitó (evita repetirlo si ocupa varias celdas). */
  marca: number;
}

const TAM = 48;
const COLS = 8;
/** Filas en anillo: cubre 64 × 48 = 3072 unidades, más que la zona activa. */
const FILAS = 64;

let consultaGlobal = 0;

export class Rejilla<T extends Cuerpo> {
  private celdas: T[][] = Array.from({ length: COLS * FILAS }, () => []);
  private usadas: number[] = [];

  limpiar(): void {
    for (const i of this.usadas) this.celdas[i].length = 0;
    this.usadas.length = 0;
  }

  private indice(cx: number, cy: number): number {
    return (((cy % FILAS) + FILAS) % FILAS) * COLS + cx;
  }

  insertar(obj: T): void {
    const cx0 = colX(obj.x - obj.r);
    const cx1 = colX(obj.x + obj.r);
    const cy0 = Math.floor((obj.y - obj.r) / TAM);
    const cy1 = Math.floor((obj.y + obj.r) / TAM);
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const i = this.indice(cx, cy);
        const celda = this.celdas[i];
        if (!celda.length) this.usadas.push(i);
        celda.push(obj);
      }
    }
  }

  /** Recorre los cuerpos cercanos a un círculo. Si `fn` devuelve true, se detiene. */
  consultar(x: number, y: number, r: number, fn: (obj: T) => boolean | void): void {
    const id = ++consultaGlobal;
    const cx0 = colX(x - r);
    const cx1 = colX(x + r);
    const cy0 = Math.floor((y - r) / TAM);
    const cy1 = Math.floor((y + r) / TAM);
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const celda = this.celdas[this.indice(cx, cy)];
        for (let k = 0; k < celda.length; k++) {
          const obj = celda[k];
          if (obj.marca === id) continue;
          obj.marca = id;
          if (fn(obj) === true) return;
        }
      }
    }
  }
}

function colX(x: number): number {
  return Math.min(COLS - 1, Math.max(0, Math.floor(x / TAM)));
}
