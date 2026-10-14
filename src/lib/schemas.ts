import { z } from "zod";
import {
  ASSESSMENT_DOMAINS,
  ATTENDANCE_STATUSES,
  BEHAVIOR_RECORD_STATUSES,
  BEHAVIOR_SEVERITIES,
  ENROLLMENT_STATUSES,
  FOLLOWUP_STATUSES,
  INTERVENTION_STATUSES,
  NUTRITIONAL_STATUSES,
  ROLES,
  SEXES,
} from "./constants";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date");

/**
 * Student birth-date window (Grades 7–12).
 *
 * - Grades 7–10 riders enter JHS at age 11–12; SHS riders at 15–16. Overage,
 *   returnees, and late-enrollees are common in Philippine public schools, so
 *   the upper bound is generous (24 at entry).
 * - Anything younger than ~9 years at enrollment is not a realistic high
 *   school date of birth (accelerated early admission is not supported).
 * - Future dates are impossible.
 */
export const MIN_STUDENT_AGE_YEARS = 9;
export const MAX_STUDENT_AGE_YEARS = 24;

const ageFromBirthDateStrict = (date: string): number => {
  const [y, m, d] = date.split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - y;
  const beforeBirthday =
    today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
};

export function studentBirthDateIssues(date: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Enter a valid date";
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const valid =
    dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
  if (!valid) return "Enter a real calendar date";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dt > today) return "Birth date cannot be in the future";
  const age = ageFromBirthDateStrict(date);
  if (age < MIN_STUDENT_AGE_YEARS)
    return `Student must be at least ${MIN_STUDENT_AGE_YEARS} years old for high school`;
  if (age > MAX_STUDENT_AGE_YEARS)
    return `Age ${age} is above the high-school record range (max ${MAX_STUDENT_AGE_YEARS})`;
  const year = Number(date.slice(0, 4));
  if (year < 1990) return "Enter a realistic birth date"; // belt-and-braces vs typo years
  return null;
}

/**
 * Philippine mobile numbers (Globe/Smart/Dito) + optional landline.
 * Mobile: 09XXXXXXXXX (11 digits) or +63 9XXXXXXXXX (12 digits).
 * Landline: area code + 7-digit number, 8–10 digits total.
 * Only digits, spaces, +, -, (, ) are accepted — letters are rejected.
 */
const ALLOWED_PHONE_CHARS = /^[\d+\-\s()]+$/;

export function isValidPHPhone(raw: string): boolean {
  if (!ALLOWED_PHONE_CHARS.test(raw)) return false; // letters/symbols rejected
  const digits = raw.replace(/\D/g, "");
  if (!digits) return false;
  if (raw.trim() !== raw) return false; // leading/trailing whitespace rejected
  if (digits.startsWith("09")) return digits.length === 11;
  if (digits.startsWith("639")) return digits.length === 12;
  return digits.length >= 8 && digits.length <= 10;
}

const phPhone = (label: string) =>
  z
    .string()
    .trim()
    .max(20, "Too long")
    .refine(
      (v) => isValidPHPhone(v),
      `${label} must be a valid PH mobile (0917 123 4567) or landline`,
    )
    .optional()
    .or(z.literal(""));

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

/* -------------------------------------------------------------------------- */
/*  Student form (client + server)                                            */
/* -------------------------------------------------------------------------- */

/**
 * Core student record. Academic placement (enrollment in a grade level /
 * section for a school year) is a separate flow recorded in
 * `student_enrollments`; guardians are created alongside the student.
 */
export const studentFormSchemaBase = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  middleName: optionalText(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  suffix: optionalText(10),
  birthDate: isoDate.refine((v) => studentBirthDateIssues(v) === null, "Enter a realistic birth date"),
  sex: z.enum(SEXES, { message: "Select a sex" }),
  contactNumber: phPhone("Contact number"),
  address: optionalText(300),

  // Primary guardian (created with the student; can be updated later)
  guardianFirstName: optionalText(60),
  guardianMiddleName: optionalText(60),
  guardianLastName: optionalText(60),
  guardianRelationship: z
    .enum(["mother", "father", "guardian"], { message: "Select a relationship" })
    .optional()
    .or(z.literal("")),
  guardianContactNumber: phPhone("Guardian contact number"),
  guardianEmail: z.email("Enter a valid email address").max(120).optional().or(z.literal("")),
});

