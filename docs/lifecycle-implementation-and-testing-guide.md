# Employee Lifecycle — Implementation Summary & Testing Guide

This document describes what was built across **Phases 1–14** of the MINI-HR-360 employee lifecycle system, and how to test each area step by step.

**App URL (local):** `http://localhost:3002`  
**Prerequisites:** `npm run migrate`, `npm run seed:document-types`, server running (`npm run dev`)

---

## Lifecycle model (foundation)

**Stages:** `prospect → offer → joining → active → confirmed → offboarding → exited`

**Employee types:** Permanent, Contract, Consultant, Intern, Trainee

**Core engine:** `src/config/lifecycleWorkflows.js`, `src/services/employeeLifecycle.service.js`

| Stage | Typical meaning |
|-------|-----------------|
| prospect | Profile created, pre-offer |
| offer | Offer letter issued / pending acceptance |
| joining | Offer accepted, pre-appointment |
| active | On payroll, in probation or tenure |
| confirmed | Probation complete |
| offboarding | Exit in progress |
| exited | Separated, inactive |

---

## Phase 1–2 — Foundation & lifecycle engine

### What was implemented
- `lifecycleStage` column and `employee_lifecycle_events` audit table
- Workflow matrix: which document types are allowed per **employee type + stage**
- Document **data gates** (required fields before PDF generation)
- Auto stage transitions when documents are generated (e.g. offer letter → `offer`, appointment → `active`)
- Offboarding checklist JSON on employee record
- 12 HR letter templates (offer, appointment, increment, bonus, salary slip, internship offer/cert, PPO, resignation, no-dues, F&F, relieving)
- Generated PDF vault (`employee_generated_documents`) with versioning

### How to test
1. Run migrations and seeds:
   ```bash
   npm run migrate
   npm run seed:document-types
   ```
2. Create an employee (Permanent) with name, email, designation, department, CTC, joining date.
3. Open **Documents** → select employee → generate **Offer Letter**.
4. **Expected:** PDF downloads; employee `lifecycleStage` becomes `offer`; row appears in document vault.
5. Generate **Appointment / Probation** letter.
6. **Expected:** Stage moves to `active`.

---

## Phase 3 — Hiring pipeline & approvals

### What was implemented
- **Candidates** pipeline (`/candidates`) — pre-hire tracking
- **Document approvals** queue (`/document-approvals`) — offer letters queue before email send
- Email PDF attachments on approval
- Dashboard lifecycle widgets (pending offers)
- Migration for candidates & approval tables

### How to test
1. Go to `/candidates` → add a candidate → move through stages → convert to employee (if wired).
2. Create employee at `prospect` → generate **Offer Letter** **without** “Skip offer approval”.
3. **Expected:** HTTP 202 / redirect to approvals; PDF **not** emailed yet.
4. Open `/document-approvals` → approve the offer.
5. **Expected:** PDF emailed to employee; saved to vault; stage updated.

---

## Phase 4 — Exit & offboarding

### What was implemented
- **Exit workflow** page: `/exit-workflow/:employeeId`
- Exit initiation (resignation date, LWD, reason)
- Offboarding checklist (auto-created, department items)
- F&F settlement JSON (`fnfSettlement`) on employee
- Exit completion gates: all exit docs + 100% checklist before `exited`
- Exit document sequence: resignation → no-dues → F&F → relieving

### How to test
1. Pick an **active** permanent employee.
2. Open `/exit-workflow/:id` → enter resignation date & last working day → **Initiate exit**.
3. **Expected:** Stage → `offboarding`; checklist appears.
4. At **Documents**, generate in order: Resignation Acceptance → No-Dues → F&F → Relieving.
   - Only HR/admin roles can generate exit letters (see Phase 8).
5. Tick all checklist items on exit workflow page.
6. Click **Complete exit**.
7. **Expected:** Stage → `exited`; `isActive` false.

---

## Phase 5 — Profile & lifecycle UX (HR)

### What was implemented
- Employees table: lifecycle badges, type column, **stage filter**
- Employee modal **Tab 7**: stage track, timeline, recommended next document, quick links
- **Onboarding workflow**: `/onboarding-workflow/:employeeId`
- Documents deep link: `/documents?employeeId=X&docTypeId=Y`
- Portal letter **acknowledgement** (`acknowledgedAt` on generated documents)

