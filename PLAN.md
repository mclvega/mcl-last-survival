# Plan: shooter de supervivencia vertical para el navegador del celular

Nombre de trabajo del proyecto: **Last Survival**.

---

## 1. Análisis del juego de referencia

**Last Z: Survival Shooter** (`com.readygo.barrel.gp`), de ReadyGo (publicado por Omnilojo / Funtap según la región).

| Dato | Valor |
|---|---|
| Descargas | más de 10 M |
| Valoración | unas 4,8 en App Store (unas 80 mil valoraciones) |
| Clasificación | Adolescentes (violencia de fantasía) |
| Género | Shooter de escuadrón con desplazamiento vertical, más construcción de base (estrategia 4X ligera) |

> La ficha de Google Play no se pudo leer de forma automática. Los datos salen de búsquedas sobre el paquete y de guías del juego. Antes de cerrar el diseño conviene ver 2 o 3 vídeos de partidas para confirmar los detalles finos.

**Bucle principal de las fases de disparo** (la parte que replicamos):
1. Un **escuadrón** de soldados avanza solo hacia arriba por un pasillo. El jugador solo lo mueve **a izquierda y derecha** con el dedo.
2. El escuadrón **dispara automáticamente** hacia adelante.
3. Por el camino aparecen **barriles** con un número (su vida). Al romperlos dan **más soldados, mejoras de arma o bonus**. El nombre interno del juego es justamente *barrel*.
4. Hay **obstáculos indestructibles** (pinchos, ruedas que ruedan) que hay que esquivar.
5. Llegan **oleadas de zombis** cada vez más fuertes. Cada zombi que toca al escuadrón elimina a un soldado.
6. Al final de la fase hay un **jefe**. Se gana al derrotarlo y se pierde si el escuadrón queda en cero.

**Capa externa (meta):** un refugio que se construye y mejora entre partidas, héroes que se consiguen por gacha, recursos y alianzas. Esa capa es la que monetiza (gacha, paquetes y anuncios) y la que las reseñas critican como *pay-to-win*.

**Qué copiamos y qué cambiamos:**

| Copiamos | Cambiamos |
|---|---|
| Control de un dedo: arrastrar a los lados y disparo automático | Sin gacha, sin compras ni anuncios: todo se gana jugando |
| Barriles con número que dan soldados y mejoras | Refugio **simple** (5 edificios con niveles), sin mapa 4X ni alianzas |
| Oleadas crecientes, obstáculos y jefe final | Niveles **infinitos** generados por semilla, como en McL Tiles |
| La sensación de "ejército que crece" | Estilo **caricatura sin sangre**: los zombis se deshacen en polvo |
| Partidas cortas (1–2 minutos) | Funciona sin conexión y se instala como PWA |

**Además añadimos** (es típico del género y encaja con la mecánica): **puertas** de elección en el camino (`+5`, `×2`, `−3`, `cadencia +20 %`), para que mover el dedo sea siempre una decisión.

> Propiedad intelectual: no se usa el nombre "Last Z", ni sus personajes, logotipos, gráficos o sonidos. Solo se toma la mecánica, que no es protegible. Todo el arte es propio.

---

## 2. Requisitos

1. **Juego de navegador** publicado en **Netlify**, sin backend. Se abre desde un enlace y **opcionalmente se instala** como PWA.
2. **Diseñado primero para celular en vertical** (de 360×640 en adelante). En computadora se juega igual, en una columna centrada con el mouse o el teclado.
3. **Se juega con un solo dedo.**
4. **Debe ir fluido** (60 FPS) en un Android de gama media, con cientos de balas y enemigos en pantalla.
5. **Juego infinito:** no hay último nivel.
6. **Progreso guardado** en el navegador, con exportar e importar.

---

## 3. Mecánica de juego

