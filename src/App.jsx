import { useState, useRef, useMemo, useEffect } from "react";
import { Wheel, useWheel } from "@cxde/wheel-of-fortune";
import "@cxde/wheel-of-fortune/style.css";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "./App.css";

import logoU from "./assets/logo-u.png";
import logoDireccion from "./assets/logo-direccion.png";

const COLORS = [
  "#7c3aed", "#db2777", "#2563eb", "#ea580c",
  "#16a34a", "#0891b2", "#ca8a04", "#9333ea",
];

const AUTO_PAUSE_MS  = 1700;
const BANNER_MS      = 2500;
const LAST_PAUSE_MS  = 1800;
const FINALIZE_DELAY_MS = 2200;

// Calcula "HH:MM AM/PM – HH:MM AM/PM" para el n-ésimo participante (0-indexed)
function calcSlot(startTime, durationMin, index) {
  if (!startTime || !durationMin) return "—";
  const [h, m] = startTime.split(":").map(Number);
  const baseMin = h * 60 + m;
  const from = baseMin + index * durationMin;
  const to   = from + durationMin;
  const fmt  = (mins) => {
    const hh  = Math.floor(mins / 60) % 24;
    const mm  = mins % 60;
    const ampm = hh >= 12 ? "PM" : "AM";
    const hh12 = hh % 12 === 0 ? 12 : hh % 12;
    return `${String(hh12).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${ampm}`;
  };
  return `${fmt(from)} – ${fmt(to)}`;
}

