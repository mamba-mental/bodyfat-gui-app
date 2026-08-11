# Apex Fit — Full Bug Audit

> **Historical June 3 snapshot.** Findings and counts below reflect that audit date. Current dispositions are in [`../ADVERSARIAL-FLOW-REVIEW-2026-08-11.md`](../ADVERSARIAL-FLOW-REVIEW-2026-08-11.md).

Date: 2026-06-03  |  Branch: feat/recomp-cycle-foundation

Method: layered audit — 6 Claude subsystem reviewers (4 lenses: correctness / edge-case / data-flow / state-async) + 3 independent Codex (GPT-5) adversarial reviews.

**Workflow reviewer findings: 35** — by severity: {'high': 10, 'medium': 16, 'low': 9}

> Note: these are the RAW reviewer findings. The workflow's adversarial-verification pass (which refutes false positives) was still running when this was assembled; treat criticals/highs as high-confidence (they corroborate across the independent Codex passes), mediums/lows as candidates.

---

## PART 1 — Workflow reviewer findings (ALL, full detail)

### HIGH (10)

**HIGH-1 — [correctness] Fat-loss modifiers (diet/exercise/PED/fasting/bodybuilder) computed then discarded — fat loss is pure linear target**

- File: `C:\GitHub_Projects\2025.0629_bf-estimator-terminal-standalone\bodyfat-gui-app\new_prime_python_code\PRIME_Calculations.py:421-441, 465`  (confidence: 0.83)
- What: Inside the weekly loop, lines 422-438 carefully build fat_loss_ratio from DIET_MULTIPLIERS, EXERCISE_ADJUSTMENTS, ped_use (+0.2), is_bodybuilder cap, and get_fasting_multipliers (fasting_fat_multiplier). Then line 441 does `fat_loss = weekly_fat_target` and line 465 applies `current_fat_mass = max(0, current_fat_mass - fat_loss)`. The entire fat_loss_ratio / fasting_fat_multiplier computation is never read again — it is dead. Net effect: changing diet type, exercise type, PED use, bodybuilder mode, or eating window has ZERO impact on projected fat loss / body-fat % in the report. fat_loss_ratio is assigned but never consumed.
- Root cause: Refactor left the modifier math in place but the line that should have multiplied weekly_fat_target by fat_loss_ratio (and split fat vs lean) was replaced with a raw assignment `fat_loss = weekly_fat_target`.
- Fix: Apply the computed ratio to the loss: e.g. `fat_loss = weekly_weight_target * fat_loss_ratio` (and derive lean loss as the remainder), or at minimum `fat_loss = weekly_fat_target * fasting_fat_multiplier * fat_loss_boost`. Decide whether weekly_fat_target or weekly_weight_target*ratio is authoritative, then make the body-comp update consume fat_loss_ratio. Remove the now-dead branches if not used.

**HIGH-2 — [data-flow] /generate-report drops eating_window_hours, workout_days, volume/intensity scores — report diverges from /calculate**

- File: `C:\GitHub_Projects\2025.0629_bf-estimator-terminal-standalone\bodyfat-gui-app\python-api\main.py:531-552`  (confidence: 0.9)
- What: The /calculate endpoint passes eating_window_hours=user_data.eating_window_hours, workout_days, volume_score, intensity_score, eating_window_hours into predict_weight_loss (lines 408-411). The /generate-report call (lines 531-552) omits all of these, so predict_weight_loss falls back to its defaults (workout_days=3, volume_score=7, intensity_score=7, eating_window_hours=12.0). A user on OMAD / 16:8, or with non-default workout volume, gets one projection on the dashboard (/calculate) and a DIFFERENT projection baked into the saved report. The same source data yields two answers.
- Root cause: The two call sites were written/maintained separately; the report path was never updated when fasting + workout-score parameters were added to predict_weight_loss.
- Fix: Pass the same kwargs in /generate-report: eating_window_hours=user_data.eating_window_hours, workout_days=user_data.workout_days, volume_score=user_data.volume_score, intensity_score=user_data.intensity_score. Better: extract a single helper that builds the predict_weight_loss call from UserData and use it in both endpoints.

**HIGH-3 — [data-flow] Entry POST force-overwrites user_id to '1' and strips cycle_id via normaliseEntry before caching**

- File: `src/app/api/data/entries/route.ts:91-95; src/lib/data-reconciliation.ts:18-41`  (confidence: 0.7)
- What: On POST, the route takes the Python-saved row (or the raw entry), runs it through normaliseEntry(), and persists `{ ...normalised, user_id: '1' }` to Redis. normaliseEntry() only whitelists id/date/weight/body_fat_percentage/notes/user_id/created_at/updated_at — it does NOT carry `cycle_id`. This is the exact corruption the GET path explicitly guards against (the comment at lines 22-28 says reading Redis-first dropped cycle_id), but the WRITE path still strips it when warming the cache. With Redis disabled this is dormant, but the moment REDIS_ENABLED=true the cache rows lose their cycle scoping, and any consumer reading cache-first would see entries un-scoped from their cycle. The hardcoded `user_id: '1'` also discards any real user association.
- Root cause: normaliseEntry has a field whitelist that omits cycle_id (and any future field); the POST handler persists the normalised object to the cache, re-introducing the cycle_id-loss bug on the write side that was only fixed on the read side.
- Fix: Add cycle_id (and program_id) to normaliseEntry's output, or persist the raw Python-returned row to cache instead of the normalised one. Do not hardcode user_id; preserve the entry's user_id.

**HIGH-4 — [data-flow] Entries page uses current_weight/current_bf as the START baseline — diverges from the dashboard and goes to zero after a report runs**

- File: `src/app/entries/page.tsx:204-220`  (confidence: 0.82)
- What: calculateProgress() reads startWeight = Number(current_user.current_weight) and startBF = Number(current_user.current_bf), then compares them against the latest entry to compute weightProgress/bfProgress and weightChange/bfChange. But current_weight/current_bf are the user's CURRENT values, not the program baseline. The real baseline is program_reference.initial_weight / initial_bf, which is exactly what the dashboard hook uses (useDashboardData.ts:77-78: startWeight = current_user?.program_reference?.initial_weight). So the same 'progress from start' concept is sourced from two different fields on the two screens and they will disagree.
- Root cause: current_weight is treated as an immutable starting weight, but it is the live current weight. Worse, report-actions.ts:148 overwrites updatedUserData.current_weight = latestEntry.weight on every auto-generated report (and addEntry auto-generates a report). After the first report, current_user.current_weight == latest entry weight, so startWeight == currentWeight → weightChange = 0 and (currentChange/totalChange) = 0 → the Weight Progress card shows 0.0% / +0.0 lbs forever, and the same for body fat.
- Fix: Source the baseline from the program snapshot, matching the dashboard: const startWeight = Number(current_user.program_reference?.initial_weight ?? current_user.current_weight); const startBF = Number(current_user.program_reference?.initial_bf ?? current_user.current_bf). Ideally factor the baseline selection into one shared helper so the entries page and dashboard cannot diverge.

