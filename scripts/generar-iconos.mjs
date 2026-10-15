// Genera los íconos PNG de la app (sin dependencias): fondo oscuro, mira naranja y punto verde.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const TAMANOS = [48, 72, 96, 128, 144, 180, 192, 256, 384, 512];

const TABLA = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = TABLA[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function bloque(tipo, datos) {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length);
  const td = Buffer.concat([Buffer.from(tipo), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([largo, td, crc]);
}
function png(lado, pixel) {
  const filas = [];
  for (let y = 0; y < lado; y++) {
    const fila = Buffer.alloc(1 + lado * 4);
    for (let x = 0; x < lado; x++) {
      const [r, g, b, a] = pixel(x, y);
      fila.set([r, g, b, a], 1 + x * 4);
    }
    filas.push(fila);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lado, 0);
  ihdr.writeUInt32BE(lado, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloque('IHDR', ihdr),
    bloque('IDAT', deflateSync(Buffer.concat(filas))),
    bloque('IEND', Buffer.alloc(0)),
  ]);
}

/** Color de un punto en coordenadas 0..1 (el ícono llena todo el cuadro: sirve como "maskable"). */
function color(u, v) {
  const dx = u - 0.5;
  const dy = v - 0.5;
  const d = Math.hypot(dx, dy);
  const fondo = [27 + 20 * (1 - d), 31 + 10 * (1 - d), 39 + 6 * (1 - d)];
  if (d < 0.07) return [143, 209, 79];
  if (Math.abs(d - 0.24) < 0.035) return [255, 138, 31];
  const enCruz = (Math.abs(dx) < 0.03 && Math.abs(dy) > 0.14 && Math.abs(dy) < 0.36) || (Math.abs(dy) < 0.03 && Math.abs(dx) > 0.14 && Math.abs(dx) < 0.36);
  if (enCruz) return [255, 138, 31];
  return fondo;
}

for (const lado of TAMANOS) {
  const N = 4;
  const datos = png(lado, (x, y) => {
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const c = color((x + (i + 0.5) / N) / lado, (y + (j + 0.5) / N) / lado);
        r += c[0]; g += c[1]; b += c[2];
      }
    }
    return [Math.round(r / N / N), Math.round(g / N / N), Math.round(b / N / N), 255];
  });
  writeFileSync(lado === 180 ? 'public/apple-touch-icon.png' : `public/icon-${lado}.png`, datos);
}
console.log('Íconos generados en public/');
