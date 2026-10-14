#!/usr/bin/env python3
"""Dump relevant cell ranges to map SF1/SF2 internal structure."""
import openpyxl

SRC = "School Form_ Personal Info of Students Needed.xlsx"
wb = openpyxl.load_workbook(SRC, data_only=False)
wbd = openpyxl.load_workbook(SRC, data_only=True)

def dump(ws, rows, cols_desc, label):
    print(f"\n##### {ws.title} {label} (rows {rows[0]}-{rows[-1]})")
    wsd = wbd[ws.title]
    for r in rows:
        parts = []
        for col in cols_desc:
            if isinstance(col, tuple):
                cl, ch = col
            else:
                cl = ch = col
            cells = []
            for ci in range(cl, ch + 1):
                raw = ws.cell(row=r, column=ci).value
                val = wsd.cell(row=r, column=ci).value
                if raw is None and val is None:
                    continue
                raw_s = str(raw)
                if isinstance(raw, str) and raw.startswith("="):
                    cells.append(f"{openpyxl.utils.get_column_letter(ci)}[f:{val!r}]")
                else:
                    cells.append(f"{openpyxl.utils.get_column_letter(ci)}:{raw_s[:40]!r}")
            if cells:
                parts.append(" | ".join(cells))
        if parts:
            print(f" r{r}: " + " || ".join(parts))

# --- Modified SF1 ---
ws = wb["Modified SF1"]
dump(ws, list(range(3, 10)), [(1, 26)], "header/meta")
# rows 9..104: names zone (columns A..Y = 1..25)
max_r = 130
dump(ws, list(range(9, max_r + 1)), [(1, 25)], "roster area")
# row 91-99 area (Girls, totals?) full width
dump(ws, list(range(88, 105)), [(1, 39)], "footer area")

# --- June SF2 ---
ws = wb["June"]
dump(ws, [6, 8, 10, 11, 12], [(1, 60)], "header + dates")
dump(ws, list(range(13, 110)), [(1, 12), (29, 34), (35, 56), (57, 60)], "names+attendance+tiles")
# attendance marker legend rows 100-130 full width
dump(ws, list(range(108, 135)), [(1, 20)], "legend/notes area")

# --- Summary ---
ws = wb["Summary"]
dump(ws, [10, 11], [(1, 64)], "header row")
dump(ws, list(range(12, 108)), [(1, 12), (29, 40)], "rows with per-month columns")

# --- Conso ---
ws = wb["Conso"]
dump(ws, [10, 11, 12, 13], [(1, 60)], "header")
dump(ws, list(range(14, 110)), [(1, 12), (29, 34)], "rows")

# --- Printable SF2 ---
ws = wb["Printable SF2"]
dump(ws, list(range(10, 40)), [(1, 12), (29, 36)], "top")
dump(ws, list(range(100, 135)), [(1, 10)], "footer")
