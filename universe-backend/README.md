# UniVerse Backend API

Node.js + Express + PostgreSQL backend for the UniVerse university platform.

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Setup environment
```bash
cp .env.example .env
# Fill in your PostgreSQL credentials and JWT secret
```

### 3. Create the database
```bash
psql -U postgres -c "CREATE DATABASE universe_db;"
psql -U postgres -d universe_db -f sql/schema.sql
```

### 4. Run the server
```bash
npm run dev     # development (nodemon)
npm start       # production
```

Server runs on `http://localhost:5000`

---

## 📁 Project Structure

```
src/
├── config/
│   └── db.js                  # PostgreSQL pool
├── controllers/
│   ├── authController.js      # register, login, logout, me
│   ├── coursesController.js   # CRUD + join
│   ├── clubsController.js     # CRUD + join/leave
│   ├── teamsController.js     # CRUD + requests
│   ├── messagesController.js  # channel messages
│   ├── announcementsController.js
│   ├── badgesController.js
│   ├── eventsController.js
│   ├── tasksController.js
│   └── usersController.js     # profile, settings, activity
├── middleware/
│   ├── auth.js                # JWT + role guard
│   └── validate.js            # express-validator errors
├── routes/
│   ├── index.js               # mounts all routers
│   ├── auth.js
│   ├── courses.js
│   ├── clubs.js
│   ├── teams.js
│   ├── messages.js
│   ├── announcements.js
│   ├── badges.js
│   ├── events.js
│   ├── tasks.js
│   └── users.js
└── index.js                   # Express app entry point
sql/
└── schema.sql                 # Full DB schema + seed data
```

---

## 🔐 Authentication

All protected routes require:
```
Authorization: Bearer <token>
```

Token is returned on login/register and expires in 7 days.

---

## 📡 API Endpoints

### AUTH
| Method | Endpoint            | Body                                  | Auth | Description        |
|--------|---------------------|---------------------------------------|------|--------------------|
| POST   | /api/auth/register  | full_name, email, password            | ❌   | Register user      |
| POST   | /api/auth/login     | email, password                       | ❌   | Login → get token  |
| POST   | /api/auth/logout    | —                                     | ✅   | Set offline        |
| GET    | /api/auth/me        | —                                     | ✅   | Get current user   |

**Login response:**
```json
{
  "token": "eyJ...",
  "user": {
    "id": 1,
    "full_name": "Ahmed Mohamed",
    "email": "ahmed@uni.edu",
    "role": "student",
    "avatar_color": "#7c3aed"
  }
}
```

---

### USERS
| Method | Endpoint                          | Description              |
|--------|-----------------------------------|--------------------------|
| GET    | /api/users/home-summary           | Dashboard stats          |
| GET    | /api/users/activity               | Recent activity feed     |
| GET    | /api/users/notifications          | Notification list        |
| PATCH  | /api/users/notifications/:id/read | Mark notification read   |
| PATCH  | /api/users/profile                | Update name/avatar       |
| PATCH  | /api/users/password               | Change password          |
| PATCH  | /api/users/settings               | Update app settings      |

---

### COURSES
| Method | Endpoint                  | Roles             | Description            |
|--------|---------------------------|-------------------|------------------------|
| GET    | /api/courses              | all               | My enrolled courses    |
| GET    | /api/courses/:id          | all               | Single course details  |
| GET    | /api/courses/:id/members  | all               | Course members list    |
| POST   | /api/courses              | instructor, admin | Create course          |
| POST   | /api/courses/:id/join     | all               | Join a course          |

---

### CLUBS
| Method | Endpoint                 | Description         |
|--------|--------------------------|---------------------|
| GET    | /api/clubs               | All clubs           |
| GET    | /api/clubs/mine          | My joined clubs     |
| GET    | /api/clubs/:id/members   | Club members        |
| POST   | /api/clubs               | Create club         |
| POST   | /api/clubs/:id/join      | Join club           |
| DELETE | /api/clubs/:id/leave     | Leave club          |

---

### TEAMS
| Method | Endpoint                        | Description               |
|--------|---------------------------------|---------------------------|
| GET    | /api/teams                      | All teams (+ ?course_id)  |
| GET    | /api/teams/mine                 | My teams                  |
| POST   | /api/teams                      | Create team               |
| POST   | /api/teams/:id/request          | Request to join           |
| GET    | /api/teams/:id/requests         | Pending join requests     |
| PATCH  | /api/teams/requests/:requestId  | Accept / reject request   |

---

### MESSAGES
| Method | Endpoint        | Query Params                                   | Description          |
|--------|-----------------|------------------------------------------------|----------------------|
| GET    | /api/messages   | channel_type, channel_id, limit, before        | Get channel messages |
| POST   | /api/messages   | { channel_type, channel_id, content }          | Send message         |
| DELETE | /api/messages/:id | —                                            | Delete own message   |

**channel_type values:** `course` | `club` | `team` | `direct`

---

### ANNOUNCEMENTS
| Method | Endpoint                     | Roles              | Description             |
|--------|------------------------------|--------------------|-------------------------|
| GET    | /api/announcements           | all                | All (+ ?course_id)      |
| POST   | /api/announcements           | instructor, admin  | Create announcement     |
| PATCH  | /api/announcements/:id/pin   | instructor, admin  | Toggle pin              |
| DELETE | /api/announcements/:id       | instructor, admin  | Delete                  |

---

### BADGES
| Method | Endpoint          | Description                        |
|--------|-------------------|------------------------------------|
| GET    | /api/badges       | All badges + user progress         |
| GET    | /api/badges/summary | Earned count, XP, level          |

---

### EVENTS (Calendar)
| Method | Endpoint       | Query Params              | Description        |
|--------|----------------|---------------------------|--------------------|
| GET    | /api/events    | from, to, type            | Events in range    |
| POST   | /api/events    | —                         | Create event       |
| DELETE | /api/events/:id | —                        | Delete event       |

---

### TASKS
| Method | Endpoint              | Description      |
|--------|-----------------------|------------------|
| GET    | /api/tasks            | My tasks         |
| POST   | /api/tasks            | Create task      |
| PATCH  | /api/tasks/:id/toggle | Toggle done      |
| DELETE | /api/tasks/:id        | Delete task      |

---

## 👥 User Roles

| Role           | Description                               |
|----------------|-------------------------------------------|
| `student`      | Default — courses, teams, clubs           |
| `instructor`   | + create courses, announcements           |
| `club_member`  | + club features only                      |
| `student_club` | Full student + club features              |
| `admin`        | Full access to everything                 |

Role is stored in the DB and returned on login — **no role selection in the frontend**.

---

## 🔗 Frontend Integration

In your React app, after login store the token and attach it to every request:

```js
// api.js
const BASE = "http://localhost:5000/api";

export const api = async (path, options = {}) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) throw await res.json();
  return res.json();
};

// Login example
export const login = async (email, password) => {
  const data = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem("token", data.token);
  return data.user;   // { id, full_name, email, role, ... }
};
```