### How to test
1. `/employees` → use lifecycle stage filter (e.g. “Offer”) → verify list filters.
2. Edit employee → **Lifecycle** tab → confirm stage track, timeline, “Generate Documents” link.
3. Open `/onboarding-workflow/:id` → verify document checklist and stage badges.
4. Use recommended doc link → lands on Documents with employee pre-selected.

---

## Phase 6 — Contract & intern workflows

### What was implemented
- **Contract workflow**: `/contract-workflow/:employeeId` — renew, non-renewal exit
- **PPO / intern workflow**: `/ppo-workflow/:employeeId` — PPO conversion, end internship
- Validation: contract end date required for Contract/Consultant; intern stipend rules
- Employees row menu links to contract/PPO wizards by type
- Daily **lifecycle alerts job** (probation, contract expiry, exit LWD)

### How to test — Contract
1. Create **Contract** employee with `contractEndDate`.
2. Open `/contract-workflow/:id`.
3. **Renew:** set new end date → save → verify date updated.
4. **Non-renewal exit:** start offboarding at contract end → verify stage `offboarding`.

### How to test — Intern / PPO
1. Create **Intern** with stipend (paid) or ₹0 (unpaid).
2. Open `/ppo-workflow/:id`.
3. **PPO conversion:** enter CTC, DOJ → convert → type becomes Permanent, stage `joining`.
4. **End internship:** completion exit → offboarding (unpaid: cert + relieving, skip F&F where applicable).

---

## Phase 7 — Payroll integration

### What was implemented
- Payroll lifecycle service: link employee ↔ salary structure ↔ payroll register
- APIs: `payroll-link`, `payroll-register`, `payroll-prefill/salary-slip`, `fnf-settlement/from-payroll`, `payroll-structure/sync`
- Auto salary structure sync after: Offer, PPO, Appointment, Increment letters
- UI: **From payroll** on Documents (salary slip & F&F); F&F pull on exit workflow

### How to test
1. Ensure employee has CTC and a salary structure assignment.
2. Run/lock a payroll register row for the employee.
3. **Documents** → Salary Slip → **From payroll** → fields prefilled from register.
4. **Exit workflow** → **Pull F&F from payroll** → settlement fields populated.
5. Generate increment letter → verify CTC sync (lifecycle API `payrollLink` on employee tab).

---

## Phase 8 — Automation, notifications & governance

### What was implemented
- **Stage transition notifications** to HR + employee portal
- **Document generated** portal notification
- **Offer pending approval** alerts + daily digest
- **Exit document role guard** — only HR Manager / HR Executive / Admin can generate exit/settlement letters (403 for others)
- Employee dashboard **“My Employment”** widget
- Enhanced daily alerts: pending offers, exit LWD within 7 days

### How to test
1. Change lifecycle stage (onboarding wizard or API) → check HR notifications + employee portal notification.
2. Log in as non-HR user → try generating Relieving letter → **403**.
3. Log in as HR → same action succeeds.
4. Employee portal `/employee/dashboard` → “My Employment” widget shows stage and progress.
5. Restart server → confirm log: `Lifecycle alerts job scheduled`.

---

## Phase 9 — Testing & rollout tooling

### What was implemented
- `npm run test:lifecycle` — DB schema, document seeds, workflow matrix
- `npm run test:lifecycle:scenarios` — in-memory paths (permanent, intern, contract)
- `npm run lifecycle:backfill` — infer stages for existing employees (dry-run; `--apply` to write)
- `docs/lifecycle-uat-checklist.md` — HR sign-off checklist
- `docs/lifecycle-migration-runbook.md` — upgrade runbook

### How to test
```bash
npm run test:lifecycle
npm run test:lifecycle:scenarios
npm run lifecycle:backfill          # preview
npm run lifecycle:backfill -- --apply   # apply if needed
```

