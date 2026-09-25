# TailorLearn — Sequence Diagrams

This document provides sequence diagrams tracing the key business flows across frontend components, HTTP API routes, controllers/engines, third-party services, and the PostgreSQL database.

---

## 1. TA Application Submission, Teacher Review & Access Revocation

This diagram illustrates a Teaching Assistant applying for a course, the teacher reviewing pending applications, and the immediate revocation of course access when a TA is removed or rejected.

```mermaid
sequenceDiagram
    autonumber
    actor TA as Teaching Assistant
    participant UI_TA as TaPages (TaCourseCatalog)
    participant API as Express Router (/api/ta)
    participant TACtrl as ta_controller.js
    participant DB as PostgreSQL
    participant Email as email_service.js
    actor Teacher as Course Instructor
    participant UI_Tch as TaPages (TeacherTaReview)

    %% Step 1: TA Applies
    TA->>UI_TA: Fills qualification & motivation form
    UI_TA->>API: POST /api/ta/apply {courseId, fullName, contact, qualification, motivation, experience, resumeLink}
    API->>TACtrl: applyForCourse(req, res)
    TACtrl->>DB: SELECT id, status FROM ta_applications WHERE ta_id = $1 AND course_id = $2 AND status IN ('PENDING', 'APPROVED')
    alt Active Application Exists
        DB-->>TACtrl: Return row
        TACtrl-->>API: 409 Conflict (Application already active)
        API-->>UI_TA: Display error toast
    else No Active Application
        DB-->>TACtrl: Empty
        TACtrl->>DB: INSERT INTO ta_applications (..., status) VALUES (..., 'PENDING') RETURNING *
        DB-->>TACtrl: Created application row
        TACtrl-->>API: 201 Created {success: true, application}
        API-->>UI_TA: Render "Pending" badge
    end

    %% Step 2: Teacher Reviews
    Teacher->>UI_Tch: Navigates to TA Review dashboard
    UI_Tch->>API: GET /api/ta/teacher/applications
    API->>TACtrl: getTeacherPendingApplications(req, res)
    TACtrl->>DB: SELECT a.*, c.title, u.first_name, u.last_name, u.email FROM ta_applications a ... WHERE c.teacher_id = $1
    DB-->>TACtrl: Application records
    TACtrl-->>API: 200 OK [applications]
    API-->>UI_Tch: Display applicant cards

    %% Step 3: Teacher Decision (Approve or Reject or Remove)
    alt Teacher Approves
        Teacher->>UI_Tch: Clicks "Approve"
        UI_Tch->>API: PUT /api/ta/applications/:id/review {status: 'APPROVED'}
        API->>TACtrl: reviewApplication(req, res)
        TACtrl->>DB: UPDATE ta_applications SET status = 'APPROVED', reviewed_at = NOW(), reviewed_by = $2 WHERE id = $3
        TACtrl->>DB: INSERT INTO course_tas (ta_id, course_id) VALUES ($1, $2) ON CONFLICT DO NOTHING
        TACtrl->>DB: INSERT INTO notifications (user_id, title, message) VALUES (ta_id, 'TA Application Approved 🎉', ...)
        TACtrl->>Email: sendTaApplicationDecision(taEmail, taName, courseTitle, 'APPROVED')
        Email-->>TA: Sends approval email notification
        TACtrl-->>API: 200 OK {success: true}
        API-->>UI_Tch: Updates badge to "Approved"
    else Teacher Removes / Revokes Access
        Teacher->>UI_Tch: Clicks "Remove TA"
        UI_Tch->>API: PUT /api/ta/applications/:id/review {status: 'REMOVED'}
        API->>TACtrl: reviewApplication(req, res)
        TACtrl->>DB: UPDATE ta_applications SET status = 'REMOVED', reviewed_at = NOW(), reviewed_by = $2 WHERE id = $3
        Note over TACtrl,DB: Direct Access Revocation via DELETE
        TACtrl->>DB: DELETE FROM course_tas WHERE ta_id = $1 AND course_id = $2
        TACtrl->>DB: INSERT INTO notifications (user_id, title, message) VALUES (ta_id, 'TA Access Removed', ...)
        TACtrl->>Email: sendTaApplicationDecision(taEmail, taName, courseTitle, 'REMOVED')
        Email-->>TA: Sends revocation notice
        TACtrl-->>API: 200 OK {success: true}
        API-->>UI_Tch: Updates status & removes from Active TAs
    end
```

---

## 2. Student Taking a Quiz & Submitting Attempt

