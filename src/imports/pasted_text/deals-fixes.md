Looking at your code carefully, I can see exactly what needs to be fixed. Here's the precise prompt:

---

# MantraAssist — Stage Color Fix & Responsible Person Drawer Sync Prompt

---

## CONTEXT

The app has two files: `Deals.tsx` (Processes page) and `Settings.tsx`. The Settings file already has a fully built Team Member Profile Drawer (`isTeamDrawerOpen` / `Drawer` component) with Personal Info, Calendar, Availability, Days Off, Services, and Permissions tabs — including a full calendar with Day/Week/Month/Schedule views, connected accounts, Select Field, Create Field, and Save Changes button. The Deals file has its own `showTeamMemberDrawer` drawer which is incomplete. These two must be unified.

---

## FIX 1 — Stage Block Color Update on Click (List View)

### Current Problem:
In `Deals.tsx`, the list view stage segments use a flat color logic: `(isCompleted || isActive) ? '#64B5F6' : '#E8ECF0'` — meaning both completed AND active stages get the same light blue. There is no visual distinction between "completed before active" and "the current active stage."

### Required Fix:

In the `paginatedLogs.map()` table rows, find the stage segment button render and update the `backgroundColor` logic to this exact three-state system:

```javascript
backgroundColor: isCompleted
  ? '#1E88E5'        // completed stages: solid blue
  : isActive
  ? '#1A2B4A'        // active/current stage: dark navy
  : '#E8ECF0',       // future stages: light grey
```

Where:
- `isCompleted = segIdx < activeIdx` (all segments BEFORE the active one)
- `isActive = segIdx === activeIdx` (the clicked/current segment)
- future = `segIdx > activeIdx`

**On click behavior:**
- `setCallLogs(prev => prev.map(l => l.id === log.id ? { ...l, currentStage: getDealStageFromIndex(segIdx) } : l))`
- The `activeIdx` for that row is derived from `getDealStageIndex(log.currentStage)` — this must re-evaluate immediately after state update so the color re-renders
- Show toast: `Stage updated to ${stageName} ✓`

**Also fix the drawer stage bar** (`showViewDrawer`) using the same three colors:
- Completed rectangle: `backgroundColor: '#1E88E5'`
- Active rectangle: `backgroundColor: '#1A2B4A'`
- Future rectangle: `backgroundColor: '#E8ECF0'`

---

## FIX 2 — Responsible Person Click Opens Settings-Identical Team Member Drawer

### Current Problem:
In `Deals.tsx`, clicking the Responsible person's name inside the Process Viewer drawer opens `showTeamMemberDrawer` — a drawer built inside Deals.tsx that is incomplete (missing full calendar with month grid, missing Account Settings with Connected Accounts/Connect New Account accordion, missing Select Field/Create Field at bottom of Personal Info, has "Calendar integration coming soon" placeholder instead of real calendar).

The Settings.tsx `isTeamDrawerOpen` drawer is the complete, correct version with:
- Avatar with photo upload (camera icon overlay)
- Name + email in header
- Status badges: Email verified, Active member, Calendar connected
- Tabs: Personal Info | Calendar | Availability | Days Off | Services | (Permissions cut off but present)
- **Personal Info tab**: Full Name, Email, Phone, Gender, Date of Birth, Role, Language, Country, Timezone, Status toggle — all editable — plus `+ Select Field` and `+ Create Field` links at bottom
- **Calendar tab**: "Sync with your Calendar" hero card + full Day/Week/Month/Schedule calendar view with `+ Create` button + Account Settings accordion (Connected Accounts + Connect New Account)
- **Availability tab**: Day-by-day schedule with time slots and trash icons
- **Days Off tab**: Table with Date, Duration, Repeat columns + Add Day Off button
- **Services tab**: Assigned services cards with checkmarks, price, duration
- Fixed **Save Changes** button pinned at bottom

### Required Fix:

**Step 1 — Share the drawer state from Settings into Deals OR duplicate the complete drawer component:**

Since both pages are separate routes, the cleanest approach is to **extract the Team Member Drawer into a shared component** `TeamMemberDrawer.tsx` that accepts props:

```typescript
interface TeamMemberDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  member: {
    name: string;
    email: string;
    phone?: string;
    role?: string;
  } | null;
  zIndex?: number;
}
```

