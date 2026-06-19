# -*- coding: utf-8 -*-
# seed_activity.py -- Makes UniVerse feel like a live university platform.
# Seeds: XP, Badges, Messages, Announcements, Materials, Events,
#        Teams, Goals, Grades, Study-streaks, Activity-log, Notifications
import sys
import psycopg2
import random
from datetime import datetime, timedelta, date

sys.stdout.reconfigure(encoding='utf-8')

DB = dict(host="127.0.0.1", port=5432, dbname="universe_db",
          user="postgres", password="postgres")

conn = psycopg2.connect(**DB)
cur  = conn.cursor()

def ts(days_ago_max=90, days_ago_min=0):
    mins = random.randint(days_ago_min * 1440, days_ago_max * 1440)
    return datetime.now() - timedelta(minutes=mins)

def pick(lst, n=1):
    return random.sample(lst, min(n, len(lst)))

def bulk(sql, rows, chunk=500):
    for i in range(0, len(rows), chunk):
        cur.executemany(sql, rows[i:i+chunk])
    conn.commit()

# ── 0. Load base data ────────────────────────────────────────────────────
cur.execute("SELECT id, role FROM users")
all_users   = cur.fetchall()
students    = [u[0] for u in all_users if u[1] == 'student']
instructors = [u[0] for u in all_users if u[1] == 'instructor']
admins      = [u[0] for u in all_users if u[1] == 'admin']

cur.execute("SELECT id, name, code FROM courses ORDER BY id LIMIT 120")
courses = cur.fetchall()

cur.execute("SELECT id FROM badges")
badge_ids = [r[0] for r in cur.fetchall()]

cur.execute("SELECT id, max_xp FROM badges")
badges_meta = {r[0]: r[1] for r in cur.fetchall()}

def course_members(cid):
    cur.execute("""SELECT cm.user_id, u.role FROM course_members cm
                   JOIN users u ON u.id = cm.user_id WHERE cm.course_id = %s""", (cid,))
    return cur.fetchall()

print("Loaded %d users, %d courses, %d badges" % (len(all_users), len(courses), len(badge_ids)))

# ── 1. XP + Levels ───────────────────────────────────────────────────────
LEVELS = [(0,"Beginner"),(150,"Learner"),(350,"Explorer"),
          (600,"Scholar"),(1000,"Expert"),(1600,"Master"),(2500,"Legend")]

def level_name(xp):
    name = "Beginner"
    for thresh, n in LEVELS:
        if xp >= thresh: name = n
    return name

xp_rows = []
for uid, role in all_users:
    if role == 'admin':       xp = random.randint(800, 2000)
    elif role == 'instructor': xp = random.randint(300, 900)
    else:                      xp = random.randint(0, 750)
    xp_rows.append((uid, xp, level_name(xp)))

bulk("""INSERT INTO user_xp (user_id, total_xp, level_name) VALUES (%s,%s,%s)
        ON CONFLICT (user_id) DO UPDATE
        SET total_xp=EXCLUDED.total_xp, level_name=EXCLUDED.level_name""", xp_rows)
print("OK XP seeded for %d users" % len(xp_rows))

# ── 2. Badges ────────────────────────────────────────────────────────────
badge_rows = []
active_students = pick(students, int(len(students) * 0.55))
for uid in active_students:
    for bid in pick(badge_ids, random.randint(1, 5)):
        max_xp   = badges_meta[bid]
        progress = random.randint(int(max_xp * 0.15), max_xp)
        earned   = progress >= max_xp or random.random() < 0.35
        e_at     = ts(60) if earned else None
        badge_rows.append((uid, bid, progress, earned, e_at))

bulk("""INSERT INTO user_badges (user_id, badge_id, progress_xp, earned, earned_at)
        VALUES (%s,%s,%s,%s,%s) ON CONFLICT (user_id, badge_id) DO NOTHING""", badge_rows)
print("OK %d badge records seeded" % len(badge_rows))