### 3.1 Control
- **Arrastre relativo:** el escuadrón se mueve lo mismo que el dedo desde donde se apoyó, sin importar dónde toque la pantalla. Así el dedo no tapa a los soldados.
- Sensibilidad ajustable en Configuración. En computadora se usa el mouse o las flechas / `A` `D`.
- **Disparo automático** siempre activo. No hay botón de disparar.
- **Habilidad del héroe:** un botón grande abajo a la derecha, con tiempo de recarga (ver §3.6).
- Al levantar el dedo **no se pausa** (como el original), pero hay un botón de pausa y la partida se pausa sola si se cambia de app.

### 3.2 Escuadrón
- El número de soldados **es la vida**. Empieza con N (según el Cuartel, §5).
- Los soldados se acomodan en **formación de panal** alrededor del líder, con un movimiento elástico que da sensación de masa.
- Cada soldado dispara con el **arma actual del escuadrón**. Por rendimiento, a partir de 20 soldados las balas se **agrupan**: una bala visual vale por varias (el daño es el mismo).
- Tope de 60 soldados visibles. Si hay más, se muestra un número sobre el grupo.

### 3.3 Elementos del camino

| Elemento | Comportamiento | Recompensa / efecto |
|---|---|---|
| **Barril** | Tiene un número de vida que baja con cada impacto | Al romperse: `+soldados`, `mejora de arma`, `cadencia`, `daño`, `escudo temporal` o monedas. El ícono del premio se ve antes de romperlo |
| **Barril explosivo** (rojo) | Explota en área al romperse | Daña a los zombis cercanos (y al escuadrón si está muy cerca) |
| **Puerta** | Ocupa medio carril, siempre en pares | Al cruzar se aplica: `+N`, `×2`, `−N`, `÷2`, `daño +X %`. Algunas puertas negativas suben si se les dispara (de `−5` a `+3`) |
| **Pinchos / barrera** | Indestructible, fijo | Quita soldados al tocarlo |
| **Rueda rodante** | Indestructible, cruza de lado a lado | Quita soldados al tocarla |
| **Caja de monedas** | Se recoge al pasar | Monedas |

### 3.4 Zombis

| Tipo | Vida | Velocidad | Rasgo |
|---|---|---|---|
| Caminante | baja | lenta | Llega en grupos grandes |
| Corredor | muy baja | rápida | Va directo al escuadrón |
| Gordo | alta | lenta | Empuja, absorbe balas |
| Escupidor | media | se queda quieto | Lanza proyectiles lentos que se pueden esquivar |
| Explosivo | baja | media | Explota al morir o al tocar |
| **Jefe** | muy alta | lenta | 2–3 patrones de ataque por fases, con barra de vida |

- Cada zombi que toca el escuadrón **elimina 1 soldado** y desaparece. Los gordos y el jefe eliminan varios.
- Los zombis se dibujan en un estilo caricatura. Al morir se convierten en **polvo verde** y sueltan monedas. No hay sangre.

### 3.5 Armas
Se mejoran durante la partida con los barriles y se reinician al terminar (el arma inicial depende de la Armería, §5).

| Nivel | Arma | Patrón |
|---|---|---|
| 1 | Pistola | 1 bala recta |
| 2 | Subfusil | Cadencia alta |
| 3 | Escopeta | 3 balas en abanico |
| 4 | Rifle | Bala perforante (atraviesa 2) |
| 5 | Lanzallamas | Cono de corto alcance, daño continuo |
| 6 | Lanzacohetes | Daño en área |

### 3.6 Héroes (sin gacha)
El héroe es el líder del escuadrón y aporta una **habilidad activa** y un pasivo. Se desbloquean con monedas o al llegar a ciertos niveles.

| Héroe | Habilidad activa | Pasivo |
|---|---|---|
| Sargento (inicial) | **Granada**: daño en área frente al escuadrón | +5 % de daño |
| Médica | **Refuerzo**: recupera el 30 % de los soldados perdidos | +2 soldados iniciales |
| Ingeniero | **Torreta**: coloca una torreta durante 8 s | +10 % de vida de los barriles rotos como monedas |
| Francotiradora | **Disparo cargado**: gran daño al enemigo más fuerte (ideal para jefes) | Las balas perforan 1 enemigo más |

