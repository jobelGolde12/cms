#!/usr/bin/env python3
"""
Full extraction of 'School Form_ Personal Info of Students Needed.xlsx'
(DepEd Auto-SF2 workbook) into JSON, preserving every entered value.

Read-only: the source workbook is never modified.
"""

import json
import os
import datetime

import openpyxl
from openpyxl.utils import get_column_letter

SRC = "School Form_ Personal Info of Students Needed.xlsx"
OUT_DIR = "data-extraction"
JSON_DIR = os.path.join(OUT_DIR, "json")
os.makedirs(JSON_DIR, exist_ok=True)

wb_raw = openpyxl.load_workbook(SRC, data_only=False)
wb_val = openpyxl.load_workbook(SRC, data_only=True)

MONTH_SHEETS = ["June", "July", "August", "September", "October", "November",
                "December", "January", "February", "March", "April"]


def raw(ws, r, c):
    return wb_raw[ws].cell(row=r, column=c).value


def val(ws, r, c):
    return wb_val[ws].cell(row=r, column=c).value


def txt(v):
    """Normalise a cell to its JSON value (str as-is, numbers as-is, None)."""
    if v is None:
        return None
    if isinstance(v, str):
        return v if v != "" else None
    return v


def clean(s):
    if isinstance(s, str):
        return s.rstrip() or None
    return s


# ============================================================
# 0. Workbook metadata
# ============================================================
file_size = os.path.getsize(SRC)
metadata = {
    "source_file": SRC,
    "source_file_size_bytes": file_size,
    "workbook_type": "DepEd Auto-SF2 (School Form 2, Daily Attendance) generated workbook, includes Modified SF1 (School Form 1 roster)",
    "worksheet_count": len(wb_raw.sheetnames),
    "worksheet_names": wb_raw.sheetnames,
    "source_last_modified": datetime.datetime.fromtimestamp(
        os.path.getmtime(SRC)).isoformat(timespec="seconds"),
    "extraction_timestamp": datetime.datetime.now().isoformat(timespec="seconds"),
    "extraction_status": "completed",
}

# ============================================================
# 1. Instructions sheet
# ============================================================
instructions_sheet = {
    "sheet": "Instructions",
    "title": clean(txt(raw("Instructions", 1, 1))),
    "program_name": clean(txt(raw("Instructions", 1, 5))),
    "text_lines": [],
}
for r in range(4, 31):
    for c in range(1, 30):
        v = txt(raw("Instructions", r, c))
        if v is not None and str(v).strip():
            instructions_sheet["text_lines"].append(
                {"excel_cell": f"{get_column_letter(c)}{r}", "text": str(v).strip()})
instructions_sheet["programmer"] = clean(txt(raw("Instructions", 23, 2)))
instructions_sheet["email_label"] = clean(txt(raw("Instructions", 24, 2)))
instructions_sheet["email"] = clean(txt(raw("Instructions", 25, 4)))

# ============================================================
# 2. Modified SF1 (master roster)
# ============================================================
SF1_META = {
    "sheet_title": clean(txt(raw("Modified SF1", 1, 1))),
    "sheet_subtitle": clean(txt(raw("Modified SF1", 2, 1))),
    "school_id": str(txt(raw("Modified SF1", 4, 6))),      # F4
    "region": clean(txt(raw("Modified SF1", 4, 10))),      # J4
    "division": clean(txt(raw("Modified SF1", 4, 13))),    # M4
    "district": clean(txt(raw("Modified SF1", 4, 19))),    # S4
    "school_name": clean(txt(raw("Modified SF1", 6, 6))),  # F6
    "school_year": clean(txt(raw("Modified SF1", 6, 15))), # O6
    "grade_level": txt(raw("Modified SF1", 6, 19)),        # S6
    "section": clean(txt(raw("Modified SF1", 6, 22))),     # V6
}

