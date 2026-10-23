"""Compare fresh labelled Amazon UPCs with saved supplier codes; never approve identities."""
import collections,json,re,sys
from pathlib import Path
audit=json.loads(Path(sys.argv[1]).read_text())
captures=json.loads(Path(sys.argv[2]).read_text())
suppliers=json.loads(Path(sys.argv[3]).read_text())
root=Path(sys.argv[4])
def valid(value):
 return len(value) in (12,13,14) and sum(int(n)*(3 if i%2==0 else 1) for i,n in enumerate(value[-2::-1]))%10==(10-int(value[-1]))%10
def upcs(raw):
 # Split labelled multi-code values; concatenating digits would destroy both codes.
 return sorted(set(v for v in re.findall(r'(?<!\d)\d{12,14}(?!\d)',raw) if valid(v)))
assert upcs('000003466506 034000006656')==['000003466506','034000006656']
assert not upcs('013000001374')
labels={'CORROBORATED':'Fresh Amazon UPC agrees with the saved supplier code','NOT_RECAPTURED':'No usable UPC was exposed in this fresh page capture','UPC_CONFLICT':'Fresh Amazon UPC differs from the saved supplier code','MULTIPLE_UPCS':'Amazon exposes multiple UPCs; the correct code needs review'}
rows=[]
for original in audit['rows']:
 if not original['barcode_agrees']:continue
 a=original['asin'];fresh=next(c for c in captures if c['asin']==a)
 supplier=next(s for s in suppliers if s['supplier']==original['supplier'] and s['supplier_product_id']==original['supplier_offer_id'])
 saved=re.sub(r'\D','',supplier['ean'] or '')
 assert valid(saved),(a,'supplier code invalid or changed')
 values=upcs(fresh.get('facts',{}).get('UPC',''))
 state='MULTIPLE_UPCS' if len(values)>1 else 'NOT_RECAPTURED' if not values else 'CORROBORATED' if values[0].zfill(14)==saved.zfill(14) else 'UPC_CONFLICT'
 note=original['specific_caution']
 if state=='UPC_CONFLICT':note='Saved supplier EAN '+saved+' versus fresh Amazon UPC '+values[0]+'. Confirm the exact product and box/sachet configuration before linking; do not replace the saved code automatically.'
 if state=='MULTIPLE_UPCS':note='Amazon lists a zero-padded-looking code alongside 034000006656. Keep the raw values separate and verify the physical barcode; check-digit agreement alone does not resolve the representation.'
 if state=='NOT_RECAPTURED':note=(note+' ' if note else '')+'The saved barcode agreement was not independently recaptured. Preserve it as historical evidence and request a pack label or clearer product source.'
 rows.append({'asin':a,'title':original['title'],'supplier':original['supplier'],'supplier_product_id':original['supplier_offer_id'],'supplier_product':original['supplier_product'],'supplier_ean':saved,'supplier_code_record_last_seen_at':supplier['last_seen_at'],'saved_amazon_ean13':sorted(set(c['code'][1:] for c in original['valid_amazon_codes'])),'fresh_status':state,'fresh_status_label':labels[state],'fresh_amazon_upcs':values,'fresh_upc_field':fresh.get('facts',{}).get('UPC',''),'fresh_amazon_title':fresh.get('captured_title'),'fresh_source_url':fresh.get('source_url'),'fresh_captured_at':fresh.get('captured_at'),'fresh_facts':fresh.get('facts',{}),'selected_pair_already_verified':original['selected_supplier_pair_verified'],'note':note,'identity_approved_by_this_review':False,'buy_ready':False})
assert len(rows)==21 and len({r['asin'] for r in rows})==21
counts=dict(collections.Counter(r['fresh_status'] for r in rows))
summary={'products_checked':21,'distinct_saved_supplier_codes':len({r['supplier_ean'].zfill(14) for r in rows}),'fresh_status_counts':counts,'newly_corroborated_unverified_pairs':sum(r['fresh_status']=='CORROBORATED' and not r['selected_pair_already_verified'] for r in rows),'new_identity_approvals':0}
result={'date_uk':'2026-10-24','scope':'Fresh public Amazon product-page UPC facts versus current saved supplier codes. Supplier pages and quotes were not refreshed. Barcode corroboration does not approve brand, size, form or sell-pack quantity.','summary':summary,'rows':rows}
(root/'reports/barcode-21-review-2026-10-24.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
lines=['# Barcode review: 21 product listings — 24 October 2026','','Fresh Amazon pages were captured for all 21 ASINs and their labelled UPC facts compared with saved wholesaler codes. This is a read-only evidence review: no identifiers, verified identities, supplier links, or BUY states were changed. Supplier prices, stock and source pages were not refreshed.','','## Result','',*['- '+k+': '+str(v) for k,v in summary.items()],'','CORROBORATED means the fresh single UPC matches the saved supplier code after standard zero-padding. It does not mean the sell pack or physical product is approved. Three pages did not expose a usable UPC. Ice Breakers Duo exposed two separate UPCs, so its padded saved code needs review. Sonic Ocean Water exposed UPC 072392355433, conflicting with saved supplier EAN 0072392306244. Cinnamon Toast Crunch and Trident retain their size/pack cautions even though their UPCs agree.','','| ASIN | Product | Supplier EAN | Fresh Amazon UPC | Result |','|---|---|---|---|---|']
for r in rows:lines.append('| '+' | '.join([r['asin'],r['title'].replace('|','/'),'`'+r['supplier_ean']+'`',', '.join('`'+v+'`' for v in r['fresh_amazon_upcs']) or 'Not exposed',r['fresh_status']])+' |')
lines+=['','## Cautions','']+[f"- {r['asin']}: {r['note']}" for r in rows if r['note']]
(root/'docs/barcode-21-review-2026-10-24.md').write_text('\n'.join(lines)+'\n')
snapshot_path=root/'lib/match-review-snapshot.json';snapshot=json.loads(snapshot_path.read_text());by={r['asin']:r for r in rows}
for r in snapshot['rows']:
 b=by.get(r['asin'])
 r['barcode_review']={k:b[k] for k in ['supplier_ean','saved_amazon_ean13','fresh_status','fresh_status_label','fresh_amazon_upcs','fresh_source_url','fresh_captured_at','fresh_amazon_title','note']} if b else None
snapshot['barcode_review_summary']=summary
snapshot_path.write_text(json.dumps(snapshot,ensure_ascii=False)+'\n')
print(json.dumps(summary,indent=2))
