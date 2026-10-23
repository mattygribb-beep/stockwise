-- Run as one transaction. Correct explicit keys and bridge existing manual confirmations only.
BEGIN;
WITH expected(supplier,old_key,new_key,identity_id) AS (VALUES ('Stateside Distribution','865','8072240660620',25),
('Americatessen','10997','DURK-51190-12',26),
('Wholesale Sweets','5377','marshmallow-fluff-213g',26),
('Americatessen','10990','REESE-40530-12',34),
('Candy Cargo','9993','7234097610951',35),
('King''s Candy','3331','7248962715857',35),
('Candy Cargo','9998','7234097053895',36),
('King''s Candy','3329','7249907220689',36),
('Wholesale Sweets','6135','tic-tac-fresh-mint-18g',37)), repaired AS (
UPDATE product_identity_offers p SET supplier_offer_id=e.new_key,match_reason=p.match_reason || ' [Reconciliation 2026-10-23: corrected supplier product key from internal offer row ' || e.old_key || '; original confirmation retained]',updated_at=now()
FROM expected e,supplier_offers o,suppliers s
WHERE p.supplier=e.supplier AND p.supplier_offer_id=e.old_key AND p.identity_id=e.identity_id
AND o.id::text=e.old_key AND o.supplier_product_id=e.new_key AND o.supplier_id=s.id AND s.name=e.supplier
AND NOT EXISTS(SELECT 1 FROM product_identity_offers other WHERE other.supplier=e.supplier AND other.supplier_offer_id=e.new_key)
RETURNING p.identity_id,p.supplier,p.supplier_offer_id,p.match_status)
SELECT * FROM repaired;

INSERT INTO amazon_product_listings(identity_id,asin,ean,pack_qty,unit_size,title,marketplace,status)
SELECT c.matched_master_identity_id,c.asin,m.ean,(c.match_evidence->>'amazon_sell_pack_qty')::int,m.unit_size,c.title,'UK','verified'
FROM amazon_catalogue_candidates c JOIN master_product_identities m ON m.id=c.matched_master_identity_id
JOIN supplier_offers o ON o.id=c.matched_supplier_offer_id
WHERE c.asin IN ('B00CGNGQXE','B072KNM1PZ','B07CX3GRXV','B0868XN5RL','B08HR8VQ7G','B08NQ11PD2','B08T5WX4KH','B099PGQBLV') AND c.match_status='verified' AND c.match_evidence->>'method'='manual_user_verified'
AND m.asin=c.asin AND (c.match_evidence->>'supplier_offer_id')::bigint=o.id
AND (c.match_evidence->>'amazon_sell_pack_qty') ~ '^[1-9][0-9]*$'
AND NOT EXISTS(SELECT 1 FROM amazon_product_listings a WHERE a.marketplace='UK' AND a.asin=c.asin)
ON CONFLICT(marketplace,asin) DO NOTHING
RETURNING id,identity_id,asin,pack_qty;

INSERT INTO product_identity_offers(identity_id,supplier,supplier_offer_id,match_score,match_status,match_reason)
SELECT c.matched_master_identity_id,s.name,o.supplier_product_id,100,'verified',
'Reconciliation 2026-10-23: existing manual confirmation from amazon_catalogue_candidates; ASIN '||c.asin||'; original evidence: '||c.match_evidence::text
FROM amazon_catalogue_candidates c JOIN master_product_identities m ON m.id=c.matched_master_identity_id
JOIN supplier_offers o ON o.id=c.matched_supplier_offer_id JOIN suppliers s ON s.id=o.supplier_id
WHERE c.asin IN ('B00CGNGQXE','B072KNM1PZ','B07CX3GRXV','B0868XN5RL','B08HR8VQ7G','B08NQ11PD2','B08T5WX4KH','B099PGQBLV') AND c.match_status='verified' AND c.match_evidence->>'method'='manual_user_verified'
AND m.asin=c.asin AND (c.match_evidence->>'supplier_offer_id')::bigint=o.id
AND NOT EXISTS(SELECT 1 FROM product_identity_offers p WHERE p.supplier=s.name AND p.supplier_offer_id=o.supplier_product_id)
ON CONFLICT(supplier,supplier_offer_id) DO NOTHING
RETURNING identity_id,supplier,supplier_offer_id,match_status;
COMMIT;

