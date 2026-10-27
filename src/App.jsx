import { useState, useRef, useMemo } from "react";
import { Wheel, useWheel } from "@cxde/wheel-of-fortune";
import "@cxde/wheel-of-fortune/style.css";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "./App.css";

import logoU from './assets/logo-u.png';
import logoDireccion from './assets/logo-direccion.png';
// Placeholders: si tienes imágenes, cambia estos imports
// import logoU from './assets/logo-u.png';
// import logoDireccion from './assets/logo-direccion.png';

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

function App() {
  const wheel = useWheel();

  const [participants, setParticipants] = useState([]);
  const [newName, setNewName] = useState("");
  const [mode, setMode] = useState("full"); // 'full' | 'one-by-one'
  const [winners, setWinners] = useState([]); // historial de ganadores
  const [modalWinner, setModalWinner] = useState(null); // ganador para modal
  const [bulkText, setBulkText] = useState(""); // entrada masiva
  const [showBulk, setShowBulk] = useState(false);

  const printAreaRef = useRef(null);

  // Participantes activos (en modo one-by-one se van quitando)
  const activeParticipants = participants.filter((p) => !p.eliminated);

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

  // Resetear todo
  const resetAll = () => {
    if (
      !window.confirm("¿Reiniciar todo? Se borrarán participantes e historial.")
    )
      return;
    setParticipants([]);
    setWinners([]);
    setModalWinner(null);
  };

  // Cuando termina el giro
  const handleSpinEnd = ({ winner }) => {
    if (!winner) return;
    const now = new Date();
    const record = {
      id: crypto.randomUUID(),
      name: winner.label,
      timestamp: now.toLocaleString("es-PE", {
        dateStyle: "long",
        timeStyle: "medium",
      }),
    };
    setWinners((prev) => [record, ...prev]);
    setModalWinner(record);

    if (mode === "one-by-one") {
      // Marcar como eliminado para que no vuelva a salir
      setParticipants((prev) =>
        prev.map((p) =>
          p.name === winner.label ? { ...p, eliminated: true } : p,
        ),
      );
    }
  };

  // Girar
  const spin = () => {
    if (activeParticipants.length < 2) return;
    wheel.spin({ mode: "client" });
  };

  // Imprimir lista completa ordenada 01..N (modo full)
  const printFullList = async () => {
    if (!participants.length) return;
    const canvas = await html2canvas(printAreaRef.current, {
      scale: 2,
      backgroundColor: "#fff",
    });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;
    pdf.addImage(img, "PNG", 0, 0, w, h);
    pdf.save("lista-participantes.pdf");
  };

  // Imprimir resultados del sorteo
  const printWinners = async () => {
    if (!winners.length) return;
    const canvas = await html2canvas(printAreaRef.current, {
      scale: 2,
      backgroundColor: "#fff",
    });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;
    pdf.addImage(img, "PNG", 0, 0, w, h);
    pdf.save("resultados-sorteo.pdf");
  };

  return (
    <div className="app">
      {/* HEADER con logos */}
      <header className="header">
        <img src={logoU} alt="Logo Universidad" className="logo logo-left" />
        <h1 className="title">Universidad Nacional del Centro del Perú<br/>Dirección de Proyección Social y Extensión Cultural</h1>
        <img src={logoDireccion} alt="Logo Dirección" className="logo logo-right" />
      </header>

      {/* CUERPO: dos columnas */}
      <div className="layout">
        {/* COLUMNA IZQUIERDA: Ruleta */}
        <section className="left-panel">
          <div className="mode-toggle">
            <button
              className={mode === "full" ? "active" : ""}
              onClick={() => setMode("full")}
            >
              Sorteo completo
            </button>
            <button
              className={mode === "one-by-one" ? "active" : ""}
              onClick={() => setMode("one-by-one")}
            >
              Uno a uno
            </button>
          </div>

          <div className="wheel-box">
            {wheelItems.length >= 2 ? (
              <Wheel
                controller={wheel}
                items={wheelItems}
                size="100%"
                showProbability
                onSpinEnd={handleSpinEnd}
                spinAnimation={{
                  duration: 4000,
                  rotations: { min: 5, max: 8 },
                  easing: "cubic-bezier(.12,.82,.18,1)",
                }}
                pointerPosition="top"
              />
            ) : (
              <div className="wheel-empty">Añade al menos 2 participantes</div>
            )}
          </div>

          <button
            className="btn btn-primary spin-btn"
            onClick={spin}
            disabled={wheel.isSpinning || activeParticipants.length < 2}
          >
            {wheel.isSpinning ? "Girando..." : "¡Girar!"}
          </button>

          <div className="left-actions">
            <button className="btn btn-secondary" onClick={resetAll}>
              Reiniciar todo
            </button>
            <button
              className="btn btn-outline"
              onClick={() => setShowBulk((s) => !s)}
            >
              {showBulk ? "Cerrar entrada masiva" : "Añadir varios"}
            </button>
          </div>

          {showBulk && (
            <div className="bulk-box">
              <textarea
                placeholder="Un nombre por línea..."
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
              />
              <button className="btn btn-primary" onClick={addBulkParticipants}>
                Añadir lista
              </button>
            </div>
          )}
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
            />
            <button className="btn btn-primary" onClick={addParticipant}>
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
                <li key={w.id}>
                  <span className="idx">
                    {String(winners.length - i).padStart(2, "0")}
                  </span>
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
              disabled={!participants.length}
            >
              Imprimir lista completa
            </button>
            <button
              className="btn btn-primary"
              onClick={printWinners}
              disabled={!winners.length}
            >
              Imprimir resultados
            </button>
          </div>
        </section>
      </div>

      {/* MODAL flotante de ganador */}
      {modalWinner && (
        <div className="modal-backdrop" onClick={() => setModalWinner(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>¡Ganador!</h2>
            <p className="modal-name">{modalWinner.name}</p>
            <p className="modal-time">{modalWinner.timestamp}</p>
            <button
              className="btn btn-primary"
              onClick={() => setModalWinner(null)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ZONA DE IMPRESIÓN (oculta, usada por html2canvas) */}
      <div ref={printAreaRef} className="print-area">
        <h2>Ruleta de Sorteo - DPSEC</h2>
        <p>Fecha: {new Date().toLocaleString("es-PE")}</p>
        {mode === "full" || winners.length > 0 ? (
          <>
            <h3>Participantes</h3>
            <ol>
              {participants.map((p) => (
                <li key={p.id}>
                  {p.name} {p.eliminated ? "(Elegido)" : ""}
                </li>
              ))}
            </ol>
            {winners.length > 0 && (
              <>
                <h3>Resultados</h3>
                <ol>
                  {winners.map((w) => (
                    <li key={w.id}>
                      {w.name} — {w.timestamp}
                    </li>
                  ))}
                </ol>
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

export default App;
