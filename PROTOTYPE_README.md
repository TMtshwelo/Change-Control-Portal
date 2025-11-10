ISV Change Control Portal — Prototype

What this contains
- `prototype/index.html`, `prototype/style.css`, `prototype/app.js` — a self-contained demo you can open in a browser. It stores requests in browser localStorage and provides an admin dashboard and CSV export for demos.
- `docs/sharepoint-list.json` — SharePoint list schema (fields & views) for PnP provisioning or manual configuration.
- `docs/powerapps-form.md` — Power Apps Canvas form field list and rules for the submission UI.
- `docs/powerautomate-flow.md` — Power Automate flow outline for approvals, notifications, and audit logging.

How to run the prototype (fast)
1. Open `prototype/index.html` in a browser (double-click or drag into browser). No server required for demo.
2. Submit sample requests using the form. Use the "Admin Dashboard" tab to change status, assign reviewers, add comments, and export CSV for audits.
3. To clear demo data: click "Reset Demo Data".

Talking points for Friday demo
- Shows end-to-end submission, status updates, assignment, and audit export.
- Mirrors fields and workflows described in the proposal and maps directly to the SharePoint schema.
- Next integration steps: replace localStorage writes with SharePoint list create item action (Power Apps or direct REST), attach documents to SharePoint/OneDrive, and hook approvals into Power Automate.

Next steps (recommended)
- Provision the SharePoint list using `docs/sharepoint-list.json` (adapt to PnP template or create manually).
- Build the Power Apps Canvas form using `docs/powerapps-form.md` and connect to the SharePoint list.
- Implement the Power Automate flow (`docs/powerautomate-flow.md`) to handle approvals and notifications.
- Scope Spice Wax integration: gather API docs and credentials, then implement an API connector in the flow or a custom Azure Function.

Deliverables for Friday
- Live demo using `prototype/index.html` (local) + slides showing integration path to SharePoint, Power Apps, Power Automate, and Spice Wax scope.

If you want, I can now:
- Generate a Power Apps field-by-field implementation guide (controls + formulas), OR
- Produce a PnP provisioning template for SharePoint, OR
- Convert the prototype to a minimal Node/Express demo that saves to a local file/SQLite for an on-machine demo.

Tell me which next step to take and I'll do it.