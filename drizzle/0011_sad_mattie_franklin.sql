-- Links a personnel record to the login account that carries the system role.
--
-- The link is what lets a `subject_teacher` employee record carry the
-- teaching loads that grant grade-encoding rights (`section_subject_teachers`
-- is keyed by the account id, not by the employee id).
--
-- `ON DELETE set null` is restored here (drizzle-kit drops the action on ADD
-- COLUMN): the column is nullable, so SQLite accepts it.
ALTER TABLE `employees` ADD `user_id` text REFERENCES users(id) ON DELETE set null;--> statement-breakpoint
CREATE UNIQUE INDEX `employees_user_uq` ON `employees` (`user_id`);
