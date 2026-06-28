import { useEffect } from "react";
import { useParams, useNavigate, Routes, Route } from "react-router-dom";
import { useApp } from "./lib/store.jsx";
import Simulator from "./components/Simulator.jsx";
import Modals from "./components/Modals.jsx";
import Toast from "./components/Toast.jsx";

// Cuando se entra por /reset/:token, abrimos el modal de nueva contraseña.
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

export default function App() {
  return (
    <>
      <Simulator />
      <Routes>
        <Route path="/reset/:token" element={<ResetCatcher />} />
        <Route path="*" element={null} />
      </Routes>
      <Modals />
      <Toast />
    </>
  );
}
