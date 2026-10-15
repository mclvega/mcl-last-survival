# Last Survival

Shooter de supervivencia vertical para el navegador, pensado primero para celular. Mueves tu escuadrón con un dedo y los soldados disparan solos. En el camino rompes barriles, eliges puertas y resistes a la horda de zombis hasta llegar al jefe.

- **Control de un dedo:** se arrastra desde cualquier parte de la pantalla y el movimiento es relativo, así el dedo no tapa al escuadrón. En computadora se juega con las flechas o A/D, y Espacio usa la habilidad.
- **Barriles con número:** dan soldados, una mejor arma, cadencia, daño, escudo o monedas. Hay también barriles explosivos.
- **Cámara en perspectiva** detrás del escuadrón (estilo de los anuncios de Last Z y Mob Control): camino gris con muros metálicos, soldados azules de espalda, zombis de frente y balas doradas.
- **Pasillos laterales siempre presentes:** al lado del camino, separados por un muro bajo, aparece una columna de fichas **+1** (cada ficha rota suma un soldado) o una **escalera ×2…×9** (al terminarla se aplica el multiplicador más alto que rompiste).
- **Cofres de arma** con su número de vida, y el **jefe** con su vida visible sobre la cabeza.
- **Puertas:** `+N`, `×2`, `−N`, `÷2`, cadencia y daño. Las puertas de suma suben si les disparas.
- **10 armas:** pistola, subfusil, escopeta, rifle, ametralladora, lanzallamas, lanzacohetes, láser, rayo tesla y cañón de plasma.
- **10 tipos de zombi:** caminante, corredor, perro, gordo, blindado, explosivo, escupidor, divisor (se parte en tres), gigante y el jefe por fases. Van apareciendo a medida que se avanza.
- **Obstáculos:** pinchos y ruedas que ruedan.
- **Dificultad alta:** hordas grandes; cada nivel se valida con un bot y, si es imposible, se regenera más suave.
- **Niveles infinitos:** se generan con una semilla, así el nivel N es igual para todos. Un bot comprueba que se pueden ganar y, si pierde, el nivel se regenera con menos zombis.
- **Capítulos de 10 niveles:** 8 escenarios distintos y un jefe especial cada 10 niveles, que da premio doble. Desde el nivel 11 se desbloquea el **Modo Horda**, un camino sin fin para batir tu récord.
- **Refugio:** 5 edificios con mejoras permanentes. **Héroes** con una habilidad y un efecto pasivo, sin gacha. **Aspectos** para el escuadrón, **misiones** y **recompensa diaria**.
- **Sin compras ni anuncios.** La segunda oportunidad se paga con fichas o monedas que se ganan jugando.
- **PWA:** se puede instalar en la pantalla de inicio y funciona sin conexión.
- **Pensado para celular:**
  - Se ajusta al notch del celular.
  - Ningún gesto del juego hace zoom ni recarga la página.
  - La partida se pausa sola al cambiar de app.
  - La pantalla no se apaga mientras juegas (Wake Lock).
  - Tiene vibración opcional.
- **Rendimiento:** Canvas 2D con paso fijo de 60 Hz e interpolación. Usa pools de objetos, una rejilla espacial para las colisiones y dibujos preparados una sola vez al cargar. Si va lento, la calidad baja sola.
- **Sonido:** efectos y música sintetizados en el navegador, sin archivos de audio.

## Requisitos

- Node.js 22 o más reciente.

## Uso

```bash
npm install
npm run dev       # servidor de desarrollo en http://localhost:5173 (también accesible desde el celular en la misma red)
npm test          # pruebas automáticas (Vitest)
npm run build     # compila a dist/
npm run preview   # sirve el build en http://localhost:4173
npm run iconos    # regenera los íconos PNG de public/
```

**Prueba de carga:** abre el juego con `?estres` en la URL, por ejemplo `http://localhost:5173/?estres`, y entra a una partida. Aparecen 500 zombis y se muestra el medidor de FPS.

En VS Code, el panel **Ejecutar y depurar** (`.vscode/launch.json`) tiene configuraciones para jugar en local, probar el build de producción y correr las pruebas.

## Publicar en Netlify

`netlify.toml` define el build (`npm run build`), la carpeta de salida (`dist`), Node 22, las cabeceras de seguridad (CSP sin orígenes externos) y la caché.

1. Sube el repositorio a GitHub.
2. En Netlify elige **Add new site → Import an existing project** y selecciona el repositorio.

También se puede publicar desde la terminal con `npx netlify deploy --prod`.

## Estructura

```
src/
├─ core/        # lógica pura y determinista, probada en Node:
│               #   mundo (paso fijo), armas, enemigos, elementos, escuadra,
│               #   colisiones (rejilla), pool, tramos, generador, dificultad y bot
├─ render/      # dibujo en canvas: atlas de sprites y escena
├─ content/     # héroes, edificios, escenarios, misiones y aspectos
├─ economy/     # monedas, recompensa diaria, misiones y refugio
├─ settings/    # configuración y su validación
├─ fx/          # partículas y bucle de efectos, medidor de FPS y calidad automática
├─ ui/          # pantallas: bienvenida, inicio, juego, fin de nivel, refugio,
│               #   héroes, mapa, misiones, configuración y acerca
├─ audio.ts     # sonido sintetizado (Web Audio)
├─ haptica.ts   # vibración
├─ storage.ts   # guardado versionado, exportar e importar
└─ app.ts       # navegación entre pantallas
tests/          # generador, mundo, bot y economía
```

El plan de diseño completo está en [PLAN.md](PLAN.md).
