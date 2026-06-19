# -*- coding: utf-8 -*-
# seed_clubs_tasks.py  --  Seeds clubs, tasks, and DM conversations.
import sys
import psycopg2
import random
from datetime import datetime, timedelta

sys.stdout.reconfigure(encoding='utf-8')

DB = dict(host="127.0.0.1", port=5432, dbname="universe_db",
          user="postgres", password="postgres")

conn = psycopg2.connect(**DB)
cur  = conn.cursor()

def ts(days_ago_max=60, days_ago_min=0):
    mins = random.randint(days_ago_min * 1440, days_ago_max * 1440)
    return datetime.now() - timedelta(minutes=mins)

def future(days_min=1, days_max=30):
    return datetime.now() + timedelta(days=random.randint(days_min, days_max))

def bulk(sql, rows, chunk=500):
    for i in range(0, len(rows), chunk):
        cur.executemany(sql, rows[i:i+chunk])
    conn.commit()

# ── Load base data ────────────────────────────────────────────────────────
cur.execute("SELECT id, role FROM users")
all_users   = cur.fetchall()
students    = [u[0] for u in all_users if u[1] == 'student']
instructors = [u[0] for u in all_users if u[1] == 'instructor']
admins      = [u[0] for u in all_users if u[1] == 'admin']

cur.execute("SELECT id, name, code FROM courses ORDER BY id LIMIT 120")
courses = cur.fetchall()

print("Loaded %d users (%d instructors, %d students)" % (len(all_users), len(instructors), len(students)))

def pick(lst, n=1):
    return random.sample(lst, min(n, len(lst)))

# ── 1. Clubs ─────────────────────────────────────────────────────────────
CLUBS = [
    ("Programming Club",        "Code, compete, and collaborate. Weekly challenges and hackathons.", "#7c3aed"),
    ("Robotics & AI Society",   "Building the future with robotics, embedded systems, and AI.", "#3b82f6"),
    ("Mathematics Club",        "Problem solving, olympiad prep, and exploring pure math.", "#06b6d4"),
    ("Debate Club",             "Sharpen your argumentation and public speaking skills.", "#f59e0b"),
    ("Photography Club",        "Capture the world through your lens. Monthly themes and exhibitions.", "#10b981"),
    ("Chess Club",              "Strategy, tactics, and tournaments for all skill levels.", "#6366f1"),
    ("Environmental Society",   "Sustainability initiatives and environmental awareness campaigns.", "#22c55e"),
    ("Entrepreneurship Hub",    "Ideate, validate, and launch your startup with fellow founders.", "#f97316"),
    ("Music & Arts Society",    "Jam sessions, open mics, exhibitions, and creative workshops.", "#ec4899"),
    ("Cybersecurity Club",      "CTF competitions, security research, and ethical hacking labs.", "#ef4444"),
    ("Data Science Society",    "Applied ML projects, Kaggle competitions, and data workshops.", "#8b5cf6"),
    ("Student Media & Press",   "Run the university blog, podcast, and social media channels.", "#0ea5e9"),
]

club_rows = []
admin_id  = admins[0] if admins else instructors[0]
for name, desc, color in CLUBS:
    club_rows.append((name, desc, color, admin_id, ts(180, 90)))

cur.executemany(
    "INSERT INTO clubs (name, description, color, created_by, created_at) VALUES (%s,%s,%s,%s,%s)",
    club_rows
)
conn.commit()
cur.execute("SELECT id, name FROM clubs ORDER BY id DESC LIMIT %s", (len(CLUBS),))
clubs = cur.fetchall()
print("OK %d clubs created" % len(clubs))

