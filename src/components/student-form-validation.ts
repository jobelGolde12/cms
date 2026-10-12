"use client";

/**
 * Shared client-side validation utilities for the student form.
 *
 * Mirrors the server rules (src/lib/schemas.ts) so users get instant
 * feedback, but the server action re-validates every submission — these are
 * UX helpers, never the security boundary.
 */

export const MIN_STUDENT_AGE_YEARS = 9;
export const MAX_STUDENT_AGE_YEARS = 24;

/* -------------------------------------------------------------------------- */
/*  Birth date                                                                */
/* -------------------------------------------------------------------------- */

function ageFrom(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - y;
  const beforeBirthday =
    today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}

/** Realtime-validated birth date: real calendar date, not future, HS age band. */
export function birthDateError(value: string): string | null {
  if (!value) return null; // "required" is shown by the form, not the live check
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Enter a full calendar date";
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d)
    return "That date does not exist in the calendar";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dt > today) return "Birth date cannot be after today";
  const age = ageFrom(value);
  if (age < MIN_STUDENT_AGE_YEARS)
    return `Too young for high school (min ${MIN_STUDENT_AGE_YEARS} years old)`;
  if (age > MAX_STUDENT_AGE_YEARS)
    return `Age ${age} is above the reliable record range (max ${MAX_STUDENT_AGE_YEARS} years)`;
  return null;
}

/** ISO min for the date input: today minus MAX age. */
export function birthDateMax(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** ISO min for the date input: today minus MAX age. */
export function birthDateMin(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - MAX_STUDENT_AGE_YEARS);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* -------------------------------------------------------------------------- */
/*  Philippine phone numbers                                                  */
/* -------------------------------------------------------------------------- */

/**
 * PH mobile (09XXXXXXXXX = 11 digits; +63 9XXXXXXXXX = 12) or landline
 * (area code + 7-digit number, 8–10 digits total). Spaces/parens ignored.
 */
export function isValidPHPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("09")) return digits.length === 11;
  if (digits.startsWith("639")) return digits.length === 12;
  // Landline: NNN-NLLL or (02) NNNN…, 8–10 digits total
  return digits.length >= 8 && digits.length <= 10;
}

export function phoneError(value: string): string | null {
  if (!value) return null;
  if (/[a-zA-Z]/.test(value)) return "Phone numbers cannot contain letters";
  if (!/^[\d+\-\s()]*$/.test(value)) return "Only numbers, spaces, +, ( ), - are allowed";
  if (!isValidPHPhone(value)) {
    return "Use a PH mobile (0917 123 4567) or landline (02 + 7 digits)";
  }
  return null;
}

/**
 * Interactive filter: strips letters and most symbols from keystrokes so the
 * field is effectively numeric. Returns the sanitized value.
 */
export function sanitizePhoneInput(raw: string): string {
  return raw.replace(/[^0-9+\-\s()]/g, "").slice(0, 20);
}

/* -------------------------------------------------------------------------- */
/*  Names and other text                                                      */
/* -------------------------------------------------------------------------- */

export function requiredTextError(value: string, label: string): string | null {
  if (!value.trim()) return `${label} is required`;
  return null;
}

export function nameError(value: string, label: string): string | null {
  if (!value) return null;
  if (/[0-9]/.test(value)) return `${label} cannot contain numbers`;
  if (value.trim().length < 2) return `${label} is too short`;
  return null;
}

export function emailError(value: string): string | null {
  if (!value) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Enter a valid email address";
  return null;
}

/* -------------------------------------------------------------------------- */
/*  Live form-state assembly                                                  */
/* -------------------------------------------------------------------------- */

export type LiveValues = {
  firstName: string;
  lastName: string;
  birthDate: string;
  contactNumber: string;
  guardianFirstName: string;
  guardianLastName: string;
  guardianContactNumber: string;
  guardianEmail: string;
};

/**
 * Realtime per-field errors. Only rules expressible in isolation of server
 * logic are surfaced live; the submit re-validates everything server-side.
 */
export function liveFieldErrors(values: LiveValues): Record<string, string | null> {
  const guardianTouched =
    [values.guardianFirstName, values.guardianLastName, values.guardianContactNumber, values.guardianEmail]
      .some((v) => v && v.trim().length > 0);
  return {
    firstName: nameError(values.firstName, "First name"),
    lastName: nameError(values.lastName, "Last name"),
    birthDate: birthDateError(values.birthDate),
    contactNumber: phoneError(values.contactNumber),
    guardianFirstName: nameError(values.guardianFirstName, "Guardian first name"),
    guardianLastName: nameError(values.guardianLastName, "Guardian last name"),
    guardianContactNumber: phoneError(values.guardianContactNumber),
    guardianEmail: emailError(values.guardianEmail),
    guardianRequired: guardianTouched
      ? [
          requiredTextError(values.guardianFirstName, "Guardian first name"),
          requiredTextError(values.guardianLastName, "Guardian last name"),
        ]
          .filter((e): e is string => Boolean(e))
          .join(" — ")
      : null,
  };
}
