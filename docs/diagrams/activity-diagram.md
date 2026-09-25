# TailorLearn — Activity Diagrams (System-Level)

This document provides system-level UML activity diagrams represented using Mermaid `flowchart` notation with decision diamonds. It documents user authentication and role routing, the prospective TA lifecycle, the student learning loop, and the teacher course management loop.

---

## 1. Authentication & Role-Based Routing Activity Flow

This diagram illustrates user registration and login, credential authentication, tab-scoped `sessionStorage` token isolation, and role-based interface dispatching.

```mermaid
flowchart TD
    Start([User Arrives at Platform]) --> CheckSession{Token & User in<br/>tab sessionStorage?}
    
    CheckSession -->|Yes| VerifyToken[Verify Token via GET /api/auth/profile]
    VerifyToken --> TokenValid{Token Valid?}
    TokenValid -->|Yes| RouteRole
    TokenValid -->|No / 401| TryRefresh{Can Silent Refresh<br/>via /api/auth/refresh?}
    TryRefresh -->|Success| SaveNewToken[Update sessionStorage with refreshed token] --> RouteRole
    TryRefresh -->|Failure| ClearStorage[Clear sessionStorage] --> ShowAuthForm[Render Login / Register Form]

    CheckSession -->|No| ShowAuthForm
    
    ShowAuthForm --> AuthChoice{Action?}
    AuthChoice -->|Register| SubmitReg[Submit email, password, name, and role]
    SubmitReg --> HashPw[Backend hashes password with bcrypt & saves user]
    HashPw --> GenJWT[Generate signed JWT with user role]
    
    AuthChoice -->|Login| SubmitLogin[Submit email and password]
    SubmitLogin --> VerifyCreds{Valid bcrypt credentials?}
    VerifyCreds -->|No| ShowError[Display authentication error message] --> ShowAuthForm
    VerifyCreds -->|Yes| GenJWT

    GenJWT --> StoreTabSession[Store token & user profile in tab sessionStorage]
    StoreTabSession --> RouteRole{User Role?}

    RouteRole -->|STUDENT| NavStudent[Route to /dashboard<br/>• Enrolled Courses<br/>• Study Planner<br/>• Doubt Solver<br/>• Leaderboard & XP]
    RouteRole -->|TEACHER| NavTeacher[Route to /dashboard & /courses<br/>• Course Management<br/>• TA Review Portal<br/>• Student Progress Tracker<br/>• AI Quiz Generator]
    RouteRole -->|TA| NavTA[Route to /dashboard & /ta-catalog<br/>• Available Course Catalog<br/>• Submitted Applications<br/>• Assigned Students<br/>• Doubt Request Management]
    RouteRole -->|ADMIN| NavAdmin[System-wide oversight & all-role permissions]

    NavStudent --> End([Active Session])
    NavTeacher --> End
    NavTA --> End
    NavAdmin --> End
```

---

## 2. TA Lifecycle Activity Flow (Apply, Review, Access & Removal)

This diagram tracks the lifecycle of a Teaching Assistant: browsing courses, submitting credentials, instructor review (Approved/Rejected), course and student data access, and eventual removal/access revocation.