def sf1_roster(row_start, row_end, sex_group):
    out = []
    for r in range(row_start, row_end + 1):
        name = clean(txt(raw("Modified SF1", r, 3)))  # col C
        if name is None:
            continue
        rec = {
            "excel_row": r,
            "sex_group": sex_group,
            "seq_no": clean(txt(val("Modified SF1", r, 1))),  # col A (formula result)
            "name_last_first_middle": name,
        }
        # hidden transferee columns Z..AC (26..29)
        transf = {}
        for col, key in ((26, "previous_school"), (27, "address"),
                         (28, "teacher"), (29, "grade_and_section")):
            v = clean(txt(raw("Modified SF1", r, col)))
            if v is not None:
                transf[key] = v
        if transf:
            rec["transferee_information"] = transf
        out.append(rec)
    return out

sf1_boys = sf1_roster(10, 49, "BOYS")
sf1_girls = sf1_roster(51, 90, "GIRLS")

# transferee entries on rows that have NO student name (preserved as-is)
sf1_dangling_transferee = []
for r in range(10, 91):
    if clean(txt(raw("Modified SF1", r, 3))) is None:
        transf = {}
        for col, key in ((26, "previous_school"), (27, "address"),
                         (28, "teacher"), (29, "grade_and_section")):
            v = clean(txt(raw("Modified SF1", r, col)))
            if v is not None:
                transf[key] = v
        if transf:
            sf1_dangling_transferee.append({"excel_row": r, "student_name": None,
                                            "transferee_information": transf})

# legend table rows 92-96 (two indicator tables side by side)
sf1_legends = []
for r in range(92, 97):
    left = {"indicator": clean(txt(raw("Modified SF1", r, 1))),
            "code": clean(txt(raw("Modified SF1", r, 3))),
            "required_information": clean(txt(raw("Modified SF1", r, 5)))}
    right = {"indicator": clean(txt(raw("Modified SF1", r, 10))),
             "code": clean(txt(raw("Modified SF1", r, 12))),
             "required_information": clean(txt(raw("Modified SF1", r, 13)))}
    sf1_legends.append({"excel_row": r, "table_left": left, "table_right": right})

sf1_certification = {
    "prepared_by": clean(txt(raw("Modified SF1", 93, 21))),   # U93
    "prepared_by_caption": clean(txt(raw("Modified SF1", 94, 21))),
    "certified_correct_by": clean(txt(raw("Modified SF1", 93, 24))),  # X93
    "certified_correct_by_caption": clean(txt(raw("Modified SF1", 94, 24))),
    "comment": clean(txt(raw("Modified SF1", 98, 1))),
}

modified_sf1_sheet = {
    "sheet": "Modified SF1",
    "type": "School Form 1 (SF1) - master learner roster",
    "meta": SF1_META,
    "boys": sf1_boys,
    "girls": sf1_girls,
    "dangling_transferee_records": sf1_dangling_transferee,
    "indicator_legends": sf1_legends,
    "certification": sf1_certification,
}

# ============================================================
# 3. SF2 page-2 boilerplate text (identical across 11+Conso sheets;
#    extracted once and equality-verified — documented, not silent)
# ============================================================
def page2_template(sheet, label_row_offset):
    """Extract the full boilerplate text of the page-2 area (rows ~102-133)."""
    start = 102 + label_row_offset
    texts = {}
    for r in range(start, start + 32):
        for c in range(1, 38):
            v = txt(raw(sheet, r, c))
            if v is None:
                continue
            s = str(v)
            if s.strip():
                texts[f"{get_column_letter(c)}{r}"] = s
    return texts

def texts_equal(a, b, skip_value_cells=True):
    a, b = dict(a), dict(b)
    return a == b

def norm_template_text(sheet, base_row):
    """Normalise page-2 boilerplate text: June labels sit one row lower than other
    sheets, so rows are keyed relative to base_row. Numeric value columns
    (AH 'No. of Days', AI/AJ/AK summary values) and the varying month label cell
    (AB base_row) are excluded — those are extracted per-sheet anyway."""
    out = {}
    for dr in range(0, 31):
        r = base_row + dr
        if r > 136:
            break
        for c in range(1, 38):
            if c in (34, 35, 36, 37):   # AH: days count, AI/AJ/AK: per-month values
                continue
            if dr == 0 and c == 28:     # AB<base> 'Month: ...' label
                continue
            v = txt(val(sheet, r, c))          # compare cached values
            if v is None:
                v = txt(raw(sheet, r, c))
            if v is None:
                continue
            s = str(v)
            if s.strip():
                out[f"{dr}:{get_column_letter(c)}"] = s
    return out

