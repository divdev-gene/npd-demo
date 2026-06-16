# NPD Bundle Item Grid — Horizontal Table Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the vertically stacked accordion for NPD bundle items with a horizontally scrollable table where each row is one NCD sub-request.

**Architecture:** Pure UI change — swap the item grid section inside `renderStep2()`'s NPD branch. All state, validation logic, and data submission are unchanged. The shared fields section above the grid and everything in Step 1 and Step 3 are untouched.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, shadcn/ui, lucide-react

---

### Task 1: Replace the accordion with the horizontal table

**Files:**
- Modify: `src/app/(internal)/npd/new/page.tsx` (lines 486–631 — the `{/* Item grid */}` section inside the `typeOfWork === "NPD"` branch of `renderStep2`)

No new imports needed — `Check`, `CheckCircle`, `Link2`, `User`, `Plus`, `Trash2` are all already imported.

- [ ] **Step 1: Open the file and locate the section to replace**

The target section is the `{/* Item grid */}` div inside `renderStep2()`. It starts at line 486:

```tsx
          {/* Item grid */}
          <div className="space-y-3">
```

and ends at line 631 (the closing `</div>` of that `space-y-3` wrapper, just before the closing `</div>` of the overall NPD bundle `<div className="space-y-6">`).

- [ ] **Step 2: Replace the item grid section**

Delete lines 486–631 and insert the following in their place:

