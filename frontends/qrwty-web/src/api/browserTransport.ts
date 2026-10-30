import type { TransportRequest, TransportResult } from "./transport.worker.ts";

/** Per-request fetch transport for the generated same-origin client. */
export async function browserTransport(request: Request): Promise<Response> {
  if (new URL(request.url).origin !== window.location.origin) {
    throw new Error("API requests must use the app's origin.");
  }
  request.signal.throwIfAborted();
  const body = request.body ? await request.arrayBuffer() : undefined;
  request.signal.throwIfAborted();
  const headers = new Headers(request.headers);
  if (!headers.has("x-request-id")) headers.set("x-request-id", crypto.randomUUID());
  const outgoing: TransportRequest = {
    url: request.url, method: request.method, headers: [...headers],
    credentials: request.credentials, body,
  };

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./transport.worker.ts", import.meta.url), { type: "module" });
    const finish = () => {
      clearTimeout(timer);
      request.signal.removeEventListener("abort", abort);
      worker.terminate();
    };
    const fail = (error: unknown) => { finish(); reject(error); };
    const abort = () => fail(request.signal.reason);
    // The generated attachment's configured request timeout is five seconds.
    const timer = window.setTimeout(() => fail(new Error("The API request timed out.")), 5000);
    request.signal.addEventListener("abort", abort, { once: true });
    worker.onerror = event => {
      event.preventDefault();
      fail(new Error("Unable to start the API request."));
    };
    worker.onmessage = (event: MessageEvent<TransportResult>) => {
      const result = event.data;
      if ("error" in result) { fail(new Error(result.error)); return; }
      const { status, statusText, headers, body } = result.response;
      finish();
      resolve(new Response([101, 204, 205, 304].includes(status) ? null : body, { status, statusText, headers }));
    };
    try { worker.postMessage(outgoing, body ? [body] : []); }
    catch (error) { fail(error); }
  });
}
