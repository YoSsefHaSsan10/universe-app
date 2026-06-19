"""
Seed real students from SECTIONSCHEDULE Spring26.xlsx:
  - Reads ADDS per course (LECT sections preferred)
  - Creates a shared pool of ~5000 unique students with Egyptian names
  - Each student gets an ID like 221000600 and email ID@student.university.edu
  - Enrolls each course's students using the ADDS count
"""

import pandas as pd
import psycopg2
import bcrypt
import random
import os
import sys

DB = dict(
    host="127.0.0.1", port=5432, dbname="universe_db",
    user="postgres", password="qazwsx@12345",
)

EXCEL_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "SECTIONSCHEDULE Spring26.xlsx")
DEFAULT_PASSWORD = "Universe@2026"

# ── Egyptian name pools ──────────────────────────────────────────────────────
MALE_FIRST = [
    "Ahmed", "Mohamed", "Omar", "Youssef", "Khaled", "Karim", "Hassan", "Ali",
    "Ibrahim", "Mahmoud", "Mostafa", "Tarek", "Amr", "Tamer", "Hany", "Walid",
    "Sherif", "Maged", "Wael", "Alaa", "Ayman", "Hisham", "Ramy", "Bassem",
    "Samy", "Ziad", "Hamza", "Adham", "Islam", "Adel", "Ramadan", "Magdy",
    "Ashraf", "Nader", "Samir", "Fady", "Emad", "Essam", "Hazem", "Hosam",
    "Gamal", "Shady", "Hatem", "Kareem", "Mina", "Peter", "George", "Fares",
    "Abdelrahman", "Abdelaziz", "Abdallah", "Abdelhamid", "Abdelkarim",
    "Yousef", "Seif", "Ammar", "Bilal", "Zeyad", "Marwan", "Nabil", "Raed",
]

FEMALE_FIRST = [
    "Sara", "Nour", "Hana", "Dina", "Rana", "Mona", "Reem", "Laila", "Fatma",
    "Amira", "Mariam", "Aya", "Nadia", "Yara", "Maya", "Rania", "Salma",
    "Heba", "Menna", "Nada", "Zeinab", "Esraa", "Shahd", "Eman", "Doha",
    "Noha", "Hend", "Alia", "Samar", "Reham", "Ghada", "Asmaa", "Maryam",
    "Lobna", "Nesma", "Shaimaa", "Soha", "Abeer", "Dalia", "Engy", "Farah",
    "Gehad", "Hadeer", "Inas", "Kholoud", "Malak", "Nour", "Radwa", "Yasmin",
    "Basma", "Nihal", "Roaa", "Shaymaa", "Toka", "Habiba", "Rofaida", "Rola",
]

# Father / middle names — always male
MIDDLE = [
    "Mohamed", "Ahmed", "Hassan", "Ibrahim", "Mahmoud", "Ali", "Khaled",
    "Tarek", "Omar", "Mostafa", "Ashraf", "Magdy", "Adel", "Ramadan",
    "Walid", "Samir", "Hany", "Kamal", "Fouad", "Nabil", "Samy", "Fathy",
    "Abdallah", "Abdelaziz", "Abdelrahman", "Youssef", "Wael", "Sherif",
]

LAST = [
    "Mohamed", "Ahmed", "Hassan", "Ibrahim", "Mahmoud", "Ali", "Khalil",
    "Farouk", "Mansour", "Ragab", "Osman", "Taha", "Elsayed", "Morsi",
    "Abdelaziz", "Abdelrahman", "Salem", "Elmasry", "Nasser", "Gamal",
    "Kamel", "Elbaz", "Elgendy", "Soliman", "Amin", "Ramadan", "Zaki",
    "Saad", "Hamed", "Fawzy", "Lotfy", "Qassem", "Yassin", "Elewa",
    "Eldeeb", "Abdelfattah", "Elzayat", "Bakr", "Gaber", "Awad",
    "Elshaer", "Elshazly", "Elgamal", "Moustafa", "Shalaby", "Elshafei",
    "Abdallah", "Elmasry", "Elgazzar", "Abdelkader", "Elsherbiny",
    "Sherif", "Elhennawy", "Barakat", "Elkholy", "Badawi", "Hegazy",
]

COLORS = [
    "#7c3aed", "#3b82f6", "#10b981", "#f59e0b",
    "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16",
]

random.seed(42)  # reproducible


def gen_name():
    if random.random() < 0.55:   # 55 % male
        first = random.choice(MALE_FIRST)
    else:
        first = random.choice(FEMALE_FIRST)
    middle = random.choice(MIDDLE)
    last   = random.choice(LAST)
    return f"{first} {middle} {last}"


def gen_student_id(seq: int) -> str:
    """221000001 … 241999999 format mixing 3 cohorts."""
    year = random.choice(["22", "23", "24"])
    campus = random.choice(["1", "2"])
    return f"{year}{campus}{seq:06d}"


