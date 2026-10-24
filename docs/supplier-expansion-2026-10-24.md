# Supplier expansion — 24 October 2026

Six suppliers added to the original ten catalogue suppliers. The directory also retains four existing research-only leads; two original catalogue suppliers missing from that directory have been restored. Catalogue registry: 16. Directory: 20.

| Supplier | First pull | Public quotes | Valid supplier barcodes | Explicit case counts | Scope |
|---|---:|---:|---:|---:|---|
| Appleton Sweets | 183 | 183 | 174 | 123 | American collection, including unavailable products |
| The Kandy King | 437 | 0 | 0 | 437 | American category, nine pages |
| Candy Theatre | 545 | 545 | 0 | 421 | Public catalogue, three feed pages |
| Sweets & Treats Wholesale | 130 | 130 | 0 | 126 | American category, eleven pages |
| Hollywood Candy Wholesale | 30 | 0 | 0 | 20 | Partial pilot: first three pages |
| Bon Bon’s Wholesale | 0 | 0 | 0 | 0 | Access challenge; enquiry needed |

Total: 1,325 supplier listings, 858 public quotes, 174 checksum-valid barcodes. These are supplier listings, not deduplicated physical products or verified Amazon matches. Appleton barcode scope may be an outer case; matching zero-padded numbers alone does not establish retail-unit identity.

Public quotes are retained in evidence tags with their capture time and VAT basis; approved case/unit costs remain zero until trade terms, VAT and packaging are reviewed. The UI displays captured quotes separately and labels unknown quantities. Numeric zero is the existing database sentinel for unavailable commercial costs, never a free product. Prices hidden behind login remain unavailable. No new identity approvals or BUY states.

Each source uses a fixed domain/path. Unsupported slugs are rejected before network access. Failed or repeated pagination fails before saving. New collectors never deactivate missing offers, and the existing preservation rules for manually supplied EANs and verified brand reviews remain intact. Hollywood has a deliberately partial scope; Bon Bon’s sync is disabled.

The directory holds public source links, checked date, contact routes, account requirements, ordering minimums, delivery thresholds and catalogue limitations. Unknown terms are stated as unknown. Delivery thresholds must not be read as order minimums. Existing directory entries retain their older check date.

Validation: isolated Neon branch registration and import, protected-data checksums, parser/collection guard tests, existing scanner/FBA/coverage tests, standalone TypeScript check, production build and deployed browser/API verification.