# ── 3. Announcements ─────────────────────────────────────────────────────
ANN = [
    ("Midterm Exam - Date & Coverage",
     "The midterm exam is scheduled for next {day}. It covers chapters 1-6. "
     "Review all lecture notes and practice problems. Bring student ID and calculator.", "Important"),
    ("Assignment {n} Released",
     "Assignment {n} is now on the portal. Due: {date}. Read instructions carefully. "
     "Start early as it requires significant effort.", "Academic"),
    ("Lecture Rescheduled - Week {n}",
     "Due to the faculty symposium, this week's lecture on {day} moves to {day2}. "
     "Same room and time. Update your calendars.", "General"),
    ("Quiz Tomorrow - Chapters {a}-{b}",
     "Reminder: quiz tomorrow covering chapters {a} and {b}. Review key definitions "
     "and theorems. It will be 20 minutes at the start of class.", "Important"),
    ("Final Project Guidelines Posted",
     "Final project specs uploaded to the portal. Teams of 2-3 students. "
     "Deadline is the last week of semester. Office hours available for questions.", "Academic"),
    ("Office Hours This Week",
     "Office hours: Tuesday 2:00-4:00 PM and Thursday 1:00-3:00 PM, Room B204. "
     "Can't make it? Email me to schedule an appointment.", "General"),
    ("Grades Posted - Assignment {n}",
     "Grades for Assignment {n} are posted. Class average: {avg}%. "
     "Questions about grading? Come to office hours within one week.", "Academic"),
    ("Extra Credit Opportunity",
     "Attend the department seminar on {day} and submit a one-page reflection by Monday. "
     "Worth 5 bonus points on your final grade.", "Events"),
    ("Lab Manual Updated",
     "The lab manual for week {n} has been corrected. Download the latest version - "
     "typos in equations 4 and 7 have been fixed.", "Technical"),
    ("Exam Room Assignment",
     "Check the seating chart on the portal. Rooms assigned by last name. "
     "Arrive 15 minutes early with your student ID.", "Important"),
    ("Review Session This Weekend",
     "Optional review session Saturday 3:00 PM in Room A101. "
     "We will go through past exam questions. Bring your questions!", "Events"),
    ("Course Evaluations Open",
     "Course evaluations are open until {date}. Your honest feedback improves "
     "the course for future students. Responses are completely anonymous.", "General"),
    ("Lecture Recording Available",
     "Recording of today's lecture is uploaded to the portal. "
     "Rewatch especially the section on {topic} - it will be on the exam.", "Technical"),
    ("Textbook Correction - Page {p}",
     "Error found in textbook page {p}. The correct formula is in the errata document "
     "I uploaded. This content WILL appear on the exam.", "Technical"),
    ("Welcome to the Course!",
     "Welcome everyone! Looking forward to a great semester. Read the syllabus carefully. "
     "First assignment due in two weeks. Questions? Ask anytime!", "General"),
]

DAYS   = ["Monday","Tuesday","Wednesday","Thursday","Sunday"]
TOPICS = ["dynamic programming","graph traversal","Fourier transforms","linear regression",
          "neural networks","database normalization","sorting algorithms","recursion"]
MONTHS = ["April","May","June","March"]

def fill_ann(title, body):
    n    = random.randint(1, 5)
    day  = random.choice(DAYS)
    day2 = random.choice([d for d in DAYS if d != day])
    a    = random.randint(1, 4); b = a + random.randint(1, 2)
    d    = "%s %d" % (random.choice(MONTHS), random.randint(10, 28))
    avg  = random.randint(68, 89)
    p    = random.randint(45, 220)
    top  = random.choice(TOPICS)
    for k, v in [("{n}",str(n)),("{day}",day),("{day2}",day2),("{a}",str(a)),
                 ("{b}",str(b)),("{date}",d),("{avg}",str(avg)),("{p}",str(p)),("{topic}",top)]:
        title = title.replace(k, v); body = body.replace(k, v)
    return title, body

ann_rows = []
for cid, cname, ccode in courses:
    members   = course_members(cid)
    instr_ids = [m[0] for m in members if m[1] == 'instructor'] or pick(instructors, 1)
    author    = random.choice(instr_ids)
    for tmpl in pick(ANN, random.randint(4, 8)):
        t, b = fill_ann(tmpl[0], tmpl[1])
        ann_rows.append((t, b, tmpl[2], random.random() < 0.15, cid, author, ts(85, 1)))

