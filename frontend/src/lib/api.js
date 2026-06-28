const BASE = import.meta.env.VITE_API_URL || "/api";
const TKEY = "fl_token";
export function getToken() { return localStorage.getItem(TKEY) || ""; }
export function setToken(t) { t ? localStorage.setItem(TKEY, t) : localStorage.removeItem(TKEY); }
async function req(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const t = getToken(); if (t) headers["Authorization"] = "Token " + t;
  const res = await fetch(BASE + path, { method, headers, body: body != null ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch (_) {}
  if (!res.ok) {
    const msg = (data && (data.detail || data.non_field_errors?.[0] || Object.values(data).flat?.()[0])) || `Error ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : "Error");
  }
  return data;
}
export const api = { get: (p) => req("GET", p), post: (p, b) => req("POST", p, b), patch: (p, b) => req("PATCH", p, b), del: (p, b) => req("DELETE", p, b) };
export const API = {
  bootstrap: (n = 1500) => api.get(`/bootstrap/?n=${n}`),
  team: (name, lang, ai) => api.get(`/team/${encodeURIComponent(name)}/?lang=${lang}${ai ? "&ai=1" : ""}`),
  ranking: () => api.get(`/ranking/`),
  savePrediction: (p) => api.post(`/predictions/save/`, p),
  myPredictions: () => api.get(`/predictions/`),
  register: (b) => api.post(`/auth/register/`, b),
  login: (b) => api.post(`/auth/login/`, b),
  logout: () => api.post(`/auth/logout/`),
  me: () => api.get(`/auth/me/`),
  resetRequest: (email) => api.post(`/auth/password/reset/`, { email }),
  resetValidate: (token) => api.get(`/auth/password/reset/validate/?token=${encodeURIComponent(token)}`),
  resetConfirm: (b) => api.post(`/auth/password/reset/confirm/`, b),
  adminUsers: () => api.get(`/admin/users/`),
  adminUserPatch: (id, b) => api.patch(`/admin/users/${id}/`, b),
  adminUserDelete: (id) => api.del(`/admin/users/${id}/`),
  adminUserPreds: (id) => api.get(`/admin/users/${id}/predictions/`),
  adminResult: (b) => api.post(`/admin/result/`, b),
  adminResultDelete: (b) => api.del(`/admin/result/`, b),
  adminRound: (b) => api.post(`/admin/round/`, b),
  adminFixture: (b) => api.post(`/admin/fixture/`, b),
  adminFixtureDelete: (b) => api.del(`/admin/fixture/`, b),
  adminSyncFifa: () => api.post(`/admin/sync-fifa/`),
  adminMatchLock: (b) => api.post(`/admin/match-lock/`, b),
  adminPredictions: () => api.get(`/admin/predictions/`),
  adminPredictionDelete: (id) => api.del(`/admin/predictions/${id}/`),
};
