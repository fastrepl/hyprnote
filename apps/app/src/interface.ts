const BASE = "/api/web";

export const connect = () => {
  return fetch(`${BASE}/connect`, {
    method: "POST",
    body: JSON.stringify({}),
  });
};
