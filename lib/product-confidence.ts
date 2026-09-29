export type ConfidenceLevel = "VERY HIGH" | "HIGH" | "MEDIUM" | "LOW";

export type ProductEvidence = {
  asinConfirmed?: boolean;
  barcodeAmazon?: string | null;
  barcodeSupplier?: string | null;
  brandMatch?: boolean;
  productMatch?: boolean;
  variantMatch?: boolean;
  sizeMatch?: boolean;
  packMatch?: boolean;
  manuallyVerified?: boolean;
};

export type ProductConflict =
  | "BARCODE_CONFLICT"
  | "BRAND_CONFLICT"
  | "PRODUCT_CONFLICT"
  | "VARIANT_CONFLICT"
  | "SIZE_CONFLICT"
  | "PACK_CONFLICT";

export type ProductConfidence = {
  score: number;
  level: ConfidenceLevel;
  autoLink: boolean;
  requiresReview: boolean;
  evidence: string[];
  conflicts: ProductConflict[];
  explanation: string;
};

const cleanCode = (value?: string | null) =>
  (value || "").replace(/[^0-9A-Za-z]/g, "").toUpperCase();

export function calculateProductConfidence(e: ProductEvidence): ProductConfidence {
  let score = 0;
  const evidence: string[] = [];
  const conflicts: ProductConflict[] = [];

  const amazonCode = cleanCode(e.barcodeAmazon);
  const supplierCode = cleanCode(e.barcodeSupplier);
  const hasBothCodes = Boolean(amazonCode && supplierCode);

  if (e.asinConfirmed) {
    score += 30;
    evidence.push("ASIN confirmed");
  }

  if (hasBothCodes) {
    if (amazonCode === supplierCode) {
      score += 40;
      evidence.push("Barcode/GTIN agrees");
    } else {
      conflicts.push("BARCODE_CONFLICT");
    }
  }

  const add = (
    value: boolean | undefined,
    points: number,
    label: string,
    conflict: ProductConflict,
  ) => {
    if (value === true) {
      score += points;
      evidence.push(label);
    } else if (value === false) {
      conflicts.push(conflict);
    }
  };

  add(e.brandMatch, 5, "Brand agrees", "BRAND_CONFLICT");
  add(e.productMatch, 10, "Product agrees", "PRODUCT_CONFLICT");
  add(e.variantMatch, 5, "Variant/flavour agrees", "VARIANT_CONFLICT");
  add(e.sizeMatch, 5, "Unit size agrees", "SIZE_CONFLICT");
  add(e.packMatch, 5, "Pack configuration agrees", "PACK_CONFLICT");

  if (e.manuallyVerified) {
    score += 20;
    evidence.push("Manually verified");
  }

  score = Math.min(100, score);

  // A hard conflict must never be hidden by a high fuzzy/title score.
  const hardConflict = conflicts.some((c) =>
    ["BARCODE_CONFLICT", "PRODUCT_CONFLICT", "VARIANT_CONFLICT", "SIZE_CONFLICT", "PACK_CONFLICT"].includes(c),
  );

  const level: ConfidenceLevel =
    score >= 90 && !hardConflict
      ? "VERY HIGH"
      : score >= 75 && !hardConflict
        ? "HIGH"
        : score >= 50
          ? "MEDIUM"
          : "LOW";

  // Automatic linking is deliberately conservative: require either barcode agreement
  // or manual verification, plus no contradictory product evidence.
  const strongIdentifier = (hasBothCodes && amazonCode === supplierCode) || e.manuallyVerified === true;
  const autoLink = strongIdentifier && !hardConflict && score >= 75;
  const requiresReview = !autoLink;

  const explanation = conflicts.length
    ? `${level} confidence · review required: ${conflicts.join(", ").toLowerCase().replaceAll("_", " ")}`
    : `${level} confidence · ${evidence.join(" · ") || "insufficient evidence"}`;

  return { score, level, autoLink, requiresReview, evidence, conflicts, explanation };
}