# ── 2. Club channels ──────────────────────────────────────────────────────
CHANNEL_SETS = {
    "Programming Club":      [("general", True, "Main chat and announcements"),
                              ("weekly-challenge", False, "Weekly coding challenge discussion"),
                              ("hackathons", False, "Upcoming hackathons and team formation"),
                              ("resources", False, "Useful links, tutorials, and books")],
    "Robotics & AI Society": [("general", True, "Main chat and announcements"),
                              ("projects", False, "Current robot and AI projects"),
                              ("competitions", False, "Competition prep and results"),
                              ("components", False, "Hardware parts, sourcing, and suppliers")],
    "Mathematics Club":      [("general", True, "Main chat and announcements"),
                              ("olympiad-prep", False, "IMO/Putnam problem sets"),
                              ("solutions", False, "Worked solutions and proofs"),
                              ("events", False, "Upcoming seminars and talks")],
    "Debate Club":           [("general", True, "Main chat and announcements"),
                              ("motions", False, "Current and upcoming debate motions"),
                              ("practice", False, "Practice rounds and feedback"),
                              ("tournaments", False, "External competitions")],
    "Photography Club":      [("general", True, "Main chat and announcements"),
                              ("showcase", False, "Share and get feedback on your shots"),
                              ("monthly-theme", False, "This month's theme submissions"),
                              ("gear-talk", False, "Cameras, lenses, and editing tips")],
    "Chess Club":            [("general", True, "Main chat and announcements"),
                              ("tournament-bracket", False, "Live tournament updates"),
                              ("analysis", False, "Game analysis and opening theory"),
                              ("puzzles", False, "Daily puzzles and challenges")],
    "Environmental Society": [("general", True, "Main chat and announcements"),
                              ("campaigns", False, "Ongoing sustainability campaigns"),
                              ("volunteering", False, "Volunteer opportunities"),
                              ("research", False, "Environmental research and papers")],
    "Entrepreneurship Hub":  [("general", True, "Main chat and announcements"),
                              ("pitch-practice", False, "Pitch your idea and get feedback"),
                              ("funding", False, "Grants, competitions, and investors"),
                              ("mentors", False, "Mentor introductions and sessions")],
    "Music & Arts Society":  [("general", True, "Main chat and announcements"),
                              ("open-mic", False, "Open mic nights and signups"),
                              ("gallery", False, "Art submissions and exhibitions"),
                              ("collab", False, "Find collaborators for projects")],
    "Cybersecurity Club":    [("general", True, "Main chat and announcements"),
                              ("ctf-writeups", False, "CTF challenge writeups and hints"),
                              ("tools", False, "Security tools and resources"),
                              ("research", False, "Vulnerabilities and security news")],
    "Data Science Society":  [("general", True, "Main chat and announcements"),
                              ("kaggle", False, "Kaggle competition teams and strategies"),
                              ("ml-papers", False, "Paper reviews and summaries"),
                              ("datasets", False, "Interesting datasets and project ideas")],
    "Student Media & Press": [("general", True, "Main chat and announcements"),
                              ("articles", False, "Article drafts and editorial feedback"),
                              ("social-media", False, "Content calendar and ideas"),
                              ("podcast", False, "Podcast recording schedule and topics")],
}

DEFAULT_CHANNELS = [("general", True, "Main club chat"), ("events", False, "Upcoming events and activities")]

chan_rows = []
for club_id, club_name in clubs:
    sets = CHANNEL_SETS.get(club_name, DEFAULT_CHANNELS)
    for cname, is_gen, cdesc in sets:
        chan_rows.append((club_id, cname, cdesc, is_gen, admin_id, ts(170, 85)))

cur.executemany(
    "INSERT INTO club_channels (club_id, name, description, is_general, created_by, created_at) VALUES (%s,%s,%s,%s,%s,%s)",
    chan_rows
)
conn.commit()
print("OK %d club channels created" % len(chan_rows))

# ── 3. Club members ───────────────────────────────────────────────────────
cur.execute("SELECT id, club_id, name FROM club_channels WHERE is_general = TRUE")
general_channels = {r[1]: r[0] for r in cur.fetchall()}  # club_id -> channel_id

mem_rows = []
for club_id, club_name in clubs:
    # Manager: random instructor or admin
    manager_id = pick(instructors + admins, 1)[0]
    mem_rows.append((club_id, manager_id, 'manager', 'approved', ts(170, 80)))

    # 30-80 student members
    for uid in pick(students, random.randint(30, 80)):
        mem_rows.append((club_id, uid, 'member', 'approved', ts(160, 5)))

    # 5-15 pending requests
    existing_ids = {r[1] for r in mem_rows if r[0] == club_id}
    for uid in pick([s for s in students if s not in existing_ids], random.randint(5, 15)):
        mem_rows.append((club_id, uid, 'member', 'pending', ts(10, 0)))

bulk("""INSERT INTO club_members (club_id, user_id, role, status, joined_at)
        VALUES (%s,%s,%s,%s,%s) ON CONFLICT (club_id, user_id) DO NOTHING""", mem_rows)