This diagram details question delivery, the inactive-quiz gate, atomic score evaluation, dynamic topic progress recalculation via PostgreSQL CTE, user XP/streak awards, and running average calculation.

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant UI as QuizView.jsx
    participant API as Express Router (/api/quizzes)
    participant QCtrl as quiz_controller.js
    participant QEngine as quiz_engine.js
    participant PEngine as progress_engine.js
    participant DB as PostgreSQL

    %% Step 1: Open Quiz & Check Active Status
    Student->>UI: Selects Quiz to attempt
    UI->>API: GET /api/quizzes/:quizId
    API->>QCtrl: getQuizById(req, res)
    QCtrl->>DB: SELECT q.*, t.title, c.title FROM quizzes q ... WHERE q.id = $1
    DB-->>QCtrl: Quiz row (including is_active)
    QCtrl-->>API: 200 OK {quiz}
    API-->>UI: Render quiz details

    %% Step 2: Fetch Next Adaptive Question
    UI->>API: GET /api/quizzes/:quizId/next?excludeIds=...
    API->>QCtrl: getNextAdaptiveQuestion(req, res)
    QCtrl->>DB: SELECT topic_id, is_active FROM quizzes WHERE id = $1
    alt Quiz is Inactive (is_active == false)
        QCtrl-->>API: 403 Forbidden ("This practice quiz is currently inactive.")
        API-->>UI: Show inactive alert and block quiz session
    else Quiz is Active
        QCtrl->>QEngine: getNextQuestion(studentId, quizId, topicId, excludeIds)
        QEngine->>DB: SELECT id, content, options, difficulty FROM questions WHERE quiz_id = $1 AND NOT (id = ANY($2)) ORDER BY RANDOM() LIMIT 1
        DB-->>QEngine: Question record
        QEngine-->>QCtrl: Question object
        QCtrl-->>API: 200 OK {question}
        API-->>UI: Render question & choices
    end

    %% Step 3: Submit Completed Quiz
    Student->>UI: Selects final answer & clicks "Submit Quiz"
    UI->>API: POST /api/quizzes/submit {quizId, responses: [{questionId, selectedOptionId}]}
    API->>QCtrl: submitQuiz(req, res)
    QCtrl->>DB: SELECT topic_id, is_active FROM quizzes WHERE id = $1
    alt Inactive Gate Check
        Note over QCtrl: Returns 403 if is_active === false
    else Quiz Active
        QCtrl->>QEngine: processQuizSubmission(studentId, quizId, topicId, responses)
        
        %% Transaction begins
        QEngine->>DB: BEGIN
        QEngine->>DB: SELECT id, correct_option_id, difficulty, content, options FROM questions WHERE id = ANY($1)
        DB-->>QEngine: Question definitions map
        Note over QEngine: Batch evaluates correctCount and scorePercentage in memory
        
        QEngine->>DB: INSERT INTO quiz_attempts (student_id, quiz_id, score) VALUES ($1, $2, $3) RETURNING id
        DB-->>QEngine: attemptId
        
        QEngine->>DB: INSERT INTO question_responses (attempt_id, question_id, student_id, is_correct, selected_option_id) VALUES (...) [Batch Insert]
        
        %% Topic Progress Recalculation
        QEngine->>PEngine: recalculateProgress(studentId, topicId, dbClient)
        PEngine->>DB: WITH stats AS (...) INSERT INTO progress (...) ON CONFLICT DO UPDATE RETURNING completion_percentage
        DB-->>PEngine: Updated completion_percentage
        
        %% Gamification
        QEngine->>DB: SELECT xp_points, streak_count, last_active_date FROM users WHERE id = $1
        DB-->>QEngine: User profile
        Note over QEngine: Calculates new XP (base 10 + 2*correct) and streak
        QEngine->>DB: UPDATE users SET xp_points = $1, streak_count = $2, last_active_date = $3 WHERE id = $4
        
        %% Running Average Calculation
        QEngine->>DB: SELECT ROUND(AVG(score))::integer AS average_score, COUNT(id)::integer AS attempts_count FROM quiz_attempts WHERE student_id = $1 AND quiz_id = $2
        DB-->>QEngine: {average_score, attempts_count}
        
        QEngine->>DB: COMMIT
        QEngine-->>QCtrl: Results payload
        QCtrl-->>API: 200 OK {success: true, results}
        API-->>UI: Render score summary, running average, XP gained, and question breakdown
    end
