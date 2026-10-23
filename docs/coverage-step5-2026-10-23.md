# Coverage expansion and duplicate audit — 23 October 2026

Production now includes 3,057 additional Storefront Scout ASINs as unverified discovery candidates. Existing candidates were never updated: the original-candidate checksum remains c8845e4c3baa47a60457b1917b8ff9ab. The candidate universe is 3,393 ASINs, with one hidden record excluded from matching.

Discovery prices retain the originating seller and observation timestamp. They are historical seller observations, not fresh buy-box prices. No seller price was borrowed from another seller. No discovery record was promoted into a verified identity or BUY recommendation.

## Detail recovery

Of 527 missing seller/ASIN detail records, 10 could reuse an existing capture of the same ASIN with the same title. These retain the original timestamp and source seller provenance. A public Amazon product-page pass then recovered labelled facts for 274 more records; 243 attempts did not produce an acceptable product page. Captures are partial and remain in the extension's pending queue. Product-page prices were not imported, and packaged dimensions and sell-pack quantities were not inferred. Explicit UPC/EAN facts are imported only when their check digits validate; raw labelled facts remain available for review.

There are still 243 missing detail records and 226 missing seller-price observations. Further Chrome captures and physical pack verification are required. Reused or partial facts do not mean these products are fully verified.

## Matching

A dated offline replay checked all 3,392 actionable ASINs against 4,495 active supplier offers. It returned 64 candidates: 63 parser STRONG and one REVIEW. Of these, 17 came from the new discovery import: 16 parser STRONG and one REVIEW. These are retrieval results requiring review, not validated product identities or net-profit recommendations. For example, Airheads 16g versus supplier 15g needs physical-size verification despite the parser's size tolerance. The Mr. Clean result resolves to a truncated supplier title and remains unsuitable without better evidence.

The API now defaults to 100 candidates per request and accepts limit=1..100 and offset>=0. Follow pagination.nextOffset until pagination.hasMore is false; each response's match totals describe that batch only. A production request beyond the original candidate range passed and reported total=3392. The replay JSON is a dated export, not a live shortlist.

## Duplicate review

The original scanned storefront catalogue contains 3,588 seller/ASIN records covering 3,172 ASINs. There are no duplicate seller/ASIN rows. Across sellers, 351 ASINs recur, accounting for 416 occurrences beyond one per ASIN. Preserve these seller observations; deduplicate the product view by ASIN.

Among the 827 ASINs with captured UPC/EAN facts, 13 normalized barcode groups span different ASINs. All 13 have valid check digits. There were no conflicting normalized barcodes for the same ASIN across the scanned detail captures. Barcode normalization makes UPC-A and its zero-prefixed EAN-13 equivalent. Coverage is incomplete, so these are lower-bound findings.

Barcode groups include both possible duplicate listings and distinct sell packs. Goldfish Cheddar 2/6/8-packs share a code, as do Ocean Spray single/3-pack and Jell-O Raspberry single/6-pack. Do not merge these sell packs. Sweet Baby Ray's 28oz has two ASINs with 792g/794g descriptions and merits review. Four punctuation/case-normalized exact-name groups also span different ASINs: Flying Goose Hoi Sin 455ml, Cinnamon Chex 343g, Preema Almond Essence 28ml and Thai Taste Red Curry Paste 400g. No duplicate records were deleted or merged. The audit JSON records examples and all 13 barcode groups, scoped before the new public-page captures.

## Validation and protection

Both recovery imports were tested on an isolated Neon branch; repeat inserts changed zero existing records. Checksums of verified candidates, master identities, supplier links and supplier barcodes remained unchanged in production. All 24 scanner, estimator and coverage tests passed. The production build passed with the repository's existing type-check skip; this does not establish a clean full TypeScript check. PR #9 deployed successfully.

The public recovery export records successful facts, source URLs and timestamps, plus failed attempts. Reproduce its insert-only SQL with scripts/public-details-import.cjs. The offline matching replay uses scripts/coverage-match.cjs with a dated database export; it does not write match approvals.
