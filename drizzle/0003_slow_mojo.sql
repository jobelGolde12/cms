-- 0003: Import/sf2 schema alignment
-- 1) students.birth_date: NOT NULL -> NULL (XLSX-imported SF1/SF2 rosters carry
--    names only; the source provides no birth dates and none may be invented).
--    Turso/libSQL supports this restricted ALTER COLUMN form; the column keeps
--    its data type and all stored values.
-- 2) student_enrollments.remarks: free-text remarks recorded with an enrollment
--    (carries the source workbook's "T/I - <school>" transfer remarks).
ALTER TABLE `students` ALTER COLUMN `birth_date` TO `birth_date` text;--> statement-breakpoint
ALTER TABLE `student_enrollments` ADD `remarks` text;