def gen_email(name: str, student_id: str, used: set) -> str:
    """
    Format: {first_initial}.{middle_name}{id[:2]}{id[-2:]}@nu.edu.eg
    e.g. Mohamed Ahmed Elmasry / 221000600  -> m.ahmed2200@nu.edu.eg
    Appends a counter suffix on collision.
    """
    parts  = name.lower().split()
    first  = parts[0] if parts else "x"
    middle = parts[1] if len(parts) > 1 else "x"
    prefix = f"{first[0]}.{middle}{student_id[:2]}{student_id[-2:]}"
    email  = f"{prefix}@nu.edu.eg"
    if email not in used:
        return email
    # collision — append incrementing counter
    n = 2
    while True:
        candidate = f"{prefix}{n}@nu.edu.eg"
        if candidate not in used:
            return candidate
        n += 1


def hash_pw(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(10)).decode()


def main():
    print("Reading Excel ...")
    df = pd.read_excel(EXCEL_PATH, sheet_name="SECTIONSCHEDULE", header=4)
    df.columns = [str(c).strip() for c in df.columns]
    df["EVENT ID"] = df["EVENT ID"].astype(str).str.strip()
    df["ADDS"]     = pd.to_numeric(df["ADDS"], errors="coerce").fillna(0).astype(int)

    # ── Per-course student count (LECT preferred, else max section ADDS) ────
    lect_adds = (
        df[df["EVENT SUB TYPE"] == "LECT"]
        .groupby("EVENT ID")["ADDS"].sum()
    )
    all_adds = df.groupby("EVENT ID")["ADDS"].max()
    course_adds = all_adds.copy()
    course_adds.update(lect_adds)
    course_adds = course_adds[course_adds > 0]   # drop empty courses

    total_enrollments = course_adds.sum()
    # Estimate unique students: assume avg 5 courses per student
    est_unique = max(int(total_enrollments / 5), course_adds.max())
    POOL_SIZE  = min(est_unique + 500, 8000)     # buffer, cap at 8 000

    print(f"  Courses with students : {len(course_adds)}")
    print(f"  Total enrollments     : {total_enrollments}")
    print(f"  Estimated unique pool : {POOL_SIZE}")

    conn = psycopg2.connect(**DB)
    cur  = conn.cursor()

    try:
        # ── 0. Remove all existing students ──────────────────────────────────
        cur.execute("DELETE FROM users WHERE role = 'student'")
        deleted = cur.rowcount
        print(f"  Removed {deleted} old students")

        # ── 1. Fetch badge IDs ───────────────────────────────────────────────
        cur.execute("SELECT id FROM badges")
        badge_ids = [r[0] for r in cur.fetchall()]

        def attach_user(user_id):
            cur.execute(
                "INSERT INTO user_settings (user_id) VALUES (%s) ON CONFLICT DO NOTHING",
                [user_id]
            )
            cur.execute(
                "INSERT INTO user_xp (user_id) VALUES (%s) ON CONFLICT DO NOTHING",
                [user_id]
            )
            for bid in badge_ids:
                cur.execute(
                    "INSERT INTO user_badges (user_id, badge_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    [user_id, bid]
                )

        # ── 2. Generate student pool ─────────────────────────────────────────
        print(f"Creating {POOL_SIZE} unique students ...")
        pw_hash   = hash_pw(DEFAULT_PASSWORD)
        used_ids  = set()
        used_emails = set()
        pool      = []    # list of user db IDs

        seq = 1
        i   = 0
        while len(pool) < POOL_SIZE:
            name = gen_name()

            # Unique student ID
            while True:
                sid = gen_student_id(seq)
                seq += 1
                if sid not in used_ids:
                    used_ids.add(sid)
                    break

            email = gen_email(name, sid, used_emails)
            used_emails.add(email)

            color = COLORS[i % len(COLORS)]
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
            attach_user(uid)
            pool.append(uid)
            i += 1

            if len(pool) % 500 == 0:
                print(f"  ... {len(pool)} / {POOL_SIZE}")

        print(f"  [OK] {len(pool)} students created")

        # ── 3. Fetch course ID map ───────────────────────────────────────────
        cur.execute("SELECT code, id FROM courses")
        course_id_map = {row[0]: row[1] for row in cur.fetchall()}

        # ── 4. Enroll students in courses ────────────────────────────────────
        print("Enrolling students in courses ...")
        total_memberships = 0

        for event_id, count in course_adds.items():
            course_db_id = course_id_map.get(event_id)
            if not course_db_id:
                continue
            count = min(count, len(pool))
            chosen = random.sample(pool, count)
            for uid in chosen:
                cur.execute(
                    """
                    INSERT INTO course_members (course_id, user_id, role)
                    VALUES (%s, %s, 'student')
                    ON CONFLICT (course_id, user_id) DO NOTHING
                    """,
                    [course_db_id, uid],
                )
            total_memberships += count

        print(f"  [OK] {total_memberships} student-course enrollments created")

        conn.commit()
        print("\nStudent seed complete!")
        print(f"  Default password : {DEFAULT_PASSWORD}")
        print(f"  Email format     : {{first_initial}}.{{middle_name}}{{id[:2]}}{{id[-2:]}}@nu.edu.eg")
        print(f"  Example          : m.ahmed2200@nu.edu.eg")
        print(f"  ID format        : 22/23/24 + 1/2 + 6-digit-seq  (e.g. 221000601)")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] {e}", file=sys.stderr)
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
