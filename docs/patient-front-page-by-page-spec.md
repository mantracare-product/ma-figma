# Patient Front — Exact Page-by-Page Content Spec

This replaces guesswork with literal copy. Build exactly what's written here — no additional subtext, no additional cards, no additional options "because it might be nice to have." If it's not listed on a page below, it doesn't belong on that page.

---

## 0. Rules that apply to every single page (this is what's been causing the crowding — fix these first, globally, then apply the per-page specs)

1. **One heading, no restating subtext.** A page is titled once. Do not add a second sentence underneath that just rephrases the title in more words. If the heading isn't self-explanatory, that's a sign the heading is wrong — fix the heading, don't pad it with an explanation.
2. **One primary action per page, visually dominant.** Every other action is smaller and quieter. If you can't tell which button matters most at a glance, there are too many buttons at equal weight.
3. **Nothing appears twice.** If something is shown as a "needs attention" callout, it does not also appear again lower down in a list. Pick one place for it to live.
4. **No truncation with "…".** If a title is too long, the copy is too long — shorten the actual text. Never cut a word off mid-way.
5. **One consistent cast of people, everywhere:** patient **Ramesh Iyer**, surgeon **Dr. Meera Nair**. No other doctor names appear anywhere in this build. If a second person is genuinely needed later (e.g. a referring GP), that's a deliberate decision to raise, not a random mock-data name.
6. **All appointment/document data belongs to the one cataract journey only.** This patient has one thing going on: right-eye cataract surgery and its immediate follow-up. No unrelated visits (glaucoma screening, X-ray, other specialties). If it doesn't relate to the cataract journey, delete it from the mock data.
7. **No tooltips as a fix for unclear labels.** If a label needs a tooltip to make sense, the label is wrong. Fix the word, don't add a hover explanation.

---

## 1. Visits page

**Header:** `Visits`
*(No subtext line beneath it. None.)*

**One primary action, top of page:** `Book appointment` button — the only button-styled element above the fold.

**Tabs:** `Upcoming` / `Past`
*(Not "Upcoming visits 5" / "Past encounters 1" — drop the counts, drop the word "encounters," keep both tabs the same part of speech.)*

**Delete the "Arrival Pass Ready" card entirely.** That information — which appointment, what date, what time — already lives in the list below. Don't show it twice. Instead: whichever appointment is happening soonest gets a `View pass` action directly on its row, and if it's arrival day, that row is visually distinguished (e.g. sits at the top, slightly emphasized) rather than duplicated into a separate card above the list.

**The list — exactly two rows, nothing else:**
- **Cataract Surgery (Right Eye)** — Dr. Meera Nair · Sept 21, 9:00 AM → actions: `View pass`
- **Post-Op Review** — Dr. Meera Nair · Sept 22, 10:30 AM → actions: `View pass`, `Reschedule` (smaller/quieter than View pass)

That's it. No slit-lamp consult, no glaucoma screening, no X-ray, no Dr. John Smith.

**Past tab:** empty for this demo (`"Nothing here yet"`, one line, no illustration, no further explanation needed) — this patient hasn't had a past visit yet in this scenario.

---

## 2. More page — restructure

**Delete the 3-way segmented control ("Documents & Rx / Billing & Insurance / Profile & Care Team") entirely.** That's a fourth navigation layer hiding under what was supposed to be a 3-tab simplification. Replace it with a flat list of three plain rows — tapping each opens its own simple page:

- **Documents**
- **Billing**
- **Profile**

**Do not create a separate "Care Team" page or section.** Dr. Nair's identity already appears everywhere it's contextually relevant — the Today hero, the Visits rows. A dedicated "who is treating me" page isn't needed for a single-doctor scenario; if it's needed later for multi-provider cases, that's a deliberate future decision, not something to bundle into Profile now.

---

## 3. Documents page

**Header:** `Documents`
*(No subtext.)*

**No filter pills** ("All Documents / Prescriptions / Forms & Waivers / Lab..."). This patient has three documents total. Filtering three items is pure overhead — a flat list is enough. (Add filters back only if the real list grows past roughly 8 items — not for this demo.)

**"Upload document"** stays, but demoted — a plain text link, not a large blue pill button. Viewing existing documents is why someone opens this page; uploading is secondary.

**One "needs attention" callout, shown once, never duplicated below:**
- `Pre-Procedure Eye & Allergy Assessment` — `Start form`

**Flat list below (the pending form above does NOT reappear here):**
- **Nuclear Cataract Grade II (Right Eye)** — prescription, Dr. Meera Nair, Aug 24 → `Open Rx`
- **General Medical History & Intake** — form, Completed

That's the entire page. No lab/imaging section for this demo — this patient hasn't had imaging done.

---

## 4. Billing page

**Header:** `Billing`
*(No subtext.)*

**Balance is the only thing that matters visually.** One large number: either `$0.00 — All paid up` or `$X owed`. Nothing else competes with it for attention.

**One button, only if balance > 0:** `Pay now`

**Flat itemized list below**, minimal — line items with amount, nothing more (no icons-in-boxes per row, no secondary descriptive sentence per line).

---

## 5. Profile page

**Header:** `Profile`
*(No subtext.)*

**Plain fields, nothing else:** name, phone, email, emergency contact. No care-team information here — see §2.

---

## 6. Applying this to Today and the stage drawer

Today and the stage content drawer were specified in detail in the prior brief (`patient-front-v3-today-first-brief.md`) and that spec still holds — but audit it against the same rules in §0 before calling it done: no restating subtext under the hero headline, no duplicated content between the hero and anything below it, no tooltips standing in for clearer labels.
