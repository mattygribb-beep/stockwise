# Full matching review — 25 October 2026

Screened all 3,392 non-hidden Amazon catalogue candidates against 6,151 active supplier offers. The production matching rules returned 192 possible matches (96 STRONG and 96 REVIEW); these are retrieval scores, not identity approvals. The other 3,200 listings have no safe candidate from this matcher. Of those, 665 have a high-title-overlap rejected neighbour: 407 unit-size conflicts, 152 brand conflicts, 74 family conflicts, 14 variant conflicts and 18 other rejection reasons. No supplier was invented for the remainder.

The app review queue now contains those 192 suggestions plus 18 earlier records retained from the historical audit or verified identity records. Every ASIN appears once:

| Review outcome | Records |
|---|---:|
| Linked supplier pair without an open identity conflict in this review | 23 |
| Needs a manual product/pack check | 84 |
| On hold for conflicting, unavailable or missing supplier evidence | 78 |
| Clearly wrong suggested product/variant/sealed pack | 25 |
| Total | 210 |

Existing verified identities and listings are preserved even where the review flags a later conflict. A queue hold does not silently revoke or rewrite the underlying confirmation. The 25 exclusions are review outcomes only; they do not hide ASINs, delete supplier offers or write global rejection rules. Alternative legitimate suppliers can still be found later.

## Evidence scope

Across the public-capture batches, 181 distinct ASIN page captures were attempted and 164 exposed a product title with sufficient title agreement. Labelled product facts are retained when exposed; this does not imply all 164 yielded a barcode, complete pack information or an unambiguous match. Existing database product-detail records and the earlier manual confirmations supplement the review. Fresh price/stock, demand, eligibility, VAT and full buying economics were not approved by this audit.

Twenty-five clear false suggestions include Coffee-mate creamer versus Coffee Crisp chocolate, cleaning pads versus cough drops, powdered iced tea versus ready-to-drink iced tea, different mochi flavours, baking chips versus peanut-butter cups, gummy clusters versus Nerds Ropes, and different sealed retail bag sizes. Packaging and unit codes remain distinct from outer-case or assembled multipack codes.

## Manual workflow

Match Review defaults to Needs your check. Each card gives one specific question, its exact Amazon ASIN link, the selected supplier source and SKU, and optional recorded evidence. Product and supplier sorting, search, all-record status filters and 25-record pagination keep the queue usable. Parser pack quantities are explicitly unconfirmed; only saved listing evidence appears as a recorded sell pack. Current source-page failures and conflicting fields remain visible.

The suggested first check is Nerds Gummy Clusters B08HQL7NCM: confirm three 85g peg bags, not theatre boxes or share pouches, against Sweet & Glory NERD056. The five other latest proposed relationships are Coffee Crisp four-pack, Milk Duds two-pack, Jell-O Watermelon single, Reese Pieces 136g single and Heinz Chili Sauce 340g single. These six passed isolated database checks but were **not applied to production** after the request to review all items for manual checking. Their guarded SQL is retained under db/proposals, not as an applied repair.

## Validation

The new indexed offline replay uses the same production parser and route. Its complete output was compared with the unmodified production route over 84 representative rows before running the full 3,392-row screen. Brand/family indexing preserves all possible successful canonical comparisons, plus barcode and remembered-SKU exceptions; original order and diagnostic overlap behaviour are preserved. The full screen completed in about 16 seconds. This optimization is confined to the read-only review script and does not change production matching behaviour.

Focused tests cover unique ASIN coverage, disjoint review counts, exact source identifiers, specific questions, exclusion of dangerous families, six draft packs remaining unapproved, and rendering without the obsolete 64-item count or commercial checklist. Existing workspace navigation and buying-pool tests pass. TypeScript and the production build pass. No production identity/quote/BUY mutations were made by this whole-catalogue review.
