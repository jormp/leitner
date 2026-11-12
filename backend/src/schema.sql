CREATE TABLE IF NOT EXISTS users (
  id                       SERIAL PRIMARY KEY,
  name                     TEXT        NOT NULL,
  email                    TEXT        NOT NULL UNIQUE,
  password_hash            TEXT        NOT NULL,
  email_verified           BOOLEAN     NOT NULL DEFAULT FALSE,
  verification_token_hash  TEXT,
  verification_expires_at  TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_verification_token_idx
  ON users (verification_token_hash);

-- Cajas del sistema Leitner (datos fijos)
CREATE TABLE IF NOT EXISTS boxes (
  id            SMALLINT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL,
  interval_days INTEGER NOT NULL
);

INSERT INTO boxes (id, name, description, interval_days) VALUES
  (1, 'Caja 1', 'Repaso diario',      1),
  (2, 'Caja 2', 'Repaso cada 3 días', 3),
  (3, 'Caja 3', 'Repaso semanal',     7),
  (4, 'Caja 4', 'Repaso quincenal',   15),
  (5, 'Caja 5', 'Repaso mensual',     30)
ON CONFLICT (id) DO UPDATE SET
  name          = EXCLUDED.name,
  description   = EXCLUDED.description,
  interval_days = EXCLUDED.interval_days;

CREATE TABLE IF NOT EXISTS questions (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  text             TEXT        NOT NULL,
  box_id           SMALLINT    NOT NULL DEFAULT 1 REFERENCES boxes (id),
  next_review_date DATE        NOT NULL DEFAULT CURRENT_DATE,
  last_reviewed_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS questions_user_box_due_idx
  ON questions (user_id, box_id, next_review_date);

-- Respuesta correcta de cada pregunta
CREATE TABLE IF NOT EXISTS answers (
  id          SERIAL PRIMARY KEY,
  question_id INTEGER NOT NULL UNIQUE REFERENCES questions (id) ON DELETE CASCADE,
  text        TEXT    NOT NULL
);
