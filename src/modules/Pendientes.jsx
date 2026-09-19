import { Fragment, useState, useRef, useMemo } from "react";
import * as pendientesApi from "../services/pendientesApi";
import { Icon } from "../icons";
import ModuleHelp from "./ModuleHelp";
import "./Pendientes.scss";

const PASOS = [
  { id: "subir", n: 1, label: "Subir archivo" },
  { id: "revisar", n: 2, label: "Revisar" },
  { id: "confirmar", n: 3, label: "Confirmar" },
];

function Stepper({ pasoActual }) {
  const indiceActual = PASOS.findIndex((p) => p.id === pasoActual);
  return (
    <div className="m-pnd__stepper">
      {PASOS.map((p, i) => (
        <div
          key={p.id}
          className={
            "m-pnd__step" +
            (i === indiceActual ? " is-active" : "") +
            (i < indiceActual ? " is-done" : "")
          }
        >
          <span className="m-pnd__step-n">{i < indiceActual ? <Icon.Guardado size={13} /> : p.n}</span>
          <span className="m-pnd__step-label">{p.label}</span>
          {i < PASOS.length - 1 && <span className="m-pnd__step-line" />}
        </div>
      ))}
    </div>
  );
}

function estadoInfo(estado) {
  if (estado === "listo") return { chip: "ok", label: "Listo" };
  if (estado === "sin_telefono") return { chip: "warn", label: "Sin teléfono" };
  return { chip: "bad", label: "No encontrado" };
}

function pluralProductos(n) {
  return `${n} producto${n === 1 ? "" : "s"}`;
}

// Mismo texto que la plantilla aprobada en Meta (aviso_pendientes_bronzen),
// con las variables de este cliente ya reemplazadas — es lo que de verdad
// le llegaría al cliente, no una versión "linda" aparte.
function armarMensajePreview(cliente) {
  const nombre = cliente.cliente || "";
  const lista = cliente.lista_articulos || "";
  const vendedor = cliente.vendedor || "Armando";
  return `Hola, ${nombre}. Te contamos que ya está disponible en stock lo que faltaba de tu pedido:\n\n${lista}\n\nAnte cualquier consulta, contactate con ${vendedor}.`;
}

// El check de la primera columna manda: prendido = se manda. Solo se puede
// prender en clientes "listo" (con teléfono válido) — a los que todavía no
// tienen teléfono no hay a dónde mandarles nada.
function CheckEnvio({ cliente, onToggle }) {
  const habilitado = cliente.estado === "listo";
  const color = estadoInfo(cliente.estado).chip;
  return (
    <button
      type="button"
      className={`m-pnd__check m-pnd__check--${color}` + (cliente.incluido ? " is-on" : "")}
      disabled={!habilitado}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      title={
        !habilitado
          ? "Necesita un teléfono válido para poder enviarse"
          : cliente.incluido
          ? "Se va a enviar — click para excluir"
          : "No se va a enviar — click para incluir"
      }
    >
      {cliente.incluido && <Icon.Guardado size={14} />}
    </button>
  );
}

