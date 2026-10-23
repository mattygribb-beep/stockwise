"""Read-only evidence audit of a fixed matching cohort and a current DB export."""
import json,re,sys,collections,datetime
from pathlib import Path
snapshot=json.loads(Path(sys.argv[1]).read_text());data=json.loads(Path(sys.argv[2]).read_text());out=Path(sys.argv[3]);out.mkdir(exist_ok=True)
def code(value):
 s=re.sub(r'\D','',str(value or ''))
 if len(s) not in (12,13,14):return None
 if sum(int(n)*(3 if i%2==0 else 1) for i,n in enumerate(s[-2::-1]))%10!=(10-int(s[-1]))%10:return None
 return s.zfill(14)
def facts(d):
 f=d.get('raw_facts') or {};return f.get('facts',f.get('original_facts',f))
def positive(x):
 try:return float(x)>0
 except:return False
warnings={
 'B07CX3GRXV':'New storefront capture title says 354g, while saved identity and supplier say 340g. Shared barcode is insufficient: verify the current physical pack before buying.',
 'B0075OLAAI':'Captured size 0.28g conflicts with the 85g title; treat this as suspect extraction data and confirm the unit label.',
 'B003ZZE3AA':'Captured size 0.28g conflicts with the 85g title; treat this as suspect extraction data and confirm the unit label.',
 'B0CCY8W571':'Amazon title 140g versus supplier 145g: confirm physical revision; do not approve from parser tolerance.',
 'B000FD0A7U':'Amazon title 16g versus supplier 15g: confirm actual unit label and 36-unit sell pack.',
 'B072KNM1PZ':'Preserved manual caution: supplier 31g versus Amazon 0.9oz; confirm 14 sticks per packet and 12 packets per sale.',
 'B0H2MGH8NW':'Confirm whether supplier 254.4g denotes a case total and establish sachets/boxes per Amazon sale.',
 'B07TT6JC8S':'Confirm 6 pieces per mini-wallet, 12 wallets per Amazon sale and supplier case contents.',
 'B07MF3DY3C':'Supplier title is truncated to Mr. Product identity and six-pad Amazon pack cannot be established.',
 'B08T5WX4KH':'Historical Amazon prices disagree across saved evidence; refresh same-ASIN sell price.',
 'B08HR8VQ7G':'Previous fee scenario was negative at £5.19; keep BUY blocked pending complete refreshed economics.',
 'B08NQ11PD2':'Preserve verified Amazon 6-pack; supplier case of 12 yields two sell packs, not 12 sales.',
 'B0868XN5RL':'Preserve verified Amazon 2 x 85g sell pack; supplier case is 24 individual units.',
 'B003TL9TK4':'ASIN identity is verified, but this suggested supplier offer is not its verified supplier link.',
 'B0012NLMP6':'ASIN identity is verified, but this suggested supplier offer is not its verified supplier link.'}
for a in ['B000RHY1YW','B0012NLMP6','B00KB5FDF6','B00MULNNP6']:
 warnings[a]=warnings.get(a,'')+' Compare Red Vines 141g/142g labels and tray packaging; multiple ASIN neighbours must remain separate.'
