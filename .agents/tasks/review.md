# Correcciones de Título, Logos y Layout de la Ruleta

La aplicación de ruleta fue actualizada para resolver los problemas reportados: título incorrecto, logos poco visibles, y superposición de la ruleta que ocultaba botones críticos del control. El enfoque fue reorganizar el layout mediante flexbox y ajustar dimensiones, manteniendo la integridad funcional de la aplicación.

**Watch for:** La ruleta ahora usa una altura fija (280px) para garantizar que los botones de control ("Sorteo completo", "Uno a uno", "¡Girar!") permanezcan visibles y accesibles. Aunque verificado en build, requiere validación visual en navegador para confirmar que el espacio es adecuado en diferentes resoluciones de pantalla.

**Verdict**: APPROVED

## High-level view

El título del header y de la página ahora refleja la identidad completa de la institución: "Universidad Nacional del Centro del Perú - Dirección de Proyección Social y Extensión Cultural". El título se divide en dos líneas en el header para mantener la proporcionalidad sin comprometer el espacio de los logos.

Los logos se aumentaron de 55px a 75px de altura, mejorando su presencia visual sin dominar el header. El ajuste de max-width (140px → 160px) mantiene la proporción aspectual.

El panel izquierdo (donde reside la ruleta) fue reorganizado para fijar la altura de la ruleta en 280px con `flex: 0 0 auto`, evitando que crezca dinámicamente y comprima los controles inferiores. Un margen inferior explícito asegura espacio visual entre la ruleta y los botones.

<details>
<summary>Issues (0)</summary>

No hay hallazgos bloqueantes. Las correcciones se implementaron conforme al alcance especificado.

</details>

<details>
<summary>Details</summary>

### Actualización de Identidad: Título Institucional

El título se cambió en dos lugares para coherencia completa. En `App.jsx`, el `<h1>` del header ahora contiene "Universidad Nacional del Centro del Perú" seguido de un salto de línea HTML (`<br/>`) y "Dirección de Proyección Social y Extensión Cultural". El `<title>` del HTML se actualizó de manera paralela para mantener consistencia cuando la página se abre en una nueva pestaña.

El font-size del título se mantiene en 1.1rem y se añadió `line-height: 1.3` para asegurar que ambas líneas tengan espaciado visual claro. Este enfoque preserva la jerarquía visual del header sin necesidad de introducir contenedores anidados adicionales.

### Visibilidad de Logos: Mayor Tamaño y Proporción

El atributo `height` de la clase `.logo` se incrementó de 55px a 75px. El `max-width` se ajustó de 140px a 160px para mantener la proporción aspectual y permitir que imágenes más grandes se expandan proporcionalmente. El `object-fit: contain` garantiza que las imágenes no se deformen.

Los logos se posicionan en el header mediante `display: flex; justify-content: space-between`, colocándose a ambos lados del título. Este layout garantiza que el título tiene espacio central sin competir con las imágenes.

### Resolución de Superposición: Layout Izquierdo Reorganizado

El contenedor `.wheel-box` fue el punto crítico de ajuste. Originalmente tenía `flex: 1`, lo que permitía que creciera para llenar el espacio disponible en el flex container vertical del panel izquierdo, comprimiendo o ocultando los botones inferiores.

El cambio a `flex: 0 0 auto` con `height: 280px` fija la altura de la ruleta en 280px sin permitir que se expanda. Esta altura es suficiente para mostrar la ruleta de forma clara mientras deja espacio predecible para los botones de control ("Sorteo completo", "Uno a uno") y el botón "¡Girar!" que está debajo.

Un `margin-bottom: 0.5rem` explícito asegura un pequeño espaciado visual entre la ruleta y los botones de modo, mejorando la jerarquía visual.

Se añadió `min-height: 0` a los contenedores `.left-panel` y `.right-panel` para prevenir que el flex container fije un tamaño mínimo basado en el contenido, lo que podría causar overflow. Esto permite que el layout respete los tamaños fijos y los espacios explícitos.

### Comportamiento del Grid y Overflow

El layout principal usa `display: grid; grid-template-columns: 1fr 1fr` para dividir la pantalla en dos columnas iguales de 50%. El `gap: 1rem` asegura separación entre paneles. El contenedor `.layout` tiene `min-height: 0` para permitir que los paneles internos se ajusten al espacio disponible sin generar overflow.

Todos los paneles interiores tienen `overflow: hidden`, lo que previene que el contenido scroll horizontalmente o que se desborde en direcciones inesperadas. Combinado con flex layouts y min-height: 0, esto crea un comportamiento predecible donde cada panel respeta sus límites de tamaño.

### Verificación de Compilación

Se ejecutó `npm run build` sin errores. El bundler de Vite generó los archivos de producción correctamente. No hay advertencias críticas en el output de compilación relacionadas con los cambios de CSS o JSX. El hot reload de Vite aplicará los cambios automáticamente en desarrollo.

</details>

### File Map

```
src/App.jsx
- Línea ~165: Actualizado <h1 className="title"> con título completo de dos líneas
- Líneas 2-4: Imports de logos (sin cambios funcionales, solo comentarios)

src/App.css
- Línea 63-65: .title — ajuste de font-size y line-height
- Línea 68-71: .logo — height: 75px, max-width: 160px
- Línea 112-119: .wheel-box — cambio a flex: 0 0 auto, height: 280px, margin-bottom
- Línea 87: .left-panel, .right-panel — añadido min-height: 0 y overflow: hidden
- Línea 99: .layout — min-height: 0

index.html
- Línea ~6: <title> actualizado con nombre institucional completo

[Full diff: git diff main](git-diff-not-shown-per-instructions)
```
