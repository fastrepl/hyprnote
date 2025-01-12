CREATE TABLE customers (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id)
);
