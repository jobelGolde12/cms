CREATE TABLE `forecasts` (
	`id` text PRIMARY KEY NOT NULL,
	`forecast_type` text NOT NULL,
	`scope_level` text NOT NULL,
	`target_period` text NOT NULL,
	`forecast_value` real NOT NULL,
	`lower_bound` real NOT NULL,
	`upper_bound` real NOT NULL,
	`model_type` text DEFAULT 'ARIMA' NOT NULL,
	`model_order` text DEFAULT '{}' NOT NULL,
	`observation_count` integer NOT NULL,
	`training_start` text NOT NULL,
	`training_end` text NOT NULL,
	`accuracy_metrics` text,
	`generated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`generated_by` text,
	`status` text DEFAULT 'generated' NOT NULL,
	`error_message` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`generated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `forecasts_type_scope_target_uq` ON `forecasts` (`forecast_type`,`scope_level`,`target_period`,`model_type`);--> statement-breakpoint
CREATE INDEX `forecasts_type_status_idx` ON `forecasts` (`forecast_type`,`status`);--> statement-breakpoint
CREATE INDEX `forecasts_scope_idx` ON `forecasts` (`scope_level`);--> statement-breakpoint
CREATE INDEX `forecasts_generated_idx` ON `forecasts` (`generated_at`);