// Resuelve un pendiente (sin_telefono / no_encontrado) o edita uno que ya
// está "listo" — siempre queda abierto a cambiar de coincidencia o cargar
// otro número.
function FilaResolucion({ cliente, onGuardar, guardando }) {
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState("");

  const guardar = async (tel, codigoCoincidencia = null) => {
    setError("");
    try {
      await onGuardar(cliente, tel, codigoCoincidencia);
    } catch (e) {
      setError(e.message || "No se pudo guardar.");
    }
  };

  const mensaje =
    cliente.estado === "listo"
      ? "Ya tiene un teléfono cargado. Si hace falta, elegí otra coincidencia o cargá un número distinto."
      : cliente.estado === "sin_telefono"
      ? "Este cliente existe en la base, pero no tiene teléfono cargado (o está mal escrito)."
      : "No se encontró este cliente en la base. Elegí una coincidencia, o cargá el teléfono a mano.";

  return (
    <div className="m-pnd__resolver">
      <p>{mensaje}</p>

      {cliente.estado === "listo" && cliente.telefono && (
        <p className="m-pnd__resolver-actual mono">Actual: {cliente.telefono}</p>
      )}

      {cliente.posibles_coincidencias?.length > 0 && (
        <div className="m-pnd__coincidencias">
          {cliente.posibles_coincidencias.map((cand) => (
            <button
              key={cand.codigo}
              className={
                "m-pnd__coincidencia" +
                (cliente.coincidencia_elegida === cand.codigo ? " is-selected" : "")
              }
              onClick={() => guardar(cand.telefono, cand.codigo)}
              disabled={guardando}
            >
              <span className="m-pnd__coincidencia-nombre">{cand.nombre}</span>
              <span className="m-pnd__coincidencia-meta mono">
                {Math.round(cand.score * 100)}% parecido · {cand.telefono}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="m-pnd__resolver-row">
        <input
          type="tel"
          placeholder={cliente.estado === "listo" ? "Cargar otro número" : "Ej: 11 2345-6789"}
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          className="m-pnd__resolver-input"
        />
        <button
          className="bz-btn bz-btn--primary"
          disabled={!telefono || guardando}
          onClick={() => guardar(telefono)}
        >
          Guardar
        </button>
      </div>
      {error && <p className="m-pnd__resolver-error">{error}</p>}
    </div>
  );
}

function Pendientes() {
  const [paso, setPaso] = useState("subir");
  const [cargando, setCargando] = useState(false);
  const [errorCarga, setErrorCarga] = useState("");
  const [clientes, setClientes] = useState([]);
  const [expandido, setExpandido] = useState(null);
  const [previewIdx, setPreviewIdx] = useState(null);
  const [previewCerrando, setPreviewCerrando] = useState(false);
  const [guardandoIdx, setGuardandoIdx] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [resultadoEnvio, setResultadoEnvio] = useState(null);
  const [nombreSimulado, setNombreSimulado] = useState("");
  const dropRef = useRef(null);

  const cerrarPreview = () => {
    setPreviewCerrando(true);
    setTimeout(() => {
      setPreviewIdx(null);
      setPreviewCerrando(false);
    }, 160);
  };

  const aplicarResultados = (data) => {
    setClientes(data.resultados.map((c) => ({ ...c, incluido: c.estado === "listo" })));
    setPaso("revisar");
  };

  // No hay selector de archivo real: la zona se ve y se comporta como un
  // dropzone (click o drag&drop), pero cualquier interacción dispara la
  // misma carga del Excel de pendientes de ejemplo — así el flujo siempre
  // es demostrable sin depender de que alguien tenga a mano un Excel con
  // las columnas exactas.
  const cargarEjemplo = async (nombreArchivo = "Pendientes_14-09.xlsx") => {
    setCargando(true);
    setNombreSimulado(nombreArchivo);
    setErrorCarga("");
    try {
      const data = await pendientesApi.cargarEjemplo();
      aplicarResultados(data);
    } catch (e) {
      setErrorCarga(e.message || "No se pudo cargar el ejemplo.");
    } finally {
      setCargando(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    dropRef.current?.classList.remove("is-dragover");
    const nombre = e.dataTransfer.files?.[0]?.name;
    cargarEjemplo(nombre || undefined);
  };

  const guardarTelefono = async (cliente, telefono, codigoCoincidencia = null) => {
    const idx = clientes.indexOf(cliente);
    setGuardandoIdx(idx);
    try {
      const data = await pendientesApi.guardarTelefono(cliente.num_cte, telefono);
      setClientes((prev) =>
        prev.map((c, i) =>
          i === idx
            ? { ...c, estado: "listo", telefono: data.telefono, incluido: true, coincidencia_elegida: codigoCoincidencia }
            : c
        )
      );
    } finally {
      setGuardandoIdx(null);
    }
  };

  const toggleIncluido = (idx) => {
    setClientes((prev) => prev.map((c, i) => (i === idx ? { ...c, incluido: !c.incluido } : c)));
  };

  const conteo = useMemo(() => {
    let listos = 0, sinTelefono = 0, noEncontrados = 0;
    for (const c of clientes) {
      if (c.estado === "listo") listos++;
      else if (c.estado === "sin_telefono") sinTelefono++;
      else noEncontrados++;
    }
    return { listos, sinTelefono, noEncontrados, total: clientes.length };
  }, [clientes]);

  const listosParaEnviar = useMemo(
    () => clientes.filter((c) => c.incluido && c.estado === "listo"),
    [clientes]
  );

  const enviarWhatsapp = async () => {
    setEnviando(true);
    setPaso("confirmar");
    try {
      const data = await pendientesApi.enviar(listosParaEnviar);
      setResultadoEnvio(data);
    } catch (e) {
      setResultadoEnvio({ error: e.message || "Error al enviar." });
    } finally {
      setEnviando(false);
    }
  };

  const empezarDeNuevo = () => {
    setPaso("subir");
    setClientes([]);
    setResultadoEnvio(null);
    setExpandido(null);
    setErrorCarga("");
  };

  return (
    <div className="m-pnd bz-container">
      <div className="bz-module-head">
        <span className="bz-module-head__icon"><Icon.Pendientes size={24} /></span>
        <div>
          <h1 className="bz-module-head__title">Pendientes</h1>
          <p className="bz-module-head__sub">Avisá a los clientes la mercadería pendiente, en 3 pasos</p>
        </div>
      </div>

      <ModuleHelp
        titulo="Pendientes"
        resumen="Subís el Excel de pendientes, revisás a quién le falta teléfono o no se encontró en la base, y mandás el aviso por WhatsApp."
        pasos={[
          "Subí el Excel de pendientes (columnas CLIENTE, FECHA, ART, DESCRIPCION, CANT, VENDEDOR, NUM CTE) — o cargá el ejemplo.",
          "Revisá la lista: el check de la izquierda marca a quién se le va a mandar. Viene prendido para los que ya tienen teléfono («Listo») y apagado para el resto.",
          "Los que dicen «Sin teléfono» o «No encontrado» hay que abrirlos para cargarles un número o elegir una coincidencia antes de poder tildarlos.",
          "Apretá «Enviar» — manda el aviso a todos los que quedaron tildados.",
        ]}
        nota="El mensaje sale con una plantilla ya aprobada por Meta (WhatsApp Business API), no texto libre — por eso el preview muestra exactamente lo que va a recibir el cliente."
      />

      <Stepper pasoActual={paso} />

      {paso === "subir" && (
        <div
          ref={dropRef}
          className="m-pnd__dropzone"
          onDragOver={(e) => { e.preventDefault(); dropRef.current?.classList.add("is-dragover"); }}
          onDragLeave={() => dropRef.current?.classList.remove("is-dragover")}
          onDrop={onDrop}
        >
          <button
            type="button"
            className="m-pnd__dropzone-label"
            onClick={() => cargarEjemplo()}
            disabled={cargando}
          >
            <Icon.Cargar size={28} />
            <span className="m-pnd__dropzone-title">
              {cargando ? `Leyendo ${nombreSimulado}…` : "Arrastrá el Excel acá, o hacé click para elegirlo"}
            </span>
            <span className="m-pnd__dropzone-sub">.xlsx o .xls</span>
          </button>
          {errorCarga && <p className="m-pnd__resolver-error">{errorCarga}</p>}
        </div>
      )}

      {paso === "revisar" && (
        <>
          <div className="m-pnd__leyenda">
            <span className="bz-chip bz-chip--ok">{conteo.listos} listos</span>
            <span className="bz-chip bz-chip--warn">{conteo.sinTelefono} sin teléfono</span>
            <span className="bz-chip bz-chip--bad">{conteo.noEncontrados} no encontrados</span>
            <span className="m-pnd__leyenda-total mono">{conteo.total} en total</span>
          </div>

          <div className="bz-panel bz-panel--flush m-pnd__table-wrap">
            <table className="bz-table m-pnd__table">
              <thead>
                <tr>
                  <th className="m-pnd__col-check"></th>
                  <th>Cliente</th>
                  <th className="m-pnd__col-cant">Cantidad</th>
                  <th>Estado</th>
                  <th className="m-pnd__col-msg"></th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c, i) => {
                  const info = estadoInfo(c.estado);
                  const abierto = expandido === i;
                  return (
                    <Fragment key={i}>
                      <tr
                        className={"m-pnd__row is-clickable" + (!c.incluido ? " is-excluido" : "")}
                        onClick={() => setExpandido(abierto ? null : i)}
                      >
                        <td className="m-pnd__col-check" onClick={(e) => e.stopPropagation()}>
                          <CheckEnvio cliente={c} onToggle={() => toggleIncluido(i)} />
                        </td>
                        <td>
                          <div className="m-pnd__cliente-nombre">{c.cliente}</div>
                          {c.telefono && <div className="m-pnd__cliente-tel mono">{c.telefono}</div>}
                        </td>
                        <td className="m-pnd__col-cant">{pluralProductos(c.cantidad_productos)}</td>
                        <td>
                          <span className={`bz-chip bz-chip--${info.chip}`}>{info.label}</span>
                        </td>
                        <td className="m-pnd__col-msg" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="m-pnd__msg-btn"
                            onClick={() => setPreviewIdx(i)}
                            title="Ver mensaje"
                          >
                            <Icon.Mensaje size={18} />
                          </button>
                        </td>
                      </tr>
                      {abierto && (
                        <tr className="m-pnd__row-detalle">
                          <td colSpan={5}>
                            <FilaResolucion cliente={c} guardando={guardandoIdx === i} onGuardar={guardarTelefono} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="m-pnd__resumen">
            <p>
              {listosParaEnviar.length > 0
                ? `Se van a enviar ${listosParaEnviar.length} mensajes.`
                : "No hay ningún cliente tildado para enviar."}
            </p>
            <button
              className="bz-btn bz-btn--primary"
              disabled={listosParaEnviar.length === 0}
              onClick={enviarWhatsapp}
            >
              Enviar ({listosParaEnviar.length})
            </button>
          </div>
        </>
      )}

      {paso === "confirmar" && (
        <div className="m-pnd__confirmar">
          {enviando ? (
            <div className="m-pnd__loading">
              <span className="m-pnd__spinner" />
              <p>Enviando mensajes…</p>
            </div>
          ) : resultadoEnvio?.error ? (
            <p className="m-pnd__resolver-error">{resultadoEnvio.error}</p>
          ) : (
            <>
              <div className="m-pnd__resumen-final">
                <h2>{resultadoEnvio?.enviados || 0} de {resultadoEnvio?.total || 0} mensajes aceptados</h2>
                <p className="m-pnd__resumen-final-nota">
                  "Aceptado" es lo único que se confirma al toque — no garantiza que ya le haya llegado al cliente.
                </p>
              </div>
              <div className="bz-panel bz-panel--flush m-pnd__table-wrap">
                <table className="bz-table">
                  <thead>
                    <tr><th>Cliente</th><th>Teléfono</th><th>Resultado</th></tr>
                  </thead>
                  <tbody>
                    {resultadoEnvio?.resultados?.map((r, i) => (
                      <tr key={i}>
                        <td>{r.cliente}</td>
                        <td className="mono">{r.telefono}</td>
                        <td>
                          <span className={`bz-chip bz-chip--${r.estado === "enviado" ? "ok" : "bad"}`}>
                            {r.estado === "enviado" ? "Aceptado" : "Fallido"}
                          </span>
                          {r.motivo && <p className="m-pnd__motivo">{r.motivo}</p>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <button className="bz-btn" onClick={empezarDeNuevo}>Subir otro Excel</button>
        </div>
      )}

      {previewIdx !== null && clientes[previewIdx] && (
        <div className={"m-pnd__overlay" + (previewCerrando ? " is-closing" : "")} onClick={cerrarPreview}>
          <div className="bz-panel m-pnd__preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="m-pnd__modal-head">
              <div>
                <p className="bz-eyebrow">Vista previa del mensaje</p>
                <p className="m-pnd__modal-cliente">{clientes[previewIdx].cliente}</p>
              </div>
              <button className="m-pnd__preview-cerrar" onClick={cerrarPreview} aria-label="Cerrar">
                <Icon.Cerrar size={18} />
              </button>
            </div>
            <div className="m-pnd__whatsapp-bg">
              <div className="m-pnd__whatsapp-bubble">
                {armarMensajePreview(clientes[previewIdx])}
                <span className="m-pnd__whatsapp-hora">
                  {new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Pendientes;
