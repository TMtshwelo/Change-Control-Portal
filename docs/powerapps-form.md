Power Apps (Canvas) form outline

Fields (mapped to SharePoint list):
- Request Title (Text) — required
- Request ID (Text) — auto-generated on submit (use GUID or concat)
- Requestor Name (Person) — default to Current User
- Requestor Email (Text) — default to Current User's email
- Department (Choice) — dropdown
- Summary (Text) — required
- Description (Multiline) — optional
- Change Type (Choice) — dropdown
- Priority (Choice) — dropdown
- Target Implementation Date (Date) — optional
- Documents (Hyperlink) — attach or link to OneDrive/SharePoint
- Spice Wax Reference (Text) — optional

Behavior / Rules:
- Validate email format for Requestor Email.
- Require Title, Requestor, Summary, Change Type, Priority.
- On submit: create item in SharePoint list and upload attachments to a dedicated document library / folder (OneDrive integration optional).
- Show confirmation with Request ID and link to list item.
- Mobile layout: use vertical form + compact controls; test on Teams mobile.

Buttons:
- Save/Submit (creates SharePoint item and triggers Power Automate)
- Save Draft (optional) — store in a Draft list or as item with Status='Draft'

Integrations:
- Use SharePointIntegration connector if deploying inside SharePoint.
- Use Azure AD for current user details.

Accessibility:
- Label controls clearly, set appropriate tab order and contrast for demos.