### 3.7 Victoria, derrota y estrellas
- **Victoria:** se derrota al jefe. Se ganan de 1 a 3 estrellas según los soldados que sobreviven.
- **Derrota:** el escuadrón llega a 0. Aparece "¡Caíste en el metro 340 de 500!" con dos opciones:
  - **Segunda oportunidad** (una por partida): revivir con 5 soldados a cambio de monedas o de una "ficha de rescate" ganada en la recompensa diaria. **Nunca con anuncios.**
  - **Reintentar.** No hay vidas ni esperas.
- Si se pierde el mismo nivel 3 veces, se ofrece "¿Bajar la dificultad de este nivel?", como en McL Tiles.

---

## 4. Niveles infinitos: generación procedural

### 4.1 Semilla determinista
- Se usa `rngFrom("last-survival:" + nivel + ":" + dificultad)`, el mismo `core/rng.ts` (mulberry32) de McL Tiles.
- El nivel N es igual para todos los jugadores y no se guarda: se genera al vuelo.

### 4.2 Construcción por tramos
Un nivel es una lista de **tramos** de unos 8 a 12 segundos, elegidos de un catálogo de plantillas:

| Tramo | Contenido |
|---|---|
| `calentamiento` | Pocos caminantes y 2–3 barriles de soldados |
| `puertas` | 1–2 pares de puertas y algunos zombis entre ellas |
| `barriles` | Pasillo de barriles con mejoras de arma |
| `horda` | Oleada grande de caminantes y corredores |
| `obstaculos` | Pinchos y ruedas, con barriles detrás como premio |
| `elite` | Gordos, escupidores y explosivos |
| `descanso` | Monedas y un barril de soldados |
| `jefe` | Siempre al final |

**Estructura de un nivel:** `calentamiento → (3 a 6 tramos según la dificultad) → descanso → jefe`. Dura entre 60 y 120 segundos.

### 4.3 Presupuesto de dificultad (balance)
Para que todo nivel sea ganable sin depender de la suerte:
1. Se estima el **poder esperado del escuadrón** a lo largo del nivel: `poder = soldados × daño × cadencia`, sumando lo que dan los barriles y las puertas positivas del propio nivel y las mejoras del refugio que se esperan para ese nivel.
2. Cada tramo recibe un **presupuesto de vida enemiga** que es una fracción de ese poder (por ejemplo, entre el 55 % y el 85 % según la dificultad).
3. El generador reparte el presupuesto entre los tipos de zombi permitidos en ese nivel.
4. Un **bot de prueba** (§9) juega el nivel en simulación y descarta los que no puede ganar, regenerándolos con `seed+1`.

### 4.4 Curva infinita

| Parámetro | Niveles 1–3 (tutorial) | Nivel ~30 | Nivel 100 en adelante |
|---|---|---|---|
| Tramos | 2 | 4–5 | 5–6 |
| Tipos de zombi | caminante | + corredor, gordo | todos |
| Obstáculos | no | pinchos | pinchos y ruedas |
| Puertas negativas | no | sí | sí, con más castigo |
| Presupuesto enemigo | 40 % | 65 % | 75–85 % (techo con variación) |

- **Dientes de sierra:** cada 5 niveles hay uno "de descanso" y cada 10 un **nivel de jefe especial** con premio doble.
- **Capítulos:** cada 10 niveles cambia el escenario (ciudad, autopista, bosque, puerto, desierto, laboratorio…). Al terminar la lista se repite con otra paleta de colores y "Vuelta 2".
- **Modo Horda** (se desbloquea en el nivel 10): pasillo sin fin con dificultad creciente y récord local en metros.

---

## 5. Refugio (progresión permanente)

