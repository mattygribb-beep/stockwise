-- Apply only after preview verification; additive, does not alter existing verified candidates.
CREATE TABLE IF NOT EXISTS amazon_supplier_match_reviews (
 id bigserial PRIMARY KEY,
 asin text NOT NULL,
 supplier_offer_id bigint NOT NULL REFERENCES supplier_offers(id),
 decision text NOT NULL CHECK (decision IN ('PROTECTED','REVIEW','REJECTED')),
 reason text NOT NULL CHECK (length(trim(reason))>0),
 evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
 reviewer text NOT NULL DEFAULT 'owner',
 reviewed_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (asin,supplier_offer_id)
);
CREATE INDEX IF NOT EXISTS amazon_supplier_match_reviews_asin_idx ON amazon_supplier_match_reviews(asin);
-- No automatic promotion of historical 'verified' rows.