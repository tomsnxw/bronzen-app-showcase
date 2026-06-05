import { useState, useEffect } from "react";
import * as palletApi from "../services/palletApi";
import { SAMPLE_PLANILLAS } from "../demo/demoData";
import { Icon } from "../icons";
import ModuleHelp from "./ModuleHelp";
import "./Pallet.scss";

// Parte un código en [lo_que_coincide, lo_que_completa] según lo tipeado,
// para mostrar la parte nueva en negrita (estilo Google). Cuenta caracteres
// ignorando espacios, porque la búsqueda normaliza (mayúsculas y sin espacios).
function partirSugerencia(codigo, query) {
  const qNorm = (query || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!qNorm) return [codigo, ""];
  let count = 0;
  for (let i = 0; i < codigo.length; i++) {
    if (!/\s/.test(codigo[i])) count++;
    if (count >= qNorm.length) {
      return [codigo.slice(0, i + 1), codigo.slice(i + 1)];
    }
  }
  return [codigo, ""];
}

function Pallet() {
  const [tab, setTab] = useState("cargar");

  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [pallets, setPallets] = useState([]);
  const [erroresImg, setErroresImg] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analisisHecho, setAnalisisHecho] = useState(false);

  // Guardado en base
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(null);

  // Búsqueda por código
  const [codigoBusqueda, setCodigoBusqueda] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [busquedaHecha, setBusquedaHecha] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState(null);
  const [sugerencias, setSugerencias] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

  // Suma imágenes (cámara o galería) a la lista, sin pisar las anteriores.
  const agregarArchivos = (e) => {
    const nuevos = Array.from(e.target.files || []);
    if (nuevos.length === 0) return;
    setFiles((prev) => [...prev, ...nuevos]);
    setPreviews((prev) => [...prev, ...nuevos.map((f) => URL.createObjectURL(f))]);
    setPallets([]);
    setErroresImg([]);
    setError(null);
    setGuardado(null);
    setAnalisisHecho(false);
    // Reseteo el input para poder volver a elegir/sacar la misma foto.
    e.target.value = "";
  };

  const quitarImagen = (idx) => {
    setPreviews((prev) => {
      const url = prev[idx];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== idx);
    });
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setPallets([]);
    setErroresImg([]);
    setGuardado(null);
    setAnalisisHecho(false);
  };

  // Carga las planillas de muestra (viven en /public) como si el usuario las
  // hubiera subido, así se puede probar el flujo sin tener una foto propia.
  const cargarEjemplo = async () => {
    setError(null);
    try {
      const cargados = await Promise.all(
        SAMPLE_PLANILLAS.map(async (s) => {
          const res = await fetch(s.url);
          const blob = await res.blob();
          return new File([blob], s.nombre, {
            type: blob.type || "image/svg+xml",
          });
        })
      );
      setFiles((prev) => [...prev, ...cargados]);
      setPreviews((prev) => [
        ...prev,
        ...cargados.map((f) => URL.createObjectURL(f)),
      ]);
      setPallets([]);
      setErroresImg([]);
      setGuardado(null);
      setAnalisisHecho(false);
    } catch {
      setError("No se pudieron cargar las planillas de ejemplo.");
    }
  };

  const limpiarTodo = () => {
    previews.forEach((url) => url && URL.revokeObjectURL(url));
    setFiles([]);
    setPreviews([]);
    setPallets([]);
    setErroresImg([]);
    setError(null);
    setGuardado(null);
    setAnalisisHecho(false);
  };

  const handleAnalyze = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    setPallets([]);
    setErroresImg([]);
    setGuardado(null);
    setAnalisisHecho(false);

    try {
      const data = await palletApi.analyze(files);
      setPallets(data.pallets || []);
      setErroresImg(data.errores || []);
      setAnalisisHecho(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (pallets.length === 0) return;
    try {
      await palletApi.exportarExcel(pallets);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleGuardar = async () => {
    if (pallets.length === 0) return;
    setGuardando(true);
    setGuardado(null);
    setError(null);
    try {
      const data = await palletApi.guardar(pallets);
      setGuardado(data.guardados ?? 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleBuscar = async (e, codigoArg) => {
    if (e) e.preventDefault();
    const codigo = (codigoArg != null ? codigoArg : codigoBusqueda).trim();
    if (!codigo) return;
    setMostrarSugerencias(false);
    setSugerencias([]);
    setBuscando(true);
    setErrorBusqueda(null);
    setResultados([]);
    setBusquedaHecha(false);
    try {
      const data = await palletApi.buscar(codigo);
      setResultados(data.resultados || []);
      setBusquedaHecha(true);
    } catch (e) {
      setErrorBusqueda(e.message);
    } finally {
      setBuscando(false);
    }
  };

  // Autocompletado: trae sugerencias mientras se escribe (con debounce).
  useEffect(() => {
    if (tab !== "buscar" || !mostrarSugerencias) return;
    const q = codigoBusqueda.trim();
    if (q === "") {
      setSugerencias([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const data = await palletApi.sugerencias(q);
        setSugerencias(data.sugerencias || []);
      } catch {
        setSugerencias([]);
      }
    }, 120);
    return () => clearTimeout(t);
  }, [codigoBusqueda, mostrarSugerencias, tab]);

  const totalItems = pallets.reduce(
    (acc, p) => acc + (p.items?.length || 0),
    0
  );

  return (
    <div className="m-pallet bz-container">
      <div className="bz-module-head">
        <span className="bz-module-head__icon"><Icon.Pallets size={24} /></span>
        <div>
          <h1 className="bz-module-head__title">Lector de Pallets</h1>
          <p className="bz-module-head__sub">Digitalizá planillas y buscá un código en la base</p>
        </div>
      </div>

      <ModuleHelp
        titulo="el Lector de Pallets"
        resumen="Lee las planillas escritas a mano de los pallets (número de pallet + sus artículos) y las pasa a digital. Después podés guardarlas en la base y buscar en qué pallet está cada código."
        pasos={[
          "En la pestaña «Cargar», tocá «Seleccionar imágenes» y elegí las fotos de las planillas de pallets.",
          "Apretá «Analizar»: la app detecta cada número de pallet con sus artículos. Revisá que esté bien.",
          "Tocá «Guardar en base» para guardarlo (así después se puede buscar) o «Descargar Excel» para bajar el listado.",
          "En la pestaña «Buscar», escribí un código y te dice en qué pallet o pallets está.",
        ]}
        nota="Para que lea bien: foto nítida y derecha, y que el número de pallet se vea claro (subrayado, en círculo o como «NNN|»)."
      />

      <div className="m-pallet__tabs">
        <button
          className={"m-pallet__tab" + (tab === "cargar" ? " is-active" : "")}
          onClick={() => setTab("cargar")}
        >
          <Icon.Cargar size={16} /> Cargar
        </button>
        <button
          className={"m-pallet__tab" + (tab === "buscar" ? " is-active" : "")}
          onClick={() => setTab("buscar")}
        >
          <Icon.Buscar size={16} /> Buscar
        </button>
      </div>

      {tab === "cargar" && (
        <>
          <p className="m-pallet__subtitle">
            Subí una foto de la planilla y la app extrae los pallets y
            artículos. Revisá el resultado y guardalo en la base.
          </p>

          <div className="m-pallet__actions">
            <label className="bz-btn">
              <Icon.Foto size={18} /> Sacar foto
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={agregarArchivos}
                className="m-pallet__file"
              />
            </label>

            <label className="bz-btn">
              <Icon.Galeria size={18} /> Elegir de galería
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={agregarArchivos}
                className="m-pallet__file"
              />
            </label>

            <button
              className="bz-btn bz-btn--primary"
              onClick={handleAnalyze}
              disabled={files.length === 0 || loading}
            >
              {loading
                ? "Analizando…"
                : files.length > 1
                ? `Analizar ${files.length} imágenes`
                : "Analizar imagen"}
            </button>
          </div>

          <p className="m-pallet__example">
            ¿No tenés una planilla a mano?{" "}
            <button
              type="button"
              className="m-pallet__example-link"
              onClick={cargarEjemplo}
              disabled={loading}
            >
              Cargar planillas de ejemplo
            </button>
          </p>

          <div className="bz-alert bz-alert--warn m-pallet__tip">
            <Icon.Tip size={18} /> Asegurate de que el número de pallet se vea
            claro y la foto esté en foco.
          </div>

          {previews.length > 0 && (
            <>
              <div className="m-pallet__preview-head">
                <span className="bz-eyebrow">
                  {files.length} imagen{files.length === 1 ? "" : "es"} lista
                  {files.length === 1 ? "" : "s"} para analizar
                </span>
                <button className="bz-btn" onClick={limpiarTodo}>
                  Limpiar todo
                </button>
              </div>
              <div className="m-pallet__preview-grid">
                {previews.map((url, i) => (
                  <div key={i} className="m-pallet__preview-item">
                    <button
                      type="button"
                      onClick={() => quitarImagen(i)}
                      className="m-pallet__remove"
                      aria-label="Quitar imagen"
                      title="Quitar"
                    >
                      <Icon.Cerrar size={14} />
                    </button>
                    <img src={url} alt={`preview-${i}`} className="m-pallet__preview-img" />
                    <small className="m-pallet__preview-label">{files[i]?.name}</small>
                  </div>
                ))}
              </div>
            </>
          )}

          {error && (
            <div className="bz-alert bz-alert--bad m-pallet__mt">
              <Icon.Error size={18} /> {error}
            </div>
          )}

          {erroresImg.length > 0 && (
            <div className="bz-alert bz-alert--warn m-pallet__mt">
              <Icon.ErrorProc size={18} />
              <div>
                Hubo errores procesando algunas imágenes:
                <ul className="m-pallet__error-list">
                  {erroresImg.map((e, i) => (
                    <li key={i}>
                      <strong>{e.imagen}:</strong> {e.error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {analisisHecho &&
            !loading &&
            !error &&
            pallets.length === 0 &&
            erroresImg.length === 0 && (
              <div className="bz-alert bz-alert--warn m-pallet__mt">
                <Icon.SinResultado size={18} />
                <span>
                  No se detectó ningún pallet en la
                  {files.length === 1 ? "" : "s"} imagen
                  {files.length === 1 ? "" : "es"}. Puede que la foto esté
                  borrosa o que el número de pallet no se vea bien. Probá
                  sacarla de nuevo con buena luz, derecha y bien enfocada.
                </span>
              </div>
            )}

          {pallets.length > 0 && (
            <div className="m-pallet__results">
              <div className="m-pallet__summary">
                <span className="m-pallet__summary-text">
                  <strong>{pallets.length}</strong> pallet
                  {pallets.length === 1 ? "" : "s"} detectado
                  {pallets.length === 1 ? "" : "s"} —{" "}
                  <strong>{totalItems}</strong> item
                  {totalItems === 1 ? "" : "s"}
                </span>
                <div className="m-pallet__summary-actions">
                  <button
                    className="bz-btn bz-btn--primary"
                    onClick={handleGuardar}
                    disabled={guardando || guardado !== null}
                  >
                    {guardando ? (
                      "Guardando…"
                    ) : guardado !== null ? (
                      <><Icon.Guardado size={16} /> Guardado</>
                    ) : (
                      "Guardar en base"
                    )}
                  </button>
                  <button
                    className="bz-btn bz-btn--teal"
                    onClick={handleDownloadExcel}
                  >
                    Descargar Excel
                  </button>
                </div>
              </div>

              {guardado !== null && (
                <div className="bz-alert bz-alert--ok m-pallet__mb">
                  <Icon.Guardado size={18} /> Guardado en la base: {guardado} item
                  {guardado === 1 ? "" : "s"}. Ya podés buscarlos por código.
                </div>
              )}

              {pallets.map((p, idx) => (
                <PalletTable key={`${p.pallet}-${idx}`} pallet={p} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "buscar" && (
        <>
          <p className="m-pallet__subtitle">
            Escribí un código y te dice en qué pallet(s) está.
          </p>

          <form className="m-pallet__search-form" onSubmit={handleBuscar}>
            <div className="m-pallet__search-wrap">
              <Icon.Buscar size={18} className="m-pallet__search-icon" />
              <input
                type="text"
                value={codigoBusqueda}
                onChange={(e) => {
                  setCodigoBusqueda(e.target.value);
                  setMostrarSugerencias(true);
                }}
                onFocus={() => setMostrarSugerencias(true)}
                onBlur={() =>
                  setTimeout(() => setMostrarSugerencias(false), 150)
                }
                placeholder="Ej: BRZ-7250"
                className="bz-input m-pallet__search-input"
                autoComplete="off"
                autoFocus
              />
              {mostrarSugerencias && sugerencias.length > 0 && (
                <ul className="m-pallet__suggest">
                  {sugerencias.map((s, i) => {
                    const [coincide, completa] = partirSugerencia(
                      s.codigo,
                      codigoBusqueda
                    );
                    return (
                      <li
                        key={i}
                        className="m-pallet__suggest-item"
                        onMouseDown={() => {
                          setCodigoBusqueda(s.codigo);
                          handleBuscar(null, s.codigo);
                        }}
                      >
                        <Icon.Buscar size={16} />
                        <span className="m-pallet__suggest-text mono">
                          {coincide}
                          <strong>{completa}</strong>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <button
              className="bz-btn bz-btn--primary"
              type="submit"
              disabled={buscando || codigoBusqueda.trim() === ""}
            >
              {buscando ? "Buscando…" : "Buscar"}
            </button>
          </form>

          {errorBusqueda && (
            <div className="bz-alert bz-alert--bad m-pallet__mt">
              <Icon.Error size={18} /> {errorBusqueda}
            </div>
          )}

          {busquedaHecha && !errorBusqueda && (
            <div className="m-pallet__results">
              {resultados.length === 0 ? (
                <div className="bz-alert bz-alert--warn">
                  <Icon.SinResultado size={18} />
                  <span>
                    No se encontró el código{" "}
                    <strong className="mono">{codigoBusqueda.trim()}</strong> en
                    ningún pallet.
                  </span>
                </div>
              ) : (
                <>
                  <div className="m-pallet__summary">
                    <span className="m-pallet__summary-text">
                      <strong className="mono">{resultados[0].codigo}</strong>{" "}
                      está en {resultados.length} pallet
                      {resultados.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="m-pallet__chips">
                    {resultados.map((r, i) => (
                      <div key={i} className="m-pallet__chip-card">
                        <span className="bz-eyebrow">Pallet</span>
                        <span className="m-pallet__chip-num mono">{r.pallet}</span>
                        {r.cantidad ? (
                          <span className="m-pallet__chip-qty mono">
                            cant: {r.cantidad}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PalletTable({ pallet }) {
  const items = pallet.items || [];
  const hayCantidades = items.some(
    (it) => it.cantidad && String(it.cantidad).trim() !== ""
  );

  return (
    <div className="bz-panel m-pallet__block">
      <h3 className="m-pallet__block-title">
        <span className="mono">PALLET {pallet.pallet}</span>
        {pallet.imagen && (
          <span className="m-pallet__img-tag">
            <Icon.Foto size={14} /> {pallet.imagen}
          </span>
        )}
      </h3>
      {items.length === 0 ? (
        <p className="m-pallet__empty-items">(sin artículos legibles)</p>
      ) : (
        <table className="bz-table">
          <thead>
            <tr>
              <th>Descripción</th>
              {hayCantidades && <th>Cantidad</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td className="code">{it.descripcion}</td>
                {hayCantidades && <td className="num">{it.cantidad || ""}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <small className="m-pallet__total">Total artículos: {items.length}</small>
    </div>
  );
}

export default Pallet;
