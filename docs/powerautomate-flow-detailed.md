Power Automate — Detailed implementation (step-by-step)

Goal
Implement an approval flow for ISV change requests that triggers on a SharePoint item creation and sends approval requests, updates status, logs audit entries, and notifies stakeholders.

Flow trigger
- Trigger: "When an item is created" (SharePoint)
  Site Address: <your site>
  List Name: ISV Change Requests

Actions (step-by-step)
1) Initialize variables
- Initialize variable 'requestId' (String) = triggerOutputs()?['body/RequestID']
- Initialize variable 'approverEmail' (String) = (logic to pick reviewer)

2) Determine reviewer
- Option A: Fixed reviewer
  Set variable 'approverEmail' to 'isv-reviewer@fcc.local'
- Option B: Manager lookup
  Get user profile (Office 365 Users) -> Manager -> mail
- Option C: Round-robin (store pointer in a SharePoint config list)

3) Start and wait for an approval
- Action: Start and wait for an approval
  Approval type: Approve/Reject - First to respond (or Everyone must approve)
  Title: concat('Approval: ', triggerOutputs()?['body/Title'], ' (', requestId, ')')
  Assigned to: variables('approverEmail')
  Details: include fields like Summary, Description, Documents link

4) Condition on approval outcome
- If outcome is 'Approve'
  - Update item: set Status = 'Approved'
  - Append to AuditLog field (concatenate existing value with new line: who, when, "Approved", approval comments)
  - Send email to requestor: Subject 'Your change request [RequestID] was approved'
  - Post a Teams message to channel (optional)
- Else (Rejected)
  - Update item: set Status = 'Rejected'
  - Append to AuditLog with reviewer comment
  - Send email to requestor with rejection reason

5) On manual implementation step
- Admin updates Status to 'Implemented' in SharePoint
- Optional: Create a separate flow "On item modified" that watches for Status == 'Implemented' and then
  - Trigger Spice Wax integration (HTTP action) or
  - Update other systems, or send notification

6) Audit logging
- Use 'Update item' to append a string to the AuditLog field. Example expression:
  concat(toString(utcNow()), ' - ', triggerOutputs()?['body/Editor']?['Email'], ' - ', 'Approved', ' - ', body('Start_and_wait_for_an_approval')?['comments'])

7) Error handling
- Add Configure run after (for key actions) to retry on failures
- Use Scope actions and configure Run After to capture failures and send admin notification with details

8) Export for audit
- Add on-demand "Export" flow with manual trigger that queries the list and creates an Excel/CSV file in SharePoint or OneDrive and sends to auditors

Security
- Use a service account or managed identity for external API calls (Spice Wax). Store credentials in Azure Key Vault or Secure Inputs within the flow.

Notes & sample expressions
- Get current user email: triggerOutputs()?['body/Author']?['Email']
- Append text to multiline field: concat(if(empty(triggerOutputs()?['body/AuditLog']), '', triggerOutputs()?['body/AuditLog'] & '\n'), variables('logEntry'))

Testing tips
- Create a test item with RequestID set and a test reviewer email you control.
- Use the Flow run history to debug inputs/outputs and sample expressions.

If you want, I can also generate:
- A paste-ready JSON definition for the approval step (body for Start an approval) that you can copy into the action, OR
- A second flow to export items weekly to an Excel file for auditors.