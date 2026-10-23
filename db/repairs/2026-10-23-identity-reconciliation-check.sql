WITH resolved AS (
 SELECT p.*,o.id offer_row_id,o.is_active,o.case_qty,o.case_price,o.unit_cost,o.product
 FROM product_identity_offers p LEFT JOIN suppliers s ON s.name=p.supplier
 LEFT JOIN supplier_offers o ON o.supplier_id=s.id AND o.supplier_product_id=p.supplier_offer_id
)
SELECT jsonb_build_object(
 'counts',jsonb_build_object(
 'verified_candidates',(SELECT count(*) FROM amazon_catalogue_candidates WHERE match_status='verified'),
 'listings',(SELECT count(*) FROM amazon_product_listings),
 'supplier_links',(SELECT count(*) FROM product_identity_offers),
 'resolved_supplier_links',(SELECT count(*) FROM resolved WHERE offer_row_id IS NOT NULL),
 'active_supplier_links',(SELECT count(*) FROM resolved WHERE is_active),
 'master_identities',(SELECT count(*) FROM master_product_identities),
 'broken_links',(SELECT count(*) FROM resolved WHERE offer_row_id IS NULL),
 'candidate_listing_conflicts',(SELECT count(*) FROM amazon_catalogue_candidates c JOIN amazon_product_listings a ON a.asin=c.asin AND a.marketplace='UK' WHERE c.match_status='verified' AND (a.identity_id IS DISTINCT FROM c.matched_master_identity_id OR (c.match_evidence ? 'amazon_sell_pack_qty' AND a.pack_qty IS DISTINCT FROM (c.match_evidence->>'amazon_sell_pack_qty')::int))),
 'listings_with_supplier',(SELECT count(*) FROM amazon_product_listings a WHERE EXISTS(SELECT 1 FROM resolved r WHERE r.identity_id=a.identity_id AND r.offer_row_id IS NOT NULL)),
 'listings_with_active_supplier',(SELECT count(*) FROM amazon_product_listings a WHERE EXISTS(SELECT 1 FROM resolved r WHERE r.identity_id=a.identity_id AND r.is_active)),
 'supplier_identities_without_listing',(SELECT count(DISTINCT r.identity_id) FROM resolved r WHERE NOT EXISTS(SELECT 1 FROM amazon_product_listings a WHERE a.identity_id=r.identity_id))),
 'candidate_hash',(SELECT md5(jsonb_agg(to_jsonb(c) ORDER BY c.id)::text) FROM amazon_catalogue_candidates c),
 'master_hash',(SELECT md5(jsonb_agg(to_jsonb(m) ORDER BY m.id)::text) FROM master_product_identities m),
 'rows',(SELECT jsonb_agg(x) FROM (SELECT a.asin,a.identity_id,m.product_name,a.title,a.pack_qty,a.unit_size,a.ean,a.status,
 (SELECT jsonb_agg(jsonb_build_object('supplier',r.supplier,'product_id',r.supplier_offer_id,'offer_row_id',r.offer_row_id,'active',r.is_active,'status',r.match_status,'reason',r.match_reason,'product',r.product,'case_qty',r.case_qty)) FROM resolved r WHERE r.identity_id=a.identity_id) supplier_links,
 c.match_evidence candidate_evidence,c.observed_price candidate_price
 FROM amazon_product_listings a JOIN master_product_identities m ON m.id=a.identity_id LEFT JOIN amazon_catalogue_candidates c ON c.asin=a.asin ORDER BY m.product_name,a.asin)x)
) audit;

