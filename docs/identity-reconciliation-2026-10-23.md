# Source Stack identity reconciliation — 23 October 2026

The 20 verified candidate records overlap 12 of the original 35 Amazon listings. Their union is 43 ASINs, not 55. Listings describe Amazon sell packs; supplier links describe procurement offers. They must not be summed as products.

| Measure | Before | Reconciled |
|---|---:|---:|
| Amazon listings / distinct ASINs | 35 | 43 |
| Supplier links | 38 | 46 |
| Supplier links resolving to an offer | 29 | 46 |
| Broken supplier keys | 9 | 0 |
| Listings with a linked supplier | 19 | 35 |
| Listings with an active linked supplier | 18 | 30 |
| Verified candidates | 20 | 20 |
| Master identities | 58 | 58 |

Nine links used internal offer row IDs instead of supplier product IDs. Correct only those keys, retaining status, identity, score and the original reason, with a provenance suffix. Bridge eight existing manual candidate confirmations into the listing and supplier-link tables; carry the recorded Amazon pack quantity, not the supplier case quantity. Do not change candidate evidence, EANs, master identities or buying decisions.

The 43 listings cover 41 master identities. Multiple ASINs for Lucky Charms and Cheetos are retained independently. Four further identities have supplier links but no Amazon listing; 13 review-only master identities remain separate.

## Validation

A dedicated database test branch passed the repair and a second run returned zero changes. All 46 supplier keys resolve; all 20 verified candidates have corresponding listings; no candidate/listing identity or recorded pack conflicts remain. Candidate-table and master-table fingerprints match the production baseline. The corrected master-identity query returns 58 identities, 43 listings and 46 supplier links.

The app previously used a nonexistent product_identity_offers.id column and filtered out verified links. Correct the column reference and accept both confirmed and verified on existing identity reads, without promoting statuses.

## Remaining checks

- Thirty listings have an active supplier link; this is an identity/availability grouping, not a BUY recommendation. Stock, costs, fees, VAT, eligibility, demand and competition still need checking.
- Five listings have only inactive linked offers: B0DJCHDGNX (Dr Pepper Blackberry 12fl oz/355ml); B00CGNGQXE (Jell-O Berry Blue Gelatin Dessert 85g); B0BTHXVGSX (Lucky Charms 300g); B0DJP8P3DF (Lucky Charms 300g); B00DB7VGY8 (Tic Tac Fresh Mint 18g).
- Eight listings have no linked supplier: B000QJS9Y4 (Hidden Valley Original Ranch Dressing 473ml); B088TWXSXP (Hostess Twinkies Cakes with Creamy Filling - 6 Cakes); B087QLHJ4S (Mitani Classic Chicken Salt 200g); B0088HQX08 (Pantainorasingh Shrimp Paste 100g); B00K28S8QS (Pepperidge Farm Goldfish Cheddar 6.6oz - Pack of 3); B0012NLMP6 (Red Vines Original Red Twists Candy 141g); B005GTC5ZI (Trung Nguyen Vietnamese Coffee Gourmet Blend 500g); B00CR3RV3C (Zheng Feng Five Spice Powder 100g).
- Fanta Berry B01M11JB1F has a pack-of-12 title but stored pack_qty=1. Preserve the original record and block economics until the selling unit is checked.
- Candy Paradise Joyful Fruits B0FLX3DPQ9 uses a jar of 50 with stored pack_qty=1 and supplier case_qty=1; define whether the atomic selling unit is a jar or a sweet before economics.
- Trident B072KNM1PZ retains the manual confirmation and 12-packet sell pack. Its original caution (31g supplier description versus 0.9oz Amazon description; verify 14 sticks per packet) remains attached.
- Hostess Twinkies B088TWXSXP has six cakes and no unit size; verify supplier pack semantics before linking.
- Existing Airheads rounding exceptions and Cheetos 226/226.8g equivalences remain recorded, without broadening matching tolerance.
- Existing observed Amazon prices and screenshot prices may disagree; reconciliation does not refresh either or establish a current selling price.

## Reconciled listings

