-- ================================================================
-- Asisten Guru Pintar — Full Database Schema
-- Run this in Supabase SQL Editor (Project > SQL Editor > New query)
-- ================================================================

-- Profiles (auto-created by trigger on auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  school_name TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_owner" ON profiles FOR ALL USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Students
CREATE TABLE IF NOT EXISTS students (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  nisn       TEXT,
  class      TEXT NOT NULL,
  gender     TEXT CHECK (gender IN ('L','P')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, nisn)
);
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students_owner" ON students FOR ALL USING (auth.uid() = teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_teacher ON students(teacher_id);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  status     TEXT NOT NULL CHECK (status IN ('Hadir','Izin','Sakit','Alpa')),
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date)
);
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendance_owner" ON attendance FOR ALL
  USING (student_id IN (SELECT id FROM students WHERE teacher_id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);

-- Grades
CREATE TABLE IF NOT EXISTS grades (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject         TEXT NOT NULL,
  assessment_name TEXT,
  score           NUMERIC(5,2),
  remarks         TEXT,
  assessment_date DATE NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject, assessment_date)
);
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "grades_owner" ON grades FOR ALL
  USING (student_id IN (SELECT id FROM students WHERE teacher_id = auth.uid()));

-- Behavior logs
CREATE TABLE IF NOT EXISTS behavior_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('positive','negative')),
  description TEXT NOT NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE behavior_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "behavior_owner" ON behavior_logs FOR ALL
  USING (student_id IN (SELECT id FROM students WHERE teacher_id = auth.uid()));

-- Schedules
CREATE TABLE IF NOT EXISTS schedules (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  subject     TEXT NOT NULL,
  class_name  TEXT NOT NULL,
  room        TEXT,
  start_time  TIME,
  end_time    TIME,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schedules_owner" ON schedules FOR ALL USING (auth.uid() = teacher_id);

-- Subjects (for autocomplete management)
CREATE TABLE IF NOT EXISTS subjects (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, name)
);
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subjects_owner" ON subjects FOR ALL USING (auth.uid() = teacher_id);
