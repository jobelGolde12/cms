#!/usr/bin/env python3
"""Third-pass: rosters per month sheet, SF1 hidden cols, legend texts, Summary header,
Printable SF2 grid formulas, Conso bottom section."""
import openpyxl
from openpyxl.utils import get_column_letter

SRC = "School Form_ Personal Info of Students Needed.xlsx"
wb = openpyxl.load_workbook(SRC, data_only=False)
wbd = openpyxl.load_workbook(SRC, data_only=True)
MONTHS = ["June", "July", "August", "September", "October", "November", "December",
          "January", "February", "March", "April", "Conso"]

# 1. SF1 hidden cols B,D,E + full name col C per row 9..92
ws = wb["Modified SF1"]; wsd = wb["Modified SF1"]
print("== SF1 rows 9..92 cols A,B,C,D,E (raw) ==")
for r in range(9, 93):
    vals = []
    for c in (1, 2, 3, 4, 5):
        v = ws.cell(row=r, column=c).value
        if v is not None and str(v).strip():
            vals.append(f"{get_column_letter(c)}:{str(v)[:40]!r}")
    if vals:
        print(f" r{r}: " + " | ".join(vals))

# 2. per-month rosters: male rows 13..53 col B, female rows 56..97 col B
print("\n== rosters per month sheet ==")
for name in MONTHS:
    ws2 = wb[name]; wsd2 = wbd[name]
    males = [(r, wsd2.cell(row=r, column=2).value) for r in range(13, 54)
             if wsd2.cell(row=r, column=2).value not in (None, "")]
    females = [(r, wsd2.cell(row=r, column=2).value) for r in range(56, 98)
               if wsd2.cell(row=r, column=2).value not in (None, "")]
    remarks = []
    for r in range(13, 98):
        for c in range(32, 38):  # AF..AK
            v = wsd2.cell(row=r, column=c).value
            if v not in (None, ""):
                remarks.append((f"{get_column_letter(c)}{r}", str(v)[:60]))
    print(f" {name}: males={[(r, n[:34] if n else n) for r, n in males]}")
    print(f"   females={[r for r in females]}")
    print(f"   remarks={remarks}")

# 3. month-sheet legend/guideline texts near rows 100-135
ws = wb["June"]
print("\n== JUNE rows 103..135, non-empty cells cols A..AK ==")
for r in range(103, 136):
    out = []
    for c in range(1, 38):
        v = ws.cell(row=r, column=c).value
        if v is not None and str(v).strip():
            out.append(f"{get_column_letter(c)}:{str(v)[:90]!r}")
    if out:
        print(f" r{r}: " + " || ".join(out))

# also check rows 110-135 for values on the Q/QATT summary (per June: AI107 etc.)
wsd = wbd["June"]
print("\n== JUNE data_only values rows 103..133 cols A..AK ==")
for r in range(103, 134):
    out = []
    for c in range(1, 38):
        v = wsd.cell(row=r, column=c).value
        if v is not None and str(v).strip() != "":
            out.append(f"{get_column_letter(c)}:{str(v)[:70]!r}")
    if out:
        print(f" r{r}: " + " || ".join(out))

# 4. Summary full header r10/r11 cols 1..64, and rows 101-130
ws = wb["Summary"]
print("\n== SUMMARY r10/r11 cols 1..64 ==")
for r in (10, 11):
    out = []
    for c in range(1, 65):
        v = ws.cell(row=r, column=c).value
        if v is not None and str(v).strip():
            out.append(f"{get_column_letter(c)}:{str(v)[:20]!r}")
    print(f" r{r}: " + " | ".join(out))
print("== SUMMARY rows 100..135 non-empty cols 1..64 ==")
for r in range(100, 136):
    out = []
    for c in range(1, 65):
        v = ws.cell(row=r, column=c).value
        if v is not None and str(v).strip():
            out.append(f"{get_column_letter(c)}:{str(v)[:60]!r}")
    if out:
        print(f" r{r}: " + " || ".join(out))
# Summary month tiles AH.. area rows 12-60?
print("== SUMMARY rows 12..62 (skim) report tiles cols U..BI (sample formulas r14)==")
for c in range(24, 65):
    v = ws.cell(row=14, column=c).value
    if v is not None and str(v).strip():
        print(f"   {get_column_letter(c)}14: {str(v)[:60]!r}")
out = []
for c in range(1, 65):
    v = ws.cell(row=16, column=c).value
    if v is not None and str(v).strip():
        out.append(f"{get_column_letter(c)}:{str(v)[:40]!r}")
print("   r16 sample:", out)

# 5. Printable SF2: attendance grid formulas rows 14-30, cols 3..30
ws = wb["Printable SF2"]
print("\n== PRINTABLE SF2 r14 raw cols C..AE ==")
for c in range(3, 32):
    v = ws.cell(row=14, column=c).value
    if v is not None:
        print(f"   {get_column_letter(c)}14: {str(v)[:70]!r}")
print("== PRINTABLE SF2 rows 95..135 non-empty ==")
for r in range(95, 136):
    out = []
    for c in range(1, 40):
        v = ws.cell(row=r, column=c).value
        if v is not None and str(v).strip():
            out.append(f"{get_column_letter(c)}:{str(v)[:60]!r}")
    if out:
        print(f" r{r}: " + " || ".join(out))

# 6. Conso rows 96..135
ws = wb["Conso"]; wsd = wbd["Conso"]
print("\n== CONSO rows 96..135 non-empty (raw) ==")
for r in range(96, 136):
    out = []
    for c in range(1, 40):
        v = ws.cell(row=r, column=c).value
        if v is not None and str(v).strip():
            out.append(f"{get_column_letter(c)}:{str(v)[:70]!r}")
    if out:
        print(f" r{r}: " + " || ".join(out))

# 7. other sheets r10 header labels (remarks col range)
ws = wb["July"]
print("\n== JULY r10/r12 cols AD..AR (headers) ==")
for r in (10, 12):
    out = []
    for c in range(30, 45):
        v = ws.cell(row=r, column=c).value
        if v is not None and str(v).strip():
            out.append(f"{get_column_letter(c)}:{str(v)[:60]!r}")
    print(f" r{r}: " + " | ".join(out))
