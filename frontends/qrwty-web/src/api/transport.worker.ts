export type TransportRequest = {
  url: string;
  method: string;
  headers: [string, string][];
  credentials: RequestCredentials;
  body?: ArrayBuffer;
};
export type TransportResponse = {
  status: number;
  statusText: string;
  headers: [string, string][];
  body: ArrayBuffer;
};
export type TransportResult = { response: TransportResponse } | { error: string };

// Expected HTTP errors (including a signed-out session's 401) are returned to the
// client as responses. Fetching in the worker avoids Chromium logging them as
// unhandled page resource errors; the UI still handles the original status/body.
self.onmessage = async (event: MessageEvent<TransportRequest>) => {
  const { url, method, headers, credentials, body } = event.data;
  try {
    const response = await fetch(url, { method, headers, credentials, body });
    const bytes = await response.arrayBuffer();
    const result: TransportResult = { response: {
      status: response.status, statusText: response.statusText,
      headers: [...response.headers], body: bytes,
    } };
    self.postMessage(result, { transfer: [bytes] });
  } catch (error) {
    const result: TransportResult = { error: error instanceof Error ? error.message : "Unable to connect" };
    self.postMessage(result);
  }
};
