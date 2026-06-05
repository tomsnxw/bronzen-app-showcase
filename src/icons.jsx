// Central icon map (Tabler). Modules import by semantic role, not Tabler name.
// Usage: <Icon.Pallets size={24} />  — stroke 1.5 throughout.

import {
  IconHighlight,
  IconArrowsExchange,
  IconPackages,
  IconStack2,
  IconRoute,
  IconUpload,
  IconSearch,
  IconSearchOff,
  IconCamera,
  IconPhoto,
  IconBulb,
  IconX,
  IconAlertCircle,
  IconAlertTriangle,
  IconCheck,
  IconArrowRight,
  IconInfoCircle,
  IconBuildingWarehouse,
} from "@tabler/icons-react";

const defaults = { stroke: 1.5 };
const make = (Cmp) => (props) => <Cmp {...defaults} {...props} />;

export const Icon = {
  Marca:        make(IconBuildingWarehouse),

  // módulos
  Faltantes:    make(IconHighlight),
  Interdeposito:make(IconArrowsExchange),
  Stock:        make(IconPackages),
  Pallets:      make(IconStack2),
  Remitos:      make(IconRoute),

  // acciones
  Cargar:       make(IconUpload),
  Buscar:       make(IconSearch),
  SinResultado: make(IconSearchOff),
  Foto:         make(IconCamera),
  Galeria:      make(IconPhoto),
  Cerrar:       make(IconX),
  Guardado:     make(IconCheck),
  Flecha:       make(IconArrowRight),

  // estados / ayuda
  Tip:          make(IconBulb),
  Ayuda:        make(IconInfoCircle),
  Error:        make(IconAlertCircle),
  ErrorProc:    make(IconAlertTriangle),
};

export default Icon;
