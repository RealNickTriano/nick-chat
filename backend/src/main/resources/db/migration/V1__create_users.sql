CREATE TABLE users (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    google_sub     VARCHAR(255) NOT NULL UNIQUE,
    email          VARCHAR(320) NOT NULL,
    display_name   VARCHAR(255),
    picture_url    TEXT,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_login_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