june_template_text = page2_template("June", 1)  # June has labels one row lower
base = {"June": 103}
for other in [n for n in MONTH_SHEETS if n != "June"] + ["Conso"]:
    base[other] = 102

def boilerplate_matches(sheet_name):
    return norm_template_text(sheet_name, base[sheet_name]) == norm_template_text("June", 103)

# ============================================================
# 4. Monthly SF2 sheets + Conso
# ============================================================
def extract_month_sheet(name):
    wsv = lambda r, c: txt(val(name, r, c))
    wsr = lambda r, c: txt(raw(name, r, c))

    # detect date columns: contiguous cells in row 11 with a day number
    date_cols = []
    for c in range(4, 31):
        if raw(name, 11, c) is not None:
            date_cols.append(c)
    # drop trailing columns that only hold helper values (day-number row is source of truth)
    rec = {
        "sheet": name,
        "meta": {
            "school_id": str(clean(wsv(6, 3))),
            "school_name": clean(wsv(8, 3)),
            "school_year": clean(wsv(6, 11)),
            "grade_level": wsv(8, 24),
            "section": clean(wsv(8, 30)),
            "reported_month": clean(wsr(6, 24)) or clean(wsv(6, 24)),
            "learners_name_header": clean(wsr(10, 1)),
            "date_row_note": clean(wsr(10, 4)),
            "total_for_month_header": clean(wsr(10, 30)),
            "remarks_header": clean(wsr(10, 32)),
        },
        "dates": [],
    }
    for c in date_cols:
        rec["dates"].append({
            "excelColumn": get_column_letter(c),
            "day_of_month": wsv(11, c),
            "day_code": wsv(12, c),
        })

    # students
    males, females = [], []
    for band, rows, store in (( "MALES", range(14, 54), males), ("FEMALES", range(57, 97), females)):
        for r in rows:
            nm = clean(wsv(r, 2))
            if nm is None:
                continue
            stu = {
                "excel_row": r,
                "sex_group": band[:-1] if band == "MALES" else "FEMALE",
                "seq_no": clean(wsv(r, 1)),
                "name_last_first_middle": nm,
                "attendance_marks_recorded": {},  # only non-empty raw cells
                "absent_total": wsv(r, 30),
                "tardy_total": wsv(r, 31),
            }
            remark = clean(wsv(r, 32))
            if remark is not None:
                stu["remarks"] = remark
            for c in date_cols:
                m = txt(raw(name, r, c))
                if m is not None and str(m).strip() != "":
                    stu["attendance_marks_recorded"][get_column_letter(c)] = str(m)
            store.append(stu)
    rec["students_males"] = males
    rec["students_females"] = females

    # totals rows (MALE TOTAL PER DAY / FEMALE TOTAL PER DAY / Combined, helper rows kept)
    totals = {}
    label_rows = {}
    for r in range(50, 103):
        a = txt(raw(name, r, 1))
        if isinstance(a, str) and a.strip():
            cleanlabel = a.strip()
            if "FEMALE" in cleanlabel:
                label_rows[r] = "female_total_per_day"
            elif "MALE" in cleanlabel:
                label_rows[r] = "male_total_per_day"
            elif "Combined" in cleanlabel:
                label_rows[r] = "combined_total_per_day"
    for r, lbl in sorted(label_rows.items()):
        row_vals = {}
        for c in date_cols + [30, 31]:
            v = wsv(r, c)
            if v is not None:
                row_vals[get_column_letter(c)] = v
        totals.setdefault(lbl, []).append({"excel_row": r, "per_date": row_vals})
    rec["totals_per_day"] = totals

    # page-2 summary values (rows 102-133)
    start = 103 if name == "June" else 102
    p2 = {
        "month_cell": clean(txt(raw(name, start, 28))),
        "no_of_days_of_classes": wsv(start, 34),  # AH
        "values": {},
    }
    val_rows = [105, 107, 109, 111, 113, 114, 116, 118, 120, 122]
    label_rows_p2 = {
        105: "enrolment_as_of_1st_friday_of_june",
        107: "late_enrollment_during_the_month",
        109: "registered_learner_as_of_end_of_the_month",
        111: "percentage_of_enrolment_as_of_end_of_the_month",
        113: "average_daily_attendance",
        114: "percentage_of_attendance_for_the_month",
        116: "students_with_5_consecutive_days_of_absences",
        118: "dropout",
        120: "transferred_out",
        122: "transferred_in",
    }
    for r in val_rows:
        entry = {"label_cell": f"AB{r}"}
        lab = clean(txt(raw(name, r, 28)))
        if lab:
            entry["label"] = lab
        for col, key in ((35, "M"), (36, "F"), (37, "TOTAL")):
            v = wsv(r, col)
            if v is not None:
                entry[key] = v
        p2["values"][label_rows_p2[r]] = entry
    # start-row percentages block (D/N labels on the left of guidelines)
    p2["summary_for_month_header_row"] = clean(wsv(start, 35))
    p2["certification"] = {
        "certify_text": clean(txt(raw(name, 125, 28))),
        "teacher_name": clean(wsv(126, 31)),
        "teacher_caption": clean(txt(raw(name, 128, 30))),
        "attested_by_label": clean(txt(raw(name, 130, 28))),
        "attested_by": clean(wsv(130, 31)),
        "attested_by_caption": clean(txt(raw(name, 132, 33))),
    }
    p2["attendance_codes_legend_row"] = {
        "title": clean(txt(raw(name, start - 1 if name == "June" else (start - 1), 17))),
        "codes_text": clean(txt(raw(name, 103 if name == "June" else 102, 17) or
                                raw(name, 104 if name =="June" else 103, 17))),
    }
    if name == "June":
        p2["attendance_codes_legend_row"] = {
            "title_cell": "Q103",
            "title": clean(txt(raw("June", 103, 17))),
            "codes_cell": "Q104",
            "codes_text": clean(txt(raw("June", 104, 17))),
        }
    else:
        p2["attendance_codes_legend_row"] = {
            "title_cell": "Q102",
            "title": clean(txt(raw(name, 102, 17))),
            "codes_cell": "Q103",
            "codes_text": clean(txt(raw(name, 103, 17))),
        }
    rec["page2_summary"] = p2

    # verify boilerplate text equality with june template (document the check result)
    rec["page2_boilerplate_equals_june_template"] = boilerplate_matches(name)
    if name != "June":
        pass
    else:
        rec["page2_boilerplate_reference"] = june_template_text
    return rec

