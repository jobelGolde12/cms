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
CREATE TABLE `barangays` (
	`id` text PRIMARY KEY NOT NULL,
	`municipality_id` text,
	`name` text NOT NULL,
	`code` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`municipality_id`) REFERENCES `municipalities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `barangays_name_uq` ON `barangays` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `barangays_code_uq` ON `barangays` (`code`);--> statement-breakpoint
CREATE INDEX `barangays_municipality_idx` ON `barangays` (`municipality_id`);--> statement-breakpoint
CREATE TABLE `child_addresses` (
	`id` text PRIMARY KEY NOT NULL,
	`child_id` text NOT NULL,
	`barangay_id` text NOT NULL,
	`household_address` text NOT NULL,
	`sitio` text,
	`is_current` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`barangay_id`) REFERENCES `barangays`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `child_addresses_child_idx` ON `child_addresses` (`child_id`);--> statement-breakpoint
CREATE INDEX `child_addresses_barangay_idx` ON `child_addresses` (`barangay_id`);--> statement-breakpoint
CREATE TABLE `child_disabilities` (
	`id` text PRIMARY KEY NOT NULL,
	`child_id` text NOT NULL,
	`has_disability` integer DEFAULT false NOT NULL,
	`disability_type` text,
	`description` text,
	`support_needed` text,
	`assistance_status` text,
	`verified` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `child_disabilities_child_idx` ON `child_disabilities` (`child_id`);--> statement-breakpoint
CREATE TABLE `child_duplicate_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`child_id` text NOT NULL,
	`possible_child_id` text NOT NULL,
	`match_score` integer,
	`match_reason` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewed_by` text,
	`review_notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`possible_child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `duplicate_pair_uq` ON `child_duplicate_candidates` (`child_id`,`possible_child_id`);--> statement-breakpoint
CREATE INDEX `duplicate_status_idx` ON `child_duplicate_candidates` (`status`);--> statement-breakpoint
CREATE TABLE `child_eccd` (
	`id` text PRIMARY KEY NOT NULL,
	`child_id` text NOT NULL,
	`participation_status` text NOT NULL,
	`program_name` text,
	`provider` text,
	`start_date` text,
	`end_date` text,
	`remarks` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `child_eccd_child_idx` ON `child_eccd` (`child_id`);--> statement-breakpoint
CREATE TABLE `child_education` (
	`id` text PRIMARY KEY NOT NULL,
	`child_id` text NOT NULL,
	`school_id` text,
	`education_status` text NOT NULL,
	`grade_level` text,
	`school_year` text,
	`enrollment_status` text,
	`is_current` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `child_education_child_idx` ON `child_education` (`child_id`);--> statement-breakpoint
CREATE INDEX `child_education_school_idx` ON `child_education` (`school_id`);--> statement-breakpoint
CREATE INDEX `child_education_status_idx` ON `child_education` (`education_status`);--> statement-breakpoint
CREATE INDEX `child_education_sy_idx` ON `child_education` (`school_year`);--> statement-breakpoint
CREATE TABLE `child_monitoring` (
	`id` text PRIMARY KEY NOT NULL,
	`child_id` text NOT NULL,
	`monitoring_type` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`observed_at` integer NOT NULL,
	`recorded_by` text NOT NULL,
	`remarks` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `child_monitoring_child_idx` ON `child_monitoring` (`child_id`);--> statement-breakpoint
CREATE INDEX `child_monitoring_type_idx` ON `child_monitoring` (`monitoring_type`);--> statement-breakpoint
CREATE INDEX `child_monitoring_observed_idx` ON `child_monitoring` (`observed_at`);--> statement-breakpoint
CREATE TABLE `child_validations` (
	`id` text PRIMARY KEY NOT NULL,
	`child_id` text NOT NULL,
	`submitted_by` text NOT NULL,
	`reviewed_by` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`remarks` text,
	`submitted_at` integer NOT NULL,
	`reviewed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`submitted_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `child_validations_child_idx` ON `child_validations` (`child_id`);--> statement-breakpoint
CREATE INDEX `child_validations_status_idx` ON `child_validations` (`status`);--> statement-breakpoint
CREATE INDEX `child_validations_submitted_idx` ON `child_validations` (`submitted_at`);--> statement-breakpoint
CREATE TABLE `children` (
	`id` text PRIMARY KEY NOT NULL,
	`child_code` text NOT NULL,
	`first_name` text NOT NULL,
	`middle_name` text,
	`last_name` text NOT NULL,
	`suffix` text,
	`birth_date` text NOT NULL,
	`sex` text NOT NULL,
	`civil_status` text,
	`birth_place` text,
	`barangay_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`record_status` text DEFAULT 'draft' NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`barangay_id`) REFERENCES `barangays`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `children_code_uq` ON `children` (`child_code`);--> statement-breakpoint
CREATE INDEX `children_last_name_idx` ON `children` (`last_name`);--> statement-breakpoint
CREATE INDEX `children_first_name_idx` ON `children` (`first_name`);--> statement-breakpoint
CREATE INDEX `children_birth_idx` ON `children` (`birth_date`);--> statement-breakpoint
CREATE INDEX `children_barangay_idx` ON `children` (`barangay_id`);--> statement-breakpoint
CREATE INDEX `children_record_status_idx` ON `children` (`record_status`);--> statement-breakpoint
CREATE INDEX `children_status_idx` ON `children` (`status`);--> statement-breakpoint
CREATE INDEX `children_created_idx` ON `children` (`created_at`);--> statement-breakpoint
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
	`child_id` text NOT NULL,
	`intervention_type` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`priority` text,
	`start_date` text,
	`target_date` text,
	`completed_date` text,
	`assigned_to` text,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `interventions_child_idx` ON `interventions` (`child_id`);--> statement-breakpoint
CREATE INDEX `interventions_status_idx` ON `interventions` (`status`);--> statement-breakpoint
CREATE INDEX `interventions_target_idx` ON `interventions` (`target_date`);--> statement-breakpoint
CREATE TABLE `municipalities` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`province` text NOT NULL,
	`region` text NOT NULL,
	`short_name` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
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
	`child_id` text NOT NULL,
	`verification_token` text NOT NULL,
	`verified_by` text,
	`verification_type` text NOT NULL,
	`result` text DEFAULT 'valid' NOT NULL,
	`verified_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `qr_verifications_token_uq` ON `qr_verifications` (`verification_token`);--> statement-breakpoint
CREATE INDEX `qr_verifications_child_idx` ON `qr_verifications` (`child_id`);--> statement-breakpoint
CREATE INDEX `qr_verifications_verified_at_idx` ON `qr_verifications` (`verified_at`);--> statement-breakpoint
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
	`scope` text DEFAULT 'municipality' NOT NULL,
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
CREATE TABLE `schools` (
	`id` text PRIMARY KEY NOT NULL,
	`barangay_id` text,
	`name` text NOT NULL,
	`school_code` text,
	`school_type` text DEFAULT 'elementary' NOT NULL,
	`address` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`barangay_id`) REFERENCES `barangays`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `schools_name_uq` ON `schools` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `schools_code_uq` ON `schools` (`school_code`);--> statement-breakpoint
CREATE INDEX `schools_barangay_idx` ON `schools` (`barangay_id`);--> statement-breakpoint
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
	`barangay_id` text,
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
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`barangay_id`) REFERENCES `barangays`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_uq` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role_id`);--> statement-breakpoint
CREATE INDEX `users_barangay_idx` ON `users` (`barangay_id`);--> statement-breakpoint
CREATE INDEX `users_active_idx` ON `users` (`is_active`);