```tsx
          {/* Item grid — horizontal scrollable table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-amber-500 inline-block" />
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">NCD Items</h3>
                <span className="text-xs text-slate-400 font-normal">({bundleItems.length}/5)</span>
              </div>
              {bundleItems.length < 5 && (
                <button onClick={addBundleItem}
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 px-3 py-1.5 rounded-lg border border-blue-200 hover:border-blue-400 bg-blue-50 hover:bg-blue-100 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </button>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full border-collapse" style={{ minWidth: "1490px" }}>
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="sticky left-0 z-10 bg-slate-50 w-12 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">#</th>
                    <th className="w-[200px] px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-left">Item Name <span className="text-red-400">*</span></th>
                    <th className="w-[200px] px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-left">Commodity / SPOC <span className="text-red-400">*</span></th>
                    <th className="w-[220px] px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-left">Drawing Link <span className="text-red-400">*</span></th>
                    <th className="w-[140px] px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-left">Upload <span className="text-red-400">*</span></th>
                    <th className="w-[100px] px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-left">Sample Qty <span className="text-red-400">*</span></th>
                    <th className="w-[90px] px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Revision?</th>
                    <th className="w-[130px] px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-left">Revision No</th>
                    <th className="w-[120px] px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-left">CPL Sheet <span className="text-red-400 text-[9px]">*if rev</span></th>
                    <th className="w-[200px] px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-left">Remarks</th>
                    <th className="w-10 px-2 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bundleItems.map((item, idx) => {
                    const isItemValid = !!item.itemName.trim() && !!item.commodity &&
                      (item.commodity !== "Others" || !!item.customCommodity.trim()) &&
                      !!item.driveLink && item.drawingFile && !!item.sampleQty &&
                      (!item.hasRevision || item.cplAttached)
                    return (
                      <tr key={item.id} className={`border-l-2 transition-colors ${isItemValid ? "border-l-emerald-400" : "border-l-slate-200"}`}>
                        {/* # */}
                        <td className="sticky left-0 z-10 bg-white w-12 px-3 py-3 text-center">
                          <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mx-auto ${isItemValid ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"}`}>
                            {isItemValid ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : idx + 1}
                          </span>
                        </td>
                        {/* Item Name */}
                        <td className="px-3 py-3">
                          <Input placeholder="e.g. Copper Header Tube" value={item.itemName}
                            onChange={e => updateBundleItem(item.id, { itemName: e.target.value })} className="bg-white h-8 text-sm" />
                        </td>
                        {/* Commodity */}
                        <td className="px-3 py-3">
                          <Select value={item.commodity} onValueChange={(v: string | null) => { if (v) updateBundleItem(item.id, { commodity: v }) }}>
                            <SelectTrigger className="w-full bg-white h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Plastics">Plastics</SelectItem>
                              <SelectItem value="Sheet Metal">Sheet Metal</SelectItem>
                              <SelectItem value="Electronics & Electrical">Electronics &amp; Electrical</SelectItem>
                              <SelectItem value="Compressors & Motors">Compressors &amp; Motors</SelectItem>
                              <SelectItem value="Packaging & Others">Packaging &amp; Others</SelectItem>
                              <SelectItem value="Others">Others</SelectItem>
                            </SelectContent>
                          </Select>
                          {item.commodity === "Others" && (
                            <Input placeholder="Specify…" value={item.customCommodity}
                              onChange={e => updateBundleItem(item.id, { customCommodity: e.target.value })} className="bg-white h-7 text-xs mt-1" />
                          )}
                          {item.commodity && item.commodity !== "Others" && (
                            <div className="flex items-center gap-1 mt-1 px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                              <User className="w-2.5 h-2.5 text-blue-700 shrink-0" />
                              <span className="text-[10px] font-semibold text-blue-800 truncate">{SPOC_NAME_MAP[item.commodity]}</span>
                            </div>
                          )}
                        </td>
                        {/* Drawing Link */}
                        <td className="px-3 py-3">
                          <div className="relative">
                            <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                            <Input placeholder="https://drive.google.com/…" type="url" value={item.driveLink}
                              onChange={e => updateBundleItem(item.id, { driveLink: e.target.value })} className="pl-7 bg-white h-8 text-sm" />
                          </div>
                        </td>
                        {/* Upload */}
                        <td className="px-3 py-3">
                          <div onClick={() => updateBundleItem(item.id, { drawingFile: !item.drawingFile })}
                            className={`flex items-center justify-center gap-1.5 rounded-md border-2 border-dashed h-8 px-2 cursor-pointer transition-colors text-xs font-medium ${item.drawingFile ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-300 hover:border-blue-400 text-slate-500"}`}>
                            {item.drawingFile
                              ? <><CheckCircle className="w-3.5 h-3.5 shrink-0" /><span className="truncate">Uploaded</span></>
                              : <span>Upload</span>
                            }
                          </div>
                        </td>
                        {/* Sample Qty */}
                        <td className="px-3 py-3">
                          <Input type="number" min={1} placeholder="e.g. 5" value={item.sampleQty}
                            onChange={e => updateBundleItem(item.id, { sampleQty: e.target.value })} className="bg-white h-8 text-sm" />
                        </td>
                        {/* Revision? */}
                        <td className="px-3 py-3 text-center">
                          <Checkbox checked={item.hasRevision}
                            onCheckedChange={c => updateBundleItem(item.id, { hasRevision: c === true, cplAttached: false, revisionNo: "" })} />
                        </td>
                        {/* Revision No */}
                        <td className="px-3 py-3">
                          <Input placeholder="e.g. R02" value={item.revisionNo}
                            onChange={e => updateBundleItem(item.id, { revisionNo: e.target.value })}
                            disabled={!item.hasRevision}
                            className={`bg-white h-8 text-sm ${!item.hasRevision ? "opacity-40" : ""}`} />
                        </td>
                        {/* CPL Sheet */}
                        <td className="px-3 py-3">
                          <div onClick={() => { if (item.hasRevision) updateBundleItem(item.id, { cplAttached: !item.cplAttached }) }}
                            className={`flex items-center justify-center gap-1.5 rounded-md border-2 border-dashed h-8 px-2 text-xs font-medium transition-colors ${!item.hasRevision ? "opacity-40 pointer-events-none border-slate-200 text-slate-400" : item.cplAttached ? "border-emerald-400 bg-emerald-50 text-emerald-700 cursor-pointer" : "border-slate-300 hover:border-blue-400 text-slate-500 cursor-pointer"}`}>
                            {item.cplAttached
                              ? <><CheckCircle className="w-3.5 h-3.5 shrink-0" /><span>Attached</span></>
                              : <span>Attach CPL</span>
                            }
                          </div>
                        </td>
                        {/* Remarks */}
                        <td className="px-3 py-3">
                          <textarea rows={1} placeholder="Notes…" value={item.remarks}
                            onChange={e => updateBundleItem(item.id, { remarks: e.target.value })}
                            className="w-full rounded-md border border-input bg-white px-2 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
                        </td>
                        {/* Delete */}
                        <td className="px-2 py-3 text-center">
                          {bundleItems.length > 1 && (
                            <button onClick={() => removeBundleItem(item.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
```

- [ ] **Step 3: Type-check**

```bash
cd /home/div-dev/div_dev_code/New-Product-Development-Module && npx tsc --noEmit
```

Expected: no errors. If errors appear, they will be in the new JSX — fix them before continuing.

- [ ] **Step 4: Start the dev server and verify manually**

```bash
npm run dev
```

Navigate to `http://localhost:5001`. Log in (sets `localStorage.has_visited`). Click "Create New Request" in the sidebar. On Step 1, select **New Product Development (NPD)**. Click Continue.

Check on Step 2:
1. Shared fields section (Product Line, Plant, Priority, TAT) renders above the table — unchanged.
2. NCD Items table renders with a sticky `#` column and a horizontal scrollbar.
3. Filling Item Name, selecting a Commodity, entering a Drawing Link, clicking Upload, entering Sample Qty turns the row's left border emerald and the badge to a green checkmark.
4. Checking "Revision?" enables the Revision No input and CPL toggle; unchecking resets both.
5. "Add Item" adds a new row (up to 5). Delete button appears when more than 1 row exists.
6. Proceed to Step 3 — review tiles show correctly. Submit creates the bundle.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(internal\)/npd/new/page.tsx
git commit -m "feat(npd-wizard): replace bundle item accordion with horizontal scrollable table"
```