```

---

## 3. Human TA Doubt Session Flow (Blank-Screen Fix, Scheduling & Link Cleanup)

This diagram documents student TA discovery, doubt submission, TA scheduling with `.ics` calendar invitation, and meeting resolution which removes the meeting link on both dashboards.

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant UI_Std as DoubtSolver.jsx (HUMAN mode)
    participant API as Express Router (/api/ta)
    participant TACtrl as ta_controller.js
    participant DB as PostgreSQL
    participant Email as email_service.js
    actor TA as Assigned TA
    participant UI_TA as TaPages.jsx (TaPendingRequests)

    %% Step 1: Safe Data Fetching (Blank-Screen Bug Fix)
    Student->>UI_Std: Switches toggle to "Human TA"
    UI_Std->>API: Promise.all([ getAvailableTasForStudent(), getStudentTaRequests() ])
    API->>TACtrl: getAvailableTasForStudent & getStudentRequests
    TACtrl->>DB: Query enrolled course TAs and student's doubt records
    DB-->>TACtrl: Result sets
    TACtrl-->>API: JSON responses
    API-->>UI_Std: [tas, requests]
    Note over UI_Std: Bug Fix Guard: Array.isArray() validation<br/>prevents blank screen crash on malformed payloads

    %% Step 2: Student Submits Doubt
    Student->>UI_Std: Fills doubt form (TA, subject, description)
    UI_Std->>API: POST /api/ta/request {taId, courseId, subject, description}
    API->>TACtrl: createDoubtRequest(req, res)
    TACtrl->>DB: SELECT ct.id, ... FROM course_tas ct JOIN enrollments e ... WHERE ct.ta_id = $1 AND ct.course_id = $2 AND e.student_id = $3
    DB-->>TACtrl: Validated enrollment & assignment row
    TACtrl->>DB: INSERT INTO ta_requests (..., status) VALUES (..., 'PENDING') RETURNING *
    TACtrl->>DB: INSERT INTO notifications (ta_id, 'New Doubt Request 💡', ...)
    TACtrl->>Email: sendNewDoubtRequestToTa(taEmail, taName, studentName, courseTitle, subject, desc)
    Email-->>TA: Notification email received
    TACtrl-->>API: 201 Created {success: true, request}
    API-->>UI_Std: Render new request with "PENDING" status chip

    %% Step 3: TA Schedules Virtual Session
    TA->>UI_TA: Opens Pending Doubt Requests
    UI_TA->>API: GET /api/ta/requests
    API->>TACtrl: getTaRequests(req, res)
    TACtrl->>DB: SELECT r.*, c.title, u.email ... FROM ta_requests r WHERE r.ta_id = $1
    DB-->>TACtrl: Doubt records
    TACtrl-->>API: 200 OK [requests]
    API-->>UI_TA: Render incoming request card
    TA->>UI_TA: Enters Google Meet URL and selects datetime
    UI_TA->>API: POST /api/ta/requests/:id/schedule {meetingLink, scheduledAt}
    API->>TACtrl: scheduleDoubtRequest(req, res)
    TACtrl->>DB: UPDATE ta_requests SET meeting_link = $1, scheduled_at = $2, status = 'SCHEDULED' WHERE id = $3 RETURNING *
    TACtrl->>DB: INSERT INTO notifications (student_id, 'Doubt Session Scheduled 📅', ...)
    TACtrl->>Email: sendDoubtScheduledToStudent(..., meetingLink, scheduledAt) [with ics calendar invite]
    Email-->>Student: Calendar invite with meeting link
    TACtrl-->>API: 200 OK {success: true, request}
    API-->>UI_TA: Display "SCHEDULED" state and clickable meeting link

    %% Step 4: Both Sides Display Meeting Link
    Note over UI_Std,UI_TA: Conditional render in both components:<br/>req.meeting_link && req.status === 'SCHEDULED'

    %% Step 5: Session Resolved & Link Removal
    TA->>UI_TA: Clicks "Mark Resolved" after session
    UI_TA->>API: PUT /api/ta/requests/:id/status {status: 'RESOLVED'}
    API->>TACtrl: updateRequestStatus(req, res)
    TACtrl->>DB: UPDATE ta_requests SET status = 'RESOLVED' WHERE id = $2 RETURNING *
    TACtrl-->>API: 200 OK {success: true, request}
    API-->>UI_TA: Status changes to RESOLVED
    Note over UI_Std,UI_TA: Link Removal: Since status is no longer 'SCHEDULED',<br/>meeting link is automatically removed on both Student and TA screens
```

---

## 4. Student Asking AI Tutor a Question (Contextual Prompt & Semantic Cache)