Pantalla sencilla, sin mapa: 5 edificios en tarjetas, cada uno con niveles que se pagan con monedas. Es el equivalente a la tienda "El Alfolí" de McL Tiles.

| Edificio | Mejora |
|---|---|
| **Cuartel** | Soldados iniciales (de 1 a 15) |
| **Armería** | Arma inicial y daño base |
| **Taller** | Cadencia de disparo |
| **Enfermería** | Escudo inicial (absorbe los primeros N golpes) |
| **Almacén** | +% de monedas por partida |

- Los costos suben de forma geométrica suave (`base × 1,35^nivel`).
- **Recompensa diaria** con racha de 7 días: monedas y fichas de rescate.
- **Misiones** sencillas ("rompe 50 barriles", "derrota 3 jefes") que dan monedas.
- Personalización cosmética: aspecto del escuadrón, color de las balas y estela.

---

## 6. Optimización para celular

- **Pantalla:** `viewport-fit=cover`, márgenes con `env(safe-area-inset-*)` por el notch, `touch-action: none` y `overscroll-behavior: none` para evitar el "tirar para recargar", y bloqueo de zoom y selección de texto en el juego.
- **Orientación:** el manifest pide `portrait`. Si el celular está horizontal, se muestra el juego en una columna centrada (no se obliga a girar).
- **Pantalla completa:** botón con la Fullscreen API en Android. En iPhone esa API no existe en Safari, así que se invita a "Agregar a pantalla de inicio" (modo standalone).
- **Pausa automática** con `visibilitychange` y al perder el foco. Con `navigator.wakeLock` (si existe) la pantalla no se apaga durante una partida.
- **Vibración** (`navigator.vibrate`) al perder soldados y al romper barriles grandes, desactivable. En iPhone no está disponible y se ignora sin errores.
- **Audio:** se desbloquea con el primer toque (igual que McL Tiles), y se suspende al salir de la app.
- **Rendimiento:** ver §7.2.

---

## 7. Arquitectura técnica

**Stack:** igual que McL Tiles: **Vite + TypeScript**, sin framework, con Vitest. El juego se dibuja en **Canvas 2D** propio, sin Phaser ni Pixi, siguiendo el patrón de `ui/burbujas.ts`. Los menús son DOM con los mismos helpers `h`, `boton`, `abrirModal`, `avisar` y `confirmar` de `ui/dom.ts`.

> Por qué Canvas 2D y no WebGL/Pixi: con sprites pre-renderizados, pools y menos de unos 600 objetos en pantalla, Canvas 2D alcanza 60 FPS en gama media, pesa 0 KB extra y mantiene el mismo estilo de código que los otros proyectos. Si en la fase 1 la prueba de estrés no llega a 60 FPS en el celular de prueba, se cambia solo `render/` a PixiJS sin tocar `core/`.

### 7.1 Separación lógica / dibujo
- **`core/` es lógica pura y determinista:** no toca el DOM ni el canvas. Avanza con un **paso fijo de 1/60 s** (`mundo.paso(entrada)`), lo que permite probarla en Node, reproducir partidas y usar el bot de balance.
- **`render/` solo dibuja** el estado, interpolando entre pasos para que se vea suave aunque la pantalla vaya a 90 o 120 Hz.
- **`ui/juego.ts`** une las dos cosas: lee el dedo, llama a `core`, dibuja con `render` y muestra el HUD en DOM.

### 7.2 Rendimiento
- **Pools de objetos** para balas, zombis, partículas y monedas: no se crean objetos durante la partida (sin pausas del recolector de basura).
- **Rejilla espacial** (spatial hash) para las colisiones bala-zombi, en lugar de comparar todos contra todos.
- **Atlas de sprites**: los dibujos (vectoriales, hechos en código o SVG propios) se pre-renderizan una vez al cargar en un `OffscreenCanvas` o canvas oculto, a la resolución de la pantalla. Después solo se usa `drawImage`.
- **Resolución adaptable:** la calidad (`baja`/`media`/`alta`/`auto`) limita el `devicePixelRatio` y la cantidad de partículas, con la medición automática de `fx/loop.ts` de McL Tiles.
- **Límite de FPS** configurable (30/60/sin límite) y medidor de FPS opcional, reutilizando la lógica de `efectos`.
- **Topes:** máximo de balas y partículas vivas; si se supera, se reciclan las más viejas.

