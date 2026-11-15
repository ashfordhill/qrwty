#!/usr/bin/env python3
"""Q13: render the offline record docs/evidence/q13/demo/index.html from demo-data.json.

  python3 docs/evidence/q13/commands/render-demo.py docs/evidence/q13/demo/demo-data.json \
      docs/evidence/q13/demo/index.html

One self-contained page: inline CSS, no script, no font, image or other request. Every value it
shows comes from the (already sanitized) data file; this script adds no result of its own.
"""
import html
import json
import sys

data = json.load(open(sys.argv[1]))
e = lambda v: html.escape("" if v is None else str(v))


def table(head, rows):
    out = ["<div class=scroll><table><thead><tr>", *[f"<th>{e(h)}</th>" for h in head], "</tr></thead><tbody>"]
    for r in rows:
        out.append("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>")
    out.append("</tbody></table></div>")
    return "".join(out)


badge = lambda s: f'<span class="b b-{e(s).replace(" ", "-")}">{e(s)}</span>'
code = lambda v: f"<code>{e(v)}</code>"

parts = []
parts.append(f"""<header><p class=kicker>QRWTY arm A · {e(data['run'])} · Q13 attempt 1</p>
<h1>{e(data['title'])}</h1><p class=lede>{e(data['lede'])}</p>
<dl class=facts>{''.join(f'<div><dt>{e(k)}</dt><dd>{e(v)}</dd></div>' for k, v in data['facts'].items())}</dl></header>""")

parts.append("<section><h2>Timeline</h2>" + table(["UTC", "What happened"], [[e(t["t"]), e(t["what"])] for t in data["timeline"]]) + "</section>")

parts.append("<section><h2>Services, revisions and health</h2>" + table(
    ["Process", "Kind", "Ingress / invoker", "Revision(s)", "Image", "Health"],
    [[code(s["name"]), e(s["kind"]), e(s["ingress"]), "<br>".join(code(r) for r in s["revisions"]), code(s["image"]), e(s["health"])] for s in data["services"]]) + "</section>")

parts.append("<section><h2>Probes P01–P12</h2>")
parts.append(table(["Probe", "Result", "Summary"], [[f'<a href="#{e(p["id"])}">{e(p["id"])}</a> {e(p["title"])}', badge(p["result"]), e(p["summary"])] for p in data["probes"]]))
for p in data["probes"]:
    parts.append(f'<article id="{e(p["id"])}"><h3>{e(p["id"])} · {e(p["title"])} {badge(p["result"])}</h3><p>{e(p["summary"])}</p>')
    if p.get("why"):
        parts.append(f"<p class=why>{e(p['why'])}</p>")
    if p.get("steps"):
        parts.append(table(["When (UTC)", "Step", "Request", "Answer", "ms"],
                           [[e(s.get("at")), e(s["step"]), code(s.get("request", "")), f"<pre>{e(s.get('response', ''))}</pre>", e(s.get("ms"))] for s in p["steps"]]))
    parts.append("</article>")
parts.append("</section>")

parts.append("<section><h2>A-found gaps the cloud revealed</h2>" + table(
    ["ID", "Severity", "Where", "Gap", "Workaround in Q13"],
    [[e(g["id"]), e(g["severity"]), e(g["where"]), e(g["gap"]), e(g["workaround"])] for g in data["gaps"]]) + "</section>")
parts.append("<section><h2>Deployment findings (A's own IaC and configuration)</h2>" + table(
    ["ID", "Finding", "Fix"], [[e(f["id"]), e(f["finding"]), e(f["fix"])] for f in data["findings"]]) + "</section>")

parts.append("<section><h2>Inventory while it ran (13:02Z; see Teardown for what is left)</h2>" + table(["Resource", "Type", "Notes"], [[code(i["name"]), e(i["type"]), e(i.get("notes", ""))] for i in data["inventory"]]) + "</section>")

c = data["cost"]
parts.append(f"<section><h2>Cost</h2><p>{e(c['summary'])}</p>" + table(
    ["Resource", "SKU", "Unit price (USD)", "Quantity", "USD per hour"],
    [[e(r["resource"]), code(r["sku"]), e(r["unitPriceUsd"]) + " / " + e(r["unit"]), e(r["quantity"]), e(r["usdPerHour"])] for r in c["rows"]]) + f"<p>{e(c['actual'])}</p></section>")

parts.append("<section><h2>Teardown</h2>" + table(["Step", "Result"], [[e(t["step"]), e(t["result"])] for t in data["teardown"]]) + "</section>")
parts.append(f"<footer><p>{e(data['footer'])}</p></footer>")

page = f"""<!doctype html>
<html lang=en><head><meta charset=utf-8><meta name=viewport content="width=device-width, initial-scale=1">
<title>QRWTY A deploy record</title>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<style>
:root{{--bg:#fbfaf7;--fg:#1d1b18;--mute:#5d5a54;--line:#d9d5cc;--card:#fff;--accent:#2d5be3;--ok:#1f7a45;--bad:#b3261e;--warn:#8a5a00;--skip:#5d5a54}}
@media (prefers-color-scheme:dark){{:root{{--bg:#151412;--fg:#ecebe7;--mute:#a6a29a;--line:#3a3833;--card:#1e1d1a;--accent:#8fb0ff;--ok:#6fd39a;--bad:#ff8a80;--warn:#f0c060;--skip:#a6a29a}}}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}}
header,section,footer{{max-width:1100px;margin:0 auto;padding:16px}}h1{{font-size:28px;margin:4px 0}}h2{{font-size:20px;border-bottom:2px solid var(--fg);padding-bottom:4px;margin-top:32px}}
h3{{font-size:16px;margin:24px 0 6px}}.kicker{{color:var(--mute);margin:0}}.lede{{font-size:17px}}.why{{color:var(--mute)}}
.facts{{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;margin:16px 0}}.facts div{{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px 10px}}
dt{{color:var(--mute);font-size:12px}}dd{{margin:0;font-weight:600}}
.scroll{{overflow-x:auto;border:1px solid var(--line);border-radius:8px;background:var(--card)}}table{{border-collapse:collapse;width:100%;font-size:13px}}
th,td{{text-align:left;vertical-align:top;padding:6px 8px;border-bottom:1px solid var(--line)}}th{{font-weight:600;background:var(--bg)}}
pre{{margin:0;white-space:pre-wrap;word-break:break-word;font:12px/1.4 ui-monospace,Menlo,Consolas,monospace;max-width:520px}}code{{font:12px ui-monospace,Menlo,Consolas,monospace;word-break:break-all}}
a{{color:var(--accent)}}.b{{display:inline-block;padding:0 8px;border-radius:10px;font-size:12px;font-weight:600;border:1px solid currentColor}}
.b-passed{{color:var(--ok)}}.b-failed{{color:var(--bad)}}.b-partial,.b-passed-after-fixes{{color:var(--warn)}}.b-not-run{{color:var(--skip)}}
footer{{color:var(--mute);font-size:13px;border-top:1px solid var(--line);margin-top:32px}}
</style></head><body>
{''.join(parts)}
</body></html>
"""
open(sys.argv[2], "w").write(page)
print(f"wrote {sys.argv[2]} ({len(page)} bytes)")
