-- =============================================================
-- Persisted weather cache — one row per office per date.
-- Populated by a daily Vercel cron and on-demand backfill
-- when admins browse historical attendance.
-- =============================================================

CREATE TABLE IF NOT EXISTS daily_weather (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id       uuid NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  date            date NOT NULL,
  temperature_max real,
  temperature_min real,
  precipitation   real DEFAULT 0,
  weather_code    int,
  description     text,
  fetched_at      timestamptz DEFAULT now(),
  UNIQUE(office_id, date)
);

ALTER TABLE daily_weather ENABLE ROW LEVEL SECURITY;

-- Admins (authenticated) can read; service role writes.
DROP POLICY IF EXISTS "authenticated can read weather" ON daily_weather;
CREATE POLICY "authenticated can read weather" ON daily_weather
  FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_daily_weather_office_date
  ON daily_weather(office_id, date);