Optional live API smoke (server running):
```bash
LIFECYCLE_SMOKE_URL=http://localhost:3002 \
LIFECYCLE_SMOKE_EMAIL=<hr-email> \
LIFECYCLE_SMOKE_PASSWORD=<password> \
npm run test:lifecycle
```

---

## Phase 10 — Operations & UX polish

### What was implemented
- **Bulk CSV import** on Employees page (Import CSV + template download)
- **Accept offer** / **Confirm employment** buttons on employee Lifecycle tab
- **Document version history** on Documents page (v1, v2…)
- **My Employment** widget on employee **Profile**

### How to test — Bulk import
1. `/employees` → **Import CSV** → download template.
2. Fill rows (include `employeeType`, `lifecycleStage`, CTC, etc.) → choose default reporting manager → import.
3. **Expected:** New employees created; `bulk_import` events in lifecycle timeline.

### How to test — Lifecycle actions
1. Employee at stage **offer** → Lifecycle tab → **Accept Offer**.
2. **Expected:** Stage → `joining`.
3. Employee at **active** → **Confirm Employment** → stage → `confirmed`.

### How to test — Version history
1. Generate same document type twice for one employee.
2. On Documents step 2 → version history shows v1, v2; “next will be v3”.

---

## Phase 11 — Email templates

### What was implemented
- Per-document-code email subjects/bodies in `src/config/lifecycleEmailTemplates.js`
- `lifecycleEmail.service.js` — DB default template overrides config when set on `/email-templates`
- `npm run seed:lifecycle-emails` — seed templates into DB

### How to test
1. `npm run seed:lifecycle-emails` (optional).
2. Generate and email any letter (with SMTP configured in `property.env`).
3. **Expected:** Email body matches template (e.g. offer mentions joining date & CTC).
4. Edit default template on `/email-templates` for a document type → regenerate → new wording used.

---

## Phase 12 — Portal polish & HR digest

### What was implemented
- Onboarding wizard **quick actions**: Accept offer, Confirm employment, link to documents
- Lifecycle widget on: dashboard, profile, documents vault, HR letters
- Daily **HR email digest** to `HR_CC_EMAIL` (when SMTP configured) summarizing alerts

### How to test
1. `/onboarding-workflow/:id` at offer stage → **Accept offer → Joining** button works.
2. Portal: `/employee/profile`, `/employee/documents`, `/employee/hr-letters` — each shows employment widget.
3. Set `HR_CC_EMAIL` + SMTP → wait for lifecycle job or trigger alerts → digest email received.

---

## Phase 13 — Document wizard & portal offer acceptance

### What was implemented
- **3-step document wizard** on `/documents`: (1) Employee → (2) Document → (3) Options & generate
- Employee **Accept Offer** on HR Letters (offer / internship offer / PPO)
- API: `POST /employee/hr-letters/:id/accept-offer`
- Payslip & salary details pages show lifecycle widget + offboarding hint

### How to test — Wizard
1. `/documents` → Step 1: select employee → Next.
2. Step 2: select document type → review gates/version history → Next.
3. Step 3: fill options → Generate PDF.

### How to test — Portal offer acceptance
1. HR generates and emails **Offer Letter** (employee at `offer`).
2. Employee logs into portal → `/employee/hr-letters`.
3. Click **Accept Offer** → confirm.
4. **Expected:** HR notified; stage → `joining` if was `offer`; badge “Offer accepted”.

---

## Phase 14 — HR analytics

### What was implemented
- Dashboard **Lifecycle** widget: onboarding count, unacknowledged offers, stage breakdown
- Insights **Lifecycle Alerts**: pending approvals, unacknowledged offers, probation/contract/exit lists
- Probation alert links → onboarding workflow

### How to test
1. HR dashboard `/` (or home) → Lifecycle widget shows counts.
2. Insights panel → Lifecycle Alerts card lists actionable items with links.
3. Create pending offer approval + employee at offer with unacknowledged letter → both appear in insights.

---

## End-to-end test flows (by employee type)

### A. Permanent hire (happy path)

