CREATE TABLE `mfa_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mfa_challenge_token_uq` ON `mfa_challenges` (`token_hash`);--> statement-breakpoint
CREATE INDEX `mfa_challenge_user_idx` ON `mfa_challenges` (`user_id`);--> statement-breakpoint
CREATE TABLE `mfa_recovery_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`code_hash` text NOT NULL,
	`used_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mfa_recovery_code_uq` ON `mfa_recovery_codes` (`user_id`,`code_hash`);--> statement-breakpoint
CREATE INDEX `mfa_recovery_user_idx` ON `mfa_recovery_codes` (`user_id`);--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `password_reset_token_uq` ON `password_reset_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `password_reset_user_idx` ON `password_reset_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `password_reset_expires_idx` ON `password_reset_tokens` (`expires_at`);--> statement-breakpoint
ALTER TABLE `grading_periods` ADD `submission_deadline` text;--> statement-breakpoint
ALTER TABLE `users` ADD `status` text DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `requested_position` text;--> statement-breakpoint
ALTER TABLE `users` ADD `registration_note` text;--> statement-breakpoint
ALTER TABLE `users` ADD `reviewed_by` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `users` ADD `reviewed_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `mfa_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `mfa_secret` text;--> statement-breakpoint
ALTER TABLE `users` ADD `mfa_enrolled_at` integer;--> statement-breakpoint
INSERT INTO `roles` (`id`, `name`, `description`) VALUES ('role-pending', 'Pending Registration', 'Placeholder role for self-registered accounts awaiting administrator approval. Holds no permissions.') ON CONFLICT (`id`) DO NOTHING;
