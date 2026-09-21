import { z } from "zod";
import {
  DISABILITY_STATUSES,
  DISABILITY_TYPES,
  EDUCATIONAL_STATUSES,
  ECCD_STATUSES,
  SEXES,
} from "./constants";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date");

const notTooOld = (date: string): boolean => {
  const year = Number(date.slice(0, 4));
  return year >= 1990 && year <= new Date().getFullYear() + 1;
};

/** Shared child form schema (client + server). */
export const childFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  middleName: z.string().trim().max(60).optional().or(z.literal("")),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  suffix: z.string().trim().max(10).optional().or(z.literal("")),
  birthDate: isoDate.refine(notTooOld, "Enter a realistic birth date"),
  sex: z.enum(SEXES, { message: "Select a sex" }),

  barangayId: z.string().min(1, "Select a barangay"),
  addressDetails: z.string().trim().max(300).optional().or(z.literal("")),

  guardianName: z.string().trim().max(120).optional().or(z.literal("")),
  guardianContact: z
    .string()
    .trim()
    .max(30)
    .regex(/^[0-9+()\- ]*$/, "Contact may only contain digits and + ( ) -")
    .optional()
    .or(z.literal("")),

  educationalStatus: z.enum(EDUCATIONAL_STATUSES, { message: "Select an educational status" }),
  schoolId: z.string().optional().or(z.literal("")),
  gradeLevel: z.string().max(30).optional().or(z.literal("")),
  schoolYear: z
    .string()
    .trim()
    .max(9)
    .regex(/^\d{4}-\d{4}$/, "School year must look like 2026-2027")
    .optional()
    .or(z.literal("")),

  eccdStatus: z.enum(ECCD_STATUSES, { message: "Select ECCD status" }),
  eccdCenter: z.string().trim().max(120).optional().or(z.literal("")),
  eccdNonParticipationReason: z.string().trim().max(300).optional().or(z.literal("")),

  disabilityStatus: z.enum(DISABILITY_STATUSES, { message: "Select disability status" }),
  disabilityType: z.string().optional().or(z.literal("")),
  disabilitySupportRequired: z.string().trim().max(300).optional().or(z.literal("")),
  disabilitySupportProvided: z.string().trim().max(300).optional().or(z.literal("")),
  disabilityReferral: z.string().trim().max(300).optional().or(z.literal("")),

  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type ChildFormValues = z.infer<typeof childFormSchema>;

export const loginSchema = z.object({
  email: z.email("Enter a valid email address").max(120),
  password: z.string().min(1, "Password is required").max(128),
});

export const userFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  email: z.email("Enter a valid email address").max(120),
  role: z.enum(["admin", "lgu", "school", "barangay"]),
  schoolId: z.string().optional().or(z.literal("")),
  barangayId: z.string().optional().or(z.literal("")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .optional()
    .or(z.literal("")),
  isActive: z.boolean().optional().default(true),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required").max(128),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(128),
});

export const followupFormSchema = z.object({
  childId: z.string().min(1),
  category: z.enum(["osy", "eccd", "disability", "educational", "intervention"]),
  status: z.enum(["open", "in_progress", "follow_up", "resolved"]),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  followupDate: isoDate.optional().or(z.literal("")),
});

export const duplicateReviewSchema = z.object({
  id: z.string().min(1),
  decision: z.enum(["confirmed", "dismissed", "resolved"]),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const childQuerySchema = z.object({
  q: z.string().trim().max(100).optional().or(z.literal("")),
  barangay: z.string().optional().or(z.literal("")),
  school: z.string().optional().or(z.literal("")),
  status: z.string().optional().or(z.literal("")),
  education: z.string().optional().or(z.literal("")),
  sex: z.string().optional().or(z.literal("")),
  eccd: z.string().optional().or(z.literal("")),
  disability: z.string().optional().or(z.literal("")),
  ageMin: z.coerce.number().int().min(0).max(25).optional(),
  ageMax: z.coerce.number().int().min(0).max(25).optional(),
  sort: z.enum(["name", "recent", "oldest"]).default("recent"),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