months = ["June", "July", "August", "September", "October", "November",
          "December", "January", "February", "March", "April"]
monthly_sheets = [extract_month_sheet(n) for n in months]

for m in monthly_sheets:
    m["page2_boilerplate_equals_june_template"] = boilerplate_matches(m["sheet"])

# Conso sheet (year-round consolidation): same grid, but totals rows differ
conso = extract_month_sheet("Conso")
conso["page2_boilerplate_equals_june_template"] = boilerplate_matches("Conso")
# Conso has extra totals rows 97-100 (female/tardy-half/cutting-half/combined)
def capture_conso_rows():
    out = {}
    for r, lbl in ((54, "male_total_per_day"), (97, "female_total_per_day"),
                   (98, "female_tardy_counts_x0.5"), (99, "female_cutting_counts_x0.5"),
                   (100, "combined_total_per_day")):
        vals = {}
        for c in range(4, 32):
            v = txt(val("Conso", r, c))
            if v is not None:
                vals[get_column_letter(c)] = v
        if vals:
            out[lbl] = {"excel_row": r, "values": vals}
    return out
conso["totals_per_day"] = capture_conso_rows()
# Conso page-2 values pull from BR/BS/BT (README says same labels); keep extracted values
conso["page2_summary"]["attendance_codes_legend_row"] = {
    "title_cell": "Q102", "title": clean(txt(raw("Conso", 102, 17))),
    "codes_cell": "Q103", "codes_text": clean(txt(raw("Conso", 103, 17))),
}

