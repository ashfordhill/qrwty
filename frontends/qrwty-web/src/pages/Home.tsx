import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useApis, useRuntimeConfig } from "@jeeves/web-runtime";
import { Feedback, PageHeader, ProductShell } from "@jeeves/product-ui";
import type { app } from "../jeeves.generated.ts";
import { message } from "../components/apiMessage.ts";
import { QrDashboard } from "../components/QrDashboard.tsx";
import { Icon } from "../components/Icon.tsx";

export function Home() {
  const { qrwty: client } = useApis<typeof app.apis>();
  const { title: appName } = useRuntimeConfig();
  const [session, setSession] = useState<{ csrfToken: string } | null>(null);
  const [checking, setChecking] = useState(true);
  const [checkError, setCheckError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [section, setSection] = useState(window.location.hash);

  useEffect(() => {
    const changed = () => setSection(window.location.hash);
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);

  useEffect(() => {
    let active = true;
    setChecking(true);
    setCheckError("");
    // Skip an effect disposed before its first microtask (including StrictMode replay).
    queueMicrotask(() => {
      if (!active) return;
      void client
        .GET("/auth/session")
        .then(({ data, error, response }) => {
          if (!active) return;
          if (data) setSession(data);
          else if (response.status === 401) setSession(null);
          else setCheckError(message(error));
        })
        .catch(() => {
          if (active) setCheckError("Unable to check your session. Please retry.");
        })
        .finally(() => {
          if (active) setChecking(false);
        });
    });
    return () => {
      active = false;
    };
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
      const { data, error } = await client.POST(
        action === "register" ? "/auth/register" : "/auth/login",
        {
          body: { email, password },
        },
      );
      if (data) {
        setSession(data);
        setPassword("");
      } else setError(message(error));
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      const { response, error } = await client.POST("/auth/logout", {
        headers: { "x-csrf-token": session.csrfToken },
      });
      // openapi-fetch returns 204 responses without reading the body. Finish the
      // browser stream before releasing it so successful logout is not aborted.
      if (response.status === 204) await response.arrayBuffer();
      if (response.ok || response.status === 401) signedOut();
      else setError(message(error));
    } catch {
      setError("We couldn’t log you out. You’re still signed in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ProductShell
      name={appName}
      tagline="One link. Room to change."
      mark={
        <span className="brand-mark">
          <Icon name="grid" />
        </span>
      }
      navigation={
        session
          ? [
              {
                href: "#library",
                label: "QR library",
                icon: <Icon name="grid" />,
                current: section !== "#create",
              },
              {
                href: "#create",
                label: "Create QR",
                icon: <Icon name="plus" />,
                current: section === "#create",
              },
            ]
          : []
      }
      footer={
        session ? (
          <button
            className="logout"
            data-testid="auth-logout"
            disabled={busy}
            onClick={() => void logout()}
          >
            <Icon name="exit" />
            {busy ? "Logging out…" : "Log out"}
          </button>
        ) : (
          <p className="sidebar-note">
            A permanent link.
            <br />
            An evolving destination.
          </p>
        )
      }
    >
      {checking ? (
        <Feedback>Checking your session…</Feedback>
      ) : checkError ? (
        <section className="panel session-retry">
          <PageHeader
            title="Let’s reconnect."
            description="Your workspace will be here when the connection returns."
          />
          <Feedback kind="error">{checkError}</Feedback>
          <button onClick={() => setAttempt((n) => n + 1)}>Retry session check</button>
        </section>
      ) : session ? (
        <>
          <PageHeader
            eyebrow="Your workspace"
            title="QR library"
            description="Create once. Share everywhere. Change where it leads."
            actions={
              <a className="button primary" href="#create">
                <Icon name="plus" />
                Create a QR link
              </a>
            }
          />
          {error && <Feedback kind="error">{error}</Feedback>}
          <QrDashboard csrfToken={session.csrfToken} onUnauthorized={signedOut} />
        </>
      ) : (
        <div className="auth-layout">
          <section className="auth-story">
            <p className="eyebrow">SMALL CODE. BIG POSSIBILITIES.</p>
            <h1>
              Your next connection
              <br />
              <span>starts here.</span>
            </h1>
            <p>
              Give your ideas a permanent link. Update the destination whenever you need to, without
              reprinting your QR code.
            </p>
            <div className="story-steps">
              <div>
                <Icon name="plus" />
                <strong>Create</strong>
                <span>One link for your next idea</span>
              </div>
              <div>
                <Icon name="link" />
                <strong>Share</strong>
                <span>A code that keeps working</span>
              </div>
              <div>
                <Icon name="arrow" />
                <strong>Evolve</strong>
                <span>New destinations. Same code.</span>
              </div>
            </div>
          </section>
          <section className="panel auth-panel" aria-label="Sign in">
            <span className="status-tag">YOUR QR WORKSPACE</span>
            <h2>Welcome to {appName}.</h2>
            <p className="muted">Log in or create your account to get started.</p>
            <form onSubmit={authenticate}>
              <label>
                Email
                <input
                  data-testid="auth-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  required
                  maxLength={254}
                  value={email}
                  disabled={busy}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                Password
                <input
                  data-testid="auth-password"
                  type="password"
                  autoComplete="current-password"
                  aria-describedby="password-hint"
                  required
                  minLength={12}
                  maxLength={128}
                  value={password}
                  disabled={busy}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <small id="password-hint">Use 12–128 characters for your password.</small>
              <button
                className="primary"
                data-testid="auth-login"
                type="submit"
                value="login"
                disabled={busy}
              >
                {busy ? "Please wait…" : "Log in"}
                <Icon name="arrow" />
              </button>
              <button data-testid="auth-register" type="submit" value="register" disabled={busy}>
                Create account
              </button>
            </form>
            {error && <Feedback kind="error">{error}</Feedback>}
          </section>
        </div>
      )}
    </ProductShell>
  );
}
