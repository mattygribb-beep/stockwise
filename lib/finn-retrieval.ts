export type FinnOffer = {
  id?: string
  supplier?: string
  product?: string
  rawTitle?: string
  brand?: string
  size?: string
  ean?: string
  asin?: string
  supplierSku?: string
  caseQty?: number
  casePrice?: number
  effectiveCasePrice?: number
  effectiveUnitCost?: number
  unitCost?: number
  identityStatus?: string
  eanConfidence?: string
  asinConfidence?: string
  [key: string]: unknown
}

export type FinnSearchIntent = {
  raw: string
  include: string[]
  exclude: string[]
  brand?: string
  ean?: string
  asin?: string
  size?: string
  packCount?: number
  maxCase?: number
}

const STOP = new Set(['find','me','for','a','an','the','some','please','looking','want','i','am','interested','in','with','and','or','product','products','stock','supplier','suppliers','case','cases'])
const clean = (s = '') => s.toLowerCase().replace(/[^a-z0-9.]+/g, ' ').replace(/\s+/g, ' ').trim()
const tokens = (s = '') => clean(s).split(' ').filter(x => x.length > 1 && !STOP.has(x))

export function parseFinnIntent(raw: string, filters?: {include?: string; exclude?: string; brand?: string; maxCase?: string | number}): FinnSearchIntent {
  const q = raw || ''
  const lower = q.toLowerCase()
  const ean = q.match(/\b\d{8,14}\b/)?.[0]
  const asin = q.match(/\bB0[A-Z0-9]{8}\b/i)?.[0]?.toUpperCase()
  const size = q.match(/\b\d+(?:\.\d+)?\s?(?:g|kg|ml|l|oz|fl\s?oz)\b/i)?.[0]
  const pack = q.match(/\b(?:pack|case|box)\s*(?:of\s*)?(\d+)\b/i) || q.match(/\b(\d+)\s*[xX]\b/)
  const excludedPhrase = (lower.match(/(?:don't|do not|exclude|excluding|avoid)\s+(?:find\s+)?([^.;]+)/) || [])[1] || ''
  const explicitInclude = filters?.include?.trim()
  const includeText = explicitInclude || q.replace(/(?:don't|do not|exclude|excluding|avoid)[^.;]*/gi, ' ')
  const include = tokens(includeText)
  const exclude = tokens(filters?.exclude || excludedPhrase)
  return {
    raw: q,
    include,
    exclude,
    brand: filters?.brand?.trim() || undefined,
    ean,
    asin,
    size: size ? clean(size) : undefined,
    packCount: pack ? Number(pack[1]) : undefined,
    maxCase: Number(filters?.maxCase) || undefined,
  }
}

function offerHaystack(o: FinnOffer) {
  return clean([o.product,o.rawTitle,o.brand,o.size,o.ean,o.asin,o.supplierSku].filter(Boolean).join(' '))
}

export function rankFinnOffers(allOffers: FinnOffer[], intent: FinnSearchIntent) {
  const wanted = intent.include
  return allOffers.map(offer => {
    const hay = offerHaystack(offer)
    const hayTokens = new Set(tokens(hay))
    const caseCost = Number(offer.effectiveCasePrice ?? offer.casePrice ?? 0)
    if (intent.maxCase && caseCost > intent.maxCase) return null
    if (intent.exclude.some(t => hay.includes(clean(t)))) return null
    if (intent.brand && !hay.includes(clean(intent.brand))) return null

    const eanExact = !!intent.ean && clean(String(offer.ean || '')).replace(/^0+/, '') === clean(intent.ean).replace(/^0+/, '')
    const asinExact = !!intent.asin && String(offer.asin || '').toUpperCase() === intent.asin
    const matched = wanted.filter(t => hay.includes(clean(t)) || hayTokens.has(clean(t)))
    const coverage = wanted.length ? matched.length / wanted.length : 0
    const sizeMatch = !!intent.size && hay.includes(intent.size)
    const packMatch = !!intent.packCount && Number(offer.caseQty || 0) === intent.packCount

    let score = 0
    if (eanExact) score += 100
    if (asinExact) score += 95
    score += coverage * 60
    if (intent.brand && hay.includes(clean(intent.brand))) score += 20
    if (sizeMatch) score += 15
    if (packMatch) score += 8
    if (caseCost > 0) score += 4

    if (!eanExact && !asinExact && wanted.length && matched.length === 0) return null
    const confidence = eanExact || asinExact ? 'VERIFIED' : (coverage >= .75 && (sizeMatch || !!intent.brand)) ? 'STRONG POSSIBLE' : coverage >= .4 ? 'POSSIBLE' : 'LOOSE POSSIBLE'
    return {offer, score, confidence, matchedTerms: matched, caseCost}
  }).filter(Boolean).sort((a:any,b:any) => b.score - a.score || a.caseCost - b.caseCost)
}

export function groupFinnResults(ranked: ReturnType<typeof rankFinnOffers>) {
  const groups = new Map<string, any[]>()
  for (const r of ranked as any[]) {
    const o = r.offer as FinnOffer
    const identity = o.ean ? `ean:${String(o.ean).replace(/^0+/, '')}` : o.asin ? `asin:${String(o.asin).toUpperCase()}` : `name:${clean(`${o.product || ''} ${o.size || ''}`)}`
    groups.set(identity, [...(groups.get(identity) || []), r])
  }
  return [...groups.values()].map(group => {
    const sorted = [...group].sort((a,b) => {\n      const ap=a.caseCost>0?a.caseCost:Number.POSITIVE_INFINITY, bp=b.caseCost>0?b.caseCost:Number.POSITIVE_INFINITY\n      return ap-bp || b.score-a.score\n    })
    const best = sorted[0]
    const alt = sorted[1]
    return {
      product: best.offer.product,
      size: best.offer.size,
      best: best.offer,
      bestCost: best.caseCost,
      confidence: best.confidence,
      score: best.score,
      supplierCount: new Set(sorted.map(x => x.offer.supplier)).size,
      alt: alt?.offer,
      altCost: alt?.caseCost,
      saving: alt ? alt.caseCost - best.caseCost : null,
      pct: alt?.caseCost ? ((alt.caseCost - best.caseCost) / alt.caseCost) * 100 : null,
      status: new Set(sorted.filter(x=>x.caseCost>0).map(x=>x.offer.supplier)).size>1 ? 'COMPARISON' : 'SINGLE SOURCE',
    }
  }).sort((a,b) => b.score - a.score)
}
