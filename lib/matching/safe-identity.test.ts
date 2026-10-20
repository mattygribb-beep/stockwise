import {assessIdentity} from './safe-identity'
const tests:[string,any,any,string][]=[
['matching UPC and product',{title:'Heinz Dill Relish 375ml',brand:'Heinz',upc:'013000001380',packQty:1},{title:'Heinz Dill Relish 375ml',brand:'Heinz',upc:'013000001380',packQty:1},'CANDIDATE_STRONG'],
['conflicting flavours',{title:'Heinz Sweet Relish 375ml',brand:'Heinz'},{title:'Heinz Dill Relish 375ml',brand:'Heinz'},'REJECT'],
['single versus case',{title:'Kool Aid Black Cherry 355ml single',brand:'Kool Aid',packQty:1},{title:'Kool Aid Black Cherry 355ml case of 12',brand:'Kool Aid',packQty:12},'REJECT'],
['84.7g and 85g tolerance',{title:'Jell-O Cherry 84.7g',brand:'Jell-O',packQty:1},{title:'Jell-O Cherry 85g',brand:'Jell-O',packQty:1},'REVIEW'],
['different brands',{title:'Jell-O Cherry 85g',brand:'Jell-O'},{title:'Royal Cherry 85g',brand:'Royal'},'REJECT'],
['unit conversion',{title:'Candy 3oz',brand:'Candy',packQty:1},{title:'Candy 85g',brand:'Candy',packQty:1},'REVIEW'],
['barcode mismatch',{title:'Heinz Dill Relish 375ml',brand:'Heinz',upc:'013000001380'},{title:'Heinz Dill Relish 375ml',brand:'Heinz',upc:'013000001397'},'REJECT'],
['missing evidence',{title:'Nerds Gummy Clusters',brand:'Nerds'},{title:'Nerds Gummy Clusters',brand:'Nerds'},'REVIEW']
]
let failed=0;for(const [name,a,b,expected] of tests){const result=assessIdentity(a,b);if(result.decision!==expected){console.error('FAIL',name,result,expected);failed++}else console.log('PASS',name,result.decision)}if(failed)throw Error(failed+' matching tests failed')
