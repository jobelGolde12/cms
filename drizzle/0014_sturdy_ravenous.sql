ALTER TABLE `users` ADD `is_dummy` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `users_dummy_idx` ON `users` (`is_dummy`);