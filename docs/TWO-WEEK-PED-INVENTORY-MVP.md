# Two-Week PED Inventory MVP

## What is available now

The 14-day Plan Decision Studio can now:

1. Store editable, local PED inventory records.
2. Require confirmation of the exact label name, canonical compound, form, amount per physical unit, units on hand, and expiration.
3. Expand the selected source weeks into individual dated events.
4. Match those events to confirmed, unexpired inventory with Decimal-based arithmetic.
5. Block activation for unresolved source ranges, missing or unconfirmed inventory, incompatible units, expiration conflicts, non-divisible tablet/capsule strengths, and shortages.
6. Preserve a separately reviewed value for a literal source range without changing the original source text.
7. Freeze the coverage and documented review record into the activated plan revision, Command Center, and generated report.

Inventory is a supply constraint only. The application does not use inventory to choose a protocol, recommend a compound, claim interaction safety, or create a new regimen.

## Use it tonight

1. Open `http://localhost:3010/plans`.
2. Select **14-Day Cut**.
3. Choose the challenge start date and the two source weeks.
4. In **PED inventory & exact coverage**, add every container or package you intend to match.
5. For injectable inventory, enter the label concentration as the amount per mL and enter the total mL physically on hand.
6. For oral inventory, enter the amount per tablet or capsule and the number physically on hand.
7. Confirm each item only after checking the label, units, quantity, and expiration.
8. If the source contains a range, record the exact value that was separately reviewed. The app verifies only that the value remains inside the literal source range.
9. Enter the reviewer name, reviewer role, and a short review note. Check the member inventory confirmation and separate-review attestation.
10. Check the existing safety acknowledgement.
11. Select **Build exact preview**. Resolve every blocker shown in the inventory card or preview.
12. If the editable two-week template is still a draft, activate the template and build the preview again.
13. When the preview says **Ready to activate**, select **Start 14-day cut**.
14. Open the 14-Day Command Center. Each day shows the source schedule and the exact inventory-backed events used for that revision.
15. Generate a progress report at any time or a final report after all 14 days are logged. The report includes the frozen inventory coverage and review provenance.

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

Those capabilities remain in the approved roadmap and require their own verification gates.

## Data and rollback

- Inventory is stored locally in SQLite table `ped_inventory_items`.
- The schema addition is additive; existing entries, cycles, reports, and 14-day snapshots are not rewritten.
- Removing an inventory item affects future previews. It does not rewrite an already activated plan or historical report.
- The Alembic migration can remove the new inventory table during a controlled rollback; back up the SQLite database first if the inventory records must be retained.
