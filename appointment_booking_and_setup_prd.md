# Screen-by-Screen Product Requirements Document (PRD)
## Setup Journey: Locations → Team Availability → Services → Appointment Booking

---

## Overview

This document walks through the exact setup and booking workflow across the application screens:
1. **Screen 1: Organizations & Locations** (`/organizations` & `/settings`)
2. **Screen 2: Manage Team Member & Location Availability** (`/settings` → Manage Team Member)
3. **Screen 3: Services & Product Catalog** (`/services`)
4. **Screen 4: Schedule Appointment Drawer** (`/appointments`)

---

## Screen 1: Organizations & Locations

### 📍 Where in the App:
- **Route:** `/organizations` & `Settings > Organization Info`
- **Component:** `Organizations.tsx` & `Settings.tsx`

```
┌────────────────────────────────────────────────────────┐
│ + Add Organization / Edit Organization Modal            │
├────────────────────────────────────────────────────────┤
│ • Organization Name     (e.g., Demo Mantra)            │
│ • Country & Flag        (e.g., 🇺🇸 US, 🇮🇳 IN)           │
│ • Industry Category     (e.g., Healthcare, Dental)     │
│ • Locations Multi-Select:                              │
│   [ California Branch ] [ New York Branch ] [ Online ] │
└────────────────────────────────────────────────────────┘
```

### What the User Does:
1. Admin opens the Organization modal.
2. Admin enters the **Organization Name** and selects **Industry**.
3. Admin adds one or more **Locations** (e.g. *California Branch*, *New York Branch*, or *Online / Virtual*).

### What This Powers Downstream:
- These locations become available in the **Team Member Schedule Tab** (Screen 2).
- These locations populate the **Location Dropdown** in the **Appointment Booking Drawer** (Screen 4).

---

## Screen 2: Team Member Profile & Location Schedule

