/** Reutiliza objetos para no crear basura durante la partida (sin pausas del recolector). */
export class Pool<T> {
  private libres: T[] = [];

  constructor(private readonly crear: () => T) {}

  tomar(): T {
    return this.libres.pop() ?? this.crear();
  }

  soltar(obj: T): void {
    this.libres.push(obj);
  }
}

/** Quita del arreglo (en el lugar) los objetos que ya no están vivos y los devuelve al pool. */
export function compactar<T extends { vivo: boolean }>(lista: T[], pool?: Pool<T>): void {
  let j = 0;
  for (let i = 0; i < lista.length; i++) {
    const o = lista[i];
    if (o.vivo) lista[j++] = o;
    else pool?.soltar(o);
  }
  lista.length = j;
}
