-- ============================================================
-- UniVerse Complete Database Schema (base + all extensions)
-- Run this on a fresh database: psql -U postgres -d universe_db -f schema_complete.sql
-- ============================================================

-- ENUM TYPES (skip if already exist)
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('student','instructor','club_member','student_club','admin'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE team_status AS ENUM ('open','full','closed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE announcement_tag AS ENUM ('Important','General','Events','Technical','Academic'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE badge_tier AS ENUM ('Bronze','Silver','Gold'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE event_type AS ENUM ('lecture','meeting','exam','deadline','club_event','office_hours'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE message_channel_type AS ENUM ('course','club','team','direct'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- BASE TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          user_role NOT NULL DEFAULT 'student',
  avatar_color  VARCHAR(20) DEFAULT '#7c3aed',
  is_online     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courses (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  code        VARCHAR(20) UNIQUE NOT NULL,
  color       VARCHAR(20) DEFAULT '#3b82f6',
  description TEXT,
  created_by  INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_members (
  id         SERIAL PRIMARY KEY,
  course_id  INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       VARCHAR(20) DEFAULT 'student',
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (course_id, user_id)
);

CREATE TABLE IF NOT EXISTS clubs (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  color       VARCHAR(20) DEFAULT '#7c3aed',
  created_by  INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS club_members (
  id        SERIAL PRIMARY KEY,
  club_id   INT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      VARCHAR(20) DEFAULT 'member',
  status    VARCHAR(20) DEFAULT 'approved',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (club_id, user_id)
);

CREATE TABLE IF NOT EXISTS teams (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  course_id   INT REFERENCES courses(id) ON DELETE CASCADE,
  description TEXT,
  type        VARCHAR(50) DEFAULT 'Study Group',
  max_members INT DEFAULT 5,
  level_req   VARCHAR(50) DEFAULT 'Any',
  status      team_status DEFAULT 'open',
  created_by  INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  id        SERIAL PRIMARY KEY,
  team_id   INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      VARCHAR(20) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS team_requests (
  id           SERIAL PRIMARY KEY,
  team_id      INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       VARCHAR(20) DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id           SERIAL PRIMARY KEY,
  channel_type message_channel_type NOT NULL,
  channel_id   INT NOT NULL,
  sender_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  sent_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_type, channel_id);

CREATE TABLE IF NOT EXISTS announcements (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  body        TEXT NOT NULL,
  tag         announcement_tag DEFAULT 'General',
  is_pinned   BOOLEAN DEFAULT FALSE,
  course_id   INT REFERENCES courses(id) ON DELETE CASCADE,
  created_by  INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  due_date    TIMESTAMPTZ,
  course_id   INT REFERENCES courses(id) ON DELETE SET NULL,
  is_done     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  type        event_type DEFAULT 'lecture',
  start_time  TIMESTAMPTZ NOT NULL,
  end_time    TIMESTAMPTZ,
  course_id   INT REFERENCES courses(id) ON DELETE SET NULL,
  club_id     INT REFERENCES clubs(id) ON DELETE SET NULL,
  created_by  INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS badges (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  tier        badge_tier DEFAULT 'Bronze',
  category    VARCHAR(50) DEFAULT 'Academic',
  icon        VARCHAR(10) DEFAULT '🏅',
  xp_reward   INT DEFAULT 50,
  max_xp      INT DEFAULT 100,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_badges (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id    INT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  progress_xp INT DEFAULT 0,
  earned      BOOLEAN DEFAULT FALSE,
  earned_at   TIMESTAMPTZ,
  UNIQUE (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS user_xp (
  id         SERIAL PRIMARY KEY,
  user_id    INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_xp   INT DEFAULT 0,
  level_name VARCHAR(50) DEFAULT 'Beginner',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_log (
  id          SERIAL PRIMARY KEY,
  actor_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id   INT REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  context     VARCHAR(100),
  context_id  INT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(200) NOT NULL,
  body       TEXT,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_settings (
  id                     SERIAL PRIMARY KEY,
  user_id                INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme                  VARCHAR(20) DEFAULT 'dark',
  notif_announcements    BOOLEAN DEFAULT TRUE,
  notif_reminders        BOOLEAN DEFAULT TRUE,
  notif_events           BOOLEAN DEFAULT TRUE,
  profile_visibility     VARCHAR(20) DEFAULT 'everyone',
  two_factor_enabled     BOOLEAN DEFAULT FALSE,
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EXTENSION TABLES (created after initial deploy)
-- ============================================================

CREATE TABLE IF NOT EXISTS knowledge_embeddings (
  id          SERIAL PRIMARY KEY,
  source_type VARCHAR(50),
  source_id   INT,
  title       TEXT,
  content     TEXT,
  embedding   FLOAT8[],
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_type, source_id)
);

CREATE TABLE IF NOT EXISTS study_streaks (
  user_id         INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak  INT DEFAULT 0,
  longest_streak  INT DEFAULT 0,
  last_active     DATE
);

CREATE TABLE IF NOT EXISTS ai_training_pairs (
  id         SERIAL PRIMARY KEY,
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL,
  category   VARCHAR(50) DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         SERIAL PRIMARY KEY,
  user_id    INT REFERENCES users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL,
  p256dh     TEXT,
  auth       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

CREATE TABLE IF NOT EXISTS course_materials (
  id          SERIAL PRIMARY KEY,
  course_id   INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  type        VARCHAR(20) DEFAULT 'link',
  url         TEXT,
  description TEXT,
  created_by  INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_assessments (
  id          SERIAL PRIMARY KEY,
  course_id   INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  type        VARCHAR(50),
  description TEXT,
  due_date    TIMESTAMPTZ,
  max_score   NUMERIC(6,2) DEFAULT 100,
  weight      NUMERIC(5,2) DEFAULT 0,
  created_by  INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assignment_submissions (
  id            SERIAL PRIMARY KEY,
  assessment_id INT NOT NULL REFERENCES course_assessments(id) ON DELETE CASCADE,
  student_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_path     TEXT,
  note          TEXT,
  submitted_at  TIMESTAMPTZ DEFAULT NOW(),
  grade         NUMERIC(6,2),
  feedback      TEXT,
  UNIQUE(assessment_id, student_id)
);

CREATE TABLE IF NOT EXISTS attendance_sessions (
  id          SERIAL PRIMARY KEY,
  course_id   INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  topic       VARCHAR(200),
  created_by  INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id         SERIAL PRIMARY KEY,
  session_id INT NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status     VARCHAR(20) DEFAULT 'present',
  UNIQUE(session_id, student_id)
);

CREATE TABLE IF NOT EXISTS club_channels (
  id          SERIAL PRIMARY KEY,
  club_id     INT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  is_general  BOOLEAN DEFAULT FALSE,
  created_by  INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS club_gallery (
  id          SERIAL PRIMARY KEY,
  club_id     INT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  uploader_id INT REFERENCES users(id) ON DELETE SET NULL,
  file_path   TEXT,
  caption     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id         SERIAL PRIMARY KEY,
  user1_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user2_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

CREATE TABLE IF NOT EXISTS polls (
  id           SERIAL PRIMARY KEY,
  question     TEXT NOT NULL,
  channel_type VARCHAR(20),
  channel_id   INT,
  created_by   INT REFERENCES users(id) ON DELETE SET NULL,
  ends_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS poll_options (
  id       SERIAL PRIMARY KEY,
  poll_id  INT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  text     TEXT NOT NULL,
  position INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id        SERIAL PRIMARY KEY,
  poll_id   INT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id INT NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(poll_id, user_id)
);

CREATE TABLE IF NOT EXISTS grades (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id  INT REFERENCES courses(id) ON DELETE SET NULL,
  item_name  VARCHAR(200),
  item_type  VARCHAR(50),
  score      NUMERIC(6,2),
  max_score  NUMERIC(6,2) DEFAULT 100,
  weight     NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goals (
  id           SERIAL PRIMARY KEY,
  user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        VARCHAR(200) NOT NULL,
  description  TEXT,
  target_date  DATE,
  xp_reward    INT DEFAULT 50,
  completed    BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEED: Default badges (skip if already exist)
-- ============================================================
INSERT INTO badges (name, description, tier, category, icon, xp_reward, max_xp)
SELECT * FROM (VALUES
  ('Scholar',            'Complete 10 assignments with perfect scores.',  'Gold'::badge_tier,   'Academic',      '📚', 250, 250),
  ('Quick Learner',      'Finish 5 courses ahead of schedule.',           'Silver'::badge_tier, 'Academic',      '📖', 180, 200),
  ('Dedicated Student',  'Maintain 90% attendance for one semester.',     'Bronze'::badge_tier, 'Academic',      '📘', 100, 100),
  ('Team Player',        'Collaborate on 15 group projects.',             'Gold'::badge_tier,   'Collaboration', '👥', 300, 300),
  ('Helpful Peer',       'Answer 50 questions from classmates.',          'Silver'::badge_tier, 'Collaboration', '🤝', 120, 150),
  ('Study Buddy',        'Form 3 study groups with peers.',               'Bronze'::badge_tier, 'Collaboration', '📝', 75,  75),
  ('Active Contributor', 'Post 100 messages in course discussions.',      'Gold'::badge_tier,   'Engagement',    '💬', 280, 300),
  ('Discussion Leader',  'Start 20 meaningful discussion threads.',       'Silver'::badge_tier, 'Engagement',    '💬', 150, 150),
  ('Social Butterfly',   'Connect with 25 new students.',                 'Bronze'::badge_tier, 'Engagement',    '🦋', 50,  100),
  ('Early Adopter',      'Join UniVerse in the first semester.',          'Gold'::badge_tier,   'Special',       '⭐', 200, 200)
) AS v(name,description,tier,category,icon,xp_reward,max_xp)
WHERE NOT EXISTS (SELECT 1 FROM badges LIMIT 1);