```mermaid
flowchart TD
    Start([TA Logs In]) --> BrowseCatalog[Browse Available Courses at /ta-catalog]
    BrowseCatalog --> SelectCourse[Select Course to assist]
    SelectCourse --> CheckExisting{Active application exists<br/>in ta_applications?}

    CheckExisting -->|Yes: PENDING or APPROVED| BlockSubmit[Block submission with HTTP 409 Conflict]
    BlockSubmit --> ViewStatus[View pending card at /ta-applications]

    CheckExisting -->|No| OpenForm[Open TA Application Form]
    OpenForm --> FillForm[Provide Qualifications, Motivation, Experience, Contact, Resume Link]
    FillForm --> SubmitApp[POST /api/ta/apply]
    SubmitApp --> SavePending[Save record with status='PENDING']
    SavePending --> ViewStatus

    ViewStatus --> TeacherReviews{Teacher Reviews Application at<br/>/teacher-ta-reviews}

    TeacherReviews -->|REJECT| SetRejected[Update ta_applications status='REJECTED']
    SetRejected --> NotifReject[Send in-app notification & rejection email]
    NotifReject --> EndReject([Application Terminated])

    TeacherReviews -->|APPROVE| SetApproved[Update ta_applications status='APPROVED']
    SetApproved --> InsertCourseTas[INSERT INTO course_tas ta_id, course_id]
    InsertCourseTas --> NotifApprove[Send in-app notification & approval email]
    NotifApprove --> GainedAccess[TA gains course access rights]

    GainedAccess --> TADuties[TA conducts duties:<br/>• View enrolled students at /ta-assigned<br/>• Schedule doubt sessions at /ta-requests<br/>• Attach Google Meet / Zoom link]

    TADuties --> TeacherAudit{Teacher Audit Decision}
    TeacherAudit -->|Keep Active| TADuties
    TeacherAudit -->|Remove TA| TeacherRemoves[Teacher clicks 'Remove TA']
    TeacherRemoves --> SetRemoved[Update ta_applications status='REMOVED']
    SetRemoved --> RevokeAccess[DELETE FROM course_tas WHERE ta_id=$1 AND course_id=$2]
    RevokeAccess --> NotifRemoved[Send in-app notification & removal email]
    NotifRemoved --> AccessRevoked([Course Access Immediately Terminated])
```

---

## 3. Student Core Learning Loop Activity Flow

This diagram documents a student's core interaction loop: course discovery, enrollment, curriculum review, the active/inactive quiz gate, scoring, dynamic topic progress recalculation via PostgreSQL CTE, and gamification feedback.

```mermaid
flowchart TD
    Start([Student Dashboard]) --> Browse[Browse Courses at /courses]
    Browse --> SelectCourse[Select Course Card]
    SelectCourse --> CheckEnrollment{Enrolled in Course?}
    
    CheckEnrollment -->|No| CheckPaid{Course Price > 0?}
    CheckPaid -->|Free| AutoEnroll[POST /api/courses/enroll with payment_status='FREE']
    CheckPaid -->|Paid| RazorpayFlow[Initialize Razorpay Order -> Complete Payment Verification]
    RazorpayFlow --> AutoEnroll
    AutoEnroll --> LoadCurriculum[Load Course Topics & Materials]

    CheckEnrollment -->|Yes| LoadCurriculum

    LoadCurriculum --> ActionChoice{Student Action?}
    
    ActionChoice -->|Study Materials| OpenMaterial[Open PDF or Video Material]
    OpenMaterial --> CompleteMaterial[Mark Material as Completed]
    CompleteMaterial --> DBCompMat[INSERT INTO completed_materials]
    DBCompMat --> TriggerRecalc[Recalculate Topic Progress via CTE in progress_engine]

    ActionChoice -->|Ask Doubt| DoubtSolverChoice{Solver Mode?}
    DoubtSolverChoice -->|AI Tutor| AskAI[Submit query to AI Tutor with course context]
    AskAI --> RenderAI[Render formatted LaTeX/KaTeX response & suggestions]
    DoubtSolverChoice -->|Human TA| RequestTA[Submit Doubt Request to Assigned TA]
    RequestTA --> WaitSchedule[Wait for TA to schedule meeting link]

    ActionChoice -->|Take Practice Quiz| CheckActive{Quiz is_active == true?}
    CheckActive -->|No: Inactive| QuizBlocked[Show Inactive Alert Badge<br/>HTTP 403 Forbidden] --> LoadCurriculum
    CheckActive -->|Yes: Active| StartQuiz[Start Quiz Session at /quiz/:quizId]

    StartQuiz --> AnswerQuestions[Answer Adaptive Questions in sequence]
    AnswerQuestions --> SubmitQuiz[Submit answers to /api/quizzes/submit]
    
    SubmitQuiz --> EvalQuiz[Backend evaluates answers against questions table]
    EvalQuiz --> RecordAttempt[INSERT INTO quiz_attempts and question_responses]
    RecordAttempt --> TriggerRecalc
    
    TriggerRecalc --> UpdateGamification[Update Users Table:<br/>• Award XP points: +10 base + 2*correct<br/>• Calculate active daily streak count<br/>• Unlock eligible achievements]
    
    UpdateGamification --> CalcRunningAvg[Calculate running average score from quiz_attempts]
    CalcRunningAvg --> RenderScore[Display quiz review, running average, XP gained, and unlocked badges]
    
    RenderScore --> CheckLeaderboard[View updated rank on /leaderboard]
    CheckLeaderboard --> Start
```