# ============================================================
# 5. Summary sheet (year-round per-learner totals)
# ============================================================
summary_students = []
for r in list(range(14, 54)) + list(range(57, 97)):
    nm = clean(txt(val("Summary", r, 2)))
    if nm is None:
        continue
    rec = {"excel_row": r, "seq_no": clean(txt(val("Summary", r, 1))),
           "name_last_first_middle": nm, "attendance": {}, "tardiness": {}}
    for col, key in zip(range(4, 15), ["JUN", "JUL", "AUG", "SEP", "OCT", "NOV",
                                       "DEC", "JAN", "FEB", "MAR", "APR"]):
        v = txt(val("Summary", r, col))
        if v is not None:
            rec["attendance"][key] = v
    v = txt(val("Summary", r, 15))
    if v is not None:
        rec["attendance"]["TOTAL"] = v
    for col, key in zip(range(16, 27), ["JUN", "JUL", "AUG", "SEP", "OCT", "NOV",
                                        "DEC", "JAN", "FEB", "MAR", "APR"]):
        v = txt(val("Summary", r, col))
        if v is not None:
            rec["tardiness"][key] = v
    v = txt(val("Summary", r, 27))
    if v is not None:
        rec["tardiness"]["TOTAL"] = v
    for col, key in ((32, "total_for_the_month_absent"), (33, "total_for_the_month_tardy"),
                     (34, "remarks")):
        v = txt(val("Summary", r, col))
        if v is not None and str(v).strip():
            rec[key] = v
    summary_students.append(rec)

summary_totals = {}
for r, lbl in ((54, "male_total_per_day"), (97, "female_total_per_day"),
               (100, "combined_total_per_day")):
    vals = {}
    for c in range(4, 35):
        v = txt(val("Summary", r, c))
        if v is not None:
            vals[get_column_letter(c)] = v
    if vals:
        summary_totals[lbl] = {"excel_row": r, "values": vals}

summary_sheet = {
    "sheet": "Summary",
    "type": "year-round attendance/tardiness summary per learner",
    "headers": {
        "attendance_months": ["JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
                              "JAN", "FEB", "MAR", "APR", "TOTAL"],
        "tardiness_months": ["JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
                             "JAN", "FEB", "MAR", "APR", "TOTAL"],
        "notes": ["A: seq no (formula from Modified SF1 col A)", "B: learner name"
                  " (formula from Modified SF1 col C)",
                  "D-O: attendance totals pulled from each month sheet AL column",
                  "P-AA: tardiness totals pulled from each month sheet AE column"],
    },
    "students": summary_students,
    "totals_per_day": summary_totals,
}

# ============================================================
# 6. Printable SF2
# ============================================================
printable = {
    "sheet": "Printable SF2",
    "type": "print layout (empty grid, mirrors formulas)",
    "meta": {
        "school_id": str(clean(txt(val("Printable SF2", 6, 3)))),
        "school_year": clean(txt(val("Printable SF2", 6, 11))),
        "school_name": clean(txt(val("Printable SF2", 8, 3))),
        "month_label": clean(txt(raw("Printable SF2", 98, 28))),
    },
    "learners": [],
    "attendance_grid_visible_value_cells": [],
    "certification": {
        "teacher_name_source": str(raw("Printable SF2", 121, 30)),
        "teacher_name": clean(txt(val("Printable SF2", 121, 30))),
        "attested_by_source": str(raw("Printable SF2", 125, 30)),
        "attested_by": clean(txt(val("Printable SF2", 125, 30))),
    },
    "grid_note": "Attendance grid cells in 'Printable SF2' contain no values/formulas "
                 "beyond the header row (blank template).",
    "roster_note": "The Printable SF2 female block (rows 57-96) maps to Modified SF1 "
                   "C53..C90, i.e. it SKIPS SF1 girls #1-2 (BONUEL, RIHANA JANE G. and "
                   "FUENTES, JECEL M.). The male block maps correctly (C10..). Only those "
                   "days' students that have cached names are listed below.",
}
for band, rows in (("MALE", range(14, 54)), ("FEMALE", range(57, 97))):
    for r in rows:
        nm = clean(txt(val("Printable SF2", r, 2)))
        if nm is None:
            continue
        printable["learners"].append({"excel_row": r, "sex_group": band,
                                      "seq_no": clean(txt(val("Printable SF2", r, 1))),
                                      "name_last_first_middle": nm})

