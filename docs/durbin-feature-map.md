# Durbin-style backend feature map

This backend is structured around the public Durbin positioning: CRM, LMS, ERP and BI for private schools.

Implemented backend areas:

- CRM: leads, sources, pipeline stages, tasks, admissions.
- Identity: users, roles, permissions, sessions.
- Students and parents: student records, parent records, documents, parent-child relations.
- Academic settings: academic years, quarters, classes/groups, subjects, courses, rooms, lesson periods.
- Attendance: student and staff attendance, turnstile assignments.
- Finance/ERP: contracts, contract types, payment plans, payments, bank accounts, discounts, transactions.
- HR: departments, positions, staff members, leaves, payrolls.
- LMS: lesson schedules, journal entries, exams, exam results.
- AI homework workflow: homework assignments, submissions, teacher checking, AI feedback field.
- Notifications: templates, preferences, queued notifications.
- Integrations: external integration settings and credentials metadata.
- Appeals/feedback: appeals plus feedback tickets and comments.
- Inventory: categories, items, stock transactions.
- Youth services: meal menus and service requests.
- Gamification: student coin wallets, coin transactions, badges, awarded badges.
- KPI: metric definitions and KPI results for staff, students, classes and school.
- BI/reports: analytics dashboard, cashflow, P&L, payments by method, academic overview.
- Mobile parent portal: parent children list, child overview, meal menu endpoints.

Important note: this is a backend continuation based on the existing uploaded NestJS codebase and public Durbin module descriptions. Exact 1:1 parity with the private authenticated Durbin demo still requires a manual screen-by-screen UI audit and endpoint mapping.
