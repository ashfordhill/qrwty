import { beforeEach, expect, test, vi } from "vitest";
import { createServer } from "node:http";
import type { OperationRequest } from "@jeeves/service-runtime";

const state = vi.hoisted(() => ({
  query: vi.fn(),
  connect: vi.fn(),
  clientQuery: vi.fn(),
  release: vi.fn(),
}));
vi.mock("../src/jeeves.generated.ts", () => ({
  database: { pool: { query: state.query, connect: state.connect } },
}));

import feature from "../src/features/redirect/index.ts";
import qr from "../src/generated/resources/qr.ts";
import scan from "../src/generated/resources/scan.ts";

const id = "30c773da-31b0-4dd5-986a-beed1d303dce";
const destination = "https://example.test/path?x=1&y=2#section";
const follow = (method = "GET") => feature.operations!.followQr!({
  params: { id }, request: { method },
} as OperationRequest);

beforeEach(() => {
  vi.resetAllMocks();
  state.query.mockResolvedValue({ rows: [{ destination }] });
  state.clientQuery.mockResolvedValue({ rows: [] });
  state.connect.mockResolvedValue({ query: state.clientQuery, release: state.release });
});

test("public redirect uses descriptor names and commits one parameterized scan per GET", async () => {
  for (let i = 0; i < 2; i++) {
    expect(await follow()).toEqual({
      status: 302,
      headers: { location: destination, "cache-control": "no-store" },
    });
  }
  expect(state.query).toHaveBeenCalledTimes(2);
  expect(state.query).toHaveBeenCalledWith(
    `SELECT "${qr.fields.find((field) => field.name === "destination")!.column}" AS "destination" FROM "${qr.table}" WHERE "id" = $1`,
    [id],
  );
  expect(state.clientQuery.mock.calls).toEqual(Array.from({ length: 2 }, () => [
    ["BEGIN"],
    [`INSERT INTO "${scan.table}" ("id", "${scan.belongsTo[0].column}") VALUES (gen_random_uuid(), $1)`, [id]],
    ["COMMIT"],
  ]).flat());
  expect(state.release).toHaveBeenCalledTimes(2);
});

test("reads a changed destination on the next request", async () => {
  await follow();
  state.query.mockResolvedValue({ rows: [{ destination: "https://changed.example.test/" }] });
  expect((await follow()).headers?.location).toBe("https://changed.example.test/");
});

test("repeated redirects record scans without contacting the destination", async () => {
  let requests = 0;
  const server = createServer((_request, response) => {
    requests++;
    response.writeHead(204).end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing destination address");
    const url = `http://127.0.0.1:${address.port}/destination`;
    state.query.mockResolvedValue({ rows: [{ destination: url }] });
    for (let i = 0; i < 2; i++) {
      const response = await follow();
      expect(response.status).toBe(302);
      expect(response.headers?.location).toBe(url);
    }
    expect(requests).toBe(0);
    expect(state.clientQuery.mock.calls.filter(([sql]) => sql.startsWith("INSERT"))).toHaveLength(2);
    expect(state.clientQuery.mock.calls.filter(([sql]) => sql === "COMMIT")).toHaveLength(2);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test.each(["GET", "HEAD"])("missing QR returns 404 without opening a transaction (%s)", async (method) => {
  state.query.mockResolvedValue({ rows: [] });
  expect(await follow(method)).toEqual({
    status: 404, body: { error: "NOT_FOUND", message: "No such QR" },
  });
  expect(state.connect).not.toHaveBeenCalled();
});

test("HEAD returns redirect headers without recording a scan", async () => {
  expect(await follow("HEAD")).toEqual({
    status: 302, headers: { location: destination, "cache-control": "no-store" },
  });
  expect(state.connect).not.toHaveBeenCalled();
});

test("does not return the redirect before COMMIT completes", async () => {
  let commit!: () => void;
  const committed = new Promise<void>((resolve) => { commit = resolve; });
  let entered!: () => void;
  const committing = new Promise<void>((resolve) => { entered = resolve; });
  state.clientQuery.mockImplementation(async (sql: string) => {
    if (sql === "COMMIT") {
      entered();
      await committed;
    }
    return { rows: [] };
  });
  let returned = false;
  const response = follow().then((result) => { returned = true; return result; });
  await committing;
  expect(returned).toBe(false);
  commit();
  expect((await response).status).toBe(302);
});

test.each(["insert", "commit"])("rolls back and rejects instead of redirecting on %s failure", async (stage) => {
  const failure = new Error("database failure");
  state.clientQuery.mockImplementation(async (sql: string) => {
    if ((stage === "insert" && sql.startsWith("INSERT")) || (stage === "commit" && sql === "COMMIT")) {
      throw failure;
    }
    return { rows: [] };
  });
  await expect(follow()).rejects.toThrow(failure);
  expect(state.clientQuery).toHaveBeenLastCalledWith("ROLLBACK");
  expect(state.release).toHaveBeenCalledOnce();
});