**HIGH-5 — [data-flow] start_date stored in MM/DD/YY (quick setup) vs ISO YYYY-MM-DD (all other paths) — divergent date format for the same field**

- File: `src/app/setup/page.tsx:75`  (confidence: 0.9)
- What: handleQuickSetup writes start_date via `new Date().toLocaleDateString('en-US', { month:'2-digit', day:'2-digit', year:'2-digit' })` => e.g. '06/03/26'. setup/custom (custom/page.tsx:194) and setup-wizard (setup-wizard.tsx:332) and settings handleStartNewProgram (settings/page.tsx:166) all write start_date as ISO `new Date().toISOString().split('T')[0]` => '2026-06-03'. The same current_user.start_date field therefore holds two incompatible formats depending on which entry path created it.
- Root cause: Quick-setup path was written with a locale formatter while every other writer uses ISO. Downstream consumers (e.g. setup/page.tsx:124 `new Date(current_user.start_date).toLocaleDateString()`) get fed a 2-digit-year US string; `new Date('06/03/26')` is engine-dependent and can resolve to year 1926 or fail, producing a wrong/'Invalid Date' program start.
- Fix: In handleQuickSetup set `start_date: new Date().toISOString().split('T')[0]` (and end_date likewise) so all creation paths emit ISO YYYY-MM-DD, matching the rest of the codebase and the date-utils parsers.

**HIGH-6 — [data-flow] generateReport picks the report's source entry via two different, divergent filters**

- File: `src/contexts/app/actions/report-actions.ts:63-101 (diagnostic filter) vs 127-155 (data filter)`  (confidence: 0.82)
- What: generateReport builds the 'which entry was used' status string from one filtered set (currentProgramEntriesForReport, lines 67-90) but feeds current_weight/current_bf into the actual calculation from a SECOND, independently-computed filtered set (currentProgramEntries, lines 133-155). The first set filters by current_program_id first (falling back to date>=programStartDate where programStartDate = program_reference.start_date || userData.start_date || today). The second set ALWAYS filters by date only, with programStartDate redeclared as userData.start_date || today (line 129) — it ignores program_id and ignores program_reference.start_date. So the entry reported in the status/entry_date can differ from the entry whose weight/bf actually drives the report, and neither is scoped to the active ReComp cycle.
- Root cause: Two parallel filtering blocks were written at different times. The second block shadows `today` and `programStartDate` with new const declarations (lines 128-129) using a narrower source (userData.start_date only), so the two pipelines diverge. The displayed entry_date and the computed body data come from different selection logic.
- Fix: Compute the program/cycle-scoped entry set ONCE, store the chosen latest entry in a variable, and use that single entry for both the entry_date status field and current_weight/current_bf. Remove the duplicate filter block (127-155) and reuse currentProgramEntriesForReport + latestEntryForReport.

**HIGH-7 — [data-flow] Report data is never scoped to the ACTIVE ReComp cycle (uses program_id/date, not cycle_id)**

- File: `src/contexts/app/actions/report-actions.ts:67-86, 133-155`  (confidence: 0.7)
- What: The entire cycle subsystem tags entries with cycle_id (database.save_entry, get_entries return cycle_id), and reports are persisted with cycle_id (deps.cycleId, db.save_report). But the calculation that the report is built from selects entries by current_program_id or by date>=start_date, never by the active cycle_id. An entry belonging to a previous/other cycle that shares the same program_id, or any date >= program start, will be pulled into the current cycle's report. current_weight/current_bf fed to the Python calc are therefore not guaranteed to come from entries in the cycle the report is being tagged to.
- Root cause: Cycle scoping (cycleScope.scopeByCycle / cycle_id) was added at the storage and Reports-page level but generateReport's source-entry selection still uses the older program_id/date heuristic, so the report's input data and the report's cycle tag can describe different cycles.
- Fix: When deps.cycleId is provided, filter entries by entry.cycle_id === cycleId (using scopeByCycle) before choosing the latest entry, so the data driving the report matches the cycle it is tagged with.

**HIGH-8 — [state-async] UPDATE_ENTRY reducer does not re-sort entries — entries[0] 'latest' becomes wrong after editing a date**

- File: `src/contexts/app/reducers/app-reducer.ts:46-51`  (confidence: 0.9)
- What: SET_ENTRIES (l.33) and ADD_ENTRY (l.41) both re-sort by date descending so entries[0] is the newest. UPDATE_ENTRY (l.49) only maps in place: entries.map(e => e.id === payload.id ? payload : e) with NO re-sort. Many widgets assume entries[0] is the latest entry: dashboard/index.tsx:140-141 (CycleManagerCard latestWeight/latestBf = entries?.[0]), useDashboardData.ts:71 (latestEntry = programEntries[0] feeds currentWeight/currentBF and every progress metric), and entries/page.tsx:203 (latestEntry = entries[0]).
- Root cause: Editing an entry's date (the edit dialog exposes a date field, page.tsx:488-494) replaces the object at its existing array position without restoring date-descending order. If a user edits an older entry to a newer date, or edits the current newest entry to an older date, entries[0] no longer points at the chronologically newest entry, so 'current weight', 'current BF', progress %, and the cycle latestWeight/latestBf all silently read the wrong entry.
- Fix: Re-sort in UPDATE_ENTRY exactly like the other two cases: entries: state.entries.map(...).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()). Or derive 'latest' via a memoized max-by-date selector instead of trusting array position.

**HIGH-9 — [state-async] Entire app render blocked on /api/theme network fetch (white screen on slow/failed server)**

- File: `src/contexts/theme-context.tsx:42-109, 240-242`  (confidence: 0.78)
- What: ThemeProvider returns null (line 240-242) until `mounted` is true. `mounted` is only set true at the END of `loadThemeSettings` (line 101-103), which first `await`s a `fetch(/api/theme)` (line 66). Because ThemeProvider wraps the whole app, every child renders nothing until that server round-trip resolves.
- Root cause: setMounted(true) is gated behind an awaited network call inside the load effect, and the provider hard-returns null while !mounted. localStorage is read synchronously and is enough to render, but the code still blocks on the server fetch before un-blanking the tree.
- Fix: Set mounted=true immediately after the synchronous localStorage read (before the server fetch), or render children regardless of mounted and only defer the DOM class/font application. Move `setMounted(true)` out of the post-fetch path so a hung/slow /api/theme can never blank the app.

