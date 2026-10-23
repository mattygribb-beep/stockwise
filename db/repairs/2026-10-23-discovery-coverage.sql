-- Insert only. Existing candidates, verified links, identifiers and prices are untouched.
-- Reused details remain partial; timestamps and source provenance reflect the original capture.
WITH recovered AS (
 INSERT INTO storefront_product_details(seller_id,asin,title,brand,ean,upc,model,size,pack_qty,category,bullet_points,raw_facts,detail_status,last_scanned_at,source_url)
 SELECT s.target_seller_id,s.asin,s.title,s.brand,s.ean,s.upc,s.model,s.size,s.pack_qty,s.category,s.bullet_points,
 jsonb_build_object('recovery','same_asin_existing_capture','source_seller_id',s.source_seller_id,'source_captured_at',s.last_scanned_at,'original_facts',s.raw_facts),
 'partial',s.last_scanned_at,s.source_url FROM (
 SELECT c.seller_id target_seller_id,d.seller_id source_seller_id,d.*, row_number() OVER(PARTITION BY c.seller_id,c.asin ORDER BY d.last_scanned_at DESC NULLS LAST,d.seller_id) rn
 FROM storefront_scout_catalogue c JOIN storefront_product_details d ON d.asin=c.asin AND d.seller_id<>c.seller_id
 WHERE NOT EXISTS(SELECT 1 FROM storefront_product_details x WHERE x.seller_id=c.seller_id AND x.asin=c.asin)
 AND d.detail_status='captured' AND lower(trim(c.title))=lower(trim(d.title))
 ) s WHERE s.rn=1 ON CONFLICT(seller_id,asin) DO NOTHING RETURNING asin
) SELECT count(*) recovered_details FROM recovered;

-- Discovery observations are not verified identities or current buy-box prices.
WITH selected AS (
 SELECT DISTINCT ON(c.asin) c.asin,coalesce(nullif(d.title,''),c.title) title,c.observed_price,c.seller_id,c.first_seen_at,c.last_seen_at,
 d.last_scanned_at detail_captured_at
 FROM storefront_scout_catalogue c LEFT JOIN storefront_product_details d ON d.seller_id=c.seller_id AND d.asin=c.asin
 WHERE NOT EXISTS(SELECT 1 FROM amazon_catalogue_candidates a WHERE a.asin=c.asin)
 ORDER BY c.asin,(c.observed_price>0) DESC NULLS LAST,c.last_seen_at DESC,c.seller_id
), inserted AS (
 INSERT INTO amazon_catalogue_candidates(asin,title,observed_price,amazon_url,source_name,match_status,match_evidence,first_seen_at,last_seen_at)
 SELECT asin,title,CASE WHEN observed_price>0 THEN observed_price END,'https://www.amazon.co.uk/dp/'||asin,'storefront_scout','unmatched',
 jsonb_build_object('discoveryOnly',true,'sourceSellerId',seller_id,'priceObservedAt',last_seen_at,'priceType','seller_observation_not_buy_box','detailCapturedAt',detail_captured_at,'ingestion','coverage_2026_10_23'),
 first_seen_at,last_seen_at FROM selected
 ON CONFLICT(asin) DO NOTHING RETURNING asin
) SELECT count(*) new_discovery_candidates FROM inserted;