# ============================================================
# 7. Assemble extracted-data.json
# ============================================================
def month_sheet_public(m):
    pub = {k: v for k, v in m.items() if k != "page2_boilerplate_reference"}
    return pub

verified_equal = ["June"] + [m["sheet"] for m in monthly_sheets
                             if m.get("page2_boilerplate_equals_june_template") and m["sheet"] != "June"]

extracted = {
    "metadata": metadata,
    "instructions": instructions_sheet,
    "school_master_roster": modified_sf1_sheet,
    "monthly_sf2_sheets": [month_sheet_public(m) for m in monthly_sheets],
    "conso": month_sheet_public(conso),
    "summary": summary_sheet,
    "printable_sf2": printable,
    "sf2_page2_boilerplate_reference": {
        "verified_equal_in_sheets": verified_equal,
        "conso_boilerplate_equals_june_template": conso["page2_boilerplate_equals_june_template"],
        "full_text_cells": june_template_text,
    },
}

with open(os.path.join(JSON_DIR, "extracted-data.json"), "w", encoding="utf-8") as f:
    json.dump(extracted, f, ensure_ascii=False, indent=2)

# ============================================================
# 8. students.json (complete student dataset)
# ============================================================
students = []
for rec in sf1_boys + sf1_girls:
    st = {
        "excel_row_sf1": rec["excel_row"],
        "sex_group": rec["sex_group"].replace("BOYS", "MALE").replace("GIRLS", "FEMALE"),
        "seq_no": rec["seq_no"],
        "name_last_first_middle": rec["name_last_first_middle"],
        "grade_level": SF1_META["grade_level"],
        "section": SF1_META["section"],
        "school_year": SF1_META["school_year"],
        "school_id": SF1_META["school_id"],
        "school_name": SF1_META["school_name"],
        "transferee_information": rec.get("transferee_information"),
        "present_in_master_sf1_roster": True,
    }
    if st["transferee_information"] is None:
        del st["transferee_information"]
    # remarks found in month sheets for this student's SF1 row position
    marks_by_month = {}
    for m in monthly_sheets:
        # Sheet female rows shift by +1 relative to SF1 girls when extra student present
        target_row = None
        if rec["sex_group"] == "BOYS":
            target_row = 14 + (rec["excel_row"] - 10)
        else:
            fem_names = [s["name_last_first_middle"] for s in m["students_females"]]
            if rec["name_last_first_middle"] in fem_names:
                row = 57 + fem_names.index(rec["name_last_first_middle"])
                target_row = row
        if target_row is not None:
            band = m["students_males"] if rec["sex_group"] == "BOYS" else None
            if rec["sex_group"] == "BOYS":
                match = [s for s in m["students_males"] if s["excel_row"] == target_row]
            else:
                match = [s for s in m["students_females"] if s["excel_row"] == target_row]
            if match:
                stu = match[0]
                if stu.get("remarks"):
                    marks_by_month[m["sheet"]] = stu["remarks"]
                if stu["attendance_marks_recorded"]:
                    marks_by_month.setdefault("attendance_marks", {}).update(
                        {f'{m["sheet"]}.{k}': v for k, v in stu["attendance_marks_recorded"].items()})
    if marks_by_month:
        remarks_only = {k: v for k, v in marks_by_month.items() if k != "attendance_marks"}
        if remarks_only:
            st["monthly_remarks_from_sf2_sheets"] = remarks_only
        if "attendance_marks" in marks_by_month:
            st["attendance_marks_recorded"] = marks_by_month["attendance_marks"]
    # summary totals by name (Summary sheet is named from SF1)
    match = [s for s in summary_students
             if s["name_last_first_middle"] == rec["name_last_first_middle"]]
    if match:
        s = match[0]
        st["year_round_summary_from_summary_sheet"] = {
            "excel_row_summary": s["excel_row"],
            "attendance_monthly_and_total": s["attendance"],
            "tardiness_monthly_and_total": s["tardiness"],
        }
    students.append(st)