| Step | Action | Where | Expected stage |
|------|--------|-------|----------------|
| 1 | Create employee | `/employees` | prospect |
| 2 | Generate offer letter | `/documents` (wizard) | offer |
| 3 | Approve offer (if queued) | `/document-approvals` | offer |
| 4 | Accept offer | HR: Lifecycle tab or onboarding wizard; or employee portal | joining |
| 5 | Generate appointment letter | `/documents` | active |
| 6 | Sync payroll (optional) | Lifecycle tab / auto on doc | active |
| 7 | Generate increment letter | `/documents` | active |
| 8 | Confirm employment | Lifecycle tab / onboarding wizard | confirmed |
| 9 | Initiate exit | `/exit-workflow/:id` | offboarding |
| 10 | Generate exit docs + checklist | Documents + exit wizard | offboarding |
| 11 | Complete exit | Exit workflow | exited |

### B. Paid intern → PPO → permanent

| Step | Action | Expected |
|------|--------|----------|
| 1 | Create Intern (stipend > 0) | prospect/offer |
| 2 | Internship offer letter | offer |
| 3 | Move to active (documents / manual stage) | active |
| 4 | PPO workflow → convert | Permanent, joining |
| 5 | Appointment letter | active |
| 6 | Continue as permanent path | — |

### C. Paid intern → exit

| Step | Action | Expected |
|------|--------|----------|
| 1 | Intern at active | active |
| 2 | Internship certificate + relieving | offboarding → exited |

### D. Contract renew → exit

| Step | Action | Expected |
|------|--------|----------|
| 1 | Contract employee with end date | active |
| 2 | Contract workflow → renew | new end date |
| 3 | Or non-renewal exit | offboarding |
| 4 | Standard exit docs | exited |

---

## Key URLs (quick reference)

| URL | Purpose |
|-----|---------|
| `/employees` | List, filter, import, lifecycle tab |
| `/documents` | 3-step generate wizard |
| `/document-approvals` | Offer approval queue |
| `/candidates` | Pre-hire pipeline |
| `/onboarding-workflow/:id` | Hire onboarding |
| `/contract-workflow/:id` | Contract renew / exit |
| `/ppo-workflow/:id` | Intern PPO / completion |
| `/exit-workflow/:id` | Exit & offboarding |
| `/email-templates` | Customize document emails |
| `/employee/dashboard` | Portal home + employment widget |
| `/employee/hr-letters` | Portal letters + accept offer |
| `/employee/profile` | Profile + employment widget |
| `/employee/payroll/payslips` | Payslips + lifecycle context |

---

## Key APIs (HR, authenticated)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/employees/:id/lifecycle` | Full lifecycle overview |
| POST | `/api/v1/employees/:id/lifecycle/offer/accept` | HR accept offer → joining |
| POST | `/api/v1/employees/:id/lifecycle/confirm` | Confirm employment |
| POST | `/api/v1/employees/:id/lifecycle/exit/initiate` | Start exit |
| POST | `/api/v1/employees/:id/lifecycle/exit/complete` | Finish exit |
| POST | `/api/v1/employees/bulk-import` | CSV import |
| GET | `/api/v1/employees/:id/generated-documents/versions?code=` | Version history |
| GET | `/dashboard/widgets` | HR dashboard KPIs |
| GET | `/dashboard/insights` | HR insights panel |

**Portal:** `POST /employee/hr-letters/:id/accept-offer`, `POST /employee/hr-letters/:id/acknowledge`

---

## Environment & server notes

- **Port:** 3002 (set in `property.env`)
- **SMTP** (optional): `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `HR_CC_EMAIL`, `APP_BASE_URL`
- Run **only one** of `npm run dev` or `npm start` (avoid EADDRINUSE)
- If port stuck: `lsof -ti:3002 | xargs kill -9`

---

## Automated regression (run before release)

```bash
npm run migrate
npm run seed:document-types
npm run test:lifecycle
npm run test:lifecycle:scenarios
```

For full HR UAT, also use: `docs/lifecycle-uat-checklist.md`

---

## What is intentionally out of scope (future)

- Full mobile-optimized wizard
- Lifecycle SLA / analytics export (CSV)
- Employee self-service probation confirmation (HR confirm exists)
- Bulk import with offboarding/exited stages (blocked by design)

---

*Last updated: reflects Phases 1–14 implementation in MINI-HR-360.*
