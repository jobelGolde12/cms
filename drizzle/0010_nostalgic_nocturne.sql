-- Repairs the QR-verification index set and restores the indexes that the
-- one-off remote table rebuild dropped.
--
-- 1. `qr_verifications` is an append-only EVENT log: one token legitimately
--    appears in many rows (generate → scan → scan → revoke). The UNIQUE index
--    declared by the old schema made every public QR scan fail with
--    "UNIQUE constraint failed: qr_verifications.verification_token", so it is
--    replaced by a plain lookup index.
-- 2. `interventions_status_idx` / `interventions_target_idx` and the
--    `qr_verifications_*` lookup indexes exist in the baseline migration but
--    were missing on databases whose tables were rebuilt in place — they are
--    recreated here with IF NOT EXISTS so the migration chain is
--    self-healing on every database.
DROP INDEX IF EXISTS `qr_verifications_token_uq`;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `qr_verifications_token_idx` ON `qr_verifications` (`verification_token`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `qr_verifications_student_idx` ON `qr_verifications` (`student_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `qr_verifications_verified_at_idx` ON `qr_verifications` (`verified_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `interventions_status_idx` ON `interventions` (`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `interventions_target_idx` ON `interventions` (`target_date`);
