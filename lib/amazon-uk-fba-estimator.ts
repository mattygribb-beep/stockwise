export type UkFbaInput = {
 price: number; category?: string; weightG: number;
 lengthCm?: number; widthCm?: number; heightCm?: number;
 asOf?: string; ukEstablishedSeller?: boolean;
}

// UK domestic Grocery and Gourmet only: published estimates, never SP-API quotes.
// Amazon rate card effective 1 July 2026, pages 5–9 (zero-based 4–8).
export const UK_FBA_RATE_CARD_URL = 'https://m.media-amazon.com/images/G/02/sell/images/260630-FBA-Rate-Card-EN1.pdf'
type Tier = { name: string; dims: number[]; maxG: number; base: number; peak?: number; increment?: number }
const lightWeights = [20, 40, 60, 80, 100]
const low: Tier[] = [
 ...[1.46, 1.50, 1.52, 1.67, 1.70].map((base, index) => ({ name: 'Low-price light envelope', dims: [33, 23, 2.5], maxG: lightWeights[index], base })),
 { name: 'Low-price standard envelope', dims: [33, 23, 2.5], maxG: 210, base: 1.73 },
 { name: 'Low-price standard envelope', dims: [33, 23, 2.5], maxG: 460, base: 1.87 },
 { name: 'Low-price large envelope', dims: [33, 23, 4], maxG: 960, base: 2.42 },
 { name: 'Low-price extra-large envelope', dims: [33, 23, 6], maxG: 960, base: 2.65 },
 { name: 'Low-price small parcel', dims: [35, 25, 12], maxG: 150, base: 2.67 },
 { name: 'Low-price small parcel', dims: [35, 25, 12], maxG: 400, base: 2.70 },
]
const standard: Tier[] = [
 ...[1.83, 1.87, 1.89, 2.07, 2.10].map((base, index) => ({ name: 'Light envelope', dims: [33, 23, 2.5], maxG: lightWeights[index], base })),
 { name: 'Standard envelope', dims: [33, 23, 2.5], maxG: 210, base: 2.14 },
 { name: 'Standard envelope', dims: [33, 23, 2.5], maxG: 460, base: 2.28 },
 { name: 'Large envelope', dims: [33, 23, 4], maxG: 960, base: 3.00, peak: 3.07 },
 { name: 'Extra-large envelope', dims: [33, 23, 6], maxG: 960, base: 3.34, peak: 3.41 },
 { name: 'Small Parcel 1', dims: [35, 25, 7], maxG: 3900, base: 2.83, peak: 2.95, increment: .02 },
 { name: 'Small Parcel 2', dims: [35, 25, 9], maxG: 3900, base: 2.87, peak: 2.99, increment: .02 },
 { name: 'Small Parcel 3', dims: [35, 25, 12], maxG: 3900, base: 2.91, peak: 3.04, increment: .02 },
 { name: 'Medium Parcel 1', dims: [40, 30, 6], maxG: 11900, base: 2.97, peak: 3.10, increment: .02 },
 { name: 'Medium Parcel 2', dims: [40, 30, 20], maxG: 11900, base: 3.10, peak: 3.23, increment: .03 },
 { name: 'Large Parcel 1', dims: [45, 34, 10], maxG: 11900, base: 3.34, peak: 3.48, increment: .03 },
 { name: 'Large Parcel 2', dims: [45, 34, 26], maxG: 11900, base: 3.97, peak: 4.14, increment: .03 },
]
const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
const positive = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0
const fits = (t: Tier, weight: number, dims: number[]) => weight <= t.maxG && dims.every((d, index) => d <= t.dims[index])
const grocery = (category = '') => /^(grocery(?:\s*(?:and|&)\s*gourmet)?|grocery and gourmet food)$/i.test(category.trim())
const feeFor = (t: Tier, weight: number, peak: boolean) => round((peak ? t.peak ?? t.base : t.base) + (t.increment ?? 0) * Math.max(0, Math.ceil((weight - 100) / 100)))

