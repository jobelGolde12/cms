# Database Performance
- Schema has appropriate indexes for common filters (email, role, barangay, status, record_status, timestamps)
- No pagination indexes for large datasets (children, notifications, audit logs)
- Composite indexes missing for multi-column filters (e.g., child list by barangay + status + record_status)
- `SELECT *` patterns present; selective field selection preferred for large results
- SQLite is file-based; concurrent writes are limited