This diagram details the AI Tutor flow: cache lookup using `${courseId}:${topicId}:${query}`, LLM fallback via OpenRouter/OpenAI, and client-side KaTeX LaTeX and markdown parsing.

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant UI as DoubtSolver.jsx (AI Mode)
    participant API as Express Router (/api/ai)
    participant AICtrl as ai_controller.js
    participant DB as PostgreSQL (ai_query_cache)
    participant LLM as OpenRouter / OpenAI API

    Student->>UI: Types question and clicks "Send"
    Note over UI: Optimistically appends user message to state
    UI->>API: POST /api/ai/solve-doubt {query, courseId, topicId}
    API->>AICtrl: solveDoubt(req, res)
    Note over AICtrl: Constructs cacheKey = `${courseId}:${topicId}:${cleanQuery}`

    %% Step 1: Semantic Cache Check
    AICtrl->>DB: SELECT answer_text FROM ai_query_cache WHERE LOWER(TRIM(query_text)) = $1
    alt Cache Hit
        DB-->>AICtrl: Cached row {answer_text}
        AICtrl-->>API: 200 OK {success: true, source: 'cache', answer}
        API-->>UI: Returns cached answer (0ms LLM latency)
    else Cache Miss
        DB-->>AICtrl: Empty result
        %% Context Assembly
        AICtrl->>DB: SELECT t.title, t.description, c.title FROM topics t ...
        AICtrl->>DB: SELECT title, type FROM materials WHERE topic_id = $1
        DB-->>AICtrl: Context rows (materials, topic metadata)
        Note over AICtrl: Builds contextPrefix containing course, topic, and materials

        %% Call LLM
        AICtrl->>LLM: POST /v1/chat/completions {model, messages: [System + Context, User], temperature: 0.7}
        LLM-->>AICtrl: 200 OK {choices: [{message: {content: "...\n[Suggestions: S1 | S2 | S3]"}}]}

        %% Write to Cache
        AICtrl->>DB: INSERT INTO ai_query_cache (query_text, answer_text) VALUES ($1, $2) ON CONFLICT DO NOTHING
        AICtrl-->>API: 200 OK {success: true, source: 'openrouter', answer}
        API-->>UI: Deliver raw answer text
    end

    %% Client Rendering
    Note over UI: parseMarkdownToHtml(): parses display math \[...\],<br/>inline math \(...\) via KaTeX, code blocks, and markdown
    Note over UI: extractSuggestions(): extracts clickable suggestion chips
    Note over UI: Saves updated chat in tab sessionStorage: `doubt_history_${userId}_${courseId}`
    UI-->>Student: Renders formatted math response and follow-up suggestion chips
```

---

## 5. AI-Generated Quiz Creation Flow with JSON Parsing & Retry Logic

This diagram captures an instructor generating an AI practice quiz, demonstrating defensive markdown-fence stripping, JSON bracket extraction, schema validation, and automatic retry attempts.

```mermaid
sequenceDiagram
    autonumber
    actor Teacher
    participant UI as CourseView.jsx
    participant API as Express Router (/api/quizzes)
    participant QCtrl as quiz_controller.js
    participant LLM as OpenRouter / OpenAI (gpt-4o-mini)
    participant DB as PostgreSQL

    Teacher->>UI: Clicks "Generate AI Practice Quiz" on a topic
    UI->>API: POST /api/quizzes/topic/:topicId/generate-ai
    API->>QCtrl: generateAiQuiz(req, res)

    %% Step 1: Verify ownership & collect context
    QCtrl->>DB: SELECT t.title, t.description, c.title, c.teacher_id FROM topics t JOIN courses c ... WHERE t.id = $1
    DB-->>QCtrl: Topic & course records
    Note over QCtrl: Verifies teacher owns course (teacher_id === req.user.id)
    QCtrl->>DB: SELECT title, type FROM materials WHERE topic_id = $1
    DB-->>QCtrl: Materials list

    %% Step 2: Retry Loop (up to 3 attempts)
    loop Up to 3 Generation Attempts (MAX_ATTEMPTS = 3)
        QCtrl->>LLM: POST /chat/completions {model, messages, response_format: {type: 'json_object'}, temperature: 0.6}
        alt Network / HTTP Failure
            LLM-->>QCtrl: 5xx Error or Timeout
            Note over QCtrl: Catches error, waits 600ms, increments attempt
        else Successful HTTP Response
            LLM-->>QCtrl: 200 OK {choices: [{message: {content: rawString}}]}
            
            %% Defensive extraction
            Note over QCtrl: extractJsonFromLlmOutput(rawString):<br/>1. Strips ```json fences<br/>2. Locates outermost braces { ... }<br/>3. Removes trailing commas before } or ]
            
            Note over QCtrl: JSON.parse(cleanedJsonStr)
            alt JSON.parse Throws SyntaxError
                Note over QCtrl: Logs parse error, waits 600ms, retries
            else JSON Parse Succeeds
                Note over QCtrl: validateQuizSchema(parsed):<br/>Verifies questions array, content, >=2 options, valid correctOptionId
                alt Schema Validation Fails
                    Note over QCtrl: Logs schema error, retries
                else Valid Schema
                    Note over QCtrl: Breaks out of retry loop (Success)
                end
            end
        end
    end

    %% Step 3: Transactional Persistence
    alt All Attempts Exhausted
        QCtrl-->>API: 500 Internal Server Error ("AI generated invalid JSON output format")
        API-->>UI: Show retry toast error
    else Quiz Data Valid
        QCtrl->>DB: BEGIN
        QCtrl->>DB: INSERT INTO quizzes (topic_id, title, passing_score) VALUES ($1, $2, $3) RETURNING *
        DB-->>QCtrl: createdQuiz row
        QCtrl->>DB: INSERT INTO questions (quiz_id, content, options, correct_option_id, difficulty) VALUES ($1, $2, ...), (...) [Batch]
        DB-->>QCtrl: Inserted questions
        QCtrl->>DB: COMMIT
        QCtrl-->>API: 201 Created {success: true, quiz, questionsCount}
        API-->>UI: Updates course topics with new active practice quiz
    end
```

