const BASE = import.meta.env.VITE_API_URL || "/api";

export class ApiError extends Error {
  constructor(message, status, fields = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export const hooks = { onUnauthorized: null };

async function request(path, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      credentials: "include",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }

  if (!res.ok) {
    if (res.status === 401 && !path.startsWith("/auth/")) hooks.onUnauthorized?.();
    throw new ApiError(data?.message || "Something went wrong. Please try again.", res.status, data?.fields);
  }
  return data;
}

export const api = {
  get: path => request(path),
  post: (path, body = {}) => request(path, { method: "POST", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  del: path => request(path, { method: "DELETE" })
};