This component contains the **exact same JSX** as the `isTeamDrawerOpen` Drawer in `Settings.tsx` — complete with:
- All 6 tabs (Personal Info, Calendar, Availability, Days Off, Services, Permissions)
- Full month calendar grid with navigation arrows, day cells, event rendering
- Account Settings accordion (Connected Accounts + Connect New Account with 4 provider buttons)
- `+ Select Field` and `+ Create Field` action links at bottom of Personal Info
- Fixed Save Changes button at bottom
- Profile picture upload with camera overlay
- Status badges row
- All local state (calendarView, calendarEvents, showCreateEventModal, customPersonalFields, etc.) lives inside this component

**Step 2 — Wire it into Deals.tsx:**

Replace the current incomplete `showTeamMemberDrawer` Drawer block in `Deals.tsx` with:

```jsx
<TeamMemberDrawer
  isOpen={showTeamMemberDrawer}
  onClose={() => { setShowTeamMemberDrawer(false); setSelectedTeamMember(null); }}
  member={selectedTeamMember}
  zIndex={9999}
/>
```

**Step 3 — Trigger correctly from the Responsible field:**

In the Process Viewer drawer General Information tab, the Responsible field currently has two click zones. Fix the name/avatar click zone to:

```javascript
onClick={() => {
  const member = teamMembersData.find(m => m.name === currentValue);
  if (member) {
    setSelectedTeamMember({
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.role,
    });
    setShowTeamMemberDrawer(true);
  }
}}
```

The drawer that opens must be visually **identical** to what opens in Settings → Team when you click a team member name — same layout, same tabs, same calendar, same fields, same Save Changes button.

**Step 4 — Z-index stacking:**

The TeamMemberDrawer must render at `zIndex: 9999`, above the Process Viewer drawer at `zIndex: 501`. When the TeamMemberDrawer is open, the Process Viewer drawer must have `pointerEvents: 'none'` applied. Closing the TeamMemberDrawer restores pointer events to the Process Viewer.

```javascript
// In the Process Viewer drawer container div:
style={{
  pointerEvents: showTeamMemberDrawer ? 'none' : 'auto',
  // ... other styles
}}
```

---

## FIX 3 — Ensure teamMembersData is Available in Deals.tsx

The `teamMembersData` array in Deals.tsx currently has objects with `name`, `role`, `email`, `phone`. Make sure these match what the TeamMemberDrawer expects so the correct person's data populates when their name is clicked from the Responsible field.

If `teamMembersData` in Deals.tsx is missing `phone`, add it:

```javascript
const teamMembersData = [
  { name: "John Smith", role: "Senior Therapist", email: "john.smith@mantraassist.com", phone: "+1 555-0101" },
  { name: "Sarah Johnson", role: "Patient Coordinator", email: "sarah.j@mantraassist.com", phone: "+1 555-0102" },
  { name: "Michael Chen", role: "Insurance Specialist", email: "m.chen@mantraassist.com", phone: "+1 555-0103" },
  { name: "Emily Davis", role: "Billing Manager", email: "emily.d@mantraassist.com", phone: "+1 555-0104" },
  { name: "Robert Wilson", role: "Care Coordinator", email: "rwilson@mantraassist.com", phone: "+1 555-0105" },
  { name: "Jessica Brown", role: "Front Desk", email: "j.brown@mantraassist.com", phone: "+1 555-0106" },
  { name: "David Martinez", role: "Follow-up Specialist", email: "d.martinez@mantraassist.com", phone: "+1 555-0107" },
  { name: "Amanda Taylor", role: "Office Manager", email: "a.taylor@mantraassist.com", phone: "+1 555-0108" },
];
```

---

## SUMMARY OF CHANGES

| File | Change |
|---|---|
| `Deals.tsx` | Fix stage segment colors to 3-state: blue/navy/grey |
| `Deals.tsx` | Fix drawer stage bar to same 3-state colors |
| `Settings.tsx` | Extract Team Member Drawer to `TeamMemberDrawer.tsx` shared component |
| `TeamMemberDrawer.tsx` | New shared component — exact copy of Settings drawer with all 6 tabs, full calendar, account settings, save button |
| `Deals.tsx` | Replace incomplete drawer with `<TeamMemberDrawer />` |
| `Deals.tsx` | Wire Responsible name click to open `TeamMemberDrawer` with correct member data |
| `Deals.tsx` | Apply `pointerEvents: none` to Process Viewer when TeamMemberDrawer is open |