// Synthetic demo data for the Pendientes module — no real clients, phones or
// order data. Same shapes as the production sources:
//   BASE_TELEFONOS → bronzen-backend/data/telefonos_armando.xlsx (Armando's
//                    working copy of client phones, keyed by client code).
//   FILAS_EJEMPLO  → a "Pendientes" Excel export (CLIENTE/FECHA/ART/
//                    DESCRIPCION/CANT/VENDEDOR/NUM CTE), loadable with the
//                    "Cargar ejemplo" shortcut so the flow is demoable
//                    without a file of your own. Uploading a real .xlsx with
//                    the same columns works too — parsed client-side.

function construirBase(filas) {
  const porCodigo = {};
  for (const f of filas) {
    porCodigo[f.codigo] = {
      codigo: f.codigo,
      nombre: f.nombre,
      nombreNorm: f.nombre
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
      telefono: f.telefono || "",
      telefonoInvalido: !!f.telefono && !/^549\d{10}$/.test(f.telefono),
    };
  }
  return porCodigo;
}

export const BASE_TELEFONOS_INICIAL = construirBase([
  { codigo: "101", nombre: "FERRETERIA DEL NORTE", telefono: "5491122334455" },
  { codigo: "102", nombre: "CERRAJERIA MARQUEZ", telefono: "5491133445566" },
  { codigo: "103", nombre: "HOGAR Y CO SRL", telefono: "" }, // sin teléfono válido → "sin_telefono"
  { codigo: "104", nombre: "DISTRIBUIDORA SUR", telefono: "5491155667788" },
  // 105 no existe en la base → cualquier fila con ese NUM CTE da "no_encontrado"
]);

export const FILAS_EJEMPLO = [
  { CLIENTE: "Ferreteria del Norte", FECHA: "2026-09-02", ART: "BRZ-7250", DESCRIPCION: "Bisagra reforzada 3\"", CANT: 24, VENDEDOR: "Armando", "NUM CTE": 101 },
  { CLIENTE: "Ferreteria del Norte", FECHA: "2026-09-02", ART: "FA-611", DESCRIPCION: "Cerradura embutir", CANT: 6, VENDEDOR: "Armando", "NUM CTE": 101 },
  { CLIENTE: "Cerrajeria Marquez", FECHA: "2026-09-03", ART: "CC-3030", DESCRIPCION: "Combinación candado 40mm", CANT: 40, VENDEDOR: "Armando", "NUM CTE": 102 },
  { CLIENTE: "Hogar y CO SRL", FECHA: "2026-09-03", ART: "WC-503-N", DESCRIPCION: "Tacho basura inteligente", CANT: 3, VENDEDOR: "Armando", "NUM CTE": 103 },
  { CLIENTE: "Hogar y CO SRL", FECHA: "2026-09-04", ART: "SEG-03", DESCRIPCION: "Caja fuerte biométrica", CANT: 1, VENDEDOR: "Armando", "NUM CTE": 103 },
  { CLIENTE: "Distribuidora Sur", FECHA: "2026-09-04", ART: "TM-60", DESCRIPCION: "Manija puerta aluminio", CANT: 18, VENDEDOR: "Armando", "NUM CTE": 104 },
  // "Ferretera del Norte" (con typo) simula un cliente NUEVO / sin código
  // cargado, para probar el matching por nombre parecido contra el 101.
  { CLIENTE: "Ferretera del Norte", FECHA: "2026-09-05", ART: "MD-3810-N", DESCRIPCION: "Espejo baño con luz LED", CANT: 2, VENDEDOR: "Armando", "NUM CTE": 999 },
  { CLIENTE: "Comercial Rojas", FECHA: "2026-09-05", ART: "TTA-19", DESCRIPCION: "Tirador aluminio 15cm", CANT: 30, VENDEDOR: 0, "NUM CTE": 105 },
];
