-- TailorLearn Migration: Normalize Topic Priorities
-- Normalizes existing courses' priorities (sequence_order) to contiguous 1..N per course.
-- Topics are ordered by sequence_order ASC, using created_at ASC and id ASC as tiebreakers.

BEGIN;

WITH ranked_topics AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY course_id 
            ORDER BY sequence_order ASC, created_at ASC, id ASC
        ) AS new_priority
    FROM topics
)
UPDATE topics t
SET sequence_order = rt.new_priority
FROM ranked_topics rt
WHERE t.id = rt.id AND t.sequence_order != rt.new_priority;

-- Ensure composite index exists for optimal lookups and sorting
CREATE INDEX IF NOT EXISTS idx_topics_course_seq ON topics(course_id, sequence_order);

COMMIT;

