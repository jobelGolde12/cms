CREATE TABLE `employee_201_records` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`record_date` text NOT NULL,
	`file_reference` text,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `employee_201_employee_idx` ON `employee_201_records` (`employee_id`);--> statement-breakpoint
CREATE INDEX `employee_201_category_idx` ON `employee_201_records` (`category`);--> statement-breakpoint
CREATE INDEX `employee_201_date_idx` ON `employee_201_records` (`record_date`);--> statement-breakpoint
CREATE INDEX `employee_201_archived_idx` ON `employee_201_records` (`is_archived`);--> statement-breakpoint
CREATE TABLE `employees` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_number` text NOT NULL,
	`first_name` text NOT NULL,
	`middle_name` text,
	`last_name` text NOT NULL,
	`suffix` text,
	`birth_date` text,
	`sex` text NOT NULL,
	`civil_status` text,
	`address` text,
	`contact_number` text,
	`email` text,
	`emergency_contact_name` text,
	`emergency_contact_relation` text,
	`emergency_contact_number` text,
	`position` text,
	`designation` text,
	`appointment_status` text,
	`employment_type` text,
	`department` text,
	`date_hired` text,
	`date_of_appointment` text,
	`salary_grade` text,
	`step` text,
	`gsis_number` text,
	`philhealth_number` text,
	`pagibig_number` text,
	`tin_number` text,
	`prc_license_number` text,
	`eligibility` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employees_number_uq` ON `employees` (`employee_number`);--> statement-breakpoint
CREATE INDEX `employees_last_name_idx` ON `employees` (`last_name`);--> statement-breakpoint
CREATE INDEX `employees_first_name_idx` ON `employees` (`first_name`);--> statement-breakpoint
CREATE INDEX `employees_status_idx` ON `employees` (`status`);--> statement-breakpoint
CREATE INDEX `employees_position_idx` ON `employees` (`position`);--> statement-breakpoint
CREATE INDEX `employees_created_idx` ON `employees` (`created_at`);--> statement-breakpoint
CREATE TABLE `service_credit_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`type` text NOT NULL,
	`credits` real NOT NULL,
	`transaction_date` text NOT NULL,
	`reason` text NOT NULL,
	`reference_document` text,
	`remarks` text,
	`created_by` text NOT NULL,
	`updated_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `service_credits_employee_idx` ON `service_credit_transactions` (`employee_id`);--> statement-breakpoint
CREATE INDEX `service_credits_type_idx` ON `service_credit_transactions` (`type`);--> statement-breakpoint
CREATE INDEX `service_credits_date_idx` ON `service_credit_transactions` (`transaction_date`);