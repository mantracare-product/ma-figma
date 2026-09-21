# Patient Front — Today Page: Exact Spec, All States

Same rules as `patient-front-page-by-page-spec.md` §0 apply here — one heading, no restating subtext, nothing shown twice, no truncation, canonical data only, no tooltip-needed icons. This doc covers what specifically went wrong on Today and what each of its six states should contain — no more, no less.

---

## What's being deleted, and why (fix these first, everywhere)

1. **Delete the second "Procedure in Progress" card entirely** (currently appears in the In Surgery state, below the hero). The hero's headline ("Ramesh is in surgery with Dr. Meera Nair") and the stage track already say "in surgery" — a second card repeating that with its own eyebrow label, a timer, and a paragraph is duplicate content, exactly the rule this spec exists to prevent.
2. **Delete the three location cards** (Attendant Lounge / Nurse Station / Cafeteria). This is a real feature nobody asked for — building-wayfinding was never in the flow list. If it's genuinely wanted later, it gets designed deliberately as its own thing, not bolted onto the busiest screen in the app as three extra cards.
3. **Fix the timer box.** Whatever produced the dark, code-block-styled "`Started ~8 mins ago · ~15 min avg`" box — that's an unstyled/wrong-component artifact, not an intentional design choice. If elapsed time is shown at all, it's one plain line of text, not a monospace terminal-style box.
4. **Remove the second progress bar.** The 5-stage track at the top of the hero already shows progress. A second progress bar (the green fill bar under the timer) implying progress *within* a stage, next to a track implying progress *across* stages, is two different progress metaphors on one screen — confusing, not clarifying. Cut the second one.
5. **Stop stating "Stage X of 5" twice.** It currently appears as plain text (top-right of the card) *and* is shown again by which numbered circle is highlighted in the stage track directly below it. Keep the stage track as the single source of truth for stage position. Delete the redundant text label.
6. **Fix the amber pill.** "Scheduled for Today" uses amber/yellow — not in the locked `DESIGN_NAVODYA.md` palette (navy/slate, electric blue, emerald only). Use the same blue-tinted pill treatment as everything else on this page.
7. **Resolve the eye/"A" icon.** There's an unlabeled eye+"A" control in the header that looks like a second demo/simulator switcher, separate from the "Simulator" control already pinned at the bottom of the screen. There should be exactly **one** demo control, not two — consolidate into the existing bottom Simulator pill (add a Patient/Attendant view toggle there if that's what this was for). A real patient should never see an unexplained icon-only control in their header — if it's demo-only tooling, it belongs entirely inside the one Simulator affordance, not floating in the actual product chrome.
8. **Cut the clinical-jargon paragraph in the pre-check-in state.** "Right-Eye Cataract Phacoemulsification with Foldable Toric Lens" is chart language, not a daily-glance reassurance line — same rule as the v3 brief's Stage copy. Exact procedure terminology belongs on the prescription/document, not the hero someone glances at each morning.

---

## State 0 — Before check-in (morning of surgery, not yet arrived)

**Eyebrow:** `Today` *(one line — drop the duplicate "· Daycare Cataract Pathway" repetition of what the card below already says)*

**Hero card:**
- Status pill: `Today · 9:00 AM` *(blue tint, not amber)*
- Headline: **Your surgery is today at 9:00 AM**
- One line, not a paragraph: *"Right-eye cataract surgery with Dr. Meera Nair. Please arrive 15 minutes early."*
- Two pills, no more: `Dr. Meera Nair` · `Fasting required`
- One button: `Check In Now`

**Below:** the existing quiet list (Next appointment, Prescriptions, Account balance) — unchanged, this part is already right.

*No stage track in this state — the journey hasn't started yet. Correctly absent already, keep it that way.*

---

## State 1 — Checked In (Stage 1 of 5)

**Hero card:**
- Pill: `Right Eye Cataract · Daycare` *(no separate "Stage 1 of 5" text — the track below is the only stage indicator)*
- Headline: **Checked in for Cataract Surgery**
- 5-step stage track (unchanged — this component is correct)
- Three inline pills: `Dr. Meera Nair` · `Pre-Op Daycare Lounge (Bay 3)` · `~10 mins`
- One button: `Visit details`

**Below hero, only if unresolved:** the one Action Needed card — `Needs your signature` → `Review & sign`. Disappears once signed, per existing rule.

**Below that:** quiet list, unchanged.

*This state is already close to right — the main fixes here are dropping the redundant "Stage 1 of 5" text and confirming the action card truly disappears once resolved.*

---

## State 2 — Dilation & Drops (Stage 2 of 5)

Same card shape as State 1: pill (no stage-count text) + headline (**Pupil dilation in progress**) + stage track + pills (`Dr. Meera Nair` · location · wait time) + `Visit details` button. No action card in this state (nothing pending). Quiet list unchanged.

---

## State 3 — Pre-Op Prep (Stage 3 of 5)

Same shape again: headline **Getting ready for surgery** + stage track + pills + `Visit details`. No action card here — consent was already resolved in Stage 1. Quiet list unchanged.

---

## State 4 — In Surgery (Stage 4 of 5) — the state that needs the most correction

**Hero card only — nothing else on this screen except the hero and the quiet list below it:**
- Pill: `Right Eye Cataract · Daycare` *(no "Stage 4 of 5" text)*
- Headline: **Ramesh is in surgery with Dr. Meera Nair**
- 5-step stage track (unchanged, correct)
- One line, directly under the track, no separate card, no timer box, no second progress bar: *"Started 8 minutes ago · usually takes about 15 minutes."*
- One reassurance line: *"We'll let you know the moment he's out."* — that's the entire message. Cut the longer paragraph ("under the direct care of... operating suite... proceeding normally") down to this one line.
- No button in this state — there's nothing to tap. No `Visit details` here either, since there's no further detail to show that isn't already on screen.

**Below the hero:** quiet list, unchanged. **Nothing else on this screen.** No Procedure in Progress card, no location cards.

---

## State 5 — Recovery & Discharge (Stage 5 of 5)

Same card shape: headline **Ramesh is in recovery** + stage track + pills (`Dr. Meera Nair` · `Recovery Suite` · discharge readiness) + `Visit details`. If discharge instructions require action (e.g. confirming the eye-shield checklist from the v3 brief), that's the one Action Needed card, same pattern as State 1 — never a second card type invented for this state.

---

## The one rule underneath all of this

**The hero card, plus at most one Action Needed card, plus the quiet list below — that's the entire Today page, in every state.** Three blocks, maximum. If a build has more than three distinct card-shaped blocks stacked on Today at any point, that's the bug, regardless of which state it's in.
