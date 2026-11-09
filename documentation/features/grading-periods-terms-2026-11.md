# Grading Periods — Three Terms (2026-11)

> **Implementation record**, not a plan. The school grades in **three
> terms**; the old four-quarter vocabulary is gone from the database, the UI,
> the reports, the forecasting engine and the Form 137.

---

## 1. The rule

```
TERM 1   (order_index 1, is_current)
TERM 2   (order_index 2)
TERM 3   (order_index 3)
```

There is no `TERM 4`, no `Quarter 1..4`, and no leftover "Q" label anywhere in
the application.

```ts
// src/lib/constants.ts
export const GRADING_PERIOD_NAMES = ["TERM 1", "TERM 2", "TERM 3"] as const;
export const GRADING_PERIOD_COUNT = GRADING_PERIOD_NAMES.length; // 3
```

---

## 2. Migration strategy — applied, not a blind rename

`drizzle/0013_grading_periods_terms.sql` was applied to the Turso `cms`
database. It is deliberately conservative:

1. **Rename in place, guarded.** `Quarter 1/2/3` → `TERM 1/2/3`, each rename
   skipped when the target name already exists in the same school year, so the
   unique index `grading_periods_sy_name_uq` can never be violated.
   Historical grades keep pointing at the **same** `grading_period_id` rows —
   no grade was ever re-pointed.
2. **Retire the fourth period only when it is unused.** The row with
   `order_index = 4` is deleted **only** when nothing references it
   (`student_grades`, `grade_submissions`). A referenced period is kept
   untouched as a historical row and never surfaces in a dropdown.
3. **Purge the derived forecast cache.** Forecast rows whose `target_period`
   carried the old `·Q<n>` label are deleted — they are derived data and the
   label format changed to `·TERM <n>`.

```sql
UPDATE `grading_periods` SET `name` = 'TERM 1'
 WHERE `name` = 'Quarter 1'
   AND NOT EXISTS (SELECT 1 FROM `grading_periods` g2
                    WHERE g2.school_year_id = `grading_periods`.school_year_id
                      AND g2.name = 'TERM 1');
-- …same guarded pattern for TERM 2 and TERM 3…
DELETE FROM `grading_periods`
 WHERE `order_index` = 4
   AND `id` NOT IN (SELECT `grading_period_id` FROM `student_grades`)
   AND `id` NOT IN (SELECT `grading_period_id` FROM `grade_submissions`);
DELETE FROM `forecasts` WHERE `target_period` LIKE '%·Q%';
```

---

## 3. What changed in the code

| Area | Change |
|---|---|
| `src/lib/constants.ts` | `GRADING_PERIOD_NAMES = ["TERM 1","TERM 2","TERM 3"]`, plus `GRADING_PERIOD_COUNT` |
| `src/lib/forecasting/time-series.ts` | the time series is keyed by **term**: `{ schoolYear, term }`, minimum three periods (`MIN_PERIODS_*`), cache key `"{schoolYear}·TERM {n}"` |
| `src/lib/forecasting/arima.ts` | forecast horizon of **3** periods; the label sequence advances TERM 1 → 2 → 3 and rolls over to the next school year after TERM 3 |
| `src/lib/forecasting/service.ts`, `storage.ts` | term-aware storage and cache keys |
| `src/lib/form137.ts` | `SF9_TERMS = ["Term 1","Term 2","Term 3"]`; `Form137Subject.terms` holds three values |
| `src/lib/reports/form137-pdf.tsx` | six-column layout — subject, three term columns, general average — widths `["30%","10%","10%","10%","10%","30%"]` |
| `src/app/(app)/students/[id]/print/form137/page.tsx` | `colSpan` values updated to 6 / 4 / 2 |
| `src/components/forecast/forecast-panel.tsx`, `src/app/(app)/performance/page.tsx` | the copy now says *term*, not *quarter* |

### Forecasting after the change

* A forecast needs at least **three** completed periods (`minPeriodsFor`), so
  the model only runs once TERM 3 of a school year is closed.
* The projection covers three periods forward and labels them
  `TERM 1`, `TERM 2`, `TERM 3` of the next cycle, rolling the school year over
  after the last term.

---

## 4. Verification

| Check | Result |
|---|---|
| `SELECT COUNT(*) FROM grading_periods` | **3** |
| Rows | `gp-sy-2026-2027-1` = TERM 1 (current), `-2` = TERM 2, `-3` = TERM 3 |
| `SELECT COUNT(*) FROM grading_periods WHERE name LIKE '%Quarter%' OR name LIKE '%Q_' …` | **0** |
| `SELECT COUNT(*) FROM forecasts WHERE target_period LIKE '%·Q%'` | **0** |
| `PRAGMA foreign_key_check` | no rows |
| `PRAGMA integrity_check` | `ok` |
| Form 137 PDF tests | `src/lib/__tests__/form137-pdf.test.ts` — three term columns |
| Forecasting tests | `src/lib/__tests__/forecasting.test.ts` — rewritten for terms |

---

## 5. Operational notes

* The grading-period picker on the Grade Encoding screen, the Performance
  screen and the Report Card now offers **TERM 1 / TERM 2 / TERM 3**.
* A school year that still has a historical fourth period in the database
  keeps it, but the application never offers it. It can be deleted once no
  grade references it.
* Adding a fourth term later requires: a new row in `grading_periods`
  (`order_index = 4`), a change of `GRADING_PERIOD_NAMES`, and a new forecast
  horizon. The unique index `grading_periods_sy_name_uq` keeps the names
  unique per school year.