### 👤 Where in the App:
- **Route:** `Settings > Team Management > Manage Team Member`
- **Component:** `ManageTeamMember.tsx` & `MemberLocationScheduleTab.tsx`

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Manage Team Member: Dr. Sarah Johnson                                  │
├──────────────────────────────────────┬──────────────────────────────────┤
│ Left Sidebar:                        │ Tab: Location Schedule & Hours   │
│ • Name & Email                       │                                  │
│ • Role & Department                  │ Select Location: [ California ▾ ]│
│ • Permissions Grid                   │ Active at this location: [✓ Toggle]
│                                      │                                  │
│ Tab Bar:                             │ Weekly Hours:                    │
│ [ Location Schedule ] [ Days Off ]   │ Mon: [09:00] to [17:00] (Slot:30m)│
│ [ Services ]          [ Calendar ]   │ Tue: [09:00] to [17:00] (Slot:30m)│
│                                      │ Wed: [ Disabled / Off ]          │
│                                      │                                  │
│                                      │ [ + Add Day Off / Vacation ]     │
└──────────────────────────────────────┴──────────────────────────────────┘
```

### What the User Does:
1. **Assign Locations**: The admin picks a location from the dropdown (e.g., *California Branch*).
2. **Toggle Active Status**: Turns on *"Active at this location"*.
3. **Set Shift Hours & Slot Durations**:
   - For each day of the week (Mon–Sun), enables the day and selects Start Time (e.g., `09:00 AM`) and End Time (e.g., `05:00 PM`).
   - Sets default slot duration (e.g., `15m`, `30m`, `45m`, `60m`).
4. **Schedule Days Off**: Adds specific dates or half-days where the user is on leave.

### What This Powers Downstream:
- When booking an appointment at *California Branch* with *Dr. Sarah*, the system validates her exact shift hours and day-off calendar in real time.

---

## Screen 3: Services & Products Catalog

### 💼 Where in the App:
- **Route:** `/services`
- **Component:** `Services.tsx` (`servicesStore.ts`)

```
┌────────────────────────────────────────────────────────┐
│ + Add Service Drawer                                   │
├────────────────────────────────────────────────────────┤
│ • Service Name:       [ Initial Consultation ]         │
│ • Category:           [ Consultation ▾ ]               │
│ • CPT / Billing Code: [ 99203 ]                        │
│ • Duration:           [ 60 mins ]                      │
│ • Price & Tax:        [ $150.00 ]  Tax: [ 10% ]        │
│ • Assigned Staff:     [ Dr. Sarah ✕ ] [ John Smith ✕ ] │
│ • Description & Custom Fields                          │
└────────────────────────────────────────────────────────┘
```

### What the User Does:
1. Admin clicks **"+ Add Service"**.
2. Fills in **Service Name**, **Category**, **Duration** (e.g., 30 or 60 min), **Price**, and **Tax %**.
3. **Assign Staff Dropdown**: Selects all doctors/team members who are qualified to deliver this service.

### What This Powers Downstream:
- Selecting this service in the Appointment drawer **automatically populates the duration, invoice line items, and prices**, while cross-checking the provider.

---

## Screen 4: Schedule Appointment Booking Drawer

### 📅 Where in the App:
- **Route:** `/appointments` → Click **"+ Book Appointment"** or click a calendar slot
- **Component:** `ScheduleAppointmentDrawer.tsx`

### Visual Layout & How Fields Render Dynamically:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Schedule Appointment                                             [✕ Close]
├─────────────────────────────────────────────────────────────────────────┤
│ 1. CLIENT DETAILS                                                       │
│    Client: [ James Wilson ▾ ]                                           │
│    Email: james.w@example.com | Phone: +1 (555) 123-4567               │
│                                                                         │
│ 2. APPOINTMENT TIMING & LOCATION                                        │
│    Session Type:  (●) In-Person    (○) Video / Telehealth               │
│    Location:      [ California Branch ▾ ]                               │
│    Date & Time:   [ 2026-05-12 ]  at  [ 09:00 AM ▾ ]                    │
│                                                                         │
│ 3. PROVIDER & SERVICE                                                   │
│    Service:       [ Initial Consultation ($150 - 60 min) ▾ ]            │
│    Provider:      [ Dr. Sarah Johnson ▾ ]                               │
│                                                                         │
│    ⚠️ AVAILABILITY STATUS BANNER:                                       │
│    [ ✓ Dr. Sarah is active and available at California Branch on May 12 ]│
│                                                                         │
│ 4. BILLING & INVOICE (Auto-Generated from Service)                      │
│    [✓] Generate Invoice                                                 │
│    Line Item: Initial Consultation | 1 x $150.00 + 10% Tax = $165.00   │
│    Primary Insurance: [ Blue Cross Blue Shield ▾ ]                      │
│                                                                         │
│ 5. PROCESS & STAGE                                                      │
│    Process: [ Patient Intake ▾ ]   Stage: [ Scheduled ▾ ]               │
│                                                                         │
│                                            [ Cancel ]  [ Save & Book ]  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## How Dynamic Fields Work (Field by Field)

| Field in Drawer | How It Renders & What Controls It |
| :--- | :--- |
| **Client** | Dropdown listing all active clients from the CRM with phone & email auto-fill. |
| **Session Type** | Radio toggle: `In-Person` or `Video`. If `Video` is picked, Location automatically locks to **Online**. |
| **Location** | Dropdown showing the Organization's branches (*California, New York, Online*). |
| **Service** | Dropdown listing services from the Catalog. **Selecting a service instantly updates the appointment duration and populates the invoice preview.** |
| **Provider** | Dropdown listing team members. Shows doctors assigned to the service. |
| **Availability Warning Banner** | **Live validation box below Provider:**<br>• If provider is **off-duty** on that date → Shows ⚠️ *"[Provider] has a scheduled day off."*<br>• If provider **does not work at the chosen location** on that weekday → Shows ⚠️ *"[Provider] is not scheduled at [Location] on [Day]."*<br>• If all checks pass → Shows green checkmark ✓ *"[Provider] is active and available."* |
| **Invoice Line Items** | Checkbox toggle. When enabled, auto-adds the selected service as a line item with quantity, unit price, tax, and calculated total. |
| **Insurance** | Primary & Secondary Insurance dropdowns (e.g. *Blue Cross, Aetna, Medicare*). |
| **Process & Stage** | Dropdown mapping the appointment to a workflow pipeline (e.g., *Patient Intake → Scheduled*). |

---

## Screen-Wise Edge Cases & What the User Should Expect

### 1. Provider Not Active at Location
- **Scenario:** Dr. Sarah only works at *California Branch*, but staff selects *New York Branch*.
- **Expectation:** The system immediately displays an inline alert banner:  
  `⚠️ Dr. Sarah Johnson is not marked as active at New York Branch.`

### 2. Provider Working Hours on Given Day
- **Scenario:** Dr. Sarah works at California on Mon/Tue/Thu, but staff picks Wednesday.
- **Expectation:** The drawer displays:  
  `⚠️ Dr. Sarah Johnson is not scheduled at California Branch on Wednesdays.`

### 3. Provider Day Off / Vacation Override
- **Scenario:** Staff selects a date that Dr. Sarah has marked in her "Days Off" tab.
- **Expectation:** The drawer alerts:  
  `⚠️ Dr. Sarah Johnson has a scheduled day off (All Day: Vacation) on this date.`

### 4. Changing Service Mid-Form
- **Scenario:** User switches from a 30-minute *Follow-up Visit ($75)* to a 60-minute *Initial Consultation ($150)*.
- **Expectation:** The appointment duration updates from 30 min to 60 min, the end-time recalculates, and the invoice line items update to $150 automatically.

### 5. Video Session Selection
- **Scenario:** User clicks `Video / Telehealth`.
- **Expectation:** The location automatically sets to `Online (Virtual / Telehealth Consultation)`, bypassing physical branch constraints.
