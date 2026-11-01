#!/usr/bin/env python3
"""Generate a log-scale bar chart of annual revenue per customer by segment."""
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHARTS = ROOT / "charts"
CHARTS.mkdir(exist_ok=True)

segments = [
    ("Free", 0),
    ("Starter\n$8/mo", 96),
    ("Pro\n$24/mo", 288),
    ("Agency\n$69/mo", 828),
    ("Self-host\n$149/yr", 149),
    ("Private deploy\n$20k/yr", 20_000),
    ("Enterprise\n$100k/yr", 100_000),
]

W, H = 900, 430
ML, MR, MT, MB = 80, 40, 50, 100
plot_w, plot_h = W - ML - MR, H - MT - MB
max_log = 5.0  # log10(100k)
bar_w = plot_w / len(segments) * 0.58
gap = plot_w / len(segments)

bars = []
labels = []
for i, (name, value) in enumerate(segments):
    x = ML + i * gap + (gap - bar_w) / 2
    if value <= 0:
        h = 0
        y = MT + plot_h
        label = "$0"
    else:
        h = (math.log10(value) / max_log) * plot_h
        y = MT + plot_h - h
        label = f"${value:,.0f}"
    bars.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{bar_w:.1f}" height="{h:.1f}" fill="#2f6f6a" rx="2" />')
    labels.append(f'<text x="{x + bar_w / 2:.1f}" y="{y - 7:.1f}" font-size="11" fill="#111827" text-anchor="middle" font-family="sans-serif">{label}</text>')
    # wrap name on newline
    parts = name.split("\n")
    for j, part in enumerate(parts):
        labels.append(f'<text x="{x + bar_w / 2:.1f}" y="{MT + plot_h + 20 + j * 14:.1f}" font-size="11" fill="#374151" text-anchor="middle" font-family="sans-serif">{part}</text>')

grid = []
for exp in range(0, 6):
    value = 10 ** exp
    y = MT + plot_h - (exp / max_log) * plot_h
    grid.append(f'<line x1="{ML}" y1="{y:.1f}" x2="{W - MR}" y2="{y:.1f}" stroke="#e5e7eb" stroke-width="1" />')
    grid.append(f'<text x="{ML - 8}" y="{y + 4:.1f}" font-size="10" fill="#6b7280" text-anchor="end" font-family="sans-serif">${value:,.0f}</text>')

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-label="Annual revenue per customer by segment">
  <rect width="{W}" height="{H}" fill="#ffffff" />
  <text x="{ML}" y="26" font-size="16" font-weight="700" fill="#111827" font-family="sans-serif">Annual revenue per customer, by segment (log scale)</text>
  {''.join(grid)}
  {''.join(bars)}
  {''.join(labels)}
  <line x1="{ML}" y1="{MT + plot_h}" x2="{W - MR}" y2="{MT + plot_h}" stroke="#111827" stroke-width="1.5" />
  <text x="{ML}" y="{H - 12}" font-size="11" fill="#6b7280" font-family="sans-serif">Prices are list prices or illustrative contract values; private/enterprise ranges from Quick Code's published enterprise band.</text>
</svg>
'''
(CHARTS / "revenue-per-customer.svg").write_text(svg)
print("wrote", CHARTS / "revenue-per-customer.svg")
