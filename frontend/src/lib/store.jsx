import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { API, getToken, setToken } from "./api";
import { makeEngine } from "./engine";
import { detectLang } from "./i18n";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem("fl_lang") || detectLang());
  const [user, setUser] = useState(null);
  const [boot, setBoot] = useState(null);
  const [engine, setEngine] = useState(null);
  const [predictions, setPredictions] = useState({});
  const [mode, setMode] = useState("pick");
  const [modal, setModal] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const toastTimer = useRef(null);

  const toast = useCallback((m) => {
    setToastMsg(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 2800);
  }, []);

  const setLang = useCallback((lg) => {
    setLangState(lg);
    localStorage.setItem("fl_lang", lg);
  }, []);

  const predToMap = (list) => {
    const m = {};
    (list || []).forEach((p) => {
      m[p.round] = m[p.round] || {};
      m[p.round][p.index] = { pick: p.pick, goal_a: p.goal_a, goal_b: p.goal_b, pen: p.pen };
    });
    return m;
  };

  const loadBoot = useCallback(async (n = 1500) => {
    const data = await API.bootstrap(n);
    setBoot(data);
    setEngine(makeEngine(data));
    if (data.my_predictions) setPredictions(predToMap(data.my_predictions));
    return data;
  }, []);

  useEffect(() => {
    (async () => {
      if (getToken()) {
        try { setUser(await API.me()); } catch (_) { setToken(""); }
      }
      try { await loadBoot(); } catch (e) { console.error(e); }
    })();
  }, [loadBoot]);

  const afterAuth = useCallback(async (payload) => {
    setToken(payload.token);
    setUser(payload.user);
    setModal(null);
    await loadBoot();
  }, [loadBoot]);

  const logout = useCallback(async () => {
    try { await API.logout(); } catch (_) {}
    setToken(""); setUser(null); setPredictions({}); setMode("pick");
    await loadBoot();
  }, [loadBoot]);

  const isAdmin = !!(user && user.is_admin);

  const persistPick = useCallback(async (r, i, patch, notify) => {
    setPredictions((prev) => {
      const next = { ...prev, [r]: { ...(prev[r] || {}), [i]: { ...(prev[r]?.[i] || {}), ...patch } } };
      return next;
    });
    try {
      const cur = predictions[r]?.[i] || {};
      await API.savePrediction({ round: r, index: i, ...cur, ...patch, notify: !!notify });
    } catch (e) { toast(e.message); }
  }, [predictions, toast]);

  const mc = {
    pick: (r, i, team, m) => {
      if (mode === "result") {
        if (!isAdmin) { toast("Solo el administrador registra resultados"); return; }
        const cur = engine.lock(r, i);
        const p = cur === team
          ? API.adminResultDelete({ round: r, index: i })
          : API.adminResult({ round: r, index: i, winner: team });
        p.then(() => loadBoot()).catch((e) => toast(e.message));
        return;
      }
      if (!user) { setModal({ type: "register" }); return; }
      if (engine && (engine.lock(r, i) || engine.played(r, i))) { toast("Ese partido ya se jugó · bloqueado"); return; }
      if (boot && !boot.state.rounds_enabled[String(r)]) { toast("Las apuestas de esta etapa están cerradas"); return; }
      persistPick(r, i, { pick: team });
    },
    goal: (r, i, side, val, m) => {
      if (!user) { setModal({ type: "register" }); return; }
      if (engine && (engine.lock(r, i) || engine.played(r, i))) { toast("Ese partido ya se jugó · bloqueado"); return; }
      const g = { ...(predictions[r]?.[i] || {}) };
      g["goal_" + side] = val === "" ? null : Math.max(0, parseInt(val, 10) || 0);
      const a = g.goal_a, b = g.goal_b, both = a != null && a !== "" && b != null && b !== "";
      if (both) {
        if (+a > +b) { g.pick = m.a; g.pen = ""; }
        else if (+b > +a) { g.pick = m.b; g.pen = ""; }
        else { g.pick = g.pen || ""; }
      }
      persistPick(r, i, g);
    },
    pen: (r, i, team) => {
      persistPick(r, i, { pen: team, pick: team });
    },
    reset: (r, i) => {
      if (engine && (engine.lock(r, i) || engine.played(r, i))) { toast("Ese partido ya se jugó · bloqueado"); return; }
      setPredictions((prev) => {
        const n = { ...prev };
        if (n[r]) { const rr = { ...n[r] }; delete rr[i]; n[r] = rr; }
        return n;
      });
      API.savePrediction({ round: r, index: i, pick: "", goal_a: null, goal_b: null, pen: "" })
        .catch((e) => toast(e.message));
    },
    adminScore: (r, i, m, a, b) => {
      if (a === "" || b === "") return;
      const winner = +a >= +b ? m.a : m.b;
      API.adminResult({ round: r, index: i, winner, score: `${a}-${b}` })
        .then(() => loadBoot()).catch((e) => toast(e.message));
    },
  };

  const value = {
    lang, setLang, user, setUser, boot, engine, predictions, setPredictions,
    mode, setMode, modal, setModal, toast, toastMsg,
    loadBoot, afterAuth, logout, mc,
    isAdmin,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
