-- Multi-role accounts: an employee may legitimately be BOTH an Adviser and a
-- Subject Teacher without ever creating a second employee record.
--
-- `users.role_id` stays the PRIMARY role (it drives the default workspace and
-- the role badge). This new join table carries the ADDITIONAL roles an account
-- holds; the effective permission set is the union of the roles (see
-- `hasUserPermission` in src/lib/permissions.ts).
--
-- The backfill below copies every account's primary role into the join table
-- so an existing account keeps exactly the permissions it had before the
-- migration — no behaviour change on upgrade.
CREATE TABLE `user_roles` (
	`user_id` text NOT NULL,
	`role_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`user_id`, `role_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_roles_user_idx` ON `user_roles` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_roles_role_idx` ON `user_roles` (`role_id`);--> statement-breakpoint
INSERT OR IGNORE INTO `user_roles` (`user_id`, `role_id`)
	SELECT `id`, `role_id` FROM `users`;
