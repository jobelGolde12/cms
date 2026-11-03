ALTER TABLE `health_records` ADD `height_for_age` text;--> statement-breakpoint
CREATE INDEX `health_height_for_age_idx` ON `health_records` (`height_for_age`);