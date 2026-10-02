import "@testing-library/jest-dom/vitest";

// Node's fetch has no cookie jar; emulate the browser so the httpOnly auth cookie round-trips.
const realFetch = globalThis.fetch;
let jar = "";
globalThis.fetch = async (url, opts = {}) => {
  const headers = { ...(opts.headers || {}), Origin: "http://localhost:5173" };
  if (jar) headers.Cookie = jar;
  const res = await realFetch(url, { ...opts, headers });
  for (const c of res.headers.getSetCookie?.() || []) {
    const [pair] = c.split(";");
    if (pair.startsWith("token=")) jar = pair.endsWith("=") ? "" : pair;
  }
  return res;
};
window.scrollTo = () => {};