# University-wide announcements
UNI_ANN = [
    ("Spring 2026 Final Exam Schedule Released",
     "The final exam timetable is now on the student portal. Check your dates and rooms. "
     "Conflicts must be reported to the registrar by April 30.", "Important", True),
    ("Library Extended Hours During Finals",
     "The main library is open 24/7 during final exams (May 15-30). "
     "Study rooms can be reserved online up to 48 hours in advance.", "Events", False),
    ("Graduation Ceremony - Class of 2026",
     "Graduation for Class of 2026 is June 15 at the main auditorium. "
     "Students who fulfilled all requirements should register by May 1.", "Events", True),
    ("Campus WiFi Maintenance Sunday 2AM-5AM",
     "Scheduled WiFi maintenance this Sunday 2:00-5:00 AM. "
     "All online services including the student portal will be unavailable.", "Technical", False),
    ("Merit Scholarship Applications Open",
     "The Merit Scholarship for Spring 2027 is accepting applications. "
     "Minimum GPA 3.5. Submit application and two recommendation letters by March 31.", "Important", True),
    ("Student Council Elections - Vote Now",
     "Student Council elections are open. Vote on the student portal before April 15. "
     "Candidates' platforms are available for review.", "Events", False),
    ("Mental Health Awareness Week April 7-11",
     "Free counseling sessions, stress management workshops, and mindfulness events. "
     "Your wellbeing matters - take care of yourself during exam season.", "General", False),
    ("New AI Research Lab Opening - CS Building",
     "The new AI & Machine Learning Research Lab opens this week. "
     "All CS and Engineering students invited to the opening Wednesday 4 PM, Room CS-301.", "Events", False),
]
admin_id = admins[0] if admins else instructors[0]
for t, b, tag, pinned in UNI_ANN:
    ann_rows.append((t, b, tag, pinned, None, admin_id, ts(80, 5)))

bulk("""INSERT INTO announcements (title, body, tag, is_pinned, course_id, created_by, created_at)
        VALUES (%s,%s,%s,%s,%s,%s,%s)""", ann_rows)
print("OK %d announcements seeded" % len(ann_rows))

# ── 4. Chat messages (course channels) ───────────────────────────────────
STUDENT_MSG = [
    "Can someone explain the algorithm from today's lecture? Got lost after step 3.",
    "Anyone else think this chapter is way harder than the previous ones?",
    "Study group tonight at 9 PM? We can use Teams or Discord - DM me",
    "For anyone stuck on problem 3, the key is to think about edge cases first",
    "Found a great YouTube video on this topic - explains it way better than the textbook",
    "When exactly is the quiz? The portal says next week but not which day",
    "I think there is a typo in question 2b - the formula does not match slide 14",
    "Office hours today were super helpful! The Dr explained the tricky part clearly",
    "Just finished the assignment. Took 4 hours but learned a lot. Start early everyone!",
    "Does anyone have notes from last Tuesday? I was out sick",
    "Good luck everyone on the midterm! We got this",
    "Is a formula sheet allowed in the exam? Can not find this anywhere",
    "The practice problems from chapter 5 are exactly what the quiz will cover",
    "Pro tip: the examples in section 3.2 are nearly identical to exam questions",
    "Can we submit as a ZIP file or does it have to be a single PDF?",
    "The recording from Wednesday's lecture is on the portal in case anyone missed it",
    "Finally understood the concept after watching the tutorial video in materials",
    "Anyone want to do a group call to go over the project proposal?",
    "Chapter 7 connects directly to what we learned in the prerequisite course",
    "Midterm covers weeks 1-8, confirmed - I asked during office hours",
    "Does anyone know if the final is cumulative or just the second half?",
    "The lab report format is in appendix B of the lab manual - easy to miss",
    "Recommend Khan Academy for extra practice - exercises match our curriculum",
    "Has anyone started the research component? Looking for a partner",
    "For question 4, do we need to prove it formally or is an explanation enough?",
    "The textbook is free on the university library website btw",
    "Deadline is 11:59 PM not midnight - system cuts off exactly at that time",
    "Shared my notes on the group drive - link in the pinned message",
    "The guest lecture was amazing, learned so much about real-world applications",
    "Anyone notice the answer key has an error in problem 7?",
    "Study tip: do end-of-chapter questions before the lecture, not after",
    "Is the project individual or in groups? Syllabus says groups but someone said individual",
    "Which IDE are we supposed to use? Can we use VS Code?",
    "Deadline was extended to Friday according to the announcement - check the portal!",
    "I actually enjoyed this assignment even though it was hard - good design!",
]

