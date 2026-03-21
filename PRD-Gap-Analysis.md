# PRD vs Prototype Gap Analysis

## 1. Preconfigured Views

**PRD says:**

| View | Columns | Filters | Sort | Default Date |
|------|---------|---------|------|-------------|
| All Campaigns | Base, Delivery, Spend, CTR, ROAS | None (last 30 days activity) | Last Modified ↓ | Last 30 days |
| Needs Attention | Base, Delivery, Budget at Risk, Spend, CTR, ROAS | Pacing, CTR, ROAS under threshold | Budget at Risk ↓ | Last 30 days |
| Drafts | Base, Media Plan | Status = Draft | Last Modified ↓ | All time |
| Ending in 7 Days | Pacing, Spend, CTR, ROAS | End Date ≤ today+7; Status = Running/Paused | Last Modified ↓ | Last 7 days |

**Prototype has:**

| View | Columns | Filters | Sort |
|------|---------|---------|------|
| **Running** (not "All Campaigns") | name, id, status, destination, startDate, endDate, pacing, spend, budget, roasTotal, ctr, optimizations | None | Last Modified ↓ |
| **Attention** (not "Needs Attention") | id, name, status, destination, startDate, endDate, spend, budget, roasTotal, ctr, pacing, budgetAtRisk, optimizations | pacing < 90%, roasTotal < 2.0, ctr < 1.0% | Last Modified ↓ |
| **Draft** | name, id, status, destination, startDate, endDate, budget | Status = Draft | Last Modified ↓ |
| **Ending 7d** | Same + pacing, spend, budget, ctr, roasTotal | endDate filters + Status = Running/Paused | Last Modified ↓ |
| **Watchlist** (dynamic) | Appears when any campaign is starred | Starred campaigns only | — |

**Updates needed:**

- Rename "Running" → **"All Campaigns"** 
- PRD says "Delivery" column — Update PRD so Delivery = Pacing 
- Attention view thresholds need to be specified: **pacing < 90%, ROAS < 2.0, CTR < 1.0%** - Ensure these go into the PRD
- Attention view sort is Last Modified ↓ in prototype, not Budget at Risk ↓ - Update Prototype
- All views include an **Optimizations** column (not in PRD at all) - add the optimizations columnd to the standard views in PRD. Callout that it is pinned to the right side and always visible. Ensure it is not in the Draft view.
- Watchlist tab should be documented as a **dynamic preconfigured view tab** (appears/disappears based on starred campaigns) - There is no need for a watchlist tab. The watchlist functionality is the ability to pin campaigns to the top of any view. Campaigns that are pinned are always at the top as long as they are relevant to the filters in the view.
- Default date ranges per view are not differentiated in the prototype — all use the global date picker - In the PRD call out the updated Date Picker component with the detailed choices.

---

## 2. Quick Filters

**PRD says:** Status, Ad Types, Targeting, Objective, Media Plan

**Prototype has:** Status, Objective, Ad Types, Media Plan, **Platform**

**Updates needed:**

- **Remove "Targeting"** from quick filters (not in prototype) - Agreed
- **Add "Platform"** as a quick filter with options: Onsite, Google, Meta, Pinterest
- **Status options** — PRD lists ~18 statuses (Paused by user, Paused by system, Awaiting Verification variants, etc.). Prototype has 7: Draft, Scheduled, On Hold, Running, Rejected, Ended, Paused. Decide which is authoritative. - Use the statuses from the PRD, update the prototype
- **Ad Types options** — PRD includes HDCA types (In Grid, Carousel Banner, Premium Banner). Prototype does not have these. Prototype groups as: - the prototype groups are correct for Home Depot US. The PRD should specify that the correct available ad types flow into the filter for each retailer.
  - Onsite: Product Listing Ads, Auction Banner
  - Offsite: Google Search, Google PMAX, Pinterest Shopping, Pinterest Static Pins, Meta

- PRD should document the **display order** of quick filters: Status → Objective → Ad Types → Media Plan → Platform - agreed

---

## 3. Advanced Filter Operators

### Text Operators

**PRD:** equals, contains, does not contain

**Prototype:** is, is not

**Updates needed:**

- Prototype is **missing** "contains" and "does not contain" — add to prototype so it matches PRD
- Prototype uses "is" / "is not" naming — PRD uses "equals". Align the naming in the prototype to the PRD.

### Date Operators

**PRD:** is on, is before, is after, is before or on, is after or on (5 operators)

**Prototype:** is on, is on or before, is on or after (3 operators)

**Updates needed:**

- Prototype is **missing** standalone "is before" and "is after" —  remove from PRD

### Numeric Operators

**PRD:** is greater than, is less than, **is between**

**Prototype:** is greater than, is less than, **is equal to** (no "is between")

**Updates needed:**

- Prototype has "is equal to" instead of "is between" — keep "is between"
- If "is between" is required, it needs a dual-value input (min/max) that doesn't exist in the prototype - add the dual input to the prototype.

---

## 4. Advanced Filter Fields

### In prototype but missing from PRD - add all of them to the PRD

- **Clicks** (numeric)
- **Impressions** (numeric)
- **Online Sales** (numeric) - if available
- **Offline Sales** (numeric) - if available
- **Total ROAS / Online ROAS / Offline ROAS** (PRD just says "ROAS") - if available
- **Media Channel** (dropdown: Onsite, Offsite)
- **Platform** (dropdown: Meta, Google, Google, Pinterest)
- **Objective** (dropdown: Awareness, Consideration, Conversion)
- **Media Plan** (text)
- **Last Modified** (date)
 

### In prototype, add to the PRD:

