# Extraction Report — Auto-SF2 Workbook

- **Source file:** `School Form_ Personal Info of Students Needed.xlsx` (3,504,626 bytes)
- **Extraction timestamp:** 2026-10-14T11:10:08
- **Status:** completed — 100% of usable workbook data extracted; source file not modified.

## Workbook overview
- **Workbook type:** DepEd **Auto-SF2** program (School Form 2 – Daily Attendance)
  with a **Modified SF1** (School Form 1 – roster) as the master name source.
- **Worksheets (16):** Instructions, Modified SF1, June, July, August, September, October, November, December, January, February, March, April, Conso, Summary, Printable SF2
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
2. **Blank ("", None) cached formula results** → `null`.
3. Identifiers kept as strings (school ID `"302245"`), dates kept as day-of-month integers
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
