#!/usr/bin/env node
// Q06: the link state diagram, written once as one element list and emitted twice:
//   docs/architecture/link-states.excalidraw  native Excalidraw elements (open with Excalidraw's Open)
//   docs/architecture/link-states.svg          the same geometry as plain SVG, which Chromium
//                                              (Playwright) screenshots to link-states.png
// The PNG is drawn from the same boxes, arrows and text as the source, not by Excalidraw's own
// exporter (no Excalidraw package is installed): shapes are straight, not hand-drawn.
//
//   node render-link-states.mjs <out dir> [<playwright package dir>]
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const out = resolve(process.argv[2] ?? "docs/architecture");
const playwrightDir = process.argv[3];
mkdirSync(out, { recursive: true });

const INK = "#1e1e1e";
const OWNER = "#1971c2";
const OPERATOR = "#c92a2a";
const SYSTEM = "#495057";
const W = 1540;
const H = 940;

const shapes = [];
const arrows = [];
const texts = [];
const box = (id, x, y, w, h, fill, label, sub, options = {}) =>
  shapes.push({ id, x, y, w, h, fill, label, sub, kind: options.kind ?? "rectangle", dark: options.dark });
const arrow = (id, from, to, points, color, label, labelAt, options = {}) =>
  arrows.push({ id, from, to, points, color, label, labelAt, dashed: options.dashed });
const note = (id, x, y, lines, size = 16, color = INK, w = 420) => texts.push({ id, x, y, lines, size, color, w });

note("title", 40, 28, ["Link states — QRWTY arm A (Q06)"], 28, INK, 900);
note("subtitle", 40, 70, [
  "One row per link in m_link_api_link_operations.links; the state, its version and a link_versions row change together in one transaction.",
], 15, SYSTEM, 1300);

box("start", 20, 250, 170, 90, "#d0ebff", "guest create", "POST /links (Q06)", { kind: "ellipse" });
box("active", 330, 230, 280, 130, "#d3f9d8", "active", "Redirect: 302 after the durable click");
box("disabled", 880, 230, 280, 130, "#fff3bf", "disabled", "Redirect: 410");
box("blocked", 330, 620, 280, 130, "#ffc9c9", "blocked", "Redirect: 403 safety page");
box("deleted", 880, 620, 280, 130, "#495057", "deleted (tombstone)", "Redirect: 410; terminal", { dark: true });

arrow("create", "start", "active", [[190, 295], [330, 295]], SYSTEM, ["v1, unowned,", "claim proof 24 h"], [198, 248]);
arrow("disable", "active", "disabled", [[610, 262], [880, 262]], OWNER, ["owner disables, or the", "account is deleted (owner removed)"], [632, 218]);
arrow("enable", "disabled", "active", [[880, 328], [610, 328]], OWNER, ["owner enables (owned links only)"], [640, 338]);
arrow("block", "active", "blocked", [[400, 360], [400, 620]], OPERATOR, ["operator blocks an", "active or disabled link", "(actor, reason, time)"], [222, 445]);
arrow("unblock", "blocked", "active", [[540, 620], [540, 360]], OPERATOR, ["operator unblocks:", "back to its prior state"], [552, 455]);
arrow("delete-active", "active", "deleted", [[610, 345], [880, 640]], OWNER, ["owner deletes"], [765, 455]);
arrow("delete-disabled", "disabled", "deleted", [[1060, 360], [1060, 620]], OWNER, ["owner deletes"], [1072, 480]);
arrow("delete-blocked", "blocked", "deleted", [[610, 705], [880, 705]], OWNER, ["owner deletes;", "the block record is kept"], [655, 715]);

note("legend", 1200, 140, ["Who moves a link"], 18, INK, 250);
note("legend-owner", 1200, 172, ["— owner (signed in, If-Match)"], 15, OWNER, 260);
note("legend-operator", 1200, 196, ["— operator (separate permission)"], 15, OPERATOR, 260);
note("legend-system", 1200, 220, ["— guest create"], 15, SYSTEM, 260);
note("rules", 1200, 270, [
  "Rules the database enforces",
  "• every change: version + 1 and one",
  "  link_versions row, in one transaction",
  "• a link row is never deleted; deleted",
  "  is terminal; the slug is never reissued",
  "• the slug, id and domain never change",
  "",
  "Rules the API enforces",
  "• a guest link is immutable until claimed",
  "• claim (Q07): owner set, proof consumed,",
  "  state unchanged, version + 1",
  "• owner enabling a blocked link:",
  "  409 blocked_by_operator",
  "• stale If-Match: 412; missing: 428",
  "",
  "Expiry is not a state",
  "• after expiresAt Redirect answers 410",
  "  while the state stays as it is",
], 15, INK, 330);
note("footer", 40, 870, [
  "Q06 implements guest create (the entry arrow). Claim, owner edits, disable, enable and delete are Q07; block and unblock are Q09; Redirect's answers are Q08.",
], 14, SYSTEM, 1300);

