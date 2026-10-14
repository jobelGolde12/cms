# Excel → JSON Validation Report

```
========================================
EXCEL → JSON VALIDATION REPORT
========================================
Workbook:             School Form_ Personal Info of Students Needed.xlsx
Generated:            2026-10-14T11:10:08
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
| June | 9 male + 9 female = 18 | 18 | 22 | PASS |
| July | 9 male + 8 female = 17 | 17 | 23 | PASS |
| August | 9 male + 8 female = 17 | 17 | 21 | PASS |
| September | 9 male + 8 female = 17 | 17 | 22 | PASS |
| October | 9 male + 8 female = 17 | 17 | 22 | PASS |
| November | 9 male + 8 female = 17 | 17 | 21 | PASS |
| December | 9 male + 8 female = 17 | 17 | 23 | PASS |
| January | 9 male + 8 female = 17 | 17 | 21 | PASS |
| February | 9 male + 8 female = 17 | 17 | 21 | PASS |
| March | 9 male + 8 female = 17 | 17 | 23 | PASS |
| April | 9 male + 8 female = 17 | 17 | 19 | PASS |
| Conso | 9 male + 8 female = 17 | 17 | 18 | PASS |

## Method
The validator (`scripts/validate-extraction.py`) independently re-opened the source
workbook with openpyxl (both raw and cached-value modes) and compared:
worksheet list & names; SF1 roster & metadata; every month sheet's date row, day codes,
student rosters, typed attendance marks, absent/tardy totals, remarks and page-2 summary
values; Conso grid; Summary per-learner totals including all 11 monthly cells × 17
learners; students.json name set vs SF1; Printable SF2 grid counts.
No value was altered to make validation pass. All 6 inconsistencies listed are present
**in the source workbook** and were preserved verbatim, then reported.
