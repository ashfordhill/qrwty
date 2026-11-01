#!/usr/bin/env python3
"""Monte Carlo for a qrwty-like hosted QR micro-SaaS.

Pure standard library. Outputs CSV summaries and an SVG histogram.

The model is intentionally simple: monthly free signups, a conversion rate booked
in the signup month, monthly logo churn, and a blended ARPA. It models the paid
cloud only; self-host licence revenue is zero. Costs are hosting/tools plus 5%
payment fees. Founder time is not a cash cost.

Inputs are distributions, not point estimates. The point is to show the shape of
the outcome space, not to predict a number.
"""
from __future__ import annotations

import csv
import math
import random
import statistics
from pathlib import Path

random.seed(20261031)
ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
CHARTS = ROOT / "charts"
DATA.mkdir(exist_ok=True)
CHARTS.mkdir(exist_ok=True)

N = 40_000
MONTHS = 24
FIXED_COST = 55.0  # hosting + domain + email + monitoring, USD/month
PAYMENT_FEE = 0.05


def lognormal(median: float, sigma: float, lo: float, hi: float) -> float:
    value = median * math.exp(random.gauss(0.0, sigma))
    return max(lo, min(hi, value))


def beta_like(median: float, sigma: float, lo: float, hi: float) -> float:
    """Logit-normal bounded to a sensible range."""
    m = math.log(median / (1.0 - median))
    x = 1.0 / (1.0 + math.exp(-(m + random.gauss(0.0, sigma))))
    return max(lo, min(hi, x))


def trunc_normal(mean: float, sd: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, random.gauss(mean, sd)))


def one_run(abandon: bool = False) -> dict:
    if abandon and random.random() < 0.25:
        return {
            "mrr24": 0.0,
            "profit24": 0.0,
            "customers24": 0.0,
            "signups": 0,
            "conversion": 0.0,
            "churn": 0.0,
            "arpa": 0.0,
            "growth": 0.0,
            "start_signups": 0.0,
            "abandoned": 1,
        }

    start_signups = lognormal(60.0, 1.0, 4.0, 600.0)
    growth = trunc_normal(0.035, 0.020, -0.02, 0.10)
    conversion = beta_like(0.030, 0.65, 0.002, 0.20)
    churn = beta_like(0.055, 0.35, 0.015, 0.20)
    arpa = lognormal(13.0, 0.30, 5.0, 40.0)

    customers = 0.0
    cumulative_revenue = 0.0
    cumulative_cost = 0.0
    total_signups = 0.0

    for month in range(MONTHS):
        signups = start_signups * ((1.0 + growth) ** month)
        total_signups += signups
        new_payers = signups * conversion
        customers = customers * (1.0 - churn) + new_payers
        revenue = customers * arpa
        cumulative_revenue += revenue
        cumulative_cost += FIXED_COST + revenue * PAYMENT_FEE

    return {
        "mrr24": customers * arpa,
        "profit24": cumulative_revenue - cumulative_cost,
        "customers24": customers,
        "signups": total_signups,
        "conversion": conversion,
        "churn": churn,
        "arpa": arpa,
        "growth": growth,
        "start_signups": start_signups,
        "abandoned": 0,
    }


def pct(values: list[float], p: float) -> float:
    ordered = sorted(values)
    idx = min(len(ordered) - 1, max(0, round(p * (len(ordered) - 1))))
    return ordered[idx]


def summarise(runs: list[dict], label: str) -> dict:
    mrr = [r["mrr24"] for r in runs]
    profit = [r["profit24"] for r in runs]
    out = {
        "label": label,
        "n": len(runs),
        "mrr_p10": pct(mrr, 0.10),
        "mrr_p25": pct(mrr, 0.25),
        "mrr_p50": pct(mrr, 0.50),
        "mrr_p75": pct(mrr, 0.75),
        "mrr_p90": pct(mrr, 0.90),
        "mrr_p95": pct(mrr, 0.95),
        "mrr_p99": pct(mrr, 0.99),
        "profit_p10": pct(profit, 0.10),
        "profit_p50": pct(profit, 0.50),
        "profit_p90": pct(profit, 0.90),
        "prob_mrr_gt_100": sum(1 for x in mrr if x > 100) / len(mrr),
        "prob_mrr_gt_1000": sum(1 for x in mrr if x > 1000) / len(mrr),
        "prob_mrr_gt_3000": sum(1 for x in mrr if x > 3000) / len(mrr),
        "prob_mrr_gt_10000": sum(1 for x in mrr if x > 10000) / len(mrr),
        "prob_mrr_lt_100": sum(1 for x in mrr if x < 100) / len(mrr),
        "prob_profit_gt_10k": sum(1 for x in profit if x > 10000) / len(mrr),
        "prob_profit_gt_50k": sum(1 for x in profit if x > 50000) / len(mrr),
        "mean_mrr": statistics.fmean(mrr),
        "mean_profit": statistics.fmean(profit),
    }
    return out


conditional = [one_run(abandon=False) for _ in range(N)]
unconditional = [one_run(abandon=True) for _ in range(N)]

rows = [summarise(conditional, "conditional on shipping and some traction"), summarise(unconditional, "including 25% chance of abandonment")]

rounded = []
for row in rows:
    clean = {}
    for key, value in row.items():
        if not isinstance(value, float):
            clean[key] = value
        elif key.startswith("prob_"):
            clean[key] = round(value, 4)
        else:
            clean[key] = round(value, 2)
    rounded.append(clean)

