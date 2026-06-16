Here is a detailed implementation prompt for the drawer updates:

---

## Prompt: Form Detail Drawer — Width, Structure & Layout Fixes

### 1. Increase Drawer Width

Change the drawer's `max-w-[560px]` to `max-w-[680px]`. This gives the content more breathing room and prevents it from feeling cramped when the page is visible behind the backdrop.

---

### 2. Add Edit Button to the Drawer Top Bar

In the drawer's top bar (the row that shows form name, status badge, last edited date, and close button), add an **Edit** button between the last-edited text and the close button:

```
[Form Name] [Live Badge] [Last edited May 3, 2026]   [Edit Button] [X]
```

- The Edit button: black background, white text, small — `px-3 py-1.5 text-xs font-semibold rounded-lg bg-black text-white hover:bg-black/90`, with a `Edit2` icon from lucide (w-3 h-3) to the left of the text "Edit"
- Clicking it calls `onEdit(form)` — same handler as before
- Remove the Edit button that was previously inside the Preview tab (the one rendered with `tab === "preview"` condition in the tabs row). The top bar Edit button replaces it and is always visible regardless of which tab is active.

---

### 3. Restructure the Overview Tab Content

Replace the current Overview tab content entirely with the following flat, structured layout. Each piece of information is its own labeled block, no nested cards, no green/amber banner wrappers for the link/embed sections:

The structure inside the overview scrollable area should be a single `div` with `px-6 py-5 space-y-5`:

**Block 1 — Description**
```
<label>DESCRIPTION</label>
<div>{form.description}</div>
```
Label: `text-xs font-semibold uppercase tracking-wide` in `#94A3B8`, `Outfit`
Value: `text-sm` in `#020817`, `Outfit`

**Block 2 — Form Fields count**
```
<label>FORM FIELDS</label>
<div class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg text-sm font-medium">
  <FileText icon w-3.5 h-3.5 />
  {form.fields.length}
</div>
```

**Block 3 — Created By**
```
<label>CREATED BY</label>
<div class="flex items-center gap-2">
  [Avatar initials circle - w-7 h-7 bg-gray-200 rounded-full]
  <span>{form.createdBy}</span>
</div>
```

**Block 4 — Created On**
```
<label>CREATED ON</label>
<div>{form.createdAt}</div>
```

Each block above is separated by a thin `<div class="h-px bg-border" />` divider.

---

**Block 5 — Live Link** (only if `form.status === "live"`, otherwise show the draft note below)

```
<label>LIVE LINK</label>
<div class="flex items-center gap-3 px-3 py-2.5 bg-gray-50 border border-border rounded-lg">
  <Link2 icon class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
  <span class="text-xs font-mono truncate flex-1 text-[#64748B]">{formUrl}</span>
  <button onClick={copy formUrl} class="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary hover:bg-blue-50 rounded-lg border border-border shrink-0">
    <Copy w-3 h-3 /> Copy link
  </button>
</div>
```

If `form.status === "draft"` instead of the link block, show:
```
<label>STATUS</label>
<div class="flex items-center justify-between px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
  <span class="text-xs text-amber-700">This form is a draft — publish it to get a live link.</span>
  <button onClick publish class="px-3 py-1.5 bg-black text-white text-xs font-semibold rounded-lg">Publish form</button>
</div>
```

Divider between block 4 and block 5.

---

**Block 6 — Embed Code** (only if `form.status === "live"`)

```
<label>EMBED CODE</label>
<div class="bg-gray-50 border border-border rounded-lg p-3 space-y-3">
  <code class="text-xs break-all leading-relaxed font-mono text-[#64748B] block">{embedCode}</code>
  <div class="flex items-center gap-2 flex-wrap">
    <button onClick={copy embedCode} class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-black text-white rounded-lg">
      <Copy w-3 h-3 /> Copy embed code
    </button>
    <button onClick={email developer} class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#64748B] hover:text-foreground">
      <Mail icon w-3.5 h-3.5 /> Email to developer
    </button>
    <label class="flex items-center gap-1.5 ml-auto cursor-pointer">
      <input type="checkbox" /> 
      <span class="text-xs text-[#64748B]">My form is embedded</span>
    </label>
  </div>
</div>
```

Divider between block 5 and block 6.

---

### 4. Remove from Overview Tab

Remove entirely:
- The "Your form is live" heading
- The "Embed on your website or share the link..." subtext
- The Create → Publish step indicator pills
- The "Share / Embed" button
- Any green-tinted `bg-green-50 border-green-200` wrapper div that wraps the link/embed sections

The link and embed code should now appear as plain labeled blocks (blocks 5 and 6 above) without any colored background container around them — just gray/neutral treatment consistent with the rest of the overview.

---

### Summary of all changes

| Change | Detail |
|---|---|
| Drawer width | `max-w-[560px]` → `max-w-[680px]` |
| Edit button | Move from inside Preview tab to top bar, always visible |
| Overview structure | Replace nested card layout with flat labeled blocks |
| Remove | Green banner, "Your form is live" header, Create/Publish pills, Share/Embed button |
| Live link block | Plain gray row with URL + Copy link button |
| Embed code block | Plain gray code block + Copy embed code + Email developer + checkbox |
| Draft state | Amber notice row with Publish button, no link/embed blocks shown |