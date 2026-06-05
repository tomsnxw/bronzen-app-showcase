// Synthetic demo data — no real company information.
//
// PALLETS_GUARDADOS  — the "database" pre-seeded on load; same shape as the
//                      Firestore pallet_items collection.
// PLANILLAS_DEMO     — what the OCR would return per sample sheet file; keyed
//                      by filename (without extension).
// SAMPLE_PLANILLAS   — the two handwritten sample sheets served from /public,
//                      loaded by the "Load sample sheets" shortcut.

export const PALLETS_GUARDADOS = [
  {
    pallet: "114",
    items: [
      { descripcion: "BRZ-7250",   cantidad: "12"  },
      { descripcion: "BRZ-6316-C", cantidad: "5b"  },
      { descripcion: "FA-611",     cantidad: "72"  },
      { descripcion: "TM-60",      cantidad: "10b" },
    ],
  },
  {
    pallet: "203",
    items: [
      { descripcion: "BRZ-7250", cantidad: "5"   },
      { descripcion: "CC-3030",  cantidad: "11b" },
      { descripcion: "WC-503-N", cantidad: ""    },
      { descripcion: "SEG-03",   cantidad: "230" },
    ],
  },
  {
    pallet: "566",
    items: [
      { descripcion: "BRZ-6317-N",  cantidad: "1b" },
      { descripcion: "BRZ-966015N", cantidad: "1b" },
      { descripcion: "TTA-19",      cantidad: "4b" },
      { descripcion: "MD-3810-N",   cantidad: ""   },
    ],
  },
  {
    pallet: "648",
    items: [
      { descripcion: "FA-21",      cantidad: "4b" },
      { descripcion: "CY-5030",    cantidad: "3b" },
      { descripcion: "BRZ-7460-N", cantidad: "9u" },
      { descripcion: "TL-06",      cantidad: ""   },
    ],
  },
];

export const PLANILLAS_DEMO = {
  "planilla-650": {
    pallet: "650",
    items: [
      { descripcion: "BRZ-966020", cantidad: "1b" },
      { descripcion: "WC-310",     cantidad: "1b" },
      { descripcion: "WC-309-N",   cantidad: "1b" },
      { descripcion: "FA-931-B",   cantidad: "1b" },
      { descripcion: "BRZ-7250",   cantidad: "2b" },
    ],
  },
  "planilla-651": {
    pallet: "651",
    items: [
      { descripcion: "R1CY90/SE", cantidad: ""    },
      { descripcion: "LE-100",    cantidad: "16"  },
      { descripcion: "TL-06",     cantidad: "6b"  },
    ],
  },
};

export const SAMPLE_PLANILLAS = [
  { nombre: "planilla-650.svg", url: "/samples/planilla-650.svg" },
  { nombre: "planilla-651.svg", url: "/samples/planilla-651.svg" },
];
