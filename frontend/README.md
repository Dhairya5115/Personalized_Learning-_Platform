# Personalized Learning Platform — Frontend

[![React](https://img.shields.io/badge/React-v19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-v8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Lucide](https://img.shields.io/badge/Lucide_React-v1-F56565?logo=lucide&logoColor=white)](https://lucide.dev/)

The frontend client for the **Personalized Learning Platform**. Built with **React 19**, **Vite 8**, and **Tailwind CSS v3**, it delivers a modern, responsive, dark-mode enabled dashboard for students and instructors.

---

## 📖 Table of Contents

- [Features](#-features)
- [Tech Stack & Libraries](#-tech-stack--libraries)
- [Directory Structure](#-directory-structure)
- [Core Architecture & State Management](#-core-architecture--state-management)
  - [Context Providers](#1-context-providers)
  - [API Service Layer](#2-api-service-layer)
- [Page & View Breakdown](#-page--view-breakdown)
  - [Student Experience](#student-experience)
  - [Teacher / Instructor Tools](#teacher--instructor-tools)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation & Running](#installation--running)
  - [Environment Configuration](#environment-configuration)
- [Build & Lint Scripts](#-build--lint-scripts)

---

## 🌟 Features

- 🌓 **Dynamic Light / Dark Mode**: Custom theme engine supporting seamless dark/light toggle using Tailwind CSS.
- 🔐 **JWT Authentication & Role Control**: State-managed Auth Context maintaining session tokens, user roles (`student` / `teacher`), streaks, and XP points.
- 🎯 **Interactive Adaptive Quiz Runner**: Dynamic test taker supporting LaTeX math formulas (`KaTeX`), automated question tier selection (`EASY`, `MEDIUM`, `HARD`), instant scoring feedback, and XP rewards.
- 📅 **7-Day Personalized Study Planner**: Generated customized daily study blocks based on topic weakness scores, exam target dates, and spaced repetition urgencies.
- 🗂️ **Spaced Repetition Flashcard Engine**: SuperMemo-2 (SM-2) interface for card rating ($0$ to $5$) and interval calculation.
- 🤖 **AI Doubt Solver**: Context-aware AI tutoring window linked to specific courses or topics for real-time question resolution.
- 💳 **Razorpay Checkout Integration**: In-app payment modal for purchasing premium courses and digital study materials.
- 📊 **Analytics & Leaderboard**: Visual progress charts, topic mastery gauges, global user rankings, and teacher progress tracking tools.

---

## 🛠️ Tech Stack & Libraries

| Dependency | Purpose |
| :--- | :--- |
| **React 19** | Modern component-driven user interface framework |
| **Vite 8** | High-performance build tool and hot-reloading dev server |
| **Tailwind CSS v3** | Utility-first CSS styling framework with Dark Mode support |
| **Lucide React** | Modern vector icon library |
| **KaTeX** | Fast math typesetting library for rendering mathematical equations |
| **Axios** | Promise-based HTTP client for API communications |
| **Oxlint** | High-speed JavaScript/JSX linter |

---

## 📁 Directory Structure

```text
frontend/
├── public/                     # Static public assets
├── src/
│   ├── assets/                 # SVGs, images, and logos
│   ├── components/             # Reusable UI components
│   │   ├── Loader.jsx          # Animated full-page loader & splash view
│   │   └── Sidebar.jsx         # Responsive sidebar navigation with theme toggle
│   ├── context/                # React Context Providers
│   │   ├── AuthContext.jsx     # Session, JWT token, user roles, and login/logout state
│   │   └── ThemeContext.jsx    # Dark/light mode state management
│   ├── pages/                  # Main page views
│   │   ├── Analytics.jsx       # Student performance reports & topic mastery
│   │   ├── CoursesList.jsx     # Course catalog & enrollment cards
│   │   ├── CourseView.jsx      # Topic outline, notes viewer, & material management
│   │   ├── Dashboard.jsx       # Student home hub with streak, XP, & plan shortcuts
│   │   ├── DoubtSolver.jsx     # AI context-aware tutoring assistant
│   │   ├── Leaderboard.jsx     # Global XP rankings & achievement badges
│   │   ├── Login.jsx           # User authentication & registration forms
│   │   ├── QuizView.jsx        # Adaptive dynamic quiz execution component
│   │   ├── SpacedRepetition.jsx# SM-2 flashcard recall review interface
│   │   ├── StudentProgressTracker.jsx # Teacher dashboard for student metrics
│   │   └── StudyPlanner.jsx    # Custom 7-day schedule generator
│   ├── services/
│   │   └── api.js              # Centralized API service layer (Fetch/Axios endpoints)
│   ├── App.css                 # Global custom styling rules
│   ├── App.jsx                 # Main layout shell, tab routing & toast notification system
│   ├── index.css               # Tailwind CSS imports & base styles
│   └── main.jsx                # React root bootstrapper
├── package.json                # Frontend dependencies & scripts
├── tailwind.config.js          # Tailwind customization (colors, fonts, animations)
└── vite.config.js              # Vite bundler options
```

---

## 🏗️ Core Architecture & State Management

### 1. Context Providers
The app wraps the component tree in two primary providers defined in `App.jsx`:
- **`AuthProvider`** (`src/context/AuthContext.jsx`):
  - Manages JWT token storage in `localStorage`.
  - Attaches current user object (`id`, `firstName`, `lastName`, `role`, `xpPoints`, `streakDays`).
  - Exposes `login()`, `register()`, and `logout()` helpers across the app.
- **`ThemeProvider`** (`src/context/ThemeContext.jsx`):
  - Controls theme toggle state (`light` vs. `dark`).
  - Syncs the `dark` class on the root HTML element.

### 2. API Service Layer
All network communications with the Express backend pass through `src/services/api.js`:
- Automatically injects `Authorization: Bearer <token>` HTTP headers.
- Intercepts `401 Unauthorized` / `403 Forbidden` responses to clear invalid sessions and redirect to `/login`.
- Encapsulates modular API methods for Authentication, Courses, Topics, Materials, Payments (Razorpay), Adaptive Quizzes, Study Planner, SRS Flashcards, AI Doubt Solver, and Analytics.

---

## 🖥️ Page & View Breakdown

### Student Experience
1. **Dashboard** (`Dashboard.jsx`): Displays welcome greetings, active daily streaks, XP totals, enrolled courses, upcoming revision cards, and active study plans.
2. **Course Catalog & View** (`CoursesList.jsx` & `CourseView.jsx`): Allows students to browse available courses, purchase/enroll, read Markdown/LaTeX material notes, view video lessons, and mark materials as completed.
3. **Adaptive Quiz View** (`QuizView.jsx`): Fetches dynamic questions tailored to student skill scores, evaluates answers live, awards XP, and tracks progress per topic.
4. **Study Planner** (`StudyPlanner.jsx`): Generates a 7-day personalized study agenda using topic weakness and exam deadline parameters.
5. **Spaced Repetition (SRS)** (`SpacedRepetition.jsx`): Facilitates flashcard review queues using SuperMemo-2 quality ratings ($0-5$).
6. **AI Doubt Solver** (`DoubtSolver.jsx`): Interactive chat interface for resolving doubts related to courses or topics.
7. **Leaderboard & Badges** (`Leaderboard.jsx`): Ranks students by XP and showcases unlocked achievements.
8. **Personal Analytics** (`Analytics.jsx`): Visual overview of quiz performance, completion rates, and subject proficiency.

### Teacher / Instructor Tools
- **Course & Material Management**: Create new courses, upload digital materials, configure prices, add topics, and delete materials directly from `CoursesList.jsx` and `CourseView.jsx`.
- **Quiz Creator & Generator**: Build custom quizzes or trigger AI-assisted quiz generation for course topics.
- **Student Progress Tracker** (`StudentProgressTracker.jsx`): Monitor enrolled students, track topic completion rates, and review quiz performance across all offered courses.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)

### Installation & Running

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install node dependencies**:
   ```bash
   npm install
   ```

3. **Start the local Vite development server**:
   ```bash
   npm run dev
   ```
   *The application will start at `http://localhost:5173`.*

---

## 📜 Build & Lint Scripts

Inside `package.json`, the following scripts are available:

| Command | Action |
| :--- | :--- |
| `npm run dev` | Launches Vite hot-reloading development server |
| `npm run build` | Compiles optimized static production assets into `dist/` |
| `npm run preview` | Starts a local web server to preview production build |
| `npm run lint` | Runs `oxlint` to analyze code quality and syntax errors |
