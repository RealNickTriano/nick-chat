CREATE TABLE messages (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id     UUID         NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role        VARCHAR(20)  NOT NULL CHECK (role IN ('user', 'assistant')),
    content     TEXT         NOT NULL,
    provider    VARCHAR(50),
    model       VARCHAR(100),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_chat_id_created_at ON messages(chat_id, created_at ASC);
