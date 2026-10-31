#!/usr/bin/env python3
"""Import Nurse dATA.xlsx into the CMS database.

DEPRECATED: this script targeted the local SQLite file (`local.db`) only.
The authoritative import lives in scripts/import-nurse-data.mts, which is
guarded to target the remote Turso database (libsql://) and validates the
expected totals. Keep this file for reference/history only.

Creates:
- Grade 12 grade level
- HESTIA section for 2026-2027
- 51 new students (verified unmatched — none exist in DB)
- 51 student enrollments
- 51 health/nutritional assessment records

Uses direct SQLite access because the dataset students do not exist
and must be created safely without corrupting existing records.
"""
import sqlite3
import openpyxl
from datetime import datetime

DB_PATH = "local.db"

def clean_status(s):
    if not s:
        return None
    s = str(s).strip()
    mapping = {
        "Normal": "normal",
        "Normal ": "normal",
        "Wasted": "wasted",
        "Severely Wasted": "severely_wasted",
        "Severely  Wasted": "severely_wasted",
        "Overweight": "overweight",
        "Obese": "obese",
    }
    return mapping.get(s) or s.lower().replace(" ", "_")

def clean_hfa(s):
    if not s:
        return None
    s = str(s).strip()
    mapping = {
        "Normal": "normal",
        "Normal ": "normal",
        "Stunted": "stunted",
        "Stunted ": "stunted",
        "Severely Stunted": "severely_stunted",
        "Severely Stunted ": "severely_stunted",
        "Tall": "tall",
    }
    return mapping.get(s, s.lower().replace(" ", "_").rstrip())

def split_name(name_raw):
    name_raw = str(name_raw).strip()
    # Handle names like "Cornelio ,Zoilo" (comma after last name sometimes)
    # Most format: "LastName, FirstName" or just "FirstName LastName"
    if "," in name_raw:
        parts = name_raw.split(",")
        last_name = parts[0].strip()
        first_name = parts[1].strip() if len(parts) > 1 else ""
        # Some have middle initial after comma, e.g., "Fresnido,Bryan F."
        # We keep first_name as full remaining string
        return first_name, last_name, None
    else:
        # No comma — assume "First Last" format
        parts = name_raw.split()
        first_name = parts[0]
        last_name = " ".join(parts[1:]) if len(parts) > 1 else ""
        return first_name, last_name, None

