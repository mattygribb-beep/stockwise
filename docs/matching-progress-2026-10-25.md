# Matching progress — 25 October 2026

Current production read: 3,392 non-hidden Amazon candidates, 6,151 active supplier offers, 58 master identities, 43 Amazon listings and 46 confirmed/verified supplier links before this change.

Four previously unmatched relationships were verified using the user-supplied labelled Amazon facts and supplier SKU/case details, corroborated by the current stored supplier UPCs. Product imagery alone was not used as identity evidence.

| ASIN | Product | Supplier SKU | Unit EAN | Amazon sell quantity | Supplier case quantity |
|---|---|---|---|---:|---:|
| B000SRHUNA | Jell-O Cherry 85g | JELL016 | 0043000200032 | 1 | 24 |
| B003ZZ8G76 | Jell-O Peach 85g | JELL039 | 0043000200247 | 1 | 24 |
| B005JD2YCU | Jell-O Grape 85g | JELL014 | 0043000200100 | 1 | 24 |
| B08KGQ6HZ6 | Nerds Big Chewy Theatre Box 120g | NERD027 | 0079200774479 | 1 | 12 |

The atomic repair was applied on the isolated buying-workflow database branch and repeated successfully before production application. It creates the four master identities, supplier links and single-unit Amazon listings, and updates candidate evidence. Existing identifiers and quotes are preserved. Repeating it does not create duplicates. Conflicting prior decisions, changed identifiers, size/case data or linked identities abort the transaction.

These are identity confirmations, not buying approvals or refreshed market quotes. Nerds listing flavour metadata says Strawberry, but the titled Big Chewy product and exact UPC identify the mixed-flavour theatre box shown in the supplied evidence; do not copy Strawberry into the canonical variant.

A read-only checksum-validated barcode comparison across the complete current catalogue found 24 ASINs with at least one exact stored supplier-code match (26 supplier pairs). This includes existing confirmations and known conflicts; it is not 24 new safe matches. Sonic Ocean Water remains unresolved because the captured Amazon UPC conflicts with the saved supplier code. Ice Breakers Duo remains unresolved because the captured Amazon details list multiple codes. Cinnamon Toast Crunch and Trident retain size/pack cautions.