**HIGH-10 — [data-flow] Report save and report read use two different, divergent backends — saves land where reads never look**

- File: `src/lib/data-sync.ts:308-345 (saveReport), 267-303 (getReports); also src/app/api/data/report/route.ts:6,20-49`  (confidence: 0.6)
- What: DataSync.saveReport() writes to the Python store at `${PYTHON_API_URL}/api/data/report` (singular) and to the Next route `/api/data/reports` (plural). The Next plural route persists to Redis/Python. Separately there exists a Next route `/api/data/report` (singular) that writes reports to a flat-file `data/apexfit-data.json` (server-storage), but DataSync's singular POST goes to the PYTHON host, not that Next file route. Reads (getReports) only ever consult `/api/data/reports` (plural → Python/Redis). Net effect: there are three report sinks (Python, Redis via plural route, and the apexfit-data.json file via the unused singular Next route) and the file-backed sink is dead/divergent. If the Python `/api/data/report` (singular) endpoint differs from the plural read endpoint's source, a saved report can fail to appear on read.
- Root cause: Endpoint naming drift: writes target `/api/data/report` (singular) on the Python host while reads target `/api/data/reports` (plural). A separate Next `/api/data/report` route writes to a JSON file that nothing in the read path consumes.
- Fix: Standardize report write and read on a single canonical endpoint (`/api/data/reports`). Delete or repoint the orphaned singular `src/app/api/data/report/route.ts` (apexfit-data.json) so it cannot diverge, or make the read path include it. Verify the Python API truly exposes `/api/data/report` vs `/api/data/reports`.

### MEDIUM (16)

**MEDIUM-1 — [data-flow] Summary total_weight_loss / body_fat_reduction use raw goal delta, not actual progression outcome**

- File: `C:\GitHub_Projects\2025.0629_bf-estimator-terminal-standalone\bodyfat-gui-app\python-api\main.py:436-441`  (confidence: 0.78)
- What: summary['total_weight_loss'] = current_weight - goal_weight and summary['body_fat_reduction'] = current_bf - goal_bf are computed straight from the GOAL inputs, independent of the simulated progression. But the progression loop can stop early when goals are met (PRIME_Calculations.py line 502) or fail to reach the goal within the timeframe, so the final progression weight/BF can differ from goal_weight/goal_bf. The summary then reports a weight/BF change that the weekly table does not actually produce. The report generator (PRIME_Report_Generator line 376) computes total_weight_loss correctly from initial vs final progression, so the API summary and the report body disagree.
- Root cause: Summary shortcut uses target values as if they were realized outcomes instead of reading progression[0] vs progression[-1].
- Fix: Compute from progression: total_weight_loss = api_progression[0].weight - api_progression[-1].weight; body_fat_reduction = api_progression[0].body_fat_percentage - api_progression[-1].body_fat_percentage. Mirror the report generator's logic so summary and table agree.

**MEDIUM-2 — [correctness] weekly_weight_loss_target fed to AI confidence analysis is always 0 (reads week-0 zero-output field)**

- File: `C:\GitHub_Projects\2025.0629_bf-estimator-terminal-standalone\bodyfat-gui-app\python-api\main.py:455-457`  (confidence: 0.7)
- What: calc_results['weekly_weight_loss_target'] = progression[0]['weekly_caloric_output'] / 3500. progression[0] is the week-0 seed row, which is explicitly initialized with weekly_caloric_output: 0 (PRIME_Calculations.py line 367). So this 'weekly weight loss target' handed to the AI confidence analyzer is always 0.0, regardless of the actual plan. Any confidence reasoning that depends on the weekly target is operating on a constant zero.
- Root cause: Wrong index — week-0 has no caloric output; the first real projection week is progression[1]. Also conflates caloric output with a weight-loss target.
- Fix: Use progression[1] when len(progression) > 1 (or average the real weeks), e.g. `progression[1]['weekly_caloric_output'] / 3500`. Guard for the single-row case.

**MEDIUM-3 — [data-flow] Report 'latest entry' selection diverges between diagnostic filter and calc filter; neither sorts entries**

- File: `C:\GitHub_Projects\2025.0629_bf-estimator-terminal-standalone\bodyfat-gui-app\src\contexts\app\actions\report-actions.ts:63-101, 127-155`  (confidence: 0.74)
- What: Two separate 'current program entries' computations exist. The first (63-86) filters by userData.program_reference?.start_date || userData.start_date and may also filter by current_program_id, then takes [0] as the entry whose date is shown to the user (entryDateForStatus, lines 90-101). The second (127-155) re-derives programStartDate = userData.start_date || today (ignoring program_reference and current_program_id entirely) and takes currentProgramEntries[0] as the entry that actually feeds current_weight/current_bf into the calc (148-151). So the date reported as 'entry used' can come from a different entry than the weight/BF actually used. Additionally both rely on entries[0] being the newest, but entries is never sorted here — if the array is oldest-first or unordered, [0] is not the latest weigh-in. Result: the report can be built from a stale/non-latest entry while displaying a different entry's date.
- Root cause: Duplicated, inconsistent filtering logic plus an unstated assumption that entries[0] is the most recent and that program scoping is identical in both blocks.
- Fix: Compute the scoped, sorted 'current cycle entries' once (sort by date desc, scope by current_program_id with the program_reference start_date fallback), reuse that single array for both the diagnostic date and the calc inputs.

**MEDIUM-4 — [correctness] Edit handler converts entry.date to a Date object, breaking string-based date handling (CSV export, cycle grouping/sort)**

- File: `src/app/entries/page.tsx:155`  (confidence: 0.72)
- What: handleUpdateEntry builds updatedEntry with date: new Date(editingEntry.date) — a Date object. Everywhere else in this file entry.date is treated as a YYYY-MM-DD string: exportEntries (l.184) interpolates `${entry.date}` into CSV, cycleGroups sorting uses startDate.localeCompare on the cycle (entry dates are read via new Date(entry.date) which tolerates both, but the CSV does not). After an edit, that one entry's date is a Date, so the CSV row renders the full Date.toString() (e.g. 'Wed Jun 04 2025 00:00:00 GMT-0400 …') instead of '2025-06-04', corrupting the export, and any code comparing string dates with that entry will mismatch format.
- Root cause: Inconsistent date representation: the type/storage convention is a date-only string, but the update path injects a JS Date. The new Date(editingEntry.date) on a 'YYYY-MM-DD' value also parses as UTC midnight, which can shift to the previous local day when later formatted with toLocaleDateString.
- Fix: Keep dates as strings on update: date: editingEntry.date (already 'YYYY-MM-DD' from the date input). Let storage/serialization handle any conversion, matching addEntry's recalc path which does new Date(persistedEntry.date).toISOString().split('T')[0].

