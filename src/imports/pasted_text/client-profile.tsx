Here's the prompt:

---

I have a `Clients.tsx` file (provided above) that contains a fully built client profile side drawer rendered inside a `<Drawer>` component. I need you to extract that drawer's content into a completely standalone, self-contained page component called `ClientProfile.tsx` that lives at the route `/clients/:clientId`.

**Source of truth:** The `Clients.tsx` file above is the single source of truth. Every piece of UI, data, state, logic, and styling in the drawer must be replicated exactly in the new standalone component — not redesigned or simplified. This is a lift-and-shift with layout adaptation, not a redesign.

---

**FILE TO CREATE:** `src/pages/ClientProfile.tsx`

**ROUTE:** `/clients/:clientId` — read the `clientId` from `useParams()` and find the matching client from the `initialClients` array (copy it verbatim from `Clients.tsx` into this file).

---

**LAYOUT ADAPTATION:**

The drawer is currently ~480px wide and rendered as a sidebar. In the new standalone page, adapt it to a full-page layout:

- Outer wrapper: `min-h-screen bg-gray-50 py-6 px-[150px]` to match the Clients page padding
- Inner content container: `max-w-5xl mx-auto bg-white rounded-2xl border border-border shadow-sm overflow-hidden`
- The top header bar (client avatar + name + status badge) becomes the page hero section, padded `p-6 border-b border-border`
- The tab navigation (`Overview`, `Processes`, `Activity`, `Notes`) stays below the hero, same pill/underline style, full width
- Tab content renders in a `p-6` content area below the tabs
- Add a `← Back to Clients` button at the very top left (outside the white card), using `useNavigate()` to go back, styled as `flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4`

---

**TABS — replicate all four exactly:**

**Overview tab:** Identical to the drawer's Overview tab. All editable fields (Name, Status, Processes, Email, Phone, Location, Company, Role), the process pill manager with Add Process dropdown, custom fields list, "Select field" and "Create field" links, the Create Field popup overlay, the Select Fields modal, and the Save Changes / Discard buttons at the bottom. Every field input, focus style, label, and interaction must match.

**Processes tab:** Identical to the drawer's Processes tab. The stage progress bar with rectangle buttons and hover tooltips, the Status dropdown pill, Date/Time inputs in a 2-column grid, Responsible selector, Last Activity section with the full grid layout (Date & Time, Created By with avatar, Event Type badge, Description). All styles identical.

**Activity tab:** Identical to the drawer's Activity tab. Process filter chips (All + per-process), the activity list with icon circles, title, description, date/time, duration, status badges. All `getDrawerActivityIcon` and `getDrawerActivityColor` logic copied verbatim. Clicking a call activity item opens the Call Details section (described below).

**Notes tab:** Identical — textarea + Add Note button.

---

**CALL DETAILS:** In the drawer, clicking a call in the Activity tab opens a nested `<Drawer>` called `showCallDetailsFromProfile`. In the standalone page, instead render a collapsible section below the activity list (or a slide-in panel within the same page) when a call item is clicked. It must contain all the same sections: Summary (Client, Call Time, Type, Current Stage, Call Status, Duration), Recording Player (speed controls, play/pause, progress bar, download), and Transcript (scrollable, AI vs client messages with timestamps). All identical styling.

---

**STATE TO COPY VERBATIM:**

Copy all state variables that the drawer uses into this component:
`activeProfileTab`, `activeProcessTabDrawer`, `selectedProcesses`, `editingProcesses`, `processDropdownOpen`, `drawerProcessStages`, `hoveredStage`, `showFieldPicker`, `showSelectFieldModal`, `showCreateField`, `newFieldName`, `newFieldType`, `selectedFieldType`, `fieldRequired`, `fieldMultiple`, `fieldShowAlways`, `fieldTooltip`, `fieldVisibleToSelected`, `fieldNameError`, `fieldTypeError`, `customFields`, `selectedFieldsForModal`, `fieldSearchQuery`, `showCallDetailsFromProfile`, `selectedCallId`, `playbackSpeed`, `isPlayingRecording`.

---

**DATA TO COPY VERBATIM:**

- `initialClients` array — copy exactly as-is from `Clients.tsx`
- `availableProcesses` array
- `processStages` map
- `getStagesForProcess` function
- `drawerClientProcesses` derived variable logic
- `drawerActivityItems` derived variable logic
- `getDrawerActivityCount`, `filteredDrawerActivities`, `selectedDrawerProcess`
- `getDrawerActivityIcon`, `getDrawerActivityColor` functions
- `teamMembers` array
- `combinedStages` array

---

**IMPORTS:**

Use the same imports as `Clients.tsx` for the icons and components used in the drawer sections. Import `useNavigate`, `useParams` from `react-router`. Import `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuTrigger` from `../components/ui/dropdown-menu`. Import `toast` from `sonner`. Import `Button` from `../components/ui/Button`. Import `StageProgressBar` from `../components/StageProgressBar` if used.

---

**STYLING RULES — must match exactly:**

- Fonts: `DM Sans, sans-serif` for names, headings, bold labels; `Outfit, sans-serif` for body, inputs, badges, labels
- Colors: `#1F2937` for primary text, `#9CA3AF` for field labels, `#6B7280` for secondary text, `#4F8EF7` for primary blue actions, `#E5E7EB` for borders
- Field inputs: `backgroundColor: '#F8FAFC'`, `border: '1px solid #E5E7EB'`, `borderRadius: '6px'`, focus border `#4F8EF7`
- Process pills: `backgroundColor: '#4F8EF7'`, `color: '#ffffff'`, `borderRadius: '20px'`, hover shows X button
- Status badges: green `#DCFCE7`/`#10B981`, amber `#FEF3C7`/`#F59E0B`, gray `#F3F4F6`/`#6B7280`
- Stage progress rectangles: filled `#0EA5E9`, unfilled `#E5E7EB`, `28px × 8px`, `borderRadius: '2px'`
- Save button: `backgroundColor: '#4F8EF7'`, `height: '44px'`, full width
- All `border-t border-border pt-4` section dividers preserved

---

**DO NOT:**
- Redesign or simplify any section
- Remove any field, button, modal, or interaction
- Change any color, font, or spacing
- Add features not in the original drawer
- Create separate sub-component files — keep everything in `ClientProfile.tsx`