### 7.3 Audio
Web Audio API sintetizada, como `audio.ts` de McL Tiles (sin archivos de audio): disparos con ruido filtrado, explosiones, golpes, monedas y una música de tensión en bucle. Se limita la cantidad de sonidos de disparo simultáneos (un disparo "agrupado" por cuadro) para no saturar.

### 7.4 Guardado
`localStorage` con esquema versionado y `normalizarGuardado()` que valida cada campo, igual que `storage.ts` de McL Tiles. Guarda: nivel actual, estrellas por nivel, monedas, niveles de los edificios, héroes desbloqueados y equipado, fichas de rescate, racha diaria, misiones, récord de Horda, cosméticos y configuración. Incluye exportar e importar progreso.

### 7.5 Estructura de carpetas
Replica la de `testjuegotiles`, agregando `render/` para el dibujo del juego en canvas:

```
/
├─ index.html              # viewport-fit=cover, theme-color, manifest, noscript
├─ netlify.toml            # build, Node 22, CSP y caché (igual que McL Tiles)
├─ vite.config.ts          # __VERSION__ desde package.json + config de Vitest
├─ tsconfig.json           # mismo que McL Tiles
├─ .vscode/                # launch.json y tasks.json: jugar en local, build de producción, pruebas
├─ public/
│  ├─ manifest.webmanifest # orientation: portrait, display: standalone
│  ├─ sw.js                # caché "red primero, copia sin conexión"
│  ├─ favicon.svg
│  └─ icon-*.png           # 48 a 512 + apple-touch-icon
├─ src/
│  ├─ main.ts              # registra pantallas, desbloqueo de audio, visibilitychange, service worker
│  ├─ app.ts               # clase Aplicacion: registrar(), ir(), guardar(), aplicarConfig()
│  ├─ version.ts
│  ├─ storage.ts           # Guardado versionado + normalizarGuardado
│  ├─ audio.ts             # efectos y música sintetizados
│  ├─ haptica.ts           # vibración con comprobación de soporte
│  ├─ core/                # lógica pura y determinista (probada en Node)
│  │  ├─ rng.ts            # copiado de McL Tiles
│  │  ├─ mundo.ts          # estado de la partida y paso fijo
│  │  ├─ escuadra.ts       # soldados, formación, vida, escudo
│  │  ├─ armas.ts          # niveles de arma, patrones, cadencia, daño
│  │  ├─ enemigos.ts       # tipos de zombi, IA sencilla, jefe por fases
│  │  ├─ elementos.ts      # barriles, puertas, obstáculos, monedas
│  │  ├─ colisiones.ts     # rejilla espacial
│  │  ├─ pool.ts           # pools de objetos
│  │  ├─ tramos.ts         # catálogo de plantillas de tramos
│  │  ├─ generador.ts      # nivel por semilla y presupuesto de dificultad
│  │  ├─ dificultad.ts     # curva infinita y modos de dificultad
│  │  └─ bot.ts            # jugador automático para validar niveles
│  ├─ render/              # dibujo en canvas (solo lee el estado)
│  │  ├─ sprites.ts        # atlas pre-renderizado
│  │  ├─ escena.ts         # fondo con desplazamiento, entidades, interpolación
│  │  └─ camara.ts         # sacudida de cámara y escala a la pantalla
│  ├─ content/
│  │  ├─ heroes.ts         # catálogo de héroes
│  │  ├─ escenarios.ts     # capítulos, paletas y fondos
│  │  └─ misiones.ts
│  ├─ economy/
│  │  ├─ wallet.ts         # monedas, recompensas, racha diaria
│  │  └─ refugio.ts        # edificios, costos y efectos
│  ├─ settings/
│  │  └─ settings.ts       # calidad, FPS, volúmenes, vibración, sensibilidad, dificultad
│  ├─ fx/
│  │  ├─ loop.ts           # bucle rAF con límite de FPS, medidor y calidad automática
│  │  └─ particles.ts      # polvo, chispas, casquillos, monedas
│  ├─ ui/                  # pantallas con el patrón de McL Tiles (Pantalla { el, limpiar })
│  │  ├─ dom.ts            # h, boton, abrirModal, confirmar, avisar (copiado)
│  │  ├─ componentes.ts    # chip de monedas, tarjetas, barras
│  │  ├─ bienvenida.ts     # nombre del jugador y tutorial
│  │  ├─ inicio.ts         # botón Jugar grande, nivel actual, accesos
│  │  ├─ juego.ts          # canvas + HUD + entrada táctil
│  │  ├─ finNivel.ts       # victoria / derrota / segunda oportunidad
│  │  ├─ refugio.ts
│  │  ├─ heroes.ts
│  │  ├─ mapa.ts           # capítulos y niveles
│  │  ├─ configuracion.ts
│  │  └─ acerca.ts
│  └─ styles/main.css      # tokens, tema claro/oscuro, safe areas
└─ tests/                  # Vitest
```

