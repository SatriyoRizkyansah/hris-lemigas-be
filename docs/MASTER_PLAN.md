Build a simple web-based HRIS (Human Resource Information System) for LEMIGAS. MVP focus: employee data management, assignment decrees (SK), organizational structure (Coordinator / Sub-Coordinator), and salary funding for Expert Staff (TA, "Tenaga Ahli") from either RO funds or the Coordinator's Operational funds. The application UI must be in Indonesian (Bahasa Indonesia); code, database schema, and documentation should be in English.

## 1. Roles & Access Rights

1. Superadmin
   - Full CRUD on all data: employees, work units, SKs, projects, ROs, fund allocations, users.
   - Can view all data and cross-coordinator dashboards.
2. Coordinator / Sub-Coordinator Head
   - Can only view data for their own unit (and the sub-coordinator units beneath it, if the user heads a Coordinator unit).
   - Can view the list of employees/TAs in the unit, the RO and Operational fund balances, and the usage breakdown.
   - Can propose/set the salary funding source for TAs in their unit (RO or Operational), following the rules in section 4.
3. Employee
   - Can only view their own profile and SK (read-only, except for certain contact fields).

## 2. Employee Types

Field `employee_type` with values: PNS, ASN (non-PNS, e.g. PPPK), Outsourcing, TA (Expert Staff).

- Base data for all employees: NIP/NIK/employee ID, full name, employee type, position, email, phone number, start date, active status.
- TA only: expertise/field, contract period (start-end), monthly salary/honorarium, and salary funding source.

## 3. Organizational Structure

- Hierarchical work units: Coordinator -> Sub-Coordinator.
- Each unit has: unit code, unit name, type (Coordinator / Sub-Coordinator), parent unit, unit head (relation to employee), and a clear description of the unit's scope of work and duties.
- Each employee is placed in exactly one active unit at a time, evidenced by an SK.

## 4. SK Assignment, RO Funds, and TA Salary Funding

### Employee SK (Decree)

- Each employee has one or more SKs (history). Fields: SK number, SK date, effective date, end date (optional), assigned unit (Coordinator / Sub-Coordinator), position, SK file (PDF upload), status (active/inactive).
- Only one active SK per employee. When a new SK is activated, the previous one automatically becomes inactive and is kept as assignment history.

### Projects & RO

- Project entity: code, name, fiscal year, funding source/provider.
- Each Coordinator has one or more ROs originating from Projects. RO fields: RO code, RO name, source project, owning coordinator, fiscal year, total budget ceiling, total used (auto-calculated), remaining (auto-calculated).
- A Coordinator's RO funds may only be used to pay TAs within that Coordinator (including its sub-coordinators).

### Coordinator Operational Funds

- Each Coordinator also has an Operational Fund pool with a yearly budget ceiling, used amount, and remaining balance.

### TA Salary Funding Source

- Each TA's salary is paid from one of: (a) a specific RO owned by their supervising coordinator, or (b) the supervising coordinator's Operational Fund.
- Store this as a TA salary allocation: TA, period (month/year), funding source (RO / Operational), RO reference (if RO), amount.
- One TA may be split across multiple funding sources in a single period (e.g. 60% RO, 40% Operational), with total allocation = the TA's salary.
- Validation: an allocation must not exceed the remaining balance of the funding source. Show a clear error if the balance is insufficient.
- RO/Operational balances decrease automatically when an allocation is saved, and are restored if the allocation is cancelled or changed.
- Keep an audit log (who, when, what changed) for every change to SKs, salary allocations, and budget ceilings.

## 5. MVP Features per Page

Superadmin:

- Dashboard: employee count per type, TA count per coordinator, summary of budget/used/remaining for RO and Operational funds per coordinator.
- Master data: Employees, Work Units, Projects, ROs, Operational Funds, Users & Roles.
- SK and assignment management.
- TA salary allocation + monthly recap (Excel export).

Coordinator / Sub-Coordinator Head:

- Unit dashboard: list of employees & TAs in the unit, RO and Operational balances.
- List of TAs and their salary funding sources; propose/set salary allocations for TAs in their own unit.
- RO usage breakdown per project.

Employee:

- My profile, active SK, SK/assignment history, work unit and unit head.

## 6. Technical Requirements

- Login authentication (email/username + password), hashed passwords, secure sessions.
- Role-based authorization enforced on the backend (not just hiding menus); unit heads must not be able to access other units' data via URL or API.
- All amounts in Rupiah (format Rp 1.000.000), stored as integers.
- Tables with search, filters (employee type, unit, status), and pagination.
- Responsive, clean design that is easy for non-technical staff.
- Include sample seed data: 2 Coordinators, 4 Sub-Coordinators, 15 employees of mixed types, 3 projects, several ROs, and 5 TAs with salary allocations.

## 7. Deliverables

1. Database schema (simple ERD + tables and relations).
2. A running application with all MVP features above.
3. README with installation steps, demo accounts for each role, and an explanation of the RO/Operational fund rules.

Out of MVP scope (do not build yet): attendance, leave, full payslips, tax/BPJS calculation, performance appraisal.

Before coding, first present a short plan (database schema + list of pages), then proceed with implementation.
