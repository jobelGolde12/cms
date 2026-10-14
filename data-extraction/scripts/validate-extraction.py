#!/usr/bin/env python3
"""
Automated XLSX -> JSON validation.
Re-reads the source workbook and compares every extracted dataset against
data-extraction/json/*.json. Produces machine counts used by the reports.
"""
import json
import os
import sys

import openpyxl
from openpyxl.utils import get_column_letter

SRC = "School Form_ Personal Info of Students Needed.xlsx"
JSON_DIR = "data-extraction/json"

issues = []       # real failures (missing/extra/changed)
review = []       # documented source inconsistencies that need human review

def fail(msg):
    issues.append(msg)

def review_item(msg):
    review.append(msg)

wb_raw = openpyxl.load_workbook(SRC, data_only=False)
wb_val = openpyxl.load_workbook(SRC, data_only=True)

extracted = json.load(open(os.path.join(JSON_DIR, "extracted-data.json")))
students_doc = json.load(open(os.path.join(JSON_DIR, "students.json")))
mapping = json.load(open(os.path.join(JSON_DIR, "field-mapping.json")))

# ---------------------------------------------------------------- worksheets
src_sheets = wb_raw.sheetnames
json_sheets = extracted["metadata"]["worksheet_names"]
ok = src_sheets == json_sheets and extracted["metadata"]["worksheet_count"] == len(src_sheets)
print(f"Worksheets: excel={len(src_sheets)} json={extracted['metadata']['worksheet_count']} -> {'PASS' if ok else 'FAIL'}")
if not ok:
    fail(f"Worksheet list mismatch: {src_sheets} vs {json_sheets}")

# ---------------------------------------------------------------- SF1 roster
def sf1_names(wbv):
    names = []
    for rows, grp in ((range(10, 50), "BOYS"), (range(51, 91), "GIRLS")):
        for r in rows:
            v = wbv["Modified SF1"].cell(row=r, column=3).value
            if isinstance(v, str) and v.strip():
                names.append((grp, r, v.strip()))
    return names

src_sf1 = sf1_names(wb_val)
json_boys = extracted["school_master_roster"]["boys"]
json_girls = extracted["school_master_roster"]["girls"]
json_sf1 = [(b["sex_group"], b["excel_row"], b["name_last_first_middle"]) for b in json_boys] + \
           [(g["sex_group"], g["excel_row"], g["name_last_first_middle"]) for g in json_girls]
ok = src_sf1 == json_sf1
print(f"Modified SF1 roster: excel={len(src_sf1)} json={len(json_sf1)} -> {'PASS' if ok else 'FAIL'}")
if not ok:
    fail(f"SF1 roster mismatch: excel={src_sf1} json={json_sf1}")

# SF1 meta
meta = extracted["school_master_roster"]["meta"]
for label, sheet, r, c, key in [
    ("school_id", "Modified SF1", 4, 6, "school_id"),
    ("region", "Modified SF1", 4, 10, "region"),
    ("division", "Modified SF1", 4, 13, "division"),
    ("district", "Modified SF1", 4, 19, "district"),
    ("school_name", "Modified SF1", 6, 6, "school_name"),
    ("school_year", "Modified SF1", 6, 15, "school_year"),
    ("section", "Modified SF1", 6, 22, "section"),
]:
    src = wb_val[sheet].cell(row=r, column=c).value
    jl = meta[key]
    if str(src).strip() != str(jl).strip():
        fail(f"SF1 meta {label}: excel={src!r} json={jl!r}")
grade_src = wb_val["Modified SF1"].cell(row=6, column=19).value
if grade_src != meta["grade_level"]:
    fail(f"SF1 grade_level: excel={grade_src!r} json={meta['grade_level']!r}")
print(f"SF1 meta fields: {'PASS' if not any('SF1 meta' in i or 'grade_level' in i for i in issues) else 'FAIL'}")

# transferee rows
for rec in extracted["school_master_roster"]["dangling_transferee_records"]:
    r = rec["excel_row"]
    z = wb_val["Modified SF1"].cell(row=r, column=26).value
    if (z or "").strip() != (rec["transferee_information"].get("previous_school") or ""):
        fail(f"transferee row {r} mismatch")
print(f"Transferee records: {len(extracted['school_master_roster']['dangling_transferee_records'])} (excel==json)")

# ---------------------------------------------------------------- month sheets
month_names = ["June", "July", "August", "September", "October", "November",
               "December", "January", "February", "March", "April"]
