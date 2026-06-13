# Durbin-style backend deepening

This iteration extends the backend with operational modules commonly required by a private school / education ERP platform:

- Admissions pipeline: pipelines, stages, applications, entrance exams, decisions.
- Timetable: templates, lesson slots, teacher substitutions, conflict registry.
- Library: books, copies, loans, reservations.
- Health & Safety: student health records, nurse visits, incidents, emergency drills.
- Procurement: vendors, purchase requests, purchase orders, goods receipts.
- Assets: fixed assets, maintenance tickets, depreciation records.
- Advanced Finance: invoices, scholarships, refunds, cashboxes, bank transactions.

All modules expose authenticated, permission-protected v1 REST endpoints and are registered in AppModule.
