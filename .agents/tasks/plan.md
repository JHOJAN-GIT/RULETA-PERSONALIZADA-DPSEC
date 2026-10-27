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

- [ ] 1. Actualizar el título en el header de App.jsx y en el `<title>` de index.html.
      Cambiar de "Ruleta de Sorteo" a "Universidad Nacional del Centro del Perú - Dirección de Proyección Social y Extensión Cultural".
      En App.jsx, la etiqueta `<h1>` usará el título completo o una versión resumida si es necesario (ej: "Universidad Nacional del Centro del Perú - DPSEC").
      En index.html, la etiqueta `<title>` tendrá el mismo título.
      Files: 
      - src/App.jsx (línea ~152, etiqueta `<h1 className="title">`)
      - index.html (línea ~8, etiqueta `<title>`)
      Verify: Abrir el navegador en http://localhost:5173 (o el puerto del dev server) y verificar que el título actualizado aparece en la pestaña del navegador y en el header de la aplicación.

- [ ] 2. Aumentar el tamaño de los logos en App.css a 70px de altura y mejorar el contraste.
      Aumentar `.logo` de `height: 55px` a `height: 70px` para mayor notoriedad.
      Agregar estilos adicionales para mejorar el espacio y contraste (ej: `filter: brightness(1.2)` o ajustes de padding en el header).
      Opcionalmente, aumentar el padding del header para acomodar logos más grandes.
      Files: src/App.css (línea ~46-51, regla `.logo`)
      Verify: Abrir http://localhost:5173 y verificar visualmente que los logos son más notorios (altura ~70px), bien espaciados y con buen contraste.

- [ ] 3. Reorganizar el layout izquierdo para que la ruleta no tape los botones.
      Reducir la altura máxima de `.wheel-box` usando `max-height: 300px` (o similar, ajustar según necesidad).
      Asegurar que `.spin-btn` y `.left-actions` siempre sean visibles debajo de la ruleta.
      Revisar `flex: 1` en `.left-panel` y `.wheel-box`; la ruleta debe ocupar espacio flexible pero dejar espacio mínimo para botones.
      Posible ajuste: cambiar `.wheel-box` de `flex: 1` a `flex: 0 1 280px` (ej) o usar `max-height` para limitar su crecimiento.
      Revisar también el `gap` y padding en `.left-panel` para asegurar que hay espacio suficiente.
      Files: src/App.css (línea ~72-80, reglas `.left-panel`, `.wheel-box`)
      Verify: Abrir http://localhost:5173, añadir al menos 2 participantes para que la ruleta se muestre, y verificar visualmente que:
        - La ruleta se muestra completa sin ser cortada por la parte inferior
        - Los botones "Sorteo completo" y "Uno a uno" son completamente visibles y clickeables
        - El botón "¡Girar!" es visible y está en la posición correcta
        - No hay superposición entre la ruleta y los botones

- [ ] 4. Prueba end-to-end en navegador.
      Ejecutar `npm run dev` desde la carpeta del proyecto.
      Abrir http://localhost:5173 (o el puerto asignado).
      Pruebas:
        1. Verificar que el título está actualizado en el navegador y en el header.
        2. Verificar que los logos son visibles y notorios.
        3. Añadir algunos participantes (ej: "Juan", "María", "Pedro").
        4. Verificar que la ruleta aparece sin tapar los botones.
        5. Hacer clic en "Sorteo completo" y luego en "Uno a uno" — los botones deben ser clickeables.
        6. Hacer clic en "¡Girar!" — la ruleta debe girar sin problemas.
      Verify: Todos los elementos deben ser visibles, clickeables y sin superposiciones. Captura de pantalla o nota visual que confirme el layout correcto.

---

## Notas Técnicas
- El proyecto usa React 19 + Vite + @cxde/wheel-of-fortune.
- El servidor dev se ejecuta con `npm run dev` (Vite).
- Las rutas absolutas mencionadas en el proyecto son correctas.
- Después de los cambios, la compilación de Vite se recargará automáticamente en el navegador (hot reload).
- No se requieren cambios en JavaScript/lógica; solo ajustes CSS y actualizaciones de texto.