**MEDIUM-5 — [edge-case] Entries-page time filter uses month/day arithmetic that overflows and is timezone-mismatched against date-only entries**

- File: `src/app/entries/page.tsx:90-105`  (confidence: 0.5)
- What: filteredEntries computes cutoffDate via now.setMonth(now.getMonth()-1) / setMonth(getMonth()-3) and setDate(getDate()-7), then keeps entries where new Date(entry.date) >= cutoffDate. Two problems: (1) setMonth roll-over: on the 31st, getMonth()-1 can overshoot into the wrong month (e.g. Mar 31 -> Mar 3) producing a wrong window. (2) entry.date is a date-only string parsed as UTC midnight, while cutoffDate is a local Date that still carries the current time-of-day (only setDate/setMonth were called, not hours). Comparing UTC-midnight entries to a local now-time cutoff can include/exclude boundary-day entries incorrectly.
- Root cause: Mixing local Date math with the current time component against UTC-parsed date-only strings, plus relying on setMonth/setDate overflow semantics for the cutoff.
- Fix: Zero the time (cutoffDate.setHours(0,0,0,0)) and prefer day-count subtraction (cutoff = today - 7/30/90 days) using the same UTC date-only convention as cycleWeek.ts/weeklyStats.ts so the filter boundary matches how dates are stored.

**MEDIUM-6 — [data-flow] Settings page persisted-font reverts live font; effect re-reads localStorage on every font change and ignores live font context**

- File: `src/app/settings/page.tsx:208-242`  (confidence: 0.7)
- What: The load effect runs on `[theme, font]`. In the branch where saved userSettings exist (line 215-226), it spreads `parsed.display` (which carries the *persisted* font) and overrides ONLY `theme` from the live context — it does NOT override `font`. So settings.display.font is reset to the stored value, even though the live `font` context (which may have just been updated from the server load in theme-context) differs. The FontSelector value (bound to settings.display.font, line 365) can visibly revert to the stale persisted font.
- Root cause: The deep-merge intentionally forces live `theme` to win but forgot the symmetric override for `font`; meanwhile the effect depends on `font`, so any font context change re-triggers it and re-applies the stale persisted font.
- Fix: In the merge add `font` alongside `theme`: `display: { ...prev.display, ...(parsed?.display ?? {}), theme, font }` so the live context value wins for both, or drop `font` from the effect deps and seed font only once.

**MEDIUM-7 — [edge-case] nextWeighIn / banner 'next weigh-in' is not bounded by cycle end_date**

- File: `src/components/cycle/cycle-context-banner.tsx:62 (uses cycleWeek.nextWeighIn:36-45)`  (confidence: 0.6)
- What: nextWeighIn(today, weighinDays) returns the next scheduled weekday on/after today purely from the weekly schedule. It ignores cycle.end_date. When a cycle has already ended (daysLeft computed as 0 on line 66-68) the banner still advertises a 'Next weigh-in' inside an expired cycle. The two pieces of info (daysLeft=0 but a future next weigh-in) are contradictory.
- Root cause: nextWeighIn has no knowledge of the cycle window; the banner renders its result unconditionally as long as it is non-null.
- Fix: Suppress or relabel the next-weigh-in line when daysLeft === 0 (cycle ended), or pass end_date into nextWeighIn and return null when the next date falls after end_date.

**MEDIUM-8 — [edge-case] missedWeighIns matches entry dates by exact UTC midnight, but banner toISO can produce a local-shifted date for non-string inputs**

