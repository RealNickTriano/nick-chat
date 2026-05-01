ALTER TABLE messages
    ADD COLUMN input_tokens    INTEGER,
    ADD COLUMN output_tokens   INTEGER,
    ADD COLUMN total_tokens    INTEGER,
    ADD COLUMN finish_reason   VARCHAR(20),
    ADD COLUMN response_id     VARCHAR(255),
    ADD COLUMN latency_ms      INTEGER,
    ADD COLUMN ttft_ms         INTEGER,
    ADD COLUMN resolved_model  VARCHAR(255);
