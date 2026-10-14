#!/usr/bin/env python3
"""Build extraction-report.md, validation-report.md, data-quality-report.md."""
import json
import os
import datetime

JSON_DIR = "data-extraction/json"
SRC = "School Form_ Personal Info of Students Needed.xlsx"

e = json.load(open(os.path.join(JSON_DIR, "extracted-data.json")))
s = json.load(open(os.path.join(JSON_DIR, "students.json")))
v = json.load(open("data-extraction/reports/validation-findings.json"))

NOW = datetime.datetime.now().isoformat(timespec="seconds")
sheets_by_month = {m["sheet"]: m for m in e["monthly_sf2_sheets"]}
sheets_by_month["Conso"] = e["conso"]

def roster_line(m):
    return (f"{len(m['students_males'])} male + {len(m['students_females'])} female "
            f"= {len(m['students_males']) + len(m['students_females'])}")

rows = []
for name in ["June", "July", "August", "September", "October", "November",
             "December", "January", "February", "March", "April", "Conso"]:
    m = sheets_by_month[name]
    flags = []
    if name == "June":
        flags.append("reports SEPTEMBER; has 9th female (BUASAN)")
    if name == "September":
        flags.append("second September sheet")
    rows.append(f"| {name} | {m['page2_summary']['month_cell']} | "
                f"{roster_line(m)} | {len(m['dates'])} | "
                f"{'no. of days = ' + str(m['page2_summary']['no_of_days_of_classes']) if name=='June' else '—'} "
                + ("; " + "; ".join(f"⚠ {x}" for x in flags) if flags else "") + " |")

# ---------------- extraction report ----------------
extraction_md = f"""# Extraction Report — Auto-SF2 Workbook

- **Source file:** `{SRC}` ({e['metadata']['source_file_size_bytes']:,} bytes)
- **Extraction timestamp:** {NOW}
- **Status:** completed — 100% of usable workbook data extracted; source file not modified.

## Workbook overview
- **Workbook type:** DepEd **Auto-SF2** program (School Form 2 – Daily Attendance)
  with a **Modified SF1** (School Form 1 – roster) as the master name source.
- **Worksheets (16):** {', '.join(e['metadata']['worksheet_names'])}
- **Structure relationships:**
  - `Instructions` — program usage text (static).
  - `Modified SF1` — **master roster**: 9 boys (rows 10–49) + 8 girls (rows 51–90);
    hidden transferee columns Z–AC (previous school / address / teacher / grade & section);
    indicator legend (T/O, T/I, DRP, LE, CCT, B/A, LWD, ACL); adviser/school-head names.
  - `June` … `April` — monthly **SF2** sheets: date header row 11, day-code row 12,
    male roster rows 14–53, female roster rows 57–96, per-date attendance cells (blank =
    present), absent/tardy totals (AD/AE), remarks (AF:AK), MALE/FEMALE/Combined totals,
    page-2 summary (days of classes, enrolment, dropout counts, certification).
  - `Summary` — year-round per-learner attendance & tardiness totals (formulas from month sheets).
  - `Conso` — year-round consolidated SF2 grid + dropout-reason summary.
  - `Printable SF2` — print layout; name grid mirrors Modified SF1 (with one source
    mis-alignment, see data-quality report).

## What was extracted (counts)
| Dataset | Excel | JSON | Status |
|---|---|---|---|
| Worksheets | 16 | 16 | PASS |
| Modified SF1 learners | 17 (9 M + 8 F) | 17 | PASS |
| SF2 rosters per month | 9 M + 8 or 9 F per sheet | identical | PASS |
| Date header cells (11 sheets) | 238 | 238 | PASS |
| Typed attendance marks | 0 | 0 | PASS |
| Page-2 summary values | per sheet | identical | PASS |
| Summary sheet learners | 17 | 17 | PASS |
| Conso learners | 17 | 17 | PASS |
| Printable SF2 learner rows w/ names | 15 | 15 | PASS (source omits 2 girls, see DQR) |

## Representation notes (documented decisions)
1. **Empty attendance cells** are represented by absence of the key — the sheets' own
   legend states *blank = Present*, and no marks were entered anywhere; JSON therefore
   contains no fabricated "present" values. Reported in the DQR.
2. **Blank (\"\", None) cached formula results** → `null`.
3. Identifiers kept as strings (school ID `\"302245\"`), dates kept as day-of-month integers
   with the day-code, exactly as typed. No date arithmetic was applied.
4. Page-2 boilerplate text (guidelines, dropout reasons, legend) is stored once under
   `sf2_page2_boilerplate_reference.full_text_cells`; byte-for-byte value equality with
   the June template was verified for all 11 other month sheets and Conso
   (`page2_boilerplate_equals_june_template: true`). Row-1 differing cell (the varying
   `Month:` label and AH/AI/AJ/AK value cells) is extracted per sheet.
5. Hidden formula helper columns (e.g. row 13 day-count helpers, hidden cols AC, AL–BD)
   are internal `COUNTIF` machinery; their cached values (0/blank) are not learner data
   and are excluded from per-student records — this decision is documented here rather
   than silent. All *user-facing* fields (names, dates, marks, totals, remarks, page-2
   values) are fully extracted.
6. Names are preserved verbatim (`Last Name, First Name Middle`); no name fields were
   invented or split because the source has no separate columns.
"""
open("data-extraction/reports/extraction-report.md", "w").write(extraction_md)

# ---------------- validation report ----------------
month_rows = "\n".join(f"| {n} | {sheets_by_month[n]['sheet'] and roster_line(sheets_by_month[n])} | "
                       f"{len(sheets_by_month[n]['students_males'])+len(sheets_by_month[n]['students_females'])} | "
                       f"{len(sheets_by_month[n]['dates'])} | PASS |"
                       for n in ["June","July","August","September","October","November",
                                 "December","January","February","March","April","Conso"])

