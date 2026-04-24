CREATE TABLE api_keys (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider       VARCHAR(50)  NOT NULL,
    encrypted_key  TEXT         NOT NULL,
    key_iv         TEXT         NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_api_keys_user_provider UNIQUE (user_id, provider)
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
