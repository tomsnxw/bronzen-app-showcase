// Pure-JS port of pallet_db.py (Firestore backend).
//
// In production these rules live in Python and query two Firestore collections:
//   pallet_items   — one doc per (code + pallet)
//   pallet_codigos — unique-code index for autocomplete
//
// Here the "index" is a plain in-memory array. The rules themselves — how a
// code is normalised, how exact search works, how prefix autocomplete works —
// are identical, isolated as pure functions so they can be tested without a
// network and serve as the single source of truth.

/** Normalises a code for lookup: uppercase, no whitespace.
 *  'brz-7250', 'BRZ-7250' and ' BRZ-7250 ' all match. */
export function normalizarCodigo(codigo) {
  return String(codigo ?? "").replace(/\s+/g, "").toUpperCase();
}

/** Flattens a pallet list into indexable rows { codigo, codigoNorm, pallet, cantidad },
 *  one per item — equivalent to the pallet_items Firestore docs. */
export function aplanarPallets(pallets) {
  const filas = [];
  for (const p of pallets ?? []) {
    const pallet = String(p.pallet ?? "").trim();
    if (!pallet) continue;
    for (const it of p.items ?? []) {
      const codigo = String(it.descripcion ?? it.codigo ?? "").trim();
      if (!codigo) continue;
      filas.push({ codigo, codigoNorm: normalizarCodigo(codigo), pallet, cantidad: String(it.cantidad ?? "") });
    }
  }
  return filas;
}

/** Returns all pallets containing a code (exact normalised match), sorted numerically. */
export function buscarPorCodigo(filas, codigo) {
  const codigoNorm = normalizarCodigo(codigo);
  if (!codigoNorm) return [];

  const porPallet = new Map();
  for (const fila of filas) {
    if (fila.codigoNorm !== codigoNorm) continue;
    if (!porPallet.has(fila.pallet)) {
      porPallet.set(fila.pallet, { pallet: fila.pallet, codigo: fila.codigo, cantidad: fila.cantidad });
    }
  }
  return [...porPallet.values()].sort(ordenPallet);
}

/** Unique codes starting with a given prefix, for autocomplete. */
export function sugerenciasPorPrefijo(filas, prefijo, limite = 8) {
  const pref = normalizarCodigo(prefijo);
  if (!pref) return [];

  const vistos = new Set();
  const salida = [];
  for (const fila of filas) {
    if (!fila.codigoNorm.startsWith(pref) || vistos.has(fila.codigoNorm)) continue;
    vistos.add(fila.codigoNorm);
    salida.push({ codigo: fila.codigo, codigoNorm: fila.codigoNorm });
  }
  return salida.sort((a, b) => a.codigoNorm.localeCompare(b.codigoNorm)).slice(0, limite);
}

function ordenPallet(a, b) {
  const na = /^\d+$/.test(a.pallet);
  const nb = /^\d+$/.test(b.pallet);
  if (na && nb) return Number(a.pallet) - Number(b.pallet);
  return na ? -1 : nb ? 1 : a.pallet.localeCompare(b.pallet);
}