/**
 * Contingent guardian rules: if ANY guardian field is filled, the name and
 * relationship become required so orphan half-guardians never reach the DB.
 */
export const studentGuardianRefinement = <T extends {
  guardianFirstName?: string; guardianLastName?: string; guardianRelationship?: string;
  guardianContactNumber?: string; guardianEmail?: string;
}>(data: T): boolean => {
  const touched = [
    data.guardianFirstName, data.guardianLastName, data.guardianRelationship,
    data.guardianContactNumber, data.guardianEmail,
  ].some((v) => typeof v === "string" && v.trim().length > 0);
  if (!touched) return true;
  return Boolean(
    (data.guardianFirstName ?? "").trim() &&
    (data.guardianLastName ?? "").trim() &&
    (data.guardianRelationship ?? "").trim(),
  );
};

export const studentFormSchema = studentFormSchemaBase.refine(
  studentGuardianRefinement,
  {
    message:
      "Guardian first name, last name, and relationship are required once any guardian field is filled.",
    path: ["guardianFirstName"],
  },
);

/* -------------------------------------------------------------------------- */
/*  Auth & users                                                              */
/* -------------------------------------------------------------------------- */

export const loginSchema = z.object({
  email: z.email("Enter a valid email address").max(120),
  password: z.string().min(1, "Password is required").max(128),
});

export const profileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

export const userFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  middleName: optionalText(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  email: z.email("Enter a valid email address").max(120),
  roleId: z.enum(
    [
      "role-admin",
      "role-school-admin",
      "role-teacher",
      "role-records",
      "role-guidance",
      "role-nurse",
      "role-registrar",
      "role-literacy-coordinator",
    ],
    { message: "Select a role" },
  ),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[0-9+()\- ]*$/, "Phone may only contain digits and + ( ) -")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .optional()
    .or(z.literal("")),
  isActive: z.boolean().optional().default(true),
});

export type UserFormValues = z.infer<typeof userFormSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required").max(128),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(128),
});

/* -------------------------------------------------------------------------- */
/*  Verification & duplicates                                                 */
/* -------------------------------------------------------------------------- */

export const verificationReviewSchema = z.object({
  studentId: z.string().min(1),
  decision: z.enum(["approved", "needs_correction", "rejected"]),
  remarks: optionalText(500),
});

export const duplicateReviewSchema = z.object({
  id: z.string().min(1),
  decision: z.enum(["confirmed_duplicate", "not_duplicate", "dismissed"]),
  notes: optionalText(500),
});

/* -------------------------------------------------------------------------- */
/*  Student development (assessments, behavior, interventions)                 */
/* -------------------------------------------------------------------------- */

export const assessmentFormSchema = z.object({
  studentId: z.string().min(1),
  domain: z.enum(ASSESSMENT_DOMAINS, { message: "Select a domain" }),
  assessmentType: optionalText(60),
  skillArea: optionalText(60),
  date: isoDate,
  level: optionalText(40),
  score: z.coerce.number().min(0).max(100).optional(),
  notes: optionalText(300),
});

export const behaviorFormSchema = z.object({
  studentId: z.string().min(1),
  categoryId: z.string().min(1, "Select a category"),
  date: isoDate,
  description: z.string().trim().min(1, "Description is required").max(500),
  severity: z.enum(BEHAVIOR_SEVERITIES).optional().or(z.literal("")),
  followUp: optionalText(300),
  status: z.enum(BEHAVIOR_RECORD_STATUSES).default("open"),
});

export const interventionFormSchema = z.object({
  studentId: z.string().min(1),
  interventionType: z.string().trim().min(1, "Intervention type is required").max(60),
  description: z.string().trim().min(1, "Description is required").max(500),
  status: z.enum(INTERVENTION_STATUSES).default("planned"),
  startDate: isoDate.optional().or(z.literal("")),
  targetDate: isoDate.optional().or(z.literal("")),
  outcome: optionalText(500),
});

