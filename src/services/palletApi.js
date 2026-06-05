// The only seam between the Pallet UI and its data source.
//
// In production Pallet.jsx would call these same methods and they'd hit the
// unified Flask backend under /pallet/*:
//
//   analyze       → POST /pallet/analyze        (Gemini Vision OCR)
//   guardar       → POST /pallet/guardar        (Firestore: pallet_items)
//   buscar        → GET  /pallet/buscar?codigo  (exact normalised match)
//   sugerencias   → GET  /pallet/sugerencias?q  (prefix autocomplete)
//   exportarExcel → POST /pallet/export-excel   (pandas/openpyxl → .xlsx)
//
// With DEMO_MODE true everything runs offline against local fixtures.
// Simulated latency keeps the real loading states visible in the showcase.

import * as XLSX from "xlsx";
import { PALLETS_GUARDADOS, PLANILLAS_DEMO } from "../demo/demoData.js";
import {
  aplanarPallets,
  buscarPorCodigo,
  sugerenciasPorPrefijo,
} from "../demo/palletStore.js";

const LATENCIA_MS = 600;
const demora = (ms = LATENCIA_MS) => new Promise((r) => setTimeout(r, ms));

// In-memory index that stands in for Firestore. Pre-seeded with demo pallets;
// grows each time the user saves an analysis, just like the real collection.
let indice = aplanarPallets(PALLETS_GUARDADOS);

// Analyses one or more pallet-sheet photos and returns detected pallets.
// In demo there's no real OCR: each file is matched by name to a fixture.
// Unknown files fall back to all fixtures so the flow is always demonstrable.
export async function analyze(files) {
  await demora();

  const reconocidas = [];
  for (const f of files ?? []) {
    const clave = String(f.name || "").replace(/\.[^.]+$/, "");
    const fixture = PLANILLAS_DEMO[clave];
    if (fixture) reconocidas.push({ ...fixture, imagen: f.name });
  }

  const base = reconocidas.length > 0 ? reconocidas : Object.values(PLANILLAS_DEMO);
  const pallets = base.map((p) => ({ ...p, items: p.items.map((it) => ({ ...it })) }));
  return { pallets, errores: [] };
}

// Saves analysed pallets into the index and returns how many items were added.
export async function guardar(pallets) {
  await demora(450);
  indice = indice.concat(aplanarPallets(pallets));
  return { guardados: aplanarPallets(pallets).length };
}

// Returns which pallet(s) contain a given code (exact normalised match).
export async function buscar(codigo) {
  await demora(400);
  return { resultados: buscarPorCodigo(indice, codigo) };
}

// Prefix autocomplete — intentionally no artificial latency.
export async function sugerencias(q) {
  return { sugerencias: sugerenciasPorPrefijo(indice, q) };
}

// Generates the .xlsx in the browser and triggers a download.
// In production this is built server-side by pandas/openpyxl and sent as a blob.
export async function exportarExcel(pallets) {
  const filas = [];
  for (const p of pallets ?? []) {
    for (const it of p.items ?? []) {
      filas.push({ PALLET: p.pallet, DESCRIPCION: it.descripcion, CANTIDAD: it.cantidad ?? "" });
    }
  }
  if (filas.length === 0) throw new Error("No hay items para exportar.");

  const ws = XLSX.utils.json_to_sheet(filas, { header: ["PALLET", "DESCRIPCION", "CANTIDAD"] });
  ws["!cols"] = ["PALLET", "DESCRIPCION", "CANTIDAD"].map((c) => ({
    wch: Math.max(c.length, ...filas.map((f) => String(f[c] ?? "").length)) + 2,
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Pallets");
  XLSX.writeFile(wb, nombreExcel(pallets));
}

function nombreExcel(pallets) {
  const nums = [...new Set((pallets ?? []).map((p) => String(p.pallet ?? "").trim()).filter(Boolean))];
  if (nums.length === 0) return "pallets.xlsx";
  if (nums.length === 1) return `pallet_${nums[0]}.xlsx`;
  const nombre = `pallets_${nums.join("_")}.xlsx`;
  return nombre.length > 100 ? `pallets_${nums[0]}_a_${nums.at(-1)}_y_mas.xlsx` : nombre;
}
