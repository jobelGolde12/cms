# Data-Quality Report

**File:** `School Form_ Personal Info of Students Needed.xlsx` · **Generated:** 2026-10-14T11:10:08
**Total unique learners that can be identified:** 17 (SF1 master roster)
**Records in students.json:** 18 (17 master + 1 June-sheet-only record, flagged)

## Workbook summary
- Worksheets: 16 · File size: 3,504,626 bytes
- Source last modified: 2026-10-14T10:37:20

## Issues requiring human review (preserved as-is; nothing was auto-fixed)

2. Learner 'June' appears in the 'June' SF2 sheet roster but is missing from the Modified SF1 master roster (Summary sheet therefore mis-aligns June female rows).
3. Sheet 'June' reports the month of SEPTEMBER (two sheets report September: 'June' and 'September').
4. Modified SF1 rows 22/25 contain transferee data (previous school/teacher/grade) but no student name in column C on those rows.
5. Printable SF2 female block skips Modified SF1 girls #1-2 (BONUEL, RIHANA JANE G. and FUENTES, JECEL M.): row 57 maps to SF1 C53.
6. No attendance marks were recorded anywhere in the workbook: every attendance cell is blank (blank = present per the sheet's own legend); all absent/tardy totals are blank or 0.
7. June sheet 'No. of Days of Classes' = 12 but its date row lists 22 September dates.

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
- Roster order preserved: 9 boys then 8 girls, source order.
