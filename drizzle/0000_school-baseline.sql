CREATE TABLE `assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`domain` text NOT NULL,
	`assessment_type` text,
	`skill_area` text,
	`date` text NOT NULL,
	`level` text,
	`score` real,
	`assessor_id` text NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assessor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `assessments_student_domain_idx` ON `assessments` (`student_id`,`domain`);--> statement-breakpoint
CREATE INDEX `assessments_domain_idx` ON `assessments` (`domain`);--> statement-breakpoint
CREATE INDEX `assessments_date_idx` ON `assessments` (`date`);--> statement-breakpoint
CREATE TABLE `attendance_records` (
	`id` text PRIMARY KEY NOT NULL,
	`enrollment_id` text NOT NULL,
	`date` text NOT NULL,
	`status` text NOT NULL,
	`remarks` text,
	`recorded_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`enrollment_id`) REFERENCES `student_enrollments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_enrollment_date_uq` ON `attendance_records` (`enrollment_id`,`date`);--> statement-breakpoint
CREATE INDEX `attendance_date_idx` ON `attendance_records` (`date`);--> statement-breakpoint
CREATE INDEX `attendance_status_idx` ON `attendance_records` (`status`);--> statement-breakpoint
CREATE INDEX `attendance_enrollment_idx` ON `attendance_records` (`enrollment_id`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`old_values_json` text,
	`new_values_json` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_user_idx` ON `audit_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `behavior_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `behavior_categories_name_uq` ON `behavior_categories` (`name`);--> statement-breakpoint
CREATE TABLE `behavior_records` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`category_id` text NOT NULL,
	`date` text NOT NULL,
	`description` text NOT NULL,
	`severity` text,
	`follow_up` text,
	`status` text DEFAULT 'open' NOT NULL,
	`recorded_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `behavior_categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `behavior_student_idx` ON `behavior_records` (`student_id`);--> statement-breakpoint
CREATE INDEX `behavior_category_idx` ON `behavior_records` (`category_id`);--> statement-breakpoint
CREATE INDEX `behavior_date_idx` ON `behavior_records` (`date`);--> statement-breakpoint
CREATE INDEX `behavior_status_idx` ON `behavior_records` (`status`);--> statement-breakpoint
CREATE TABLE `duplicate_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`possible_student_id` text NOT NULL,
	`match_score` integer,
	`match_reason` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewed_by` text,
	`review_notes` text,
	`reviewed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`possible_student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `duplicate_pair_uq` ON `duplicate_candidates` (`student_id`,`possible_student_id`);--> statement-breakpoint
CREATE INDEX `duplicate_status_idx` ON `duplicate_candidates` (`status`);--> statement-breakpoint
CREATE TABLE `grade_levels` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`order_index` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `grade_levels_name_uq` ON `grade_levels` (`name`);--> statement-breakpoint
CREATE INDEX `grade_levels_order_idx` ON `grade_levels` (`order_index`);--> statement-breakpoint
CREATE TABLE `grading_periods` (
	`id` text PRIMARY KEY NOT NULL,
	`school_year_id` text NOT NULL,
	`name` text NOT NULL,
	`order_index` integer NOT NULL,
	`start_date` text,
	`end_date` text,
	`is_current` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_year_id`) REFERENCES `school_years`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `grading_periods_sy_name_uq` ON `grading_periods` (`school_year_id`,`name`);--> statement-breakpoint
CREATE INDEX `grading_periods_sy_idx` ON `grading_periods` (`school_year_id`);--> statement-breakpoint
CREATE INDEX `grading_periods_current_idx` ON `grading_periods` (`is_current`);--> statement-breakpoint
CREATE TABLE `guardians` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`middle_name` text,
	`last_name` text NOT NULL,
	`relationship` text NOT NULL,
	`contact_number` text,
	`email` text,
	`occupation` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `guardians_last_name_idx` ON `guardians` (`last_name`);--> statement-breakpoint
