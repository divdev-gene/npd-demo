# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Genessence NPD Platform — Amber Enterprises

## Stack
Next.js App Router, TypeScript, Tailwind v4, shadcn/ui. No backend — localStorage only for demo.

## NPD Modules
@import .claude/rules/npd-ncd.md
@import .claude/rules/npd-ecn.md
@import .claude/rules/npd-alternate-supplier.md
@import .claude/rules/npd-compliance.md

## NTD Module
@import .claude/rules/ntd.md

## CAPEX Portal
@import .claude/rules/capex.md

## Agent Crew
@import .claude/rules/agents.md

## Development & Architecture
@import .claude/rules/file-discipline.md

## NTD Data Layer

All NTD persistence goes through `src/lib/ntd.ts`. Never write NTD localStorage keys inline — use the typed getter/setter pairs exported from that file (`getNTDInitiation` / `setNTDInitiation`, etc.). The `NTD_KEYS` constant in that file is the single source of truth for all NTD key names. New keys must be added there first.

`src/types/ntd.ts` owns all NTD TypeScript types. Add new types there; never inline them in page files.

### NTD shared components (`src/components/ntd/`)

| Component | Purpose |
|-----------|---------|
| `VersionedFileInput.tsx` | Renders a single `VersionedFile` slot — link input, version history, approve/comment/resolve actions |
| `ComponentApprovalBoard.tsx` | Stage 7/8 per-component status grid with iteration history drawer |
| `ComponentMergePanel.tsx` | Stage 2 merge/split UI; writes to `ntd_merges_{id}` and `ntd_initiation_{id}` |
| `ActivityFeed.tsx` | Reverse-chronological audit log tab; reads `ntd_activity_{id}` |

### NTD routes

| Route | File | Notes |
|-------|------|-------|
| `/ntd/[id]` | `src/app/(internal)/ntd/[id]/page.tsx` | Main stage orchestrator — all stages 1–11 in one file |
| `/ntd/[id]/dfm` | `…/dfm/page.tsx` | Stage 7 per-component DFM loop |
| `/ntd/[id]/mould-design` | `…/mould-design/page.tsx` | Stage 8A/8B mould design + joint review |
| `/ntd/[id]/trials` | `…/trials/page.tsx` | Stage 10 trial testing loop |
| `/rfq/ntd/[ntdId]/[vendorToken]` | `src/app/rfq/ntd/…/page.tsx` | Vendor open URL — quotation + thread |
| `/supplier/ntd/[ntdId]` | `src/app/supplier/ntd/…/page.tsx` | Supplier portal stages 6–11 |
| `/supplier/ntd/redesign/[ntdId]` | `src/app/supplier/ntd/redesign/…/page.tsx` | Post-trial mould resubmission portal |