// ---- Excalidraw ----
let seed = 1;
const base = (id, type, x, y, width, height) => ({
  id, type, x, y, width, height, angle: 0, strokeColor: INK, backgroundColor: "transparent",
  fillStyle: "solid", strokeWidth: 2, strokeStyle: "solid", roughness: 1, opacity: 100,
  groupIds: [], frameId: null, roundness: null, seed: seed++, version: 1, versionNonce: seed * 7919,
  isDeleted: false, boundElements: [], updated: 1794700000000, link: null, locked: false,
});
const textEl = (id, x, y, w, lines, size, color, extra = {}) => ({
  ...base(id, "text", x, y, w, Math.round(lines.length * size * 1.25)),
  strokeColor: color, text: lines.join("\n"), originalText: lines.join("\n"), fontSize: size,
  fontFamily: 5, textAlign: "left", verticalAlign: "top", containerId: null, autoResize: true,
  lineHeight: 1.25, ...extra,
});
const elements = [];
for (const s of shapes) {
  const el = { ...base(s.id, s.kind, s.x, s.y, s.w, s.h), backgroundColor: s.fill, roundness: { type: 3 } };
  const labelId = `${s.id}-label`;
  el.boundElements = [{ type: "text", id: labelId }];
  for (const a of arrows) if (a.from === s.id || a.to === s.id) el.boundElements.push({ type: "arrow", id: a.id });
  elements.push(el);
  const lines = [s.label, s.sub];
  elements.push(textEl(labelId, s.x + 10, s.y + s.h / 2 - 25, s.w - 20, lines, 18, s.dark ? "#ffffff" : INK, {
    textAlign: "center", verticalAlign: "middle", containerId: s.id,
  }));
}
for (const a of arrows) {
  const [[x0, y0], [x1, y1]] = a.points;
  elements.push({
    ...base(a.id, "arrow", x0, y0, Math.abs(x1 - x0), Math.abs(y1 - y0)), strokeColor: a.color,
    strokeStyle: a.dashed ? "dashed" : "solid", roundness: { type: 2 },
    points: [[0, 0], [x1 - x0, y1 - y0]], lastCommittedPoint: null,
    startBinding: { elementId: a.from, focus: 0, gap: 4 }, endBinding: { elementId: a.to, focus: 0, gap: 4 },
    startArrowhead: null, endArrowhead: "arrow", elbowed: false,
  });
  elements.push(textEl(`${a.id}-text`, a.labelAt[0], a.labelAt[1], 260, a.label, 15, a.color));
}
for (const t of texts) elements.push(textEl(t.id, t.x, t.y, t.w, t.lines, t.size, t.color));
const scene = {
  type: "excalidraw", version: 2, source: "qrwty Q06 render-link-states.mjs", elements,
  appState: { viewBackgroundColor: "#eef4fb", gridSize: null }, files: {},
};
writeFileSync(join(out, "link-states.excalidraw"), `${JSON.stringify(scene, null, 2)}\n`);

// ---- SVG (the same geometry) ----
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const font = "font-family=\"Helvetica, Arial, sans-serif\"";
const svg = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
  `<rect width="${W}" height="${H}" fill="#eef4fb"/>`, "<defs>"];
for (const color of [OWNER, OPERATOR, SYSTEM])
  svg.push(`<marker id="m${color.slice(1)}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${color}"/></marker>`);
svg.push("</defs>");
for (const s of shapes) {
  if (s.kind === "ellipse")
    svg.push(`<ellipse cx="${s.x + s.w / 2}" cy="${s.y + s.h / 2}" rx="${s.w / 2}" ry="${s.h / 2}" fill="${s.fill}" stroke="${INK}" stroke-width="2"/>`);
  else svg.push(`<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="18" fill="${s.fill}" stroke="${INK}" stroke-width="2"/>`);
  const color = s.dark ? "#ffffff" : INK;
  svg.push(`<text x="${s.x + s.w / 2}" y="${s.y + s.h / 2 - 4}" text-anchor="middle" ${font} font-size="22" font-weight="bold" fill="${color}">${esc(s.label)}</text>`);
  svg.push(`<text x="${s.x + s.w / 2}" y="${s.y + s.h / 2 + 24}" text-anchor="middle" ${font} font-size="16" fill="${color}">${esc(s.sub)}</text>`);
}
for (const a of arrows) {
  const [[x0, y0], [x1, y1]] = a.points;
  svg.push(`<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${a.color}" stroke-width="2.5" marker-end="url(#m${a.color.slice(1)})"/>`);
  a.label.forEach((line, i) =>
    svg.push(`<text x="${a.labelAt[0]}" y="${a.labelAt[1] + 15 + i * 19}" ${font} font-size="15" fill="${a.color}">${esc(line)}</text>`));
}
for (const t of texts)
  t.lines.forEach((line, i) =>
    svg.push(`<text xml:space="preserve" x="${t.x}" y="${t.y + t.size + i * t.size * 1.3}" ${font} font-size="${t.size}" fill="${t.color}"${i === 0 && t.size >= 18 ? ' font-weight="bold"' : ""}${t.id === "rules" && /^(Rules|Expiry)/.test(line) ? ' font-weight="bold"' : ""}>${esc(line)}</text>`));
svg.push("</svg>");
writeFileSync(join(out, "link-states.svg"), `${svg.join("\n")}\n`);

if (playwrightDir) {
  const require = createRequire(join(resolve(playwrightDir), "package.json"));
  const { chromium } = require("@playwright/test");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.setContent(`<html><body style="margin:0">${svg.join("\n")}</body></html>`);
  await page.screenshot({ path: join(out, "link-states.png"), clip: { x: 0, y: 0, width: W, height: H } });
  await browser.close();
}
console.log(JSON.stringify({ ok: true, out, elements: elements.length, png: Boolean(playwrightDir) }));
