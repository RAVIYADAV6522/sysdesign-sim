const TOKEN_KEY = "sysdesign_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch(path, options = {}) {
  const { skipAuth, ...init } = options;
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  if (!skipAuth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`/api${path}`, { ...init, headers });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!res.ok) {
    const err = new Error(
      (data && data.error) || res.statusText || "Request failed",
    );
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

export const api = {
  health: () => apiFetch("/health"),
  authStatus: () => apiFetch("/auth/google/status", { skipAuth: true }),
  me: () => apiFetch("/users/me"),
  listDesigns: () => apiFetch("/designs"),
  getDesign: (id) => apiFetch(`/designs/${id}`),
  getPublicDesign: (id) =>
    apiFetch(`/designs/public/${id}`, { skipAuth: true }),
  createDesign: (body) =>
    apiFetch("/designs", { method: "POST", body: JSON.stringify(body) }),
  updateDesign: (id, body) =>
    apiFetch(`/designs/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deleteDesign: (id) => apiFetch(`/designs/${id}`, { method: "DELETE" }),
  forkDesign: (id) =>
    apiFetch(`/designs/${id}/fork`, { method: "POST", body: "{}" }),
};
