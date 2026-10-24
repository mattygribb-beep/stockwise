# Four European/French supplier collectors — 24 October 2026

The catalogue registry now contains 20 suppliers; the wider directory contains 24 including earlier research-only leads. Four new, distinct businesses have directory profiles and working sync paths. Supplier registration was tested on an isolated Neon branch before production registration. Product pulls were tested read-only; the user intends to run the saved sync.

| Supplier | Initial scope | Tested listings | Public quotes | Valid barcodes |
|---|---|---:|---:|---:|
| Epicerie Corner | French biscuit collection | 168 | 168 retail | 135 |
| Delicatezza | Public Italian biscuit collection | 124 | 124 retail | 107 |
| The Catering Mart | Biscuit collection, UK and European brands | 129 | 129 public catalogue | 106 |
| Auguste Noel | French category | 88 | 0: trade account required | 0 |

Totals: 509 listings, 421 public quotes, 348 checksum-valid barcodes. Counts include variants and unavailable items; they are not verified Amazon matches. Availability is reported only where explicitly supplied. Barcodes can refer to a retail pack or outer case, and their scope needs review.

Epicerie Corner and Delicatezza quotes are explicitly labelled RETAIL QUOTE ONLY. Their public numbers are not wholesale rates. Delicatezza listings marked Wholesale or Special Order are excluded from this public-price collector. Auguste Noel's embedded SortPrice metadata is ignored because actual pricing requires an approved trade login. Its catalogue provides SKU, written title and case count, not confirmed availability.

Retail quote pack counts do not establish wholesale case quantities. Such cases remain unconfirmed. Nested quantities are left for review. All captured quotes are held separately from approved buying costs, preserving the existing commercial guards.

Sync uses the existing catalogue store and EAN/verified-brand preservation rules. New collectors do not deactivate missing offers. A failed catalogue pull saves nothing; barcode page failures are recorded and do not overwrite saved codes. Preview requests (`preview=1`) are read-only and do not perform barcode enrichment. Sync responses return a small receipt; the client loads the saved catalogue after success.

Validation: 32 scanner/FBA/coverage/collector tests passed, including new guards for gated prices, retail case ambiguity and nested quantities. Standalone TypeScript and production build passed. Deployment verification checks supplier profiles, selectors, read-only preview responses and disabled/labelled pricing states. Existing supplier offers and identity records are not changed by registration.
