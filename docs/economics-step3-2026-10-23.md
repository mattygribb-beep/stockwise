# Source Stack step 3 — interim economics, 23 October 2026

Screened 43 reconciled ASINs. Thirty have an active linked supplier; 28 have a positive recorded case price. Eight have both a positive case price and a historical selling-price observation. Twenty lack a selling price; two have missing case prices (Fluff and Reese's Puffs); five have only inactive linked offers; eight have no supplier link. No fully verified BUY result is established.

## Interim Amazon fees

Use [Amazon's published July 2026 rate card](https://m.media-amazon.com/images/G/02/sell/images/260630-FBA-Rate-Card-EN1.pdf), with the [Grocery referral schedule](https://sell.amazon.co.uk/pricing). Scope is UK domestic Grocery and Gourmet, UK-established Professional seller. Package dimensions and weight must describe the whole Amazon selling unit. The model requires both, applies the current peak period and fuel surcharge, and separates digital-services fees and a 20% fee-VAT cash scenario. Outputs are estimates, not live quotes. Unknown measurements produce no fee total.

The previous model chose envelope rates from weight alone, omitted peak pricing and digital-services fees, and applied an inappropriate 25p minimum to Grocery referral fees. Those issues are corrected. Categories outside the verified scope require their own rates.

Sources: [Low-price eligibility](https://sell.amazon.co.uk/low-price-fba-rates); [Digital services fee](https://sellercentral.amazon.co.uk/help/hub/reference/external/GMVQXVHHG8Q8KN7L); [2026 digital-services update](https://sellercentral.amazon.co.uk/seller-forums/discussions/t/4fdf2816-9760-45d8-b763-26051640abb9).

## Eight candidates with cost and historical selling-price data

These are screening scenarios. The sale price is the lowest stored observation across sources and dates, not a refreshed Buy Box. The cost column adds 20% to the quoted supplier case price and assumes no VAT recovery. This is a sensitivity scenario; it does not classify every grocery product as standard-rated or confirm Candy Cargo price inclusivity. The user’s VAT status is unconfirmed. Sweet & Glory displays prices excluding VAT ([terms](https://sweetandglory.com/terms-conditions)). Do not show these figures as net profit.

| Product / Amazon pack | Historical sale scenario | Stock cost per Amazon sale, +20% scenario | Before all Amazon fees and other costs | Complete Amazon sales per supplier case |
|---|---:|---:|---:|---:|
| Cinnamon Toast Crunch Cereal 340g / 1 | £8.63 | £4.07 | £4.56 | 12 |
| Fanta Grape Soda Can 12 Pack / 12 | £16.28 | £9.59 | £6.69 | 1 |
| Jell-O Orange Gelatin Dessert 85g / 2 | £5.50 | £2.80 | £2.70 | 12 |
| Jelly Belly American Classics Jelly Beans 70g / 1 | £2.49 | £1.54 | £0.95 | 12 |
| Mike & Ike Mega Mix Sour! 816g / 1 | £15.44 | £7.20 | £8.24 | 6 |
| Nerds Grape & Strawberry Theatre Box 141g / 6 | £14.99 | £9.60 | £5.39 | 2 |
| Nerds Gummy Clusters Rainbow 141g / 1 | £5.19 | £2.60 | £2.59 | 12 |
| Trident Cinnamon Sugar Free Gum 14 Sticks / 12 | £19.89 | £9.16 | £10.73 | 1 |

For Cinnamon Toast Crunch, the zero-additional-VAT scenario is also supplied in JSON; the £40.67 / 12 stock cost is £3.39 per box before delivery, versus £4.07 if 20% is added. The site's previous blanket Stateside VAT uplift must not be treated as product-specific tax evidence.

## Worked fee scenario: Nerds Rainbow Gummy Clusters 141g

ASIN B08HR8VQ7G. Stored Amazon facts give 17.1 × 13.6 × 6.1 cm and 142g. These are catalogue facts, not physical measurements. The bag needs a low-price small-parcel tier rather than an envelope tier. Estimated Amazon fees total £3.03 before fee VAT, or £3.64 under the 20% fee-VAT scenario. At the historical £5.19 selling-price scenario and £2.60 stock-cost scenario, the remainder is **−£1.05 before prep, supplier delivery, inbound transport and storage**. At the newer £5.71 storefront observation, the same fee model yields £3.67 cash fees and about −£0.56 before those other costs. Neither observation is a verified current Buy Box.

The supplier page lists 12 bags, £26, VAT 20 and each barcode 079200049065 ([source](https://candycargo.co.uk/products/nerds-rainbow-medium-gummy-clusters-peg-bag-12x141g)). This supports the recorded physical product, but the displayed VAT field alone does not resolve whether the £26 already includes VAT. If it already includes VAT, the £5.19 scenario leaves about −£0.62 before other costs instead. The fee model still depends on full packaged dimensions and weight.

## What remains

- Seven other cost-and-price candidates require reliable packaged dimensions/weight for their complete Amazon sell pack. Do not substitute a single item's weight for a multipack (especially Trident).
- Fanta Berry has a pack-of-12 title but stored pack=1. Candy Paradise Joyful Fruits requires a jar-versus-sweet definition. Trident retains its 31g versus 25.5g / 14-stick check.
- Current selling price, fee category, selling eligibility, expiry/stock, VAT treatment, prep, shipping and competition/demand are still required before any BUY.
- Supplier freshness matters: the retrieved Jell-O Orange page shows £27.83 ex VAT for 24, versus £28.03 stored. The report conservatively retains the stored higher cost and records the new observation separately.
- Amazon's fee connection remains NOT_CONFIGURED. Published estimates can screen opportunities while it is unavailable; they must not overwrite verified identity evidence or be labelled live quotes.
- Code defaults are ROI 30%, profit £2/sale, margin 15%, total opportunity profit £25. Browser-saved settings may differ. A one-case scenario is not a rule requiring £25 profit from every case. No automatic BUY/WALK AWAY decision was saved from these incomplete scenarios.

## All 43 ASINs

| ASIN | Product | Screening data status |
|---|---|---|
| B0DKNZRGS1 | (Halal) Amos Peelerz Gummy Grape Peg Bag 65g | MISSING_SELL_PRICE |
| B000WG86GW | 7up Cherry 12fl oz/355ml | MISSING_SELL_PRICE |
| B0D6GYKDJL | 7up Tropical 12fl oz/355ml | MISSING_SELL_PRICE |
| B000WGDJFU | A&W Root Beer Float 12fl oz/355ml | MISSING_SELL_PRICE |
| B0CSKRMPZX | Airheads Blue Raspberry 36 Pack | MISSING_SELL_PRICE |
| B0CSKRKCNX | Airheads Cherry 36 Pack | MISSING_SELL_PRICE |
| B0CSLD75JQ | Airheads Watermelon 36 Pack | MISSING_SELL_PRICE |
| B0CSKRHBNX | Airheads White Mystery 36 Pack | MISSING_SELL_PRICE |
| B0GX27XDW1 | Candy Paradise Fluffiez Blue Raspberry Foam Gummy 100g | MISSING_SELL_PRICE |
| B0G1X4JDYW | Candy Paradise Fondant Burst Gummy 72g | MISSING_SELL_PRICE |
| B0FLX3DPQ9 | Candy Paradise Joyful Fruits Liquid Filled Gummy 10g - Jar of 50 | MISSING_SELL_PRICE |
| B01LWXK6QL | Cheetos Crunchy Flamin Hot 226g | MISSING_SELL_PRICE |
| B0937KFZL8 | Cheetos Crunchy Flamin Hot 226g | MISSING_SELL_PRICE |
| B0B99L73ZF | Cheetos Crunchy Original 226g | MISSING_SELL_PRICE |
| B07CX3GRXV | Cinnamon Toast Crunch Cereal 340g | SCENARIO_AVAILABLE |
| B07QCFG13J | Cookie Crisp Cereal 10.6oz/300g | MISSING_SELL_PRICE |
| B0DJCHDGNX | Dr Pepper Blackberry 12fl oz/355ml | INACTIVE_ONLY |
| B084WPYLML | Dr Pepper Cream Soda 12floz/355ml | MISSING_SELL_PRICE |
| B01M11JB1F | Fanta Berry 12fl oz 355ml pack-of-12 | MISSING_SELL_PRICE |
| B003TL9TK4 | Fanta Grape Soda Can 12 Pack | SCENARIO_AVAILABLE |
| B01EHD67QG | Fluff Marshmallow Spread 213g | MISSING_CASE_PRICE |
| B0842XQYND | Hi-Chew Chewy Sweet & Sour Watermelon Candy 1.76oz/50g | MISSING_SELL_PRICE |
| B01KKGPNMS | Hi-Chew Tropical Mix 3.53oz/100g | MISSING_SELL_PRICE |
| B000QJS9Y4 | Hidden Valley Original Ranch Dressing 473ml | NO_SUPPLIER_LINK |
| B088TWXSXP | Hostess Twinkies Cakes with Creamy Filling - 6 Cakes | NO_SUPPLIER_LINK |
| B00CGNGQXE | Jell-O Berry Blue Gelatin Dessert 85g | INACTIVE_ONLY |
| B0868XN5RL | Jell-O Orange Gelatin Dessert 85g | SCENARIO_AVAILABLE |
| B08T5WX4KH | Jelly Belly American Classics Jelly Beans 70g | SCENARIO_AVAILABLE |
| B0BTHXVGSX | Lucky Charms 300g | INACTIVE_ONLY |
| B0DJP8P3DF | Lucky Charms 300g | INACTIVE_ONLY |
| B099PGQBLV | Mike & Ike Mega Mix Sour! 816g | SCENARIO_AVAILABLE |
| B087QLHJ4S | Mitani Classic Chicken Salt 200g | NO_SUPPLIER_LINK |
| B08NQ11PD2 | Nerds Grape & Strawberry Theatre Box 141g | SCENARIO_AVAILABLE |
| B08HR8VQ7G | Nerds Gummy Clusters Rainbow 141g | SCENARIO_AVAILABLE |
| B0088HQX08 | Pantainorasingh Shrimp Paste 100g | NO_SUPPLIER_LINK |
| B00K28S8QS | Pepperidge Farm Goldfish Cheddar 6.6oz - Pack of 3 | NO_SUPPLIER_LINK |
| B0012NLMP6 | Red Vines Original Red Twists Candy 141g | NO_SUPPLIER_LINK |
| B07KRLKR73 | Reese's Puffs 326g | MISSING_CASE_PRICE |
| B00DB7VGY8 | Tic Tac Fresh Mint 18g | INACTIVE_ONLY |
| B0GNNLXRT8 | Toxic Waste Nuclear Sludge Blue Raspberry Chew Bar 50 x 20g | MISSING_SELL_PRICE |
| B072KNM1PZ | Trident Cinnamon Sugar Free Gum 14 Sticks | SCENARIO_AVAILABLE |
| B005GTC5ZI | Trung Nguyen Vietnamese Coffee Gourmet Blend 500g | NO_SUPPLIER_LINK |
| B00CR3RV3C | Zheng Feng Five Spice Powder 100g | NO_SUPPLIER_LINK |

