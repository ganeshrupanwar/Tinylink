-- TinyLink main table
CREATE TABLE IF NOT EXISTS links (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(32) UNIQUE NOT NULL,  -- short code
    original_url    TEXT NOT NULL,               -- long URL
    title           TEXT,                        -- optional label
    clicks          INTEGER NOT NULL DEFAULT 0,  -- total clicks
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_clicked_at TIMESTAMPTZ,
    active          BOOLEAN NOT NULL DEFAULT TRUE
);
