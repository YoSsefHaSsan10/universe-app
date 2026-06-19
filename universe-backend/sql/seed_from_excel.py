"""
Seed script: reads SECTIONSCHEDULE Spring26.xlsx and populates:
  - users (doctors, teaching assistants, sample students)
  - courses
  - course_members (faculty linked to their courses)
  - user_settings, user_xp, user_badges for every new user
"""

import pandas as pd
import psycopg2
import bcrypt
import re
import os
import sys

# ── DB config ────────────────────────────────────────────────────────────────
DB = dict(
    host="127.0.0.1",
    port=5432,
    dbname="universe_db",
    user="postgres",
    password="qazwsx@12345",
)

EXCEL_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "SECTIONSCHEDULE Spring26.xlsx")

DEFAULT_PASSWORD = "Universe@2026"   # all seeded users get this password


def slugify_email(name: str, domain: str) -> str:
    """Mohamed Abbas Gomaa → mohamed.abbas.gomaa@domain"""
    clean = re.sub(r"[^a-zA-Z\s]", "", name).strip().lower()
    parts = clean.split()
    return ".".join(parts) + "@" + domain


def hash_pw(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(12)).decode()


# ── Color palette cycling ────────────────────────────────────────────────────
COLORS = [
    "#7c3aed", "#3b82f6", "#10b981", "#f59e0b",
    "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16",
]


def pick_color(idx: int) -> str:
    return COLORS[idx % len(COLORS)]


# ── Course color palette ─────────────────────────────────────────────────────
COURSE_COLORS = [
    "#3b82f6", "#7c3aed", "#10b981", "#f59e0b",
    "#ef4444", "#06b6d4", "#8b5cf6", "#84cc16",
]


def pick_course_color(idx: int) -> str:
    return COURSE_COLORS[idx % len(COURSE_COLORS)]


