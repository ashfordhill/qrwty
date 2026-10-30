import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useApis } from "@jeeves/web-runtime";
import type { app } from "../jeeves.generated.ts";
import type { paths } from "../clients/qrwty.openapi.ts";
import { browserTransport } from "../api/browserTransport.ts";
import { message } from "./apiMessage.ts";
import { QrDetails } from "./QrDetails.tsx";

export type Qr = paths["/api/qr/{id}"]["get"]["responses"][200]["content"]["application/json"];
export const publicLink = (id: string) => `${window.location.origin}/q/${id}`;
export function destinationError(value: string) {
  try {
    const url = new URL(value);
    if (!/^https?:\/\//i.test(value) || !["http:", "https:"].includes(url.protocol) || url.username || url.password || value.match(/^https?:\/\/[^/?#]*@/i)) throw new Error();
    return "";
  } catch { return "Enter an absolute HTTP or HTTPS destination without credentials."; }
}

export function QrDashboard({ csrfToken, onUnauthorized }: { csrfToken: string; onUnauthorized: () => void }) {
  const { qrwty: client } = useApis<typeof app.apis>();
  const [items, setItems] = useState<Qr[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [destination, setDestination] = useState("");
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const mounted = useRef(true);

  async function load(next?: string) {
    setLoading(true); setListError("");
    try {
      const { data, error, response } = await client.GET("/api/qr", { fetch: browserTransport, params: { query: { limit: 25, ...(next ? { cursor: next } : {}) } } });
      if (!mounted.current) return;
      if (response.status === 401) return onUnauthorized();
      if (!data) { setListError(message(error)); return; }
      setItems(previous => {
        const rows = next ? [...previous, ...data.items] : data.items;
        return [...new Map(rows.map(row => [row.id, row])).values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      });
      setCursor(data.nextCursor);
    } catch { if (mounted.current) setListError("Unable to load QR links. Please retry."); }
    finally { if (mounted.current) setLoading(false); }
  }
  useEffect(() => {
    mounted.current = true;
    void load();
    return () => { mounted.current = false; };
  }, [client]);

  async function create(event: FormEvent) {
    event.preventDefault();
    const invalid = destinationError(destination);
    if (invalid) { setError(invalid); return; }
    setCreating(true); setError(""); setCreated(null);
    try {
      const { data, error, response } = await client.POST("/api/qr", {
        fetch: browserTransport, body: { destination, title: title || null }, headers: { "x-csrf-token": csrfToken },
      });
      if (response.status === 401) return onUnauthorized();
      if (!data) { setError(message(error)); return; }
      setDestination(""); setTitle(""); setCreated(data.id);
      await load();
    } catch { setError("Unable to create your QR link. Please try again."); }
    finally { setCreating(false); }
  }

  return <>
    <section className="panel"><h3>Create a QR link</h3>
      <form data-testid="qr-create-form" onSubmit={create}>
        <label>Destination<input data-testid="qr-destination" type="url" placeholder="https://example.com" required maxLength={8192} value={destination} onChange={e => setDestination(e.target.value)} /></label>
        <label>Title <span className="muted">(optional)</span><input data-testid="qr-title" maxLength={120} value={title} onChange={e => setTitle(e.target.value)} /></label>
        <button className="primary" data-testid="qr-create" disabled={creating} type="submit">{creating ? "Creating…" : "Create QR link"}</button>
      </form>
      {error && <p role="alert">{error}</p>}
      {created && <p role="status">Created: <a href={publicLink(created)}>{publicLink(created)}</a></p>}
    </section>
    <section aria-label="Your QR links" className="qr-list">
      <div className="section-heading"><h3>Your links</h3><button disabled={loading} onClick={() => void load()}>Refresh</button></div>
      {loading && <p role="status">Loading QR links…</p>}
      {listError && <div role="alert">{listError} <button onClick={() => void load()}>Retry</button></div>}
      {!loading && !listError && items.length === 0 && <p className="panel">No QR links yet. Create your first one above.</p>}
      {items.map(qr => <article className="panel qr-row" data-testid="qr-row" data-qr-id={qr.id} key={qr.id}>
        <div className="section-heading"><h3>{qr.title || "Untitled"}</h3><button data-testid="qr-select" aria-expanded={selected === qr.id} onClick={() => setSelected(qr.id)}>{selected === qr.id ? "Selected" : "Select"}</button></div>
        <p className="destination">{qr.destination}</p>
        <p className="muted">Created <time dateTime={qr.createdAt}>{new Date(qr.createdAt).toLocaleString()}</time></p>
        <p className="public-link"><a data-testid="qr-public-link" href={publicLink(qr.id)}>{publicLink(qr.id)}</a></p>
        {selected === qr.id && <QrDetails qr={qr} csrfToken={csrfToken} onUnauthorized={onUnauthorized} onSaved={updated => setItems(rows => rows.map(row => row.id === updated.id ? updated : row))} />}
      </article>)}
      {cursor && <button disabled={loading} onClick={() => void load(cursor)}>Load more</button>}
    </section>
  </>;
}