# June-only student (BUASAN) is a real student record in the June sheet roster;
# included here, flagged, so the JSON student set is complete.
buasan = None
june_sheet = next(m for m in monthly_sheets if m["sheet"] == "June")
for s in june_sheet["students_females"]:
    if s["name_last_first_middle"].startswith("BUASAN"):
        buasan = {
            "excel_row_sf1": None,
            "excel_row_june_sheet": s["excel_row"],
            "sex_group": "FEMALE",
            "seq_no": s["seq_no"],
            "name_last_first_middle": s["name_last_first_middle"],
            "grade_level": SF1_META["grade_level"],
            "section": SF1_META["section"],
            "school_year": SF1_META["school_year"],
            "school_id": SF1_META["school_id"],
            "school_name": SF1_META["school_name"],
            "present_in_master_sf1_roster": False,
            "presence_note": "Listed only in the 'June' SF2 sheet female roster "
                             "(reported month: SEPTEMBER); missing from the Modified "
                             "SF1 master roster and from all other month sheets.",
            "absent_total": s["absent_total"],
            "tardy_total": s["tardy_total"],
        }
        if s.get("remarks"):
            buasan["remarks"] = s["remarks"]
        break
if buasan:
    students.append(buasan)

students_doc = {
    "metadata": {k: metadata[k] for k in ("source_file", "extraction_timestamp",
                                          "extraction_status")},
    "school": SF1_META,
    "roster_source": "Modified SF1 (boys rows 10-49, girls rows 51-90)",
    "student_count_master_roster_sf1": len(sf1_boys) + len(sf1_girls),
    "student_count_including_june_only_record": len(students),
    "note": "Names are preserved exactly as typed in the workbook, format "
            "'Last Name, First Name Middle' (no separate name columns exist in source).",
    "students": students,
    "students_listed_only_in_sf2_sheets_not_in_sf1": [
        {"sheet": "June", "excel_row": 58, "seq_no": 2,
         "name_last_first_middle": "BUASAN, ANGELA MHEYO FORMANES",
         "issue": "present in June sheet female roster; absent from Modified SF1 girls list"}
    ],
    "dangling_transferee_records_in_sf1": sf1_dangling_transferee,
}
with open(os.path.join(JSON_DIR, "students.json"), "w", encoding="utf-8") as f:
    json.dump(students_doc, f, ensure_ascii=False, indent=2)

