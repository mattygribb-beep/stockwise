const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/amazon-uk-fba-estimator.ts', 'utf8'), {
 compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: exportsObject, Intl, Date });
const estimate = overrides => exportsObject.estimateUkFba({ price: 5.19, category: 'Grocery and Gourmet', weightG: 142, lengthCm: 17.1, widthCm: 13.6, heightCm: 6.1, asOf: '2026-10-23', ...overrides });

test('thick candy bag uses parcel rate, not an envelope rate', () => {
 const e = estimate();
 assert.equal(e.fulfilmentTier, 'Low-price small parcel');
 assert.equal(e.fulfilmentBase, 2.67);
 assert.equal(e.fulfilmentFee, 2.71);
 assert.equal(e.referralFee, .26);
 assert.equal(e.digitalServicesFee, .06);
 assert.equal(e.estimatedAmazonFeesExVat, 3.03);
 assert.equal(e.estimatedAmazonFeesIf20PercentFeeVat, 3.64);
 assert.equal(e.isLiveQuote, false);
});
test('grocery referral fee has no 25p minimum', () => assert.equal(estimate({ price: 2.49 }).referralFee, .12));
test('grocery threshold is inclusive at ten pounds', () => {
 assert.equal(estimate({ price: 10 }).lowPriceEligible, true);
 assert.equal(estimate({ price: 10.01 }).lowPriceEligible, false);
 assert.equal(estimate({ price: 10.01 }).referralRate, .15);
});
test('missing dimensions cannot produce a total fee', () => {
 const e = estimate({ heightCm: undefined });
 assert.equal(e.confidence, 'NEEDS_DIMENSIONS');
 assert.equal(e.estimatedAmazonFees, null);
 assert.equal(e.lowPriceEligible, null);
});
test('missing weight cannot select the cheapest bracket', () => {
 const e = estimate({ weightG: 0 });
 assert.equal(e.confidence, 'NEEDS_WEIGHT');
 assert.equal(e.estimatedAmazonFees, null);
});
test('invalid price and impossible date return no total', () => {
 for (const overrides of [{ price: 0 }, { price: NaN }, { asOf: '2026-02-30' }]) {
  const e = estimate(overrides);
  assert.equal(e.confidence, 'INVALID_INPUT');
  assert.equal(e.estimatedAmazonFees, null);
 }
});
test('grocery parcels over 400g do not use low-price parcel rate', () => {
 const e = estimate({ weightG: 410, lengthCm: 30, widthCm: 20, heightCm: 7 });
 assert.equal(e.lowPriceEligible, false);
 assert.equal(e.fulfilmentTier, 'Small Parcel 1');
 assert.equal(e.fulfilmentBase, 3.03);
});
test('published low-price large-envelope weight bracket remains available', () => {
 const e = estimate({ weightG: 960, lengthCm: 20, widthCm: 10, heightCm: 4 });
 assert.equal(e.lowPriceEligible, true);
 assert.equal(e.fulfilmentBase, 2.42);
});
test('peak starts on October 15 and does not uplift low-price fees', () => {
 assert.equal(estimate({ price: 15, asOf: '2026-10-14' }).fulfilmentBase, 2.85);
 assert.equal(estimate({ price: 15, asOf: '2026-10-15' }).fulfilmentBase, 2.97);
 assert.equal(estimate({ asOf: '2026-10-15' }).peakApplied, false);
});
test('unsupported dates and categories never invent rates', () => {
 assert.equal(estimate({ asOf: '2027-01-15' }).confidence, 'NEEDS_RATE_CARD_UPDATE');
 assert.equal(estimate({ category: 'Kitchen' }).confidence, 'NEEDS_CATEGORY_RATE');
 assert.equal(estimate({ category: 'Kitchen' }).estimatedAmazonFees, null);
});
test('oversize and non-UK establishments need additional fee rules', () => {
 assert.equal(estimate({ lengthCm: 90 }).confidence, 'UNSUPPORTED_SIZE');
 const e = estimate({ ukEstablishedSeller: false });
 assert.equal(e.confidence, 'NEEDS_SELLER_FEE_TREATMENT');
 assert.equal(e.estimatedAmazonFees, null);
});
test('dimension order cannot change the tier', () => {
 assert.equal(estimate({ lengthCm: 6.1, widthCm: 17.1, heightCm: 13.6 }).fulfilmentBase, estimate().fulfilmentBase);
});
