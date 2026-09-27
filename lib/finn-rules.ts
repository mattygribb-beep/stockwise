export const FINN_PRINCIPLES = [
  'Search first, reason second.',
  'Never hide a relevant single-supplier result just because a comparison is unavailable.',
  'Product identity confidence and buying confidence are separate things.',
  'EAN/UPC or ASIN exact matches may verify identity; title similarity alone never does.',
  'Identity-only and zero-price records may help discovery but never price economics.',
  'Compare like with like: account for case quantity, unit size, variant and VAT basis.',
  'Never call an offer cheapest unless at least two usable priced offers belong to the same sufficiently trusted identity.',
  'Missing data must reduce certainty, not be silently guessed.',
  'Explain why a match or decision was made and show the evidence used.',
  'Finn may surface opportunities early, but a BUY-style decision requires the buying gates to be satisfied.',
] as const

export const FIVE_CORE_QUESTIONS = [
  'Opportunity',
  'Value',
  'Safety',
  'Buying Discipline',
  'Capital Efficiency',
] as const

export type FinnMatchConfidence = 'VERIFIED' | 'STRONG POSSIBLE' | 'POSSIBLE' | 'LOOSE POSSIBLE'
export type FinnDecision = 'BUY' | 'TEST BUY' | 'CONSIDER' | 'WALK AWAY' | 'NOT READY'

export type FinnEvidence = {
  confidence: FinnMatchConfidence
  eanExact?: boolean
  asinExact?: boolean
  sameVariant?: boolean
  sameSize?: boolean
  sameCaseQty?: boolean
  pricedSupplierCount?: number
  usablePrice?: boolean
  amazonMatched?: boolean
  feesKnown?: boolean
  demandKnown?: boolean
  competitionKnown?: boolean
  priceHistoryKnown?: boolean
}

export function canComparePrices(e: FinnEvidence) {
  return e.confidence === 'VERIFIED' &&
    e.sameVariant !== false &&
    e.sameSize !== false &&
    (e.pricedSupplierCount || 0) >= 2
}

export function canClaimCheapest(e: FinnEvidence) {
  return canComparePrices(e) && e.usablePrice === true
}

export function canMakeBuyingDecision(e: FinnEvidence) {
  return e.confidence === 'VERIFIED' &&
    e.usablePrice === true &&
    e.amazonMatched === true &&
    e.feesKnown === true &&
    e.demandKnown === true
}

export function buyingReadiness(e: FinnEvidence): {ready: boolean; missing: string[]} {
  const missing: string[] = []
  if (e.confidence !== 'VERIFIED') missing.push('verified product identity')
  if (!e.usablePrice) missing.push('usable supplier price')
  if (!e.amazonMatched) missing.push('verified Amazon listing')
  if (!e.feesKnown) missing.push('Amazon fees')
  if (!e.demandKnown) missing.push('demand evidence')
  return {ready: missing.length === 0, missing}
}

export function safeDecision(requested: FinnDecision, e: FinnEvidence): FinnDecision {
  if (requested === 'WALK AWAY') return requested
  return canMakeBuyingDecision(e) ? requested : 'NOT READY'
}