| ASIN | Product | Amazon pack qty | Supplier links | Active links |
|---|---|---:|---:|---:|
| B0DKNZRGS1 | (Halal) Amos Peelerz Gummy Grape Peg Bag 65g | 1 | 1 | 1 |
| B000WG86GW | 7up Cherry 12fl oz/355ml | 1 | 1 | 1 |
| B0D6GYKDJL | 7up Tropical 12fl oz/355ml | 1 | 1 | 1 |
| B000WGDJFU | A&W Root Beer Float 12fl oz/355ml | 1 | 1 | 1 |
| B0CSKRMPZX | Airheads Blue Raspberry 36 Pack | 36 | 1 | 1 |
| B0CSKRKCNX | Airheads Cherry 36 Pack | 36 | 1 | 1 |
| B0CSLD75JQ | Airheads Watermelon 36 Pack | 36 | 1 | 1 |
| B0CSKRHBNX | Airheads White Mystery 36 Pack | 36 | 1 | 1 |
| B0GX27XDW1 | Candy Paradise Fluffiez Blue Raspberry Foam Gummy 100g | 1 | 1 | 1 |
| B0G1X4JDYW | Candy Paradise Fondant Burst Gummy 72g | 1 | 1 | 1 |
| B0FLX3DPQ9 | Candy Paradise Joyful Fruits Liquid Filled Gummy 10g - Jar of 50 | 1 | 1 | 1 |
| B01LWXK6QL | Cheetos Crunchy Flamin Hot 226g | 3 | 2 | 2 |
| B0937KFZL8 | Cheetos Crunchy Flamin Hot 226g | 2 | 2 | 2 |
| B0B99L73ZF | Cheetos Crunchy Original 226g | 3 | 2 | 2 |
| B07CX3GRXV | Cinnamon Toast Crunch Cereal 340g | 1 | 1 | 1 |
| B07QCFG13J | Cookie Crisp Cereal 10.6oz/300g | 1 | 1 | 1 |
| B0DJCHDGNX | Dr Pepper Blackberry 12fl oz/355ml | 1 | 1 | 0 |
| B084WPYLML | Dr Pepper Cream Soda 12floz/355ml | 1 | 1 | 1 |
| B01M11JB1F | Fanta Berry 12fl oz 355ml pack-of-12 | 1 | 1 | 1 |
| B003TL9TK4 | Fanta Grape Soda Can 12 Pack | 12 | 2 | 2 |
| B01EHD67QG | Fluff Marshmallow Spread 213g | 1 | 2 | 1 |
| B0842XQYND | Hi-Chew Chewy Sweet & Sour Watermelon Candy 1.76oz/50g | 1 | 1 | 1 |
| B01KKGPNMS | Hi-Chew Tropical Mix 3.53oz/100g | 1 | 1 | 1 |
| B000QJS9Y4 | Hidden Valley Original Ranch Dressing 473ml | 1 | 0 | 0 |
| B088TWXSXP | Hostess Twinkies Cakes with Creamy Filling - 6 Cakes | 6 | 0 | 0 |
| B00CGNGQXE | Jell-O Berry Blue Gelatin Dessert 85g | 2 | 1 | 0 |
| B0868XN5RL | Jell-O Orange Gelatin Dessert 85g | 2 | 1 | 1 |
| B08T5WX4KH | Jelly Belly American Classics Jelly Beans 70g | 1 | 1 | 1 |
| B0BTHXVGSX | Lucky Charms 300g | 1 | 1 | 0 |
| B0DJP8P3DF | Lucky Charms 300g | 1 | 1 | 0 |
| B099PGQBLV | Mike & Ike Mega Mix Sour! 816g | 1 | 1 | 1 |
| B087QLHJ4S | Mitani Classic Chicken Salt 200g | 1 | 0 | 0 |
| B08NQ11PD2 | Nerds Grape & Strawberry Theatre Box 141g | 6 | 1 | 1 |
| B08HR8VQ7G | Nerds Gummy Clusters Rainbow 141g | 1 | 1 | 1 |
| B0088HQX08 | Pantainorasingh Shrimp Paste 100g | 1 | 0 | 0 |
| B00K28S8QS | Pepperidge Farm Goldfish Cheddar 6.6oz - Pack of 3 | 3 | 0 | 0 |
| B0012NLMP6 | Red Vines Original Red Twists Candy 141g | 1 | 0 | 0 |
| B07KRLKR73 | Reese's Puffs 326g | 1 | 1 | 1 |
| B00DB7VGY8 | Tic Tac Fresh Mint 18g | 12 | 1 | 0 |
| B0GNNLXRT8 | Toxic Waste Nuclear Sludge Blue Raspberry Chew Bar 50 x 20g | 50 | 1 | 1 |
| B072KNM1PZ | Trident Cinnamon Sugar Free Gum 14 Sticks | 12 | 1 | 1 |
| B005GTC5ZI | Trung Nguyen Vietnamese Coffee Gourmet Blend 500g | 1 | 0 | 0 |
| B00CR3RV3C | Zheng Feng Five Spice Powder 100g | 1 | 0 | 0 |