INSTR_MSG = [
    "Reminder: Assignment due this Friday at 11:59 PM. No late submissions accepted.",
    "Lecture slides posted - please review them before our next session.",
    "Great work on the midterm everyone! Average was higher than last semester.",
    "Next week covers the most complex topic in the course - please come prepared.",
    "Common mistake I noticed: always justify your answers with proper notation.",
    "Office hours this week: Tuesday 2-4 PM and Thursday 1-3 PM in Room B204.",
    "For the project, ensure your report follows the IEEE format we discussed.",
    "I have extended the deadline by 48 hours given the technical issues reported.",
    "Check the course portal FAQ before emailing - saves us both time.",
    "The grading rubric for the project is posted. Read it carefully before starting.",
    "Attendance counts 10% of your final grade - please attend every session.",
    "Several students are confused about section 3.2 - we will revisit it Thursday.",
    "Congratulations to those who scored above 90 on the quiz - excellent work!",
    "Bring your student ID to every exam - required for identification.",
    "The practice exam I posted is a great indicator of the actual exam difficulty.",
    "If you are struggling, please reach out early. I am here to help you succeed.",
    "Today's recording is on the portal - recommend watching the examples segment again.",
    "All work must be original. Plagiarism results in a zero and disciplinary action.",
    "For those attending the optional review session Saturday, bring past exam questions.",
    "Grades for quiz 2 are posted. Check your feedback to understand where to improve.",
]

msg_rows = []
for cid, cname, ccode in courses:
    members   = course_members(cid)
    stud_ids  = [m[0] for m in members if m[1] == 'student']
    instr_ids = [m[0] for m in members if m[1] == 'instructor']
    if not stud_ids:
        continue
    for i in range(random.randint(40, 75)):
        days_ago = random.randint(0, 80)
        created  = ts(days_ago + 1, days_ago)
        if instr_ids and random.random() < 0.18:
            msg_rows.append(('course', cid, random.choice(instr_ids), random.choice(INSTR_MSG), created))
        else:
            msg_rows.append(('course', cid, random.choice(stud_ids),  random.choice(STUDENT_MSG), created))

bulk("""INSERT INTO messages (channel_type, channel_id, sender_id, content, sent_at)
        VALUES (%s,%s,%s,%s,%s)""", msg_rows)
print("OK %d course messages seeded" % len(msg_rows))

# ── 5. Course materials ──────────────────────────────────────────────────
MAT_TMPLS = [
    ("Lecture Slides - Week {n}",    "https://drive.google.com/file/d/slides_w{n}/view",     "link", "Full slide deck for week {n} lectures"),
    ("Practice Problems Set {n}",    "https://drive.google.com/file/d/problems_{n}/view",    "link", "Problems for self-study - answers in separate file"),
    ("Reference: {topic}",           "https://www.researchgate.net/publication/ex_{n}",      "link", "Recommended reading for deeper understanding"),
    ("Video Tutorial: {topic}",      "https://www.youtube.com/watch?v=example_{n}",          "link", "Visual explanation of the core concept"),
    ("Lab Manual Week {n}",          "https://drive.google.com/file/d/lab_{n}/view",          "link", "Step-by-step lab instructions and submission format"),
    ("Past Exam {n} + Solutions",    "https://drive.google.com/file/d/exam_{n}/view",         "link", "Previous year exam with full worked solutions"),
    ("Textbook Chapter {n}",         "https://library.university.edu/textbook/ch{n}",         "link", "Chapter {n} - required reading before next lecture"),
    ("Assignment {n} Starter Code",  "https://github.com/university/course/assign{n}",        "link", "Template project structure for Assignment {n}"),
    ("Supplementary Notes",          "https://drive.google.com/file/d/notes_supp/view",       "link", "Extra notes on advanced topics beyond the textbook"),
    ("Approved Formula Sheet",       "https://drive.google.com/file/d/formulas/view",         "link", "Identical to the formula sheet given in exams"),
]

mat_rows = []
for cid, cname, ccode in courses:
    members   = course_members(cid)
    instr_ids = [m[0] for m in members if m[1] == 'instructor'] or pick(instructors, 1)
    author    = random.choice(instr_ids)
    for tmpl in pick(MAT_TMPLS, random.randint(4, 8)):
        n     = random.randint(1, 12)
        topic = random.choice(TOPICS)
        title = tmpl[0].replace("{n}", str(n)).replace("{topic}", topic)
        url   = tmpl[1].replace("{n}", str(n)).replace("{topic}", topic.replace(" ","_"))
        desc  = tmpl[3].replace("{n}", str(n)).replace("{topic}", topic)
        mat_rows.append((cid, title, tmpl[2], url, desc, author, ts(75, 2)))

