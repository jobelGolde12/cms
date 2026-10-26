CREATE TABLE `grade_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`school_year_id` text NOT NULL,
	`section_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`grading_period_id` text NOT NULL,
	`status` text NOT NULL,
	`submitted_by` text NOT NULL,
	`submitted_at` integer NOT NULL,
	`reopened_at` integer,
	`reopened_by` text,
	`entry_count` integer DEFAULT 0 NOT NULL,
	`roster_count` integer DEFAULT 0 NOT NULL,
	`warnings_json` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_year_id`) REFERENCES `school_years`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`grading_period_id`) REFERENCES `grading_periods`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`submitted_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reopened_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `grade_submissions_context_idx` ON `grade_submissions` (`section_id`,`subject_id`,`grading_period_id`);--> statement-breakpoint
CREATE INDEX `grade_submissions_sy_idx` ON `grade_submissions` (`school_year_id`);--> statement-breakpoint
CREATE INDEX `grade_submissions_submitted_idx` ON `grade_submissions` (`submitted_at`);--> statement-breakpoint
CREATE INDEX `grade_submissions_submitter_idx` ON `grade_submissions` (`submitted_by`);--> statement-breakpoint
ALTER TABLE `student_grades` ADD `status` text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `student_grades` ADD `submitted_at` integer;--> statement-breakpoint
ALTER TABLE `student_grades` ADD `submission_id` text REFERENCES grade_submissions(id);