- File: `src/components/cycle/cycle-context-banner.tsx:24-31, 61-63 (with cycleWeek.missedWeighIns:51-67)`  (confidence: 0.5)
- What: missedWeighIns builds a Set of entry dates via toUTC(YYYY-MM-DD) and checks entries.has(ms) for exact UTC-midnight equality (+/-1 day). The banner maps entryDates through toISO: for string inputs it slices to YYYY-MM-DD (UTC-safe), but for any non-string input it falls back to new Date(d).toLocaleDateString('en-CA') which is LOCAL timezone. An ISO timestamp with a time component (e.g. '2026-06-03T23:30:00Z') passed as a Date in a negative-UTC-offset zone shifts to the previous calendar day, so a real weigh-in is recorded one day off and the matching window (+/-1 day) can still mark a genuine check-in as missed (or hide a real miss).
- Root cause: Inconsistent date normalization: pure UTC string-slice on one path, local-timezone formatting on the fallback path, while the matcher assumes all dates are UTC-midnight YYYY-MM-DD.
- Fix: Normalize all entry dates to UTC YYYY-MM-DD consistently (slice the ISO string's first 10 chars, or use a UTC-based formatter) in toISO's non-string branch, matching cycleWeek's toUTC semantics.

**MEDIUM-9 — [data-flow] CycleManagerCard seeds new-cycle start_weight/start_bf from entries[0] which may not be the latest by date**

- File: `src/components/cycle/cycle-manager-card.tsx:111-112 (consumed from dashboard/index.tsx:139-140)`  (confidence: 0.55)
- What: latestWeight/latestBf are passed as entries?.[0]?.weight / entries?.[0]?.body_fat_percentage. entries[0] is 'latest' ONLY because the API returns ORDER BY date DESC. If the in-memory entries array is ever re-sorted, appended (ADD_ENTRY prepend/append), or filtered for a different cycle before reaching the dashboard, entries[0] is no longer the newest entry, and a brand-new cycle gets seeded with a stale or wrong starting weight/bf. There is no explicit max-by-date here.
- Root cause: Reliance on an implicit DB sort order for 'latest entry' rather than computing max-by-date at the point of use. The reducer's ADD_ENTRY ordering is not guaranteed to keep newest-first across all code paths.
- Fix: Compute the latest entry explicitly: entries.reduce over date (or sort a copy by date desc and take [0]) before passing latestWeight/latestBf, instead of trusting entries[0].

**MEDIUM-10 — [state-async] Initial-load effect reads state.current_user/entries for the cache-skip decision but omits them from deps — stale-closure skip logic**

- File: `src/contexts/app-context.tsx:143-177, 301`  (confidence: 0.55)
- What: The loadData effect computes `hasExistingData = state.current_user !== null || state.entries.length > 0` (line 171) and uses it plus lastFetchTimestampRef to decide whether to skip the fetch. But the effect's dependency array is `[refreshWidgets]` only (line 301), and refreshWidgets is a stable useCallback (deps []), so this effect runs once on mount. At that first run state.current_user/entries reflect either initialState (null/[]) or the just-dispatched sessionStorage restore — dispatches in the same tick are not yet reflected in the `state` captured by this closure. So `hasExistingData` is evaluated against a stale snapshot; the intended 'skip fetch when we already have recent data' branch can mis-fire (either skip when it shouldn't or fetch when it shouldn't), defeating the 60s cache gate.
- Root cause: Effect closes over `state` for control-flow decisions but is not re-run when state changes (deps = [refreshWidgets]); React state updated by dispatch in the same render pass is not visible in the current closure.
- Fix: Drive the skip decision off refs that are updated synchronously (e.g. set a `hasDataRef` when dispatching restores), or read the freshest values via a ref instead of the closed-over `state`. Do not rely on `state.*` inside a mount-only effect for cache-skip logic.

**MEDIUM-11 — [edge-case] Reports reducer sorts by generated_at, but Redis-sourced reports may only have `date`, producing NaN sort and wrong order**

- File: `src/contexts/app/reducers/app-reducer.ts:67-73, 75-81`  (confidence: 0.6)
- What: SET_REPORTS and ADD_REPORT sort by `new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()`. In redis.ts getUserReports (lines 243-252) a report is returned with `generated_at: data.generated_at` which can be undefined/empty (saveReport stores generated_at as `report.generated_at ?? ''`, lines 189-191), while it always has a `date`. `new Date(undefined).getTime()` is NaN, so the comparator returns NaN for those rows; Array.sort with NaN comparisons yields an undefined/implementation-defined order, so reports with a missing generated_at land in arbitrary positions rather than chronologically. The redis getUserReports itself falls back to `date ?? generated_at` for the date field but the reducer ignores `date` entirely.
- Root cause: Two different timestamp fields (`date` vs `generated_at`) for the same concept; the reducer hard-codes generated_at while the persistence layer cannot guarantee it is populated.
- Fix: Sort with a coalesced timestamp: `new Date(b.generated_at || b.date || b.created_at || 0).getTime()` and guard NaN to 0 so missing dates sort last deterministically.

**MEDIUM-12 — [data-flow] Server theme keyed under shared 'default' user_id for all profileless/anonymous users**

- File: `src/contexts/theme-context.tsx:28-39, 65`  (confidence: 0.68)
- What: resolveUserId returns `parsed?.email || parsed?.name || 'default'` and falls back to 'default' when no profile exists. The GET query (line 65) is `userIdRef.current ? ... : ''` but userIdRef.current is never empty (always at least 'default'), so it always sends `user_id=default`. The PUT (line 188-195) writes under the same 'default'. Every user without a saved email/name shares ONE server-side theme record. Additionally, once a user sets a name/email, their userId changes and the previously-saved server theme (under 'default' or the old name) is orphaned, so cross-session persistence silently breaks on profile edits.
- Root cause: Using a mutable, profile-derived string as the persistence key with a non-unique 'default' fallback, and the email/name precedence means the key changes whenever the profile changes.
- Fix: Generate and persist a stable anonymous client id (e.g. a UUID in localStorage) and use that as user_id for theme persistence, independent of profile email/name; or migrate the existing record when the resolved id changes.

**MEDIUM-13 — [state-async] useCycles refetch is not awaited after a transition POST — banner/card can show stale active cycle on slow backend**

- File: `src/hooks/use-cycles.ts:37-59 (with cycle-manager-card.tsx:72-89)`  (confidence: 0.45)
- What: postCycle awaits the POST, then calls notifyChanged() -> refreshWidgets() which bumps refreshKey, re-running the effect's fetch('/api/data/cycles'). The save_cycle endpoint demotes the prior active cycle and inserts the new one in one request, so by the time refetch runs the data should be consistent. However the refetch is fire-and-forget relative to the UI: there is no in-flight/loading guard, and because setStatus('stopped'/'archived') calls postCycle WITHOUT awaiting (line 88 returns the promise but the AlertDialogAction onClick ignores it), a fast double-click or overlapping start+stop can issue two POSTs whose refetches resolve out of order, leaving `active` reflecting whichever response landed last rather than the final server state.
- Root cause: Transitions rely on an effect keyed only on refreshKey with no request sequencing; the alive flag guards unmount but not response ordering, and setStatus does not await before allowing further interaction.
- Fix: Track the latest request id (or use AbortController per fetch and ignore stale responses), and disable the transition buttons until the refetch settles; await setStatus's postCycle so busy stays true through the refetch.

**MEDIUM-14 — [edge-case] cycleWeek.toUTC mis-parses dates that carry a time/Z suffix → NaN week math and missed-weigh-in detection**

- File: `src/lib/cycleWeek.ts:11-14`  (confidence: 0.55)
- What: toUTC does date.split('-').map(Number) and feeds Date.UTC(y, m-1, d). This only works for strict 'YYYY-MM-DD'. If startDate is a full ISO string like '2025-06-01T00:00:00Z' (or '2025-06-01T00:00:00.000Z'), the third split segment is '01T00:00:00Z', Number(...) = NaN, and Date.UTC returns NaN. currentCycleWeek then computes NaN → Math.max(1, NaN) = NaN week shown in the banner; missedWeighIns iterates `for (ms = NaN; NaN < todayMs; ...)` which never runs (silently zero missed weigh-ins).
- Root cause: The helper assumes date-only strings, but cycle.start_date comes from an API (cycle-context-banner.tsx:58/63 passes cycle.start_date straight through) and is not guaranteed to be sliced to 10 chars the way entry dates are (entryDates are pre-sliced by toISO, but start_date is not).
- Fix: Normalize input first: const s = date.slice(0, 10) before splitting, or guard Number.isNaN and bail. Apply the same slice in weeklyStats.ts toUTC, which has the identical assumption.

**MEDIUM-15 — [correctness] DataSync.deleteEntry POSTs to a non-existent Redis-cache route (/api/entries/[id]) — cache delete silently no-ops**

- File: `src/lib/data-sync.ts:144-155`  (confidence: 0.85)
- What: deleteEntry() deletes from Python directly (line 133, `${PYTHON_API_URL}/api/data/entries/${entryId}`) then attempts the Redis-cache delete via `fetch('/api/entries/${entryId}', { method: 'DELETE' })`. There is no `/api/entries/[id]` route in the app — `/api/entries/` only contains `history`. The DELETE handler that actually deletes from Redis lives at `/api/data/entries` and reads the id from the JSON BODY, not the path. So this fetch 404s, the `!redisResponse.ok` branch pushes a 'Redis delete failed' error, and the overall result.success is false even when the Python delete succeeded. The cached copy (if Redis were enabled) is never removed, so a deleted entry would resurrect from cache on the next read.
- Root cause: Wrong endpoint path and wrong id-passing convention: posts to `/api/entries/${id}` (path param, no such route) instead of `/api/data/entries` with `{ id }` in the body.
- Fix: Change to `fetch('/api/data/entries', { method: 'DELETE', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: entryId }) })` to match the existing DELETE handler in src/app/api/data/entries/route.ts.

**MEDIUM-16 — [correctness] getReports() in DataSync treats an empty Redis/Next array as a cache miss and silently re-fetches Python every call**

- File: `src/lib/data-sync.ts:275-280`  (confidence: 0.5)
- What: getReports() returns the Redis/Next result only `if (reports && reports.length > 0)`. When the user legitimately has zero reports, length===0 falls through to the Python fetch every time — but more importantly, the plural Next route already proxies Python and persists results, so an empty-but-valid response is indistinguishable from a miss. This is mostly a redundant-fetch issue, but combined with getEntries (lines 49-55) it means the 'real answer is empty list' case never short-circuits and always double-hits the backend, and if the second (direct Python) fetch transiently fails, an empty-but-correct first result is discarded in favor of `[]` from the catch path — same value here, but for entries the first response could carry the warning header and be dropped.
- Root cause: Conflating 'empty result' with 'cache miss' by gating on `length > 0` instead of on response.ok / presence of a warning header.
- Fix: Return the first OK response (even when empty) unless an x-python-warning header indicates degraded cache-only data; only fall through to the direct Python fetch on !ok or on warning.

### LOW (9)

**LOW-1 — [correctness] initial_rmr template fallback divides by hardcoded 1.55 because activity_multiplier is never in user_data**

- File: `C:\GitHub_Projects\2025.0629_bf-estimator-terminal-standalone\bodyfat-gui-app\new_prime_python_code\PRIME_Report_Generator_v3_Fast.py:443`  (confidence: 0.66)
- What: initial_rmr = initial_data.get('rmr', initial_tdee / user_data.get('activity_multiplier', 1.55)). convert_user_data_to_prime_format (main.py 317-358) never sets 'activity_multiplier', so the fallback denominator is always 1.55 even for a sedentary (1.2) or very active (1.9) user. When the progression row lacks 'rmr' the displayed RMR is wrong by the ratio of the true activity multiplier to 1.55. (In practice progression rows DO carry 'rmr', so the fallback rarely fires — hence low severity — but the fallback is incorrect whenever it does.)
- Root cause: Fallback references a key that is never populated; the magic 1.55 assumes 'moderate'.
- Fix: Either populate activity_multiplier in convert_user_data_to_prime_format from the activity level, or drop the fallback and use initial_data['rmr'] (it is always present in progression rows).

**LOW-2 — [edge-case] Chart date-parse failure silently substitutes today(), corrupting the time axis**

- File: `C:\GitHub_Projects\2025.0629_bf-estimator-terminal-standalone\bodyfat-gui-app\new_prime_python_code\PRIME_Report_Generator_v3_Fast.py:210-215`  (confidence: 0.55)
- What: When a progression row's date can't be parsed, the except appends datetime.datetime.now().date() and continues. Because progression dates are stored as %m%d%y (6-digit MMDDYY) and parse_date handles that, this normally works — but any malformed/empty date collapses that point to 'today', producing a chart where one or more weekly points jump to the current date out of sequence (and mdates.date2num then plots them out of order). The failure is swallowed (only a warning print), so the rendered chart is silently wrong rather than failing loudly.
- Root cause: Best-effort fallback substitutes an unrelated date instead of skipping the row or aborting, and does not keep weights aligned with a coherent date sequence.
- Fix: On parse failure, either skip the row (and the matching weight/lean/fat values) or interpolate from the prior valid date + 7 days, rather than injecting now(). Keep the x/y arrays index-aligned.

**LOW-3 — [edge-case] body_fat_percentage === 0 entry silently ignored when promoting entry BF to current_bf**

- File: `C:\GitHub_Projects\2025.0629_bf-estimator-terminal-standalone\bodyfat-gui-app\src\contexts\app\actions\report-actions.ts:149-151`  (confidence: 0.6)
- What: `if (latestEntry.body_fat_percentage) { updatedUserData.current_bf = latestEntry.body_fat_percentage }`. The truthiness guard treats 0 as 'no value'. A legitimately logged body fat of 0 (or any falsy like NaN coerced) would not overwrite the profile current_bf, so the report would silently use a stale profile BF instead of the entry's. While 0% BF is physically implausible, the guard should distinguish missing/undefined from a numeric value.
- Root cause: Falsy check used where an explicit null/undefined check is required.
- Fix: Use `if (latestEntry.body_fat_percentage != null && !Number.isNaN(latestEntry.body_fat_percentage))` before assigning.

**LOW-4 — [edge-case] save_cycle demotes other active cycles even when inserting a non-active cycle status change, but not vice-versa; stop/archive of active leaves no active cycle silently**

- File: `python-api/database.py:217-242`  (confidence: 0.4)
- What: save_cycle only demotes other active cycles when the incoming status == 'active' (line 220). When the frontend stops/archives the current active cycle (setStatus), the row is updated to stopped/archived and no cycle is active afterward. That is intended, but get_active_cycle_id then returns None, and subsequent save_entry/save_report fall back to cycle_id=None (database.py:162, 308) — new entries/reports created while no cycle is active are silently left untagged, and will later be QUARANTINED by cycleBackfill (no covering cycle) rather than attached anywhere. No warning surfaces to the user.
- Root cause: No-active-cycle is a valid state, but the entry/report write path defaults cycle_id to None without signaling, so data logged in that window becomes orphaned/quarantined.
- Fix: Either block entry creation while no cycle is active (UI guard) or surface a warning, and ensure backfill/quarantine has a clear resolution path for null-cycle rows.

**LOW-5 — [edge-case] User-merge lets stale local Redis profile override fresh Python fields (local-wins merge on every read)**

- File: `src/app/api/data/user/route.ts:63-72; src/lib/data-reconciliation.ts:8-13`  (confidence: 0.55)
- What: GET /api/data/user merges as `mergeUserProfiles(localUser, pythonUser)` which returns `{ ...remoteUser, ...localUser }` — local (Redis) fields WIN over Python. Python is documented elsewhere in this codebase as the single source of truth, yet here a stale Redis-cached profile (e.g. old current_weight/current_bf) shadows the fresh Python value on every read. It then persists the merged (local-wins) result back to Redis (line 68), entrenching the stale value. With Redis disabled localUser is null so this is dormant, but when enabled it inverts the intended source-of-truth precedence for the user profile, so 'current weight' shown can lag the latest saved value.
- Root cause: Merge precedence is local-wins (`...remote, ...local`) which contradicts the SQLite/Python-is-canonical model used everywhere else (entries/reports read Python verbatim).
- Fix: Make Python win for a canonical read: `{ ...localUser, ...pythonUser }`, or only fall back to local when pythonUser is null. Persist the Python copy to cache, not the local-wins merge.

**LOW-6 — [correctness] setup/page.tsx 'preserve' variables read wrong localStorage keys and are never used**

- File: `src/app/setup/page.tsx:30-34`  (confidence: 0.72)
- What: handleStartNewProgram reads `localStorage.getItem('theme-preferences')` into settingsToKeep and `localStorage.getItem('ai-settings')` into aiSettingsToKeep (and bodyfat_entries/bodyfat_reports) with the stated intent of preserving them. The actual theme key used by theme-context is 'userSettings' (THEME_STORAGE_KEY, theme-context.tsx:19) and the AI key written by the settings page is 'ai_settings' with an underscore (settings/page.tsx:155), not 'ai-settings'. All four captured variables are never written back or referenced after capture.
- Root cause: Dead read-and-discard logic plus wrong key names ('theme-preferences'/'ai-settings' do not exist); the function only removes bodyfat_user_data and bodyfat_calculation_result, so the 'keep' captures serve no purpose and signal a mismatch with the real storage schema.
- Fix: Remove the unused settingsToKeep/aiSettingsToKeep/entriesToKeep/reportsToKeep reads, or if preservation is genuinely intended, key them correctly ('userSettings', 'ai_settings') and confirm they aren't cleared (they currently aren't).

