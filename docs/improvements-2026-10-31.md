# Source Stack improvements — 31 October 2026

## Finding products and reviewing matches

- Suggestions scan every active unlinked offer in the configured supplier catalogues. The former 2,000-offer cutoff is removed; reviewed links are eligible for review again while confirmed and verified links remain protected.
- Corrected the supplier-case/consumer-pack argument order. Valid UPC/EAN values are compared after removing equivalent zero padding. Conflicting valid barcodes, known origins, sizes and inadequate case quantities remain blocked. Invalid codes cannot earn exact-barcode confidence.
- All suggestions are returned and displayed in pages of 50. Scores are shown as matching scores out of 100, not probability percentages. No suggestions are automatically confirmed and no purchases are approved by these changes.
- Wholesale displays 100 products per page. Search and sorting operate on the complete supplier catalogue before pagination. Confirmed, verified and completed identities use consistent badges.

## Supplier sync and changes

- Offer updates, effective snapshots, change summaries, deactivation and successful completion are one database transaction. A supplier-row lock serializes concurrent saves. A failed save retains its failure record while rolling back catalogue changes.
- Missing offers are deactivated only with explicit evidence of complete catalogue coverage. A page limit, missing response schema, repeated page or partial collector cannot establish completeness. More than 25% of previously active offers disappearing also holds back deactivation for review.
- Shopify collectors provide terminal-page coverage evidence. HTML/discovery collectors conservatively retain unseen offers. Sweet & Glory, Hancocks and Americatessen no longer silently skip failed pages and save a reduced result.
- Existing rows, first-seen times, identifiers, verified brands and unbranded decisions survive returning/partial scans. Unseen retained offers keep their original check dates.
- Wholesale has a Supplier Changes panel with run history, price/pack/availability changes, new and returning products and retained inactive records. New successful runs record exact totals and a bounded preview of 200 changes; old runs explicitly predate tracking. Large previews prioritize price and pack changes. This is not a full historical change backfill.
- Sync progress explains when unseen offers were retained. Saved catalogue counts now distinguish current saved offers from offers observed by the latest scan.

## Loading, mobile and data transfer

- One failed catalogue no longer discards successfully loaded suppliers. Errors are supplier-specific, retryable, and distinct from an empty catalogue; previously loaded data remains visible.
- Supplier/identifier changes invalidate Buying Desk's public-data cache. An older in-flight request cannot restore a stale cache after invalidation.
- Fixed the desktop profile row overriding its phone visibility rule and causing 24 pixels of horizontal page overflow. Mobile profile access remains available through the header avatar.
- Buying Desk selects only consumed Amazon/observation columns and package fact fields. Captured product-detail records win over partial records at the same scan timestamp, with a stable seller tie-break.
- On the isolated database copy, the complete buying response matched the full-column reference using the same deterministic tie order. Serialized database rows decreased from 11,682,039 to 5,682,377 bytes (51%). This measures database response payload, not an internet latency guarantee.

## Verification

- `npm test`: 157 tests passed, covering existing buying/matching/navigation behavior plus collector failure modes, coverage gating, partial loads, identifier handling and cache invalidation.
- `npm run typecheck` and `npm run build` pass.
- 15 real database integration tests pass on the isolated `source-stack-sync-20261031` branch. They cover partial/complete scans, large removals, reactivation, preserved row identity, snapshots, concurrent saves, cross-supplier run isolation, and a deliberately failed snapshot insert proving transaction rollback.
- `scripts/buying-pool-projection.integration.cjs` compares complete results against the full-column reference and protects the captured 180g package-weight regression.
- `scripts/identity-suggestions.integration.cjs` compares the old and updated matcher against configured supplier catalogues, excluding synthetic fixture suppliers from both measurements. The comparable catalogue-only run increases suggestions from 32 to 112 from 6,096 unlinked offers; these are manual review candidates.
- Local Chromium checks passed at 1440px and 390px widths: change filtering, catalogue pagination, all match pages, empty searches, one-supplier failure isolation, API validation and all 13 menu destinations. Phone document width equals viewport width; no uncaught browser errors were recorded.

No production database fixtures, migrations or identity approvals are required. Integration scripts refuse to run fixture writes against an endpoint other than the isolated test branch. Existing VAT, exact sell-pack, fee, eligibility, market and checkout checks remain in place before buying.
