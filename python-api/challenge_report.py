"""Revision-bound report rendering for the 14-day challenge."""

from __future__ import annotations

import html
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple


def _schedule_text(schedule: Dict[str, Any]) -> str:
    pieces = []
    for injection in schedule.get("injections", []):
        pieces.append(f"{injection.get('source_name')}: {injection.get('source_value')}")
    for timing, value in schedule.get("oral_and_daily_timing", {}).items():
        if str(value).strip() not in {"", "—", "-", "OFF"}:
            pieces.append(f"{timing}: {value}")
    for event in schedule.get("inventory_schedule_events", []):
        if event.get("resolution") == "reviewed_range_selection":
            pieces.append(
                f"Reviewed range record — {event.get('timing')}: {event.get('source_name')} "
                f"{event.get('amount')}{event.get('unit')} (source {event.get('source_value')})"
            )
    return "; ".join(pieces) or "No sourced items for this day"


def _log_by_day(logs: Iterable[Dict[str, Any]]) -> Dict[int, Dict[str, Any]]:
    return {int(row["day_number"]): row for row in logs}


def _stack_text(stack: List[Dict[str, Any]]) -> str:
    items = []
    for entry in stack:
        values = ", ".join(str(value) for value in entry.get("source_values", [])) or "source value not parsed"
        resolution = str(entry.get("dose_resolution") or "source text")
        items.append(f"{entry.get('source_name') or entry.get('compound')}: {values} ({resolution})")
    return "; ".join(items) or "No sourced compounds for this week"


def _inventory_markdown(plan: Dict[str, Any]) -> List[str]:
    coverage = plan.get("inventory_coverage") or {}
    review = plan.get("ped_review") or {}
    rows = [
        "## Inventory coverage at activation",
        "",
        "> This is inventory math only, not medical safety, interaction validation, or a recommendation.",
        "",
        f"- Validation status: {coverage.get('validation_status') or 'not recorded'}",
        f"- Medical safety status: {coverage.get('medical_safety_status') or 'not_validated'}",
        f"- Member confirmed entered inventory: {'Yes' if plan.get('member_inventory_confirmed') else 'No'}",
        f"- Documented reviewer: {review.get('reviewer_name') or 'Not recorded'} ({review.get('reviewer_role') or 'role not recorded'})",
        f"- Review note: {review.get('review_note') or 'Not recorded'}",
        "",
    ]
    for item in coverage.get("required_by_compound", []):
        rows.append(
            f"- {item.get('compound')}: {item.get('required_amount')} {item.get('unit')} required; "
            f"{item.get('available_amount')} {item.get('unit')} available; "
            f"{item.get('remaining_amount')} {item.get('unit')} remaining"
        )
    extras = ", ".join(str(item.get("label_name") or item.get("canonical_compound")) for item in coverage.get("unused_inventory", []))
    rows.extend([f"- Extra inventory left unallocated: {extras or 'None'}", ""])
    return rows


def _inventory_html(plan: Dict[str, Any]) -> str:
    coverage = plan.get("inventory_coverage") or {}
    review = plan.get("ped_review") or {}
    items = "".join(
        "<li><strong>{compound}:</strong> {required} {unit} required; {available} {unit} available; {remaining} {unit} remaining</li>".format(
            compound=html.escape(str(row.get("compound"))),
            required=html.escape(str(row.get("required_amount"))),
            available=html.escape(str(row.get("available_amount"))),
            remaining=html.escape(str(row.get("remaining_amount"))),
            unit=html.escape(str(row.get("unit"))),
        )
        for row in coverage.get("required_by_compound", [])
    ) or "<li>No activation inventory snapshot recorded.</li>"
    return (
        '<h2>Inventory coverage at activation</h2>'
        '<p class="notice">This is inventory math only, not medical safety, interaction validation, or a recommendation.</p>'
        f"<p><strong>Validation status:</strong> {html.escape(str(coverage.get('validation_status') or 'not recorded'))}<br>"
        f"<strong>Documented reviewer:</strong> {html.escape(str(review.get('reviewer_name') or 'Not recorded'))} "
        f"({html.escape(str(review.get('reviewer_role') or 'role not recorded'))})</p><ul>{items}</ul>"
    )