bulk("""INSERT INTO course_materials (course_id, title, type, url, description, created_by, created_at)
        VALUES (%s,%s,%s,%s,%s,%s,%s)""", mat_rows)
print("OK %d course materials seeded" % len(mat_rows))

# ── 6. Calendar events ───────────────────────────────────────────────────
EV_TMPLS = [
    ("{code} Lecture - Week {n}", "lecture",      90),
    ("{code} Tutorial Session",   "meeting",      60),
    ("{name} Midterm Exam",       "exam",         120),
    ("{name} Final Exam",         "exam",         180),
    ("{code} Assignment {n} Due", "deadline",     0),
    ("{code} Lab Session {n}",    "meeting",      120),
    ("{code} Office Hours",       "office_hours", 60),
    ("{code} Quiz {n}",           "exam",         30),
    ("Study Session - {code}",    "meeting",      120),
]

event_rows = []
for cid, cname, ccode in pick(courses, 80):
    members   = course_members(cid)
    instr_ids = [m[0] for m in members if m[1] == 'instructor'] or pick(instructors, 1)
    author    = random.choice(instr_ids)
    for tmpl in pick(EV_TMPLS, random.randint(6, 14)):
        n     = random.randint(1, 12)
        title = tmpl[0].replace("{code}", ccode).replace("{name}", cname).replace("{n}", str(n))
        dur   = tmpl[2]
        if random.random() < 0.65:
            start = ts(85, 1)
        else:
            start = datetime.now() + timedelta(days=random.randint(1, 55))
        end = (start + timedelta(minutes=dur)) if dur else None
        event_rows.append((title, tmpl[1], start, end, cid, None, author, ts(88, 86)))

UNI_EVENTS = [
    ("Spring 2026 Final Exams Begin",     "exam"),
    ("Graduation Ceremony 2026",          "club_event"),
    ("University Sports Day",             "club_event"),
    ("Research Symposium - CS & Eng",     "meeting"),
    ("Career Fair - Spring 2026",         "club_event"),
    ("Open Day for Prospective Students", "club_event"),
]
for title, etype in UNI_EVENTS:
    start = datetime.now() + timedelta(days=random.randint(5, 50))
    end   = start + timedelta(hours=random.randint(2, 5))
    event_rows.append((title, etype, start, end, None, None, admin_id, ts(10)))

bulk("""INSERT INTO events (title, type, start_time, end_time, course_id, club_id, created_by, created_at)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""", event_rows)
print("OK %d calendar events seeded" % len(event_rows))

# ── 7. Teams + members + team messages ───────────────────────────────────
TEAM_NAMES = [
    "Code Warriors","Bug Hunters","Algorithm Aces","Data Dragons","Debug Squad",
    "Logic Legends","Neural Ninjas","Byte Builders","Stack Overflow Survivors",
    "Recursive Thinkers","Binary Brothers","Kernel Panic","Null Pointers",
    "The Compilers","Random Forest Rangers","Deep Learners","Syntax Savants",
    "Git Pushers","The Loop Breakers","Cloud Climbers","Cache Masters",
    "Query Queens","Pointer Pirates","The Debuggers","Async Avengers",
    "Runtime Rebels","Object Oriented Outlaws","The Iterators","Overflow Optimists",
    "Final Year Survivors","Exam Crushers","GPA Guardians","The Committers",
    "Sprint Team Alpha","Deadline Dodgers","Coffee and Code","Late Night Coders",
    "Open Source Gang","The Refactors","Agile Aces","Full Stack Family",
    "The Endpoints","Backend Bosses","Frontend Fighters","Database Divas",
    "API All-Stars","DevOps Dreams","Security Scholars","AI Explorers","The Hackers",
]
TEAM_DESCS = [
    "Focused on acing the final exam together. We share notes and hold weekly sessions.",
    "Collaborative project team. We meet twice a week and keep each other accountable.",
    "Peer tutoring group - everyone teaches what they know best and learns the rest.",
    "Competitive programming team preparing for ICPC and similar contests.",
    "Dedicated study group. No distractions, just focused learning and problem solving.",
    "Research-oriented team exploring real-world applications of what we learn in class.",
    "Final year project team. We are building something impactful together.",
    "Support network for students juggling multiple courses - we share strategies.",
    "Open to all skill levels. We believe in learning together and lifting each other up.",
    "High-performance study team. We hold each other to high standards.",
]
TEAM_MSG = [
    "Hey everyone, when does next meeting work for everyone?",
    "I uploaded my notes from today's lecture to our shared folder",
    "Quick call tonight to go over the assignment?",
    "I am struggling with problem 4 - anyone else? Let us tackle it together",
    "Great session yesterday! I think we are really making progress",
    "Reminder: our next meeting is Thursday at 8 PM",
    "Just found a really useful resource, sharing it now",
    "Should we split the project sections or tackle each one together?",
    "Need to finalize the proposal by Sunday - who is drafting it?",
    "Finished my part! Will review one more time before sharing",
    "Has everyone gone through chapter 7? It will be on the exam for sure",
    "One more review session before the deadline - who is in?",
    "Good luck everyone - we have prepared well!",
    "The answer to problem 2 was simpler than I thought",
    "Do not forget to submit by 11:59 PM, not midnight!",
    "Our team average so far is really strong - keep it up",
    "Will be 15 minutes late today, please start without me",
    "Great job on the quiz everyone! We really nailed it",
    "Who wants to lead the presentation section?",
    "Let us share all resources here to keep everything in one place",
]

