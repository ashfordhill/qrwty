#!/usr/bin/env python3
"""Reproduce the report's conditional economics; these are assumptions, not forecasts.

Standard library only. Run from any directory. Writes only this report's data folder.
All amounts are USD. Fractional accounts express scenario averages, not actual sales.
"""

import csv
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
MONTHS = 24
HOURLY_VALUE = 50.0
FIXED_CASH_MONTHLY = 100.0
GENERAL_HOURS_MONTHLY = 8.0
PAYMENT_RATE = 0.05


def write_csv(name, rows):
    DATA.mkdir(exist_ok=True)
    with (DATA / name).open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader()
        for row in rows:
            writer.writerow({key: round(value, 4) if isinstance(value, float) else value
                             for key, value in row.items()})


offers = [
    ("Individual direct", 12.0, 0.0, 0.10),
    ("Agency direct", 49.0, 0.0, 0.25),
    ("Agency via partner", 49.0, 0.20, 0.25),
    ("Agency premium via partner", 79.0, 0.20, 0.25),
]
units = []
targets = []
for name, price, partner_rate, support_hours in offers:
    support_value = support_hours * HOURLY_VALUE
    contribution = price * (1 - PAYMENT_RATE - partner_rate) - support_value
    units.append(dict(
        offer=name, price_monthly=price, payment_rate=PAYMENT_RATE,
        partner_rate=partner_rate, support_hours_monthly=support_hours,
        hourly_value=HOURLY_VALUE, support_value_monthly=support_value,
        contribution_after_support=contribution,
    ))
    for target in (0, 500, 1500, 3000):
        targets.append(dict(
            offer=name, target_economic_surplus_monthly=target,
            fixed_cash_monthly=FIXED_CASH_MONTHLY,
            general_hours_monthly=GENERAL_HOURS_MONTHLY,
            accounts_required=math.ceil((target + FIXED_CASH_MONTHLY
                                        + GENERAL_HOURS_MONTHLY * HOURLY_VALUE)
                                       / contribution),
        ))
write_csv("unit-economics.csv", units)
write_csv("income-targets.csv", targets)

monthly = []
summaries = []
for name, conversion in (("No sales", 0.0), ("Weak channel", 0.01),
                         ("Working channel", 0.025), ("Strong channel", 0.05)):
    accounts = revenue_total = cash_total = economic_total = 0.0
    qualified_contacts = 40
    churn = 0.02
    price = 49.0
    partner_rate = 0.20
    support_hours = 0.25
    acquisition_hours_per_sale = 1.0
    for month in range(1, MONTHS + 1):
        new_accounts = qualified_contacts * conversion
        accounts = accounts * (1 - churn) + new_accounts
        revenue = accounts * price
        cash_surplus = revenue * (1 - PAYMENT_RATE - partner_rate) - FIXED_CASH_MONTHLY
        hours = (GENERAL_HOURS_MONTHLY + accounts * support_hours
                 + new_accounts * acquisition_hours_per_sale)
        economic_surplus = cash_surplus - hours * HOURLY_VALUE
        revenue_total += revenue
        cash_total += cash_surplus
        economic_total += economic_surplus
        monthly.append(dict(
            scenario=name, month=month, qualified_contacts=qualified_contacts,
            contact_to_paid=conversion, monthly_churn=churn, new_accounts=new_accounts,
            price_monthly=price, payment_rate=PAYMENT_RATE, partner_rate=partner_rate,
            support_hours_per_account=support_hours,
            general_hours_monthly=GENERAL_HOURS_MONTHLY,
            acquisition_hours_per_sale=acquisition_hours_per_sale,
            hourly_value=HOURLY_VALUE, fixed_cash_monthly=FIXED_CASH_MONTHLY,
            active_accounts=accounts, mrr=revenue, cash_surplus=cash_surplus,
            founder_hours=hours, economic_surplus=economic_surplus,
        ))
    summaries.append(dict(
        scenario=name, qualified_contacts_monthly=qualified_contacts,
        contact_to_paid=conversion, new_accounts_monthly=new_accounts,
        monthly_churn=churn, month24_accounts=accounts, month24_mrr=revenue,
        month24_cash_surplus=cash_surplus, month24_founder_hours=hours,
        month24_economic_surplus=economic_surplus, revenue_24mo=revenue_total,
        cash_surplus_24mo=cash_total, economic_surplus_24mo=economic_total,
    ))
write_csv("channel-monthly.csv", monthly)
write_csv("channel-summary.csv", summaries)

private = []
for name, support_hours in (("Bounded support", 48.0), ("Heavy support", 120.0)):
    annual_price = 20000.0
    partner_rate = 0.20
    annual_tools = 1200.0
    delivery_hours = 24.0
    sales_hours = 60.0
    first_year = (annual_price * (1 - partner_rate) - annual_tools
                  - (support_hours + delivery_hours + sales_hours) * HOURLY_VALUE)
    renewal = (annual_price * (1 - partner_rate) - annual_tools
               - support_hours * HOURLY_VALUE)
    private.append(dict(
        scenario=name, annual_recurring_price=annual_price, partner_rate=partner_rate,
        tools_annual=annual_tools, support_hours_annual=support_hours,
        delivery_hours_first_year=delivery_hours, sales_hours_first_year=sales_hours,
        hourly_value=HOURLY_VALUE, first_year_economic_contribution=first_year,
        renewal_economic_contribution=renewal,
    ))
write_csv("private-deployment.csv", private)

for row in summaries:
    print(f"{row['scenario']}: M24 MRR ${row['month24_mrr']:.0f}; "
          f"cash ${row['month24_cash_surplus']:.0f}; "
          f"after time ${row['month24_economic_surplus']:.0f}; "
          f"24-month cash ${row['cash_surplus_24mo']:.0f}; "
          f"24-month after time ${row['economic_surplus_24mo']:.0f}")