function App() {
  const wheel = useWheel();

  const [participants,  setParticipants]  = useState([]);
  const [newName,       setNewName]       = useState("");
  const [mode,          setMode]          = useState("auto");
  const [winners,       setWinners]       = useState([]);
  const [bulkText,      setBulkText]      = useState("");
  const [showBulk,      setShowBulk]      = useState(false);
  const [winnerBanner,  setWinnerBanner]  = useState(null);
  const [sorteoDone,    setSorteoDone]    = useState(false);
  const [spinning,      setSpinning]      = useState(false);
  const [autoRunning,   setAutoRunning]   = useState(false);
  const [finalizing,    setFinalizing]    = useState(false);

  // Detalles del evento
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventStart,     setEventStart]     = useState(""); // "HH:MM"
  const [eventDuration,  setEventDuration]  = useState(""); // minutos (string)
  // Confirmados (los que se usan para el PDF y el cálculo)
  const [confirmedStart,    setConfirmedStart]    = useState("");
  const [confirmedDuration, setConfirmedDuration] = useState("");
  // Alerta "faltan datos"
  const [showNoDataAlert, setShowNoDataAlert] = useState(false);

  // Errores de validación dentro del modal
  const [durationError, setDurationError] = useState("");

  const autoRunningRef  = useRef(false);
  const autoTimerRef    = useRef(null);
  const bannerTimerRef  = useRef(null);
  const doneTimerRef    = useRef(null);
  const printResultsRef = useRef(null);
  const printHeaderRef  = useRef(null); // solo el encabezado, para la página de firmas

  const activeParticipants = participants.filter((p) => !p.eliminated);
  const busy = spinning || autoRunning || finalizing;

  const wheelItems = useMemo(
    () => activeParticipants.map((p, i) => ({
      id: p.id, label: p.name, weight: 1, color: COLORS[i % COLORS.length],
    })),
    [activeParticipants],
  );

  useEffect(() => () => {
    clearTimeout(autoTimerRef.current);
    clearTimeout(bannerTimerRef.current);
    clearTimeout(doneTimerRef.current);
  }, []);

  const clearAllTimers = () => {
    clearTimeout(autoTimerRef.current); autoTimerRef.current = null;
    clearTimeout(bannerTimerRef.current); bannerTimerRef.current = null;
    clearTimeout(doneTimerRef.current);  doneTimerRef.current  = null;
  };

  const showWinnerBanner = (record) => {
    setWinnerBanner(record);
    clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => setWinnerBanner(null), BANNER_MS);
  };

  /* ── Participantes ── */
  const addParticipant = () => {
    const name = newName.trim();
    if (!name) return;
    setParticipants((prev) => [...prev, { id: crypto.randomUUID(), name, eliminated: false }]);
    setNewName("");
  };

  const addBulkParticipants = () => {
    const names = bulkText.split("\n").map((n) => n.trim()).filter(Boolean);
    if (!names.length) return;
    setParticipants((prev) => [
      ...prev,
      ...names.map((name) => ({ id: crypto.randomUUID(), name, eliminated: false })),
    ]);
    setBulkText(""); setShowBulk(false);
  };

  const removeParticipant = (id) =>
    setParticipants((prev) => prev.filter((p) => p.id !== id));

  const stopAuto = () => {
    autoRunningRef.current = false;
    setAutoRunning(false); setSpinning(false);
    clearTimeout(autoTimerRef.current); autoTimerRef.current = null;
  };

  const resetAll = () => {
    if (!window.confirm("¿Reiniciar todo? Se borrarán participantes e historial.")) return;
    try { wheel.cancel(); } catch { /* noop */ }
    stopAuto(); clearAllTimers();
    setFinalizing(false);
    setParticipants([]); setWinners([]);
    setWinnerBanner(null); setSorteoDone(false);
    setShowBulk(false); setBulkText(""); setNewName("");
  };

  /* ── Spin ── */
  const handleSpinEnd = ({ winner }) => {
    setSpinning(false);
    if (!winner) return;

    const now = new Date();
    const stamp = () => now.toLocaleString("es-PE", { dateStyle: "long", timeStyle: "medium" });
    const record = { id: crypto.randomUUID(), name: winner.label, timestamp: stamp() };

    setWinners((prev) => [...prev, record]);
    showWinnerBanner(record);
    setParticipants((prev) =>
      prev.map((p) => (p.id === winner.id ? { ...p, eliminated: true } : p)),
    );

    const remaining = activeParticipants.filter((p) => p.id !== winner.id).length;

    if (remaining === 1) {
      const lastP = activeParticipants.find((p) => p.id !== winner.id);
      stopAuto(); setFinalizing(true);
      doneTimerRef.current = setTimeout(() => {
        const lastRecord = { id: crypto.randomUUID(), name: lastP.name, timestamp: stamp() };
        setWinners((prev) => [...prev, lastRecord]);
        setParticipants((prev) =>
          prev.map((p) => (p.id === lastP.id ? { ...p, eliminated: true } : p)),
        );
        showWinnerBanner(lastRecord);
        doneTimerRef.current = setTimeout(() => {
          setFinalizing(false); setSorteoDone(true);
        }, FINALIZE_DELAY_MS);
      }, LAST_PAUSE_MS);
      return;
    }

    if (mode === "auto" && autoRunningRef.current) {
      if (remaining >= 2) {
        autoTimerRef.current = setTimeout(() => {
          if (!autoRunningRef.current) return;
          setSpinning(true); wheel.spin({ mode: "client" });
        }, AUTO_PAUSE_MS);
      } else {
        stopAuto(); setSorteoDone(true);
      }
    }
  };

  const handleSpinCancel = () => {
    setSpinning(false); stopAuto(); clearAllTimers(); setFinalizing(false);
  };

  /* ── Iniciar sorteo ── */
  const startSpin = () => {
    if (activeParticipants.length < 2) return;

    // Si faltan detalles del evento, mostrar alerta
    if (!confirmedStart || !confirmedDuration) {
      setShowNoDataAlert(true);
      return;
    }
    launchSpin();
  };

  const launchSpin = () => {
    setSorteoDone(false); setFinalizing(false); setSpinning(true);
    if (mode === "auto") { autoRunningRef.current = true; setAutoRunning(true); }
    wheel.spin({ mode: "client" });
  };

  const changeMode = (m) => { if (!busy) setMode(m); };

  /* ── Modal detalles del evento ── */
  const openEventModal = () => {
    // Pre-carga los valores confirmados para editar
    setEventStart(confirmedStart);
    setEventDuration(confirmedDuration);
    setDurationError("");
    setShowEventModal(true);
  };

  const validateAndConfirm = () => {
    const dur = parseInt(eventDuration, 10);
    if (!eventStart) { setDurationError("Ingresa la hora de inicio."); return; }
    if (!eventDuration || isNaN(dur) || dur <= 0 || !Number.isInteger(dur)) {
      setDurationError("Ingresa un número entero positivo.");
      return;
    }
    setConfirmedStart(eventStart);
    setConfirmedDuration(String(dur));
    setDurationError("");
    setShowEventModal(false);
  };

  /* ── PDF ── */
  const printResults = async () => {
    if (!printResultsRef.current) return;

    const pdf    = new jsPDF("p", "mm", "a4");
    const pageW  = pdf.internal.pageSize.getWidth();
    const pageH  = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const availW = pageW - margin * 2;
    const availH = pageH - margin * 2;

    // Captura el contenido principal
    const canvas = await html2canvas(printResultsRef.current, {
      scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false,
    });
    const img   = canvas.toDataURL("image/png");
    const ratio = Math.min(availW / canvas.width, availH / canvas.height);
    const imgW  = canvas.width  * ratio;
    const imgH  = canvas.height * ratio;

    pdf.addImage(img, "PNG", (pageW - imgW) / 2, margin, imgW, imgH);

    // ── Página de firmas ──
    // Si el contenido ocupa una página o menos (imgH ≤ availH):
    //   • Si "casi exacto" (imgH > availH * 0.82): el espacio sobrante es insuficiente
    //     para firmar → agrega página en blanco con solo el encabezado.
    //   • Si imgH ≤ availH * 0.82: hay espacio sobrante suficiente → no agrega página.
    // Si el contenido desborda a más de una página (imgH > availH):
    //   siempre hay espacio en la última página parcial → no agrega página.
    const FIRMA_THRESHOLD = 0.82; // 82 % de la página = "casi llena"
    if (imgH <= availH && imgH > availH * FIRMA_THRESHOLD) {
      // Captura solo el encabezado para la página de firmas
      const hdrCanvas = await html2canvas(printHeaderRef.current, {
        scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false,
      });
      const hdrImg   = hdrCanvas.toDataURL("image/png");
      const hdrRatio = Math.min(availW / hdrCanvas.width, availH / hdrCanvas.height);
      const hdrW     = hdrCanvas.width  * hdrRatio;
      const hdrH     = hdrCanvas.height * hdrRatio;

      pdf.addPage();
      pdf.addImage(hdrImg, "PNG", (pageW - hdrW) / 2, margin, hdrW, hdrH);
    }

    pdf.save("festidanza-2026-resultados.pdf");
  };

  const spinLabel = mode === "auto"
    ? autoRunning ? "Sorteando…" : "▶ Iniciar sorteo"
    : spinning    ? "Girando…"   : "¡Girar!";

  const eventConfigured = confirmedStart && confirmedDuration;

  return (
    <div className="app">
      {/* ── HEADER ── */}
      <header className="header">
        <img src={logoU} alt="Logo Universidad" className="logo logo-left" />
        <div className="header-center">
          <h1 className="title">
            Universidad Nacional del Centro del Perú
            <br />
            Dirección de Proyección Social y Extensión Cultural
          </h1>
          <p className="event-subtitle">Festidanza 2026 — Administrativos y Docentes</p>
        </div>
        <img src={logoDireccion} alt="Logo Dirección" className="logo logo-right" />
      </header>

      {/* ── CUERPO ── */}
      <div className="layout">
        {/* COLUMNA IZQUIERDA */}
        <section className="left-panel">
          <div className="mode-toggle">
            <button className={mode === "auto"   ? "active" : ""} onClick={() => changeMode("auto")}   disabled={busy}>Sorteo automático</button>
            <button className={mode === "manual" ? "active" : ""} onClick={() => changeMode("manual")} disabled={busy}>Manual</button>
          </div>

          <div className="wheel-area">
            <div className="wheel-box">
              {wheelItems.length >= 2 ? (
                <Wheel
                  controller={wheel} items={wheelItems} size="100%"
                  showProbability onSpinEnd={handleSpinEnd} onSpinCancel={handleSpinCancel}
                  spinAnimation={{ duration: 4000, rotations: { min: 5, max: 8 }, easing: "cubic-bezier(.12,.82,.18,1)" }}
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

          <button className="btn btn-primary spin-btn" onClick={startSpin}
            disabled={busy || activeParticipants.length < 2}>
            {spinLabel}
          </button>

          {showBulk && (
            <div className="bulk-box">
              <textarea placeholder="Un nombre por línea..." value={bulkText}
                onChange={(e) => setBulkText(e.target.value)} disabled={busy} />
              <button className="btn btn-primary" onClick={addBulkParticipants} disabled={busy}>
                Añadir lista
              </button>
            </div>
          )}

          <div className="left-actions">
            <button className="btn btn-secondary" onClick={resetAll}>Reiniciar todo</button>
            <button className="btn btn-outline"   onClick={() => setShowBulk((s) => !s)} disabled={busy}>
              {showBulk ? "Cerrar entrada masiva" : "Añadir varios"}
            </button>
            <button
              className={`btn ${eventConfigured ? "btn-event-ok" : "btn-event"}`}
              onClick={openEventModal} disabled={busy}
            >
              {eventConfigured ? "⚙ Evento ✓" : "⚙ Detalles del evento"}
            </button>
          </div>
        </section>

        {/* COLUMNA DERECHA */}
        <section className="right-panel">
          <div className="add-row">
            <input type="text" placeholder="Nombre del participante" value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addParticipant()} disabled={busy} />
            <button className="btn btn-primary" onClick={addParticipant} disabled={busy}>Añadir</button>
          </div>

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
                    <button className="mini-btn" onClick={() => removeParticipant(p.id)}
                      disabled={busy} aria-label="Eliminar participante">✕</button>
                  )}
                </li>
              ))}
              {participants.length === 0 && <li className="empty">Sin participantes aún</li>}
            </ul>
          </div>

          <div className="results-box">
            <h3>Resultados ({winners.length})</h3>
            <ul className="results-list">
              {winners.map((w, i) => (
                <li key={w.id} className={i === winners.length - 1 ? "newest" : ""}>
                  <span className="idx">{String(i + 1).padStart(2, "0")}</span>
                  <span className="name">{w.name}</span>
                  <span className="time">
                    {eventConfigured
                      ? calcSlot(confirmedStart, parseInt(confirmedDuration, 10), i)
                      : w.timestamp}
                  </span>
                </li>
              ))}
              {winners.length === 0 && <li className="empty">Aún no hay ganadores</li>}
            </ul>
          </div>

          <div className="print-actions">
            <button className="btn btn-primary" onClick={printResults}
              disabled={busy || !winners.length}>
              Imprimir resultados
            </button>
          </div>
        </section>
      </div>

      {/* ── BANNER flotante del ganador ── */}
      {winnerBanner && (
        <div className="winner-banner" role="status" aria-live="polite">
          <span className="winner-banner-label">🎉 Ganador</span>
          <span className="winner-banner-name">{winnerBanner.name}</span>
          <span className="winner-banner-time">{winnerBanner.timestamp}</span>
        </div>
      )}

      {/* ── AVISO sorteo finalizado ── */}
      {sorteoDone && (
        <div className="modal-backdrop" onClick={() => setSorteoDone(false)}>
          <div className="modal-card sorteo-done-card" onClick={(e) => e.stopPropagation()}>
            <h2>🏁 Sorteo finalizado</h2>
            <p className="sorteo-done-text">
              Se determinó el orden completo de los {winners.length} participantes.
            </p>
            <button className="btn btn-primary" onClick={() => setSorteoDone(false)}>Cerrar</button>
          </div>
        </div>
      )}

      {/* ── MODAL detalles del evento ── */}
      {showEventModal && (
        <div className="modal-backdrop" onClick={() => setShowEventModal(false)}>
          <div className="modal-card event-modal" onClick={(e) => e.stopPropagation()}>
            <h2>⚙ Detalles del evento</h2>
            <p className="event-modal-desc">
              Configura la hora de inicio y el tiempo por participante para calcular los horarios en el PDF.
            </p>

            <div className="event-field">
              <label htmlFor="event-start">Hora de inicio</label>
              <input id="event-start" type="time" value={eventStart}
                onChange={(e) => setEventStart(e.target.value)} />
            </div>

            <div className="event-field">
              <label htmlFor="event-dur">Tiempo por participante (minutos)</label>
              <input id="event-dur" type="number" min="1" step="1"
                placeholder="ej: 15" value={eventDuration}
                onChange={(e) => { setEventDuration(e.target.value); setDurationError(""); }} />
              {durationError && <span className="event-error">{durationError}</span>}
            </div>

            <div className="event-modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowEventModal(false)}>Cancelar</button>
              <button className="btn btn-primary"   onClick={validateAndConfirm}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ALERTA faltan datos del evento ── */}
      {showNoDataAlert && (
        <div className="modal-backdrop" onClick={() => setShowNoDataAlert(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>⚠ Detalles del evento incompletos</h2>
            <p className="sorteo-done-text">
              No se configuraron la hora de inicio y el tiempo por participante.<br />
              El PDF no tendrá horarios. ¿Deseas continuar de todas formas?
            </p>
            <div className="event-modal-actions">
              <button className="btn btn-secondary" onClick={() => {
                setShowNoDataAlert(false); setShowEventModal(true);
              }}>Ir a detalles</button>
              <button className="btn btn-primary" onClick={() => {
                setShowNoDataAlert(false); launchSpin();
              }}>Continuar sin horarios</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ZONA DE IMPRESIÓN: RESULTADOS (oculta) ── */}
      <div ref={printResultsRef} className="print-area">
        <div className="doc">
          <header className="doc-header">
            <img src={logoU} alt="" className="doc-logo" />
            <div className="doc-titles">
              <p className="doc-title-l1">Universidad Nacional del Centro del Perú</p>
              <p className="doc-title-l2">Vicerrectorado Académico</p>
              <p className="doc-title-l3">Dirección de Proyección Social y Extensión Cultural</p>
            </div>
            <img src={logoDireccion} alt="" className="doc-logo" />
          </header>

          <h2 className="doc-doc-title">Festidanza 2026 — Administrativos y Docentes</h2>
          <table className="doc-table">
            <colgroup>
              <col style={{ width: "80px" }} />
              <col />
              <col style={{ width: "185px" }} />
            </colgroup>
            <thead>
              <tr>
                <th>N° de participación</th>
                <th>Nombre del participante</th>
                <th>Hora de presentación</th>
              </tr>
            </thead>
            <tbody>
              {winners.map((w, i) => (
                <tr key={w.id}>
                  <td className="num">{String(i + 1).padStart(2, "0")}</td>
                  <td className="name">{w.name}</td>
                  <td className="slot">
                    {calcSlot(confirmedStart, parseInt(confirmedDuration, 10), i)}
                  </td>
                </tr>
              ))}
              {winners.length === 0 && (
                <tr><td colSpan={3} className="empty">Aún no hay resultados</td></tr>
              )}
            </tbody>
          </table>
          <footer className="doc-footer">Total de participantes: {winners.length}</footer>
        </div>
      </div>

      {/* ── ZONA DE IMPRESIÓN: solo encabezado para página de firmas (oculta) ── */}
      <div ref={printHeaderRef} className="print-area">
        <div className="doc">
          <header className="doc-header">
            <img src={logoU} alt="" className="doc-logo" />
            <div className="doc-titles">
              <p className="doc-title-l1">Universidad Nacional del Centro del Perú</p>
              <p className="doc-title-l2">Vicerrectorado Académico</p>
              <p className="doc-title-l3">Dirección de Proyección Social y Extensión Cultural</p>
            </div>
            <img src={logoDireccion} alt="" className="doc-logo" />
          </header>
        </div>
      </div>
    </div>
  );
}

export default App;
