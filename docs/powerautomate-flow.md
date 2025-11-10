Power Automate flow outline

Trigger:
- When a new response is submitted (Microsoft Forms) OR
- When an item is created in SharePoint list (recommended if using Power Apps)

Actions:
1. Get item / parse response
2. Set initial status = 'Pending'
3. Assign reviewer (via logic: round-robin, manager lookup, or fixed group)
4. Send approval request (Start and wait for an approval) to Reviewer(s) — include details and links to documents
5. On approval: update SharePoint item Status = 'Approved', add audit log entry, send notification to Requestor (Outlook + Teams)
6. On rejection: update Status = 'Rejected', add comments, notify Requestor
7. On implementation step: allow Admin to update Status = 'Implemented'; optional: trigger update to Spice Wax via API or export
8. Log all actions to audit column or dedicated Audit list (who, when, action, comment)

Conditions & Error handling:
- If attachments > threshold or large, store in document library and link the URL
- Retry on transient failures when updating Spice Wax (if used)

Outputs:
- Email/Teams notifications for each state change
- Export to CSV/Excel for audit (scheduled flow or on-demand)

Security:
- Use connection with least-privilege service account if automating writes to Spice Wax or external APIs
- Ensure Flow owner is a trusted admin in FCC tenant