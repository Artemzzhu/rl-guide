ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(30) NOT NULL DEFAULT 'student';

INSERT INTO users (email, password_hash, full_name, role)
VALUES (
  'admin@example.com',
  '$2b$12$PKzhIm.3FbjmE1WSJ4LiEO8/B8luUG5yp1vNCOFNWP0hZuFT.QD1a',
  'Администратор',
  'admin'
)
ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  full_name = EXCLUDED.full_name,
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();
