# Third matching batch — 25 October 2026

Six additional ASIN relationships manually reviewed using explicit Amazon brand/product/variant, unit size, container format and sell-pack facts, against saved supplier SKU records. This is not six exact-barcode matches: missing supplier retail codes remain unknown. Imagery was not used. Supplier quotes, stock, VAT and commercial holds are not refreshed or approved.

| ASIN | Product | Supplier | Amazon pack | Supplier quantity |
|---|---|---|---:|---:|
| B08NFBB83S | Nerds Big Chewy Theatre Box 120g | Sweet & Glory | 2 | 12 |
| B00RW65P5A | Kraft Hickory Smoke BBQ Sauce 496g | Sweet & Glory | 1 | 12 |
| B002E2N43C | Millions Strawberry Flavour - 1 x 2.27kg Jar | Wholesale Sweets | 1 | 1 |
| B003T3QKA4 | Millions Bubblegum Jar 2.27kg | Wholesale Sweets | 1 | 1 |
| B01LTIQ3V6 | Millions Cola Jar 2.27kg | Wholesale Sweets | 1 | 1 |
| B0CTVHB9Z6 | Nerds Gummy Clusters Very Berry 524g Bag | The Kandy King | 1 | 5 |

## Recorded evidence

- B08NFBB83S: Two 120g theatre boxes per Amazon sale: total 240g. Reuse existing Big Chewy 120g master and verified Sweet & Glory supplier link; 12 supplier boxes yield six Amazon two-packs. No assembled-pack barcode was exposed. Amazon: https://www.amazon.co.uk/dp/B08NFBB83S (captured 2026-10-25T23:08:54.670752+00:00); supplier: https://sweetandglory.com/brands/n-p/nerds-wholesale-uk (stored record last seen 2026-10-24T18:57:59.720Z).
- B00RW65P5A: Kraft Hickory Smoke sauce, one 496g bottle. Amazon retail UPC is explicit; supplier barcode remains unknown. Identity established from product brand, Hickory Smoke variant, 496g and bottle format plus the exact stored supplier SKU. Supplier page independently corroborates KRAFT009 and 12ct. Amazon: https://www.amazon.co.uk/dp/B00RW65P5A (captured 2026-10-25T23:08:54.608634+00:00); supplier: https://sweetandglory.com/brands/i-m/kraft-wholesale-uk (stored record last seen 2026-10-24T18:57:59.720Z).
- B002E2N43C: One original Millions Strawberry 2.27kg jar. Exact brand, flavour, jar format and quantity agree with saved supplier record. No Amazon or supplier retail barcode exposed. Supplier page could not be refreshed; stored quote/stock remain historical. Amazon: https://www.amazon.co.uk/dp/B002E2N43C (captured 2026-10-25T23:09:03.883311+00:00); supplier: https://www.wholesalesweets.co.uk/millions-jar-strawberry (stored record last seen 2026-10-24T18:58:24.669Z).
- B003T3QKA4: One original Millions Bubblegum 2.27kg jar. Title establishes Bubblegum despite generic Fruit flavour metadata. Brand, jar format, weight and single pack agree with saved supplier record. No retail barcode exposed; supplier page no longer exposes product details, so quote/stock are historical. Amazon: https://www.amazon.co.uk/dp/B003T3QKA4 (captured 2026-10-25T23:09:03.835310+00:00); supplier: https://www.wholesalesweets.co.uk/millions-jar-bubblegum (stored record last seen 2026-10-24T18:58:24.669Z).
- B01LTIQ3V6: One original Millions Cola 2.27kg jar. Exact brand, Cola title, jar format, weight and single pack agree with saved supplier record. No retail barcode exposed; supplier page refresh did not expose product details, so quote/stock are historical. Amazon: https://www.amazon.co.uk/dp/B01LTIQ3V6 (captured 2026-10-25T23:09:08.689318+00:00); supplier: https://www.wholesalesweets.co.uk/millions-jar-cola (stored record last seen 2026-10-24T18:58:24.669Z).
- B0CTVHB9Z6: One Very Berry resealable 18.5oz bag per Amazon sale. 18.5oz is 524.466g, corresponding to the saved supplier 524g unit label; supplier case is five bags. Specific unit conversion only, no parser tolerance change. Amazon retail UPC is explicit but supplier retail barcode remains unknown; supplier page could not be independently refreshed. Commercial hold remains, including unknown VAT and supplier price. Amazon: https://www.amazon.co.uk/dp/B0CTVHB9Z6 (captured 2026-10-25T23:09:08.598894+00:00); supplier: https://www.thekandyking.co.uk/nerds-gummy-clusters-very-berry-family-pack-5x524g/ (stored record last seen 2026-10-24T19:03:53.119Z).

## What was preserved

Nerds two-pack reuses existing master 62 and its Sweet & Glory supplier link; it creates a separate ASIN listing with pack quantity two. It does not create a duplicate physical product identity or claim the individual-unit UPC identifies the assembled two-pack. New retail UPC facts for Kraft and Very Berry are retained with source timestamps and fill candidate UPC only when blank. No supplier EAN is invented or replaced.

Three Millions relationships rely on explicit matching saved supplier descriptions rather than successful current supplier-page retrieval. Their availability and pricing therefore remain historical. The Kandy King Very Berry relationship similarly retains its commercial hold and unknown supplier price/VAT.

## Holds and findings

- Baileys Birthday Cake B0CTCWGS89: title and unit count 135g conflict with Size 205g.
- Millions Raspberry B012ZTDBXG: Brand Name GONDMAX and Item Package Quantity 23 conflict with the apparent single Millions jar.
- Warheads Wedgies B0C59FSFCL: Number of Items 3, package quantity 1 and number of pieces 12 do not establish a safe sell quantity.
- Cadbury Caramello Koala B017E1S9FK: distinguish 12 internal pieces in a 180g sharepack from 12 consumer packs; current size metadata is ambiguous.
- Royale Army & Navy B013GCFXPA: current page did not expose product title.
- Nerds Very Berry B0DCW1N9N8: The American Store brand metadata needs review; kept separate from B0CTVHB9Z6.
- Guinness Mini Caramels B0CXJ8W4Z9: retain as a research lead; brand licensing and supplier pack evidence still need review.
- Candy Cargo Big Chewy public page labels 00079200678050 as Barcode (box), with Barcode (each) blank. Do not overwrite saved retail codes with that outer-box value or use it as evidence of retail-code equality. No alternative supplier link was created by this batch.

## Validation

Applied to the isolated buying-workflow database branch, repeated without changing complete candidate/master/link/listing fingerprints, and tested with deliberately changed supplier barcode and product description. Both conflicts abort without changing those fingerprints. Production application is verified through the live master-identities endpoint: six ASIN listings, five new underlying masters, and five new supplier links; the two-pack reuses its existing supplier link. This produces no new buying approval.
