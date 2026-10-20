import {validateBarcode,compareBarcodes,evaluateBarcodeEnrichment} from './gtin'
const cases:[string,boolean][]=[['013000001380',true],['013000001397',true],['0043000200261',true],['0038000138638',true],['000000000000',true],['013000001381',false],['ABC013000001380',false],['12345678901',false]]
let failures=0
for(const [barcode,expected] of cases){const actual=validateBarcode(barcode).valid;if(actual!==expected){failures++;console.error('FAIL',barcode,actual,expected)}else console.log('PASS',barcode)}
const checks:[string,boolean][]=[['UPC/EAN same',compareBarcodes('013000001380','0013000001380').match],['different products',!compareBarcodes('013000001380','013000001397').match],['conflicting existing',evaluateBarcodeEnrichment('013000001380','013000001397').action==='REVIEW_CONFLICT'],['new proposal',evaluateBarcodeEnrichment(null,'013000001380').action==='PROPOSE_NEW'],['invalid rejected',evaluateBarcodeEnrichment(null,'013000001381').action==='REJECT_INVALID']]
for(const [name,ok] of checks){if(!ok){failures++;console.error('FAIL',name)}else console.log('PASS',name)}
if(failures)throw Error(failures+' barcode regression checks failed')