export const followupFormSchema = z.object({
  interventionId: z.string().min(1),
  followUpDate: isoDate,
  status: z.enum(FOLLOWUP_STATUSES),
  notes: optionalText(500),
});

/* -------------------------------------------------------------------------- */
/*  Health & nutrition (Nurse domain)                                         */
/* -------------------------------------------------------------------------- */

/** Realistic high-school weight (kg) and height (cm) windows. */
export const healthRecordSchema = z
  .object({
    studentId: z.string().min(1),
    measurementDate: isoDate,
    weightKg: z.coerce
      .number()
      .min(5, "Weight must be between 5 and 200 kg")
      .max(200, "Weight must be between 5 and 200 kg")
      .optional()
      .or(z.literal("")),
    heightCm: z.coerce
      .number()
      .min(60, "Height must be between 60 and 250 cm")
      .max(250, "Height must be between 60 and 250 cm")
      .optional()
      .or(z.literal("")),
    nutritionalStatus: z.enum(NUTRITIONAL_STATUSES).optional().or(z.literal("")),
    remarks: optionalText(300),
  })
  .refine((v) => v.weightKg !== "" || v.heightCm !== "" || v.nutritionalStatus !== "", {
    message: "Provide at least weight, height, or a nutritional status.",
    path: ["measurementDate"],
  });

export const clinicalRecordSchema = z.object({
  studentId: z.string().min(1),
  date: isoDate,
  category: z.string().trim().min(1, "Category is required").max(60),
  description: z.string().trim().min(1, "Description is required").max(500),
  assessment: optionalText(300),
  actionTaken: optionalText(300),
  remarks: optionalText(300),
});

/* -------------------------------------------------------------------------- */
/*  Enrollment, grades, attendance                                            */
/* -------------------------------------------------------------------------- */

export const enrollmentFormSchema = z.object({
  studentId: z.string().min(1),
  schoolYearId: z.string().min(1, "Select a school year"),
  gradeLevelId: z.string().min(1, "Select a grade level"),
  sectionId: z.string().min(1, "Select a section"),
  status: z.enum(ENROLLMENT_STATUSES).default("active"),
  enrollmentDate: isoDate.optional().or(z.literal("")),
});

export const gradeFormSchema = z.object({
  enrollmentId: z.string().min(1),
  subjectId: z.string().min(1, "Select a subject"),
  gradingPeriodId: z.string().min(1, "Select a grading period"),
  grade: z.coerce
    .number()
    .min(60, "Grades below 60 are invalid")
    .max(100, "Grades above 100 are invalid"),
  remarks: optionalText(200),
});

export const attendanceFormSchema = z.object({
  enrollmentId: z.string().min(1),
  date: isoDate,
  status: z.enum(ATTENDANCE_STATUSES, { message: "Select an attendance status" }),
  remarks: optionalText(200),
});

/* -------------------------------------------------------------------------- */
/*  Registry query (server-side parsing of search params)                      */
/* -------------------------------------------------------------------------- */

export const studentQuerySchema = z.object({
  q: z.string().trim().max(100).optional().or(z.literal("")),
  status: z.string().optional().or(z.literal("")),
  lifecycle: z.string().optional().or(z.literal("")),
  sex: z.string().optional().or(z.literal("")),
  gradeLevel: z.string().optional().or(z.literal("")),
  sectionId: z.string().optional().or(z.literal("")),
  sort: z.enum(["name", "recent", "oldest"]).default("recent"),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

export type StudentQueryParsed = z.infer<typeof studentQuerySchema>;

export const verifyTokenSchema = z.object({
  token: z
    .string()
    .trim()
    .min(8, "Token must be at least 8 characters")
    .max(128)
    .regex(/^[a-zA-Z0-9_\-]+$/, "Token contains invalid characters"),
});

export type VerifyTokenParsed = z.infer<typeof verifyTokenSchema>;

/** All valid roles, re-exported for form components. */
export const VALID_ROLE_IDS = ROLES;
