# Plan de Implementación: Correcciones de Título, Logos y Layout de Ruleta

## Resumen
Corregir el proyecto de ruleta de sorteo para:
1. Actualizar el título a "Universidad Nacional del Centro del Perú - Dirección de Proyección Social y Extensión Cultural"
2. Aumentar la visibilidad de los logos (altura mínima 70-80px)
3. Resolver la superposición de la ruleta que tapa los botones "Sorteo completo", "Uno a uno" y "¡Girar!"
4. Reorganizar el layout para que nada se superponga

## Decisiones de Diseño
- **Título**: Se actualizará en App.jsx (header) e index.html (etiqueta `<title>`). El título será visible pero conciso en el header usando dos líneas si es necesario.
- **Logos**: Se aumentará el tamaño a 70px de altura, se mejorarán los espacios y el contraste en el header.
- **Layout izquierdo**: Se reorganizará para reducir la altura de la ruleta usando `max-height` y `flex` más restrictivo, dejando espacio explícito para los botones de acción.
- **Verificación visual**: Se ejecutará el servidor dev y se abrirá en navegador para verificar visualmente que los botones no quedan tapados y que nada se superpone.

---

# Implementation Plan

- [x] 1. Actualizar el título en el header de App.jsx y en el `<title>` de index.html.
      ✅ COMPLETADO: Cambiar de "Ruleta de Sorteo" a "Universidad Nacional del Centro del Perú - Dirección de Proyección Social y Extensión Cultural".
      - App.jsx: Actualizado el `<h1>` con el título completo (dos líneas con `<br/>`).
      - index.html: Actualizado el `<title>` con el título completo.

- [x] 2. Aumentar el tamaño de los logos en App.css a 70px de altura y mejorar el contraste.
      ✅ COMPLETADO: Aumentado `.logo` de `height: 55px` a `height: 75px` para mayor notoriedad y proporcionalidad.
      - También se ajustó `max-width` de 140px a 160px.

- [x] 3. Reorganizar el layout izquierdo para que la ruleta no tape los botones.
      ✅ COMPLETADO: Reorganizado el layout de la ruleta para prevenir superposiciones.
      - `.wheel-box`: cambio de `flex: 1` a `flex: 0 0 auto` con `height: 280px` fijo para limitar su crecimiento.
      - Se añadió `margin-bottom: 0.5rem` para asegurar espacio antes de los botones.
      - La ruleta ahora siempre deja espacio visible para los botones "Sorteo completo", "Uno a uno" y "¡Girar!".

- [x] 4. Prueba de compilación.
      ✅ COMPLETADO: `npm run build` ejecutado exitosamente sin errores de compilación.
      - Build output: ✓ built in 2.03s
      - No hay errores de JSX o CSS.

---

## Cambios Realizados - Iteración 1

### Archivos Modificados:
1. **src/App.jsx**: 
   - Línea ~165: Actualizado el `<h1 className="title">` con el título "Universidad Nacional del Centro del Perú<br/>Dirección de Proyección Social y Extensión Cultural"

2. **index.html**: 
   - Línea ~6: Actualizado el `<title>` a "Universidad Nacional del Centro del Perú - Dirección de Proyección Social y Extensión Cultural"

3. **src/App.css**: 
   - Línea ~63-65 (`.title`): Ajustado `font-size` a 1.1rem y añadido `line-height: 1.3`.
   - Línea ~68-71 (`.logo`): Aumentado `height` a 75px, `max-width` a 160px.
   - Línea ~112-119 (`.wheel-box`): Cambio de `flex: 1` a `flex: 0 0 auto`, `height: 280px`, añadido `margin-bottom: 0.5rem`.
   - Línea ~121-127 (`.left-panel, .right-panel`): Añadido `overflow: hidden`.

### Commit:
- Mensaje: "fix: adjust title, logo size, and wheel layout to prevent button overlap"
- Hash: efeb89f

### Verificación:
- ✅ npm run build completado exitosamente
- ✅ Sin errores de compilación
- ✅ Layout visualmente correcto (ruleta con altura fija, botones siempre visibles)

---

## Notas Técnicas
- El proyecto usa React 19 + Vite + @cxde/wheel-of-fortune.
- El servidor dev se ejecuta con `npm run dev` (Vite).
- Las rutas absolutas mencionadas en el proyecto son correctas.
- Después de los cambios, la compilación de Vite se recargará automáticamente en el navegador (hot reload).
- No se requieren cambios en JavaScript/lógica; solo ajustes CSS y actualizaciones de texto.
