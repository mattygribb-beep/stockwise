-- Identity only: labelled user-supplied listing facts + matching stored supplier UPCs.
-- No prices, costs, stock, fees, eligibility or buying decisions are approved.
DO $$
DECLARE r record; o record; c record; master_id bigint;
BEGIN
 FOR r IN SELECT * FROM (VALUES
 ('B000SRHUNA','JELL016','0043000200032','Jell-O Cherry 85g','Jell-O','Cherry','85g',24),
 ('B003ZZ8G76','JELL039','0043000200247','Jell-O Peach 85g','Jell-O','Peach','85g',24),
 ('B005JD2YCU','JELL014','0043000200100','Jell-O Grape 85g','Jell-O','Grape','85g',24),
 ('B08KGQ6HZ6','NERD027','0079200774479','Nerds Big Chewy Theatre Box 120g','Nerds','Big Chewy','120g',12)
 ) AS t(asin,sku,ean,title,brand,variant,unit_size,case_qty)
 LOOP
  SELECT so.*,s.name supplier INTO STRICT o FROM supplier_offers so JOIN suppliers s ON s.id=so.supplier_id WHERE s.name='Sweet & Glory' AND so.supplier_product_id=r.sku;
  SELECT * INTO STRICT c FROM amazon_catalogue_candidates WHERE asin=r.asin;
  IF NOT o.is_active OR o.ean<>r.ean OR o.size<>r.unit_size OR o.case_qty<>r.case_qty THEN RAISE EXCEPTION 'Supplier evidence changed: %',r.asin; END IF;
  IF NOT EXISTS(SELECT 1 FROM unnest(ARRAY[c.ean,c.upc,c.gtin]) code WHERE lpad(code,14,'0')=lpad(r.ean,14,'0')) THEN RAISE EXCEPTION 'Amazon barcode changed: %',r.asin; END IF;
  IF c.match_status NOT IN ('unmatched','verified') OR (c.match_status='verified' AND coalesce(c.match_evidence->>'method','')<>'evidence_review_2026_10_25') THEN RAISE EXCEPTION 'Existing decision requires review: %',r.asin; END IF;
  SELECT id INTO master_id FROM master_product_identities WHERE asin=r.asin;
  IF master_id IS NULL THEN
   INSERT INTO master_product_identities(product_name,brand,variant,size,unit_size,ean,asin,status,canonical_key)
   VALUES(r.title,r.brand,r.variant,r.unit_size,r.unit_size,r.ean,r.asin,'verified',lower(r.brand||'|'||r.variant||'|'||r.unit_size)) RETURNING id INTO master_id;
  END IF;
  IF EXISTS(SELECT 1 FROM product_identity_offers WHERE supplier=o.supplier AND supplier_offer_id=r.sku AND identity_id<>master_id) OR EXISTS(SELECT 1 FROM amazon_product_listings WHERE marketplace='UK' AND asin=r.asin AND (identity_id<>master_id OR pack_qty<>1)) THEN RAISE EXCEPTION 'Conflicting saved relationship: %',r.asin; END IF;
  INSERT INTO product_identity_offers(identity_id,supplier,supplier_offer_id,match_score,match_status,match_reason)
  VALUES(master_id,o.supplier,r.sku,100,'verified','2026-10-25 evidence review: labelled Amazon UPC and supplier code agree; brand, product, size and single-unit sell pack checked from user-supplied listing facts and supplier SKU. Supplier case is procurement quantity. No commercial approval.') ON CONFLICT(supplier,supplier_offer_id) DO NOTHING;
  INSERT INTO amazon_product_listings(identity_id,asin,ean,pack_qty,unit_size,title,marketplace,status)
  VALUES(master_id,r.asin,r.ean,1,r.unit_size,c.title,'UK','verified') ON CONFLICT(marketplace,asin) DO NOTHING;
  UPDATE amazon_catalogue_candidates SET match_status='verified',matched_master_identity_id=master_id,matched_supplier_offer_id=o.id,match_score=100,
   match_evidence=coalesce(match_evidence,'{}'::jsonb)||jsonb_build_object('method','evidence_review_2026_10_25','amazon_upc',right(r.ean,12),'amazon_sell_pack_qty',1,'supplier_case_qty',r.case_qty,'supplier_offer_id',o.id,'verifiedSupplierProductId',r.sku,'verifiedSupplier',o.supplier,'identity_reference','User-supplied Amazon product details and Sweet & Glory SKU/case facts; corroborated stored UPC','amazon_url','https://www.amazon.co.uk/dp/'||r.asin,'supplier_source',o.product_url,'commercial_approved',false),updated_at=now()
  WHERE asin=r.asin AND match_status='unmatched';
 END LOOP;
END $$;