---

## 4. Teacher Course & Assessment Management Core Loop

This diagram models an instructor's operations: managing course topics, toggling quiz accessibility, generating AI quizzes with automated validation/retries, and monitoring student analytics with email deduplication.

```mermaid
flowchart TD
    Start([Teacher Dashboard]) --> TeacherAction{Select Action}

    %% Branch 1: Course and Topic Content Management
    TeacherAction -->|Course Content| ManageCourses[Create or Edit Courses at /courses]
    ManageCourses --> AddTopic[Add Curriculum Topics & Upload Materials]

    %% Branch 2: Quiz Management & AI Generation
    TeacherAction -->|Quiz Management| SelectTopic[Select Topic in CourseView]
    SelectTopic --> QuizAction{Quiz Action?}
    
    QuizAction -->|Toggle Active / Inactive| ClickToggle[Click Active Toggle Switch]
    ClickToggle --> PatchToggle[PATCH /api/quizzes/:id/toggle-active]
    PatchToggle --> DBToggle[UPDATE quizzes SET is_active = NOT is_active]
    DBToggle --> InstantReflect[Quiz visibility & attempt permission immediately updated for students]

    QuizAction -->|Generate AI Quiz| ClickAIGen[Click 'Generate AI Practice Quiz']
    ClickAIGen --> CallAIGenAPI[POST /api/quizzes/topic/:id/generate-ai]
    CallAIGenAPI --> FetchContext[Fetch topic description & associated study materials]
    FetchContext --> AILoop[Call LLM API with JSON format instruction]
    AILoop --> ExtractJSON[Strip markdown fences & locate outermost braces]
    ExtractJSON --> ValidateSchema{Valid Quiz Schema & >=2 options?}
    
    ValidateSchema -->|Invalid & Retries Left| WaitRetry[Wait 600ms & Retry LLM call up to 3 times] --> AILoop
    ValidateSchema -->|Failed 3 times| ShowGenError[Return 500 error toast to teacher]
    ValidateSchema -->|Valid JSON| SaveQuizDB[BEGIN transaction:<br/>1. INSERT INTO quizzes<br/>2. Batch INSERT INTO questions<br/>COMMIT]
    SaveQuizDB --> RenderNewQuiz[New practice quiz appears in topic list with Active=true]

    %% Branch 3: TA Reviews
    TeacherAction -->|Review TAs| OpenTAReviews[Open /teacher-ta-reviews]
    OpenTAReviews --> ViewPending[Inspect applicant qualifications & motivation]
    ViewPending --> ReviewDecision{Decision?}
    ReviewDecision -->|Approve| ExecApprove[Update status='APPROVED' & INSERT INTO course_tas]
    ReviewDecision -->|Reject| ExecReject[Update status='REJECTED']
    ReviewDecision -->|Remove Existing| ExecRemove[Update status='REMOVED' & DELETE FROM course_tas]

    %% Branch 4: Student Progress Tracker
    TeacherAction -->|Monitor Progress| OpenTracker[Navigate to /student-tracker]
    OpenTracker --> FetchTracker[GET /api/courses/teacher/student-progress]
    FetchTracker --> DedupEmails[Deduplicate student counts by unique email across enrollments]
    DedupEmails --> AggregateStats[Compute overall course completion %, average skill score, and quiz metrics]
    AggregateStats --> DisplayMetrics[Render interactive table with expandable topic and quiz breakdown per student]
    DisplayMetrics --> Start
```