**LOW-7 — [state-async] FontSelector effect drops Google Fonts <link> on unmount and uses a stale loadedFonts closure**

- File: `src/components/settings/font-selector.tsx:22-44`  (confidence: 0.55)
- What: The font-loading effect depends only on `[mountedRef]` (a stable ref) so it runs once, but its cleanup (line 38-43) removes the injected `<link>` from <head> on unmount. Leaving the Settings page therefore tears out the loaded Google Font preview stylesheet. The effect also closes over `loadedFonts` (lines 23, 34) while excluding it from deps; if it ever re-ran it would compute from stale state. The intended preview can also fail because the font preview swatches (line 64,70) depend on this link being present.
- Root cause: Mismatched effect deps vs. closed-over state, plus an unconditional cleanup that removes a globally-shared font stylesheet that other parts of the app (theme-context also injects its own 'google-fonts-link', but selector swatches rely on this one) may still need.
- Fix: Don't remove the <link> in cleanup (load fonts idempotently and leave them), or gate removal so it only runs on real unmount; and either include loadedFonts in deps or compute the load list from a ref to avoid the stale closure.

**LOW-8 — [correctness] calculateProgressPercentage divides by zero when initial == goal but current != goal**

- File: `src/lib/calculations.ts:231-234`  (confidence: 0.45)
- What: Guard returns 100 only when initial === goal. But the division totalChange = goal - initial is still 0 in that branch handled, yet there is no guard for the case where goal and initial are equal AND the early return is intended to mask it — that part is fine. The real edge: when initial === goal the function reports 100% progress even if current has drifted away from goal (e.g. start=goal=220, current=240 → still '100%'). For body fat where goal_bf can equal current_bf at setup, the entries page and dashboard will show a misleading 100% complete.
- Root cause: The initial===goal shortcut returns 100 unconditionally instead of checking whether current actually equals goal.
- Fix: Return initial === goal ? (current === goal ? 100 : 0) : clamp(((current-initial)/(goal-initial))*100). Or treat a zero-span goal as 'no target set' and render N/A.