# ============================================================
# 9. field-mapping.json
# ============================================================
field_mapping = {
    "_comment": "Excel column/row locations -> JSON fields; seq numbers are formula "
                "results (data_only values), 'raw' means literal typed value.",
    "field_mapping": [
        {"worksheet": "Modified SF1", "excel_location": "F4", "json_field": "school_meta.school_id",
         "data_type": "string", "value_kind": "raw"},
        {"worksheet": "Modified SF1", "excel_location": "J4/M4/S4/F6/O6/S6/V6",
         "json_field": "school_master_roster.meta.{region,division,district,school_name,school_year,grade_level,section}",
         "data_type": "string/number", "value_kind": "raw/formula_cache"},
        {"worksheet": "Modified SF1", "excel_location": "A10:A49 / C10:C49",
         "json_field": "boys[].seq_no / boys[].name_last_first_middle",
         "data_type": "number/string", "value_kind": "formula_cache/raw"},
        {"worksheet": "Modified SF1", "excel_location": "A51:A90 / C51:C90",
         "json_field": "girls[].seq_no / girls[].name_last_first_middle",
         "data_type": "number/string", "value_kind": "formula_cache/raw"},
        {"worksheet": "Modified SF1", "excel_location": "Z/AA/AB/AC (hidden)",
         "json_field": "students[].transferee_information.{previous_school,address,teacher,grade_and_section}",
         "data_type": "string", "value_kind": "raw"},
        {"worksheet": "Modified SF1", "excel_location": "A92:M96",
         "json_field": "indicator_legends[].table_left/table_right", "data_type": "string",
         "value_kind": "raw"},
        {"worksheet": "Modified SF1", "excel_location": "U93/X93", "json_field": "certification.prepared_by/certified_correct_by",
         "data_type": "string", "value_kind": "raw"},
        {"worksheet": "Each month sheet", "excel_location": "X6/K6/X8/AD8",
         "json_field": "monthly_sf2_sheets[].meta.{reported_month,school_year,grade_level,section}",
         "data_type": "string", "value_kind": "raw"},
        {"worksheet": "Each month sheet", "excel_location": "row 11 E..(up to Z/AB)",
         "json_field": "dates[].day_of_month", "data_type": "number", "value_kind": "raw"},
        {"worksheet": "Each month sheet", "excel_location": "row 12 same columns",
         "json_field": "dates[].day_code", "data_type": "string", "value_kind": "raw"},
        {"worksheet": "Each month sheet", "excel_location": "A14:B53 (males) / A57:B96 (females)",
         "json_field": "students_males[]/students_females[].{seq_no,name}",
         "data_type": "number/string", "value_kind": "formula_cache/formula_result"},
        {"worksheet": "Each month sheet", "excel_location": "E..(date cols) student rows",
         "json_field": "students[].attendance_marks_recorded{excelColumn:mark}",
         "data_type": "string", "value_kind": "raw; empty for sheet-wide blank cells"},
        {"worksheet": "Each month sheet", "excel_location": "AD/AE student rows",
         "json_field": "students[].absent_total/tardy_total", "data_type": "number",
         "value_kind": "formula_cache"},
        {"worksheet": "Each month sheet", "excel_location": "AF..AK student rows",
         "json_field": "students[].remarks", "data_type": "string",
         "value_kind": "raw (merged cell top-left)"},
        {"worksheet": "Each month sheet", "excel_location": "rows 54-56 / 98-101",
         "json_field": "totals_per_day", "data_type": "number", "value_kind": "formula_cache"},
        {"worksheet": "Each month sheet", "excel_location": "rows 102-133, AB/AI/AJ/AK",
         "json_field": "page2_summary", "data_type": "string/number",
         "value_kind": "raw + formula_cache"},
        {"worksheet": "June", "excel_location": "Q103/Q104", "json_field": "page2_summary.attendance_codes_legend_row",
         "data_type": "string", "value_kind": "raw"},
        {"worksheet": "Conso", "excel_location": "same grid as month sheets",
         "json_field": "conso.*", "data_type": "mixed", "value_kind": "raw/formula_cache"},
        {"worksheet": "Summary", "excel_location": "A/B/D..O/P..AA/AF..AH rows 14-53,57-96",
         "json_field": "summary.students[].*", "data_type": "number/string",
         "value_kind": "formula_cache"},
        {"worksheet": "Summary", "excel_location": "D54:N54/D97:N97/D100.../AF100:AH100",
         "json_field": "summary.totals_per_day", "data_type": "number", "value_kind": "formula_cache"},
        {"worksheet": "Printable SF2", "excel_location": "A/B rows 14-96",
         "json_field": "printable_sf2.learners[]", "data_type": "number/string",
         "value_kind": "formula_cache"},
        {"worksheet": "Printable SF2", "excel_location": "AD121/AD125", "json_field": "printable_sf2.certification",
         "data_type": "string", "value_kind": "formula_cache"},
        {"worksheet": "Instructions", "excel_location": "A1..D25", "json_field": "instructions.*",
         "data_type": "string", "value_kind": "raw"},
    ],
}
with open(os.path.join(JSON_DIR, "field-mapping.json"), "w", encoding="utf-8") as f:
    json.dump(field_mapping, f, ensure_ascii=False, indent=2)

print("Wrote:")
for fn in ("extracted-data.json", "students.json", "field-mapping.json"):
    p = os.path.join(JSON_DIR, fn)
    print(f"  {p} ({os.path.getsize(p)} bytes)")
print(f"SF1 students: {len(sf1_boys)} boys + {len(sf1_girls)} girls = {len(sf1_boys)+len(sf1_girls)}")
for m in monthly_sheets + [conso]:
    print(f"  {m['sheet']}: {len(m['students_males'])} males, {len(m['students_females'])} females, "
          f"dates={len(m['dates'])}, month_cell={m['page2_summary'].get('month_cell')!r}")
print(f"Summary students: {len(summary_students)}")
print(f"Boilerplate==June for: {verified_equal}, conso={conso['page2_boilerplate_equals_june_template']}")