team_rows = []
for tname in TEAM_NAMES:
    cid, cname, ccode = random.choice(courses)
    members  = course_members(cid)
    stud_ids = [m[0] for m in members if m[1] == 'student'] or pick(students, 5)
    leader   = random.choice(stud_ids)
    team_rows.append((
        tname, cid, random.choice(TEAM_DESCS),
        random.choice(["Study","Project","Competition","Research"]),
        random.choice([3,4,5,6]),
        random.choice(["Any","Any","Any","Beginner","Intermediate","Advanced"]),
        leader, ts(70, 5)
    ))

bulk("""INSERT INTO teams (name, course_id, description, type, max_members, level_req, created_by, created_at)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""", team_rows)
conn.commit()

cur.execute("SELECT id, created_by, course_id, max_members FROM teams ORDER BY id DESC LIMIT %s", (len(TEAM_NAMES),))
new_teams = cur.fetchall()

tm_rows  = []
tmsg_rows = []
for tid, leader_id, cid, max_m in new_teams:
    tm_rows.append((tid, leader_id, 'leader', ts(70, 5)))
    cur.execute("""SELECT user_id FROM course_members
                   WHERE course_id=%s AND user_id != %s
                   ORDER BY random() LIMIT %s""", (cid, leader_id, max_m - 1))
    for (uid,) in cur.fetchall():
        tm_rows.append((tid, uid, 'member', ts(68, 4)))
    team_uids = [leader_id]
    cur.execute("SELECT user_id FROM team_members WHERE team_id=%s LIMIT 10", (tid,))
    team_uids += [r[0] for r in cur.fetchall()]
    for _ in range(random.randint(10, 22)):
        tmsg_rows.append(('team', tid, random.choice(team_uids), random.choice(TEAM_MSG), ts(65, 0)))

bulk("""INSERT INTO team_members (team_id, user_id, role, joined_at)
        VALUES (%s,%s,%s,%s) ON CONFLICT (team_id, user_id) DO NOTHING""", tm_rows)
bulk("""INSERT INTO messages (channel_type, channel_id, sender_id, content, sent_at)
        VALUES (%s,%s,%s,%s,%s)""", tmsg_rows)
print("OK %d teams, %d memberships, %d team messages seeded" % (len(TEAM_NAMES), len(tm_rows), len(tmsg_rows)))

# ── 8. Study streaks ────────────────────────────────────────────────────
streak_rows = []
for uid in pick(students, int(len(students) * 0.60)):
    curr    = random.randint(0, 45)
    longest = curr + random.randint(0, 30)
    last_a  = date.today() - timedelta(days=random.randint(0, 3))
    streak_rows.append((uid, curr, longest, last_a))

bulk("""INSERT INTO study_streaks (user_id, current_streak, longest_streak, last_active)
        VALUES (%s,%s,%s,%s)
        ON CONFLICT (user_id) DO UPDATE
        SET current_streak=EXCLUDED.current_streak,
            longest_streak=EXCLUDED.longest_streak,
            last_active=EXCLUDED.last_active""", streak_rows)
print("OK %d study streaks seeded" % len(streak_rows))

