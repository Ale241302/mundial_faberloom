import { useEffect } from "react";
import { useParams, useNavigate, Routes, Route } from "react-router-dom";
import { useApp } from "./lib/store.jsx";
import { API } from "./lib/api.js";
import Simulator from "./components/Simulator.jsx";
import Landing from "./components/Landing.jsx";
import Modals from "./components/Modals.jsx";
import Toast from "./components/Toast.jsx";

// El simulador vive en wc.faberloom.ai (o mundial.* por compatibilidad).
// faberloom.ai (raíz) muestra la landing. En localhost, raíz = landing.
const HOST = typeof window !== "undefined" ? window.location.hostname : "";
const IS_SIM = /^wc\./.test(HOST) || /(^|\.)mundial\./.test(HOST);

function SimHome() {
  return <><Simulator /><CompleteFromLocal /></>;
}

// /reset/:token → modal de nueva contraseña (sobre el simulador)
function ResetCatcher() {
  const { token } = useParams();
  const { setModal } = useApp();
  const nav = useNavigate();
  useEffect(() => {
    if (token) setModal({ type: "reset", data: { token } });
    nav("/", { replace: true });
  }, [token]); // eslint-disable-line
  return null;
}

// /activar/:token (botón del correo) → modal de completar registro
function ActivateCatcher() {
  const { token } = useParams();
  const { setModal } = useApp();
  const nav = useNavigate();
  useEffect(() => {
    if (token) {
      API.activationValidate(token)
        .then((d) => { if (d.valid) setModal({ type: "complete", data: { token, email: d.email } }); })
        .catch(() => {});
    }
    nav("/", { replace: true });
  }, [token]); // eslint-disable-line
  return null;
}

// Si dejó su correo en la landing (fl_pending) y entra al simulador, completar.
function CompleteFromLocal() {
  const { user, setModal } = useApp();
  useEffect(() => {
    if (user) return;
    let p = null;
    try { p = JSON.parse(localStorage.getItem("fl_pending") || "null"); } catch (_) {}
    if (!p || !p.token) return;
    API.activationValidate(p.token)
      .then((d) => {
        if (d.valid && d.pending) setModal({ type: "complete", data: { token: p.token, email: d.email } });
        else localStorage.removeItem("fl_pending");
      })
      .catch(() => {});
  }, [user]); // eslint-disable-line
  return null;
}

export default function App() {
  const Home = IS_SIM ? <SimHome /> : <Landing />;
  return (
    <>
      <Routes>
        <Route path="/" element={Home} />
        <Route path="/simulador" element={<SimHome />} />
        <Route path="/activar/:token" element={<><Simulator /><ActivateCatcher /></>} />
        <Route path="/reset/:token" element={<><Simulator /><ResetCatcher /></>} />
        <Route path="*" element={Home} />
      </Routes>
      <Modals />
      <Toast />
    </>
  );
}