**LOW-9 — [edge-case] Redis date sorted-set uses new Date(entry.date) which mis-scores date-only strings vs ISO-with-time inconsistently**

- File: `src/lib/redis.ts:99-103, 195-200`  (confidence: 0.5)
- What: saveEntry scores the entries sorted-set with `new Date(entry.date).getTime()`. Entry `date` is sometimes a date-only `YYYY-MM-DD` (parsed as UTC midnight) and sometimes a full ISO timestamp with time/Z (parsed at that instant), per normaliseEntry which keeps a string date as-is but converts non-strings. Mixing date-only and datetime values in the same sorted set means two entries on the same calendar day can sort by accident of format (00:00 UTC vs e.g. 14:00 local), and an entry saved date-only can order before/after a same-day datetime entry inconsistently. The reducer sort (new Date(b.date)) has the same mixed-format exposure.
- Root cause: No normalization of `date` to a single granularity/timezone before it is used as a sort key; ISO-with-time and date-only strings are scored on different scales.
- Fix: Normalize all entry dates to date-only UTC (or all to a canonical ISO instant) before scoring/sorting, mirroring the date-only UTC approach already used in cycleWeek.ts/weeklyStats.ts.

---

## PART 2 — Codex (GPT-5) independent adversarial reviews

### Cycle + entry data-flow

# Codex Adversarial Review

Target: working tree diff
Verdict: needs-attention

No-ship: the cycle data flow still has schema drift and multiple paths that tag, report, or display one cycle using data from another.

Findings:
- [critical] Runtime assumes cycle columns that init does not create (python-api/database.py:157-165)
  `save_entry` unconditionally reads and writes `entries.cycle_id`; the cycle/report paths similarly assume `cycles` and `reports.cycle_id` exist, but `init_db` still creates the legacy schema and the launcher starts `python main.py` without an observed Alembic step. A fresh or non-migrated DB will 500 on entry save/cycle save/report save, blocking persistence and risking partial client state.
  Recommendation: Run Alembic at API startup before constructing `Database`, or make `init_db` idempotently create/alter `cycles`, `entries.cycle_id`, `reports.cycle_id`, `reports.source_fingerprint`, and the one-active index; add a startup health check for required columns.
- [high] Report generation ignores the selected cycle when choosing source entries (src/contexts/app/actions/report-actions.ts:63-86)
  The reports page can pass a `cycleId`, but `generateReport` selects entries only by `current_program_id` or program start date. It later stores the passed `cycle_id` on the report, so a report for cycle A can be calculated from cycle B/current-program data while the fingerprint gate thinks cycle A's latest entry was reported. That corrupts report history and can block the correct follow-up report as 'no new data'.
  Recommendation: Make cycle-scoped report generation filter `entries` by `entry.cycle_id === cycleId` before deriving latest entry, current weight, status date, calculation, and fingerprint; fail closed when the selected cycle has no entries.
- [high] New entries are dispatched without canonical cycle identity (src/contexts/app/actions/entry-actions.ts:32-56)
  `addEntry` builds the client entry with `program_id` only, then dispatches the returned payload as the new entry. The server may fallback-tag the row to the active cycle, but this path does not require or propagate that canonical `cycle_id` before updating React state and auto-generating a report. Immediately after logging, cycle-scoped views can treat the weigh-in as unassigned or missing until a full reload, and the auto-report runs without explicit cycle/fingerprint inputs.
  Recommendation: Resolve the active cycle before save and include `cycle_id`, or make `saveEntry` return the persisted Python row with canonical `cycle_id`; dispatch only that canonical row and pass its `cycle_id` plus source fingerprint into auto-report generation.
