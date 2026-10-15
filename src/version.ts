declare const __VERSION__: string;

/** Versión del juego (se toma de package.json al compilar). */
export const VERSION: string = typeof __VERSION__ === 'string' ? __VERSION__ : 'dev';
