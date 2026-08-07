# Personalized Learning Platform

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v14+-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Vite](https://img.shields.io/badge/Vite-v8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Razorpay](https://img.shields.io/badge/Razorpay-v2-002F6C?logo=razorpay&logoColor=white)](https://razorpay.com/)

A comprehensive, full-stack **Personalized Learning Platform** designed to offer student-centric, adaptive learning workflows. The platform tracks individual user progress, schedules revisions using spaced repetition algorithms, constructs personalized daily study plans, awards gamified achievements, processes secure course enrollments with payment integrations, and sends background email notifications.

---

## 📖 Table of Contents

- [Core Features](#-core-features)
- [Architecture & Flow](#-architecture--flow)
- [System Algorithms](#-system-algorithms)
  - [1. Spaced Repetition (SuperMemo-2)](#1-spaced-repetition-supermemo-2)
  - [2. Adaptive Quiz Engine](#2-adaptive-quiz-engine)
  - [3. Personalized Study Planner](#3-personalized-study-planner)
- [Tech Stack](#-tech-stack)
- [Directory Structure](#-directory-structure)
- [Database Schema](#-database-schema)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Database Setup](#database-setup)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Background Services](#-background-services)

---

## 🌟 Core Features

- 👤 **User Accounts & Roles**: User accounts are secured via JWT & Bcrypt with role-based access control supporting `STUDENT`, `TEACHER`, and `TA` (Teaching Assistant) roles.
- 🤝 **Teaching Assistant (TA) Workflow**:
  - **Course Applications**: TAs can apply to courses with motivation cover notes and qualifications.
  - **Teacher Reviews**: Lead teachers inspect and approve/reject TA applications.
  - **Course-Scoped Access**: Approved TAs get limited read access to student names and topic skill scores for their assigned courses.
  - **Human Doubt Solver**: Students can toggle between the AI Doubt Solver and Human TA modes, requesting 1-on-1 virtual sessions with assigned TAs.
  - **iCalendar (.ics) Invites**: When a TA schedules a virtual session, an automated `.ics` calendar invitation is attached to the student's confirmation email.
- 🎮 **Gamification & Progress Tracking**:
  - **XP Point Rewards**: Students gain experience points (XP) by participating in quizzes.
  - **Daily Streak Tracking**: Automatically tracks and maintains consecutive active days, warning users when a streak is about to lapse.
  - **Badges & Achievements**: Unlocks unique achievements based on accumulated XP, perfect quiz scores, or learning streaks.
- 📚 **Course Management**: Browsing courses, checking enrollment status, viewing topic listings, and viewing structured notes or video material.
- 💳 **Razorpay Checkout Integration**: Payment gateways setup for paid course enrollments, complete with signature verification.
- 📅 **Personalized Study Planner**: Analyzes student weakness and urgency metrics to yield customized rolling study schedules.
- 🗂️ **Spaced Repetition Scheduler**: Organizes learning materials using card evaluation ratings, helping users study items at scientifically optimal intervals.
- ✉️ **Automated Background Alerts**: Scan servers automatically via a mock cron scheduler to remind students of pending revisions and expiring streaks.

---

## 🏗️ Architecture & Flow

The system operates as a classic Client-Server-Database application:

```mermaid
graph TD
    subgraph Frontend [Vite React Client]
        A[React UI Components] --> B[React Router v7 / AuthContext]
        B --> C[Axios API Client]
    end

    subgraph Backend [Express API Server]
        C --> D[Express Router & Middlewares]
        D --> E[Auth Controller]
        D --> F[Course & Material Controller]
        D --> G[Quiz Controller]
        D --> H[Study Planner Controller]
        D --> I[SRS Review Controller]
        D --> J[Payment Controller]
        
        K[Cron Scheduler Service] -.->|Nodemailer| L[Email Service]
        F & G & H & I & J & E --> M[Custom Business Engines]
    end

    subgraph Core Engines [Business Engines]
        M --> M1[Adaptive Quiz Engine]
        M --> M2[Spaced Repetition SM-2 Engine]
        M --> M3[Study Planner Engine]
    end

    subgraph Storage [Database]
        M1 & M2 & M3 & E & J --> N[(PostgreSQL)]
        K -->|Poll Active/SRS status| N
    end
```

---

## ⚙️ System Algorithms

### 1. Spaced Repetition (SuperMemo-2)
The platform evaluates retention for specific learning materials using the SuperMemo-2 (SM-2) algorithm. When a user reviews a material and enters a recall quality rating ($q$) between $0$ and $5$:
- **Quality $\ge 3$ (Success)**: Increments repetition count. The next review interval ($I$) increases based on the card's Easiness Factor ($EF$):
  - 1st repetition: $I = 1$ day
  - 2nd repetition: $I = 6$ days
  - $\ge$ 3rd repetition: $I = \text{round}(I_{\text{prev}} \times EF_{\text{prev}})$
- **Quality $< 3$ (Failure)**: Resets repetition count to $0$ and sets the interval to $1$ day (forces immediate re-study).
- **Easiness Factor Update**:
  $$EF_{\text{new}} = EF_{\text{prev}} + (0.1 - (5 - q) \times (0.08 + (5 - q) \times 0.02))$$
  *(Note: EF is constrained to a minimum of 1.3)*

### 2. Adaptive Quiz Engine
Instead of linear tests, the platform fetches quiz questions dynamically.
1. The engine checks the student's current `skill_score` ($0$ to $100$) for the quiz's parent topic.
2. It maps the score to a difficulty tier:
   - **Score < 40**: Target `EASY` questions.
   - **Score between 40 and 75**: Target `MEDIUM` questions.
   - **Score > 75**: Target `HARD` questions.
3. The engine selects a random unanswered question matching the target tier. If none are left, it falls back to any unanswered question in the quiz.
4. Upon submission, it adjusts the `skill_score`:
   - Score $\ge 80\%$: $+10$ points.
   - Score $< 50\%$: $-10$ points.
   - Score in between: $+2$ points (completion reward).

### 3. Personalized Study Planner
The scheduler helps users organize their studies for the upcoming $7$-day period. It evaluates each course topic using a custom **Priority Score**:
$$\text{Priority Score} = 0.40 \times \text{Exam Urgency} + 0.35 \times \text{Weakness} + 0.25 \times \text{SRS Overdue Urgency}$$
- **Exam Urgency**: Weighted higher if the student has set a goal date close to today ($\le 3$ days $\rightarrow$ $100$ pts, $\le 10$ days $\rightarrow$ $75$ pts, etc.).
- **Weakness**: Calculated as $100 - \text{skill\_score}$.
- **SRS Overdue Urgency**: Based on the count of overdue spaced repetition items in this topic ($\text{Count} \times 20$, capped at $100$).

The top 2 highest priority topics are assigned to each day's study blocks based on the student's available daily hours.

### 4. Teaching Assistant (TA) & Human Doubt Solver Workflow
1. **Application & Assignment**: Registered `TA` users browse available courses and submit applications. The teacher owning the course reviews pending applications and approves/rejects them. Approval creates an assignment record in `course_tas`.
2. **Guarded Student Data Access**: TAs gain read-only access to enrolled students and their topic skill mastery scores strictly for assigned courses (`verifyTaAssignedToCourse`).
3. **Student Human-TA Request Flow**: Students toggle to "Human TA" on the doubt solving screen to see TAs assigned to their enrolled courses and submit doubt requests.
4. **Meeting Scheduling & .ics Calendar Invites**: TAs schedule virtual sessions (Google Meet/Zoom URL + date/time). The backend generates an iCalendar (`.ics`) file via the `ics` package and emails it as an attachment to the student.

---

## 🛠️ Tech Stack

### Backend
- **Node.js**: Server runtime environment.
- **Express**: Router and REST API endpoint framework.
- **PostgreSQL (`pg` driver)**: Data repository.
- **Nodemailer**: Dispatches notification emails.
- **Razorpay SDK**: Handles payments.
- **JWT (JsonWebToken) & BcryptJS**: User security and sessions.

### Frontend
- **React 19**: Component-based UI library.
- **Vite**: Rapid-bundling development server.
- **React Router DOM v7**: Client-side routing.
- **Axios**: HTTP API client.
- **Lucide React**: Vector icons.

---

## 📁 Directory Structure

```text
├── backend/
│   ├── config/             # DB configuration setup
│   ├── controllers/        # Express handlers (Auth, Course, Quiz, etc.)
│   ├── engines/            # Spaced repetition, quiz scoring & planner algos
│   ├── middleware/         # Auth validation & route guards
│   ├── routes/             # REST endpoints matching controllers
│   ├── services/           # Nodemailer & Cron services
│   ├── .env.example        # Example environmental configuration template
│   ├── package.json        # Backend NPM dependency settings
│   └── server.js           # Server bootloader & scheduler start
├── database/
│   ├── schema.sql          # DB DDL tables, types, & index layout
│   └── seeds.sql           # Initial course, achievement, and user mock data
├── frontend/
│   ├── public/             # Static public assets
│   ├── src/
│   │   ├── components/     # UI components (Sidebar, etc.)
│   │   ├── context/        # React Auth State Context provider
│   │   ├── pages/          # View Pages (Dashboard, CourseView, Login)
│   │   ├── services/       # API integration endpoints (Axios config)
│   │   ├── App.jsx         # App router layouts
│   │   └── main.jsx        # App entry setup
│   ├── package.json        # Frontend NPM configuration
│   └── vite.config.js      # Bundler settings
└── README.md               # Root project documentation (This file)
```

---

## 🗄️ Database Schema

Here is a summary of the core database tables defined in [database/schema.sql](file:///c:/Users/Dhairya/.gemini/antigravity-ide/scratch/personalized-learning-platform/database/schema.sql):

| Table | Purpose | Key Relations |
| :--- | :--- | :--- |
| `users` | Stores accounts, streak data, and accumulated XP points | *Primary key: UUID* |
| `courses` | Available courses created by teachers | `teacher_id` $\rightarrow$ `users(id)` |
| `enrollments` | Tracks which course a student is studying and payment status | `student_id`, `course_id` |
| `payments` | Records orders initiated through Razorpay checkout | `student_id`, `course_id` |
| `topics` | Represents chapters or units within a course | `course_id` $\rightarrow$ `courses(id)` |
| `materials` | Stores study resources (PDF notes, videos) per topic | `topic_id` $\rightarrow$ `topics(id)` |
| `quizzes` | Adaptive quizzes linked to course topics | `topic_id` $\rightarrow$ `topics(id)` |
| `questions` | Quiz questions tagged with difficulty tiers (`EASY`, `MEDIUM`, `HARD`) | `quiz_id` $\rightarrow$ `quizzes(id)` |
| `quiz_attempts`| Summarizes student quiz results | `student_id`, `quiz_id` |
| `question_responses` | Granular question-level tracking for adaptive feedback | `attempt_id`, `question_id`, `student_id` |
| `progress` | Tracks student's `skill_score` per topic | `student_id`, `topic_id` |
| `study_plans` | Persists generated study routines | `student_id` $\rightarrow$ `users(id)` |
| `spaced_repetition` | Tracks intervals and factors for card reviews | `student_id`, `material_id` |
| `achievements` | Badges system configs (XP limits, streak values) | *Primary key: UUID* |
| `user_achievements` | Unlocked achievements mapping | `student_id`, `achievement_id` |
| `notifications` | Feeds internal user notification panels | `user_id` $\rightarrow$ `users(id)` |
| `ta_applications` | Manages TA application submissions and teacher approvals | `ta_id`, `course_id`, `reviewed_by` |
| `course_tas` | Links approved TAs to their assigned courses | `ta_id`, `course_id` |
| `ta_requests` | Tracks student doubt requests, virtual meeting links, and schedules | `student_id`, `ta_id`, `course_id` |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **PostgreSQL** (v14 or higher)

### Database Setup
1. Open your PostgreSQL CLI or dashboard client (e.g., pgAdmin, DBeaver) and create a database named `personalized_learning_platform`.
2. Load the structural definition:
   ```bash
   psql -U your_pg_username -d personalized_learning_platform -f database/schema.sql
   ```
3. Load initial configuration and test seeds:
   ```bash
   psql -U your_pg_username -d personalized_learning_platform -f database/seeds.sql
   ```

### Backend Setup
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Duplicate the template environment file:
   ```bash
   cp .env.example .env
   ```
4. Edit the configuration in `.env` to match your Postgres, Razorpay, and SMTP server credentials:
   ```env
   PORT=5000
   DATABASE_URL=postgresql://your_pg_username:your_pg_password@localhost:5432/personalized_learning_platform
   JWT_SECRET=your_secret_key
   # SMTP configs...
   ```
5. Run the API server in development mode (with nodemon):
   ```bash
   npm run dev
   ```
   *The backend will launch at [http://localhost:5000](http://localhost:5000).*

### Frontend Setup
1. Navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Boot the development bundler:
   ```bash
   npm run dev
   ```
   *The client app will launch at [http://localhost:5173](http://localhost:5173).*

---

## 🕒 Background Services

The server fires a lightweight background scheduler upon startup. This simulates standard cron patterns to automate recurring events:
- **Spaced Repetition Alerts Check**: Automatically queries database profiles daily. It looks for users with pending review items (`next_review_date <= today`) and emails them reminders detailing the count of items requiring attention.
- **Streak Protection Warnings Scan**: Queries active users whose last login was yesterday. If they haven't logged in today, it shoots a reminder email alerting them that their streak is about to reset.
- **Interval**: Runs automatically 5 seconds after startup and repeats every **12 hours** while the server runs.
