// Pure-JS port of the production logic, so the same rules run offline here:
//   - telefonos.py       → formatArgentinaPhone, normalizarNombre, similarity/buscarCoincidencias
//   - mod_pendientes.py  → formatearCantidad, formatearListaArticulos, procesarFilas
//
// `similarity` approximates Python's difflib.SequenceMatcher.ratio() with an
// LCS-length ratio (2*LCS / (lenA+lenB)) — same idea, not byte-identical, but
// close enough that the demo's "possible matches" behave the same way.

const MAX_ITEMS_LISTA = 15;

export function formatArgentinaPhone(value) {
  if (value === null || value === undefined || value === "") return "";
  let digits = String(value).trim().replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("0054")) digits = digits.slice(4);
  else if (digits.startsWith("54")) digits = digits.slice(2);
  digits = digits.replace(/^0+/, "");

  if (digits.startsWith("9") && digits.length >= 10 && digits.length <= 11) {
    return "54" + digits;
  }

  const conCaracteristica = digits.match(/^(\d{2,4})15(\d{6,8})$/);
  if (conCaracteristica) {
    return "549" + conCaracteristica[1] + conCaracteristica[2];
  }

  if (digits.length === 10) return "549" + digits;
  return "54" + digits;
}

export function telefonoValido(telefono) {
  return /^549\d{10}$/.test(telefono || "");
}

export function normalizarNombre(nombre) {
  const s = String(nombre || "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s;
}

function lcsLength(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    let prevDiag = 0;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prevDiag + 1 : Math.max(dp[j], dp[j - 1]);
      prevDiag = temp;
    }
  }
  return dp[n];
}

export function similarity(a, b) {
  if (!a || !b) return 0;
  const total = a.length + b.length;
  if (total === 0) return 1;
  return (2 * lcsLength(a, b)) / total;
}

export function buscarTelefono(codigoCliente, baseTelefonos) {
  const codigo = normalizarCodigo(codigoCliente);
  if (codigo === null) {
    return { telefono: "", telefonoInvalido: false, existeEnBase: false };
  }
  const entrada = baseTelefonos[codigo];
  if (!entrada) return { telefono: "", telefonoInvalido: false, existeEnBase: false };
  return {
    telefono: entrada.telefono,
    telefonoInvalido: entrada.telefonoInvalido,
    existeEnBase: true,
  };
}

export function buscarCoincidencias(nombreCliente, baseTelefonos, topN = 3, corte = 0.6) {
  const objetivo = normalizarNombre(nombreCliente);
  if (!objetivo) return [];

  const candidatos = [];
  for (const entrada of Object.values(baseTelefonos)) {
    if (!entrada.nombreNorm) continue;
    const score = similarity(objetivo, entrada.nombreNorm);
    if (score >= corte) candidatos.push({ score, entrada });
  }
  candidatos.sort((a, b) => b.score - a.score);
  return candidatos.slice(0, topN).map(({ score, entrada }) => ({
    codigo: entrada.codigo,
    nombre: entrada.nombre,
    telefono: entrada.telefono,
    score: Math.round(score * 100) / 100,
  }));
}

function normalizarCodigo(codigoCliente) {
  if (codigoCliente === null || codigoCliente === undefined || codigoCliente === "") return null;
  const n = parseInt(codigoCliente, 10);
  return Number.isNaN(n) ? null : String(n);
}

export function formatearCantidad(cant) {
  const n = Number(cant) || 0;
  return Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(2)));
}

// Sin salto de línea entre ítems — Meta rechaza el envío entero (error
// #132018) si el VALOR de una variable de plantilla trae '\n', aunque el
// texto fijo de la plantilla sí los tenga. Bug real, medido en producción
// el 2026-09-07.
export function formatearListaArticulos(articulos, maxItems = MAX_ITEMS_LISTA) {
  const lineas = articulos
    .slice(0, maxItems)
    .map((it) => `• ${String(it.descripcion || "").trim()} (${formatearCantidad(it.cantidad)}u)`);
  let texto = lineas.join(" ");
  const restantes = articulos.length - maxItems;
  if (restantes > 0) {
    texto += ` y ${restantes} producto${restantes !== 1 ? "s" : ""} más.`;
  }
  return texto;
}

export function obtenerSaludoPorHora(fecha = new Date()) {
  const hora = fecha.getHours();
  if (hora >= 6 && hora < 12) return "Buenos días";
  if (hora >= 12 && hora < 20) return "Buenas tardes";
  return "Hola";
}

// Agrupa filas crudas (mismas columnas que el Excel real: CLIENTE, FECHA,
// ART, DESCRIPCION, CANT, VENDEDOR, NUM CTE opcional) por cliente — mismo
// resultado que groupby('CLIENTE') en mod_pendientes.procesar_excel, y
// clasifica cada uno según si tiene o no teléfono en la base.
export function procesarFilas(filas, baseTelefonos, vendedorFallback = "Armando") {
  const porCliente = new Map();
  for (const fila of filas) {
    const cliente = String(fila.CLIENTE || "").trim();
    if (!cliente) continue;
    if (!porCliente.has(cliente)) porCliente.set(cliente, []);
    porCliente.get(cliente).push(fila);
  }

  const resultados = [];
  for (const [cliente, filasCliente] of porCliente) {
    const porArticulo = new Map();
    for (const f of filasCliente) {
      const clave = `${f.ART}||${f.DESCRIPCION}`;
      const acc = porArticulo.get(clave) || {
        ART: f.ART,
        DESCRIPCION: f.DESCRIPCION,
        CANT: 0,
        FECHA: f.FECHA,
        VENDEDOR: f.VENDEDOR,
      };
      acc.CANT += Number(f.CANT) || 0;
      porArticulo.set(clave, acc);
    }
    const articulos = [...porArticulo.values()];

    const vendedorRaw = String(articulos[0]?.VENDEDOR ?? "").trim();
    const nombreVendedor =
      !vendedorRaw || vendedorRaw === "0" || vendedorRaw.toLowerCase() === "nan"
        ? vendedorFallback
        : vendedorRaw.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase());

    const numCteRaw = filasCliente[0]?.["NUM CTE"];
    const numCte = numCteRaw !== undefined && numCteRaw !== null && numCteRaw !== "" ? normalizarCodigo(numCteRaw) : null;
    const infoTelefono = buscarTelefono(numCte, baseTelefonos);

    let estado;
    if (infoTelefono.telefono) estado = "listo";
    else if (infoTelefono.existeEnBase) estado = "sin_telefono";
    else estado = "no_encontrado";

    const posiblesCoincidencias = estado === "no_encontrado" ? buscarCoincidencias(cliente, baseTelefonos) : [];

    const tablaArticulos = articulos.map((a) => ({
      FECHA: a.FECHA,
      ART: a.ART,
      DESCRIPCION: a.DESCRIPCION,
      CANT: a.CANT,
    }));

    resultados.push({
      cliente,
      vendedor: nombreVendedor,
      fecha_pedido: articulos[0]?.FECHA || "",
      articulos: tablaArticulos,
      lista_articulos: formatearListaArticulos(
        tablaArticulos.map((a) => ({ descripcion: a.DESCRIPCION, cantidad: a.CANT }))
      ),
      cantidad_productos: tablaArticulos.length,
      num_cte: numCte,
      telefono: infoTelefono.telefono,
      telefono_invalido: infoTelefono.telefonoInvalido,
      estado,
      posibles_coincidencias: posiblesCoincidencias,
    });
  }

  return resultados;
}