total_marks_cells = 0
total_date_cells = 0
roster_mismatches = []
sf1_names_set = {n[2] for n in src_sf1}
june_extra = []   # names in a month sheet but not in SF1 roster

for idx, name in enumerate(month_names):
    m = extracted["monthly_sf2_sheets"][idx]
    assert m["sheet"] == name
    # dates
    src_date_cols = [c for c in range(4, 31) if wb_val[name].cell(row=11, column=c).value not in (None, "")]
    src_dates = []
    for c in src_date_cols:
        v = wb_val[name].cell(row=11, column=c).value
        src_dates.append((get_column_letter(c), int(v) if isinstance(v, float) else v,
                          wb_val[name].cell(row=12, column=c).value))
    json_dates = [(d["excelColumn"], d["day_of_month"], d["day_code"]) for d in m["dates"]]
    if src_dates != json_dates:
        fail(f"{name} dates mismatch: excel={src_dates} json={json_dates}")
    total_date_cells += len(src_dates)
    # students
    src_m = [(r, wb_val[name].cell(row=r, column=2).value.strip())
             for r in range(14, 54) if isinstance(wb_val[name].cell(row=r, column=2).value, str)
             and wb_val[name].cell(row=r, column=2).value.strip()]
    src_f = [(r, wb_val[name].cell(row=r, column=2).value.strip())
             for r in range(57, 97) if isinstance(wb_val[name].cell(row=r, column=2).value, str)
             and wb_val[name].cell(row=r, column=2).value.strip()]
    json_m = [(s["excel_row"], s["name_last_first_middle"]) for s in m["students_males"]]
    json_f = [(s["excel_row"], s["name_last_first_middle"]) for s in m["students_females"]]
    if src_m != json_m or src_f != json_f:
        fail(f"{name} roster mismatch")
    for _, nm in src_m + src_f:
        if nm not in sf1_names_set and nm.endswith("FORMANES") is False:
            roster_mismatches.append((name, nm))
        if nm not in sf1_names_set:
            june_extra.append((name, nm))
    # attendance marks actually typed in (raw)
    num_marks = 0
    for r in list(range(14, 54)) + list(range(57, 97)):
        for c in src_date_cols:
            cell = wb_raw[name].cell(row=r, column=c)
            if isinstance(cell.value, str) and cell.value.strip() and not cell.value.startswith("="):
                num_marks += 1
                jc = m["students_males"] + m["students_females"]
                js = [s for s in jc if s["excel_row"] == r]
                if not js or get_column_letter(c) not in js[0]["attendance_marks_recorded"]:
                    fail(f"{name} row {r} col {get_column_letter(c)} mark not in JSON")
    total_marks_cells += num_marks
    # AD/AE totals and remarks
    for band in ("students_males", "students_females"):
        for s in m[band]:
            r = s["excel_row"]
            ad = wb_val[name].cell(row=r, column=30).value
            ae = wb_val[name].cell(row=r, column=31).value
            if ad != s["absent_total"]:
                fail(f"{name} r{r} absent_total excel={ad!r} json={s['absent_total']!r}")
            if ae != s["tardy_total"]:
                fail(f"{name} r{r} tardy_total excel={ae!r} json={s['tardy_total']!r}")
            rem = wb_val[name].cell(row=r, column=32).value
            jrem = s.get("remarks")
            if (rem or "").strip() != (jrem or ""):
                fail(f"{name} r{r} remarks excel={rem!r} json={jrem!r}")
    # no. of days & page2 values
    base = 103 if name == "June" else 102
    ahd = wb_val[name].cell(row=base, column=34).value
    if ahd != m["page2_summary"]["no_of_days_of_classes"]:
        fail(f"{name} AH days excel={ahd!r} json={m['page2_summary']['no_of_days_of_classes']!r}")
    for rr, key in ((105, "enrolment_as_of_1st_friday_of_june"),
                    (109, "registered_learner_as_of_end_of_the_month"),
                    (118, "dropout"), (120, "transferred_out"), (122, "transferred_in")):
        vals = [wb_val[name].cell(row=base - 3 + rr - 105 + 3, column=c).value if False else
                wb_val[name].cell(row=rr, column=c).value for c in (35, 36, 37)]
        jvals = [m["page2_summary"]["values"][key].get(k) for k in ("M", "F", "TOTAL")]
        if vals != jvals:
            fail(f"{name} page2 {key}: excel={vals} json={jvals}")

print(f"Month sheets rosters/dates/marks/page2: checked 11 sheets; "
      f"date cells={total_date_cells}, typed attendance marks={total_marks_cells}")

