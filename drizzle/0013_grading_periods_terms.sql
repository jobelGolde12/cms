-- Grading periods: the school's FOUR QUARTERS become THREE TERMS.
--
-- DepEd senior-high grading runs Terms 1, 2 and 3 — there is no fourth
-- grading period. The vocabulary change is applied to the live rows (not to a
-- blind blanket rename) so historical grades keep pointing at the same
-- `grading_period_id` rows.
--
-- 1. "Quarter 1/2/3" → "TERM 1/2/3" (per school year; the rename is skipped
--    when the target name already exists in that year so the unique index
--    `grading_periods_sy_name_uq` can never be violated).
-- 2. The fourth period is retired. It is DELETED only when nothing references
--    it (no `student_grades`, no `grade_submissions`) — a referenced period is
--    kept untouched as a historical row. The application only ever offers the
--    canonical periods (order_index 1..3) in the current grading workflow, so
--    a retained legacy row never surfaces in a dropdown.
-- 3. Cached forecasts that were stored with the old "·Q<n>" label are purged:
--    they are derived data, and the label format changes to "·TERM <n>".
UPDATE `grading_periods`
   SET `name` = 'TERM 1'
 WHERE `name` = 'Quarter 1'
   AND NOT EXISTS (
     SELECT 1 FROM `grading_periods` g2
      WHERE g2.school_year_id = `grading_periods`.school_year_id
        AND g2.name = 'TERM 1'
   );
--> statement-breakpoint
UPDATE `grading_periods`
   SET `name` = 'TERM 2'
 WHERE `name` = 'Quarter 2'
   AND NOT EXISTS (
     SELECT 1 FROM `grading_periods` g2
      WHERE g2.school_year_id = `grading_periods`.school_year_id
        AND g2.name = 'TERM 2'
   );
--> statement-breakpoint
UPDATE `grading_periods`
   SET `name` = 'TERM 3'
 WHERE `name` = 'Quarter 3'
   AND NOT EXISTS (
     SELECT 1 FROM `grading_periods` g2
      WHERE g2.school_year_id = `grading_periods`.school_year_id
        AND g2.name = 'TERM 3'
   );
--> statement-breakpoint
DELETE FROM `grading_periods`
 WHERE `order_index` = 4
   AND `id` NOT IN (SELECT `grading_period_id` FROM `student_grades`)
   AND `id` NOT IN (SELECT `grading_period_id` FROM `grade_submissions`);
--> statement-breakpoint
DELETE FROM `forecasts`
 WHERE `target_period` LIKE '%·Q%';
