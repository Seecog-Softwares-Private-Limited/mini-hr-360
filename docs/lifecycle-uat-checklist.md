# Employee Lifecycle — UAT Checklist

Use this checklist before go-live. Mark each item **Pass / Fail / N/A** and note the tester + date.

## Pre-flight

- [ ] `npm run migrate` completed without fatal errors
- [ ] `npm run seed:document-types` — 12 document types present
- [ ] `npm run test:lifecycle` — all smoke checks pass
- [ ] `npm run test:lifecycle:scenarios` — all scenario paths pass
- [ ] `npm run lifecycle:backfill` reviewed; `--apply` run if upgrading existing data

## Permanent employee — happy path

| Step | Action | Expected | Pass |
|------|--------|----------|------|
| 1 | Create employee (Permanent), fill CTC & profile | Stage = Prospect | |
| 2 | Generate **Offer Letter** | Stage → Offer; PDF in vault | |
| 3 | Generate **Appointment / Probation** letter | Stage → Active; payroll structure synced | |
| 4 | Generate **Increment** letter | CTC updated; payroll sync | |
| 5 | Open **Exit workflow** → initiate exit | Offboarding checklist created; stage → Offboarding | |
| 6 | Generate exit docs in order (resignation → no-dues → F&F → relieving) | Each doc allowed; relieving → Exited | |
| 7 | Employee portal → **HR Letters** | Letters visible; acknowledge works | |
| 8 | Employee portal → **Dashboard** | “My Employment” widget shows correct stage | |

## Intern workflows

| Scenario | Steps | Expected | Pass |
|----------|-------|----------|------|
| Paid intern → exit | Internship offer → cert → relieving | Unpaid F&F skipped where applicable | |
| Paid intern → PPO | PPO letter → convert via **PPO workflow** | Type → Permanent; stage → Joining/Active | |
| Unpaid intern | Internship offer with ₹0 stipend | Gates pass; cert-only exit path | |

## Contract / consultant

| Step | Action | Expected | Pass |
|------|--------|----------|------|
| 1 | Contract employee with **contract end date** | Validation enforced on save | |
| 2 | **Contract workflow** → renew | New end date saved | |
| 3 | **Contract workflow** → non-renewal exit | Offboarding at contract end | |

## Hiring pipeline (Phase 3)

- [ ] **Candidates** — add, move stages, convert to employee
- [ ] **Document approvals** — offer queued; approve/reject; HR notified

## Payroll integration (Phase 7)

- [ ] Documents page — **From payroll** prefill on salary slip & F&F
- [ ] Exit workflow — **Pull F&F from payroll**
- [ ] Lifecycle card shows payroll link status

## Governance (Phase 8)

- [ ] Non-HR user cannot generate relieving / F&F / no-dues (403)
- [ ] Stage change sends portal notification to employee
- [ ] Daily lifecycle alerts job runs (check server log on startup)

## Regression

- [ ] Employees list — lifecycle badge, type column, stage filter
- [ ] Tab 7 lifecycle summary — timeline, quick links
- [ ] Onboarding wizard (`/onboarding-workflow/:id`)
- [ ] Leave / attendance / payroll modules unaffected

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| HR Lead | | | |
| IT / Dev | | | |
