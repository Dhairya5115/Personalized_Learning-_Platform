-- Initial badges/achievements
INSERT INTO achievements (title, description, condition_type, condition_value) VALUES
('First Milestone', 'Earn a total of 100 XP points.', 'XP', 100),
('Super Scholar', 'Earn a total of 500 XP points.', 'XP', 500),
('Consistency Champion', 'Maintain a 3-day learning streak.', 'STREAK', 3),
('Devoted Disciple', 'Maintain a 7-day learning streak.', 'STREAK', 7),
('Perfect Quiz', 'Achieve a score of 100% on any quiz.', 'QUIZ_PERFECT', 100);

-- Demo TA User (Password: Password123!)
INSERT INTO users (id, email, password_hash, first_name, last_name, role)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-111122223333',
    'ta.demo@learningplatform.com',
    '$2a$12$y.ZJ90pTjG62iR9Bv1t1e.jRkUv0rZ/Q/Jv00u1v2w3x4y5z6a7b8',
    'Alex',
    'Taylor',
    'TA'
) ON CONFLICT (email) DO NOTHING;

-- Sample Course TA Assignment, Pending Application & Pending Request
-- Note: Replace or reference existing course_id / student_id dynamically when running seeds
DO $$
DECLARE
    v_ta_id UUID;
    v_course_id UUID;
    v_student_id UUID;
    v_teacher_id UUID;
BEGIN
    SELECT id INTO v_ta_id FROM users WHERE email = 'ta.demo@learningplatform.com';
    SELECT id INTO v_course_id FROM courses LIMIT 1;
    SELECT id INTO v_student_id FROM users WHERE role = 'STUDENT' LIMIT 1;
    SELECT id INTO v_teacher_id FROM users WHERE role = 'TEACHER' LIMIT 1;

    IF v_ta_id IS NOT NULL AND v_course_id IS NOT NULL THEN
        -- Seed approved course assignment
        INSERT INTO course_tas (ta_id, course_id)
        VALUES (v_ta_id, v_course_id)
        ON CONFLICT (ta_id, course_id) DO NOTHING;

        -- Seed pending TA application
        INSERT INTO ta_applications (ta_id, course_id, motivation, experience, resume_link, status)
        VALUES (
            v_ta_id,
            v_course_id,
            'Passionate about helping students master computer science concepts.',
            '2 years experience as undergrad peer tutor.',
            'https://example.com/resume-alex-taylor.pdf',
            'PENDING'
        )
        ON CONFLICT DO NOTHING;

        -- Seed pending TA doubt request
        IF v_student_id IS NOT NULL THEN
            INSERT INTO ta_requests (student_id, ta_id, course_id, subject, description, status)
            VALUES (
                v_student_id,
                v_ta_id,
                v_course_id,
                'Recursion and Dynamic Programming',
                'I am struggling with state transitions in the memoization table.',
                'PENDING'
            );
        END IF;
    END IF;
END $$;
