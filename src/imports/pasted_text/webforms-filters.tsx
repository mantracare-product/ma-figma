Here's the prompt:

---

I have a `WebForms.tsx` file that is already complete and working (the full code was provided in the previous message, document index 3). I need you to make targeted changes to the filter UI in both the **Submissions tab** and **Forms tab**. Do not change anything else — all existing functionality, layout, data, types, styles, `FormDetailView`, routing, stats cards, and the detail view must remain exactly as-is.

---

**CHANGE 1 — Submissions tab: replace pill filters with two dropdowns + add Status column to table**

**1a. Filter bar above the table:**

Keep the `flex-1` search input exactly as-is (Search icon + placeholder "Search submissions…", filters by `name` or `email`).

Remove the individual form pill toggles. Replace them with two dropdown selects, side by side to the right of the search input:

**Dropdown 1 — "All Forms"**: a `<select>` styled as `px-3 py-2 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20` with `fontFamily: "Outfit, sans-serif"`, `color: "#64748B"`. Options:
```
All Forms (value: "all")
Contact Us (value: "1")
Book a Demo (value: "2")
Support Request (value: "3")
Newsletter Signup (value: "4")
```
When a form is selected, filter submissions to only show rows where `submission.formId === parseInt(value)`. Default: "all" shows everything.

**Dropdown 2 — "All Statuses"**: a `<select>` with identical styling. Options:
```
All Statuses (value: "all")
Completed (value: "completed")
Sent (value: "sent")
Pending (value: "pending")
Failed (value: "failed")
```
Since submissions don't currently have a `status` field, add a `status?: string` optional property to the `Submission` type and assign dummy statuses to `DUMMY_SUBMISSIONS` as follows:
- id 1: "completed"
- id 2: "sent"
- id 3: "completed"
- id 4: "pending"
- id 5: "completed"
- id 6: "sent"
- id 7: "failed"
- id 8: "pending"

When a status is selected, filter to only show submissions where `submission.status === value`. Default "all" shows everything. All three filters (search + form dropdown + status dropdown) must compose simultaneously.

**1b. Add a "Status" column to the submissions table:**

Add a new `<th>` column header "Status" between the "Date submitted" column and the empty action column. It should have the same header style as the other `<th>` elements.

In each `<tr>`, add a corresponding `<td>` that renders a small status badge based on `submission.status`:
- `"completed"` → `bg-green-100 text-green-700` pill with text "Completed"
- `"sent"` → `bg-blue-100 text-blue-700` pill with text "Sent"
- `"pending"` → `bg-amber-100 text-amber-700` pill with text "Pending"
- `"failed"` → `bg-red-100 text-red-700` pill with text "Failed"
- undefined/missing → `bg-gray-100 text-gray-600` pill with text "—"

Badge style: `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium`, `fontFamily: "Outfit, sans-serif"`.

The Status column `<td>` goes between the date column and the action (View button) column.

---

**CHANGE 2 — Forms tab: replace pill filters with two dropdowns inline in the filter bar**

Currently there is a search input + Sliders toggle button that reveals a filter panel below. Replace this entire two-row approach with a single-row filter bar that has no toggle panel — everything is always visible inline:

```
[Search input — flex-1] [Status dropdown] [Sort by dropdown]
```

**Status dropdown**: `<select>` with identical styling to the dropdowns in Change 1. Options:
```
All Forms (value: "all")
Live (value: "live")
Draft (value: "draft")
```
Filters `form.status`. Default: "all".

**Sort by dropdown**: `<select>` same styling. Options:
```
Newest first (value: "newest")
Most submissions (value: "most")
A → Z (value: "az")
```
- "newest": sort by `createdAt` date descending — parse strings like "May 3, 2026" using `new Date(form.createdAt)` and sort descending
- "most": sort by `form.submissions` descending
- "az": sort `form.name` alphabetically ascending

Default: "newest".

All three (search + status + sort) compose on `filteredForms`. Remove the old `showFilterPanel` state, `Sliders` import (if no longer used elsewhere), and the two-row filter approach entirely. Remove "Clear filters" button — it's no longer needed since dropdowns are always visible and can be reset by the user directly.

---

**STYLE RULES for all new dropdowns:**

```
className="px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}
```

Wrap each dropdown in a `shrink-0` container so it never compresses. Do not add custom dropdown arrow styling — use the browser native `<select>` appearance. Keep both dropdowns a consistent `min-w-[140px]`.

---

**DO NOT CHANGE:**
- `FormDetailView` component
- `SubmissionDrawer` component
- `StatusBadge` component
- All type definitions except adding `status?: string` to `Submission`
- `INITIAL_FORMS` data
- Stats cards
- Tab switcher
- Header and New form button
- Routing and navigation logic
- Any imports that are already used