---

## 6. Login Flow & Per-Tab SessionStorage Isolation (Multi-Tab Auth Fix)

This diagram illustrates the authentication flow that resolved multi-tab interference, highlighting tab-scoped `sessionStorage`, background profile verification, mutex-protected silent refresh on 401, and tab-focus rehydration.

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Tab A: Student)
    participant UI_A as Browser Tab A (Student)
    participant Ctx_A as AuthContext (Tab A)
    participant API_Client as api.js (Tab-Scoped Client)
    participant Server as Express Backend (/api/auth)
    participant DB as PostgreSQL (users)
    participant UI_B as Browser Tab B (Teacher)

    %% Step 1: Login in Tab A
    User->>UI_A: Enters student credentials
    UI_A->>Ctx_A: login(email, password)
    Ctx_A->>API_Client: api.login(email, password)
    API_Client->>Server: POST /api/auth/login {email, password}
    Server->>DB: SELECT * FROM users WHERE email = $1
    DB-->>Server: User record (role='STUDENT', password_hash)
    Note over Server: bcrypt.compare() passes; signs JWT with role='STUDENT'
    Server-->>API_Client: 200 OK {token, user: {id, role: 'STUDENT', ...}}
    
    %% Step 2: Tab Isolation Storage
    Note over Ctx_A,API_Client: Stored strictly in sessionStorage (NOT localStorage or shared cookies):<br/>sessionStorage.setItem('token', token)<br/>sessionStorage.setItem('user', JSON.stringify(user))
    Ctx_A-->>UI_A: Updates user state -> Navigates to Student Dashboard

    %% Step 3: Independent Session in Tab B
    Note over UI_B: In Tab B, user logs in as Teacher.<br/>Tab B writes its own teacher JWT to Tab B's sessionStorage.<br/>Tab A's sessionStorage is completely isolated and unaffected!

    %% Step 4: Tab Focus Rehydration
    User->>UI_A: Returns to Tab A (focus / visibilitychange)
    Note over Ctx_A: visibilitychange / focus event fired:<br/>Reads Tab A's sessionStorage;<br/>Detects no mismatch; maintains Student session without flicker

    %% Step 5: Silent Token Refresh (Per-Tab Mutex)
    UI_A->>API_Client: apiCall('/courses/enrolled')
    API_Client->>Server: GET /api/courses/enrolled (Authorization: Bearer <expiredToken>)
    Server-->>API_Client: 401 Unauthorized
    Note over API_Client: apiCall intercepts 401; acquires isRefreshing mutex
    API_Client->>Server: POST /api/auth/refresh {token: currentToken}
    Server->>DB: SELECT id, role FROM users WHERE id = decoded.id
    DB-->>Server: Valid user
    Server-->>API_Client: 200 OK {token: newToken, user}
    Note over API_Client: sessionStorage.setItem('token', newToken);<br/>Replays queued requests with newToken
    API_Client->>Server: GET /api/courses/enrolled (Authorization: Bearer <newToken>)
    Server-->>API_Client: 200 OK [enrolledCourses]
    API_Client-->>UI_A: Displays enrolled courses smoothly
```
