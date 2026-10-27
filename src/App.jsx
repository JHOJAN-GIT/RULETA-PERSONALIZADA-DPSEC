import { useState, useRef, useMemo, useEffect } from "react";
import { Wheel, useWheel } from "@cxde/wheel-of-fortune";
import "@cxde/wheel-of-fortune/style.css";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "./App.css";

import logoU from "./assets/logo-u.png";
import logoDireccion from "./assets/logo-direccion.png";

const COLORS = [
  "#7c3aed",
  "#db2777",
  "#2563eb",
  "#ea580c",
  "#16a34a",
  "#0891b2",
  "#ca8a04",
  "#9333ea",
];

// Pausa entre giros automáticos (ms) para que se vea al ganador en pantalla
const AUTO_PAUSE_MS = 1700;
// Cuánto se muestra el banner del ganador (ms)
const BANNER_MS = 2500;
// Al final: muestra al penúltimo (último elegido por la ruleta) antes de revelar al último
const LAST_PAUSE_MS = 1800;
// Al final: muestra al último (el que sobró) antes de salir el aviso de sorteo finalizado
const FINALIZE_DELAY_MS = 2200;

function App() {
  const wheel = useWheel();

  const [participants, setParticipants] = useState([]);
  const [newName, setNewName] = useState("");
  const [mode, setMode] = useState("auto"); // 'auto' | 'manual'
  const [winners, setWinners] = useState([]); // orden de selección: 1º primero
  const [bulkText, setBulkText] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [winnerBanner, setWinnerBanner] = useState(null); // aviso flotante del ganador
  const [sorteoDone, setSorteoDone] = useState(false); // aviso de sorteo finalizado
  const [spinning, setSpinning] = useState(false); // un giro está en curso
  const [autoRunning, setAutoRunning] = useState(false); // bucle automático activo
  const [finalizing, setFinalizing] = useState(false); // secuencia final en curso

  const autoRunningRef = useRef(false);
  const autoTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const doneTimerRef = useRef(null);
  const printListRef = useRef(null);
  const printResultsRef = useRef(null);

  // Participantes activos (los elegidos se marcan eliminated)
  const activeParticipants = participants.filter((p) => !p.eliminated);

  // Bloquea TODO excepto "Reiniciar todo" mientras hay un giro, el bucle o la secuencia final
  const busy = spinning || autoRunning || finalizing;

  // Items para la ruleta
  const wheelItems = useMemo(
    () =>
      activeParticipants.map((p, i) => ({
        id: p.id,
        label: p.name,
        weight: 1,
        color: COLORS[i % COLORS.length],
      })),
    [activeParticipants],
  );

  // Limpia timers al desmontar
  useEffect(
    () => () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
    },
    [],
  );

  const clearAllTimers = () => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    if (bannerTimerRef.current) {
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = null;
    }
    if (doneTimerRef.current) {
      clearTimeout(doneTimerRef.current);
      doneTimerRef.current = null;
    }
  };

  const showWinnerBanner = (record) => {
    setWinnerBanner(record);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(
      () => setWinnerBanner(null),
      BANNER_MS,
    );
  };

  // Añadir participante individual
  const addParticipant = () => {
    const name = newName.trim();
    if (!name) return;
    setParticipants((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name, eliminated: false },
    ]);
    setNewName("");
  };

  // Añadir varios (uno por línea)
  const addBulkParticipants = () => {
    const names = bulkText
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
    if (!names.length) return;
    setParticipants((prev) => [
      ...prev,
      ...names.map((name) => ({
        id: crypto.randomUUID(),
        name,
        eliminated: false,
      })),
    ]);
    setBulkText("");
    setShowBulk(false);
  };

  // Eliminar participante de la lista (antes de sortear)
  const removeParticipant = (id) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  // Detiene el bucle automático y limpia su timer
  const stopAuto = () => {
    autoRunningRef.current = false;
    setAutoRunning(false);
    setSpinning(false);
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  };

  // Resetear todo (siempre disponible, incluso a mitad de un giro)
  const resetAll = () => {
    if (
      !window.confirm("¿Reiniciar todo? Se borrarán participantes e historial.")
    )
      return;
    try {
      wheel.cancel();
    } catch {
      /* noop */
    }
    stopAuto();
    clearAllTimers();
    setFinalizing(false);
    setParticipants([]);
    setWinners([]);
    setWinnerBanner(null);
    setSorteoDone(false);
    setShowBulk(false);
    setBulkText("");
    setNewName("");
  };

  // Cuando termina un giro
  const handleSpinEnd = ({ winner }) => {
    setSpinning(false);
    if (!winner) return;

    const now = new Date();
  const stamp = () =>
    now.toLocaleString("es-PE", { dateStyle: "long", timeStyle: "medium" });
    const record = {
      id: crypto.randomUUID(),
      name: winner.label,
      timestamp: stamp(),
    };
    // 1º elegido en la 1ª fila, los siguientes hacia abajo
    setWinners((prev) => [...prev, record]);
    showWinnerBanner(record);

    // Elimina al ganador de la lista y la ruleta (por id, evita nombres duplicados)
    setParticipants((prev) =>
      prev.map((p) => (p.id === winner.id ? { ...p, eliminated: true } : p)),
    );

    // Activos restantes tras eliminar a este ganador
    const remaining = activeParticipants.filter(
      (p) => p.id !== winner.id,
    ).length;

    if (remaining === 1) {
      // Quedó un solo participante: es el ÚLTIMO del orden (el no elegido por la ruleta).
      // Se agrega a resultados como último elegido y se muestra con su flotante;
      // después de mostrarlo, recién sale el aviso de "Sorteo finalizado".
      const lastP = activeParticipants.find((p) => p.id !== winner.id);
      stopAuto();
      setFinalizing(true);
      if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
      doneTimerRef.current = setTimeout(() => {
        const lastRecord = {
          id: crypto.randomUUID(),
          name: lastP.name,
          timestamp: stamp(),
        };
        setWinners((prev) => [...prev, lastRecord]);
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === lastP.id ? { ...p, eliminated: true } : p,
          ),
        );
        showWinnerBanner(lastRecord);
        // tras mostrar al último elegido, sale el aviso de finalizado
        doneTimerRef.current = setTimeout(() => {
          setFinalizing(false);
          setSorteoDone(true);
        }, FINALIZE_DELAY_MS);
      }, LAST_PAUSE_MS);
      return;
    }

    if (mode === "auto" && autoRunningRef.current) {
      if (remaining >= 2) {
        // Siguiente giro automático tras una breve pausa
        if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
        autoTimerRef.current = setTimeout(() => {
          if (!autoRunningRef.current) return; // abortado por Reiniciar
          setSpinning(true);
          wheel.spin({ mode: "client" });
        }, AUTO_PAUSE_MS);
      } else {
        // No debería ocurrir (remaining === 0), pero por seguridad finalizamos
        stopAuto();
        setSorteoDone(true);
      }
    }
    // Modo manual con remaining >= 2: el usuario girará de nuevo
  };

  const handleSpinCancel = () => {
    setSpinning(false);
    stopAuto();
    clearAllTimers();
    setFinalizing(false);
  };

  // Iniciar giro según el modo
  const startSpin = () => {
    if (activeParticipants.length < 2) return;
    setSorteoDone(false);
    setFinalizing(false);
    setSpinning(true);
    if (mode === "auto") {
      autoRunningRef.current = true;
      setAutoRunning(true);
    }
    wheel.spin({ mode: "client" });
  };

  // Cambiar de modo (no se permite a mitad de un giro)
  const changeMode = (m) => {
    if (busy) return;
    setMode(m);
  };

  // Captura un área oculta y genera un PDF A4 centrado y ajustado a una página
  const capturePdf = async (ref, filename) => {
    if (!ref.current) return;
    const canvas = await html2canvas(ref.current, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const availW = pageW - margin * 2;
    const availH = pageH - margin * 2;
    const ratio = Math.min(availW / canvas.width, availH / canvas.height);
    const w = canvas.width * ratio;
    const h = canvas.height * ratio;
    pdf.addImage(img, "PNG", (pageW - w) / 2, margin, w, h);
    pdf.save(filename);
  };

  const printFullList = () => {
    if (!participants.length) return;
    capturePdf(printListRef, "lista-participantes.pdf");
  };

  const printWinners = () => {
    if (!winners.length) return;
    capturePdf(printResultsRef, "resultados-sorteo.pdf");
  };

  const spinLabel =
    mode === "auto"
      ? autoRunning
        ? "Sorteando…"
        : "▶ Iniciar sorteo"
      : spinning
        ? "Girando…"
        : "¡Girar!";

  return (
    <div className="app">
      {/* HEADER con logos */}
      <header className="header">
        <img src={logoU} alt="Logo Universidad" className="logo logo-left" />
        <h1 className="title">
          Universidad Nacional del Centro del Perú
          <br />
          Dirección de Proyección Social y Extensión Cultural
        </h1>
        <img
          src={logoDireccion}
          alt="Logo Dirección"
          className="logo logo-right"
        />
      </header>

      {/* CUERPO: dos columnas */}
      <div className="layout">
        {/* COLUMNA IZQUIERDA: Ruleta */}
        <section className="left-panel">
          <div className="mode-toggle">
            <button
              className={mode === "auto" ? "active" : ""}
              onClick={() => changeMode("auto")}
              disabled={busy}
            >
              Sorteo automático
            </button>
            <button
              className={mode === "manual" ? "active" : ""}
              onClick={() => changeMode("manual")}
              disabled={busy}
            >
              Manual
            </button>
          </div>

          <div className="wheel-area">
            <div className="wheel-box">
              {wheelItems.length >= 2 ? (
                <Wheel
                  controller={wheel}
                  items={wheelItems}
                  size="100%"
                  showProbability
                  onSpinEnd={handleSpinEnd}
                  onSpinCancel={handleSpinCancel}
                  spinAnimation={{
                    duration: 4000,
                    rotations: { min: 5, max: 8 },
                    easing: "cubic-bezier(.12,.82,.18,1)",
                  }}
                  pointerPosition="top"
                />
              ) : (
                <div className="wheel-empty">
                  {participants.length === 0
                    ? "Añade al menos 2 participantes"
                    : "Sorteo finalizado: añade más participantes para seguir"}
                </div>
              )}
            </div>
          </div>

          <button
            className="btn btn-primary spin-btn"
            onClick={startSpin}
            disabled={busy || activeParticipants.length < 2}
          >
            {spinLabel}
          </button>

          {showBulk && (
            <div className="bulk-box">
              <textarea
                placeholder="Un nombre por línea..."
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                disabled={busy}
              />
              <button
                className="btn btn-primary"
                onClick={addBulkParticipants}
                disabled={busy}
              >
                Añadir lista
              </button>
            </div>
          )}

          <div className="left-actions">
            <button className="btn btn-secondary" onClick={resetAll}>
              Reiniciar todo
            </button>
            <button
              className="btn btn-outline"
              onClick={() => setShowBulk((s) => !s)}
              disabled={busy}
            >
              {showBulk ? "Cerrar entrada masiva" : "Añadir varios"}
            </button>
          </div>
        </section>

        {/* COLUMNA DERECHA: participantes + resultados */}
        <section className="right-panel">
          {/* Añadir participante */}
          <div className="add-row">
            <input
              type="text"
              placeholder="Nombre del participante"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addParticipant()}
              disabled={busy}
            />
            <button
              className="btn btn-primary"
              onClick={addParticipant}
              disabled={busy}
            >
              Añadir
            </button>
          </div>

          {/* Lista de participantes */}
          <div className="list-box">
            <h3>Participantes ({activeParticipants.length})</h3>
            <ul className="participant-list">
              {participants.map((p, i) => (
                <li key={p.id} className={p.eliminated ? "eliminated" : ""}>
                  <span className="idx">{String(i + 1).padStart(2, "0")}</span>
                  <span className="name">{p.name}</span>
                  {p.eliminated ? (
                    <span className="tag">Elegido</span>
                  ) : (
                    <button
                      className="mini-btn"
                      onClick={() => removeParticipant(p.id)}
                      disabled={busy}
                      aria-label="Eliminar participante"
                    >
                      ✕
                    </button>
                  )}
                </li>
              ))}
              {participants.length === 0 && (
                <li className="empty">Sin participantes aún</li>
              )}
            </ul>
          </div>

          {/* Resultados */}
          <div className="results-box">
            <h3>Resultados ({winners.length})</h3>
            <ul className="results-list">
              {winners.map((w, i) => (
                <li
                  key={w.id}
                  className={i === winners.length - 1 ? "newest" : ""}
                >
                  <span className="idx">{String(i + 1).padStart(2, "0")}</span>
                  <span className="name">{w.name}</span>
                  <span className="time">{w.timestamp}</span>
                </li>
              ))}
              {winners.length === 0 && (
                <li className="empty">Aún no hay ganadores</li>
              )}
            </ul>
          </div>

          {/* Botones de impresión */}
          <div className="print-actions">
            <button
              className="btn btn-outline"
              onClick={printFullList}
              disabled={busy || !participants.length}
            >
              Imprimir lista completa
            </button>
            <button
              className="btn btn-primary"
              onClick={printWinners}
              disabled={busy || !winners.length}
            >
              Imprimir resultados
            </button>
          </div>
        </section>
      </div>

      {/* BANNER flotante del último ganador (no bloquea) */}
      {winnerBanner && (
        <div className="winner-banner" role="status" aria-live="polite">
          <span className="winner-banner-label">🎉 Ganador</span>
          <span className="winner-banner-name">{winnerBanner.name}</span>
          <span className="winner-banner-time">{winnerBanner.timestamp}</span>
        </div>
      )}

      {/* AVISO de sorteo finalizado */}
      {sorteoDone && (
        <div className="modal-backdrop" onClick={() => setSorteoDone(false)}>
          <div
            className="modal-card sorteo-done-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>🏁 Sorteo finalizado</h2>
            <p className="sorteo-done-text">
              Se determinó el orden completo de los {winners.length}{" "}
              participantes.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => setSorteoDone(false)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ZONA DE IMPRESIÓN: LISTA DE PARTICIPANTES (oculta) */}
      <div ref={printListRef} className="print-area">
        <div className="doc">
          <header className="doc-header">
            <img src={logoU} alt="" className="doc-logo" />
            <div className="doc-titles">
              <h1 className="doc-title-main">
                Universidad Nacional del Centro del Perú
              </h1>
              <p className="doc-title-sub">
                Dirección de Proyección Social y Extensión Cultural
              </p>
            </div>
            <img src={logoDireccion} alt="" className="doc-logo" />
          </header>
          <h2 className="doc-doc-title">Lista de Participantes</h2>
          <p className="doc-meta">
            Fecha: {new Date().toLocaleString("es-PE")}
          </p>
          <table className="doc-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Nombre del participante</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p, i) => (
                <tr key={p.id}>
                  <td className="num">{String(i + 1).padStart(2, "0")}</td>
                  <td className="name">{p.name}</td>
                  <td className="state">
                    {p.eliminated ? "Elegido" : "Pendiente"}
                  </td>
                </tr>
              ))}
              {participants.length === 0 && (
                <tr>
                  <td colSpan={3} className="empty">
                    Sin participantes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <footer className="doc-footer">
            Total de participantes: {participants.length}
          </footer>
        </div>
      </div>

      {/* ZONA DE IMPRESIÓN: RESULTADOS (oculta) */}
      <div ref={printResultsRef} className="print-area">
        <div className="doc">
          <header className="doc-header">
            <img src={logoU} alt="" className="doc-logo" />
            <div className="doc-titles">
              <h1 className="doc-title-main">
                Universidad Nacional del Centro del Perú
              </h1>
              <p className="doc-title-sub">
                Dirección de Proyección Social y Extensión Cultural
              </p>
            </div>
            <img src={logoDireccion} alt="" className="doc-logo" />
          </header>
          <h2 className="doc-doc-title">Resultados del Sorteo</h2>
          <p className="doc-meta">
            Fecha: {new Date().toLocaleString("es-PE")} · Orden de salida al
            escenario
          </p>
          <table className="doc-table">
            <thead>
              <tr>
                <th>Orden</th>
                <th>Nombre del participante</th>
                <th>Hora de elección</th>
              </tr>
            </thead>
            <tbody>
              {winners.map((w, i) => (
                <tr key={w.id}>
                  <td className="num">{String(i + 1).padStart(2, "0")}</td>
                  <td className="name">{w.name}</td>
                  <td className="time">{w.timestamp}</td>
                </tr>
              ))}
              {winners.length === 0 && (
                <tr>
                  <td colSpan={3} className="empty">
                    Aún no hay ganadores
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <footer className="doc-footer">
            Total de ganadores: {winners.length}
          </footer>
        </div>
      </div>
    </div>
  );
}

export default App;
