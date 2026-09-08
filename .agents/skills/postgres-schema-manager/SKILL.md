---
name: postgres-schema-manager
description: Use when designing, migrating, indexing, or auditing PostgreSQL database schemas, relations, constraints, and query performance in web backends.
---

# PostgreSQL Schema Manager

## Overview
Design, migrate, and optimize PostgreSQL schemas with zero downtime, robust data integrity constraints, and efficient query execution plans.

---

## 1. Schema Design Standards

### Primary Keys
* **UUIDv7**: Preferred for distributed architectures, client-side ID generation, and natural chronological sorting without sequence coordination.
* **Identity Bigint**: Use `BIGINT GENERATED ALWAYS AS IDENTITY` for high-throughput single-database setups where compact integer indexes (8 bytes vs 16 bytes) are paramount.

### Data Types Best Practices
* **Timestamps**: Always use `TIMESTAMPTZ` (`timestamp with time zone`). Storing naive `TIMESTAMP` leads to timezone ambiguity bugs across servers and clients.
* **Strings**: Prefer `TEXT` over arbitrary limits like `VARCHAR(255)`. Postgres uses the same internal storage mechanism for both; enforce length boundaries with `CHECK (length(col) <= 255)` if strictly required.
* **Financial / Monetary Values**: Always use `NUMERIC(precision, scale)`. Never use `FLOAT` or `DOUBLE PRECISION` due to floating-point rounding errors.
* **Emails & Case-Insensitive Fields**: Use `CITEXT` extension or expression index `LOWER(email)` with unique constraints.

### Referential Integrity
* Explicitly declare `ON DELETE` and `ON UPDATE` actions on all foreign keys (`CASCADE`, `RESTRICT`, or `SET NULL`). Never rely on implicit defaults without intention.
* **Index all foreign key columns**: Postgres does **not** automatically index FK referencing columns; missing FK indexes cause slow joins and full table locks when rows in parent tables are deleted or updated.

---

## 2. Zero-Downtime Migration Patterns

### Rule 1: Always Set Lock Timeouts
Prevent a migration from hanging behind long-running queries and blocking all incoming traffic:

```sql
SET lock_timeout = '3s';
SET statement_timeout = '30s';
```

### Rule 2: Safe Non-Blocking Index Creation
Never run `CREATE INDEX` on an active table inside a transaction. Use `CONCURRENTLY`:

```sql
-- Outside of any transaction block:
CREATE INDEX CONCURRENTLY idx_users_org_created 
ON users (organization_id, created_at DESC);
```

### Rule 3: Safe Addition of Foreign Keys and Check Constraints
Adding a foreign key or check constraint normally acquires an `ACCESS EXCLUSIVE` lock while verifying existing rows. Avoid blocking reads/writes using a two-step validation:

```sql
-- Step 1: Add constraint without scanning existing data (instantaneous lock)
ALTER TABLE orders 
ADD CONSTRAINT fk_orders_customer_id 
FOREIGN KEY (customer_id) REFERENCES customers(id) 
NOT VALID;

-- Step 2: Validate existing rows with only a SHARE UPDATE EXCLUSIVE lock (does not block reads/writes)
ALTER TABLE orders 
VALIDATE CONSTRAINT fk_orders_customer_id;
```

### Rule 4: Adding Columns Safely
* In PostgreSQL 11+, adding a column with a constant `DEFAULT` (e.g. `DEFAULT 0` or `DEFAULT 'active'`) is a metadata-only operation and will not rewrite the table.
* To add a `NOT NULL` column safely to large tables:
  ```sql
  -- 1. Add column with default as nullable
  ALTER TABLE accounts ADD COLUMN status TEXT DEFAULT 'active';
  -- 2. Add NOT NULL constraint via NOT VALID check or alter column
  ALTER TABLE accounts ADD CONSTRAINT chk_accounts_status_not_null CHECK (status IS NOT NULL) NOT VALID;
  ALTER TABLE accounts VALIDATE CONSTRAINT chk_accounts_status_not_null;
  ```

---

## 3. Indexing Strategies

### Composite Index Ordering: Equality First, Range Second
If a query filters by `organization_id = X` and `created_at > Y`, the index must order columns accordingly:

```sql
-- ✅ Good: equality column first, then range/sorting column
CREATE INDEX CONCURRENTLY idx_events_org_created 
ON events (organization_id, created_at);
```

### Partial Indexes
Save disk space and write overhead by indexing only the rows that active queries scan:

```sql
-- Index only active tasks (ignoring archived or completed rows)
CREATE INDEX CONCURRENTLY idx_tasks_pending 
ON tasks (user_id, due_date) 
WHERE status = 'pending';

-- Soft-delete filtering index
CREATE INDEX CONCURRENTLY idx_users_active_email 
ON users (email) 
WHERE deleted_at IS NULL;
```

### JSONB Indexing
* Use GIN index with `jsonb_path_ops` for equality and containment queries (`@>`):
  ```sql
  CREATE INDEX idx_audit_metadata ON audit_logs USING gin (metadata jsonb_path_ops);
  ```
* For specific nested keys accessed frequently, use an expression B-Tree index:
  ```sql
  CREATE INDEX idx_audit_event_type ON audit_logs (((metadata->>'event_type')::text));
  ```

---

## 4. Query Analysis & Performance
Before deploying any query that touches tables with more than 10,000 rows, inspect the execution plan:

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM orders 
WHERE customer_id = '123e4567-e89b-12d3-a456-426614174000' 
ORDER BY created_at DESC 
LIMIT 20;
```

**Red Flags in Plan Output:**
* `Seq Scan` on large tables (missing index or low selectivity).
* `Buffers: read=...` significantly higher than `hit=...` (query spilling from RAM to disk).
* `Sort Method: external merge Disk` (sort exceeded `work_mem`; optimize index for sorting).

---

## 5. Migration Checklist
- [ ] Migration wrapped in `BEGIN; ... COMMIT;` (unless creating indexes concurrently).
- [ ] `SET lock_timeout = '3s';` set at the beginning of the migration script.
- [ ] Indexes created using `CREATE INDEX CONCURRENTLY`.
- [ ] All new foreign keys indexed to prevent table-lock deadlocks on delete.
- [ ] Check constraints and foreign keys added using `NOT VALID` then validated.
- [ ] Timestamps explicitly declared as `TIMESTAMPTZ`.
