export class FetchError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new FetchError(res.status, json.error ?? `Request failed with status ${res.status}`);
  }
  if (!("data" in json) || json.data === undefined) {
    throw new FetchError(500, "Malformed API response");
  }
  return json.data as T;
}
