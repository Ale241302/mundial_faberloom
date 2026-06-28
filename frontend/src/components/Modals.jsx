import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { Modal, Eye, Flag } from "./ui.jsx";
import { L, LX, ROUND_LABELS } from "../lib/i18n.js";
import { API } from "../lib/api.js";
import { useApp } from "../lib/store.jsx";
import TeamDossier from "./TeamDossier.jsx";

export default function Modals() {
  const { modal, setModal } = useApp();
  const close = () => setModal(null);
  const t = modal?.type;
  return (
    <AnimatePresence>
      {t === "login" && <LoginModal key="login" onClose={close} />}
      {t === "register" && <RegisterModal key="reg" onClose={close} />}
      {t === "recover" && <RecoverModal key="rec" onClose={close} />}
      {t === "reset" && <ResetModal key="reset" token={modal.data.token} onClose={close} />}
      {t === "profile" && <ProfileModal key="prof" onClose={close} />}
      {t === "admin" && <AdminModal key="adm" onClose={close} />}
      {t === "team" && <TeamDossier key="team" name={modal.data.name} onClose={close} />}
    </AnimatePresence>
  );
}

function PwInput({ id, value, onChange, ph }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pwrap">
      <input id={id} className="fl-in" type={show ? "text" : "password"}
        value={value} onChange={onChange} placeholder={ph} autoComplete="new-password" />
      <button type="button" className="eyebtn" onClick={() => setShow((s) => !s)} aria-label="ver"><Eye /></button>
    </div>
  );
}