- **Brand ID** — PRD says operators: equals, contains, does not contain. Prototype uses: "is any of", "is none of" with a **multi-text tag input** (comma/semicolon/newline separated). This is a significantly different UX.
**Ad Type** - ensure the values in the PRD matches the Prototype

---

## 5. Columns

### In prototype but missing from PRD column list - add all of these to the PRD

| Column | Category |
|--------|----------|
| Objective | Campaign Setup |
| Media Channel | Campaign Setup |
| Platform | Campaign Setup |
| Clicks | Performance |
| Impressions | Performance |
| Online Sales | Performance |
| Offline Sales | Performance |
| Total ROAS | Performance |
| Online ROAS | Performance |
| Offline ROAS | Performance |

**PRD has generic "Sales" and "ROAS"** — prototype splits these into Total/Online/Offline variants. PRD needs to reflect this granularity.

### Also missing from PRD:

- **Column Presets** — Prototype has quick presets: Performance, Engagement, Sales, plus user-created "My Presets" - remove from Prototype
- **Column Customizer Drawer** — search columns, organized by category, drag-to-reorder, save as preset - add to PRD
- The **Optimizations** column (always-visible, right-pinned) is not documented at all - add to PRD as a column, the details are in another PRD.

---

## 6. Pacing Popover (Not detailed in PRD)

The PRD mentions pacing context and Budget at Risk but does not describe the popover UI. The prototype has a rich popover that needs documenting:

**Trigger:** Hover on pacing cell (300ms delay)

### Tab 1 — Spend Projection:

- Line chart: actual spend (solid orange) vs target (dashed gray) vs projected (dashed orange)
- Right sidebar stats:
  - Total Budget (compact currency format)
  - Current Pacing (with trend: "+X% vs prior 7d")
  - % of Budget at Risk (color-coded: green for 0%, amber for underspend, red for overspend)
- Projected spend capped at budget ceiling

### Tab 2 — Daily Trend:

- Line chart: last 7 days actual vs expected daily spend
- Table breakdown: Day | Spend | Pace (%) with average row
- Copy button (copies table data to clipboard)

### Footer:

- "See campaign history" link

---

## 7. Date Range Picker Presets (Not specified in PRD) - add all to PRD

The PRD mentions time-based metrics but doesn't list the available presets. Prototype has:

- Today
- Last 7 Days
- Last 30 Days
- Last Week
- Last 4 Weeks
- Last 13 Weeks
- Last Month
- Last 3 Months
- Last 12 Months
- Custom Date Range

**Default:** Last 7 Days

**Compare options:** Year over Year, Period over Period (default)

**Calendar UI:** Dual calendar display (side-by-side consecutive months), month/year dropdowns, selected range highlighted in orange

---

## 8. Notes Feature - update the PRD to only callout the notes sections on the budget, schedule and on/off popouts

**PRD says:** Timestamped notes, private/public visibility

**Prototype has (PRD should add):**

- **Notes Drawer** (400px, right side) with search bar - remove from prototype
- **Tags system** — multiple tags per note, filterable - remove from prototype
- **Three visibility levels** (not two): Me Only, Associates Only, Everyone - remove from prototype
- **Filter popover** with: visibility checkboxes + tag checkboxes - remove from prototype
- **Note properties:** title, content, tags, visibility, date, createdBy - remove from prototype
- **Add Note dialog** with: title input, content textarea, tags input, visibility selector - remove from prototype

---

## 9. Optimization Recommendations (Not in PRD) - just add it as a column, no other details are needed in the PRD

The prototype has an **Optimizations column** that is always visible (right-pinned) showing:

- "Increase Bids" — for under-spending campaigns
- "Add Products" — for limited product coverage
- "2 Optimizations" — combined recommendations
- "Campaign Optimized" — no issues


---

## 10. Row Actions Menu

**PRD says:** Pause/resume, edit budget, extend end date. Also mentions "Delete Draft" for drafts and "End Campaign" for non-drafts.

**Prototype has:**

- Edit
- Copy Campaign (disabled)
- Duplicate to Another Store (disabled)
- Delete (generic, not context-sensitive)

**Updates needed:**

- PRD should document all four menu items - add to PRD, the text should say "keep existing action buttons and action button rules from current page"
- PRD mentions context-sensitive labels ("Delete Draft" vs "End Campaign") — prototype doesn't implement this yet. add to the prototype

---

## 11. Export

**PRD says:** One-click export for selected period

**Prototype has:** Export as CSV, Export as PDF

**Update needed:** Remove PDF option from Prototupe
- Also add a few more general details for the export. The PRD should state that the exports will show all of the campaigns within their existing filter, even if they're not on the first page, and export all of the columns they see within the campaign list. the exports should go straight to their downloads in their browser. 

---

## 12. Search

**PRD says:** Multi-keyword across campaign name, advertiser name, and campaign ID

**Prototype:** Appears to search primarily on campaign name

Ignore differences and keep both the same

---

## 13. Benchmarks (PRD feature not in prototype)

**PRD (2.3) says:** "Users can set self-determined goals for certain metrics as benchmarks so system flags campaigns below targets."

**Prototype:** No benchmark/goal-setting UI exists. The Attention view has hardcoded thresholds (pacing < 90%, ROAS < 2.0, CTR < 1.0%) but no user-configurable benchmarks.

**Decision needed:** Mark this as a fast follow in the PRD.

---

## 14. Sticky/Pinned Columns

**PRD (1.9) says:** Column headers are sticky to top of page

**Prototype has:**

- **Left pinned:** Toggle (64px), Star (28px), ID (60px), Name (200px)
- **Right pinned:** Optimizations (160px), Actions menu (40px)
- Horizontal scrolling with scroll shadows on hover
- Custom synchronized scrollbar

**Update needed:** Document the specific left-pinned and right-pinned columns in the PRD