def main():
    print("Reading Excel …")
    df = pd.read_excel(EXCEL_PATH, sheet_name="SECTIONSCHEDULE", header=4)
    df.columns = [str(c).strip() for c in df.columns]

    # ── Courses: unique by EVENT ID ──────────────────────────────────────────
    courses_df = (
        df[["EVENT ID", "EVENTNAME", "Department", "College", "CREDITS"]]
        .dropna(subset=["EVENT ID", "EVENTNAME"])
        .drop_duplicates(subset=["EVENT ID"])
        .copy()
    )
    courses_df["EVENT ID"] = courses_df["EVENT ID"].astype(str).str.strip()
    courses_df["EVENTNAME"] = courses_df["EVENTNAME"].astype(str).str.strip()

    # ── Faculty: unique by name, split by tenure ─────────────────────────────
    fac_df = (
        df[["Faculty Name", "Faculty Department", "Faculty College", "TENURE STATUS"]]
        .dropna(subset=["Faculty Name"])
        .drop_duplicates(subset=["Faculty Name"])
        .copy()
    )
    # Drop non-person rows (Thesis, Dissertation, …)
    noise = {"Thesis  .", "Dissertation  .", "Research  .", "Training  ."}
    fac_df = fac_df[~fac_df["Faculty Name"].str.strip().isin(noise)]

    doctors = fac_df[fac_df["TENURE STATUS"] == "FULL"].copy()
    tas     = fac_df[fac_df["TENURE STATUS"] == "PART"].copy()
    others  = fac_df[~fac_df["TENURE STATUS"].isin(["FULL", "PART"])].copy()
    # Faculty with no tenure info → treat as instructor
    doctors = pd.concat([doctors, others], ignore_index=True)

    # ── Faculty→Course mapping ───────────────────────────────────────────────
    fac_course_df = (
        df[["Faculty Name", "EVENT ID"]]
        .dropna(subset=["Faculty Name", "EVENT ID"])
        .drop_duplicates()
        .copy()
    )
    fac_course_df["Faculty Name"] = fac_course_df["Faculty Name"].astype(str).str.strip()
    fac_course_df["EVENT ID"]     = fac_course_df["EVENT ID"].astype(str).str.strip()
    noise_set = {"Thesis  .", "Dissertation  .", "Research  .", "Training  ."}
    fac_course_df = fac_course_df[~fac_course_df["Faculty Name"].isin(noise_set)]

    # ── Sample students ──────────────────────────────────────────────────────
    student_names = [
        "Ahmed Mohamed Ali", "Sara Hassan Ibrahim", "Omar Khaled Mahmoud",
        "Nour Tarek Elsayed", "Youssef Amr Farouk", "Laila Karim Mansour",
        "Mostafa Adel Hassan", "Hana Walid Abdallah", "Kareem Said Osman",
        "Rana Ibrahim Elshazly", "Ziad Mostafa Ragab", "Dina Samy Elgamal",
        "Adham Youssef Khalil", "Mariam Ahmed Elewa", "Tarek Nabil Eldeeb",
        "Salma Omar Abdelaziz", "Hamza Sherif Taha", "Nadia Hany Elsaid",
        "Bassem Ihab Morsi", "Farida Alaa Eldin Shalaby",
    ]

    print(f"  Courses  : {len(courses_df)}")
    print(f"  Doctors  : {len(doctors)}")
    print(f"  TAs      : {len(tas)}")
    print(f"  Students : {len(student_names)}")

    conn = psycopg2.connect(**DB)
    cur  = conn.cursor()

    try:
        # ── 0. Ensure teaching_assistant role exists in enum ─────────────────
        cur.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_enum
                    WHERE enumtypid = 'user_role'::regtype
                      AND enumlabel = 'teaching_assistant'
                ) THEN
                    ALTER TYPE user_role ADD VALUE 'teaching_assistant';
                END IF;
            END$$;
        """)
        conn.commit()   # enum changes need their own commit
        print("[OK] Enum updated")

        # Fetch existing badge ids once
        cur.execute("SELECT id FROM badges")
        badge_ids = [r[0] for r in cur.fetchall()]

        def create_user_rows(user_id):
            cur.execute("INSERT INTO user_settings (user_id) VALUES (%s) ON CONFLICT DO NOTHING", [user_id])
            cur.execute("INSERT INTO user_xp      (user_id) VALUES (%s) ON CONFLICT DO NOTHING", [user_id])
            for bid in badge_ids:
                cur.execute(
                    "INSERT INTO user_badges (user_id, badge_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    [user_id, bid]
                )

        # ── 1. Insert courses ────────────────────────────────────────────────
        print("Inserting courses …")
        course_id_map = {}   # event_id → db id
        for i, row in enumerate(courses_df.itertuples(index=False)):
            event_id  = row._0   # EVENT ID
            name      = row.EVENTNAME
            color     = pick_course_color(i)
            cur.execute(
                """
                INSERT INTO courses (name, code, color)
                VALUES (%s, %s, %s)
                ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
                RETURNING id
                """,
                [name, event_id, color],
            )
            course_id_map[event_id] = cur.fetchone()[0]
        print(f"  [OK] {len(course_id_map)} courses upserted")

        # ── 2. Insert doctors ────────────────────────────────────────────────
        print("Inserting doctors (instructors) …")
        doctor_id_map = {}   # name → user id
        pw_hash = hash_pw(DEFAULT_PASSWORD)
        for i, row in enumerate(doctors.itertuples(index=False)):
            name  = str(row._0).strip()
            email = slugify_email(name, "university.edu")
            color = pick_color(i)
            cur.execute(
                """
                INSERT INTO users (full_name, email, password_hash, role, avatar_color)
                VALUES (%s, %s, %s, 'instructor', %s)
                ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
                RETURNING id
                """,
                [name, email, pw_hash, color],
            )
            uid = cur.fetchone()[0]
            doctor_id_map[name] = uid
            create_user_rows(uid)
        print(f"  [OK] {len(doctor_id_map)} doctors inserted")

        # ── 3. Insert teaching assistants ────────────────────────────────────
        print("Inserting teaching assistants …")
        ta_id_map = {}
        for i, row in enumerate(tas.itertuples(index=False)):
            name  = str(row._0).strip()
            email = slugify_email(name, "university.edu")
            color = pick_color(i + len(doctors))
            cur.execute(
                """
                INSERT INTO users (full_name, email, password_hash, role, avatar_color)
                VALUES (%s, %s, %s, 'teaching_assistant', %s)
                ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
                RETURNING id
                """,
                [name, email, pw_hash, color],
            )
            uid = cur.fetchone()[0]
            ta_id_map[name] = uid
            create_user_rows(uid)
        print(f"  [OK] {len(ta_id_map)} TAs inserted")

        # ── 4. Insert students ───────────────────────────────────────────────
        print("Inserting sample students …")
        student_ids = []
        for i, name in enumerate(student_names):
            email = slugify_email(name, "student.university.edu")
            color = pick_color(i)
            cur.execute(
                """
                INSERT INTO users (full_name, email, password_hash, role, avatar_color)
                VALUES (%s, %s, %s, 'student', %s)
                ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
                RETURNING id
                """,
                [name, email, pw_hash, color],
            )
            uid = cur.fetchone()[0]
            student_ids.append(uid)
            create_user_rows(uid)
        print(f"  [OK] {len(student_ids)} students inserted")

        # ── 5. Link faculty to courses ───────────────────────────────────────
        print("Linking faculty to courses …")
        linked = 0
        all_faculty_map = {**doctor_id_map, **ta_id_map}
        for row in fac_course_df.itertuples(index=False):
            fname    = str(row._0).strip()
            event_id = str(row._1).strip()
            uid      = all_faculty_map.get(fname)
            cid      = course_id_map.get(event_id)
            if uid and cid:
                cur.execute(
                    """
                    INSERT INTO course_members (course_id, user_id, role)
                    VALUES (%s, %s, 'instructor')
                    ON CONFLICT (course_id, user_id) DO NOTHING
                    """,
                    [cid, uid],
                )
                linked += 1
        print(f"  [OK] {linked} faculty-course links created")

        conn.commit()
        print("\nSeed complete!")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] {e}", file=sys.stderr)
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
