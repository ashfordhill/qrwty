import { beforeEach, expect, test, vi } from "vitest";
import type { OperationRequest } from "@jeeves/service-runtime";

const state = vi.hoisted(() => ({
  principal: { id: "8706c825-1036-4bae-bcc1-b609cce6695e", csrfToken: "test" } as
    { id: string; csrfToken: string } | undefined,
  query: vi.fn(),
}));
vi.mock("@jeeves/rest-server", () => ({ sessionPrincipal: () => state.principal }));
vi.mock("../src/jeeves.generated.ts", () => ({ database: { pool: { query: state.query } } }));

import feature from "../src/features/activity/index.ts";
import qr from "../src/generated/resources/qr.ts";
import scan from "../src/generated/resources/scan.ts";

const id = "30c773da-31b0-4dd5-986a-beed1d303dce";
const activity = (from: unknown = "2024-02-28", to: unknown = "2024-03-01") =>
  feature.operations!.qrActivity!({ params: { id }, query: { from, to }, request: {} } as OperationRequest);

beforeEach(() => {
  state.principal = { id: "8706c825-1036-4bae-bcc1-b609cce6695e", csrfToken: "test" };
  state.query.mockReset().mockResolvedValueOnce({ rows: [{ id }] }).mockResolvedValue({ rows: [] });
});

test("requires a session before reading activity", async () => {
  state.principal = undefined;
  expect((await activity()).status).toBe(401);
  expect(state.query).not.toHaveBeenCalled();
});

test("restricts QR lookup to the authenticated owner and stops if no owned QR exists", async () => {
  state.query.mockReset().mockResolvedValue({ rows: [] });
  expect(await activity()).toEqual({ status: 404, body: { error: "NOT_FOUND", message: "No such QR" } });
  expect(state.query).toHaveBeenCalledExactlyOnceWith(
    `SELECT "id" FROM "${qr.table}" WHERE "id" = $1 AND "owner_id" = $2`,
    [id, state.principal!.id],
  );
});

test.each([
  [undefined, "2024-03-01"], ["2024-02-28", undefined],
  ["", "2024-03-01"], ["2023-02-29", "2023-03-01"],
  ["2024-02-30", "2024-03-01"], ["2024-2-28", "2024-03-01"],
  ["2024-02-28T00:00:00Z", "2024-03-01"],
  ["2024-03-01", "2024-02-28"], ["2024-01-01", "2025-01-01"],
])("rejects invalid range %s to %s", async (from, to) => {
  // Pass missing values directly so default arguments do not replace them.
  const result = await feature.operations!.qrActivity!({
    params: { id }, query: { from, to }, request: {},
  } as unknown as OperationRequest);
  expect(result.status).toBe(400);
  expect(state.query).not.toHaveBeenCalled();
});

test("includes zero-count days, leap day, and counts on both endpoints", async () => {
  state.query.mockResolvedValueOnce({ rows: [
    { date: "2024-02-28", count: 2 }, { date: "2024-03-01", count: 3 },
  ] });
  expect(await activity()).toEqual({ status: 200, body: { total: 5, days: [
    { date: "2024-02-28", count: 2 }, { date: "2024-02-29", count: 0 },
    { date: "2024-03-01", count: 3 },
  ] } });
  const [sql, params] = state.query.mock.calls[1]!;
  expect(params).toEqual([id, "2024-02-28", "2024-03-01"]);
  expect(sql).toContain(`FROM "${scan.table}"`);
  expect(sql).toContain(`WHERE "${scan.belongsTo[0].column}" = $1`);
  expect(sql).toContain(`"${scan.fields[0].column}" AT TIME ZONE 'UTC'`);
  expect(sql).toContain(`>= ($2::date::timestamp AT TIME ZONE 'UTC')`);
  expect(sql).toContain(`< (($3::date + 1)::timestamp AT TIME ZONE 'UTC')`);
});

test("returns one zero-count day for an empty single-day range", async () => {
  expect(await activity("2024-03-10", "2024-03-10")).toEqual({
    status: 200, body: { total: 0, days: [{ date: "2024-03-10", count: 0 }] },
  });
});

test("allows exactly 365 days apart, including 366 UTC dates", async () => {
  const result = await activity("2024-01-01", "2024-12-31");
  expect(result.status).toBe(200);
  const body = result.body as { total: number; days: { date: string; count: number }[] };
  expect(body.total).toBe(0);
  expect(body.days).toHaveLength(366);
  expect(body.days[0]).toEqual({ date: "2024-01-01", count: 0 });
  expect(body.days.at(-1)).toEqual({ date: "2024-12-31", count: 0 });
});
