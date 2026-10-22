# Demand Trends Watchlist rollout

- Route: /demand-trends; API: /api/demand-trends.
- Seeded 80 US/Canadian import research candidates, across eight categories.
- Google volume is only included where published retailer-reported brand-level evidence exists. Do not claim variant-specific volume or trends.
- Read-only cross-reference to existing active supplier_offers; broad brand token matches are discovery leads only.
- No supplier SKU is treated as a barcode; no verified EAN/UPC, ASIN, or identity record is modified.
- No existing Neon schema or rows are modified.
- Next iteration: add an authenticated ingestion workflow for licensed Google Ads Keyword Planner exports / Google Trends observations; store time series with source and collection timestamp. Derive trend status only from actual comparable observations.
- Add a navigation entry after verifying the current main app menu design. New page is accessible directly at /demand-trends.
- Expansion: future watchlist additions should be stored in a dedicated reviewed watchlist table, not automatically inferred from loose text matching.
- Validation required: CI build, deployment preview, query performance and access controls before production merge.
