# Barcode review: 21 product listings — 24 October 2026

Fresh Amazon pages were captured for all 21 ASINs and their labelled UPC facts compared with saved wholesaler codes. This is a read-only evidence review: no identifiers, verified identities, supplier links, or BUY states were changed. Supplier prices, stock and source pages were not refreshed.

## Result

- products_checked: 21
- distinct_saved_supplier_codes: 20
- fresh_status_counts: {'CORROBORATED': 16, 'NOT_RECAPTURED': 3, 'UPC_CONFLICT': 1, 'MULTIPLE_UPCS': 1}
- newly_corroborated_unverified_pairs: 10
- new_identity_approvals: 0

CORROBORATED means the fresh single UPC matches the saved supplier code after standard zero-padding. It does not mean the sell pack or physical product is approved. Three pages did not expose a usable UPC. Ice Breakers Duo exposed two separate UPCs, so its padded saved code needs review. Sonic Ocean Water exposed UPC 072392355433, conflicting with saved supplier EAN 0072392306244. Cinnamon Toast Crunch and Trident retain their size/pack cautions even though their UPCs agree.

| ASIN | Product | Supplier EAN | Fresh Amazon UPC | Result |
|---|---|---|---|---|
| B071KX5NR9 | Heinz Sweet Relish 375ml Bottle | `0013000001373` | `013000001373` | CORROBORATED |
| B000SRHUNA | Jello Cherry 85g | `0043000200032` | `043000200032` | CORROBORATED |
| B003ZZ8G76 | Jell-O Peach Gelatin Dessert 85g | `0043000200247` | `043000200247` | CORROBORATED |
| B0041B8J7K | JELL-O Black Cherry Gelatin Dessert 85g | `0043000200087` | Not exposed | NOT_RECAPTURED |
| B005JD2YCU | Jell-o grape 85 g | `0043000200100` | `043000200100` | CORROBORATED |
| B07CX3GRXV | Cinnamon Toast Crunch, Cereal, with Whole Grain 340g | `0016000122543` | `016000122543` | CORROBORATED |
| B08KGQ6HZ6 | Nerds Big Chewy Candy, 120g | `0079200774479` | `079200774479` | CORROBORATED |
| B0004LZUJQ | Kool Aid Black Cherry Drink Sachet 3.6 g | `0043000955673` | `043000955673` | CORROBORATED |
| B0868XN5RL | Jell-o, Gelatin Dessert, Orange (Pack of 2) | `0043000200049` | `043000200049` | CORROBORATED |
| B0H2MGH8NW | SONIC Ocean Water Singles to Go, Zero Sugar Drink Mix | `0072392306244` | `072392355433` | UPC_CONFLICT |
| B000PYB7U8 | Ice Breakers Sours, Sugar Free Mints, Watermelon, Green Apple, and Tangerine 42 g | `0034000000982` | `034000000982` | CORROBORATED |
| B00QAIWJGE | Ice Breakers Duo Fruit & Cool Strawberry Sugarfree Mints 1 x 36g Tub | `0000003466506` | `000003466506`, `034000006656` | MULTIPLE_UPCS |
| B01EY6Y3TO | Taco Bell Diablo Sauce 213g | `0021000060627` | `021000060627` | CORROBORATED |
| B079SKCVJK | Jelly Belly,Ice Cream Mix Bag, 70g | `0071570004309` | `071570004309` | CORROBORATED |
| B00600N5UQ | Harry Potter, Warner Brothers Milk Chocolate Frog With Collectible Wizard Trading Card | `0071567992329` | `071567992329` | CORROBORATED |
| B072KNM1PZ | Trident Sugar Free Gum - Cinnamon 14 STICKS RED - 12 PACK | `0012546011471` | `012546011471` | CORROBORATED |
| B08HR8VQ7G | Nerds Gummy Clusters Chewy Candy, 5 Oz (141g) Bag | `0079200049065` | `079200049065` | CORROBORATED |
| B08T5WX4KH | JELLY BELLY AMERICAN CLASSICS | `0071570014025` | `071570014025` | CORROBORATED |
| B099PGQBLV | Mike & Ike Mega Mix Sour Candy Large 28.8 Ounce Bag | `0070970474637` | `070970474637` | CORROBORATED |
| B08NQ11PD2 | 6 x NERDS Grape & Strawberry Theatre Box 141g | `0079200616007` | Not exposed | NOT_RECAPTURED |
| B002B66UIC | Jell-O Orange Gelatin Dessert Mix, 3 oz Box | `0043000200049` | Not exposed | NOT_RECAPTURED |

## Cautions

- B0041B8J7K: The saved barcode agreement was not independently recaptured. Preserve it as historical evidence and request a pack label or clearer product source.
- B07CX3GRXV: New storefront capture title says 354g, while saved identity and supplier say 340g. Shared barcode is insufficient: verify the current physical pack before buying.
- B0868XN5RL: Preserve verified Amazon 2 x 85g sell pack; supplier case is 24 individual units.
- B0H2MGH8NW: Saved supplier EAN 0072392306244 versus fresh Amazon UPC 072392355433. Confirm the exact product and box/sachet configuration before linking; do not replace the saved code automatically.
- B00QAIWJGE: Amazon lists a zero-padded-looking code alongside 034000006656. Keep the raw values separate and verify the physical barcode; check-digit agreement alone does not resolve the representation.
- B072KNM1PZ: Preserved manual caution: supplier 31g versus Amazon 0.9oz; confirm 14 sticks per packet and 12 packets per sale.
- B08HR8VQ7G: Previous fee scenario was negative at £5.19; keep BUY blocked pending complete refreshed economics.
- B08T5WX4KH: Historical Amazon prices disagree across saved evidence; refresh same-ASIN sell price.
- B08NQ11PD2: Preserve verified Amazon 6-pack; supplier case of 12 yields two sell packs, not 12 sales. The saved barcode agreement was not independently recaptured. Preserve it as historical evidence and request a pack label or clearer product source.
- B002B66UIC: The saved barcode agreement was not independently recaptured. Preserve it as historical evidence and request a pack label or clearer product source.