- [high] Dashboard metrics remain program-scoped instead of active-cycle-scoped (src/components/dashboard/hooks/useDashboardData.ts:44-80)
  Dashboard data derives `programEntries` from `program_id` or start date and never filters by `cycle_id`; metrics then use `programEntries[0]` and profile/program-reference baselines. The dashboard also passes global entry dates/latest values into the cycle banner/card elsewhere. Empty or newly started active cycles can therefore show old-cycle progress, old missed-weigh-in coverage, and seed a new cycle from an unrelated latest entry.
  Recommendation: Make active cycle id a first-class dependency, derive `activeCycleEntries = scopeByCycle(entries, active.id)`, use cycle start fields for baselines, and render an explicit empty active-cycle state instead of falling back to program/profile data.

Next steps:
- Block shipping until schema migration is guaranteed at runtime.
- Fix report, entry, and dashboard paths so the same cycle-scoped entry set drives calculation, persistence, gating, and UI.

---

### Report generation

# Codex Adversarial Review

Target: working tree diff
Verdict: needs-attention

Do not ship: report output can still diverge from the user's real settings and the chart/date fix introduces another misleading projection path.

Findings:
- [high] Generated report recomputes with different inputs than calculation (python-api/main.py:531-552)
  The `/generate-report` path calls `predict_weight_loss` without `workout_days`, `volume_score`, `intensity_score`, or `eating_window_hours`, so it silently falls back to PRIME defaults. `/calculate` passes those fields, meaning the saved `calculation_result` and displayed progression can disagree with the HTML report for users with non-default training or fasting settings.
  Recommendation: Make `/generate-report` use the exact same argument set as `/calculate`, or stop recomputing and pass the already computed progression into the report generator.
- [high] No-new-data gate ignores profile and goal changes that alter the report (src/app/reports/page.tsx:118-125)
  The fingerprint only includes cycle id, latest entry id/date/updated_at, and hard-coded version strings. It excludes report-driving inputs such as goal weight/body fat, end date, activity, diet, protein, training settings, and fasting window. A user can edit those values and then be blocked with 'No new data to report' even though the generated report would materially change.
  Recommendation: Fingerprint a stable canonical payload of all report inputs, including active cycle goals/timeline, current profile settings, latest entry values, and generator/calculation versions.
- [medium] Prediction date fallback shifts baseline week one week late (src/components/charts/progress-trend-chart.utils.ts:316-324)
  The new fallback derives every predicted date as `latest actual + (weekIdx + 1) * 7`. PRIME progression includes a week 0 baseline row, so when the fallback branch is used, the current-weight baseline is plotted as next week and every predicted point is one week late.
  Recommendation: Parse backend dates explicitly, or drop/handle week 0 before deriving fallback dates; use the progression week number or `weekIdx * 7` only after baseline handling is defined.
- [medium] Report averages count the baseline row as a full week (new_prime_python_code/PRIME_Report_Generator_v3_Fast.py:371-415)
  `total_weeks = len(progression_data)` and the average loss calculations divide by that count, but PRIME progression contains an initial baseline row. The report therefore overstates the timeline by one row and understates average weekly weight/fat loss; `avg_deficit` also includes the baseline row's zero deficit.
  Recommendation: Treat the baseline separately: use `max(len(progression_data) - 1, 1)` for elapsed weeks and exclude week 0 from weekly averages/deficit summaries.

Next steps:
- Fix the report calculation/report-generator input skew first; it is the highest-risk source of user-visible wrong numbers.
- Add a regression test that compares `/calculate` progression against `/generate-report` context for non-default workout and fasting settings.
- Add a chart unit test for baseline week plus invalid/backend week dates.

---

### Charts / visualization

# Codex Adversarial Review

Target: working tree diff
Verdict: needs-attention

NO-SHIP: the date fix still manufactures wrong chart dates under the repo's own WeeklyProgression date contract, and the fallback shifts week-zero projections forward by a full week.

Findings:
- [high] Predicted-date fix still trusts unsafe MMDDYY/invalid Date parsing (src/components/charts/progress-trend-chart.utils.ts:320-322)
  Root cause: the changed path parses week.date with normaliseDate and only falls back when parsed.getFullYear() < 2000. But WeeklyProgression.date is declared as MMDDYY (src/types/index.ts:124), the backend emits strftime('%m%d%y') (new_prime_python_code/PRIME_Calculations.py:362), and normaliseDate masks invalid values as new Date() at lines 29-34. A missing or non-ISO progression date can therefore become 'today' and bypass the intended deterministic fallback, leaving the x-axis wrong and render-time dependent.
  Recommendation: Stop using raw new Date for progression dates. Parse MMDDYY/MM/DD/YY explicitly via a shared date parser, return null for invalid values, and trigger the fallback for any unparseable or unsupported format. Add regression tests for 010926, 01/09/26, empty date, and week-index strings.
- [high] Fallback projection dates are off by one week (src/components/charts/progress-trend-chart.utils.ts:323-324)
  When the fallback path triggers, progression[0] is plotted at latest actual + 7 days because the code uses (weekIdx + 1) * 7. The backend progression starts with week_number 0 at start_date/current measurements (new_prime_python_code/PRIME_Calculations.py:361-365), and other widgets treat progression[0] as the current week. This makes every fallback predicted point one week late and inconsistent with the calorie/metabolic widgets.
  Recommendation: Use the backend week_number when available, or derive fallback dates with weekIdx * 7 for progression arrays that include week 0. If the chart should only show future predictions, explicitly drop progression[0] before mapping instead of shifting it.
- [medium] Metabolic chart can emit NaN/Infinity percentages (src/components/charts/metabolic-insights-widget.tsx:77-95)
  The widget divides by currentWeek.tdee without checking that TDEE is finite and positive. The API adapter defaults missing tdee/rmr/tef/neat values to 0.0, so partial or stale progression data can produce 0/0 or n/0 percentages, which then feed the chart, Progress bars, and text labels as NaN/Infinity instead of a safe empty state.
  Recommendation: Validate currentWeek.tdee > 0 and all metabolic components are finite before building metabolicBreakdown. Render a no-data/diagnostic state for invalid rows and clamp valid percentages into 0..100 before passing them to charts and Progress.

Next steps:
- Add chart utility regression tests for MMDDYY, invalid dates, and week-zero alignment.
- Guard metabolic percentage math against zero and non-finite TDEE before rendering.

---

