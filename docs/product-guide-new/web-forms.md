# Web Forms & Form Builder

## What this page is for
The **Web Forms** screen allows you to create, edit, and manage client-facing web forms. You can use templates, design custom layouts using a visual builder, share forms with clients, and test form submissions inside a preview sandbox.

---

## Features on this page

### 1. Capsule Stat Metrics
- **What it does:** Displays thin horizontal capsule widgets at the top of the page showing key statistics: total submissions, completion rates, average completion time, and active forms count.
- **Why it helps you:** Provides a quick visual performance summary of all your active forms without clutter.
- **How to use it:** Read the capsule items at the top of the forms screen.

### 2. Forms Management Table
- **What it does:** Lists all active forms with details on field counts, completion counts, date created, and includes an Actions column for builder access, testing, and deletion.
- **Why it helps you:** Keeps all client forms organized in one table with quick actions.
- **How to use it:** Scroll through the list. Click on the action icons next to any form row to edit, delete, or test.

### 3. Create Form Templates
- **What it does:** A popup screen allowing you to choose pre-built form configurations like "Contact Form," "Appointment Booking," "Lead Generation," "Quote Request," or "Event Registration."
- **Why it helps you:** Saves time by starting with standard field layouts that you can later customize.
- **How to use it:** Click the blue **+ Create Form** button at the top right, select a template from the list, name your form, and click **Create**.

### 4. Drag-and-Drop Form Builder
- **What it does:** An interactive editor canvas where you can drag fields (Text, Email, Phone, Date, Time, Number) to design the visual form.
- **Why it helps you:** Lets you build customized forms tailored to your intake requirements without writing HTML code.
- **How to use it:** 
  - Drag field cards from the left panel onto the center canvas.
  - Hover over fields to click the edit pencil, update labels or placeholder text, and toggle the "Required" setting.
  - Drag fields vertically to rearrange their order. Click **Save** when done.

### 5. Form Testing Sandbox
- **What it does:** A simulation screen where you can preview the form exactly as a client would see it, fill in test inputs, submit, and see the database payload results.
- **Why it helps you:** Allows you to verify that fields and validations work correctly before sending form links to real clients.
- **How to use it:** Click the **Test** action icon next to a form. Fill in the preview inputs, click the submit button, and review the JSON payload database response below it.

---

## Common workflows

### Workflow A: Building an Appointment Booking form
1. Click **+ Create Form** and choose the **Appointment Booking** template.
2. The visual builder opens. Drag a **Date** field and a **Time** field onto the canvas.
3. Edit the date field label to "Preferred Appointment Date" and check "Required."
4. Click **Save Form**. Copy the shareable link to send to incoming leads.

### Workflow B: Testing form submissions
1. Find your "Contact Form" in the forms table and click the **Test** icon.
2. In the preview sandbox, type test information (e.g. name "John Doe" and an invalid email "john@").
3. Click the submit button. Check if the validator blocks the submission. Correct the email, click submit again, and inspect the database output structure at the bottom of the screen.
