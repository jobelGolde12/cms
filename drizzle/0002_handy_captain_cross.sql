CREATE TABLE `clinical_records` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`date` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`assessment` text,
	`action_taken` text,
	`remarks` text,
	`recorded_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `clinical_student_idx` ON `clinical_records` (`student_id`);--> statement-breakpoint
CREATE INDEX `clinical_date_idx` ON `clinical_records` (`date`);--> statement-breakpoint
CREATE TABLE `health_records` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`school_year_id` text,
	`measurement_date` text NOT NULL,
	`weight_kg` real,
	`height_cm` real,
	`bmi` real,
	`nutritional_status` text,
	`remarks` text,
	`recorded_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`school_year_id`) REFERENCES `school_years`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `health_student_idx` ON `health_records` (`student_id`);--> statement-breakpoint
CREATE INDEX `health_date_idx` ON `health_records` (`measurement_date`);--> statement-breakpoint
CREATE INDEX `health_status_idx` ON `health_records` (`nutritional_status`);--> statement-breakpoint
ALTER TABLE `behavior_records` ADD `confidential` integer DEFAULT false NOT NULL;