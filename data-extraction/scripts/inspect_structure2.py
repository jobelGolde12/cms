#!/usr/bin/env python3
"""Second-pass inspection: instructions text, formulas for attendance, marks used,
Summary/Conso/Printable layouts, per-month meta, SF1 transferee columns."""
import openpyxl
from openpyxl.utils import get_column_letter

SRC = "School Form_ Personal Info of Students Needed.xlsx"
wb = openpyxl.load_workbook(SRC, data_only=False)
wbd = openpyxl.load_workbook(SRC, data_only=True)

MONTHS = ["June", "July", "August", "September", "October", "November", "December",
          "January", "February", "March", "April", "Conso"]

# 1. Instructions
ws = wb["Instructions"]; wsd = wbd["Instructions"]
print("== INSTRUCTIONS (rows 1-30) ==")
for r in range(1, 31):
    for c in range(1, 27):
        v = ws.cell(row=r, column=c).value
        if v is not None and str(v).strip():
            print(f"  {get_column_letter(c)}{r}: {str(v)[:120]!r}")

# 2. attendance formulas rows 13-16 June E..Z
ws = wb["June"]
print("\n== JUNE formulas r13/r14 E..T ==")
for r in (13, 14, 15):
    vals = [f"{get_column_letter(c)}: {str(ws.cell(row=r, column=c).value)[:30]}" for c in range(4, 21)]
    print(f" r{r} raw: {vals}")

# 3. marks used anywhere in monthly sheets (E..AB, rows 13..105), raw string cells
print("\n== distinct raw attendance-cell values per sheet ==")
for name in MONTHS:
    ws = wb[name]
    found = {}
    for row in ws.iter_rows(min_row=13, max_row=105, min_col=5, max_col=29):
        for c in row:
            v = c.value
            if v is None or v == "":
                continue
            if isinstance(v, str) and v.startswith("="):
                continue
            key = str(v)[:20]
            found.setdefault(key, []).append(f"{get_column_letter(c.column)}{c.row}")
    print(f" {name}: {[(k, len(vs), vs[:3]) for k, vs in list(found.items())[:8]]}")

# 4. per-month meta: month label X6, grade X8, section AD8, school year K6; totals r54 E / r98 E; summary row105 AI..AK
print("\n== month sheet meta ==")
for name in MONTHS:
    ws = wb[name]; wsd = wbd[name]
    def val(coord):
        return wsd[coord].value
    dates = []
    for c in range(5, 31):
        d = wsd.cell(row=11, column=c).value
        dy = wsd.cell(row=12, column=c).value
        if d is not None:
            dates.append(f"{d}{'' if dy is None else '('+str(dy)+')'}")
    tot_m = wsd.cell(row=54, column=5).value
    tot_f = wsd.cell(row=98, column=5).value
    summ = [wsd.cell(row=105, column=i).value for i in (35, 36, 37)]
    ndays = wsd.cell(row=103, column=34).value  # AH103
    print(f" {name}: month={val('X6')!r} SY={val('K6')!r} grade={val('X8')!r} section={val('AD8')!r} "
          f"noOfDays={ndays!r} totPerDay_M={tot_m!r} totPerDay_F={tot_f!r} summary_MFT={summ} dates={dates}")

# 5. Summary layout
ws = wb["Summary"]
print("\n== SUMMARY r10-13 cols A..T ==")
for r in range(10, 14):
    out = []
    for c in range(1, 21):
        v = ws.cell(row=r, column=c).value
        if v is not None and str(v).strip():
            out.append(f"{get_column_letter(c)}{r}={str(v)[:30]!r}")
    print("  ", out)
print("== SUMMARY r14-r25 raw cols A..V ==")
for r in range(14, 26):
    out = []
    for c in range(1, 23):
        v = ws.cell(row=r, column=c).value
        if v is not None and str(v).strip():
            out.append(f"{get_column_letter(c)}:{str(v)[:24]!r}")
    if out:
        print(f"  r{r}: " + " | ".join(out))
print("== SUMMARY rows 26-110 (names/totals) raw cols A..N ==")
for r in range(26, 111):
    out = []
    for c in range(1, 15):
        v = ws.cell(row=r, column=c).value
        if v is not None and str(v).strip():
            out.append(f"{get_column_letter(c)}:{str(v)[:26]!r}")
    if out:
        print(f"  r{r}: " + " | ".join(out))

# 6. Conso layout
ws = wb["Conso"]
print("\n== CONSO r10-r14 cols A..BB ==")
for r in range(10, 15):
    out = []
    for c in range(1, 55):
        v = ws.cell(row=r, column=c).value
        if v is not None and str(v).strip():
            out.append(f"{get_column_letter(c)}:{str(v)[:26]!r}")
    if out:
        print(f"  r{r}: " + " | ".join(out))
print("== CONSO r14-r25 ==")
for r in range(14, 26):
    out = []
    for c in range(1, 55):
        v = ws.cell(row=r, column=c).value
        if v is not None and str(v).strip():
            out.append(f"{get_column_letter(c)}:{str(v)[:26]!r}")
    if out:
        print(f"  r{r}: " + " | ".join(out))

# 7. Printable SF2 layout
ws = wb["Printable SF2"]
print("\n== PRINTABLE SF2 r14-r26 cols A..V ==")
for r in range(14, 27):
    out = []
    for c in range(1, 23):
        v = ws.cell(row=r, column=c).value
        if v is not None and str(v).strip():
            out.append(f"{get_column_letter(c)}:{str(v)[:30]!r}")
    if out:
        print(f"  r{r}: " + " | ".join(out))
print("== PRINTABLE SF2 marks scan rows 12-110 cols 5-30 ==")
found = {}
for row in ws.iter_rows(min_row=12, max_row=110, min_col=5, max_col=30):
    for c in row:
        v = c.value
        if v is None or v == "" or (isinstance(v, str) and v.startswith("=")):
            continue
        found.setdefault(str(v)[:12], []).append(f"{get_column_letter(c.column)}{c.row}")
print(" ", [(k, len(vs), vs[:4]) for k, vs in list(found.items())[:10]])

# 8. Modified SF1 transferee Z-area + hidden cols B,D,E,Z..AC rows 9-92
ws = wb["Modified SF1"]
print("\n== SF1 Z..AC rows 9-92 ==")
for r in range(9, 93):
    out = []
    for c in range(26, 30):  # Z..AC
        v = ws.cell(row=r, column=c).value
        if v is not None and str(v).strip():
            out.append(f"{get_column_letter(c)}:{str(v)[:40]!r}")
    if out:
        print(f"  r{r}: " + " | ".join(out))