### 7.6 Netlify
Mismo `netlify.toml` que McL Tiles: `npm run build`, publicación de `dist`, Node 22, cabeceras de seguridad (CSP sin orígenes externos), `Cache-Control` inmutable para `/assets/*` y `no-cache` para `/sw.js`. Se despliega conectando el repositorio de GitHub (despliegue continuo) o con `npx netlify deploy --prod`.

---

## 8. Fases de desarrollo

| Fase | Entregable | Estimación |
|---|---|---|
| **0. Setup** | Copia de la base de McL Tiles (Vite, TS, Vitest, `app.ts`, `dom.ts`, `storage.ts`, `settings.ts`, `rng.ts`, `fx/loop.ts`, `netlify.toml`, `.vscode`), pantalla de inicio vacía y primer despliegue en Netlify | 0,5 día |
| **1. Prueba de rendimiento** | Canvas con paso fijo, 500 zombis y 300 balas con pools y rejilla espacial, medido en un celular real. **Aquí se confirma Canvas 2D o se cambia a Pixi** | 1 día |
| **2. Núcleo jugable** | Arrastre relativo, escuadrón con formación, disparo automático, caminantes, barriles de soldados y de arma, victoria y derrota, con 1 nivel fijo | 2–3 días |
| **3. Contenido de juego** | 6 armas, 5 tipos de zombi más el jefe, puertas, obstáculos y barril explosivo | 3 días |
| **4. Generador infinito** | Tramos, presupuesto de dificultad, curva, capítulos y bot de validación con pruebas sobre 1 000 niveles | 2–3 días |
| **5. Meta** | Refugio con 5 edificios, monedas, héroes con habilidad, recompensa diaria y misiones | 2–3 días |
| **6. Pantallas y flujo** | Bienvenida, tutorial guiado en los niveles 1–3, mapa, fin de nivel con estrellas, segunda oportunidad, configuración y acerca | 2 días |
| **7. Juice y audio** | Partículas, sacudida de cámara, números de daño, monedas que vuelan, vibración, efectos y música sintetizados | 2 días |
| **8. Celular y PWA** | Safe areas, pantalla completa, wake lock, manifest, service worker, íconos y pruebas en Android (Chrome) e iPhone (Safari) | 1–2 días |
| **9. Balance y lanzamiento** | Ajuste de curva con pruebas de jugadores reales, Modo Horda, Lighthouse > 90, metadatos OG y dominio en Netlify | 2 días |

