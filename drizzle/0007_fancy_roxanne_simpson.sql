CREATE TABLE `section_subject_teachers` (
	`id` text PRIMARY KEY NOT NULL,
	`section_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`teacher_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `section_subject_teacher_uq` ON `section_subject_teachers` (`section_id`,`subject_id`);--> statement-breakpoint
CREATE INDEX `section_subject_teacher_teacher_idx` ON `section_subject_teachers` (`teacher_id`);--> statement-breakpoint
CREATE INDEX `section_subject_teacher_section_idx` ON `section_subject_teachers` (`section_id`);