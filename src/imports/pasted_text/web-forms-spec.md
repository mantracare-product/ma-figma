# Web Forms: Intake Flows & Forms Table — Implementation Spec

This spec is based on the 10 reference screenshots of Healthie's Forms / Intake Flows feature. It describes exactly what to build inside `WebForms.tsx`, `FormBuilder.tsx`, and a few new supporting components, reusing existing helpers, state names, and design tokens already in the codebase wherever possible.

## Scope guard — read first

- **Do not touch `SubmissionsTab`, `subFormFilter`, `subStatusFilter`, or anything under `mainTab === "submissions"`.** That tab, its filters, its table, and its drawer stay exactly as currently implemented.
- All work happens inside `mainTab === "forms"`.
- No "Archived" tab — only the two sub-tabs requested: **Forms** and **Intake Flows**.

## 1. Forms section: sub-tab structure

Inside the existing `mainTab === "forms"` branch of `WebForms.tsx`, add a secondary tab row directly below the Submissions/Forms top-level tabs:

- New state: `const [formsSubTab, setFormsSubTab] = useState<"forms" | "flows">("forms")`.
- Two tabs, labeled **Forms** and **Intake Flows**, styled like the existing top-level tab row but one visual tier down (smaller text, thinner underline, less vertical padding) so the hierarchy reads clearly: Submissions/Forms (primary) → Forms/Intake Flows (secondary).
- The filter bar, search box, and content grid/table that follow are entirely different per sub-tab — render them conditionally based on `formsSubTab`, the same way `mainTab` already branches.
- Switching sub-tabs resets that sub-tab's own search/filter state; don't let a Forms-tab search query leak into the Intake Flows search box or vice versa.

## 2. Forms sub-tab: table view

Replace the current card grid entirely with a table.

**Top banner** (optional but recommended): a dismissible info banner above the table, same visual treatment as an existing info/alert style in the app (blue-tinted background, info icon, small text): *"These templates are a starting point — review and customize them to match your process before publishing."*

**Filter bar:**
- Search input ("Search forms…") — same component/styling as the current one, filtering by form name.
- Replace the previous per-form-name dropdown with a **Type segmented control**: `All Types / Standard / Intake` (pill buttons in a single bordered group, active pill filled). This requires adding `formType: "standard" | "intake"` to the `Form` type (default `"standard"`). Tag the "Patient Intake Form" template (added earlier) and similar onboarding-style forms as `"intake"` — this is what the Intake Flows builder will pull from.
- Keep the existing Live/Draft concept, but move it into the table as a column rather than a dropdown filter (see below) — search + Type covers the filter bar; status is visible at a glance per row instead.

**Table columns:** `Type` (pill: Standard/Intake) · `Name` (clickable, opens `FormDetailView`) · `Status` (existing Live/Draft badge) · `Submissions` · `Created By` (avatar initials + "Admin User", matching the sidebar identity already shown elsewhere in the app) · `Last Updated` (reuse `createdAt`) · `Enabled` (the existing toggle switch) · actions (`...` menu — same four items already implemented: View details, Edit, Share, Delete).

- Column headers are sortable: click toggles ascending/descending with a small chevron on the active column. Default sort: Last Updated, newest first.
- Row click anywhere outside the toggle/menu opens `handlePreviewClick(form)`, same as the current "View details" behavior.
- Reuse `handleToggle`, `handleEdit`, `handleDelete`, `handlePreviewClick` as-is — only the layout changes from cards to `<table>` rows, not the underlying handlers.
- Empty state: a single full-width row (not a 2-col grid card) with the same "No forms found" message and CTA copy already written, centered.

## 3. Intake Flows sub-tab: list view

A new table, separate state, separate search box ("Search intake flows…").

**Columns:** `Name` (clickable → opens the flow detail/editor) · `Forms` (a small badge showing the step count, e.g. "4", with a chevron that expands inline to list the contained form names without navigating away) · `Groups` (comma-separated tags, or "—" if none assigned) · `Created On` · actions (`...` menu: Edit, Duplicate, Delete).

**"Create intake flow" button** (top right, same primary button style as "New form") opens a modal:
- `Name*` — required text input, inline validation error if submitted empty ("Give this flow a name").
- `Which group(s) should use this flow?` — multi-select dropdown, optional. Treat "groups" as simple freeform/predefined tags (e.g. "New Leads", "Returning Clients", "VIP Clients") rather than a full segments system — keep it lightweight.
- `Cancel` / `Create` buttons. On Create: generate a new flow with empty `steps: []`, navigate straight into the flow detail/editor.

**Empty state** (no flows yet): centered card, friendly copy ("No intake flows yet — create one to guide new contacts through a sequence of forms automatically") with a "Create intake flow" CTA.

## 4. Intake flow detail/editor

Reached by clicking a flow row, or immediately after creating one.