function LoginModal({ onClose }) {
  const { afterAuth, setModal, toast } = useApp();
  const [email, setEmail] = useState(""); const [pass, setPass] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async () => {
    setErr(""); setBusy(true);
    try { const p = await API.login({ email, password: pass }); await afterAuth(p); toast("Hola, " + (p.user.name || p.user.email)); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal onClose={onClose}>
      <div className="flhd"><b>Iniciar sesión</b><span className="x" onClick={onClose}>✕</span></div>
      <label className="fl-l">Correo</label>
      <input className="fl-in" type="text" value={email} autoComplete="username"
        onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
      <label className="fl-l">Contraseña</label>
      <PwInput id="lgP" value={pass} onChange={(e) => setPass(e.target.value)} />
      <div className="fl-err">{err}</div>
      <button className="coral" style={{ width: "100%", marginTop: 10 }} disabled={busy} onClick={submit}>Entrar</button>
      <div className="fl-alt"><a onClick={() => setModal({ type: "recover" })}>¿Olvidaste tu contraseña?</a></div>
      <div className="fl-alt">¿No tienes cuenta? <a onClick={() => setModal({ type: "register" })}>Regístrate</a></div>
    </Modal>
  );
}

function RegisterModal({ onClose }) {
  const { lang, afterAuth, setModal, toast } = useApp();
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  const [p1, setP1] = useState(""); const [p2, setP2] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async () => {
    setErr("");
    if (!name.trim()) return setErr("Escribe tu nombre");
    if (p1.length < 6) return setErr("La contraseña debe tener al menos 6 caracteres");
    if (p1 !== p2) return setErr("Las contraseñas no coinciden");
    setBusy(true);
    try { const p = await API.register({ name, email, password: p1, lang }); await afterAuth(p); toast("Cuenta creada. Bienvenido, " + name); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal onClose={onClose}>
      <div className="flhd"><b>Crear cuenta</b><span className="x" onClick={onClose}>✕</span></div>
      <label className="fl-l">Nombre</label>
      <input className="fl-in" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      <label className="fl-l">Correo</label>
      <input className="fl-in" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      <label className="fl-l">Contraseña</label>
      <PwInput value={p1} onChange={(e) => setP1(e.target.value)} />
      <label className="fl-l">Repetir contraseña</label>
      <PwInput value={p2} onChange={(e) => setP2(e.target.value)} />
      <div className="fl-err">{err}</div>
      <button className="coral" style={{ width: "100%", marginTop: 10 }} disabled={busy} onClick={submit}>Registrarme</button>
      <div className="fl-alt">¿Ya tienes cuenta? <a onClick={() => setModal({ type: "login" })}>Inicia sesión</a></div>
    </Modal>
  );
}

function RecoverModal({ onClose }) {
  const { setModal } = useApp();
  const [email, setEmail] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try { const r = await API.resetRequest(email); setMsg(r.detail || "Revisa tu correo."); }
    catch (e) { setMsg(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal onClose={onClose}>
      <div className="flhd"><b>Recuperar contraseña</b><span className="x" onClick={onClose}>✕</span></div>
      <div className="note" style={{ marginBottom: 10 }}>Escribe tu correo y te enviaremos un enlace para crear una nueva contraseña.</div>
      <label className="fl-l">Correo</label>
      <input className="fl-in" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      {msg && <div className="fl-ok">{msg}</div>}
      <button className="coral" style={{ width: "100%", marginTop: 10 }} disabled={busy} onClick={submit}>Enviarme el enlace</button>
      <div className="fl-alt"><a onClick={() => setModal({ type: "login" })}>Volver a iniciar sesión</a></div>
    </Modal>
  );
}

function ResetModal({ token, onClose }) {
  const { lang, afterAuth, toast } = useApp();
  const lx = LX(lang);
  const [valid, setValid] = useState(null); const [email, setEmail] = useState("");
  const [p1, setP1] = useState(""); const [p2, setP2] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => {
    API.resetValidate(token).then((r) => { setValid(true); setEmail(r.email || ""); }).catch(() => setValid(false));
  }, [token]);
  const submit = async () => {
    setErr("");
    if (p1.length < 6) return setErr("La contraseña debe tener al menos 6 caracteres");
    if (p1 !== p2) return setErr("Las contraseñas no coinciden");
    setBusy(true);
    try { const p = await API.resetConfirm({ token, password: p1, password2: p2 }); await afterAuth(p); toast("Contraseña actualizada. ¡Listo!"); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal onClose={onClose}>
      <div className="flhd"><b>{lx.resetTitle}</b><span className="x" onClick={onClose}>✕</span></div>
      {valid === false && <div className="fl-err">{lx.invalidLink} Solicita uno nuevo.</div>}
      {valid === null && <div className="note">Validando enlace…</div>}
      {valid && (
        <>
          {email && <div className="note" style={{ marginBottom: 6 }}>Cuenta: <b>{email}</b></div>}
          <label className="fl-l">{lx.newpass}</label>
          <PwInput value={p1} onChange={(e) => setP1(e.target.value)} />
          <label className="fl-l">{lx.repeatpass}</label>
          <PwInput value={p2} onChange={(e) => setP2(e.target.value)} />
          <div className="fl-err">{err}</div>
          <button className="coral" style={{ width: "100%", marginTop: 10 }} disabled={busy} onClick={submit}>{lx.setpass}</button>
        </>
      )}
    </Modal>
  );
}

function ProfileModal({ onClose }) {
  const { lang, engine, predictions } = useApp();
  const l = L(lang);
  const [rank, setRank] = useState(null);
  const [showPreds, setShowPreds] = useState(false);
  useEffect(() => { API.ranking().then(setRank).catch(() => {}); }, []);
  const myRow = rank?.ranking.find((r) => r.me);
  const myPts = myRow?.points ?? engine.scoreUser(predictions);
  if (showPreds) return <PredList onBack={() => setShowPreds(false)} onClose={onClose} />;
  return (
    <Modal onClose={onClose} wide>
      <div className="flhd"><b>Mi perfil</b><span className="x" onClick={onClose}>✕</span></div>
      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        <div className="statbox"><div className="sl">Tu puesto</div><div className="sv">#{myRow ? myRow.rank : "-"}</div></div>
        <div className="statbox"><div className="sl">Tus puntos</div><div className="sv">{myPts}</div></div>
      </div>
      <button className="coral sm" style={{ marginBottom: 14 }} onClick={() => setShowPreds(true)}>Ver / editar mis pronósticos</button>
      <div className="plstage">Ranking</div>
      {!rank?.ranking.length && <div className="note">Aún no hay jugadores.</div>}
      {rank?.ranking.map((x) => (
        <div className={"rkrow" + (x.me ? " me" : "")} key={x.id}>
          <span className="rkn">{x.rank}</span><span>{x.name}</span><span className="rkp">{x.points} pts</span>
        </div>
      ))}
    </Modal>
  );
}

function PredList({ onBack, onClose }) {
  const { lang, engine, boot, predictions, mc } = useApp();
  const l = L(lang);
  const R = engine.resolve("fav").rounds;
  return (
    <Modal onClose={onClose} wide>
      <div className="flhd"><b>Mis pronósticos</b><span className="x" onClick={onClose}>✕</span></div>
      <button className="ghost sm" style={{ marginBottom: 10 }} onClick={onBack}>← Volver</button>
      {[0, 1, 2, 3, 4].map((r) => {
        const enabled = boot.state.rounds_enabled[String(r)];
        const proj = r > 0 && !engine.confirmed(r, 0);
        const ms = R[r] || [];
        return (
          <div key={r}>
            <div className="plstage">{ROUND_LABELS[lang][r]}{enabled ? "" : " · cerrada"}{proj ? " · proyección" : ""}</div>
            {ms.map((m, i) => {
              if (!m.a || !m.b) return <div className="plrow" key={i}><span className="plteams" style={{ opacity: .5 }}>{l.tbd}</span></div>;
              const g = predictions[r]?.[i] || {};
              const up = g.pick;
              const locked = engine.lock(r, i);
              const rsc = engine.score(r, i);
              const hasPred = up || g.goal_a != null || g.goal_b != null;
              return (
                <div className="plrow" key={i}>
                  <span className="plteams"><Flag team={m.a} /> {m.a} <span style={{ color: "var(--taupe)" }}>vs</span> <Flag team={m.b} /> {m.b}</span>
                  {locked ? (
                    <span className="plpick" style={{ alignItems: "center" }}>
                      <span className="cerrado">Jugado{rsc ? " " + rsc : ""}</span>
                      <span className="plwin">✓ {locked}</span>
                    </span>
                  ) : enabled ? (
                    <span className="plpick" style={{ alignItems: "center" }}>
                      <input className="plg" type="number" min="0" value={g.goal_a != null ? g.goal_a : ""} onChange={(e) => mc.goal(r, i, "a", e.target.value, m)} aria-label={"goles " + m.a} />
                      <span className="dash">–</span>
                      <input className="plg" type="number" min="0" value={g.goal_b != null ? g.goal_b : ""} onChange={(e) => mc.goal(r, i, "b", e.target.value, m)} aria-label={"goles " + m.b} />
                      {up && <span className="plwin">✓ {up}</span>}
                      {hasPred && <button className="ghost sm" title="Reiniciar este pronóstico" style={{ padding: "3px 7px" }} onClick={() => mc.reset(r, i)}>↺</button>}
                    </span>
                  ) : <span className="cerrado">{up ? "✓ " + up : "-"}</span>}
                </div>
              );
            })}
          </div>
        );
      })}
    </Modal>
  );
}

function AdminModal({ onClose }) {
  const { setMode, boot, toast, loadBoot } = useApp();
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  useEffect(() => { if (tab === "users") API.adminUsers().then(setUsers).catch(() => {}); }, [tab]);
  const toggleActive = async (u) => { await API.adminUserPatch(u.id, { is_active: !u.is_active }); setUsers(await API.adminUsers()); };
  const del = async (u) => { if (!confirm(`Eliminar a ${u.name}?`)) return; await API.adminUserDelete(u.id); setUsers(await API.adminUsers()); toast("Usuario eliminado"); };
  const resetPw = async (u) => { const np = prompt(`Nueva contraseña para ${u.name}:`, "Mundial2026"); if (!np) return; await API.adminUserPatch(u.id, { password: np }); toast("Contraseña actualizada"); };

  return (
    <Modal onClose={onClose} wide>
      <div className="flhd"><b>Panel de administración</b><span className="x" onClick={onClose}>✕</span></div>
      <div className="fltabs">
        <button className={tab === "users" ? "on" : ""} onClick={() => setTab("users")}>Usuarios</button>
        <button className={tab === "matches" ? "on" : ""} onClick={() => setTab("matches")}>Partidos</button>
        <button className={tab === "results" ? "on" : ""} onClick={() => setTab("results")}>Resultados</button>
      </div>

      {tab === "users" && (
        !users.length ? <div className="note">Aún no hay usuarios.</div> :
        <table className="utbl"><thead><tr><th>Nombre</th><th>Correo</th><th>Pts</th><th>Activo</th><th>Acciones</th></tr></thead>
          <tbody>{users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td style={{ fontSize: 12, color: "var(--taupe)" }}>{u.email}</td>
              <td style={{ fontFamily: "var(--mono)" }}>{u.points}</td>
              <td><label className="sw"><input type="checkbox" checked={u.is_active} onChange={() => toggleActive(u)} /><span className="tk" /></label></td>
              <td><div className="uact">
                <button className="ghost" onClick={() => resetPw(u)}>Reset clave</button>
                <button className="ghost" style={{ color: "var(--red)" }} onClick={() => del(u)}>Eliminar</button>
              </div></td>
            </tr>
          ))}</tbody>
        </table>
      )}

      {tab === "matches" && <PartidosTab />}

      {tab === "results" && (
        <>
          <div className="note" style={{ marginBottom: 12 }}>
            En el cuadro, modo <b>Resultados</b>, marca el ganador real y el marcador de cada cruce. Al cargar el resultado, ese partido queda <b>jugado</b> y se bloquea para los usuarios.
          </div>
          <button className="coral" onClick={() => { setMode("result"); onClose(); toast("Modo resultados: marca ganadores en el cuadro"); }}>
            Ir a cargar resultados en el cuadro
          </button>
          <div style={{ height: 10 }} />
          <div className="note" style={{ marginBottom: 6 }}>O trae los resultados reales de FIFA automáticamente:</div>
          <button className="ghost" onClick={async () => {
            try { const r = await API.adminSyncFifa(); await loadBoot(); toast(`FIFA: ${r.updated} partidos actualizados`); }
            catch (e) { toast(e.message); }
          }}>↻ Sincronizar resultados de FIFA ahora</button>
        </>
      )}
    </Modal>
  );
}

function PartidosTab() {
  const { boot, engine, loadBoot } = useApp();
  const teams = Object.keys(boot.teams).sort();
  const labels = ["Dieciseisavos", "Octavos", "Cuartos", "Semifinal", "Final"];
  const counts = [16, 8, 4, 2, 1];
  const [round, setRound] = useState(1);
  const R = engine.resolve("fav").rounds;
  const toggleRound = async (r) => {
    const en = !boot.state.rounds_enabled[String(r)];
    await API.adminRound({ round: r, enabled: en }); await loadBoot();
  };
  return (
    <>
      <div className="note" style={{ marginBottom: 8 }}>Abrir / cerrar apuestas por etapa:</div>
      {[0, 1, 2, 3, 4].map((r) => {
        const en = boot.state.rounds_enabled[String(r)];
        return (
          <div className="plrow" key={r}>
            <span className="plteams">{labels[r]}</span>
            <label className="sw"><input type="checkbox" checked={!!en} onChange={() => toggleRound(r)} /><span className="tk" /><span>{en ? "Abierta" : "Cerrada"}</span></label>
          </div>
        );
      })}
      <div className="plstage" style={{ marginTop: 16 }}>Registrar partidos</div>
      <div className="note" style={{ marginBottom: 8 }}>16vos ya están. Octavos en adelante se muestran como proyección del modelo hasta que confirmes los equipos reales aquí.</div>
      <div className="fltabs" style={{ marginBottom: 10 }}>
        {[1, 2, 3, 4].map((r) => (
          <button key={r} className={round === r ? "on" : ""} onClick={() => setRound(r)}>{labels[r]}</button>
        ))}
      </div>
      {Array.from({ length: counts[round] }).map((_, i) => (
        <FixtureRow key={round + "-" + i} round={round} index={i} teams={teams} model={(R[round] || [])[i] || {}} />
      ))}
    </>
  );
}

function FixtureRow({ round, index, teams, model }) {
  const { boot, loadBoot, toast } = useApp();
  const ov = boot.overrides?.[String(round)]?.[String(index)];
  const [a, setA] = useState(ov?.team_a || model.a || "");
  const [b, setB] = useState(ov?.team_b || model.b || "");
  const [date, setDate] = useState(ov?.date_label || "");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await API.adminFixture({ round, index, team_a: a, team_b: b, date_label: date }); await loadBoot(); toast("Partido guardado"); }
    finally { setBusy(false); }
  };
  const clear = async () => { await API.adminFixtureDelete({ round, index }); await loadBoot(); toast("Partido quitado"); };
  return (
    <div className="plrow" style={{ gap: 6, flexWrap: "wrap" }}>
      <span style={{ fontFamily: "var(--mono)", color: "var(--taupe)", width: 18 }}>{index + 1}</span>
      <select className="fl-in" style={{ flex: 1, minWidth: 110 }} value={a} onChange={(e) => setA(e.target.value)}>
        <option value="">—</option>{teams.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <span style={{ color: "var(--taupe)" }}>vs</span>
      <select className="fl-in" style={{ flex: 1, minWidth: 110 }} value={b} onChange={(e) => setB(e.target.value)}>
        <option value="">—</option>{teams.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <input className="fl-in" style={{ width: 120 }} placeholder="fecha · sede" value={date} onChange={(e) => setDate(e.target.value)} />
      <button className="coral sm" disabled={busy} onClick={save}>Guardar</button>
      {ov && <button className="ghost sm" onClick={clear}>Quitar</button>}
    </div>
  );
}