with (DATA / "monte_carlo_summary.csv").open("w", newline="") as fh:
    writer = csv.DictWriter(fh, fieldnames=list(rounded[0].keys()))
    writer.writeheader()
    writer.writerows(rounded)

# Sensitivity: Pearson correlation of each input with log(1 + MRR), conditional runs.
def corr(xs: list[float], ys: list[float]) -> float:
    mx, my = statistics.fmean(xs), statistics.fmean(ys)
    num = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    dx = math.sqrt(sum((x - mx) ** 2 for x in xs))
    dy = math.sqrt(sum((y - my) ** 2 for y in ys))
    return num / (dx * dy) if dx and dy else 0.0

log_mrr = [math.log1p(r["mrr24"]) for r in conditional]
sens = []
for key in ["start_signups", "growth", "conversion", "churn", "arpa"]:
    xs = [r[key] for r in conditional]
    sens.append({"input": key, "correlation_with_log_mrr": corr(xs, log_mrr)})
sens.sort(key=lambda r: abs(r["correlation_with_log_mrr"]), reverse=True)
with (DATA / "monte_carlo_sensitivity.csv").open("w", newline="") as fh:
    writer = csv.DictWriter(fh, fieldnames=["input", "correlation_with_log_mrr"])
    writer.writeheader()
    writer.writerows(sens)

# Histogram of conditional MRR, clipped to $0-$10k, 40 bins.
values = [min(10000.0, r["mrr24"]) for r in conditional]
bins = 40
width = 10000.0 / bins
counts = [0] * bins
for v in values:
    counts[min(bins - 1, int(v / width))] += 1
max_share = max(counts) / len(values)

W, H = 900, 440
ML, MR, MT, MB = 80, 30, 40, 70
plot_w, plot_h = W - ML - MR, H - MT - MB
bar_w = plot_w / bins
bars = []
for i, c in enumerate(counts):
    share = c / len(values)
    h = (share / max_share) * plot_h
    x = ML + i * bar_w
    y = MT + plot_h - h
    bars.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{bar_w - 1:.1f}" height="{h:.1f}" fill="#2f6f6a" />')

# percentile markers
def xpos(v: float) -> float:
    return ML + (min(v, 10000.0) / 10000.0) * plot_w

markers = []
for p, label, colour in [(0.50, "P50", "#c2410c"), (0.90, "P90", "#7c3aed"), (0.95, "P95", "#1d4ed8")]:
    v = pct([r["mrr24"] for r in conditional], p)
    x = xpos(v)
    markers.append(
        f'<line x1="{x:.1f}" y1="{MT}" x2="{x:.1f}" y2="{MT + plot_h}" stroke="{colour}" stroke-width="2" stroke-dasharray="5 4" />'
        f'<text x="{x + 5:.1f}" y="{MT + 18}" font-size="12" fill="{colour}" font-family="sans-serif">{label} ${v:,.0f}</text>'
    )

grid = []
for i in range(6):
    v = i * 2000
    x = xpos(v)
    grid.append(f'<line x1="{x:.1f}" y1="{MT}" x2="{x:.1f}" y2="{MT + plot_h}" stroke="#e5e7eb" stroke-width="1" />')
    grid.append(f'<text x="{x:.1f}" y="{MT + plot_h + 18}" font-size="11" fill="#6b7280" text-anchor="middle" font-family="sans-serif">${v // 1000}k</text>')

# y-axis: share of runs
y_ticks = []
for pct in [0, 10, 20, 30, 40]:
    share = pct / 100
    if share > max_share * 1.05:
        continue
    y = MT + plot_h - (share / max_share) * plot_h
    y_ticks.append(f'<line x1="{ML - 6}" y1="{y:.1f}" x2="{ML}" y2="{y:.1f}" stroke="#111827" stroke-width="1" />')
    y_ticks.append(f'<text x="{ML - 10}" y="{y + 4:.1f}" font-size="10" fill="#6b7280" text-anchor="end" font-family="sans-serif">{pct}%</text>')

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-label="Distribution of month-24 MRR">
  <rect width="{W}" height="{H}" fill="#ffffff" />
  <text x="{ML}" y="24" font-size="16" font-weight="700" fill="#111827" font-family="sans-serif">Modelled month-24 MRR, 40,000 runs (conditional on shipping)</text>
  {''.join(grid)}
  {''.join(bars)}
  {''.join(markers)}
  {''.join(y_ticks)}
  <line x1="{ML}" y1="{MT + plot_h}" x2="{W - MR}" y2="{MT + plot_h}" stroke="#111827" stroke-width="1.5" />
  <text x="{ML}" y="{H - 30}" font-size="12" fill="#374151" font-family="sans-serif">Month-24 MRR, clipped at $10,000. Bar height = share of runs. The first bar includes all outcomes under $250.</text>
  <text x="{ML}" y="{H - 14}" font-size="11" fill="#6b7280" font-family="sans-serif">The model is illustrative, not a forecast. See the appendix for assumptions.</text>
</svg>
'''
(CHARTS / "monte-carlo-mrr.svg").write_text(svg)

# Print a human-readable summary.
for row in rows:
    print(row)
print("sensitivity:")
for row in sens:
    print(row)
print("Fable case percentiles (conditional):")
conditional_mrr = sorted(r["mrr24"] for r in conditional)
for value in [149, 1215, 3662]:
    cdf = sum(1 for x in conditional_mrr if x <= value) / len(conditional_mrr)
    print(f"  ${value}: P{cdf * 100:.1f}")
