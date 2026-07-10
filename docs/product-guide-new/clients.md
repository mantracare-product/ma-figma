# Client & Contact Management

## What this page is for
The **Clients** screen is your customer database. It allows you to view, search, import, and organize all patients or clients, track which workflow stage they are currently in, assign them to team members, and view their complete communication timeline.

---

## Features on this page

### 1. Clients List & Customizable Table
- **What it does:** Displays a spreadsheet-like list of your clients with columns showing their Name, Contact Info, Active Processes, current Stage, Assigned Owner, and Last Contact date.
- **Why it helps you:** Keeps all customer data in one organized table. You can reorder column headers by dragging them to prioritize the information you care about most.
- **How to use it:** Scroll through the list. Drag and drop any column header left or right to rearrange the table layout. Click any column header to sort the list alphabetically or chronologically.

### 2. Search & List Filters
- **What it does:** Allows you to search for clients by name, phone, or email, and filter the list by active status (Active vs. Inactive), Country, Process, or Stage.
- **Why it helps you:** Lets you quickly pull up specific cohorts, such as "all clients in the Insurance Verification stage" or "all inactive clients in Canada."
- **How to use it:** Type a keyword in the search bar at the top of the table. Click the **Filters** button to toggle filter criteria, select your parameters, and watch the list adjust in real time.

### 3. Add Client Popup Form
- **What it does:** Opens a manual input form to create a new client record, set their initial stage, and assign a team member.
- **Why it helps you:** Lets you log new clients who contact your business through offline channels or walk-ins.
- **How to use it:** Click the blue **+ Add Client** button. Fill in their Name, Email, Phone, Country, select their starting Process and Stage, and click **Save**.

### 4. Bulk Import & Export
- **What it does:** Allows you to upload a list of clients in bulk from a `.csv` or spreadsheet file, or download your current client list as a spreadsheet.
- **Why it helps you:** Saves hours of manual entry by letting you sync contacts from external CRMs or old databases in seconds.
- **How to use it:** 
  - **Import:** Click **Import Clients**, choose your file, match your columns to MantraAssist fields, and upload.
  - **Export:** Click **Export Clients** to instantly download your current filtered view as a CSV spreadsheet.

---

## Client Profile Details (Drawer / Screen)

Double-clicking any client row or clicking the **View** icon opens the **Client Profile**.

### 5. Milestone Progression Bar
- **What it does:** A visual roadmap showing all stages of the client's current process, highlighting completed milestones and their current position.
- **Why it helps you:** Gives you and your agents an instant visual summary of how far this client has progressed in their onboarding or purchase journey.
- **How to use it:** View the colorful progress dots at the top of the profile drawer. Hover over any dot to see the stage name and completion status.

### 6. Interactive "Call Client" Button
- **What it does:** Triggers MantraAssist to place an outbound phone call to this client immediately.
- **Why it helps you:** Lets you run a manual follow-up or test a stage call flow directly from the client's profile without switching screens.
- **How to use it:** Click the green **Call Client** button in the profile header. The AI will start dialing their number.

### 7. Communication Timeline & Activity Log
- **What it does:** Displays a chronological feed of every interaction with this client, including calls, SMS texts, WhatsApp messages, email dispatches, CRM updates, and stage movements.
- **Why it helps you:** Provides a complete audit log. Any agent can review the timeline to see exactly what the AI receptionist said to the client and when.
- **How to use it:** Click the **Timeline** tab. Click on any call log entry to view the call summary, duration, or jump directly to the transcript.

### 8. Custom Client Variables (Fields Tab)
- **What it does:** Displays all custom data fields collected from the client during calls or forms (e.g., "Insurance Provider," "Preferred Location," or "Date of Birth").
- **Why it helps you:** Houses all client profile information in one place, allowing you to edit values manually if the client changes their details.
- **How to use it:** Click the **Fields** tab to see all current variables. To make edits, click **Edit Profile** at the top right, update the fields, and click **Save**.

---

## Common workflows

### Workflow A: Importing leads and assigning them to a process
1. Click **Import Clients** at the top right of the client screen.
2. Select your spreadsheet and map the name, phone, and email fields.
3. In the default configuration, assign the imported list to the "New Leads" Process at the "Initial Contact" Stage.
4. Click **Submit**. Your list of leads is imported, and the AI receptionist will start placing outbound calls based on the process schedule.

### Workflow B: Reviewing details before calling a client
1. Search for "Sarah Johnson" in the client search bar.
2. Double-click her row to open her **Client Profile**.
3. View the **Progression Bar** to see she is currently stuck at "Insurance Verify."
4. Click the **Fields** tab to check if her insurance policy number was captured.
5. Click the **Timeline** tab to review the last call transcript to understand why the verification failed before you call her.
