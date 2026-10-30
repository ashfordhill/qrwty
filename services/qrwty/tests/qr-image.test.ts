import { beforeEach, expect, test, vi } from "vitest";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import type { OperationRequest } from "@jeeves/service-runtime";

const state = vi.hoisted(() => ({
  principal: { id: "8706c825-1036-4bae-bcc1-b609cce6695e", csrfToken: "test" } as
    { id: string; csrfToken: string } | undefined,
  query: vi.fn(),
}));
vi.mock("@jeeves/rest-server", () => ({
  sessionPrincipal: () => state.principal,
  publicOrigin: () => "https://qr.example.test",
}));
vi.mock("../src/jeeves.generated.ts", () => ({ database: { pool: { query: state.query } } }));

import feature from "../src/features/qr-image/index.ts";
import qr from "../src/generated/resources/qr.ts";

const id = "30c773da-31b0-4dd5-986a-beed1d303dce";
const request = { params: { id }, request: {} } as OperationRequest;
const download = () => feature.operations!.downloadQr!(request);

beforeEach(() => {
  state.principal = { id: "8706c825-1036-4bae-bcc1-b609cce6695e", csrfToken: "test" };
  state.query.mockReset().mockResolvedValue({ rows: [{ id }] });
});

test("requires a session before accessing the database", async () => {
  state.principal = undefined;
  expect((await download()).status).toBe(401);
  expect(state.query).not.toHaveBeenCalled();
});

test("uses the physical table and filters by both id and authenticated owner", async () => {
  await download();
  expect(state.query).toHaveBeenCalledWith(
    `SELECT "id" FROM "${qr.table}" WHERE "id" = $1 AND "owner_id" = $2`,
    [id, state.principal!.id],
  );
});

test.each(["absent", "owned by someone else"])("returns 404 when the scoped lookup is empty (%s)", async () => {
  state.query.mockResolvedValue({ rows: [] });
  const response = await download();
  expect(response.status).toBe(404);
  expect(response.body).toEqual({ error: "NOT_FOUND", message: "No such QR" });
});

test("downloads a decodable 512px PNG containing the public redirect URL", async () => {
  const response = await download();
  expect(response.status).toBe(200);
  expect(response.headers).toEqual({
    "content-type": "image/png",
    "content-disposition": `attachment; filename="${id}.png"`,
  });
  expect(Buffer.isBuffer(response.body)).toBe(true);
  const png = PNG.sync.read(response.body as Buffer);
  expect([png.width, png.height]).toEqual([512, 512]);
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  expect(decoded?.data).toBe(`https://qr.example.test/q/${id}`);
  // The image has a white quiet zone on every outer edge.
  for (let i = 0; i < 512; i++) {
    for (const pixel of [i, 511 * 512 + i, i * 512, i * 512 + 511]) {
      expect([...png.data.subarray(pixel * 4, pixel * 4 + 4)]).toEqual([255, 255, 255, 255]);
    }
  }
});

test("keeps identical bytes after destination edits and feature reloads", async () => {
  const before = await download();
  state.query.mockResolvedValue({ rows: [{ id, destination: "https://changed.example/path" }] });
  expect((await download()).body).toEqual(before.body);
  vi.resetModules();
  const reloaded = (await import("../src/features/qr-image/index.ts")).default;
  expect((await reloaded.operations!.downloadQr!(request)).body).toEqual(before.body);
});
