# Team & Organization Management

## What this page is for
The **Team & Organization** settings screens allow you to manage multiple business branch accounts (organizations), invite and assign team members, configure user permissions, connect calendar calendars, and customize staff schedules.

---

## Features on this page

### 1. Organization Switcher
- **What it does:** A drop-down menu in the sidebar that allows switching between separate organization or branch accounts (e.g. "Branch A" vs. "Branch B").
- **Why it helps you:** Keeps data separate for different clinics or businesses while letting managers switch between them with one click.
- **How to use it:** Click the organization name in the top left or top bar, and select a branch from the dropdown.

### 2. User Management List
- **What it does:** Displays all team members registered under the active organization, showing their role (Admin, Manager, Agent), email, and active status.
- **Why it helps you:** Provides a directory to add or remove staff and monitor who has access to the system.
- **How to use it:** Scroll through the user list. Click the **+ Add User** button to register a new team member, or use the menu on any row to edit or remove access.

### 3. Add User Permissions Setup
- **What it does:** Allows setting specific access rights when inviting a user, divided into Core (Dashboard, Clients, Calls), Operations (Processes, Numbers), and System (Billing, Webhooks, Settings) sections.
- **Why it helps you:** Ensures security. For example, you can allow receptionist agents to view call logs, but restrict them from editing billing details or AI process configurations.
- **How to use it:** Select either **View** or **Write** permissions for each module on the invite form, assign a role, and click **Save**.

---

## Manage Team Member Profiles

Clicking on a team member row opens their detailed profile settings, organized in tab menus.

### 4. Personal Information & Custom Fields
- **What it does:** Fields to enter contact details, gender, language, timezone, and add custom attributes.
- **Why it helps you:** Keeps team details organized and records individual timezone offsets for call scheduling.
- **How to use it:** Click the **Personal Info** tab, fill in the values, click **Edit Profile** to unlock editing, update information, and save.

### 5. Calendar Sync (Google & Outlook)
- **What it does:** Connects the staff member's external Google Calendar or Outlook Calendar to the platform.
- **Why it helps you:** Allows the AI receptionist to see real-time availability and book appointments directly onto their schedule without overlaps.
- **How to use it:** Under the **Calendar** tab, click **Connect Google Calendar** or **Connect Outlook**, log in, and grant calendar sync permissions.

### 6. Weekly Availability Hours
- **What it does:** Configures the days and hours (start and end times) during which the team member is available for client bookings.
- **Why it helps you:** Ensures the AI receptionist only schedules client appointments during official shift hours.
- **How to use it:** Select the **Availability** tab. Toggle weekday checkboxes on or off, and adjust the start/end time inputs (e.g. 08:00 to 16:00).

### 7. Days Off & Vacation Log
- **What it does:** Allows adding specific dates to the team member's vacation list, blocking off bookings for those days.
- **Why it helps you:** Prevents the AI from booking slots on public holidays or vacation periods.
- **How to use it:** Under **Days Off**, choose dates in the calendar picker, click **+ Add**, and save.

### 8. Assigned Services
- **What it does:** Links the team member to specific services they are qualified to perform (e.g. "Dental Checkup" or "General Consultation").
- **Why it helps you:** Allows the AI to match client booking requests to the correct staff member's schedule.
- **How to use it:** Click the **Services** tab, check the service packages this member can provide, and click **Save**.

---

## Common workflows

### Workflow A: Adding a new receptionist agent
1. Go to the **User Management** screen and click **+ Add User**.
2. Input name "Sarah Jenkins" and email. Set her role to **Agent**.
3. Under permissions:
   - Core (Clients, Calls): **View** or **Write**.
   - Operations (Processes, Numbers): **View** (no write access).
   - System (Billing, Settings): **None**.
4. Click **Invite**. Sarah receives an invitation email.

### Workflow B: Setting up shift hours and calendar sync
1. Open the profile of "Sarah Jenkins".
2. Click the **Calendar** tab and click **Connect Google Calendar**. Verify the account is connected.
3. Switch to the **Availability** tab. Check Monday through Friday.
4. Set hours to **09:00 AM - 05:00 PM**. Uncheck Saturday and Sunday.
5. Click **Save**. The AI will now book patient appointments onto Sarah's calendar during weekdays.