def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Create Grade 12 grade level if missing
    cursor.execute("SELECT id FROM grade_levels WHERE name = 'Grade 12'")
    grade_12_id = cursor.fetchone()
    if not grade_12_id:
        import uuid
        grade_12_id_str = f"gl-12"
        cursor.execute(
            "INSERT INTO grade_levels (id, name, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (grade_12_id_str, "Grade 12", 5, int(datetime.now().timestamp()), int(datetime.now().timestamp()))
        )
        print("Created Grade 12 grade level.")
    else:
        grade_12_id_str = grade_12_id[0]
        print(f"Grade 12 already exists: {grade_12_id_str}")

    # 2. Get school year 2026-2027
    cursor.execute("SELECT id FROM school_years WHERE year = '2026-2027'")
    sy_row = cursor.fetchone()
    if not sy_row:
        raise ValueError("School year 2026-2027 not found")
    sy_id = sy_row[0]
    print(f"Using school year: {sy_id}")

    # 3. Create adviser user if missing (Mariel T. Añonuevo)
    # Check if any user with that name exists
    cursor.execute("SELECT id FROM users WHERE first_name LIKE '%Mariel%' OR last_name LIKE '%Anonuevo%'")
    adviser_row = cursor.fetchone()
    adviser_id = None
    if not adviser_row:
        import uuid, bcrypt
        adviser_uuid = "user-adviser-anonuevo"
        password_hash = bcrypt.hashpw(b"password", bcrypt.gensalt()).decode()
        cursor.execute(
            "INSERT INTO users (id, role_id, first_name, middle_name, last_name, email, password_hash, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (adviser_uuid, "role-teacher", "Mariel", "T.", "Añonuevo", "mariel.anonuevo@stamagdalena.gov.ph", password_hash, 1, int(datetime.now().timestamp()), int(datetime.now().timestamp()))
        )
        adviser_id = adviser_uuid
        print(f"Created adviser user: {adviser_id}")
    else:
        adviser_id = adviser_row[0]
        print(f"Adviser user exists: {adviser_id}")

    # 4. Create HESTIA section if missing
    cursor.execute("SELECT id FROM sections WHERE name = 'HESTIA' AND school_year_id = ? AND grade_level_id = ?", (sy_id, grade_12_id_str))
    section_row = cursor.fetchone()
    if not section_row:
        import uuid
        section_id_str = "sec-12-hestia"
        cursor.execute(
            "INSERT INTO sections (id, school_year_id, grade_level_id, name, adviser_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (section_id_str, sy_id, grade_12_id_str, "HESTIA", adviser_id, 1, int(datetime.now().timestamp()), int(datetime.now().timestamp()))
        )
        print("Created section HESTIA.")
    else:
        section_id_str = section_row[0]
        print(f"Section HESTIA exists: {section_id_str}")

    # 5. Read Excel and process students
    wb = openpyxl.load_workbook('Nurse dATA.xlsx', data_only=True)
    ws = wb['12 - HESTIA']

    students_data = []
    for row in ws.iter_rows(min_row=9, max_row=ws.max_row, values_only=True):
        name_raw = row[2]
        if not name_raw or not isinstance(name_raw, str) or not name_raw.strip():
            continue
        if name_raw.startswith("Body") or name_raw.startswith("No."):
            continue  # Skip summary/reference rows
        # Verify it's a real student row (should have a number in column A)
        number_cell = row[0]
        if number_cell is None or (isinstance(number_cell, str) and not number_cell.isdigit() and number_cell.strip() == '.'):
            continue
        # Skip rows where name contains reference text like "Body Mass Index"
        if "Mass" in str(name_raw):
            continue
        students_data.append({
            'number_raw': row[0],
            'name': str(name_raw),
            'birth': row[3],
            'weight': row[4],
            'height_m': row[5],
            'sex_raw': row[6],
            'bmi_raw': row[11],  # Column L
            'status_raw': row[12],  # Column M
            'hfa_raw': row[13],  # Column N
        })

    print(f"Found {len(students_data)} student records to import.")

    # Import students
    for idx, s in enumerate(students_data):
        first_name, last_name, middle_name = split_name(s['name'])
        # Clean birth date
        birth_date_str = None
        if s['birth'] and isinstance(s['birth'], datetime):
            birth_date_str = s['birth'].strftime('%Y-%m-%d')
        elif isinstance(s['birth'], str) and s['birth'].strip():
            birth_date_str = s['birth'].strip()

        sex = "male" if s['sex_raw'] == 'M' else "female"

        # Check if student exists by matching name + birth date
        cursor.execute(
            "SELECT id FROM students WHERE first_name = ? AND last_name = ? AND (birth_date = ? OR (? IS NULL AND birth_date IS NULL))",
            (first_name, last_name, birth_date_str, birth_date_str)
        )
        existing_student = cursor.fetchone()

        if existing_student:
            student_id = existing_student[0]
            print(f"  Student {idx+1}: MATCHED existing student {student_id} ({first_name} {last_name}) — SKIPPING creation to avoid duplicate.")
        else:
            import uuid
            student_uuid = f"student-hestia-{idx+1:03d}"
            student_number = f"SM-HE-2026-{idx+1:03d}"
            cursor.execute(
                "INSERT INTO students (id, student_number, lrn, first_name, middle_name, last_name, birth_date, sex, status, record_status, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (student_uuid, student_number, None, first_name, middle_name, last_name, birth_date_str, sex, "active", "draft", "user-nurse", None, int(datetime.now().timestamp()), int(datetime.now().timestamp()))
            )
            student_id = student_uuid
            print(f"  Student {idx+1}: CREATED new {student_id} ({first_name} {last_name}) — birth={birth_date_str}, sex={sex}")

        # Create enrollment for this student
        # Check if enrollment exists
        cursor.execute("SELECT id FROM student_enrollments WHERE student_id = ? AND school_year_id = ?", (student_id, sy_id))
        enrollment_row = cursor.fetchone()
        if not enrollment_row:
            import uuid
            enrollment_uuid = f"enroll-hestia-{idx+1:03d}"
            cursor.execute(
                "INSERT INTO student_enrollments (id, student_id, school_year_id, grade_level_id, section_id, status, recorded_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (enrollment_uuid, student_id, sy_id, grade_12_id_str, section_id_str, "active", adviser_id or "user-nurse", int(datetime.now().timestamp()), int(datetime.now().timestamp()))
            )
            print(f"    Created enrollment for {first_name} {last_name}")
        else:
            print(f"    Enrollment already exists for {first_name} {last_name}")

        # Import health record
        # Clean values
        weight_kg = float(s['weight']) if s['weight'] is not None else None
        height_cm = float(s['height_m']) * 100 if s['height_m'] is not None else None
        bmi = float(s['bmi_raw']) if s['bmi_raw'] is not None else None
        nutritional_status = clean_status(s['status_raw'])
        height_for_age = clean_hfa(s['hfa_raw'])

        # Check if health record exists for this student and measurement date (use a fixed baseline date from dataset header)
        measurement_date = "2026-06-10"  # From dataset: "Date of Weighing: 06/10/2026"

        cursor.execute(
            "SELECT id FROM health_records WHERE student_id = ? AND measurement_date = ?",
            (student_id, measurement_date)
        )
        existing_health = cursor.fetchone()
        if not existing_health:
            import uuid
            health_uuid = f"health-hestia-{idx+1:03d}"
            cursor.execute(
                "INSERT INTO health_records (id, student_id, school_year_id, measurement_date, weight_kg, height_cm, bmi, nutritional_status, height_for_age, remarks, recorded_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (health_uuid, student_id, sy_id, measurement_date, weight_kg, height_cm, bmi, nutritional_status, height_for_age, "Baseline nutritional assessment — School Year 2026-2027, Section HESTIA", adviser_id or "user-nurse", int(datetime.now().timestamp()), int(datetime.now().timestamp()))
            )
            print(f"    Created health record: weight={weight_kg}kg, height={height_cm}cm, bmi={bmi}, status={nutritional_status}, hfa={height_for_age}")
        else:
            print(f"    Health record already exists for {first_name} {last_name} on {measurement_date} — SKIPPING to prevent duplicate assessment.")

    conn.commit()
    conn.close()
    print("Import complete.")

if __name__ == "__main__":
    import openpyxl
    import uuid
    import bcrypt
    main()