def render_challenge_report(
    cycle: Dict[str, Any],
    plan_revision: Dict[str, Any],
    logs: List[Dict[str, Any]],
    amendments: List[Dict[str, Any]],
) -> Tuple[str, str]:
    plan = plan_revision["plan_snapshot_json"]
    protocol = plan_revision["protocol_snapshot_json"]
    logged = _log_by_day(logs)
    title = f"{cycle.get('name') or plan.get('title')} — 14-Day Plan & Progress Report"
    if len(logged) >= 14:
        report_mode = "Final"
    elif cycle.get("status") in {"stopped", "archived", "cancelled"}:
        report_mode = "Stopped early"
    else:
        report_mode = "Progress"

    markdown = [
        f"# {title}",
        "",
        f"- Calendar: {plan.get('start_date')} through {plan.get('end_date')}",
        f"- Plan revision: {plan_revision.get('revision_number')}",
        f"- Template revision: {plan.get('template_revision_number')}",
        f"- Selected protocol source: {protocol.get('protocol_id')} / {protocol.get('version')}",
        f"- Selected source weeks: {protocol.get('start_week')}–{protocol.get('end_week')}",
        f"- Protocol source SHA-256: `{protocol.get('source_sha256')}`",
        f"- Report mode: {report_mode} ({len(logged)} of 14 days logged)",
        "",
        "> The PED section records a user-selected, pre-existing source schedule. It is not a medical recommendation or clinical approval.",
        "",
        "## Selected PED source snapshot",
        "",
        f"- Challenge Week 1 / source week {protocol.get('start_week')}: {_stack_text(protocol.get('ped_stack_by_week', {}).get('1', []))}",
        f"- Challenge Week 2 / source week {protocol.get('end_week')}: {_stack_text(protocol.get('ped_stack_by_week', {}).get('2', []))}",
        f"- Unresolved source dose ranges or values: {', '.join(protocol.get('unresolved_dose_compounds', [])) or 'None recorded'}",
        "",
        *_inventory_markdown(plan),
        "## Day-by-day diet, training, PED schedule, and actuals",
        "",
        "| Day | Date | Nutrition day | Calories | Protein | Training | Cardio | Instruction | Actual | Selected PED source schedule |",
        "| ---: | --- | --- | ---: | ---: | --- | --- | --- | --- | --- |",
    ]
    for day in plan.get("days", []):
        target = day.get("nutrition_target", {})
        actual = logged.get(int(day["day_number"]), {})
        actual_text = (
            f"{actual.get('calories', '—')} kcal; {actual.get('protein_g', '—')} g protein; "
            f"{actual.get('steps', '—')} steps"
            if actual
            else "Not logged"
        )
        markdown.append(
            "| {day} | {date} | {nutrition} | {cal} | {protein} g | {training} | {cardio} | {instruction} | {actual} | {schedule} |".format(
                day=day.get("day_number"),
                date=day.get("date"),
                nutrition=day.get("nutrition_type") or "standard",
                cal=target.get("calories", "—"),
                protein=target.get("protein_g", "—"),
                training=day.get("training") or "Recovery",
                cardio=day.get("cardio") or "—",
                instruction=str(day.get("key_instruction") or "—").replace("|", "/"),
                actual=actual_text,
                schedule=_schedule_text(day.get("protocol_schedule", {})),
            )
        )

    markdown.extend(["", "## Amendments", ""])
    if amendments:
        for amendment in amendments:
            markdown.append(
                f"- Effective Day {amendment.get('effective_day')}: {amendment.get('reason')} "
                f"(revision {amendment.get('previous_plan_revision')} → {amendment.get('new_plan_revision')})"
            )
    else:
        markdown.append("- No amendments recorded.")

    days_logged = len(logged)
    markdown.extend(
        [
            "",
            "## Recovery, measurement, adjustment, and safety rules",
            "",
            f"- Recovery: {plan.get('recovery') or 'Not specified'}",
            f"- Measurements: {plan.get('measurements') or 'Not specified'}",
            f"- Adjustment rules: {plan.get('adjustment') or 'Not specified'}",
            f"- Safety rules: {plan.get('safety') or 'Not specified'}",
            "",
            "## Completion snapshot",
            "",
            f"- Days logged: {days_logged} of 14",
            f"- Training completions: {sum(bool(row.get('training_completed')) for row in logs)}",
            f"- Cardio completions: {sum(bool(row.get('cardio_completed')) for row in logs)}",
            "",
            "Generated from the immutable plan revision and the actual daily logs shown above.",
        ]
    )
    markdown_text = "\n".join(markdown)

    rows = []
    for day in plan.get("days", []):
        target = day.get("nutrition_target", {})
        actual = logged.get(int(day["day_number"]), {})
        rows.append(
            "<tr>"
            f"<td>{day.get('day_number')}</td><td>{html.escape(str(day.get('date')))}</td>"
            f"<td>{html.escape(str(day.get('nutrition_type') or 'standard'))}</td>"
            f"<td>{target.get('calories', '—')}</td><td>{target.get('protein_g', '—')} g</td>"
            f"<td>{html.escape(str(day.get('training') or 'Recovery'))}</td>"
            f"<td>{html.escape(str(day.get('cardio') or '—'))}</td>"
            f"<td>{html.escape(str(day.get('key_instruction') or '—'))}</td>"
            f"<td>{html.escape(str(actual.get('calories', '—')))} kcal<br>{html.escape(str(actual.get('protein_g', '—')))} g protein<br>{html.escape(str(actual.get('steps', '—')))} steps</td>"
            f"<td>{html.escape(_schedule_text(day.get('protocol_schedule', {})))}</td>"
            "</tr>"
        )
    amendment_html = "".join(
        f"<li><strong>Effective Day {item.get('effective_day')}:</strong> {html.escape(str(item.get('reason') or 'No reason recorded'))} "
        f"(revision {item.get('previous_plan_revision')} to {item.get('new_plan_revision')})</li>"
        for item in amendments
    ) or "<li>No amendments recorded.</li>"
    stack_week_1 = html.escape(_stack_text(protocol.get("ped_stack_by_week", {}).get("1", [])))
    stack_week_2 = html.escape(_stack_text(protocol.get("ped_stack_by_week", {}).get("2", [])))
    unresolved = html.escape(", ".join(protocol.get("unresolved_dose_compounds", [])) or "None recorded")
    html_text = f"""<!doctype html><html><head><meta charset="utf-8"><title>{html.escape(title)}</title>
<style>:root{{--ink:#171922;--muted:#5c6373;--paper:#f7f8fb;--card:#fff;--line:#d9dde7;--signal:#f56a24;--soft:#fff0e7}}
*{{box-sizing:border-box}}body{{font:15px/1.55 Inter,ui-sans-serif,system-ui;background:var(--paper);max-width:1500px;margin:0 auto;padding:40px 28px;color:var(--ink)}}
h1,h2{{font-family:Georgia,serif;letter-spacing:-.02em}}h1{{font-size:38px;margin-bottom:8px}}h2{{margin-top:32px;border-top:1px solid var(--line);padding-top:24px}}
table{{border-collapse:separate;border-spacing:0;width:100%;background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden;font-size:13px}}
th,td{{border-bottom:1px solid var(--line);padding:10px;vertical-align:top;text-align:left}}th{{background:#eff2f7;font-size:11px;text-transform:uppercase;letter-spacing:.06em}}tr:last-child td{{border-bottom:0}}
.notice{{background:var(--soft);border-left:4px solid var(--signal);padding:14px;border-radius:6px}}.meta{{color:var(--muted)}}li{{margin:6px 0}}</style></head><body>
<h1>{html.escape(title)}</h1><p><strong>Calendar:</strong> {plan.get('start_date')} through {plan.get('end_date')}<br>
<strong>Plan revision:</strong> {plan_revision.get('revision_number')} &nbsp; <strong>Template revision:</strong> {plan.get('template_revision_number')}<br>
<strong>Selected source:</strong> {html.escape(str(protocol.get('protocol_id')))} / {html.escape(str(protocol.get('version')))}, weeks {protocol.get('start_week')}–{protocol.get('end_week')}<br>
<strong>Report mode:</strong> {report_mode} ({len(logged)} of 14 days logged)</p>
<p class="notice">The PED section records a user-selected, pre-existing source schedule. It is not a medical recommendation or clinical approval.</p>
<h2>Selected PED source snapshot</h2><ul><li><strong>Challenge Week 1 / source week {protocol.get('start_week')}:</strong> {stack_week_1}</li><li><strong>Challenge Week 2 / source week {protocol.get('end_week')}:</strong> {stack_week_2}</li><li><strong>Unresolved source dose ranges or values:</strong> {unresolved}</li></ul>
{_inventory_html(plan)}
<h2>Day-by-day diet, training, PED schedule, and actuals</h2><table><thead><tr><th>Day</th><th>Date</th><th>Nutrition day</th><th>Calories</th><th>Protein</th><th>Training</th><th>Cardio</th><th>Instruction</th><th>Actuals</th><th>Selected PED source schedule</th></tr></thead><tbody>{''.join(rows)}</tbody></table>
<h2>Amendments</h2><ul>{amendment_html}</ul>
<h2>Recovery, measurement, adjustment, and safety rules</h2><p><strong>Recovery:</strong> {html.escape(str(plan.get('recovery') or 'Not specified'))}<br><strong>Measurements:</strong> {html.escape(str(plan.get('measurements') or 'Not specified'))}<br><strong>Adjustment:</strong> {html.escape(str(plan.get('adjustment') or 'Not specified'))}<br><strong>Safety:</strong> {html.escape(str(plan.get('safety') or 'Not specified'))}</p>
<h2>Completion snapshot</h2><p>{days_logged} of 14 days logged. Training completions: {sum(bool(row.get('training_completed')) for row in logs)}. Cardio completions: {sum(bool(row.get('cardio_completed')) for row in logs)}.</p>
</body></html>"""
    return markdown_text, html_text


def write_challenge_report(
    output_dir: Path,
    cycle_id: str,
    markdown_text: str,
    html_text: str,
) -> Tuple[Path, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    safe_cycle = re.sub(r"[^A-Za-z0-9._-]+", "-", cycle_id).strip("-") or "challenge"
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    stem = f"two_week_cut_{safe_cycle}_{timestamp}"
    md_path = output_dir / f"{stem}.md"
    html_path = output_dir / f"{stem}.html"
    md_path.write_text(markdown_text, encoding="utf-8")
    html_path.write_text(html_text, encoding="utf-8")
    return md_path, html_path
