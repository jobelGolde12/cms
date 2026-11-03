-- Adds the employee → section assignment (adviser link) that the employee
-- form and the RBAC revision already write to.
--
-- NOTE: drizzle-kit emits `REFERENCES sections(id)` for ADD COLUMN and drops
-- the ON DELETE action. The Drizzle schema declares `onDelete: "set null"`,
-- so the action is restored here (SQLite accepts it on ADD COLUMN as long as
-- the new column is nullable — its default is NULL).
ALTER TABLE `employees` ADD `assigned_section_id` text REFERENCES sections(id) ON DELETE set null;--> statement-breakpoint
CREATE INDEX `employees_assigned_section_idx` ON `employees` (`assigned_section_id`);