rows=[]
for m in snapshot['matches']:
 a=m['asin'];c=next(x for x in data['candidates'] if x['asin']==a)
 offers=[x for x in data['offers'] if x['supplier']==m['supplier'] and x['supplier_product_id']==m['supplierOfferId']]
 assert offers,(a,'unresolved selected supplier offer')
 o=offers[0];ev=c.get('match_evidence') or {};ds=[x for x in data['details'] if x['asin']==a];ls=[x for x in data['listings'] if x['asin']==a]
 links=[p for p in data['links'] if p['supplier']==m['supplier'] and p['supplier_offer_id']==m['supplierOfferId'] and p['identity_id']==c['matched_master_identity_id'] and p['match_status'] in ('confirmed','verified')]
 asin_verified=c['match_status']=='verified';pair_verified=asin_verified and bool(links)
 codes=[]
 for source,obj,fields in [('candidate',c,['ean','upc','gtin']),('manual evidence',ev,['amazon_upc','amazon_catalogue_ean'])]+[(f"details:{d['seller_id']}",d,['ean','upc']) for d in ds]:
  for f in fields:
   v=code(obj.get(f))
   if v:codes.append({'code':v,'source':source,'field':f})
 supplier_code=code(o.get('ean'));cost_known=positive(o['case_price']) and positive(o['case_qty']) or positive(o['unit_cost'])
 missing=[]
 if not pair_verified:missing.append('VERIFY_SELECTED_SUPPLIER_IDENTITY')
 if not ds:missing.append('CAPTURE_AMAZON_PRODUCT_DETAILS')
 if not codes:missing.append('CAPTURE_VALID_AMAZON_BARCODE')
 if not supplier_code:missing.append('CAPTURE_VALID_SUPPLIER_BARCODE')
 if not asin_verified:missing.append('VERIFY_AMAZON_SELL_PACK')
 if not cost_known:missing.append('OBTAIN_SUPPLIER_PRICE')
 if not o['is_active']:missing.append('SUPPLIER_OFFER_INACTIVE')
 if not positive(o.get('stock_qty')):missing.append('CONFIRM_SUPPLIER_STOCK')
 if not positive(c.get('observed_price')):missing.append('CAPTURE_AMAZON_PRICE')
 local_warning=warnings.get(a,'').strip()
 if local_warning:missing.append('RESOLVE_SPECIFIC_CAUTION')
 # A scanned Item Dimensions value does not establish measured packaged dimensions.
 common=['REFRESH_AMAZON_PRICE_AND_AVAILABILITY','REFRESH_SUPPLIER_COST_STOCK_AND_EXPIRY','VERIFY_PACKAGED_DIMENSIONS_AND_WEIGHT','CONFIRM_PRODUCT_AND_FEE_VAT_TREATMENT','CALCULATE_FBA_PREP_INBOUND_AND_RETURNS_COSTS','CHECK_DEMAND_COMPETITION_AND_SELLING_ELIGIBILITY']
 item_measurements=[{'seller_id':d['seller_id'],'facts':{k:v for k,v in facts(d).items() if 'dimension' in k.lower() or 'weight' in k.lower()},'captured_at':d['last_scanned_at']} for d in ds]
 state='VERIFIED_PAIR_NEEDS_COMMERCIAL_EVIDENCE' if pair_verified else 'IDENTITY_REVIEW'
 if a=='B07MF3DY3C':state='HOLD_TRUNCATED_SUPPLIER_IDENTITY'
 elif not cost_known:state='HOLD_MISSING_SUPPLIER_PRICE'
 rows.append({'asin':a,'title':c['title'],'amazon_url':'https://www.amazon.co.uk/dp/'+a,'state':state,'asin_identity_verified':asin_verified,'selected_supplier_pair_verified':pair_verified,'original_parser_band':m['match']['band'],'supplier':m['supplier'],'supplier_offer_id':m['supplierOfferId'],'supplier_product':o['product'],'supplier_url':o['product_url'],'supplier_active':o['is_active'],'case_qty':o['case_qty'],'case_price':o['case_price'],'unit_cost':o['unit_cost'],'supplier_cost_observed_at':o['last_seen_at'],'supplier_recorded_stock_qty':o['stock_qty'],'supplier_recorded_stock_status':o['status'],'supplier_recorded_expiry':o['expiry'],'amazon_recorded_price':c['observed_price'],'amazon_record_last_seen_at':c['last_seen_at'],'price_observed_at_explicit':ev.get('priceObservedAt'),'storefront_prices':[{'seller_id':s['seller_id'],'price':s['observed_price'],'record_last_seen_at':s['last_seen_at']} for s in data['storefronts'] if s['asin']==a],'valid_amazon_codes':codes,'valid_supplier_code':supplier_code,'barcode_agrees':bool(supplier_code and supplier_code in [x['code'] for x in codes]),'detail_capture_count':len(ds),'details':[{'seller_id':d['seller_id'],'status':d['detail_status'],'captured_at':d['last_scanned_at'],'source_url':d['source_url'],'captured_title':d['title'],'structured_size':d['size'],'structured_pack_qty':d['pack_qty'],'pack_facts':{k:v for k,v in facts(d).items() if k.lower() in ['size','number of items','item package quantity','package quantity','package size name','package type name','container type']}} for d in ds],'measurement_evidence':item_measurements,'verified_listing_packs':[{'pack_qty':l['pack_qty'],'unit_size':l['unit_size']} for l in ls],'parser_pack_conversion_unverified':m['packConversion'],'specific_caution':local_warning,'specific_actions':missing,'common_actions':common,'buy_ready':False,'net_profit':None})
