# Buying Desk

The ten-product validation cohort connects saved supplier offers and Amazon listings to a manual evidence check, an order cost model and a combined budget check. It does not buy stock or declare an identity match commercially approved.

## Cost model

- Whole supplier cases convert to complete Amazon sell packs. Leftovers receive no assumed resale value; the full stock cost is allocated to sellable packs.
- Supplier quotes require an explicit VAT basis. Ex-VAT quotes require a product VAT rate; delivery and per-sale costs are entered inclusive of unrecoverable VAT.
- The current cash model supports non-VAT-registered sellers. Registered and unknown VAT status block approval pending a net VAT model.
- Enter all Amazon fees per sale including referral, fulfilment for FBA, selling-plan allocation, surcharges and fee VAT. No empty fee is treated as zero.
- Enter supplier delivery / FBA inbound for the full order; packaging, FBM postage and other allowances per sale. Explicit confirmed zeros are allowed for non-Amazon costs.
- Upfront cash reserves the landed stock and every sale's packaging, FBM postage and other allowance. Amazon fees are deducted from expected proceeds. Shared-supplier carriage is conservatively charged per product; no automatic pooled delivery discount is assumed.
- ROI uses landed stock cost; margin uses selling revenue. Stress profit holds fees constant while reducing revenue by 10%. Break-even applies only to entered fee amounts; refresh the quote when changing the sell price.

## Evidence and invalidation

Identity, supplier terms, selling price, fees, demand, competition, eligibility and expiry/resale requirements each need a pass, source/reference and date. Failed, absent, future or stale evidence blocks approval. Identity expires after 30 days; price, fees and competition after 3 days; remaining checks after 7 days. These are application review policies, not guarantees about marketplace stability.

Changing cost inputs clears evidence. Changing saved product, case price/quantity, pack, expiry, stock/status or Amazon price invalidates evidence and resets the model to source defaults. Historical Amazon observations are displayed separately and never prefill the checked selling price.

Each product must pass the profile's financial and capital limits. Excess first-buy exposure produces REDUCE ORDER. The combined basket must also fit the available profile budget after an explicit reserve; individually affordable products cannot jointly overspend.

## Persistence and limits

Versioned checks and basket selection save in the current browser. They do not sync between devices. API reads current saved database records, not live supplier checkout or live Amazon prices. It performs no writes and no schema changes. Seller Central/SellerAmp evidence is entered manually; no demand or eligibility is invented.

The older Buyer Workspace is explicitly preliminary and cannot approve a purchase without complete purchase checks. Buying Desk is the route for the full evidence and budget flow.

## Verification

`node --test scripts/buying-desk.test.cjs scripts/uk-fba-estimator.test.cjs`

Tests cover VAT/carriage, blank vs explicit-zero costs, pack arithmetic and leftovers, stale/future/failed evidence, eligibility, FBA measurements, capital exposure, price stress, duplicate and jointly unaffordable baskets, the legacy approval gate, API pairing and database failures. Run standalone TypeScript validation and a production build as separate checks.
