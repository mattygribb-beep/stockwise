// Sweet & Glory published UK mainland parcel table, checked 25 October 2026.
// https://sweetandglory.com/delivery — rates exclude VAT. Checkout remains authoritative.
export function sweetGloryParcel(exVatSubtotal:number,totalKg:number){
 if(!Number.isFinite(exVatSubtotal)||exVatSubtotal<0||!Number.isFinite(totalKg)||totalKg<=0||totalKg>175)return null
 const band=Math.min(6,Math.ceil(totalKg/25)-1),spend=exVatSubtotal>600?4:exVatSubtotal>450?3:exVatSubtotal>300?2:exVatSubtotal>150?1:0
 const table=[[7.10,0,0,0,0],[11.80,7.10,0,0,0],[17.70,11.80,7.10,0,0],[23.60,17.70,11.80,7.10,0],[29.50,23.60,17.70,11.80,0],[35.40,29.50,23.60,17.70,0],[41.30,35.40,29.50,23.60,0]]
 return Math.round(table[band][spend]*1.2*100)/100
}
