import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useApis } from "@jeeves/web-runtime";
import type { app } from "../jeeves.generated.ts";
import { browserTransport } from "../api/browserTransport.ts";
import { message } from "./apiMessage.ts";
import { destinationError } from "./QrDashboard.tsx";
import type { Qr } from "./QrDashboard.tsx";

type Activity = { total: number; days: { date: string; count: number }[] };
function defaultRange() {
  const today = new Date();
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - 29);
  return { from: start.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) };
}

export function QrDetails({ qr, csrfToken, onUnauthorized, onSaved }: {
  qr: Qr; csrfToken: string; onUnauthorized: () => void; onSaved: (qr: Qr) => void;
}) {
  const { qrwty: client } = useApis<typeof app.apis>();
  const [destination, setDestination] = useState(qr.destination);
  const [title, setTitle] = useState(qr.title ?? "");
  const [editError, setEditError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageError, setImageError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [range, setRange] = useState(defaultRange);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [activityError, setActivityError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { setDestination(qr.destination); setTitle(qr.title ?? ""); }, [qr.destination, qr.title]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaved(false);
    const invalid = destinationError(destination);
    if (invalid) { setEditError(invalid); return; }
    setSaving(true); setEditError("");
    try {
      const { data, error, response } = await client.PATCH("/api/qr/{id}", {
        fetch: browserTransport, params: { path: { id: qr.id } }, body: { destination, title: title || null },
        headers: { "x-csrf-token": csrfToken },
      });
      if (response.status === 401) return onUnauthorized();
      if (data) { onSaved(data); setSaved(true); }
      else setEditError(message(error));
    } catch { setEditError("Unable to save changes. Please try again."); }
    finally { setSaving(false); }
  }

  async function download() {
    setDownloading(true); setImageError("");
    try {
      const { data, error, response } = await client.GET("/api/qr/{id}/image", {
        fetch: browserTransport, params: { path: { id: qr.id } }, parseAs: "blob",
      });
      if (response.status === 401) return onUnauthorized();
      if (!data) { setImageError(message(error)); return; }
      const url = URL.createObjectURL(data);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `qr-${qr.id}.png`;
      document.body.append(anchor); anchor.click(); anchor.remove();
      // Allow the browser to start reading the blob before releasing it.
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setImageError("Unable to download the image. Please try again."); }
    finally { setDownloading(false); }
  }

  async function loadActivity(event?: FormEvent) {
    event?.preventDefault();
    setShowActivity(true); setLoading(true); setActivityError(""); setActivity(null);
    try {
      const { data, error, response } = await client.GET("/api/qr/{id}/activity", {
        fetch: browserTransport, params: { path: { id: qr.id }, query: range },
      });
      if (response.status === 401) return onUnauthorized();
      if (data) setActivity(data);
      else setActivityError(message(error));
    } catch { setActivityError("Unable to load activity. Please try again."); }
    finally { setLoading(false); }
  }

  return <div className="qr-details">
    <h4>Edit link</h4>
    <form onSubmit={save}>
      <label>Destination<input data-testid="qr-edit-destination" type="url" required maxLength={8192} value={destination} onChange={e => setDestination(e.target.value)} /></label>
      <label>Title <span className="muted">(optional; leave blank to clear)</span><input data-testid="qr-edit-title" maxLength={120} value={title} onChange={e => setTitle(e.target.value)} /></label>
      <button data-testid="qr-edit-save" className="primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
    </form>
    {editError && <p role="alert">{editError}</p>}
    {saved && <p role="status">Changes saved. Your public link stays the same.</p>}
    <div className="actions"><button data-testid="qr-image-download" onClick={() => void download()} disabled={downloading}>{downloading ? "Downloading…" : "Download PNG"}</button>
      <button data-testid="qr-activity" onClick={() => void loadActivity()} disabled={loading}>View activity</button></div>
    {imageError && <p role="alert">{imageError}</p>}
    {showActivity && <section className="activity" aria-label="Link activity">
      <h4>Activity</h4><p className="muted">Daily requests, including repeat requests. Dates are in UTC.</p>
      <form className="date-range" onSubmit={loadActivity}>
        <label>From (UTC)<input data-testid="activity-from" type="date" required value={range.from} onChange={e => setRange(r => ({ ...r, from: e.target.value }))} /></label>
        <label>To (UTC)<input data-testid="activity-to" type="date" required value={range.to} onChange={e => setRange(r => ({ ...r, to: e.target.value }))} /></label>
        <button data-testid="activity-apply" type="submit" disabled={loading}>Apply</button>
      </form>
      {loading && <p role="status">Loading activity…</p>}
      {activityError && <p role="alert">{activityError}</p>}
      {activity && <><p data-testid="activity-total">{activity.total} requests</p>
        <table><caption>Requests per UTC day</caption><thead><tr><th scope="col">Date (UTC)</th><th scope="col">Requests</th></tr></thead>
          <tbody>{activity.days.map(day => <tr key={day.date} data-testid="activity-day" data-date={day.date} data-count={day.count}><td>{day.date}</td><td>{day.count}</td></tr>)}</tbody>
        </table></>}
    </section>}
  </div>;
}
