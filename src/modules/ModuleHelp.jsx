import { Icon } from "../icons";
import "./ModuleHelp.scss";

/**
 * Panel desplegable con un mini-manual de uso del módulo.
 * Por defecto viene cerrado; se abre al tocar el encabezado.
 *
 * props:
 *  - titulo: nombre del módulo (ej. "el Lector de Pallets")
 *  - resumen: 1-2 frases de qué hace
 *  - pasos: array de strings (los pasos de uso)
 *  - nota: string opcional con un tip al pie
 */
function ModuleHelp({ titulo, resumen, pasos = [], nota, defaultOpen = false }) {
  return (
    <details className="bz-help" open={defaultOpen}>
      <summary className="bz-help__summary">
        <span className="bz-help__icon"><Icon.Ayuda size={18} /></span>
        ¿Cómo se usa {titulo}?
      </summary>
      <div className="bz-help__body">
        <p className="bz-help__resumen">{resumen}</p>
        {pasos.length > 0 && (
          <ol className="bz-help__pasos">
            {pasos.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
        )}
        {nota && (
          <p className="bz-help__nota">
            <Icon.Tip size={16} /> {nota}
          </p>
        )}
      </div>
    </details>
  );
}

export default ModuleHelp;