assert len(rows)==64 and len({r['asin'] for r in rows})==64
summary={'cohort':64,'verified_asins':sum(r['asin_identity_verified'] for r in rows),'verified_selected_supplier_pairs':sum(r['selected_supplier_pair_verified'] for r in rows),'with_saved_details':sum(bool(r['detail_capture_count']) for r in rows),'without_saved_details':sum(not r['detail_capture_count'] for r in rows),'with_valid_amazon_code':sum(bool(r['valid_amazon_codes']) for r in rows),'without_valid_amazon_code':sum(not r['valid_amazon_codes'] for r in rows),'with_valid_supplier_code':sum(bool(r['valid_supplier_code']) for r in rows),'barcode_agrees':sum(r['barcode_agrees'] for r in rows),'with_recorded_amazon_price':sum(positive(r['amazon_recorded_price']) for r in rows),'missing_supplier_cost':sum('OBTAIN_SUPPLIER_PRICE' in r['specific_actions'] for r in rows),'with_positive_recorded_supplier_stock':sum(positive(r['supplier_recorded_stock_qty']) for r in rows),'states':dict(collections.Counter(r['state'] for r in rows)),'buy_ready':0,'saved_market_checks_in_database':0,'confirmed_complete_packaged_measurements':0}
report={'audit_date_uk':'2026-10-24','database_read_at':data['captured_at'],'cohort_snapshot':'2026-10-23','scope':'Fixed 64-ASIN cohort from prior replay; current stored evidence audit, no new live price or supplier verification. No database writes.','summary':summary,'rows':rows}
(out/'matched-64-audit-2026-10-24.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
lines=['# Audit of 64 match candidates — 24 October 2026','','This audits the exact 64-ASIN cohort from the 23 October replay against current stored database evidence. It does not rerun discovery or refresh market prices. No identity, supplier link, barcode or BUY state was changed.','','## Result','',*['- '+k.replace('_',' ')+': '+str(v) for k,v in summary.items() if k!='states'],'','Seven selected supplier pairs retain verified links; this does not establish commercial readiness. Two other verified ASINs point to unverified suggested supplier alternatives. All items require a current price/stock check, complete packaged measurements, VAT/cost treatment, full fees and a demand/eligibility assessment. Historical prices and stock are evidence leads only. Item dimensions and net product weight are not accepted as complete packaged measurements. Missing barcodes are evidence gaps, not proof of a false match.','','## Suggested first checks','','1. Mike & Ike Mega Mix Sour 816g (B099PGQBLV): verified selected pair; refresh sale price and supplier availability, then measure the complete sell unit.','2. Cinnamon Toast Crunch 340g (B07CX3GRXV): saved verified pair, but new capture title says 354g versus the 340g supplier/identity. Resolve that conflict before full costing.','3. Jell-O Orange two-pack (B0868XN5RL): preserve two boxes per sale and cost the assembled pack.','4. Trident Cinnamon 12-pack (B072KNM1PZ): resolve the recorded 31g versus 0.9oz/14-stick caution before treating this as an exact sell pack.','5. Nerds six-pack (B08NQ11PD2): verified pair; confirm VAT and complete fees for six units per sale.','','These are an evidence-collection order, not a profit ranking or buying shortlist. Hold Mr. Clean until its truncated supplier product is identified. Heinz Chili Sauce and Cheerios have no usable supplier price. Keep the previous negative Nerds single-bag fee scenario visible; no positive recommendation is implied.','','## Checklist for every ASIN','','Every row additionally requires: refreshed Amazon price and availability; refreshed supplier cost, stock and expiry; packaged measurements; VAT treatment; FBA, prep, inbound and returns costs; demand, competition and selling eligibility. The table lists product-specific work beyond those common requirements.','','| ASIN | Product | Supplier / suggested product | Audit state | Product-specific actions |','|---|---|---|---|---|']
esc=lambda s:str(s).replace('|','/').replace('\n',' ')
for r in rows:
 actions='; '.join(r['specific_actions'])+('. '+r['specific_caution'] if r['specific_caution'] else '')
 lines.append('| '+' | '.join(map(esc,[r['asin'],r['title'],r['supplier']+' / '+r['supplier_product'],r['state'],actions or 'Common commercial checks only']))+' |')
lines+=['','The adjacent JSON contains each ASIN\'s saved prices, source timestamps, barcode evidence, supplier stock/expiry, pack facts, measurement leads and action codes. All net-profit values remain null until the required evidence is complete.']
(out.parent/'docs'/'matched-64-audit-2026-10-24.md').write_text('\n'.join(lines)+'\n')
print(json.dumps(summary,indent=2))