CREATE INDEX `guardians_first_name_idx` ON `guardians` (`first_name`);--> statement-breakpoint
CREATE TABLE `intervention_followups` (
	`id` text PRIMARY KEY NOT NULL,
	`intervention_id` text NOT NULL,
	`follow_up_date` text NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`notes` text,
	`recorded_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`intervention_id`) REFERENCES `interventions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `intervention_followups_intervention_idx` ON `intervention_followups` (`intervention_id`);--> statement-breakpoint
CREATE TABLE `interventions` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`intervention_type` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`outcome` text,
	`start_date` text,
	`target_date` text,
	`completed_date` text,
	`assigned_to` text,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `interventions_student_idx` ON `interventions` (`student_id`);--> statement-breakpoint
CREATE INDEX `interventions_status_idx` ON `interventions` (`status`);--> statement-breakpoint
CREATE INDEX `interventions_target_idx` ON `interventions` (`target_date`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text,
	`link` text,
	`is_read` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`read_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`user_id`,`is_read`);--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`module` text NOT NULL,
	`action` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `permissions_name_uq` ON `permissions` (`name`);--> statement-breakpoint
CREATE TABLE `qr_verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`verification_token` text NOT NULL,
	`verified_by` text,
	`verification_type` text NOT NULL,
	`result` text DEFAULT 'valid' NOT NULL,
	`verified_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `qr_verifications_token_uq` ON `qr_verifications` (`verification_token`);--> statement-breakpoint
CREATE INDEX `qr_verifications_student_idx` ON `qr_verifications` (`student_id`);--> statement-breakpoint
CREATE INDEX `qr_verifications_verified_at_idx` ON `qr_verifications` (`verified_at`);--> statement-breakpoint
CREATE TABLE `record_verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`submitted_by` text NOT NULL,
	`reviewed_by` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`remarks` text,
	`submitted_at` integer NOT NULL,
	`reviewed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`submitted_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `verifications_student_idx` ON `record_verifications` (`student_id`);--> statement-breakpoint
CREATE INDEX `verifications_status_idx` ON `record_verifications` (`status`);--> statement-breakpoint
CREATE INDEX `verifications_submitted_idx` ON `record_verifications` (`submitted_at`);--> statement-breakpoint
CREATE TABLE `report_exports` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`format` text NOT NULL,
	`file_reference` text NOT NULL,
	`generated_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`expires_at` integer,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`generated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `report_exports_report_idx` ON `report_exports` (`report_id`);--> statement-breakpoint
CREATE INDEX `report_exports_generated_idx` ON `report_exports` (`created_at`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`report_type` text NOT NULL,
	`generated_by` text NOT NULL,
	`scope` text DEFAULT 'school' NOT NULL,
	`filters_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`generated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `reports_type_idx` ON `reports` (`report_type`);--> statement-breakpoint
CREATE INDEX `reports_created_idx` ON `reports` (`created_at`);--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role_id` text NOT NULL,
	`permission_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`role_id`, `permission_id`),
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `role_permissions_role_idx` ON `role_permissions` (`role_id`);--> statement-breakpoint
CREATE INDEX `role_permissions_permission_idx` ON `role_permissions` (`permission_id`);--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_name_uq` ON `roles` (`name`);--> statement-breakpoint
CREATE TABLE `school_years` (
	`id` text PRIMARY KEY NOT NULL,
	`year` text NOT NULL,
	`start_date` text,
	`end_date` text,
	`is_current` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `school_years_year_uq` ON `school_years` (`year`);--> statement-breakpoint
CREATE INDEX `school_years_current_idx` ON `school_years` (`is_current`);--> statement-breakpoint
CREATE TABLE `sections` (
	`id` text PRIMARY KEY NOT NULL,
	`school_year_id` text NOT NULL,
	`grade_level_id` text NOT NULL,
	`name` text NOT NULL,
	`adviser_id` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`school_year_id`) REFERENCES `school_years`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`grade_level_id`) REFERENCES `grade_levels`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`adviser_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sections_sy_grade_name_uq` ON `sections` (`school_year_id`,`grade_level_id`,`name`);--> statement-breakpoint
CREATE INDEX `sections_sy_idx` ON `sections` (`school_year_id`);--> statement-breakpoint
CREATE INDEX `sections_grade_idx` ON `sections` (`grade_level_id`);--> statement-breakpoint
CREATE INDEX `sections_adviser_idx` ON `sections` (`adviser_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip` text,
	`user_agent` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_hash_uq` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `student_enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`school_year_id` text NOT NULL,
	`grade_level_id` text NOT NULL,
	`section_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`enrollment_date` text,
	`recorded_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`school_year_id`) REFERENCES `school_years`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`grade_level_id`) REFERENCES `grade_levels`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrollment_student_sy_uq` ON `student_enrollments` (`student_id`,`school_year_id`);--> statement-breakpoint
CREATE INDEX `enrollments_student_idx` ON `student_enrollments` (`student_id`);--> statement-breakpoint
CREATE INDEX `enrollments_sy_idx` ON `student_enrollments` (`school_year_id`);--> statement-breakpoint
CREATE INDEX `enrollments_grade_idx` ON `student_enrollments` (`grade_level_id`);--> statement-breakpoint
CREATE INDEX `enrollments_section_idx` ON `student_enrollments` (`section_id`);--> statement-breakpoint
CREATE INDEX `enrollments_status_idx` ON `student_enrollments` (`status`);--> statement-breakpoint
CREATE TABLE `student_grades` (
	`id` text PRIMARY KEY NOT NULL,
	`enrollment_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`grading_period_id` text NOT NULL,
	`grade` real NOT NULL,
	`remarks` text,
	`recorded_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`enrollment_id`) REFERENCES `student_enrollments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`grading_period_id`) REFERENCES `grading_periods`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `grades_enrollment_subject_period_uq` ON `student_grades` (`enrollment_id`,`subject_id`,`grading_period_id`);--> statement-breakpoint
CREATE INDEX `grades_enrollment_idx` ON `student_grades` (`enrollment_id`);--> statement-breakpoint
CREATE INDEX `grades_subject_idx` ON `student_grades` (`subject_id`);--> statement-breakpoint
CREATE INDEX `grades_period_idx` ON `student_grades` (`grading_period_id`);--> statement-breakpoint
CREATE TABLE `student_guardians` (
	`student_id` text NOT NULL,
	`guardian_id` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`student_id`, `guardian_id`),
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`guardian_id`) REFERENCES `guardians`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `student_guardians_guardian_idx` ON `student_guardians` (`guardian_id`);--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`student_number` text NOT NULL,
	`first_name` text NOT NULL,
	`middle_name` text,
	`last_name` text NOT NULL,
	`suffix` text,
	`birth_date` text NOT NULL,
	`sex` text NOT NULL,
	`contact_number` text,
	`address` text,
	`status` text DEFAULT 'active' NOT NULL,
	`record_status` text DEFAULT 'draft' NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `students_number_uq` ON `students` (`student_number`);--> statement-breakpoint
CREATE INDEX `students_last_name_idx` ON `students` (`last_name`);--> statement-breakpoint
CREATE INDEX `students_first_name_idx` ON `students` (`first_name`);--> statement-breakpoint
CREATE INDEX `students_birth_idx` ON `students` (`birth_date`);--> statement-breakpoint
CREATE INDEX `students_status_idx` ON `students` (`status`);--> statement-breakpoint
CREATE INDEX `students_record_status_idx` ON `students` (`record_status`);--> statement-breakpoint
CREATE INDEX `students_created_idx` ON `students` (`created_at`);--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subjects_code_uq` ON `subjects` (`code`);--> statement-breakpoint
CREATE INDEX `subjects_active_idx` ON `subjects` (`is_active`);--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`updated_by` text,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `system_settings_key_uq` ON `system_settings` (`key`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`role_id` text NOT NULL,
	`first_name` text NOT NULL,
	`middle_name` text,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`phone` text,
	`is_active` integer DEFAULT true NOT NULL,
	`last_login_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_uq` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role_id`);--> statement-breakpoint
CREATE INDEX `users_active_idx` ON `users` (`is_active`);