**MVP jugable en el celular** (fases 0 a 2, más un generador básico y el despliegue): unos **5–6 días**. Conviene probarlo pronto en un celular real, porque el rendimiento y la sensación del arrastre son lo que más riesgo tiene.

---

## 9. Pruebas automáticas (Vitest)

- **Determinismo:** el mismo nivel y la misma dificultad generan siempre el mismo nivel, y la misma secuencia de entradas produce el mismo resultado.
- **Niveles ganables:** el bot gana los niveles del 1 al 1 000 en todas las dificultades con las mejoras de refugio esperadas para cada nivel.
- **Balance:** el presupuesto de vida enemiga de cada tramo queda dentro del rango definido.
- **Núcleo:** colisiones de la rejilla espacial, efecto de cada puerta y barril, patrones de arma, daño en área y fases del jefe.
- **Rendimiento del núcleo:** 60 segundos simulados con 500 entidades tardan menos de un tiempo límite.
- **Guardado:** `normalizarGuardado` repara datos dañados y la exportación/importación da el mismo estado.
- **Economía:** costos del refugio, recompensa diaria y racha.

---

## 10. Criterios de aceptación

- [ ] Se juega completo con un solo dedo en un celular en vertical desde 360 px de ancho.
- [ ] Va a 60 FPS estables en un Android de gama media con la calidad en "auto", y nunca baja de 30 en gama baja con la calidad en "baja".
- [ ] El arrastre responde sin retraso perceptible y el dedo no tapa al escuadrón.
- [ ] Ningún gesto del juego provoca zoom, selección de texto, desplazamiento ni recarga de la página.
- [ ] La partida se pausa sola al cambiar de app o bloquear el celular.
- [ ] Los niveles del 1 al 1 000 se generan en menos de 20 ms y el bot los gana (prueba automática).
- [ ] El progreso, el refugio y la configuración se mantienen al recargar.
- [ ] Después de la primera visita carga sin conexión y se puede instalar en la pantalla de inicio (Android e iPhone).
- [ ] El sonido arranca tras el primer toque en Chrome Android y Safari iOS.
- [ ] No hay compras, anuncios ni recursos externos (CSP sin orígenes de terceros).
- [ ] No hay ningún nombre, gráfico ni sonido de Last Z.

---

## 11. Riesgos

| Riesgo | Mitigación |
|---|---|
| Rendimiento en celulares de gama baja | Prueba de estrés en la fase 1, pools, rejilla espacial, atlas, calidad automática, topes de entidades y opción de 30 FPS. Plan B: PixiJS solo en `render/` |
| Safari iOS: audio, pantalla completa y vibración limitados | Desbloqueo de audio con el primer toque, PWA standalone en lugar de Fullscreen API y vibración opcional que se ignora si no existe |
| Gestos del navegador (recargar, deslizar atrás, zoom) | `touch-action: none`, `overscroll-behavior: none` y pruebas en dispositivos reales |
| Niveles injustos o aburridos | Presupuesto de dificultad, bot de validación, dientes de sierra, variedad de tramos y ajuste tras 3 derrotas |
| Propiedad intelectual de la referencia | Solo se toma la mecánica. Nombre, arte, personajes y sonido son propios |
| Violencia | Estilo caricatura, sin sangre: los zombis se deshacen en polvo |
| El progreso vive en el navegador | Exportar e importar progreso desde Configuración |
| Monotonía en niveles altos | Capítulos con escenarios nuevos, vueltas con otras paletas, héroes, misiones y Modo Horda |

---

## 12. Decisiones abiertas

1. **Nombre final** del juego (de trabajo: "Last Survival").
2. **Temática:** zombis caricatura (propuesta) u otra amenaza (robots, aliens, monstruos) para un público más amplio.
3. **Alcance del refugio:** las 5 tarjetas propuestas o algo más visual (base dibujada con edificios que crecen).
4. **Idioma:** solo español o español e inglés desde el inicio.
