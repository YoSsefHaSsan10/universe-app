-- ============================================================
-- UniVerse Database Schema
-- ============================================================

-- ENUM TYPES
CREATE TYPE user_role AS ENUM ('student', 'instructor', 'club_member', 'student_club', 'admin');
CREATE TYPE team_status AS ENUM ('open', 'full', 'closed');
CREATE TYPE announcement_tag AS ENUM ('Important', 'General', 'Events', 'Technical', 'Academic');
CREATE TYPE badge_tier AS ENUM ('Bronze', 'Silver', 'Gold');
CREATE TYPE event_type AS ENUM ('lecture', 'meeting', 'exam', 'deadline', 'club_event', 'office_hours');
CREATE TYPE message_channel_type AS ENUM ('course', 'club', 'team', 'direct');

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
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

-- ============================================================
-- COURSES
-- ============================================================
CREATE TABLE courses (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  code        VARCHAR(20) UNIQUE NOT NULL,
  color       VARCHAR(20) DEFAULT '#3b82f6',
  created_by  INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Students & instructors enrolled in courses
CREATE TABLE course_members (
  id         SERIAL PRIMARY KEY,
  course_id  INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       VARCHAR(20) DEFAULT 'student',  -- 'student' | 'instructor'
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (course_id, user_id)
);

-- ============================================================
-- CLUBS
-- ============================================================
CREATE TABLE clubs (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  color       VARCHAR(20) DEFAULT '#7c3aed',
  created_by  INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE club_members (
  id        SERIAL PRIMARY KEY,
  club_id   INT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      VARCHAR(20) DEFAULT 'member',   -- 'member' | 'admin'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (club_id, user_id)
);

-- ============================================================
-- TEAMS (Find Team feature)
-- ============================================================
CREATE TABLE teams (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  course_id   INT REFERENCES courses(id) ON DELETE CASCADE,
  description TEXT,
  type        VARCHAR(50) DEFAULT 'Study Group',   -- 'Study Group' | 'Project' | 'Exam Prep'
  max_members INT DEFAULT 5,
  level_req   VARCHAR(50) DEFAULT 'Any',           -- 'Any' | 'Silver+' | 'Gold Only'
  status      team_status DEFAULT 'open',
  created_by  INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE team_members (
  id        SERIAL PRIMARY KEY,
  team_id   INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      VARCHAR(20) DEFAULT 'member',    -- 'member' | 'leader'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_id, user_id)
);

CREATE TABLE team_requests (
  id           SERIAL PRIMARY KEY,
  team_id      INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       VARCHAR(20) DEFAULT 'pending',   -- 'pending' | 'accepted' | 'rejected'
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_id, user_id)
);

-- ============================================================
-- MESSAGES (course channels + club channels)
-- ============================================================
CREATE TABLE messages (
  id           SERIAL PRIMARY KEY,
  channel_type message_channel_type NOT NULL,
  channel_id   INT NOT NULL,          -- course_id | club_id | team_id
  sender_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  sent_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_channel ON messages(channel_type, channel_id);

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
CREATE TABLE announcements (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  body        TEXT NOT NULL,
  tag         announcement_tag DEFAULT 'General',
  is_pinned   BOOLEAN DEFAULT FALSE,
  course_id   INT REFERENCES courses(id) ON DELETE CASCADE,   -- NULL = university-wide
  created_by  INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TASKS
-- ============================================================
CREATE TABLE tasks (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  due_date    TIMESTAMPTZ,
  course_id   INT REFERENCES courses(id) ON DELETE SET NULL,
  is_done     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CALENDAR EVENTS
-- ============================================================
CREATE TABLE events (
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

-- ============================================================
-- BADGES
-- ============================================================
CREATE TABLE badges (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  tier        badge_tier DEFAULT 'Bronze',
  category    VARCHAR(50) DEFAULT 'Academic',   -- 'Academic' | 'Collaboration' | 'Engagement' | 'Special'
  icon        VARCHAR(10) DEFAULT '🏅',
  xp_reward   INT DEFAULT 50,
  max_xp      INT DEFAULT 100,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_badges (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id    INT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  progress_xp INT DEFAULT 0,
  earned      BOOLEAN DEFAULT FALSE,
  earned_at   TIMESTAMPTZ,
  UNIQUE (user_id, badge_id)
);

-- ============================================================
-- XP & LEVELS
-- ============================================================
CREATE TABLE user_xp (
  id         SERIAL PRIMARY KEY,
  user_id    INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_xp   INT DEFAULT 0,
  level_name VARCHAR(50) DEFAULT 'Beginner',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ACTIVITY LOG (Recent Activity feed)
-- ============================================================
CREATE TABLE activity_log (
  id          SERIAL PRIMARY KEY,
  actor_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id   INT REFERENCES users(id) ON DELETE SET NULL,   -- who is notified
  action      VARCHAR(100) NOT NULL,   -- 'commented_on_post' | 'shared_notes' | 'posted_material'
  context     VARCHAR(100),            -- 'CS101', 'Math201', etc.
  context_id  INT,                     -- course_id / club_id
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(200) NOT NULL,
  body       TEXT,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USER SETTINGS
-- ============================================================
CREATE TABLE user_settings (
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
-- SEED: Default badges
-- ============================================================
INSERT INTO badges (name, description, tier, category, icon, xp_reward, max_xp) VALUES
  ('Scholar',            'Complete 10 assignments with perfect scores.',  'Gold',   'Academic',      '📚', 250, 250),
  ('Quick Learner',      'Finish 5 courses ahead of schedule.',           'Silver', 'Academic',      '📖', 180, 200),
  ('Dedicated Student',  'Maintain 90% attendance for one semester.',     'Bronze', 'Academic',      '📘', 100, 100),
  ('Team Player',        'Collaborate on 15 group projects.',             'Gold',   'Collaboration', '👥', 300, 300),
  ('Helpful Peer',       'Answer 50 questions from classmates.',          'Silver', 'Collaboration', '🤝', 120, 150),
  ('Study Buddy',        'Form 3 study groups with peers.',               'Bronze', 'Collaboration', '📝', 75,  75),
  ('Active Contributor', 'Post 100 messages in course discussions.',      'Gold',   'Engagement',    '💬', 280, 300),
  ('Discussion Leader',  'Start 20 meaningful discussion threads.',       'Silver', 'Engagement',    '💬', 150, 150),
  ('Social Butterfly',   'Connect with 25 new students.',                 'Bronze', 'Engagement',    '🦋', 50,  100),
  ('Early Adopter',      'Join UniVerse in the first semester.',          'Gold',   'Special',       '⭐', 200, 200);
