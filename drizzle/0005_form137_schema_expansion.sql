ALTER TABLE `student_enrollments` ADD `eligibility_certificate` text;--> statement-breakpoint
ALTER TABLE `student_enrollments` ADD `previous_school_name` text;--> statement-breakpoint
ALTER TABLE `student_enrollments` ADD `previous_school_address` text;--> statement-breakpoint
ALTER TABLE `student_enrollments` ADD `previous_general_average` real;--> statement-breakpoint
ALTER TABLE `student_enrollments` ADD `previous_grade_level` text;--> statement-breakpoint
ALTER TABLE `student_enrollments` ADD `promotion_status` text;--> statement-breakpoint
ALTER TABLE `student_enrollments` ADD `academic_distinction` text;--> statement-breakpoint
ALTER TABLE `students` ADD `lrn` text;--> statement-breakpoint
ALTER TABLE `students` ADD `birth_place` text;