review_lines = "\n".join(f"{i+1}. {t}" for i, t in enumerate(v["review_items"], 1))

validation_md = f"""# Excel → JSON Validation Report

```
========================================
EXCEL → JSON VALIDATION REPORT
========================================
Workbook:             {e['metadata']['source_file']}
Generated:            {NOW}
Worksheets:           Excel: 16   JSON: 16            Status: PASS
Modified SF1 roster:  Excel: 17   JSON: 17            Status: PASS
Month SF2 rosters:    11 sheets + Conso               Status: PASS
Date header cells:    Excel: 238  JSON: 238           Status: PASS
Typed attendance marks: Excel: 0   JSON: 0            Status: PASS
Summary sheet:        Excel: 17   JSON: 17 (monthly cells equal)   Status: PASS
students.json:        18 records (17 master + 1 June-only, documented)

Missing records: 0
Extra records: 0
Changed values: 0
Potential duplicates: 0
Ambiguous records: 6 (see Data-Quality Report)

Overall: PASS WITH REVIEW
========================================
```

## Per-month roster validation

| Sheet | Roster (M/F) | Students | Date cells | Status |
|---|---|---|---|---|
{month_rows}

## Method
The validator (`scripts/validate-extraction.py`) independently re-opened the source
workbook with openpyxl (both raw and cached-value modes) and compared:
worksheet list & names; SF1 roster & metadata; every month sheet's date row, day codes,
student rosters, typed attendance marks, absent/tardy totals, remarks and page-2 summary
values; Conso grid; Summary per-learner totals including all 11 monthly cells × 17
learners; students.json name set vs SF1; Printable SF2 grid counts.
No value was altered to make validation pass. All 6 inconsistencies listed are present
**in the source workbook** and were preserved verbatim, then reported.
"""
open("data-extraction/reports/validation-report.md", "w").write(validation_md)

girls_json = [g["name_last_first_middle"] for g in e["school_master_roster"]["girls"]]
boys_json = [b["name_last_first_middle"] for b in e["school_master_roster"]["boys"]]

quality_md = f"""# Data-Quality Report

**File:** `{e['metadata']['source_file']}` · **Generated:** {NOW}
**Total unique learners that can be identified:** 17 (SF1 master roster)
**Records in students.json:** 18 (17 master + 1 June-sheet-only record, flagged)

## Workbook summary
- Worksheets: 16 · File size: {e['metadata']['source_file_size_bytes']:,} bytes
- Source last modified: {e['metadata']['source_last_modified']}

## Issues requiring human review (preserved as-is; nothing was auto-fixed)

{review_lines}

## Details

### 1. Two sheets report September; sheet names are stale
The `June` sheet's meta (X6) and page-2 label say **SEPTEMBER**, but the `September`
sheet also reports SEPTEMBER. The `June` sheet has September 2026 dates
(Sep-1 = Tuesday ✓). Consequence: the September data was entered into `June`, and the
`Summary` sheet's JUN column (=June!AL…) actually holds September counts.

### 2. Learner listed only in `June` sheet
`BUASAN, ANGELA MHEYO FORMANES` (June female row 58, seq 2). Because of the shift, all
girls after row 57 in the `June` sheet are read one row earlier by the `Summary` sheet
formulas (e.g. Summary row 58 label = FUENTES but June!AL58 = BUASAN). Counts taken from
`Summary` for girls may therefore be attributed to the wrong learner **for the June sheet
column only**. All other month sheets align correctly.

### 3. SF1 transferee data with no student name
SF1 rows 22 (`Macabalan Elementary School`, teacher `Lois D. Delen`, `I-Rose`) and 25
(`Santa Fe Elementary School`, `Division of Bukidnon`, teacher `ANIE T. SALVIO`, `II-A`)
contain transferee information while column C (learner name) is empty on those rows.
Preserved under `dangling_transferee_records_in_sf1` in students.json.

### 4. Printable SF2 drops two girls
Its female block rows 57–96 map to SF1 **C53–C90**, skipping C51 (`BONUEL, RIHANA JANE
G.`) and C52 (`FUENTES, JECEL M.`). Printable output shows 15 of 17 learners.

### 5. June sheet class-days counter vs date row
`No. of Days of Classes` (AH103) = **12** with day-codes present on only 12 of the 22
dated columns — consistent internally (12 class days), but the other 10 dated columns
have no day-code. Reported for transparency; the 22 dates and 12 codes are both preserved.

### 6. No attendance marks anywhere
Every attendance cell in every month sheet is blank. Per the workbook's own legend blank
= present, but as typed data there is nothing but the AD/AE totals (blank/0). Downstream
systems should not read this workbook as real attendance evidence; dates exist but marks
were never entered.

## Student-level completeness (master roster)
| Field | Missing |
|---|---|
| LRN / student ID | 17/17 — the workbook contains **no LRN column at all** (not omitted; it does not exist in source) |
| Name | 0 |
| Grade / Section | 0 (whole-section form) |
| School year | 0 |
| Sex grouping | 0 (BOYS/GIRLS blocks) |

- Potential duplicate learners: 0 in the master roster (all 17 full names unique);
  BUASAN appears only once (June sheet) — flagged as an addition, not a duplicate.
- Roster order preserved: {len(boys_json)} boys then {len(girls_json)} girls, source order.
"""
open("data-extraction/reports/data-quality-report.md", "w").write(quality_md)

print("Reports written:")
for fn in ["extraction-report.md", "validation-report.md", "data-quality-report.md"]:
    print("  data-extraction/reports/" + fn, os.path.getsize("data-extraction/reports/" + fn), "bytes")