print("OK %d club memberships seeded" % len(mem_rows))

# ── 4. Club messages ──────────────────────────────────────────────────────
CLUB_MSGS = [
    "Welcome to the club everyone! Excited to get started this semester.",
    "Don't forget we have a meeting this Thursday at 6 PM in Room A203!",
    "Great session last week - thanks to everyone who showed up!",
    "New members: please introduce yourself in this channel!",
    "Sharing some resources from last week's session. Check them out!",
    "Who's interested in competing this semester? Reply here!",
    "We need volunteers for the upcoming event. DM the manager!",
    "Check the events channel for this month's schedule.",
    "Reminder: submit your work before the deadline this Sunday.",
    "Amazing turnout today! Really loved the energy from everyone.",
    "Has anyone looked at the challenge from last week yet?",
    "We've been invited to participate in a university-wide competition!",
    "Meeting notes from yesterday are pinned above.",
    "New members: the resources channel has everything you need to get started.",
    "This week's topic: bring your questions and we'll work through them together.",
    "Shoutout to everyone who participated - you all did amazing!",
    "Just posted new materials in the resources section. Check it out!",
    "Who wants to team up for the upcoming project?",
    "Reminder that the general meeting is EVERY Thursday, not just this week.",
    "Huge congratulations to our team for placing 3rd in the competition!",
    "Quick poll: what topics do you want us to cover next month?",
    "Office hours with the manager are available by appointment.",
    "Final reminder: deadline is midnight tonight. Good luck everyone!",
    "Looking for people to collaborate on a personal project. Interested?",
    "The event next week has been moved to Room B101. Same time.",
    "Thank you to all the new members who joined this week - great to have you!",
    "We hit 50 members! Thanks for making this club amazing.",
    "Today's session recording will be uploaded to the resources channel.",
    "Does anyone have experience with this topic? Would love to chat!",
    "Feedback forms for this semester are now open. Please fill them in!",
]

cur.execute("SELECT id, club_id FROM club_channels")
all_channels = cur.fetchall()  # (channel_id, club_id)

cur.execute("SELECT club_id, user_id FROM club_members WHERE status='approved'")
approved_members = {}
for club_id, user_id in cur.fetchall():
    approved_members.setdefault(club_id, []).append(user_id)

cmsg_rows = []
for ch_id, club_id in all_channels:
    members = approved_members.get(club_id, [])
    if not members:
        continue
    for _ in range(random.randint(20, 45)):
        cmsg_rows.append(('club', ch_id, random.choice(members), random.choice(CLUB_MSGS), ts(60, 0)))

bulk("""INSERT INTO messages (channel_type, channel_id, sender_id, content, sent_at)
        VALUES (%s,%s,%s,%s,%s)""", cmsg_rows)
print("OK %d club messages seeded" % len(cmsg_rows))

# ── 5. Tasks (instructor-assigned) ────────────────────────────────────────
TASK_TMPLS = [
    ("Read Chapter {n} and prepare notes",                     3, 5),
    ("Submit Assignment {n} via the portal",                   5, 8),
    ("Complete Lab Report {n} (template in Materials)",        4, 7),
    ("Watch the supplementary video for Week {n}",             2, 4),
    ("Review midterm feedback and revise weak areas",          3, 6),
    ("Prepare a 5-minute presentation on {topic}",             5, 10),
    ("Practice problems from Chapter {n} (pp. {p}-{p2})",     3, 6),
    ("Submit project proposal (see guidelines in portal)",     7, 12),
    ("Peer review: leave feedback on 2 classmates' work",      4, 8),
    ("Complete the online quiz before Thursday",               2, 4),
    ("Attend office hours to discuss your progress",           2, 5),
    ("Research and summarize a recent paper on {topic}",       5, 10),
    ("Update your project repository with this week's work",   4, 7),
    ("Study for Quiz {n}: Chapters {n} and {n2}",              2, 4),
    ("Submit the signed attendance form for the field trip",   1, 3),
]

TOPICS = ["neural networks","graph algorithms","database indexing","sorting theory",
          "linear algebra applications","probability","compiler design","networking basics"]

def future_due(days_min=2, days_max=21):
    return datetime.now() + timedelta(days=random.randint(days_min, days_max))

