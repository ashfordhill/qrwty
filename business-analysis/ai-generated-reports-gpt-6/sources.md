# Source register and evidence boundaries

**Reviewed 31 October 2026.** “Observed” means the cited document or code was inspected; it does not mean a supplier capability or customer outcome was independently audited. No customer interviews, checkout purchases or deployment evaluations were conducted.

## Supplied documents

| Source | Review scope | Use |
| --- | --- | --- |
| [Business-analysis introduction](../README.md) | Read | Origin, hardware/GPS need, concern about competition and sales |
| [Fable main report](../ai-generated-reports-fable-5.1/README.md) | Main analysis, price ladder, scenarios, sensitivity and recommendations reviewed | Prior ownership/cloud thesis and assumptions |
| [Fable field applications](../ai-generated-reports-fable-5.1/field-device-applications.md) | Executive analysis, placement discussion, platform and experiment conclusions reviewed | Field workflow and application alternatives |
| [Fable connected devices](../ai-generated-reports-fable-5.1/connected-device-opportunities.md) | Executive analysis, ranked opportunities, operational risks and experiments reviewed | Distinguish redirects from display/action jobs |
| [DeepSeek main report](../ai-generated-reports-deepseek-v4.1-flash-1017/README.md) | Main analysis and revision reviewed | Deployment distinction, founder assumptions, forecast and recommendations |
| [DeepSeek SaaS brief](../ai-generated-reports-deepseek-v4.1-flash-1017/saas-table-stakes-for-jeeves.md) | Purpose, principles, scope and conditional requirements reviewed; not a full architecture audit | Distinguish implementation proposal from market validation |
| [DeepSeek simulation](../ai-generated-reports-deepseek-v4.1-flash-1017/scripts/monte_carlo.py) and [data](../ai-generated-reports-deepseek-v4.1-flash-1017/data/monte_carlo_summary.csv) | Script inspected and reproduced in an isolated temporary directory | Numerical reproducibility and model assumptions |
| [DeepSeek competitor CSV](../ai-generated-reports-deepseek-v4.1-flash-1017/data/competitor-pricing.csv) | Reviewed | Price/billing comparability |

The reports' many secondary sources were not all revalidated. Figures such as syndicated market sizes, indie-company revenue, enterprise compliance costs and estimated search traffic are not newly verified facts in this contribution. Where discussed, they are attributed to the prior reports. Their forecasts share sources and assumptions and should not be pooled as independent evidence.

## Current public primary sources

| Source | Observation used | Evidence limitation |
| --- | --- | --- |
| [Hovercode pricing](https://hovercode.com/pricing/) | Pro $12/month, one domain; Business $39/month, ten domains and team/bulk/API features | Monthly list-price view; not a checkout test |
| [Dub Links pricing](https://dub.co/pricing/links) | Free includes QR codes and three custom domains; retrieved annual view shows Pro $27/month | Usage-limited free tier; annual effective monthly price is not monthly billing |
| [Dub general pricing](https://dub.co/pricing) | Default retrieved view shows Partners Business at $81/month | Wrong minimum-price comparator for standalone Links |
| [Quick Code pricing](https://quickcode.digital/pricing) | $250 one-time self-host, managed from $39/month, advertised enterprise annual band | Vendor offer only; inconsistent with dedicated enterprise page |
| [Quick Code enterprise](https://quickcode.digital/enterprise) | $5k/$10k/$20k one-time packages with differentiated delivery/support | Does not establish recurring renewal price or realised contracts |
| [Shlink](https://shlink.io/) | Self-hosting, web management, visit statistics, open-source licence | Vendor/project description; not deployed in this review |
| [Cloudflare redirects](https://developers.cloudflare.com/rules/url-forwarding/) | Single Redirects available on Free, with an allocation of rules | Customer still needs domain control and configuration |
| [Founder field notes, raw README](https://raw.githubusercontent.com/ashfordhill/qr-code-tracking/main/README.md) | Direct HTTP retrieval shows 89 posters and 257 recorded scans; durability/prototype history | Founder-reported field campaign, not demand research; web crawler's GitHub view was older than direct retrieval |
| [qrwty.io](https://qrwty.io/) | Unable to retrieve: web tool failure and direct HTTP 403 | Current marketing/pricing unverified; no inference of outage |

Only short facts and original synthesis are included; the reports do not reproduce supplier pages. Conflicting Quick Code pages are reported as unresolved rather than choosing the interpretation that produces the largest revenue estimate. The comparison does not infer that any vendor is making false claims.

## Local implementation evidence

| File | Observation | Scope limit |
| --- | --- | --- |
| [API element notes](../../jeeves/elements/qrwty.md) | Owner-scoped QR resources and declared extensions | Generated design description; not a live production audit |
| [Web element notes](../../jeeves/elements/qrwty-web.md) | Account flows, QR studio, request-count analytics | Instructions distinguish requests from unique visitors |
| [API contract](../../contracts/qrwty.openapi.yaml) | Existing operation/resource surface | Does not inventory every possible external business service |
| [Redirect feature](../../services/qrwty/src/features/redirect/index.ts) | Destination lookup and awaited scan insert precede a 302 response | Code-path dependency, not measured incident frequency |

No generated files or application features were edited for this analysis.

## New assumptions and derived numbers

Every new commercial model input is an assumption. The [economics script](scripts/economics.py) defines prices, fees, channel share, time value, support, contacts, purchase rates, churn and horizon. CSV files are derived outputs, not sourced market data. A $50/hour time value is a decision parameter, not a claim about the founder's actual wage.

The recommended experiment's time/cash limits, pricing, account/domain limits and continuation criteria are proposals. Three initial customers can justify another test; they cannot establish a stable retention or churn rate. No statistical success probability is estimated.
