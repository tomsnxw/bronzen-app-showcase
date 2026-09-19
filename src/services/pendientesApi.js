// The only seam between the Pendientes UI and its data source.
//
// In production Pendientes.jsx would call these same methods and they'd hit
// the unified Flask backend under /pendientes/*:
//
//   revisar         → POST /pendientes/revisar          (pandas: agrupa el Excel por cliente)
//   guardarTelefono → POST /pendientes/guardar-telefono  (openpyxl: escribe en la copia de trabajo)
//   enviar          → POST /pendientes/enviar            (Meta Graph API: plantilla aprobada por WhatsApp)
//
// With DEMO_MODE true everything runs offline against a bundled sample
// Excel's worth of synthetic rows — no real file is ever read — and
// "sending" WhatsApp messages is simulated, including one deliberately
// "fallido" result, to show that state too.

import { BASE_TELEFONOS_INICIAL, FILAS_EJEMPLO } from "../demo/pendientesData.js";
import { procesarFilas, formatArgentinaPhone, telefonoValido } from "../demo/pendientesStore.js";

const LATENCIA_MS = 500;
const demora = (ms = LATENCIA_MS) => new Promise((r) => setTimeout(r, ms));

// In-memory stand-in for bronzen-backend/data/telefonos_armando.xlsx — grows
// as the user resolves clients, exactly like the real working copy.
let baseTelefonos = { ...BASE_TELEFONOS_INICIAL };

// Stands in for uploading a real Excel — same shape as what
// /pendientes/revisar would return for one.
export async function cargarEjemplo() {
  await demora();
  return { resultados: procesarFilas(FILAS_EJEMPLO, baseTelefonos, "Armando") };
}

export async function guardarTelefono(numCte, telefono) {
  await demora(350);
  const normalizado = formatArgentinaPhone(telefono);
  if (!telefonoValido(normalizado)) {
    throw new Error(`El teléfono '${telefono}' no tiene un formato argentino válido.`);
  }
  const codigo = numCte != null ? String(parseInt(numCte, 10)) : null;
  if (codigo && !Number.isNaN(Number(codigo))) {
    baseTelefonos[codigo] = {
      ...(baseTelefonos[codigo] || {}),
      codigo,
      telefono: normalizado,
      telefonoInvalido: false,
    };
  }
  return { telefono: normalizado };
}

// Simulates the Meta Graph API call. Always "accepts" the first client of a
// batch as a demonstrable success case; if the batch includes a client whose
// number ends in a digit that makes the (fake) template check fail, that one
// comes back "fallido" — so both outcomes are visible, like in production.
export async function enviar(clientes) {
  await demora(700);
  const resultados = clientes.map((c, i) => {
    const fallaDemo = i === clientes.length - 1 && clientes.length > 1 && i % 3 === 2;
    if (fallaDemo) {
      return {
        cliente: c.cliente,
        telefono: c.telefono,
        estado: "fallido",
        motivo: "WhatsApp rechazó el mensaje: (#131026) Message undeliverable — número de prueba fuera de la lista permitida de Meta.",
      };
    }
    return { cliente: c.cliente, telefono: c.telefono, estado: "enviado" };
  });
  const enviados = resultados.filter((r) => r.estado === "enviado").length;
  return { enviados, total: resultados.length, resultados };
}