export function estimateUkFba(i: UkFbaInput) {
 const p = Number(i.price), w = Number(i.weightG)
 const asOf = i.asOf ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
 const validDate = /^\d{4}-\d{2}-\d{2}$/.test(asOf) && !Number.isNaN(Date.parse(asOf)) && new Date(asOf).toISOString().slice(0, 10) === asOf
 const isGrocery = grocery(i.category)
 const peak = validDate && asOf >= '2026-10-15' && asOf <= '2027-01-14'
 const dateCovered = validDate && asOf >= '2026-07-01' && asOf <= '2027-01-14'
 const dimensions = [i.lengthCm, i.widthCm, i.heightCm].map(Number).sort((a, b) => b - a)
 const hasDimensions = dimensions.every(positive)
 let confidence = 'RATE_CARD_ESTIMATE'
 if (!positive(p) || !validDate || !Number.isFinite(w) || w < 0) confidence = 'INVALID_INPUT'
 else if (!dateCovered) confidence = 'NEEDS_RATE_CARD_UPDATE'
 else if (!isGrocery) confidence = 'NEEDS_CATEGORY_RATE'
 else if (!positive(w)) confidence = 'NEEDS_WEIGHT'
 else if (!hasDimensions) confidence = 'NEEDS_DIMENSIONS'

 const referralRate = isGrocery && positive(p) && dateCovered ? (p <= 10 ? .05 : .15) : null
 // Grocery and Gourmet has no minimum referral fee: no general 25p floor.
 const referral = referralRate == null ? null : round(p * referralRate)
 const lowPriceThresholdMet = isGrocery && positive(p) && p <= 10
 let chosen: Tier | undefined
 let lowEligible = false
 if (confidence === 'RATE_CARD_ESTIMATE') {
  chosen = lowPriceThresholdMet ? low.find(t => fits(t, w, dimensions)) : undefined
  lowEligible = !!chosen
  if (!chosen) chosen = standard.find(t => fits(t, w, dimensions))
  if (!chosen) confidence = 'UNSUPPORTED_SIZE'
 }
 const base = chosen ? feeFor(chosen, w, peak && !lowEligible) : null
 const fulfilment = base == null ? null : round(base * 1.015)
 const subtotal = referral == null || fulfilment == null ? null : round(referral + fulfilment)
 // Other establishments require their own digital-services fee matrix.
 const dsfRate = i.ukEstablishedSeller === false ? null : .02
 if (dsfRate == null && confidence === 'RATE_CARD_ESTIMATE') confidence = 'NEEDS_SELLER_FEE_TREATMENT'
 const dsf = subtotal == null || dsfRate == null ? null : round(subtotal * dsfRate)
 const total = subtotal == null || dsf == null ? null : round(subtotal + dsf)
 return {
  source: 'AMAZON_UK_RATE_CARD_2026_07_01', sourceUrl: UK_FBA_RATE_CARD_URL,
  verifiedAt: '2026-10-23', asOf, estimateType: 'PUBLISHED_RATE_CARD', isLiveQuote: false,
  category: isGrocery ? 'Grocery and Gourmet' : i.category || 'Unknown',
  lowPriceThresholdMet, lowPriceEligible: hasDimensions && positive(w) && isGrocery && dateCovered ? lowEligible : null,
  peakPeriod: peak, peakApplied: base == null ? null : peak && !lowEligible,
  referralRate, referralFee: referral, fulfilmentTier: chosen?.name ?? null,
  fulfilmentBase: base, fuelLogisticsSurchargeRate: .015,
  fuelLogisticsSurcharge: base == null || fulfilment == null ? null : round(fulfilment - base), fulfilmentFee: fulfilment,
  digitalServicesFeeRate: dsfRate, digitalServicesFee: dsf,
  estimatedAmazonFees: total, estimatedAmazonFeesExVat: total,
  feeVatScenarioRate: .20, estimatedAmazonFeesIf20PercentFeeVat: total == null ? null : round(total * 1.2),
  confidence, inputBasis: 'Dimensions and weight must describe the complete packaged Amazon sell unit, including every item in a multipack.',
  assumptions: ['UK domestic fulfilment', 'UK-established seller unless explicitly excluded', 'Professional selling plan', 'No Ships in Product Packaging discount', '20% fee VAT shown as a cash-cost scenario, not a VAT recovery determination'],
  excludes: ['storage', 'aged inventory', 'returns processing', 'prep', 'inbound transport', 'supplier delivery', 'advertising', 'seller plan allocation', 'product VAT and VAT recovery', 'category or programme eligibility confirmation'],
 }
}