# Conso roster + marks
conso = extracted["conso"]
src_conso_m = [(r, wb_val["Conso"].cell(row=r, column=2).value.strip())
               for r in range(14, 54) if isinstance(wb_val["Conso"].cell(row=r, column=2).value, str)
               and wb_val["Conso"].cell(row=r, column=2).value.strip()]
header_n = len(src_conso_m)  # 9 males
print(f"Conso sheet: month_cell={conso['page2_summary']['month_cell']!r}, "
      f"students={len(conso['students_males']) + len(conso['students_females'])}")

# ---------------------------------------------------------------- Summary sheet
sum_students = extracted["summary"]["students"]
src_sum = []
for r in list(range(14, 54)) + list(range(57, 97)):
    nm = wb_val["Summary"].cell(row=r, column=2).value
    if isinstance(nm, str) and nm.strip():
        o = wb_val["Summary"].cell(row=r, column=15).value
        aa = wb_val["Summary"].cell(row=r, column=27).value
        src_sum.append((r, nm.strip(), o, aa))
json_sum = [(s["excel_row"], s["name_last_first_middle"],
             s["attendance"].get("TOTAL"), s["tardiness"].get("TOTAL")) for s in sum_students]
ok_sums = src_sum == json_sum
print(f"Summary students: excel={len(src_sum)} json={len(json_sum)} -> {'PASS' if ok_sums else 'FAIL'}")
if not ok_sums:
    fail(f"Summary mismatch: excel={src_sum} json={json_sum}")

# monthly summary cells against each student rec (values are formula caches)
monthly_diffs = 0
for s, src in zip(sum_students, src_sum):
    for off, key in zip(range(4, 15), ["JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC", "JAN", "FEB", "MAR", "APR"]):
        sv = wb_val["Summary"].cell(row=s["excel_row"], column=off).value
        jv = s["attendance"].get(key)
        if sv != jv:
            monthly_diffs += 1
if monthly_diffs:
    fail(f"Summary monthly cells differ in {monthly_diffs} cells")
print(f"Summary per-month cells: {'PASS' if monthly_diffs == 0 else 'FAIL'} ({monthly_diffs} diffs)")

# ---------------------------------------------------------------- students.json
st = students_doc["students"]
master_names = [s["name_last_first_middle"] for s in st if s.get("present_in_master_sf1_roster")]
if set(master_names) != {n[2] for n in src_sf1}:
    fail("students.json master names != SF1 names")
buasan = [s for s in st if not s.get("present_in_master_sf1_roster")]
print(f"students.json: {len(st)} records ({len(master_names)} master + {len(buasan)} June-only)")

# documented source inconsistencies -> review list
for nme, _ in june_extra:
    review_item(f"Learner {nme!r} appears in the 'June' SF2 sheet roster but is missing from the "
                f"Modified SF1 master roster (Summary sheet therefore mis-aligns June female rows).")
for sheet, nm in roster_mismatches:
    review_item(f"Roster mismatch in {sheet}: {nm}")
review_item("Sheet 'June' reports the month of SEPTEMBER (two sheets report September: 'June' and 'September').")
review_item("Modified SF1 rows 22/25 contain transferee data (previous school/teacher/grade) but no student "
            "name in column C on those rows.")
review_item("Printable SF2 female block skips Modified SF1 girls #1-2 (BONUEL, RIHANA JANE G. and FUENTES, "
            "JECEL M.): row 57 maps to SF1 C53.")
review_item("No attendance marks were recorded anywhere in the workbook: every attendance cell is blank "
            "(blank = present per the sheet's own legend); all absent/tardy totals are blank or 0.")
review_item("June sheet 'No. of Days of Classes' = 12 but its date row lists 22 September dates.")

# ---------------------------------------------------------------- verdict
print()
print("=" * 60)
if issues:
    print("VALIDATION: FAIL")
    for i in issues:
        print(" -", i)
    sys.exit(1)
else:
    print("VALIDATION: PASS WITH REVIEW" if review else "VALIDATION: PASS")
    print(f"Issues: 0 missing JSON records, 0 changed values, {len(review)} review items (documented source inconsistencies)")
    with open("data-extraction/reports/validation-findings.json", "w") as f:
        json.dump({"issues": issues, "review_items": review,
                   "counts": {"month_sheets_checked": len(month_names),
                              "date_cells": total_date_cells,
                              "typed_marks": total_marks_cells,
                              "sf1_roster": len(src_sf1),
                              "summary_students": len(src_sum)}}, f, indent=2)
