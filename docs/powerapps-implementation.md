Power Apps — Field-by-field implementation guide (Canvas App)

Purpose
This guide maps UI controls, formulas, and recommended properties for a Canvas app that submits ISV change requests to the SharePoint list.

Screen: RequestFormScreen (vertical layout)
- DataSource: 'ISV Change Requests' (SharePoint List)

Controls and bindings
1) Request Title
- Control: TextInput
- Name: txtTitle
- Default: ""
- Required validation: If(IsBlank(txtTitle.Text), Notify("Title is required", NotificationType.Error); false, true)

2) Requestor Name
- Control: Person/ComboBox (Use Office365Users connector) or TextInput for demo
- Name: cmbRequestor
- Default: User().FullName (or Office365Users.MyProfile().DisplayName)

3) Requestor Email
- Control: TextInput (or Person control)
- Name: txtRequestorEmail
- Default: User().Email
- Validation: IsMatch(txtRequestorEmail.Text, EmailMatch) where EmailMatch is a simple regex: "^\S+@\S+\.\S+$"

4) Department
- Control: Dropdown
- Name: ddDepartment
 - Items: ["Information Systems","Validation","Human Resources","Finance","Regulatory Affairs","Procurement","Operational Health and Safety","Commercial","Quality Assurance","Quality Control","Production","Engineering","Research and Development","Analytical Development","Supply Chain","Other"]
- Default: "ISV"

5) Summary
- Control: TextInput
- Name: txtSummary
- Required

6) Description
- Control: TextInput (Multiline)
- Name: txtDescription

7) Change Type
- Control: Dropdown
- Name: ddChangeType
- Items: ["Bug Fix","Enhancement","Config Change","Hotfix","Other"]

8) Priority
- Control: Dropdown or Toggle set
- Name: ddPriority
- Items: ["Low","Medium","High","Critical"]
- Default: "Medium"

9) Target Implementation Date
- Control: DatePicker
- Name: dpTargetDate

10) Documents
- Control: Attachments (SharePoint attachments) or TextInput for URL
- Name: attachDocs or txtDocuments

11) Spice Wax Reference
- Control: TextInput
- Name: txtSpiceWaxRef

12) Requested By / Requested Date
- Control: TextInput / DatePicker
- Names: txtRequestedBy, dpDateRequested
- Notes: Set default RequestedBy = User().FullName and DateRequested = Now()

13) Initiator
- Control: TextInput
- Name: txtInitiator
- Notes: Person responsible for initiating the assessment (may be same as Requestor)

14) System
- Control: Dropdown + TextInput (for 'Other')
- Names: ddSystem, txtSystemOther
- Items: core system names used by your environment (or allow free-text)

15) Policy form complete / SOP training complete
- Control: Toggle or CheckBox
- Names: chkPolicyFormComplete, chkSopTrainingComplete
- Notes: store boolean fields; use them in validation or gating before approval

16) Brief Description
- Control: TextInput (multiline)
- Name: txtBriefDescription
- Notes: short summary field for list views and cards

Buttons and formulas
- Submit button (btnSubmit)
  OnSelect:
    Set(varSubmitting, true);
    // Build a record to create
    Patch('ISV Change Requests', Defaults('ISV Change Requests'), {
      Title: txtTitle.Text,
      RequestID: Concatenate("REQ-", Text(Now(),"yyyymmdd-hhnnss")),
      RequestorName: If(IsBlank(cmbRequestor.Selected.DisplayName), User().FullName, cmbRequestor.Selected.DisplayName),
      RequestorEmail: If(IsBlank(txtRequestorEmail.Text), User().Email, txtRequestorEmail.Text),
      Department: ddDepartment.Selected.Value,
      Summary: txtSummary.Text,
      Description: txtDescription.Text,
      ChangeType: ddChangeType.Selected.Value,
      Priority: ddPriority.Selected.Value,
      TargetDate: dpTargetDate.SelectedDate,
      Documents: If(IsBlank(txtDocuments.Text), Blank(), txtDocuments.Text),
      SpiceWaxRef: txtSpiceWaxRef.Text,
      Status: "Pending",
      SubmittedDate: Now()
    });
    Notify("Request submitted", NotificationType.Success);
    Set(varSubmitting, false);
    // Optionally navigate to confirmation screen

- Save Draft (optional): same as Submit but set Status: "Draft"

Attachments handling
- If using the SharePoint Attachment control, the attachments will be saved automatically with Patch if the form is based on the SharePoint list form control.
- If using OneDrive links, upload files using Power Automate or the OneDrive connector after creating the item and update the Documents field with the link.

Validation
- Disable Submit unless required fields are valid:
  btnSubmit.DisplayMode = If(IsBlank(txtTitle.Text) || IsBlank(txtSummary.Text) || IsBlank(txtRequestorEmail.Text) || !IsMatch(txtRequestorEmail.Text, "^\\S+@\\S+\\.\\S+$"), DisplayMode.Disabled, DisplayMode.Edit)

Mobile considerations
- Use single-column vertical layout and larger tap targets.
- Avoid complex galleries on the submission screen.
- Test using the Power Apps mobile app and Teams embedded app.

Integration notes
- Use Power Automate to start approvals and further processing when a new item is added to the SharePoint list.
- To show the created item link, use the item's ID returned by Patch and construct a link to the SharePoint item page.

Security
- App should use current user's credentials; ensure SharePoint permissions only allow appropriate access.
- For automated updates (e.g., Spice Wax), use a dedicated service account with least privilege.