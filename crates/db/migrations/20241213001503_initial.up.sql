CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    start TIMESTAMPTZ NOT NULL,
    end TIMESTAMPTZ,
    tags TEXT[] NOT NULL,
    raw_memo TEXT NOT NULL,
    processed_memo TEXT NOT NULL,
    raw_transcript TEXT NOT NULL,
    processed_transcript JSON
);
