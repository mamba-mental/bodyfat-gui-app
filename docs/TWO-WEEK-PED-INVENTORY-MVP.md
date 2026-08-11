# Two-Week PED Inventory MVP

**Verified:** August 11, 2026

**Status:** Available manual/deterministic Tonight MVP. The broader AI inventory scheduler remains incomplete.

## What is available now

The guided 14-day setup in **Plans** can now:

1. Store editable, local PED inventory records.
2. Require confirmation of the exact label name, canonical compound, form, amount per physical unit, units on hand, and expiration.
3. Expand the selected source weeks into individual dated events.
4. Match those events to confirmed, unexpired inventory with Decimal-based arithmetic.
5. Block activation for unresolved source ranges, missing or unconfirmed inventory, incompatible units, expiration conflicts, non-divisible tablet/capsule strengths, and shortages.
6. Preserve a separately reviewed value for a literal source range without changing the original source text.
7. Freeze the coverage and documented review record into the activated plan revision, Command Center, and generated report.
8. Keep the editable source template and future-day amendment path available without rewriting elapsed days or historical reports.

Inventory is a supply constraint only. The application does not use inventory to choose a protocol, recommend a compound, claim interaction safety, or create a new regimen.

## Use it tonight

1. Open `http://localhost:3010/plans` and select **Start a 14-day cut**.
2. Complete **Basics** and review **Diet & Training**.
3. In **PED Schedule**, choose the two source weeks.
4. In **PED inventory & exact coverage**, add every container or package you intend to match.
5. For injectable inventory, enter the label concentration as the amount per mL and enter the total mL physically on hand.
6. For oral inventory, enter the amount per tablet or capsule and the number physically on hand.
7. Confirm each item only after checking the label, units, quantity, and expiration.
8. If the source contains a range, record the exact value that was separately reviewed. The app verifies only that the value remains inside the literal source range.
9. Enter the reviewer name, reviewer role, and a short review note. Check the member inventory confirmation and separate-review attestation.
10. Check the existing safety acknowledgement.
11. Continue to **Readiness**, accept the source/safety acknowledgement, and select **Check readiness**. Resolve every blocker shown in the checklist or inventory coverage. The app saves the current template details automatically when needed.
12. Select **Review my plan** and confirm the exact frozen report inputs.
13. Select **Start 14-Day Cut**.
14. Open the 14-Day Command Center. Each day shows the source schedule and the exact inventory-backed events used for that revision.
15. Generate a progress report at any time or a final report after all 14 days are logged. The report includes the frozen inventory coverage and review provenance.

Starting a 14-day cut replaces the previously active cycle by stopping it; it does not delete that cycle, its entries, or its reports.

## What can be edited after setup

- **Before activation:** edit the template, start date, selected source weeks, inventory, reviewed range values, and review evidence; then build a new preview.
- **After activation:** completed/elapsed days and the activated snapshot remain immutable. Changes for future uncompleted days must use the amendment flow, include an effective day and reason, and create a new plan revision.
- **Inventory after activation:** changing or deleting an inventory item affects future previews. It does not silently rewrite the frozen coverage used by an activated cycle/report.

## How reporting uses PED information

The current report is not generic with respect to the activated schedule. It renders the exact frozen source-backed two-week PED events, selected protocol revision/source weeks, inventory coverage/allocations, reviewed range records, confirmation/review provenance, and any effective amendments alongside diet/training targets and actuals.

The schedule itself is deterministic; it does not require AI to be accurate to the selected source snapshot. Accuracy therefore depends on the source documents, correct source-week selection, correct label/inventory entry, range review, date mapping, and honest adherence logs. AI enhancement may eventually explain the report, but it cannot make incomplete source data clinically valid and must never alter the snapshot.

## Field examples

- A vial labeled `250 mg/mL` with 10 mL remaining: amount per inventory unit `250`, amount unit `mg`, units on hand `10`, inventory unit `mL`.
- A package of 25 mg tablets with 40 tablets remaining: amount per inventory unit `25`, amount unit `mg`, units on hand `40`, inventory unit `tablet`.
- A 50 mcg tablet package with 30 tablets remaining: amount per inventory unit `50`, amount unit `mcg`, units on hand `30`, inventory unit `tablet`.

Do not convert vial counts into mL unless the container volume is known from the label. Do not mark an item confirmed if its identity, concentration, quantity, unit, or expiration is uncertain.

## Deliberately not included in this MVP

- AI or OCR label extraction
- AI-created regimens or dose changes
- Interaction or medical-suitability claims
- Substitutions or automatic range resolution
- Standard/custom-duration PED scheduling
- Reminders and inventory decrement from adherence
- Automatic replanning from weight, body-fat, or daily-log changes
- AI-written report explanation that is auditably bound to the immutable snapshot

Those capabilities remain in the approved roadmap and require their own verification gates.

The active roadmap is [`openspec/changes/add-ai-ped-inventory-scheduler`](../openspec/changes/add-ai-ped-inventory-scheduler). Only its **Approved Tonight MVP slice** is complete; the unchecked inventory, universal scheduler, AI drafting, adherence, reporting, and release tasks must not be represented as shipped.

## Data and rollback

- Inventory is stored locally in SQLite table `ped_inventory_items`.
- The schema addition is additive; existing entries, cycles, reports, and 14-day snapshots are not rewritten.
- Removing an inventory item affects future previews. It does not rewrite an already activated plan or historical report.
- The Alembic migration can remove the new inventory table during a controlled rollback; back up the SQLite database first if the inventory records must be retained.

## Safety boundary

This feature records and validates source/inventory consistency. It does not prescribe PEDs, recommend the “best” stack, diagnose interactions, authorize use, or replace clinician review. Member confirmation and documented human review are stored separately from clinical validation, which remains `not_validated` in the current MVP.
