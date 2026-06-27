# Employee Lifecycle — Migration Runbook

Guide for upgrading an existing MINI-HR-360 database to the lifecycle workflow (Phases 1–8).

## 1. Backup

```bash
# Example — adjust host/credentials
mysqldump -h $DB_HOST -u $DB_USER -p mini_hr_360 > mini_hr_360_pre_lifecycle.sql
```

## 2. Deploy code

Pull the branch containing lifecycle changes. Ensure `property.env` has valid `DB_*` settings.

## 3. Run migrations

```bash
npm run migrate
```

Key migrations (applied in filename order):

| Migration | Purpose |
|-----------|---------|
| `add-employee-lifecycle-workflow.cjs` | `lifecycleStage`, lifecycle events table |
| `add-offboarding-checklist.cjs` | Offboarding checklist JSON |
| `add-phase3-candidates-approvals.cjs` | Candidates & offer approvals |
| `add-phase4-exit-fnf.cjs` | F&F settlement JSON |
| `add-phase5-letter-acknowledgement.cjs` | Letter acknowledgement timestamp |
| `ensure-employee-lifecycle-columns.cjs` | `internStipend`, `contractEndDate`, etc. |

On startup, `ensureEmployeeLifecycleColumns` also self-heals missing columns if Sequelize alter-sync is blocked (MySQL 64-key limit).

## 4. Seed document types

```bash
npm run seed:document-types
```

Verifies 12 templates: offer, probation, increment, bonus, salary slip, internship offer/cert, PPO, resignation, no-dues, F&F, relieving.

## 5. Backfill lifecycle stages (existing employees)

**Preview first (no writes):**

```bash
npm run lifecycle:backfill
```

**Apply inferred stages:**

```bash
npm run lifecycle:backfill -- --apply
```

**Re-infer all employees (including those already staged):**

```bash
npm run lifecycle:backfill -- --apply --force
```

Inference rules (summary):

- Relieving letter or completed exit → `exited`
- Resignation / exit docs / `exitStatus=in_progress` → `offboarding`
- Probation letter → `active` or `confirmed`
- PPO letter → `joining`
- Offer / internship offer → `offer`
- Past joining date, no docs → `active` / `confirmed`
- Default → `prospect`

Each applied change logs an `employee_lifecycle_events` row with action `backfill_lifecycle_stage`.

## 6. Verify

```bash
npm run test:lifecycle
npm run test:lifecycle:scenarios
```

Optional live API check (server must be running):

```bash
LIFECYCLE_SMOKE_URL=http://localhost:3002 \
LIFECYCLE_SMOKE_EMAIL=hr@demo.com \
LIFECYCLE_SMOKE_PASSWORD=HrPass123! \
npm run test:lifecycle
```

## 7. Start application

```bash
# Free port if needed: lsof -ti:3002 | xargs kill -9
npm run dev
```

Confirm in logs: DB connected, lifecycle alerts job scheduled.

## 8. HR communication

Share `docs/lifecycle-uat-checklist.md` with HR for structured UAT.

Key UI entry points:

| URL | Purpose |
|-----|---------|
| `/employees` | Lifecycle badges & filters |
| `/documents` | Generate letters (gated by stage) |
| `/onboarding-workflow/:id` | New hire onboarding |
| `/contract-workflow/:id` | Contract renew / non-renew |
| `/ppo-workflow/:id` | Intern PPO / completion |
| `/exit-workflow/:id` | Exit & offboarding |
| `/candidates` | Pre-hire pipeline |
| `/document-approvals` | Offer approval queue |
| `/employee/hr-letters` | Employee portal letters |

## 9. Rollback

If critical issues occur:

1. Restore DB from backup
2. Revert application code to previous release
3. Do **not** run `--force` backfill on a restored DB without reviewing diff

## 10. Post go-live

- Monitor lifecycle alerts and offer-approval queue daily for first week
- Spot-check 5 employees per type (Permanent, Intern, Contract) for correct stage
- Confirm payroll sync after offer / appointment / increment letters
