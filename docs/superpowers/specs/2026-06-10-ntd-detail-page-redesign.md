# NTD Detail Page Redesign — Design Spec
Date: 2026-06-10

## Goal
Match the NTD detail page (`/ntd/[id]`) visual pattern to the NCD page (`/npd/NPD-FY-2026-0001`) — card-stack layout, demo stage toolbar, and Rohan Desai as default SPOC.

## Change 1 — Card-Stack Layout

Replace the current stepper + single-card approach with a vertical card array matching the NCD pattern exactly.

**Card states per stage N:**
- `isDone = currentStage > N` → collapsed slate strip, `CheckCircle2` icon, summary text, no actions
- `isActive = currentStage === N` → colored border, full stage UI rendered inline
- `isUpcoming = currentStage < N` → `opacity-50`, `Circle` icon, locked label, no actions

**Stage rendering:**
- Stages 1–6: render existing Stage components inline inside the card
- Stage 7 (DFM): card with "Open DFM Review →" link to `/ntd/{id}/dfm`
- Stage 8 (8A/8B/8C): card with sub-stage cards + links to mould-design/trials sub-pages
- Stage 9: render Stage9 component inline

**Remove:** The StageStepper component — cards replace it visually.

**Card color accents (active border):**
- Stage 1: violet (R&D initiation)
- Stage 2: teal (dual sign-off)
- Stage 3: indigo (RFQ dispatch)
- Stage 4: amber (negotiations)
- Stage 5: blue (supplier selection)
- Stage 6: emerald (data upload)
- Stage 7: purple (DFM)
- Stage 8: slate/blue (manufacturing loop)
- Stage 9: slate (commissioning)

## Change 2 — Demo Stage Advance Toolbar

A fixed bottom strip visible always (this is a demo app).

**Controls:**
- "← Prev" button — calls `updateNTDStage(id, currentStage - 1)`, disabled at stage 1
- Stage badge showing current stage ("Stage N / 9")
- "Next →" button — calls `updateNTDStage(id, currentStage + 1)`, disabled at stage 9
- "Jump to:" dropdown (options 1–9)
- All controls re-read record from localStorage after update

**Placement:** Fixed bottom bar, `z-50`, slate-900 background, appears above page footer.

## Change 3 — Route Sourcing to Rohan Desai

In `ntd/new/page.tsx`:
- Hardcode `spoc: "Rohan Desai"` on the NTDRecord saved at creation
- Display "SPOC: Rohan Desai" as a read-only info field in the creation form

## Files Changed
- `src/app/(internal)/ntd/[id]/page.tsx` — full rewrite of layout section
- `src/app/(internal)/ntd/new/page.tsx` — add spoc field at save + display