task_rows = []
for cid, cname, ccode in courses[:80]:
    cur.execute("""SELECT user_id FROM course_members
                   WHERE course_id=%s AND role='instructor' LIMIT 2""", (cid,))
    instr_ids = [r[0] for r in cur.fetchall()]
    if not instr_ids:
        continue
    for tmpl, min_days, max_days in pick(TASK_TMPLS, random.randint(3, 6)):
        n    = random.randint(1, 10)
        n2   = n + 1
        p    = random.randint(40, 180)
        p2   = p + random.randint(10, 25)
        top  = random.choice(TOPICS)
        title = tmpl.replace("{n}", str(n)).replace("{n2}", str(n2)) \
                    .replace("{p}", str(p)).replace("{p2}", str(p2)) \
                    .replace("{topic}", top)
        due = future_due(min_days, max_days)
        task_rows.append((random.choice(instr_ids), title, due, cid))

bulk("""INSERT INTO tasks (user_id, title, due_date, course_id)
        VALUES (%s,%s,%s,%s)""", task_rows)
print("OK %d instructor tasks seeded" % len(task_rows))

# ── 6. DM conversations + messages ────────────────────────────────────────
DM_MSGS_PAIRS = [
    ("Hey! Quick question about the assignment due Friday?",
     "Sure! What's up?"),
    ("I missed the lecture on Tuesday. Any chance you can share your notes?",
     "Of course! I'll upload them to the drive now."),
    ("Are you joining the study session tonight?",
     "Yes! 9 PM right? I'll be there."),
    ("What did you get for question 3 on the homework?",
     "I got 42 but I'm not 100% sure. Let's compare approaches."),
    ("Dr. Ahmed's office hours are at 2 PM today btw",
     "Oh thanks! I was just about to check the portal."),
    ("Did you understand the recursion part from today's lecture?",
     "Kind of! The base case makes sense but the recursive step is tricky."),
    ("Want to form a project team? I need 2 more people",
     "I'm in! Let me ask Sarah too."),
    ("The quiz is tomorrow and I haven't started reviewing",
     "Same... want to do a quick call in an hour?"),
    ("Congrats on the presentation! That was really well done",
     "Thank you so much! I was so nervous."),
    ("Have you submitted Assignment 2 yet?",
     "Just submitted 10 minutes ago. Don't forget the deadline is 11:59 PM!"),
]

# Pick random student pairs and create conversations
conv_rows   = []
dmsg_rows   = []
used_pairs  = set()
sample_stud = pick(students, min(200, len(students)))

for i in range(120):
    u1, u2 = pick(sample_stud, 2)
    pair = (min(u1,u2), max(u1,u2))
    if pair in used_pairs:
        continue
    used_pairs.add(pair)
    conv_rows.append((u1, u2, ts(45, 0)))

bulk("""INSERT INTO conversations (user1_id, user2_id, created_at)
        VALUES (%s,%s,%s) ON CONFLICT (user1_id, user2_id) DO NOTHING""", conv_rows)
conn.commit()

cur.execute("SELECT id, user1_id, user2_id FROM conversations ORDER BY id DESC LIMIT %s", (len(conv_rows),))
convs = cur.fetchall()

for conv_id, u1, u2 in convs:
    q_msg, a_msg = random.choice(DM_MSGS_PAIRS)
    t1 = ts(30, 1)
    t2 = t1 + timedelta(minutes=random.randint(2, 60))
    dmsg_rows.append(('direct', conv_id, u1, q_msg, t1))
    dmsg_rows.append(('direct', conv_id, u2, a_msg, t2))
    # maybe a follow-up
    if random.random() < 0.5:
        t3 = t2 + timedelta(minutes=random.randint(5, 120))
        follow = random.choice(["Thanks!", "Got it, appreciate it!", "Perfect, see you then!", "Sounds good!", "Will do, thanks."])
        dmsg_rows.append(('direct', conv_id, u1, follow, t3))

bulk("""INSERT INTO messages (channel_type, channel_id, sender_id, content, sent_at)
        VALUES (%s,%s,%s,%s,%s)""", dmsg_rows)
print("OK %d DM conversations, %d messages seeded" % (len(convs), len(dmsg_rows)))

cur.close()
conn.close()
print("")
print("DONE - Clubs, tasks, and DMs are now seeded!")
