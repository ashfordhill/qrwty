import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useApis } from "@jeeves/web-runtime";
import type { app } from "../jeeves.generated.ts";
import { browserTransport } from "../api/browserTransport.ts";
import { message } from "../components/apiMessage.ts";
import { QrDashboard } from "../components/QrDashboard.tsx";


export function Home() {
  const { qrwty: client } = useApis<typeof app.apis>();
  const [session, setSession] = useState<{ csrfToken: string } | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setChecking(true);
    setError("");
    void client.GET("/auth/session", { fetch: browserTransport }).then(({ data, error, response }) => {
      if (!active) return;
      if (data) setSession(data);
      else if (response.status !== 401) setError(message(error));
    }).catch(() => { if (active) setError("Unable to check your session. Please retry."); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [client, attempt]);

  function signedOut() {
    setSession(null);
    setPassword("");
    setError("");
  }

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const action = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value");
    setBusy(true);
    setError("");
    try {
      const { data, error } = await client.POST(action === "register" ? "/auth/register" : "/auth/login", {
        fetch: browserTransport, body: { email, password }, headers: { "x-csrf-token": session?.csrfToken ?? "" },
      });
      if (data) { setSession(data); setPassword(""); }
      else setError(message(error));
    } catch { setError("Unable to connect. Please try again."); }
    finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true);
    try { await client.POST("/auth/logout", { fetch: browserTransport, headers: { "x-csrf-token": session!.csrfToken } }); }
    catch { /* Local session state is cleared even if the connection is unavailable. */ }
    finally { signedOut(); setBusy(false); }
  }

  if (checking) return <p role="status">Checking your session…</p>;
  if (session) return <>
    <div className="section-heading"><div><p className="eyebrow">YOUR WORKSPACE</p><h2>QR links</h2></div>
      <button data-testid="auth-logout" disabled={busy} onClick={() => void logout()}>Log out</button></div>
    <QrDashboard csrfToken={session.csrfToken} onUnauthorized={signedOut} />
  </>;

  return <section className="panel auth-panel">
    <p className="eyebrow">ONE LINK. ROOM TO CHANGE.</p>
    <h2>Your destinations, connected.</h2>
    <p>Create QR codes with a permanent public link. Update their destinations and see daily requests.</p>
    <form onSubmit={authenticate}>
      <label>Email<input data-testid="auth-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label>Password<input data-testid="auth-password" type="password" autoComplete="current-password" required minLength={12} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /></label>
      <small>Use 12–128 characters for your password.</small>
      <div className="actions"><button className="primary" data-testid="auth-login" type="submit" value="login" disabled={busy}>Log in</button>
        <button data-testid="auth-register" type="submit" value="register" disabled={busy}>Register</button></div>
    </form>
    {error && <div role="alert"><p>{error}</p><button onClick={() => setAttempt(n => n + 1)}>Retry session check</button></div>}
  </section>;
}