# ── 9. Goals ────────────────────────────────────────────────────────────
GOAL_TMPLS = [
    ("Finish all assignments on time", "Submit every assignment before the deadline - no late submissions."),
    ("Maintain GPA above 3.5", "Study consistently and perform well in all assessments."),
    ("Attend all lectures", "Perfect attendance for the entire semester."),
    ("Complete 30 LeetCode problems", "Practice algorithmic problem solving for internship interviews."),
    ("Read the full textbook", "Go through every chapter and take notes, not just what is covered in class."),
    ("Earn the Scholar badge", "Accumulate XP through consistent performance and participation."),
    ("Join a study group", "Find like-minded students and form a regular study group."),
    ("Get an A in Data Structures", "Master core concepts and ace every assessment in the course."),
    ("Complete the final project early", "Finish two weeks ahead - no last-minute panic."),
    ("Watch all tutorial videos", "Go through supplementary video content to reinforce lectures."),
    ("Help 10 classmates understand difficult topics", "Teaching others solidifies your own understanding."),
    ("Build a personal project", "Apply what you learn to build something real outside coursework."),
    ("Never submit an assignment within 1 hour of the deadline", "Plan weekly to avoid submission stress."),
    ("Get full marks on all quizzes", "Review slides before every quiz and never walk in unprepared."),
]

goal_rows = []
for uid in pick(students, min(900, len(students))):
    for tmpl in pick(GOAL_TMPLS, random.randint(2, 5)):
        completed = random.random() < 0.25
        target_d  = date.today() + timedelta(days=random.randint(-10, 60))
        c_at      = ts(random.randint(1, 30)) if completed else None
        goal_rows.append((uid, tmpl[0], tmpl[1], target_d,
                          random.randint(25, 150), completed, c_at, ts(80, 5)))

bulk("""INSERT INTO goals (user_id, title, description, target_date, xp_reward,
        completed, completed_at, created_at)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""", goal_rows)
print("OK %d goals seeded" % len(goal_rows))

# ── 10. Grades ──────────────────────────────────────────────────────────
GRADE_ITEMS = [
    ("Assignment 1","assignment",15),("Assignment 2","assignment",15),
    ("Assignment 3","assignment",10),("Quiz 1","quiz",5),
    ("Quiz 2","quiz",5),("Midterm Exam","exam",25),
    ("Lab Report 1","lab",10),("Lab Report 2","lab",10),
    ("Final Project","project",20),("Participation","participation",5),
]

grade_rows = []
for cid, cname, ccode in pick(courses, 60):
    members  = course_members(cid)
    stud_ids = [m[0] for m in members if m[1] == 'student']
    for uid in pick(stud_ids, min(30, len(stud_ids))):
        for item_name, item_type, weight in pick(GRADE_ITEMS, random.randint(3, 8)):
            score = round(max(30.0, min(100.0, random.gauss(75, 12))), 1)
            grade_rows.append((uid, cid, item_name, item_type, score, 100.0, weight, ts(60, 0)))

bulk("""INSERT INTO grades (user_id, course_id, item_name, item_type, score, max_score, weight, created_at)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""", grade_rows)
print("OK %d grade records seeded" % len(grade_rows))

# ── 11. Notifications ───────────────────────────────────────────────────
NOTIF_TMPLS = [
    ("New announcement in your course",    "Your instructor posted: 'Reminder - Assignment due Friday'"),
    ("Badge unlocked!",                    "You earned the 'Study Buddy' badge for forming a study group"),
    ("Quiz tomorrow",                      "Do not forget: quiz tomorrow at the start of class"),
    ("Team request approved",              "Your request to join 'Code Warriors' has been accepted!"),
    ("New material uploaded",              "Your instructor uploaded 'Lecture Slides Week 7'"),
    ("14-day study streak!",               "You have maintained a 14-day study streak - keep it up!"),
    ("Assignment graded",                  "Your Assignment 2 has been graded. Check your grades."),
    ("New message in your team",           "Your team has 3 new messages"),
    ("Goal completed!",                    "Congratulations! You completed: 'Attend all lectures'"),
    ("Exam result posted",                 "Your midterm exam result is now available"),
    ("New member joined your team",        "A new student joined your study group"),
    ("Important announcement pinned",      "An important announcement has been pinned in your course"),
    ("Office hours reminder",              "Office hours today 2-4 PM, Room B204"),
    ("Event starting in 30 minutes",       "Your lecture starts in 30 minutes"),
    ("New club event",                     "The Programming Club is hosting a hackathon next Saturday!"),
]

notif_rows = []
for uid in pick(students, min(600, len(students))) + pick(instructors, min(60, len(instructors))):
    for tmpl in pick(NOTIF_TMPLS, random.randint(2, 8)):
        notif_rows.append((uid, tmpl[0], tmpl[1], random.random() < 0.55, ts(30, 0)))

