CREATE TABLE IF NOT EXISTS buying_public_observations (
 asin text NOT NULL CHECK (asin ~ '^[A-Z0-9]{10}$'),
 supplier text NOT NULL,
 supplier_offer_id text NOT NULL,
 identity_signature text NOT NULL,
 checked_at timestamptz NOT NULL,
 latest_attempt jsonb NOT NULL,
 amazon jsonb,
 supplier_observation jsonb,
 PRIMARY KEY (asin,supplier,supplier_offer_id)
);