**Header:** "← Back to Intake Flows" link · flow name as an inline-editable field (click pencil icon → becomes a text input → saves on blur/Enter, Escape cancels, can't save empty) · "Preview" button top right (see Section 5).

**Associated Groups:** shows count ("Associated Groups (0)"), pencil icon toggles a multi-select dropdown + "Update" button to save. Helper text below: *"Note: a group can only drive one active flow at a time — assigning it here will detach it from any other flow it's currently linked to."*

**Order of Forms** — the core of the editor. A vertical, sequentially-numbered list:
- Each step shows: ordinal badge (1st, 2nd, 3rd…), a thin connecting line/dot between consecutive steps to visually read as a sequence, the form's name, a `Required` checkbox (per-step, not a global form property — the same form can be required in one flow and optional in another), a `View` link, a `Remove` link, and a drag handle.
- Reordering: reuse the exact drag-and-drop pattern already built in `FormBuilder.tsx` for field reordering (`handleFieldDragStart` / `handleFieldDragOver` / `handleFieldDrop`) — apply the same three-handler shape to reorder `flow.steps` instead of `formFields`.
- `View`: opens a read-only preview of just that one form (reuse the field-list rendering already in `FormDetailView`, in a modal or slide-over — no need to build a second renderer).
- `Remove`: removes the step immediately, no confirmation needed for the common case; if it's the last remaining step, allow it (flow becomes empty) and show a small inline reminder: *"This flow has no forms yet."*

**Add a Form to this Intake Flow** — a "+" control at the bottom that expands inline with two modes, toggled by a link:
- **Existing form mode (default):** "Select existing form" dropdown — populated only with forms not already in this flow's steps (avoid duplicate steps) — plus a "Set form as required" checkbox (default checked) and an `Add` button. Link below: *"Or create a new form."*
- **New form mode:** "New form title" text input (placeholder example) + the same required checkbox + `Add` button. Link below: *"Or use an existing form"* to switch back.
- **On clicking Add (either mode):** if `flow.hasActiveClients` is true (i.e. at least one contact has already started/completed this flow), show a confirmation modal first — *"Add New Form to Intake Flow"* with copy explaining that clients who already started/completed the flow won't automatically be prompted for the new form, and that a completion request can be sent separately; buttons `Cancel` / `Add Form to Intake Flow`. If `hasActiveClients` is false, skip the modal and add immediately.
- **After confirming, new-form mode:** navigate into `FormBuilder` for the freshly created form, but in an embedded context: replace the normal Cancel/Save Draft/Publish footer with a "← Back to Intake Flow" link and a "Form saves automatically" autosave indicator (mirroring the standalone builder's header treatment). The new form is already appended to the flow's `Order of Forms` as the next step before navigating, so returning via the back link shows it in place — no second "add" step needed.
- **After confirming, existing-form mode:** append the step in place immediately, no navigation, show a success toast, reset the inline add control.

## 5. Preview mode

"Preview" opens a full-screen overlay (or dedicated route) with `Back` / `Next` navigation at the top, matching the reference screenshots closely, plus one improvement: a small step counter ("Step 2 of 5") next to the nav so long flows stay orientable — this wasn't in the reference but is worth adding.

- **Step 0 — Welcome:** a centered card with "Welcome [Client Name]," as a literal placeholder header, a quote-styled editable intro message (small quotation-mark glyphs framing it, pencil icon to edit inline), and an attribution line showing the sender name. Store `welcomeMessage` and `senderName` on the `IntakeFlow` object, defaulting to generic copy if unset. `Back` is disabled on this first step.
- **Steps 1..N:** each ordered form renders live using the existing `FieldRenderer` component (already used in the builder), in an interactive-but-non-submitting preview mode. `Next` is disabled until every field marked `required` on that form has a value, mirroring the disabled state visible in the reference screenshots; it enables once satisfied.
- **Final step:** `Next` becomes "Finish Preview" and closes the overlay back to the editor.
- **Zero-step flow:** show only the Welcome screen with a note ("Add a form to preview it here") and no enabled Next.

## 6. Edge cases & polish checklist

- Empty states needed in four places: Forms table (no forms / no search results), Intake Flows table (no flows / no search results), a flow with zero steps, and the existing-form dropdown when every form is already in the flow.
- **Deleting a form used in one or more flows:** warn before deleting — *"This form is used in N intake flow(s). Deleting it will remove it from those flows too."* — and cascade-remove the corresponding step from each affected flow on confirm, rather than leaving a dangling reference.
- Renaming a flow can't save an empty string; show inline validation rather than silently reverting.
- Sorting indicators on every sortable table header should look identical (same chevron, same active-column treatment) across the Forms table and any future sortable tables.
- Disable the "Add" button while its confirmation modal is open, to prevent double-submits.
- Reuse `SELECT_STYLE` / `SELECT_INLINE` and the existing font/color tokens (`DM Sans` / `Outfit`, `#020817`, `#64748B`, `#94A3B8`, `border-border`, `rounded-lg` / `rounded-xl`) on every new screen so nothing looks like it was pasted in from a different design system.
- Accessibility: drag handles, `...` menus, and any icon-only button need `aria-label`/`title`; modals need focus trapping and Escape-to-close; the inline-editable name fields need an associated label even when visually hidden.

## 7. Data model additions

```typescript
type FormType = "standard" | "intake";

interface FlowStep {
  formId: number;
  required: boolean;
}

interface IntakeFlow {
  id: number;
  name: string;
  groups: string[];
  steps: FlowStep[];
  welcomeMessage: string;
  senderName: string;
  hasActiveClients: boolean; // gates whether the "add form" confirmation modal appears
  createdAt: string;
}
```

Extend the existing `Form` type with `formType: FormType` (default `"standard"`) and `createdBy: string` (default `"Admin User"`) to support the new Type and Created By columns.

## Assumptions made (flag if any of these are wrong)

- "Groups" is implemented as lightweight freeform tags, not a full client-segments system.
- `formType` is a new field added to every form, defaulting existing forms to `"standard"`.
- Any form can be added to a flow regardless of type — `formType` is used for filtering/labeling only, not as a hard restriction, in this first pass.
- No "Archived" tab, per your explicit request for two sub-tabs only.