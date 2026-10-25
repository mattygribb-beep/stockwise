# Next matching batch — 25 October 2026

Five new single-unit Amazon–supplier relationships reviewed against refreshed labelled public Amazon page captures and current stored supplier codes. No image similarity was used. Supplier prices and availability were not refreshed by this repair.

| ASIN | Product | Supplier SKU | EAN | Amazon sell quantity | Supplier case quantity |
|---|---|---|---|---:|---:|
| B0004LZUJQ | Kool Aid Unsweetened Black Cherry 3.6g | KAID012 | 0043000955673 | 1 | 48 |
| B000PYB7U8 | Ice Breakers Sours 42g | ICEB002 | 0034000000982 | 1 | 8 |
| B01EY6Y3TO | Taco Bell Diablo Sauce 213g | TACOB002 | 0021000060627 | 1 | 12 |
| B079SKCVJK | Jelly Belly Ice Cream Mix Jelly Beans 70g | JBEL033L | 0071570004309 | 1 | 12 |
| B00LZ2EBWK | Twizzler Pull and Peel Cherry 172g | TWIZ012 | 0034000544431 | 1 | 12 |

## Evidence and cautions

- B0004LZUJQ: Kraft is the manufacturer; Kool-Aid is the product brand. Single 3.6g unsweetened sachet, not prepared drink volume. Source: https://www.amazon.co.uk/dp/B0004LZUJQ, captured 2026-10-25T22:52:39.814430+00:00.
- B000PYB7U8: Mixed Sours flavour established from full title and Set Name; do not replace with the truncated Apple metadata. Source: https://www.amazon.co.uk/dp/B000PYB7U8, captured 2026-10-25T22:52:44.879686+00:00.
- B01EY6Y3TO: Identity size 213g agrees across title, unit count and pack size. Item Weight 0.47 Ounces is contradictory and must not be used for fees or shipping. Source: https://www.amazon.co.uk/dp/B01EY6Y3TO, captured 2026-10-25T22:52:44.549337+00:00.
- B079SKCVJK: Identity is Ice Cream Mix jelly beans in a bag. Generic Flavour Jelly,Peanut and Item Form Cream metadata are unreliable and are not canonical facts. Source: https://www.amazon.co.uk/dp/B079SKCVJK, captured 2026-10-25T22:52:46.314405+00:00.
- B00LZ2EBWK: Specific UPC 034000544431 identifies Cherry Pull N Peel 6.1oz in Hershey SmartLabel. 6.1oz converts to 172.934691g, explaining Amazon 172.9g versus 172g title/unit count/supplier label; specific equivalence only, no general tolerance change. Source: https://www.amazon.co.uk/dp/B00LZ2EBWK, captured 2026-10-25T22:53:08.493377+00:00.

Twizzlers manufacturer reference: https://smartlabel.hersheys.com/034000544431-0011-en-US/index.html . This describes UPC 034000544431 and net weight 6.1oz. The size interpretation is specific to this UPC, supported by the same Amazon title, and does not broaden parser tolerance.

## Held for review

- Heinz Relish B071KX5NR9: Amazon title says bottle and structured container type says jar; supplier specifies squeeze packaging. Do not approve the packaging from UPC alone.
- Harry Potter Chocolate Frog B00600N5UQ: Amazon single/15g fields conflict with Number of Pieces 24; do not infer that this is the supplier 24-unit case or silently discard the conflict.
- Jell-O Black Cherry B0041B8J7K and Orange B002B66UIC: current page captures expose a title but no labelled product details; the single-unit sell quantity was not independently recaptured.
- Red Vines B000RHY1YW: fresh page failed title agreement; do not approve using its saved barcode.
- Red Vines B0012NLMP6: existing verified ASIN retained; Appleton alternative was researched but not added by this batch.
- Previous Sonic Ocean Water, Ice Breakers Duo, Cinnamon Toast Crunch and Trident cautions remain unchanged.

## Validation

The guarded atomic data repair was tested on the isolated buying-workflow branch, then repeated with complete table fingerprints unchanged. Deliberately changed supplier barcode and product description were rejected with all candidate, master, listing and supplier-link fingerprints unchanged. After these checks it was applied to production and verified through the public master-identities API. All five listings use pack quantity 1; supplier case quantities remain 48, 8, 12, 12 and 12. No existing supplier identifiers, quotes, previous confirmations, fees or buying decisions are overwritten.
