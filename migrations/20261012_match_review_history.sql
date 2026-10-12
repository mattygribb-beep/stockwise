-- Apply after 20261011_match_reviews.sql. Additive, no existing records removed.
CREATE TABLE IF NOT EXISTS amazon_supplier_match_review_history (
 id bigserial PRIMARY KEY,
 asin text NOT NULL,
 supplier_offer_id bigint NOT NULL,
 previous_decision text,
 decision text NOT NULL CHECK (decision IN ('PROTECTED','REVIEW','REJECTED')),
 reason text NOT NULL,
 evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
 reviewer text NOT NULL DEFAULT 'owner',
 changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS amazon_supplier_match_review_history_pair_idx ON amazon_supplier_match_review_history(asin,supplier_offer_id,changed_at DESC);
CREATE OR REPLACE FUNCTION log_amazon_supplier_match_review() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO amazon_supplier_match_review_history(asin,supplier_offer_id,previous_decision,decision,reason,evidence,reviewer)
 VALUES(NEW.asin,NEW.supplier_offer_id,CASE WHEN TG_OP='UPDATE' THEN OLD.decision ELSE NULL END,NEW.decision,NEW.reason,NEW.evidence,NEW.reviewer);
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS amazon_supplier_match_review_audit_trigger ON amazon_supplier_match_reviews;
CREATE TRIGGER amazon_supplier_match_review_audit_trigger AFTER INSERT OR UPDATE ON amazon_supplier_match_reviews FOR EACH ROW EXECUTE FUNCTION log_amazon_supplier_match_review();
