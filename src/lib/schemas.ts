import { z } from "zod";
import {
  ASSISTANCE_STATUSES,
  DISABILITY_TYPES,
  ECCD_STATUSES,
  EDUCATION_STATUSES,
  SEXES,
} from "./constants";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date");

const notTooOld = (date: string): boolean => {
  const year = Number(date.slice(0, 4));
  return year >= 1990 && year <= new Date().getFullYear() + 1;
};

/**
 * Shared child form schema (client + server).
 *
 * A single form feeds the normalized tables: `children` (identity) plus
 * `child_addresses`, `child_education`, `child_eccd` and `child_disabilities`
 * (created in the same transaction on the server).
 */
export const childFormSchema = z.object({
  // Identity
  firstName: z.string().trim().min(1, "First name is required").max(60),
  middleName: z.string().trim().max(60).optional().or(z.literal("")),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  suffix: z.string().trim().max(10).optional().or(z.literal("")),
  birthDate: isoDate.refine(notTooOld, "Enter a realistic birth date"),
  sex: z.enum(SEXES, { message: "Select a sex" }),
  civilStatus: z.string().trim().max(20).optional().or(z.literal("")),
  birthPlace: z.string().trim().max(200).optional().or(z.literal("")),

  // Address
  barangayId: z.string().min(1, "Select a barangay"),
  householdAddress: z.string().trim().min(1, "Household address is required").max(300),
  sitio: z.string().trim().max(120).optional().or(z.literal("")),

  // Education
  educationStatus: z.enum(EDUCATION_STATUSES, { message: "Select an educational status" }),
  schoolId: z.string().optional().or(z.literal("")),
  gradeLevel: z.string().trim().max(30).optional().or(z.literal("")),
  schoolYear: z
    .string()
    .trim()
    .max(9)
    .regex(/^\d{4}-\d{4}$/, "School year must look like 2026-2027")
    .optional()
    .or(z.literal("")),
  enrollmentStatus: z.string().trim().max(30).optional().or(z.literal("")),

  // ECCD
  eccdStatus: z.enum(ECCD_STATUSES, { message: "Select ECCD participation status" }),
  eccdProgramName: z.string().trim().max(120).optional().or(z.literal("")),
  eccdProvider: z.string().trim().max(120).optional().or(z.literal("")),
  eccdRemarks: z.string().trim().max(300).optional().or(z.literal("")),

  // Disability (sensitive)
  hasDisability: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => v === "on" || v === "true"),
  disabilityType: z
    .enum(DISABILITY_TYPES, { message: "Select a disability type" })
    .optional()
    .or(z.literal("")),
  disabilityDescription: z.string().trim().max(300).optional().or(z.literal("")),
  disabilitySupportNeeded: z.string().trim().max(300).optional().or(z.literal("")),
  assistanceStatus: z.enum(ASSISTANCE_STATUSES).optional().or(z.literal("")),
});

export type ChildFormValues = z.infer<typeof childFormSchema>;

export const loginSchema = z.object({
  email: z.email("Enter a valid email address").max(120),
  password: z.string().min(1, "Password is required").max(128),
});

export const userFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  middleName: z.string().trim().max(60).optional().or(z.literal("")),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  email: z.email("Enter a valid email address").max(120),
  roleId: z.enum(["role-admin", "role-lgu", "role-barangay"], {
    message: "Select a role",
  }),
  barangayId: z.string().optional().or(z.literal("")),
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

export const validationReviewSchema = z.object({
  childId: z.string().min(1),
  decision: z.enum(["approved", "needs_correction", "rejected"]),
  remarks: z.string().trim().max(500).optional().or(z.literal("")),
});

export const duplicateReviewSchema = z.object({
  id: z.string().min(1),
  decision: z.enum(["confirmed_duplicate", "not_duplicate", "dismissed"]),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const monitoringFormSchema = z.object({
  childId: z.string().min(1),
  monitoringType: z.enum(["education", "out_of_school_youth", "eccd", "disability", "general"]),
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
  observedAt: isoDate,
  remarks: z.string().trim().max(500).optional().or(z.literal("")),
});

export const interventionFormSchema = z.object({
  childId: z.string().min(1),
  interventionType: z.string().trim().min(1, "Intervention type is required").max(60),
  description: z.string().trim().min(1, "Description is required").max(500),
  status: z.enum(["planned", "ongoing", "completed", "cancelled"]),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().or(z.literal("")),
  startDate: isoDate.optional().or(z.literal("")),
  targetDate: isoDate.optional().or(z.literal("")),
});

export const followupFormSchema = z.object({
  interventionId: z.string().min(1),
  followUpDate: isoDate,
  status: z.enum(["scheduled", "done", "missed", "cancelled"]),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const childQuerySchema = z.object({
  q: z.string().trim().max(100).optional().or(z.literal("")),
  barangay: z.string().optional().or(z.literal("")),
  status: z.string().optional().or(z.literal("")),
  recordStatus: z.string().optional().or(z.literal("")),
  sex: z.string().optional().or(z.literal("")),
  ageMin: z.coerce.number().int().min(0).max(25).optional(),
  ageMax: z.coerce.number().int().min(0).max(25).optional(),
  sort: z.enum(["name", "recent", "oldest"]).default("recent"),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
