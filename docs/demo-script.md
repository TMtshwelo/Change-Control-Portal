Friday demo script — ISV Change Control Portal (5–8 minutes)

Goal: Show quick end-to-end prototype and next steps for SharePoint/Power Platform integration.

1) Intro (30s)
- One-liner: "This is an MVP prototype for the ISV Change Control Portal — it demonstrates submission, review, status updates and audit export using FCC's Microsoft stack (SharePoint/Power Apps/Power Automate)."
- State deliverables: local demo + SharePoint schema + Power Apps/Flow guides.

2) Submission demo (1:30)
- Open `prototype/index.html` (or the Node demo at http://localhost:3000 if running the server).
- Fill the form: give a title, summary, priority, and submit.
- Note: in the static demo items are stored in browser localStorage; in the Node demo they persist in SQLite.

3) Admin actions (1:30)
- Switch to Admin Dashboard.
- Show how to assign a reviewer, add comments, and change status (Pending → Approved).
- Show the audit-style comments field updating.

4) Export & audit (30s)
- Click Export CSV (in static demo) or explain how the server-backed demo can export via a simple endpoint (we can add an export endpoint if needed).
- Point to `docs/sharepoint-list.json` and `docs/sharepoint-pnp.json` as the schema/provisioning artifacts for real deployment.

5) Integration plan & timelines (1:00)
- Short steps: provision SharePoint list (day 1), build Power Apps Canvas form + attachments (day 2), implement Power Automate approvals and notifications (day 3), scope Spice Wax integration (follow-up).
- Mention security & AAD authentication, and that Flow should use service account for external APIs.

6) Q&A and next steps (30s)
- Ask if they want the Node demo or the static demo for Friday. Offer to provision the actual SharePoint list and create the Power Automate flow next.

Notes for presenter
- If using Node demo: run server beforehand (see PROTOTYPE_README.md). Open http://localhost:3000
- If low internet or no access to tenant, use the static demo `prototype/index.html` which needs no server.

Attachments to share
- PROTOTYPE_README.md
- docs/powerapps-implementation.md
- docs/powerautomate-flow-detailed.md
- docs/sharepoint-pnp.json

Call to action
- Ask stakeholders for the SharePoint site details and a contact for Spice Wax API access so integration can be scoped and implemented after the demo.