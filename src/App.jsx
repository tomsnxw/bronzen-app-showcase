import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import "./App.scss";
import { Icon } from "./icons";
import Pallet from "./modules/Pallet";

/* Catálogo completo de la suite. En la app interna real los seis módulos
   están habilitados; este showcase deja navegable SÓLO el Lector de Pallets
   (el resto se muestra atenuado para lucir el sistema de diseño). */
const MODULOS = [
  {
    path: "/faltantes",
    nombre: "Faltantes",
    Icono: Icon.Faltantes,
    descripcion: "Avisá a clientes la mercadería pendiente que llegó (fotos o Excel).",
    disabled: true,
  },
  {
    path: "/stock",
    nombre: "Stock",
    Icono: Icon.Stock,
    descripcion: "Buscá stock en Rojas y Ezeiza con semáforo de color.",
    disabled: true,
  },
  {
    path: "/interdeposito",
    nombre: "Interdepósito",
    Icono: Icon.Interdeposito,
    descripcion: "Armá movimientos de mercadería entre depósitos.",
    disabled: true,
  },
  {
    path: "/pallet",
    nombre: "Pallets",
    Icono: Icon.Pallets,
    descripcion: "Leé planillas de pallets y buscá un código.",
    Componente: Pallet,
  },
  {
    path: "/remitos",
    nombre: "Remitos",
    Icono: Icon.Remitos,
    descripcion: "Leé los remitos del día y calculá el recorrido de reparto.",
    disabled: true,
  },
];

function NavBar() {
  return (
    <header className="bz-nav">
      <Link to="/" className="bz-nav__brand">
        <Icon.Marca size={24} className="bz-nav__brand-icon" />
      </Link>
      <nav className="bz-nav__links">
        {MODULOS.map((m) =>
          m.disabled ? (
            <span
              key={m.path}
              className="bz-nav__link is-disabled"
              title="Disponible en la app interna"
              aria-disabled="true"
            >
              <span className="bz-nav__link-icon">
                <m.Icono size={18} />
              </span>
              <span className="bz-nav__link-text">{m.nombre}</span>
            </span>
          ) : (
            <NavLink
              key={m.path}
              to={m.path}
              className={({ isActive }) =>
                "bz-nav__link" + (isActive ? " is-active" : "")
              }
            >
              <span className="bz-nav__link-icon">
                <m.Icono size={18} />
              </span>
              <span className="bz-nav__link-text">{m.nombre}</span>
            </NavLink>
          )
        )}
      </nav>
    </header>
  );
}

function Home() {
  const navigate = useNavigate();
  return (
    <div className="bz-home bz-container">
      <p className="bz-eyebrow bz-home__eyebrow">Rojas + Ezeiza · 5 tools</p>
      <h1 className="bz-home__title">Herramientas Bronzen</h1>
      <p className="bz-home__subtitle">Elegí una herramienta para empezar.</p>
      <div className="bz-home__grid">
        {MODULOS.map((m) => (
          <button
            key={m.path}
            className={"bz-card" + (m.disabled ? " is-disabled" : "")}
            onClick={() => !m.disabled && navigate(m.path)}
            disabled={m.disabled}
          >
            <span className="bz-card__icon">
              <m.Icono size={26} />
            </span>
            <span className="bz-card__name">{m.nombre}</span>
            <span className="bz-card__desc">{m.descripcion}</span>
            <span className="bz-card__go">
              {m.disabled ? (
                "Solo en la app interna"
              ) : (
                <>
                  Abrir <Icon.Flecha size={15} />
                </>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <NavBar />
      <main className="bz-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pallet" element={<Pallet />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
