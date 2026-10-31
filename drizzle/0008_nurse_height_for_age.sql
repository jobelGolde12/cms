ALTER TABLE `health_records` ADD COLUMN `height_for_age` text;
CREATE INDEX `health_height_for_age_idx` ON `health_records` (`height_for_age`);
