CREATE TABLE config (
    id UUID PRIMARY KEY,
    language TEXT NOT NULL,
    user_name TEXT NOT NULL
);

CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    start TIMESTAMPTZ NOT NULL,
    end TIMESTAMPTZ,
    tags TEXT[] NOT NULL,
    raw_memo TEXT NOT NULL,
    processed_memo TEXT NOT NULL,
    raw_transcript TEXT NOT NULL
);