bulk("""INSERT INTO notifications (user_id, title, body, is_read, created_at)
        VALUES (%s,%s,%s,%s,%s)""", notif_rows)
print("OK %d notifications seeded" % len(notif_rows))

# ── 12. Activity log ────────────────────────────────────────────────────
ACTIONS = ["posted_message","submitted_assignment","joined_team","earned_badge",
           "posted_material","completed_goal","achieved_streak","joined_club",
           "posted_announcement","started_discussion"]

act_rows = []
for uid, role in pick(all_users, min(400, len(all_users))):
    for _ in range(random.randint(3, 12)):
        cid = random.choice(courses)[0]
        act_rows.append((uid, random.choice(ACTIONS), "course", cid, ts(85, 0)))

bulk("""INSERT INTO activity_log (actor_id, action, context, context_id, created_at)
        VALUES (%s,%s,%s,%s,%s)""", act_rows)
print("OK %d activity log entries seeded" % len(act_rows))

# ── 13. AI training pairs ────────────────────────────────────────────────
AI_PAIRS = [
    ("How do I calculate my GPA?",
     "GPA = sum(grade_points x credit_hours) / total_credit_hours. A=4.0, B=3.0, C=2.0, D=1.0, F=0.","academic"),
    ("What is dynamic programming?",
     "DP solves complex problems by breaking them into overlapping subproblems and caching results. "
     "Examples: Fibonacci, knapsack, shortest paths.","cs"),
    ("How should I prepare for exams?",
     "Start reviewing 2 weeks early. Summarize each chapter, do practice problems, "
     "form a study group, and sleep 8 hours before the exam.","study"),
    ("What is Big O notation?",
     "Big O describes worst-case time or space complexity as input grows. "
     "O(1)=constant, O(log n)=logarithmic, O(n)=linear, O(n^2)=quadratic.","cs"),
    ("How do database indexes work?",
     "An index (usually a B-tree) lets the database find rows without scanning every row. "
     "Trade-off: faster reads, slower writes, more storage.","cs"),
    ("What are the SOLID principles?",
     "Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, "
     "Dependency Inversion. Five principles for maintainable OOP code.","cs"),
    ("How can I manage my time better?",
     "Use time-blocking: schedule specific hours for studying and breaks. "
     "Prioritize with a task list and use the Pomodoro technique for focus sessions.","study"),
    ("What is supervised vs unsupervised learning?",
     "Supervised uses labeled data to predict outputs (e.g. regression, classification). "
     "Unsupervised finds patterns in unlabeled data (e.g. clustering).","cs"),
    ("How do I join a team on UniVerse?",
     "Go to Team Hub in the sidebar, browse available teams, click Request to Join. "
     "The team leader will approve or decline your request.","platform"),
    ("What is the Pomodoro technique?",
     "Work for 25 minutes with full focus, then take a 5-minute break. "
     "After 4 cycles, take a longer break. Proven to improve focus and prevent burnout.","productivity"),
    ("How do I earn badges on UniVerse?",
     "Badges are earned by completing academic milestones: perfect scores, "
     "attendance streaks, collaboration, and engagement. Check Badges to track progress.","platform"),
    ("What is a linked list vs an array?",
     "Array: fixed size, O(1) random access. Linked list: dynamic size, "
     "O(n) access but O(1) insertion at head. Choose based on your access pattern.","cs"),
    ("How do I upload course materials on UniVerse?",
     "As an instructor, go to your Course Management, open the course, "
     "switch to the Materials tab, and click Add Material. Supports links and file uploads.","platform"),
    ("What is recursion?",
     "A function that calls itself with a smaller input until a base case is reached. "
     "Key: always define a base case to avoid infinite recursion.","cs"),
    ("How do I stay motivated during a long semester?",
     "Set small achievable goals, track your progress, reward yourself after milestones, "
     "study with friends, and remember your long-term purpose.","motivation"),
]

ai_rows = [(p[0], p[1], p[2], ts(60, 0)) for p in AI_PAIRS]
bulk("""INSERT INTO ai_training_pairs (question, answer, category, created_at)
        VALUES (%s,%s,%s,%s)""", ai_rows)
print("OK %d AI training pairs seeded" % len(ai_rows))

cur.close()
conn.close()
print("")
print("DONE - All activity data seeded! The platform now feels like a real university.")
